"""
Dividend Router - Track Dividend Income
========================================
CRUD endpoints for managing dividend payments and summaries.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from database import get_db
import models
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/dividends", tags=["Dividends"])


# ============== Schemas ==============
class DividendCreate(BaseModel):
    holding_id: int
    amount: float
    per_share: Optional[float] = None
    ex_date: Optional[datetime] = None
    pay_date: Optional[datetime] = None


class DividendResponse(BaseModel):
    id: int
    holding_id: int
    ticker: str
    name: str
    amount: float
    per_share: Optional[float]
    ex_date: Optional[datetime]
    pay_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class DividendSummary(BaseModel):
    total_dividends: float
    ytd_dividends: float
    monthly_average: float
    last_12_months: list
    top_payers: list


# ============== Endpoints ==============
@router.get("/")
async def list_dividends(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all dividends for a portfolio"""
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get dividends for all holdings in this portfolio
    holding_ids = [h.id for h in portfolio.holdings]
    
    dividends = db.query(models.Dividend).filter(
        models.Dividend.holding_id.in_(holding_ids)
    ).order_by(models.Dividend.pay_date.desc()).all()
    
    result = []
    for d in dividends:
        result.append({
            "id": d.id,
            "holding_id": d.holding_id,
            "ticker": d.holding.ticker,
            "name": d.holding.name,
            "amount": d.amount,
            "per_share": d.per_share,
            "ex_date": d.ex_date,
            "pay_date": d.pay_date,
            "created_at": d.created_at
        })
    
    return {"dividends": result}


@router.post("/")
async def create_dividend(
    dividend: DividendCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record a new dividend payment"""
    # Verify holding ownership
    holding = db.query(models.Holding).join(models.Portfolio).filter(
        models.Holding.id == dividend.holding_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    
    new_dividend = models.Dividend(
        holding_id=dividend.holding_id,
        amount=dividend.amount,
        per_share=dividend.per_share,
        ex_date=dividend.ex_date,
        pay_date=dividend.pay_date or datetime.utcnow()
    )
    
    db.add(new_dividend)
    db.commit()
    db.refresh(new_dividend)
    
    return {
        "id": new_dividend.id,
        "holding_id": new_dividend.holding_id,
        "ticker": holding.ticker,
        "name": holding.name,
        "amount": new_dividend.amount,
        "message": "Dividend recorded successfully"
    }


@router.delete("/{dividend_id}")
async def delete_dividend(
    dividend_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a dividend record"""
    dividend = db.query(models.Dividend).join(
        models.Holding
    ).join(
        models.Portfolio
    ).filter(
        models.Dividend.id == dividend_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not dividend:
        raise HTTPException(status_code=404, detail="Dividend not found")
    
    db.delete(dividend)
    db.commit()
    
    return {"message": "Dividend deleted successfully"}


@router.get("/summary")
async def get_dividend_summary(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dividend summary with monthly breakdown"""
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    holding_ids = [h.id for h in portfolio.holdings]
    
    # Total dividends
    total = db.query(func.sum(models.Dividend.amount)).filter(
        models.Dividend.holding_id.in_(holding_ids)
    ).scalar() or 0
    
    # YTD dividends
    current_year = datetime.utcnow().year
    ytd = db.query(func.sum(models.Dividend.amount)).filter(
        models.Dividend.holding_id.in_(holding_ids),
        extract('year', models.Dividend.pay_date) == current_year
    ).scalar() or 0
    
    # Monthly breakdown for last 12 months
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_data = []
    
    for month_num in range(1, 13):
        month_total = db.query(func.sum(models.Dividend.amount)).filter(
            models.Dividend.holding_id.in_(holding_ids),
            extract('year', models.Dividend.pay_date) == current_year,
            extract('month', models.Dividend.pay_date) == month_num
        ).scalar() or 0
        
        monthly_data.append({
            "month": months[month_num - 1],
            "amount": round(month_total, 2)
        })
    
    # Top dividend payers
    top_payers = db.query(
        models.Holding.ticker,
        models.Holding.name,
        func.sum(models.Dividend.amount).label('total')
    ).join(
        models.Dividend
    ).filter(
        models.Holding.id.in_(holding_ids)
    ).group_by(
        models.Holding.id
    ).order_by(
        func.sum(models.Dividend.amount).desc()
    ).limit(5).all()
    
    return {
        "total_dividends": round(total, 2),
        "ytd_dividends": round(ytd, 2),
        "monthly_average": round(ytd / max(datetime.utcnow().month, 1), 2),
        "last_12_months": monthly_data,
        "top_payers": [
            {"ticker": t[0], "name": t[1], "total": round(t[2], 2)}
            for t in top_payers
        ]
    }
