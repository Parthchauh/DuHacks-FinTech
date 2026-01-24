"""
Export Router - Download Portfolio Reports
==========================================
Endpoints for downloading portfolio data as Excel or PDF files.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from database import get_db
import models
from services.auth_service import get_current_user
from services.export_service import generate_excel, generate_pdf
from services.stock_service import get_stock_prices
from datetime import datetime

router = APIRouter(prefix="/api/export", tags=["Export"])


async def get_portfolio_data(portfolio_id: int, user_id: int, db: Session):
    """Helper to fetch portfolio with all data needed for export"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == user_id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get current prices for holdings
    tickers = [h.ticker for h in portfolio.holdings]
    current_prices = await get_stock_prices(tickers) if tickers else {}
    
    # Enrich holdings with current price data
    holdings_data = []
    total_value = 0
    total_invested = 0
    
    for h in portfolio.holdings:
        current_price = current_prices.get(h.ticker, h.avg_buy_price)
        current_value = h.quantity * current_price
        invested = h.quantity * h.avg_buy_price
        profit_loss = current_value - invested
        profit_loss_percent = (profit_loss / invested * 100) if invested > 0 else 0
        
        total_value += current_value
        total_invested += invested
        
        holdings_data.append({
            "ticker": h.ticker,
            "name": h.name,
            "asset_type": h.asset_type,
            "quantity": h.quantity,
            "avg_buy_price": h.avg_buy_price,
            "current_price": current_price,
            "current_value": current_value,
            "profit_loss": profit_loss,
            "profit_loss_percent": profit_loss_percent,
            "actual_allocation": 0  # Will calculate below
        })
    
    # Calculate allocations
    for h in holdings_data:
        h["actual_allocation"] = (h["current_value"] / total_value * 100) if total_value > 0 else 0
    
    # Get transactions
    transactions = db.query(models.Transaction).filter(
        models.Transaction.portfolio_id == portfolio_id
    ).order_by(models.Transaction.executed_at.desc()).all()
    
    transactions_data = []
    for t in transactions:
        transactions_data.append({
            "executed_at": t.executed_at,
            "ticker": t.ticker,
            "transaction_type": t.transaction_type.value,
            "quantity": t.quantity,
            "price": t.price,
            "total_amount": t.total_amount,
            "notes": t.notes or ""
        })
    
    # Calculate metrics
    total_return = total_value - total_invested
    total_return_percent = (total_return / total_invested * 100) if total_invested > 0 else 0
    
    metrics = {
        "total_value": total_value,
        "total_invested": total_invested,
        "total_return": total_return,
        "total_return_percent": total_return_percent,
        "sharpe_ratio": 0,  # Would need historical data
        "volatility": 0,
        "beta": 1.0,
        "risk_score": 5,
        "risk_level": "Moderate"
    }
    
    return portfolio.name, holdings_data, transactions_data, metrics


@router.get("/excel/{portfolio_id}")
async def export_excel(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download portfolio as Excel file"""
    portfolio_name, holdings, transactions, metrics = await get_portfolio_data(
        portfolio_id, current_user.id, db
    )
    
    excel_bytes = generate_excel(portfolio_name, holdings, transactions, metrics)
    
    filename = f"OptiWealth_{portfolio_name}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/pdf/{portfolio_id}")
async def export_pdf(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download portfolio as PDF report"""
    portfolio_name, holdings, transactions, metrics = await get_portfolio_data(
        portfolio_id, current_user.id, db
    )
    
    pdf_bytes = generate_pdf(portfolio_name, holdings, transactions, metrics)
    
    filename = f"OptiWealth_{portfolio_name}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
