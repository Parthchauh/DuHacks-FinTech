"""
OptiWealth — Charts Router (OHLCV, Indicators, Summary)
=========================================================
Serves historical candlestick data, technical indicators, and stock
summaries to the lightweight-charts frontend components.

Endpoints:
  GET /api/charts/{symbol}/ohlcv       — OHLCV candle data
  GET /api/charts/{symbol}/indicators   — EMA, RSI, ADX, support/resistance
  GET /api/charts/{symbol}/summary      — Quick stock summary header
  GET /api/charts/prices/live           — Batch live prices via Groww/yfinance
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/charts", tags=["charts"])

# ═════════════════════════════════════════════════════════════════════════
# TTL CACHE HELPER
# ═════════════════════════════════════════════════════════════════════════

_ohlcv_cache: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL_SEC = 300  # 5 minutes


def _cache_key(symbol: str, period: str, interval: str) -> str:
    return f"{symbol}|{period}|{interval}"


def _get_cached(key: str) -> Optional[List[Dict[str, Any]]]:
    entry = _ohlcv_cache.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL_SEC:
        return entry["data"]
    return None


def _set_cached(key: str, data: List[Dict[str, Any]]) -> None:
    _ohlcv_cache[key] = {"data": data, "ts": time.time()}


# ═════════════════════════════════════════════════════════════════════════
# PERIOD → INTERVAL MAPPING
# ═════════════════════════════════════════════════════════════════════════

PERIOD_INTERVAL_MAP = {
    "1D":  "5m",
    "1W":  "1h",
    "1M":  "1d",
    "3M":  "1d",
    "6M":  "1d",
    "1Y":  "1d",
    "5Y":  "1wk",
}

# yfinance-compatible period strings
PERIOD_YF_MAP = {
    "1D":  "1d",
    "1W":  "5d",
    "1M":  "1mo",
    "3M":  "3mo",
    "6M":  "6mo",
    "1Y":  "1y",
    "5Y":  "5y",
}


# ═════════════════════════════════════════════════════════════════════════
# RESPONSE MODELS
# ═════════════════════════════════════════════════════════════════════════

class OHLCVBar(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: int


class OHLCVResponse(BaseModel):
    symbol: str
    ohlcv: List[OHLCVBar]
    count: int


class IndicatorPoint(BaseModel):
    time: int
    value: float


class IndicatorsResponse(BaseModel):
    ema_50: List[IndicatorPoint]
    ema_100: List[IndicatorPoint]
    rsi_14: List[IndicatorPoint]
    adx_14: List[IndicatorPoint]
    support: float
    resistance: float
    prev_close: float


class SummaryResponse(BaseModel):
    symbol: str
    company_name: str
    current_price: float
    prev_close: float
    day_high: float
    day_low: float
    week_52_high: float
    week_52_low: float
    market_cap: float
    pe_ratio: float
    sector: str
    volume: int


class LivePricesResponse(BaseModel):
    prices: Dict[str, float]


# ═════════════════════════════════════════════════════════════════════════
# HELPER: fetch OHLCV from yfinance
# ═════════════════════════════════════════════════════════════════════════

def _fetch_ohlcv(symbol: str, period: str, interval: str) -> List[Dict[str, Any]]:
    """Fetch OHLCV bars from yfinance for a NSE symbol."""
    import yfinance as yf

    clean = symbol.strip().replace(".NS", "").replace(".BO", "")
    yf_period = PERIOD_YF_MAP.get(period, "1mo")
    yf_interval = interval

    ticker = yf.Ticker(f"{clean}.NS")
    hist = ticker.history(period=yf_period, interval=yf_interval)

    if hist.empty:
        return []

    bars: List[Dict[str, Any]] = []
    for idx, row in hist.iterrows():
        ts = int(idx.timestamp())
        bars.append({
            "time":   ts,
            "open":   round(float(row["Open"]),   2),
            "high":   round(float(row["High"]),   2),
            "low":    round(float(row["Low"]),    2),
            "close":  round(float(row["Close"]),  2),
            "volume": int(row["Volume"]),
        })

    return bars


# ═════════════════════════════════════════════════════════════════════════
# HELPER: compute technical indicators
# ═════════════════════════════════════════════════════════════════════════

def _compute_ema(closes: List[float], times: List[int], period: int) -> List[Dict[str, Any]]:
    """Wilder-style EMA (alpha = 2 / (period + 1))."""
    if not closes:
        return []
    alpha = 2.0 / (period + 1)
    ema_val = closes[0]
    result = [{"time": times[0], "value": round(ema_val, 2)}]
    for i in range(1, len(closes)):
        ema_val = closes[i] * alpha + ema_val * (1.0 - alpha)
        result.append({"time": times[i], "value": round(ema_val, 2)})
    return result


def _compute_rsi(closes: List[float], times: List[int], period: int = 14) -> List[Dict[str, Any]]:
    """Standard RSI via Wilder's smoothed average of gains/losses."""
    if len(closes) < period + 1:
        return []

    result: List[Dict[str, Any]] = []
    gains = []
    losses = []

    for i in range(1, len(closes)):
        change = closes[i] - closes[i - 1]
        gains.append(max(change, 0.0))
        losses.append(max(-change, 0.0))

    # Seed with SMA
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

        if avg_loss == 0:
            rsi = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi = 100.0 - (100.0 / (1.0 + rs))

        result.append({"time": times[i + 1], "value": round(rsi, 2)})

    return result


def _compute_adx(
    highs: List[float],
    lows: List[float],
    closes: List[float],
    times: List[int],
    period: int = 14,
) -> List[Dict[str, Any]]:
    """ADX(14) using Wilder's smoothing."""
    if len(closes) < period + 1:
        return []

    plus_dm_list = []
    minus_dm_list = []
    tr_list = []

    for i in range(1, len(closes)):
        high_diff = highs[i] - highs[i - 1]
        low_diff = lows[i - 1] - lows[i]

        plus_dm = max(high_diff, 0.0) if high_diff > low_diff else 0.0
        minus_dm = max(low_diff, 0.0) if low_diff > high_diff else 0.0

        tr = max(
            highs[i] - lows[i],
            abs(highs[i] - closes[i - 1]),
            abs(lows[i] - closes[i - 1]),
        )

        plus_dm_list.append(plus_dm)
        minus_dm_list.append(minus_dm)
        tr_list.append(tr)

    if len(tr_list) < period:
        return []

    # Wilder smoothing for initial values
    smoothed_tr = sum(tr_list[:period])
    smoothed_plus = sum(plus_dm_list[:period])
    smoothed_minus = sum(minus_dm_list[:period])

    dx_values: List[float] = []
    result: List[Dict[str, Any]] = []

    for i in range(period, len(tr_list)):
        smoothed_tr = smoothed_tr - (smoothed_tr / period) + tr_list[i]
        smoothed_plus = smoothed_plus - (smoothed_plus / period) + plus_dm_list[i]
        smoothed_minus = smoothed_minus - (smoothed_minus / period) + minus_dm_list[i]

        plus_di = 100.0 * smoothed_plus / smoothed_tr if smoothed_tr > 0 else 0.0
        minus_di = 100.0 * smoothed_minus / smoothed_tr if smoothed_tr > 0 else 0.0

        dx = 100.0 * abs(plus_di - minus_di) / (plus_di + minus_di) if (plus_di + minus_di) > 0 else 0.0
        dx_values.append(dx)

        if len(dx_values) >= period:
            if len(dx_values) == period:
                adx = sum(dx_values) / period
            else:
                adx = (result[-1]["value"] * (period - 1) + dx) / period
            result.append({"time": times[i + 1], "value": round(adx, 2)})

    return result


# ═════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════

@router.get("/{symbol}/ohlcv", response_model=OHLCVResponse)
async def get_ohlcv(
    symbol: str,
    period: str = Query(default="1M", regex="^(1D|1W|1M|3M|6M|1Y|5Y)$"),
    interval: str = Query(default=""),
):
    """Fetch OHLCV candle data for lightweight-charts.

    If `interval` is not explicitly provided, it is derived from `period`
    using the PERIOD_INTERVAL_MAP.  Results are cached for 5 minutes.
    """
    if not interval:
        interval = PERIOD_INTERVAL_MAP.get(period, "1d")

    cache_k = _cache_key(symbol, period, interval)
    cached = _get_cached(cache_k)
    if cached is not None:
        return OHLCVResponse(symbol=symbol, ohlcv=cached, count=len(cached))

    try:
        bars = _fetch_ohlcv(symbol, period, interval)
    except Exception as exc:
        logger.error("OHLCV fetch failed for %s: %s", symbol, exc)
        raise HTTPException(status_code=502, detail=f"Could not fetch chart data for {symbol}")

    if not bars:
        return OHLCVResponse(symbol=symbol, ohlcv=[], count=0)

    _set_cached(cache_k, bars)
    return OHLCVResponse(symbol=symbol, ohlcv=bars, count=len(bars))


@router.get("/{symbol}/indicators", response_model=IndicatorsResponse)
async def get_indicators(
    symbol: str,
    period: str = Query(default="1Y", regex="^(1M|3M|6M|1Y|5Y)$"),
):
    """Return pre-computed technical indicators (EMA, RSI, ADX) and key levels."""
    try:
        bars = _fetch_ohlcv(symbol, period, "1d")
    except Exception as exc:
        logger.error("Indicators fetch failed for %s: %s", symbol, exc)
        raise HTTPException(status_code=502, detail=f"Could not compute indicators for {symbol}")

    if len(bars) < 2:
        raise HTTPException(status_code=404, detail=f"Insufficient data for {symbol}")

    closes = [b["close"] for b in bars]
    highs = [b["high"] for b in bars]
    lows = [b["low"] for b in bars]
    times = [b["time"] for b in bars]

    ema_50 = _compute_ema(closes, times, 50)
    ema_100 = _compute_ema(closes, times, 100)
    rsi_14 = _compute_rsi(closes, times, 14)
    adx_14 = _compute_adx(highs, lows, closes, times, 14)

    return IndicatorsResponse(
        ema_50=ema_50,
        ema_100=ema_100,
        rsi_14=rsi_14,
        adx_14=adx_14,
        support=min(lows),
        resistance=max(highs),
        prev_close=closes[-2] if len(closes) >= 2 else closes[-1],
    )


@router.get("/{symbol}/summary", response_model=SummaryResponse)
async def get_summary(symbol: str):
    """Quick stock info for chart header display."""
    try:
        import yfinance as yf

        clean = symbol.strip().replace(".NS", "").replace(".BO", "")
        ticker = yf.Ticker(f"{clean}.NS")
        info = ticker.info or {}

        # Also try Groww service for live price
        live_price = 0.0
        try:
            from services.groww_service import groww_data
            live_price = await groww_data.get_live_price(clean)
        except Exception:
            pass

        current_price = live_price if live_price > 0 else float(
            info.get("currentPrice", info.get("regularMarketPrice", 0)) or 0
        )

        return SummaryResponse(
            symbol=clean,
            company_name=str(info.get("longName", info.get("shortName", clean))),
            current_price=round(current_price, 2),
            prev_close=round(float(info.get("previousClose", info.get("regularMarketPreviousClose", 0)) or 0), 2),
            day_high=round(float(info.get("dayHigh", info.get("regularMarketDayHigh", 0)) or 0), 2),
            day_low=round(float(info.get("dayLow", info.get("regularMarketDayLow", 0)) or 0), 2),
            week_52_high=round(float(info.get("fiftyTwoWeekHigh", 0) or 0), 2),
            week_52_low=round(float(info.get("fiftyTwoWeekLow", 0) or 0), 2),
            market_cap=float(info.get("marketCap", 0) or 0),
            pe_ratio=round(float(info.get("trailingPE", info.get("forwardPE", 0)) or 0), 2),
            sector=str(info.get("sector", "N/A")),
            volume=int(info.get("volume", info.get("regularMarketVolume", 0)) or 0),
        )
    except Exception as exc:
        logger.error("Summary fetch failed for %s: %s", symbol, exc)
        raise HTTPException(status_code=502, detail=f"Could not fetch summary for {symbol}")


@router.get("/prices/live", response_model=LivePricesResponse)
async def get_live_prices(
    symbols: str = Query(..., description="Comma-separated symbols, e.g. RELIANCE,TCS,INFY"),
):
    """Batch live price endpoint — Groww primary, yfinance fallback."""
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        raise HTTPException(status_code=400, detail="No symbols provided")
    if len(symbol_list) > 50:
        raise HTTPException(status_code=400, detail="Max 50 symbols per request")

    try:
        from services.groww_service import groww_data
        prices = await groww_data.get_live_prices(symbol_list)
        return LivePricesResponse(prices=prices)
    except Exception as exc:
        logger.error("Live prices fetch failed: %s", exc)
        raise HTTPException(status_code=502, detail="Could not fetch live prices")
