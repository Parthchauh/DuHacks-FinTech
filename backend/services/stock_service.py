"""
OptiWealth — Stock Service
===========================
Unified price fetching layer used by portfolio, analytics, and charts modules.

Fallback chain for live prices:
  1. groww_data.get_live_prices() — Groww SDK (30s cache) → yfinance → mock
  2. Alpha Vantage API (if key configured and != 'demo')
  3. yfinance direct (historical)
  4. generate_mock_historical_data() — GBM simulation

This service wraps groww_service and should be the ONLY price source for all
backend modules. Never call yfinance directly from routers — use this service.
"""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from cachetools import TTLCache
from config import get_settings
from services.groww_service import groww_data, INDIAN_STOCKS

logger = logging.getLogger("optiwealth.stock")
settings = get_settings()

# Longer-lived cache for price data used in analytics (5 minutes)
# groww_service has its own 30s LTP cache; this gives analytics a 5-min layer
price_cache: TTLCache = TTLCache(maxsize=500, ttl=300)
historical_cache: TTLCache = TTLCache(maxsize=100, ttl=3600)  # 1hr for history


# ═══════════════════════════════════════════════════════════════════════
# SINGLE QUOTE
# ═══════════════════════════════════════════════════════════════════════

async def get_stock_quote(ticker: str) -> Optional[Dict[str, Any]]:
    """
    Get current stock quote for a single ticker.

    Returns dict: { ticker, price, change, change_percent, volume, fetched_at }
    Returns None if completely unavailable.
    """
    clean = ticker.strip().upper().replace(".NS", "").replace(".BO", "")

    # ── 1. Groww / yfinance / mock via groww_data ─────────────────────
    try:
        quote = await groww_data.get_full_quote(clean)
        if quote and quote.get("last_price", 0) > 0:
            ohlc = quote.get("ohlc", {})
            prev_close = float(ohlc.get("close", 0) or quote.get("last_price", 0))
            price = float(quote["last_price"])
            change = round(price - prev_close, 2) if prev_close else 0.0
            change_pct = round((change / prev_close * 100), 2) if prev_close else 0.0

            result = {
                "ticker": clean,
                "price": round(price, 2),
                "change": change,
                "change_percent": change_pct,
                "volume": int(quote.get("volume", 0) or 0),
                "fetched_at": datetime.utcnow().isoformat(),
            }
            price_cache[clean] = result
            return result
    except Exception as exc:
        logger.debug("[stock] get_full_quote failed for %s: %s", clean, exc)

    # ── 2. Cache fallback ─────────────────────────────────────────────
    if clean in price_cache:
        return price_cache[clean]

    # ── 3. Alpha Vantage (if real key exists) ─────────────────────────
    if settings.ALPHA_VANTAGE_API_KEY and settings.ALPHA_VANTAGE_API_KEY != "demo":
        try:
            import httpx

            async with httpx.AsyncClient(timeout=10.0) as client:
                symbol = f"{clean}.BSE"
                resp = await client.get(
                    "https://www.alphavantage.co/query",
                    params={
                        "function": "GLOBAL_QUOTE",
                        "symbol": symbol,
                        "apikey": settings.ALPHA_VANTAGE_API_KEY,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    gq = data.get("Global Quote", {})
                    if gq and gq.get("05. price"):
                        price = float(gq["05. price"])
                        result = {
                            "ticker": clean,
                            "price": price,
                            "change": float(gq.get("09. change", 0)),
                            "change_percent": float(
                                gq.get("10. change percent", "0%").replace("%", "")
                            ),
                            "volume": int(gq.get("06. volume", 0)),
                            "fetched_at": datetime.utcnow().isoformat(),
                        }
                        price_cache[clean] = result
                        return result
        except Exception as exc:
            logger.debug("[stock] Alpha Vantage failed for %s: %s", clean, exc)

    return None


# ═══════════════════════════════════════════════════════════════════════
# BATCH PRICES
# ═══════════════════════════════════════════════════════════════════════

async def get_stock_prices(tickers: List[str]) -> Dict[str, float]:
    """
    Get current prices for multiple tickers.

    Returns: {"RELIANCE": 1304.70, "TCS": 3473.90, ...}
    Uses groww_data batch LTP (Groww SDK → yfinance → mock fallback).
    """
    if not tickers:
        return {}

    clean_tickers = [
        t.strip().upper().replace(".NS", "").replace(".BO", "")
        for t in tickers
    ]

    try:
        prices = await groww_data.get_live_prices(clean_tickers)
        logger.debug("[stock] Batch prices fetched for %d tickers", len(prices))
        return prices
    except Exception as exc:
        logger.error("[stock] get_live_prices failed: %s", exc, exc_info=True)
        # Absolute last resort — static mock prices
        return {
            t: float(INDIAN_STOCKS.get(t, {}).get("price", 0))
            for t in clean_tickers
        }


# ═══════════════════════════════════════════════════════════════════════
# HISTORICAL PRICES
# ═══════════════════════════════════════════════════════════════════════

async def get_historical_prices(ticker: str, days: int = 365) -> List[Dict]:
    """
    Get historical OHLCV prices for a ticker as a list of dicts.

    Returns: [{"date": datetime, "open": float, "high": float, "low": float,
               "close": float, "volume": int}, ...]

    Fallback chain:
      1. TTL cache (1hr)
      2. Alpha Vantage (if real key)
      3. yfinance
      4. Mock GBM simulation
    """
    clean = ticker.strip().upper().replace(".NS", "").replace(".BO", "")
    cache_key = f"{clean}_{days}"

    if cache_key in historical_cache:
        return historical_cache[cache_key]

    # ── Alpha Vantage ──────────────────────────────────────────────────
    if settings.ALPHA_VANTAGE_API_KEY and settings.ALPHA_VANTAGE_API_KEY != "demo":
        try:
            import httpx

            async with httpx.AsyncClient(timeout=30.0) as client:
                symbol = f"{clean}.BSE"
                resp = await client.get(
                    "https://www.alphavantage.co/query",
                    params={
                        "function": "TIME_SERIES_DAILY",
                        "symbol": symbol,
                        "outputsize": "full" if days > 100 else "compact",
                        "apikey": settings.ALPHA_VANTAGE_API_KEY,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    ts = data.get("Time Series (Daily)", {})
                    if ts:
                        result = []
                        for date_str, vals in list(ts.items())[:days]:
                            result.append({
                                "date":   datetime.strptime(date_str, "%Y-%m-%d"),
                                "open":   float(vals["1. open"]),
                                "high":   float(vals["2. high"]),
                                "low":    float(vals["3. low"]),
                                "close":  float(vals["4. close"]),
                                "volume": int(vals["5. volume"]),
                            })
                        historical_cache[cache_key] = result
                        return result
        except Exception as exc:
            logger.debug("[stock] Alpha Vantage history failed for %s: %s", clean, exc)

    # ── yfinance ───────────────────────────────────────────────────────
    try:
        import yfinance as yf

        # Map days → yfinance period string
        if days <= 30:
            yf_period = "1mo"
        elif days <= 90:
            yf_period = "3mo"
        elif days <= 180:
            yf_period = "6mo"
        elif days <= 365:
            yf_period = "1y"
        elif days <= 730:
            yf_period = "2y"
        else:
            yf_period = "5y"

        tk = yf.Ticker(f"{clean}.NS")
        hist = tk.history(period=yf_period, interval="1d")

        if not hist.empty:
            result = []
            for idx, row in hist.iterrows():
                result.append({
                    "date":   idx.to_pydatetime(),
                    "open":   round(float(row["Open"]), 2),
                    "high":   round(float(row["High"]), 2),
                    "low":    round(float(row["Low"]), 2),
                    "close":  round(float(row["Close"]), 2),
                    "volume": int(row["Volume"]),
                })
            historical_cache[cache_key] = result
            logger.debug("[stock] yfinance history fetched %d bars for %s", len(result), clean)
            return result
    except Exception as exc:
        logger.debug("[stock] yfinance history failed for %s: %s", clean, exc)

    # ── Mock GBM fallback ──────────────────────────────────────────────
    result = generate_mock_historical_data(clean, days)
    historical_cache[cache_key] = result
    return result


# ═══════════════════════════════════════════════════════════════════════
# STOCK SEARCH
# ═══════════════════════════════════════════════════════════════════════

def search_stocks(query: str) -> List[Dict]:
    """
    Search for stocks by name or ticker symbol.
    Searches the unified INDIAN_STOCKS dict from groww_service.

    Returns: [{"ticker": str, "name": str, "sector": str, "price": float}, ...]
    Limited to 10 results.
    """
    q = query.strip().upper()
    results: List[Dict] = []

    for ticker, info in INDIAN_STOCKS.items():
        name_upper = info["name"].upper()
        if q in ticker or q in name_upper:
            results.append({
                "ticker": ticker,
                "name":   info["name"],
                "sector": info.get("sector", "N/A"),
                "price":  info["price"],
            })

    return results[:10]


# ═══════════════════════════════════════════════════════════════════════
# MOCK HISTORICAL DATA (Geometric Brownian Motion)
# ═══════════════════════════════════════════════════════════════════════

def generate_mock_historical_data(ticker: str, days: int) -> List[Dict]:
    """
    Generate realistic mock historical OHLCV data using GBM simulation.
    Used as a final fallback when all live sources fail.

    Parameters:
      volatility = 0.018 (1.8% daily — typical NSE mid-cap)
      drift      = 0.0003 (annualized ~8% CAGR)
    """
    import random
    import math

    base_price = float(INDIAN_STOCKS.get(ticker.upper(), {}).get("price", 1000))
    result: List[Dict] = []

    volatility = 0.018
    drift = 0.0003

    # Start 15% below base to show upward trajectory
    current = base_price * 0.85

    for i in range(days, 0, -1):
        date = datetime.now() - timedelta(days=i)

        # Skip weekends (Indian market closed Sat/Sun)
        if date.weekday() >= 5:
            continue

        # GBM step: S(t+1) = S(t) * exp((μ - σ²/2)Δt + σ√Δt * Z)
        z = random.gauss(0.0, 1.0)
        daily_return = math.exp((drift - 0.5 * volatility**2) + volatility * z)
        current *= daily_return

        # Derive OHLC from close
        intra_vol = abs(random.gauss(0, 0.005))
        high = current * (1 + intra_vol + abs(random.gauss(0, 0.003)))
        low  = current * (1 - intra_vol - abs(random.gauss(0, 0.003)))
        open_price = low + random.random() * (high - low)

        result.append({
            "date":   date,
            "open":   round(open_price, 2),
            "high":   round(high, 2),
            "low":    round(low, 2),
            "close":  round(current, 2),
            "volume": random.randint(500_000, 10_000_000),
        })

    return result
