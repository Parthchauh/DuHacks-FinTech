"""
AI Router - Portfolio AI Analysis
===================================
Endpoints for AI-powered portfolio recommendations.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from services.auth_service import get_current_user
from services.ai_service import analyze_portfolio_with_ai, explain_recommendation
from services.stock_service import get_stock_prices

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/analyze/{portfolio_id}")
async def analyze_portfolio(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI-powered portfolio analysis and suggestions"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get current prices
    tickers = [h.ticker for h in portfolio.holdings]
    current_prices = await get_stock_prices(tickers) if tickers else {}
    
    # Build holdings data
    holdings = []
    total_value = 0
    
    for h in portfolio.holdings:
        current_price = current_prices.get(h.ticker, h.avg_buy_price)
        current_value = h.quantity * current_price
        invested = h.quantity * h.avg_buy_price
        total_value += current_value
        
        holdings.append({
            "ticker": h.ticker,
            "name": h.name,
            "asset_type": h.asset_type,
            "quantity": h.quantity,
            "avg_buy_price": h.avg_buy_price,
            "current_price": current_price,
            "current_value": current_value,
            "profit_loss": current_value - invested,
            "profit_loss_percent": ((current_value - invested) / invested * 100) if invested > 0 else 0
        })
    
    # Calculate allocations
    for h in holdings:
        h["actual_allocation"] = (h["current_value"] / total_value * 100) if total_value > 0 else 0
    
    # Get metrics (simplified)
    total_invested = sum(h["quantity"] * h["avg_buy_price"] for h in holdings)
    total_return = total_value - total_invested
    
    metrics = {
        "total_value": total_value,
        "total_invested": total_invested,
        "total_return": total_return,
        "total_return_percent": (total_return / total_invested * 100) if total_invested > 0 else 0,
        "risk_score": 5,  # Would calculate from volatility
        "sharpe_ratio": 1.0  # Would calculate from returns/volatility
    }
    
    # Get AI analysis
    analysis = await analyze_portfolio_with_ai(holdings, metrics)
    
    return {
        "portfolio_id": portfolio_id,
        "analysis": analysis,
        "holdings_count": len(holdings),
        "total_value": total_value
    }


@router.post("/explain")
async def explain_action(
    ticker: str,
    action: str,
    allocation: float = 0,
    return_pct: float = 0,
    current_user: models.User = Depends(get_current_user)
):
    """Get detailed explanation for a recommendation"""
    context = {
        "allocation": allocation,
        "return": return_pct,
        "risk_contribution": "moderate"
    }
    
    explanation = await explain_recommendation(ticker, action, context)
    
    return {"explanation": explanation}
