"""
Tax Router - Capital Gains and Tax-Loss Harvesting
===================================================
Endpoints for tax calculations and harvesting opportunities.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from services.auth_service import get_current_user
from services.tax_service import calculate_capital_gains, find_harvest_opportunities, estimate_tax_liability
from services.stock_service import get_stock_prices

router = APIRouter(prefix="/api/tax", tags=["Tax"])


@router.get("/gains/{portfolio_id}")
async def get_capital_gains(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get capital gains summary for a portfolio"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get holdings data
    holdings = []
    for h in portfolio.holdings:
        holdings.append({
            "ticker": h.ticker,
            "name": h.name,
            "quantity": h.quantity,
            "avg_buy_price": h.avg_buy_price
        })
    
    # Get transactions
    transactions = db.query(models.Transaction).filter(
        models.Transaction.portfolio_id == portfolio_id
    ).all()
    
    txn_data = []
    for t in transactions:
        txn_data.append({
            "ticker": t.ticker,
            "transaction_type": t.transaction_type.value,
            "quantity": t.quantity,
            "price": t.price,
            "total_amount": t.total_amount,
            "executed_at": t.executed_at
        })
    
    gains = calculate_capital_gains(holdings, txn_data)
    
    return gains


@router.get("/harvest/{portfolio_id}")
async def get_harvest_opportunities(
    portfolio_id: int,
    min_loss: float = 1000,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tax-loss harvesting opportunities"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get current prices
    tickers = [h.ticker for h in portfolio.holdings]
    current_prices = await get_stock_prices(tickers) if tickers else {}
    
    # Build holdings with current values
    holdings = []
    for h in portfolio.holdings:
        current_price = current_prices.get(h.ticker, h.avg_buy_price)
        holdings.append({
            "ticker": h.ticker,
            "name": h.name,
            "quantity": h.quantity,
            "avg_buy_price": h.avg_buy_price,
            "current_price": current_price,
            "current_value": h.quantity * current_price
        })
    
    opportunities = find_harvest_opportunities(holdings, min_loss)
    
    total_harvestable = sum(o["unrealized_loss"] for o in opportunities)
    total_tax_savings = sum(o["potential_tax_savings"] for o in opportunities)
    
    return {
        "opportunities": opportunities,
        "total_harvestable_loss": round(total_harvestable, 2),
        "potential_tax_savings": round(total_tax_savings, 2),
        "count": len(opportunities)
    }


@router.get("/summary/{portfolio_id}")
async def get_tax_summary(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive tax summary"""
    # Get gains
    gains = await get_capital_gains(portfolio_id, current_user, db)
    
    # Get harvest opportunities
    harvest = await get_harvest_opportunities(portfolio_id, 0, current_user, db)
    
    # Estimate tax liability
    liability = estimate_tax_liability(
        gains["short_term_gains"],
        gains["long_term_gains"]
    )
    
    return {
        "capital_gains": gains,
        "harvest_opportunities": harvest,
        "tax_liability": liability
    }
