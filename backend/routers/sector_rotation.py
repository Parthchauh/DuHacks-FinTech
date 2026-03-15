"""
Sector Rotation Router - Sector Momentum & Rotation Signals
=============================================================
Endpoints for sector-based momentum analysis:
- GET /rankings: All sectors ranked by composite RS
- GET /signals: Top-N overweight/underweight signals with stock picks
- GET /suggestions/{portfolio_id}: Personalized buy/sell rotation plan
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from services.auth_service import get_current_user
from services.sector_service import (
    get_sector_rankings,
    get_sector_signals,
    get_rotation_suggestions,
)

logger = logging.getLogger("sector_rotation")

router = APIRouter(prefix="/api/sector-rotation", tags=["Sector Rotation"])


@router.get("/rankings")
async def sector_rankings(top_n: int = 5):
    """
    Get all sectors ranked by composite Relative Strength score.

    Query params:
        top_n: Number of top sectors to highlight (default 5)
    """
    try:
        data = await get_sector_rankings(top_n=top_n)
        return data
    except Exception as e:
        logger.exception(f"Error computing sector rankings: {e}")
        raise HTTPException(status_code=500, detail="Failed to compute sector rankings")


@router.get("/signals")
async def sector_signals(top_n: int = 3):
    """
    Get momentum signals with top stocks for overweight/underweight sectors.

    Query params:
        top_n: Number of top sectors to show (default 3)
    """
    try:
        data = await get_sector_signals(top_n=top_n)
        return data
    except Exception as e:
        logger.exception(f"Error computing sector signals: {e}")
        raise HTTPException(status_code=500, detail="Failed to compute sector signals")


@router.get("/suggestions/{portfolio_id}")
async def rotation_suggestions(
    portfolio_id: int,
    top_n: int = 3,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get personalized sector rotation buy/sell suggestions
    based on user's current portfolio holdings.

    Path params:
        portfolio_id: Portfolio to analyze
    Query params:
        top_n: Number of top sectors to rotate into (default 3)
    """
    # Verify portfolio belongs to user
    portfolio = (
        db.query(models.Portfolio)
        .filter(
            models.Portfolio.id == portfolio_id,
            models.Portfolio.user_id == current_user.id,
        )
        .first()
    )
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Get holdings with current prices
    holdings = (
        db.query(models.Holding)
        .filter(models.Holding.portfolio_id == portfolio_id)
        .all()
    )

    if not holdings:
        raise HTTPException(
            status_code=400,
            detail="Portfolio has no holdings. Add some holdings first.",
        )

    # Build holdings data using stored prices
    holdings_data = []
    total_value = 0.0
    for h in holdings:
        price = h.avg_buy_price
        current_value = h.quantity * price
        total_value += current_value
        holdings_data.append({
            "ticker": h.ticker,
            "name": h.name,
            "quantity": h.quantity,
            "current_price": price,
            "current_value": current_value,
        })

    try:
        suggestions = await get_rotation_suggestions(
            holdings=holdings_data,
            total_value=total_value,
            top_n=top_n,
        )
        suggestions["portfolio_id"] = portfolio_id
        suggestions["total_value"] = round(total_value, 2)
        return suggestions
    except Exception as e:
        logger.exception(f"Error computing rotation suggestions: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to compute rotation suggestions"
        )
