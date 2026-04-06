"""
OptiWealth — Live Market Data API Router
==========================================
Real-time stock data endpoints powered by Groww API with yfinance fallback.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

from services.groww_service import groww_data

router = APIRouter(
    prefix="/market",
    tags=["Live Market Data"],
)


class MultiSymbolRequest(BaseModel):
    symbols: List[str]
    exchange: str = "NSE"


@router.get("/quote/{symbol}")
async def get_quote(symbol: str, exchange: str = "NSE"):
    """Get full real-time quote for a single instrument.

    Returns: last_price, OHLC, volume, market_cap, 52-week range, depth.
    """
    try:
        data = await groww_data.get_full_quote(symbol, exchange)
        if not data:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")
        return {"symbol": symbol, "exchange": exchange, **data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ltp/{symbol}")
async def get_ltp_single(symbol: str, exchange: str = "NSE"):
    """Get last traded price for a single instrument."""
    try:
        price = await groww_data.get_live_price(symbol, exchange)
        return {"symbol": symbol, "ltp": price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ltp")
async def get_ltp_batch(req: MultiSymbolRequest):
    """Get LTP for multiple instruments (up to 50).

    Returns: {"prices": {"RELIANCE": 2500.5, "TCS": 3800.0}}
    """
    if len(req.symbols) > 50:
        raise HTTPException(status_code=400, detail="Max 50 symbols per request")
    try:
        prices = await groww_data.get_live_prices(req.symbols, req.exchange)
        return {"prices": prices, "count": len(prices)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ohlc")
async def get_ohlc_batch(req: MultiSymbolRequest):
    """Get OHLC data for multiple instruments (up to 50).

    Returns: {"data": {"RELIANCE": {"open": ..., "high": ..., ...}}}
    """
    if len(req.symbols) > 50:
        raise HTTPException(status_code=400, detail="Max 50 symbols per request")
    try:
        ohlc = await groww_data.get_ohlc(req.symbols, req.exchange)
        return {"data": ohlc, "count": len(ohlc)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
