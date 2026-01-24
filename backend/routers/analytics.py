from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from services.auth_service import get_current_user
from services.stock_service import get_stock_prices, get_historical_prices, search_stocks
from services import quant_service as quant
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/portfolio/{portfolio_id}/history")
async def get_portfolio_history(
    portfolio_id: int,
    period: str = Query("1Y", description="Time period: 1M, 3M, 6M, 1Y, ALL"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get historical portfolio value based on actual transactions.
    Calculates cumulative invested amount over time from transaction history.
    """
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Calculate date range based on period
    now = datetime.utcnow()
    if period == "1M":
        start_date = now - timedelta(days=30)
    elif period == "3M":
        start_date = now - timedelta(days=90)
    elif period == "6M":
        start_date = now - timedelta(days=180)
    elif period == "1Y":
        start_date = now - timedelta(days=365)
    else:  # ALL
        start_date = datetime(2000, 1, 1)  # Beginning of time
    
    # Get all transactions for the portfolio, ordered by date
    transactions = db.query(models.Transaction).filter(
        models.Transaction.portfolio_id == portfolio_id
    ).order_by(models.Transaction.executed_at.asc()).all()
    
    if not transactions:
        # No transactions: return empty history
        return {"history": [], "period": period}
    
    # Calculate running portfolio value by date
    # Group transactions by month for cleaner visualization
    monthly_values = defaultdict(float)
    running_total = 0.0
    
    for txn in transactions:
        # BUY adds to portfolio, SELL subtracts
        if txn.transaction_type.value == "BUY":
            running_total += txn.total_amount
        elif txn.transaction_type.value == "SELL":
            running_total -= txn.total_amount
        elif txn.transaction_type.value == "DEPOSIT":
            running_total += txn.total_amount
        elif txn.transaction_type.value == "WITHDRAWAL":
            running_total -= txn.total_amount
        # DIVIDEND doesn't change invested amount, just cash received
        
        # Group by year-month
        month_key = txn.executed_at.strftime("%Y-%m")
        monthly_values[month_key] = running_total
    
    # Get current total value (including market gains)
    tickers = [h.ticker for h in portfolio.holdings]
    current_prices = await get_stock_prices(tickers) if tickers else {}
    
    current_value = sum(
        h.quantity * current_prices.get(h.ticker, h.avg_buy_price)
        for h in portfolio.holdings
    )
    
    # Build history array with proper month labels
    history = []
    sorted_months = sorted(monthly_values.keys())
    
    for month_key in sorted_months:
        month_date = datetime.strptime(month_key, "%Y-%m")
        if month_date >= start_date:
            month_label = month_date.strftime("%b %Y")  # "Jan 2026"
            history.append({
                "date": month_label,
                "value": round(monthly_values[month_key], 2)
            })
    
    # Add current month with actual market value if not already present
    current_month_key = now.strftime("%Y-%m")
    if current_month_key not in monthly_values or len(history) == 0:
        history.append({
            "date": now.strftime("%b %Y"),
            "value": round(current_value, 2)
        })
    else:
        # Update last entry to reflect current market value instead of invested
        if history:
            history[-1]["value"] = round(current_value, 2)
    
    return {"history": history, "period": period}


@router.get("/portfolio/{portfolio_id}/metrics", response_model=schemas.PortfolioMetrics)
async def get_portfolio_metrics(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive portfolio metrics including risk analysis"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    if not portfolio.holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings")
    
    # Get current prices
    tickers = [h.ticker for h in portfolio.holdings]
    current_prices = await get_stock_prices(tickers)
    
    # Calculate basic values
    total_value = sum(
        h.quantity * current_prices.get(h.ticker, h.avg_buy_price)
        for h in portfolio.holdings
    )
    total_invested = sum(h.quantity * h.avg_buy_price for h in portfolio.holdings)
    total_return = total_value - total_invested
    total_return_percent = (total_return / total_invested * 100) if total_invested > 0 else 0
    
    # Get historical data for each holding
    historical_data = {}
    for ticker in tickers:
        prices = await get_historical_prices(ticker, days=365)
        if prices:
            historical_data[ticker] = [p["close"] for p in prices]
    
    # Calculate returns for each asset
    asset_returns = {}
    for ticker, prices in historical_data.items():
        returns = quant.calculate_returns(prices)
        if returns:
            asset_returns[ticker] = returns
    
    # Calculate weights
    weights = []
    for holding in portfolio.holdings:
        value = holding.quantity * current_prices.get(holding.ticker, holding.avg_buy_price)
        weights.append(value / total_value if total_value > 0 else 0)
    weights = np.array(weights)
    
    # Calculate portfolio returns (weighted average)
    portfolio_returns = []
    if asset_returns:
        min_len = min(len(r) for r in asset_returns.values())
        for i in range(min_len):
            daily_return = sum(
                weights[j] * asset_returns[tickers[j]][i]
                for j in range(len(tickers))
                if tickers[j] in asset_returns
            )
            portfolio_returns.append(daily_return)
    
    # Calculate metrics
    mean_return = quant.calculate_mean_return(portfolio_returns) if portfolio_returns else 0.12
    volatility = quant.calculate_volatility(portfolio_returns) if portfolio_returns else 0.20
    sharpe_ratio = quant.calculate_sharpe_ratio(mean_return, volatility)
    
    # Get market returns for beta calculation (use NIFTYBEES as proxy)
    market_data = await get_historical_prices("NIFTYBEES", days=365)
    market_returns = quant.calculate_returns([p["close"] for p in market_data]) if market_data else []
    
    beta = 1.0
    if market_returns and portfolio_returns:
        min_len = min(len(market_returns), len(portfolio_returns))
        beta = quant.calculate_beta(portfolio_returns[:min_len], market_returns[:min_len])
    
    market_return = quant.calculate_mean_return(market_returns) if market_returns else 0.12
    alpha = quant.calculate_alpha(mean_return, market_return, beta)
    
    # Daily change (estimated)
    daily_change = portfolio_returns[-1] * total_value if portfolio_returns else 0
    daily_change_percent = portfolio_returns[-1] * 100 if portfolio_returns else 0
    
    # Calculate drawdown from reconstructed portfolio prices
    portfolio_prices = [total_value]  # Simplification
    max_drawdown = quant.calculate_max_drawdown(portfolio_prices)
    
    # Risk score
    risk_score, risk_level = quant.calculate_risk_score(volatility, max_drawdown, beta)
    
    # Correlation matrix for diversification
    correlation_data = quant.calculate_correlation_matrix(asset_returns) if len(asset_returns) > 1 else []
    diversification_score = quant.calculate_diversification_score(correlation_data)
    
    # Sector concentration (simplified)
    sector_concentration = {}
    for holding in portfolio.holdings:
        asset_type = holding.asset_type
        value = holding.quantity * current_prices.get(holding.ticker, holding.avg_buy_price)
        pct = value / total_value * 100 if total_value > 0 else 0
        sector_concentration[asset_type] = sector_concentration.get(asset_type, 0) + pct
    
    return {
        "total_value": round(total_value, 2),
        "total_invested": round(total_invested, 2),
        "total_return": round(total_return, 2),
        "total_return_percent": round(total_return_percent, 2),
        "daily_change": round(daily_change, 2),
        "daily_change_percent": round(daily_change_percent, 2),
        "sharpe_ratio": round(sharpe_ratio, 2),
        "volatility": round(volatility * 100, 2),  # As percentage
        "beta": round(beta, 2),
        "alpha": round(alpha * 100, 2),  # As percentage
        "risk_score": risk_score,
        "risk_level": risk_level,
        "diversification_score": diversification_score,
        "sector_concentration": sector_concentration
    }


@router.get("/portfolio/{portfolio_id}/correlation")
async def get_correlation_matrix(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get correlation matrix for portfolio assets"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    tickers = [h.ticker for h in portfolio.holdings]
    
    # Get historical data
    asset_returns = {}
    for ticker in tickers:
        prices = await get_historical_prices(ticker, days=365)
        if prices:
            returns = quant.calculate_returns([p["close"] for p in prices])
            if returns:
                asset_returns[ticker] = returns
    
    if len(asset_returns) < 2:
        return {"correlations": [], "message": "Need at least 2 assets for correlation"}
    
    correlation_data = quant.calculate_correlation_matrix(asset_returns)
    
    return {"correlations": correlation_data}


@router.get("/portfolio/{portfolio_id}/efficient-frontier")
async def get_efficient_frontier(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate efficient frontier for portfolio optimization"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    if len(portfolio.holdings) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 holdings for optimization")
    
    tickers = [h.ticker for h in portfolio.holdings]
    
    # Get historical data
    asset_returns = {}
    for ticker in tickers:
        prices = await get_historical_prices(ticker, days=365)
        if prices:
            returns = quant.calculate_returns([p["close"] for p in prices])
            if returns:
                asset_returns[ticker] = returns
    
    if len(asset_returns) < 2:
        raise HTTPException(status_code=400, detail="Insufficient historical data")
    
    # Calculate expected returns and covariance matrix
    expected_returns = np.array([
        quant.calculate_mean_return(asset_returns[t]) 
        for t in tickers if t in asset_returns
    ])
    
    cov_matrix = quant.calculate_covariance_matrix(asset_returns)
    
    # Calculate efficient frontier
    frontier = quant.calculate_efficient_frontier(expected_returns, cov_matrix)
    
    # Find optimal portfolio (max Sharpe)
    optimal_weights, optimal_sharpe = quant.optimize_portfolio_sharpe(expected_returns, cov_matrix)
    
    optimal_portfolio = {
        "weights": {tickers[i]: round(w, 4) for i, w in enumerate(optimal_weights) if tickers[i] in asset_returns},
        "expected_return": round(quant.calculate_portfolio_return(optimal_weights, expected_returns) * 100, 2),
        "volatility": round(quant.calculate_portfolio_volatility(optimal_weights, cov_matrix) * 100, 2),
        "sharpe_ratio": round(optimal_sharpe, 2)
    }
    
    return {
        "frontier": frontier,
        "optimal_portfolio": optimal_portfolio,
        "current_tickers": tickers
    }


@router.get("/portfolio/{portfolio_id}/monte-carlo")
async def run_monte_carlo(
    portfolio_id: int,
    days: int = 252,
    simulations: int = 1000,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run Monte Carlo simulation for portfolio"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get current prices and total value
    tickers = [h.ticker for h in portfolio.holdings]
    current_prices = await get_stock_prices(tickers)
    
    total_value = sum(
        h.quantity * current_prices.get(h.ticker, h.avg_buy_price)
        for h in portfolio.holdings
    )
    
    # Get portfolio metrics for simulation
    weights = []
    for holding in portfolio.holdings:
        value = holding.quantity * current_prices.get(holding.ticker, holding.avg_buy_price)
        weights.append(value / total_value if total_value > 0 else 0)
    
    # Get historical data
    asset_returns = {}
    for ticker in tickers:
        prices = await get_historical_prices(ticker, days=365)
        if prices:
            returns = quant.calculate_returns([p["close"] for p in prices])
            if returns:
                asset_returns[ticker] = returns
    
    # Calculate portfolio return and volatility
    portfolio_returns = []
    if asset_returns:
        min_len = min(len(r) for r in asset_returns.values())
        for i in range(min_len):
            daily_return = sum(
                weights[j] * asset_returns[tickers[j]][i]
                for j in range(len(tickers))
                if tickers[j] in asset_returns
            )
            portfolio_returns.append(daily_return)
    
    expected_return = quant.calculate_mean_return(portfolio_returns) if portfolio_returns else 0.12
    volatility = quant.calculate_volatility(portfolio_returns) if portfolio_returns else 0.20
    
    # Run simulation
    result = quant.monte_carlo_simulation(
        initial_value=total_value,
        expected_return=expected_return,
        volatility=volatility,
        days=min(days, 504),  # Cap at 2 years
        simulations=min(simulations, 5000)  # Cap at 5000
    )
    
    return result


@router.post("/portfolio/{portfolio_id}/rebalance-plan", response_model=schemas.RebalancePlan)
async def generate_rebalance_plan(
    portfolio_id: int,
    optimize: bool = False,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate rebalancing plan to reach target allocations"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    if not portfolio.holdings:
        raise HTTPException(status_code=400, detail="Portfolio has no holdings")
    
    # Get current prices
    tickers = [h.ticker for h in portfolio.holdings]
    current_prices = await get_stock_prices(tickers)
    
    # Calculate total value
    total_value = sum(
        h.quantity * current_prices.get(h.ticker, h.avg_buy_price)
        for h in portfolio.holdings
    )
    
    trades = []
    total_buy = 0
    total_sell = 0
    
    for holding in portfolio.holdings:
        current_price = current_prices.get(holding.ticker, holding.avg_buy_price)
        current_value = holding.quantity * current_price
        current_allocation = (current_value / total_value * 100) if total_value > 0 else 0
        target_allocation = holding.target_allocation
        
        target_value = total_value * (target_allocation / 100)
        trade_amount = target_value - current_value
        
        if abs(trade_amount) < 100:  # Ignore small trades
            continue
        
        trade_type = "BUY" if trade_amount > 0 else "SELL"
        shares = abs(trade_amount) / current_price if current_price > 0 else 0
        
        if trade_type == "BUY":
            total_buy += abs(trade_amount)
            reason = "Underweight"
        else:
            total_sell += abs(trade_amount)
            reason = "Overweight"
        
        trades.append({
            "ticker": holding.ticker,
            "name": holding.name,
            "trade_type": trade_type,
            "current_allocation": round(current_allocation, 2),
            "target_allocation": round(target_allocation, 2),
            "current_value": round(current_value, 2),
            "target_value": round(target_value, 2),
            "trade_amount": round(abs(trade_amount), 2),
            "shares": round(shares, 4),
            "reason": reason
        })
    
    # Sort by trade amount (largest first)
    trades.sort(key=lambda x: x["trade_amount"], reverse=True)
    
    # Get metrics before and after (simplified - assume same for now)
    metrics = await get_portfolio_metrics(portfolio_id, current_user, db)
    
    return {
        "trades": trades,
        "total_buy_amount": round(total_buy, 2),
        "total_sell_amount": round(total_sell, 2),
        "metrics_before": metrics,
        "metrics_after": metrics  # Would calculate new metrics after rebalance
    }


@router.post("/portfolio/{portfolio_id}/execute-rebalance")
async def execute_rebalance(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute rebalancing trades and update holdings"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get current prices
    tickers = [h.ticker for h in portfolio.holdings]
    current_prices = await get_stock_prices(tickers)
    
    # Calculate total value
    total_value = sum(
        h.quantity * current_prices.get(h.ticker, h.avg_buy_price)
        for h in portfolio.holdings
    )
    
    transactions = []
    
    for holding in portfolio.holdings:
        current_price = current_prices.get(holding.ticker, holding.avg_buy_price)
        current_value = holding.quantity * current_price
        target_allocation = holding.target_allocation
        target_value = total_value * (target_allocation / 100)
        trade_amount = target_value - current_value
        
        if abs(trade_amount) < 100:
            continue
        
        shares_change = trade_amount / current_price if current_price > 0 else 0
        
        # Update holding
        holding.quantity += shares_change
        if holding.quantity < 0:
            holding.quantity = 0
        
        # Record transaction
        transaction = models.Transaction(
            ticker=holding.ticker,
            transaction_type=models.TransactionType.BUY if trade_amount > 0 else models.TransactionType.SELL,
            quantity=abs(shares_change),
            price=current_price,
            total_amount=abs(trade_amount),
            notes="Automated rebalancing",
            portfolio_id=portfolio_id
        )
        db.add(transaction)
        transactions.append({
            "ticker": holding.ticker,
            "type": "BUY" if trade_amount > 0 else "SELL",
            "shares": round(abs(shares_change), 4),
            "amount": round(abs(trade_amount), 2)
        })
    
    db.commit()
    
    return {
        "success": True,
        "message": "Rebalancing completed",
        "transactions": transactions
    }


# Stock Search Endpoint
@router.get("/stocks/search")
async def search_stock(query: str):
    """Search for stocks by name or ticker"""
    if len(query) < 1:
        return {"results": []}
    
    results = search_stocks(query)
    return {"results": results}


@router.get("/stocks/{ticker}/quote")
async def get_stock_quote_endpoint(ticker: str):
    """Get current quote for a stock"""
    from services.stock_service import get_stock_quote
    
    quote = await get_stock_quote(ticker)
    if not quote:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    return quote


@router.get("/stocks/{ticker}/history")
async def get_stock_history(ticker: str, days: int = 365):
    """Get historical prices for a stock"""
    prices = await get_historical_prices(ticker, days=min(days, 1825))  # Max 5 years
    return {"ticker": ticker, "prices": prices}


@router.get("/portfolio/{portfolio_id}/benchmark")
async def get_portfolio_vs_benchmark(
    portfolio_id: int,
    benchmark: str = Query("^NSEI", description="Benchmark index: ^NSEI (NIFTY 50), ^BSESN (SENSEX)"),
    period: str = Query("1Y", description="Time period: 1M, 3M, 6M, 1Y"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compare portfolio performance against benchmark index.
    
    Returns both portfolio and benchmark returns normalized to start at 100,
    allowing direct visual comparison of growth trajectories on the same chart.
    
    Benchmark options:
    - ^NSEI = NIFTY 50 (default for Indian investors)
    - ^BSESN = BSE SENSEX
    """
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Determine date range
    now = datetime.utcnow()
    days = {"1M": 30, "3M": 90, "6M": 180, "1Y": 365}.get(period, 365)
    start_date = now - timedelta(days=days)
    
    # Get benchmark historical prices
    benchmark_prices = await get_historical_prices(benchmark, days=days)
    
    if not benchmark_prices:
        # Fallback: Generate synthetic benchmark data
        benchmark_prices = [
            {"date": (now - timedelta(days=i)).strftime("%Y-%m-%d"), "close": 22000 * (1 + (i/days) * 0.08)}
            for i in range(days, 0, -30)
        ]
    
    # Get portfolio transactions to calculate historical value
    transactions = db.query(models.Transaction).filter(
        models.Transaction.portfolio_id == portfolio_id,
        models.Transaction.executed_at >= start_date
    ).order_by(models.Transaction.executed_at.asc()).all()
    
    # Get current portfolio value
    tickers = [h.ticker for h in portfolio.holdings]
    current_prices = await get_stock_prices(tickers) if tickers else {}
    
    current_value = sum(
        h.quantity * current_prices.get(h.ticker, h.avg_buy_price)
        for h in portfolio.holdings
    )
    invested = sum(h.quantity * h.avg_buy_price for h in portfolio.holdings)
    
    # Build comparison data (normalized to 100)
    # For simplicity, we'll return percentage returns over time
    comparison = []
    
    # Process benchmark prices - normalize to starting value = 100
    if benchmark_prices:
        start_price = benchmark_prices[0].get("close", 100) if isinstance(benchmark_prices[0], dict) else benchmark_prices[0]
        for i, bp in enumerate(benchmark_prices):
            price = bp.get("close", 0) if isinstance(bp, dict) else bp
            date = bp.get("date", "") if isinstance(bp, dict) else ""
            normalized = (price / start_price) * 100 if start_price else 100
            comparison.append({
                "date": date,
                "benchmark": round(normalized, 2),
                "portfolio": 100  # Will be updated below
            })
    
    # Calculate portfolio normalized value based on return
    portfolio_return_pct = ((current_value - invested) / invested * 100) if invested > 0 else 0
    
    # Update portfolio values in comparison (simplified linear interpolation)
    for i, point in enumerate(comparison):
        # Linear interpolation from 100 to final value
        progress = (i + 1) / len(comparison) if comparison else 1
        point["portfolio"] = round(100 + (portfolio_return_pct * progress), 2)
    
    return {
        "portfolio_id": portfolio_id,
        "benchmark": benchmark,
        "period": period,
        "portfolio_return": round(portfolio_return_pct, 2),
        "benchmark_return": round(comparison[-1]["benchmark"] - 100, 2) if comparison else 0,
        "comparison": comparison[-12:] if len(comparison) > 12 else comparison,  # Last 12 data points
        "outperformance": round(portfolio_return_pct - (comparison[-1]["benchmark"] - 100 if comparison else 0), 2)
    }

