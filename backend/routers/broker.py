"""
Broker Router - External Broker Integration
=============================================
Endpoints for connecting and syncing with stock brokers.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
import models
from services.auth_service import get_current_user
from services.broker_service import sync_broker_holdings, get_broker_auth_url

router = APIRouter(prefix="/api/broker", tags=["Broker"])


class BrokerConnectRequest(BaseModel):
    broker: str  # "zerodha", "groww"
    api_key: Optional[str] = None
    access_token: Optional[str] = None


@router.get("/auth/{broker}")
async def get_auth_redirect(
    broker: str,
    redirect_uri: str = Query(default="http://localhost:3000/settings/broker/callback")
):
    """Get OAuth authorization URL for broker"""
    auth_url = get_broker_auth_url(broker, redirect_uri)
    
    if not auth_url:
        raise HTTPException(status_code=400, detail=f"Broker {broker} not supported")
    
    return {"auth_url": auth_url, "broker": broker}


@router.post("/connect")
async def connect_broker(
    request: BrokerConnectRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect to a broker with API credentials"""
    if not request.api_key or not request.access_token:
        raise HTTPException(status_code=400, detail="API key and access token required")
    
    # Store broker credentials (encrypted in production)
    # For now, just test the connection
    result = await sync_broker_holdings(
        broker=request.broker,
        api_key=request.api_key,
        access_token=request.access_token
    )
    
    if result.get("success"):
        return {
            "message": f"Successfully connected to {request.broker}",
            "holdings_found": result.get("holdings_count", 0)
        }
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Connection failed"))


@router.post("/sync/{portfolio_id}")
async def sync_holdings(
    portfolio_id: int,
    broker: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync holdings from broker to portfolio"""
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # In production, retrieve stored credentials
    # For now, return placeholder
    return {
        "message": f"Sync from {broker} is not yet implemented",
        "portfolio_id": portfolio_id,
        "status": "pending",
        "note": "Please provide API credentials via /broker/connect first"
    }


@router.get("/supported")
async def get_supported_brokers():
    """Get list of supported brokers"""
    return {
        "brokers": [
            {
                "id": "zerodha",
                "name": "Zerodha Kite",
                "status": "available",
                "requires_oauth": True,
                "website": "https://zerodha.com"
            },
            {
                "id": "groww",
                "name": "Groww",
                "status": "coming_soon",
                "requires_oauth": False,
                "website": "https://groww.in"
            },
            {
                "id": "upstox",
                "name": "Upstox",
                "status": "coming_soon",
                "requires_oauth": True,
                "website": "https://upstox.com"
            }
        ]
    }
