"""
OptiWealth — Smallcase Gateway API Router
===========================================
Endpoints for broker connect, holdings sync, and order execution
via the Smallcase Gateway SDK.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from services.smallcase_service import (
    create_guest_session,
    create_connect_transaction,
    fetch_holdings,
    create_order_transaction,
    check_order_status,
)

router = APIRouter(
    prefix="/broker/smallcase",
    tags=["Smallcase Gateway"],
)


# ── Request / Response Models ─────────────────────────────────────────

class GuestSessionResponse(BaseModel):
    auth_token: str
    gateway_name: str


class ConnectRequest(BaseModel):
    auth_token: str
    broker: str = "kite"


class SyncRequest(BaseModel):
    auth_token: str


class OrderItem(BaseModel):
    symbol: str
    action: str      # BUY | SELL
    quantity: int
    exchange: str = "NSE"


class ExecuteRequest(BaseModel):
    auth_token: str
    trades: List[OrderItem]
    order_type: str = "MARKET"


class StatusRequest(BaseModel):
    auth_token: str
    transaction_id: str


# ── Endpoints ─────────────────────────────────────────────────────────

@router.post("/session", response_model=GuestSessionResponse)
async def get_gateway_session():
    """Initialize a Smallcase guest session for SDK initialization."""
    try:
        return await create_guest_session()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/connect")
async def connect_broker(req: ConnectRequest):
    """Create a broker connection transaction.

    The frontend uses the transactionId to open the Smallcase Gateway widget.
    """
    try:
        return await create_connect_transaction(req.auth_token, req.broker)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
async def sync_holdings(req: SyncRequest):
    """Fetch user's broker holdings via Smallcase API.

    Returns positions mapped to the internal Position format.
    """
    try:
        holdings = await fetch_holdings(req.auth_token)
        return {"holdings": holdings, "count": len(holdings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute")
async def execute_orders(req: ExecuteRequest):
    """Place a basket order for rebalancing execution via Smallcase.

    Creates a TRANSACTION intent with the provided trade list.
    """
    try:
        trades_dicts = [t.model_dump() for t in req.trades]
        result = await create_order_transaction(
            req.auth_token, trades_dicts, req.order_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/status")
async def get_order_status(req: StatusRequest):
    """Check the status of a previously created transaction."""
    try:
        return await check_order_status(req.auth_token, req.transaction_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
