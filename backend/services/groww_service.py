"""
OptiWealth — Groww API Service (Live Market Data)
====================================================
Wraps the Groww SDK for real-time NSE/BSE price, OHLC, and quote data.
Falls back to yfinance when Groww API is unavailable.

Usage:
    from services.groww_service import groww_data
    price  = await groww_data.get_live_price("RELIANCE")
    prices = await groww_data.get_live_prices(["RELIANCE", "TCS", "INFY"])
    ohlc   = await groww_data.get_ohlc(["RELIANCE", "TCS"])
    quote  = await groww_data.get_full_quote("RELIANCE")

Environment:
    GROWW_API_AUTH_TOKEN — set in .env
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════
# GROWW SDK WRAPPER
# ═══════════════════════════════════════════════════════════════════════


class GrowwDataService:
    """Thin abstraction over the Groww Python SDK.

    Initializes lazily on first call. Falls back to yfinance if Groww
    is not configured or raises errors.
    """

    def __init__(self) -> None:
        self._sdk: Any = None
        self._initialized = False
        self._available = False

    def _ensure_init(self) -> bool:
        """Lazy-initialize the Groww SDK.

        Auth token resolution order:
          1. GROWW_API_AUTH_TOKEN env var / config (if pre-generated)
          2. Generate from GROWW_API_KEY + GROWW_API_SECRET via HMAC-SHA256
        """
        if self._initialized:
            return self._available
        self._initialized = True

        token = os.getenv("GROWW_API_AUTH_TOKEN", "")
        api_key = os.getenv("GROWW_API_KEY", "")
        api_secret = os.getenv("GROWW_API_SECRET", "")

        if not token or not api_key or not api_secret:
            try:
                from config import get_settings
                settings = get_settings()
                if not token:
                    token = settings.GROWW_API_AUTH_TOKEN
                if not api_key:
                    api_key = settings.GROWW_API_KEY
                if not api_secret:
                    api_secret = settings.GROWW_API_SECRET
            except Exception:
                pass

        # If no direct token but key+secret available, generate token
        if not token and api_key and api_secret:
            token = self._generate_auth_token(api_key, api_secret)
            if token:
                logger.info("Generated Groww auth token from API key + secret.")

        if not token:
            logger.info("Groww API credentials not configured — will use yfinance fallback.")
            return False

        # Store credentials for potential re-auth
        self._api_key = api_key
        self._api_secret = api_secret

        try:
            from growwapi import GrowwAPI
            self._sdk = GrowwAPI(token)
            self._available = True
            logger.info("Groww API initialized successfully.")
            return True
        except ImportError:
            logger.warning("growwapi package not installed. pip install growwapi")
            return False
        except Exception as exc:
            logger.warning("Groww API init failed: %s", exc)
            return False

    @staticmethod
    def _generate_auth_token(api_key: str, api_secret: str) -> str:
        """Generate auth token from API key + secret.

        Uses HMAC-SHA256 signature with timestamp, compatible with
        Groww's server-side token validation.
        """
        import hashlib
        import hmac
        import time

        try:
            timestamp = str(int(time.time() * 1000))
            payload = f"{api_key}|{timestamp}"
            signature = hmac.new(
                api_secret.encode("utf-8"),
                payload.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            # Groww expects base64-encoded "key:timestamp:signature"
            import base64
            token_raw = f"{api_key}:{timestamp}:{signature}"
            return base64.b64encode(token_raw.encode("utf-8")).decode("utf-8")
        except Exception as exc:
            logger.warning("Token generation failed: %s", exc)
            return ""

    # ── Helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _clean_symbol(symbol: str) -> str:
        """Strip .NS / .BO suffixes and whitespace."""
        s = symbol.strip()
        for suffix in (".NS", ".BO"):
            if s.endswith(suffix):
                s = s[: -len(suffix)]
        return s

    @staticmethod
    def _to_exchange_symbol(symbol: str, exchange: str = "NSE") -> str:
        """Convert to Groww's 'NSE_RELIANCE' format."""
        clean = GrowwDataService._clean_symbol(symbol)
        return f"{exchange}_{clean}"

    # ── Single Quote ──────────────────────────────────────────────────

    async def get_full_quote(
        self,
        symbol: str,
        exchange: str = "NSE",
    ) -> Dict[str, Any]:
        """Fetch a full real-time quote for a single instrument.

        Returns Groww quote dict with keys: last_price, ohlc, volume,
        market_cap, bid/ask depth, etc.  Falls back to yfinance.
        """
        if self._ensure_init():
            try:
                clean = self._clean_symbol(symbol)
                resp = self._sdk.get_quote(
                    exchange=self._sdk.EXCHANGE_NSE if exchange == "NSE" else self._sdk.EXCHANGE_BSE,
                    segment=self._sdk.SEGMENT_CASH,
                    trading_symbol=clean,
                )
                return resp if isinstance(resp, dict) else {}
            except Exception as exc:
                logger.debug("Groww quote failed for %s: %s — fallback", symbol, exc)

        return await self._yf_quote_fallback(symbol)

    # ── Batch LTP ─────────────────────────────────────────────────────

    async def get_live_price(self, symbol: str, exchange: str = "NSE") -> float:
        """Get latest traded price for a single symbol."""
        prices = await self.get_live_prices([symbol], exchange)
        return prices.get(self._clean_symbol(symbol), 0.0)

    async def get_live_prices(
        self,
        symbols: List[str],
        exchange: str = "NSE",
    ) -> Dict[str, float]:
        """Get LTP for multiple symbols (up to 50 per batch).

        Returns: {"RELIANCE": 2500.5, "TCS": 3800.0, ...}
        """
        clean_syms = [self._clean_symbol(s) for s in symbols]
        result: Dict[str, float] = {}

        if self._ensure_init():
            try:
                # Process in batches of 50
                for i in range(0, len(clean_syms), 50):
                    batch = clean_syms[i : i + 50]
                    exchange_symbols = tuple(
                        self._to_exchange_symbol(s, exchange) for s in batch
                    )

                    if len(exchange_symbols) == 1:
                        ltp_resp = self._sdk.get_ltp(
                            segment=self._sdk.SEGMENT_CASH,
                            exchange_trading_symbols=exchange_symbols[0],
                        )
                    else:
                        ltp_resp = self._sdk.get_ltp(
                            segment=self._sdk.SEGMENT_CASH,
                            exchange_trading_symbols=exchange_symbols,
                        )

                    if isinstance(ltp_resp, dict):
                        for key, price in ltp_resp.items():
                            # key format: "NSE_RELIANCE" → "RELIANCE"
                            clean_key = key.split("_", 1)[-1] if "_" in key else key
                            result[clean_key] = float(price)

                # Verify we got all
                missing = [s for s in clean_syms if s not in result]
                if missing:
                    fallback = await self._yf_ltp_fallback(missing)
                    result.update(fallback)

                return result

            except Exception as exc:
                logger.debug("Groww batch LTP failed: %s — fallback to yfinance", exc)

        # Full fallback
        return await self._yf_ltp_fallback(clean_syms)

    # ── Batch OHLC ────────────────────────────────────────────────────

    async def get_ohlc(
        self,
        symbols: List[str],
        exchange: str = "NSE",
    ) -> Dict[str, Dict[str, float]]:
        """Get OHLC data for multiple symbols.

        Returns: {"RELIANCE": {"open": 1212.8, "high": 1215, ...}, ...}
        """
        clean_syms = [self._clean_symbol(s) for s in symbols]
        result: Dict[str, Dict[str, float]] = {}

        if self._ensure_init():
            try:
                for i in range(0, len(clean_syms), 50):
                    batch = clean_syms[i : i + 50]
                    exchange_symbols = tuple(
                        self._to_exchange_symbol(s, exchange) for s in batch
                    )

                    if len(exchange_symbols) == 1:
                        ohlc_resp = self._sdk.get_ohlc(
                            segment=self._sdk.SEGMENT_CASH,
                            exchange_trading_symbols=exchange_symbols[0],
                        )
                    else:
                        ohlc_resp = self._sdk.get_ohlc(
                            segment=self._sdk.SEGMENT_CASH,
                            exchange_trading_symbols=exchange_symbols,
                        )

                    if isinstance(ohlc_resp, dict):
                        for key, ohlc_data in ohlc_resp.items():
                            clean_key = key.split("_", 1)[-1] if "_" in key else key
                            if isinstance(ohlc_data, dict):
                                result[clean_key] = ohlc_data

                return result
            except Exception as exc:
                logger.debug("Groww OHLC batch failed: %s — fallback", exc)

        return await self._yf_ohlc_fallback(clean_syms)

    # ── Market Cap + Extended Data ────────────────────────────────────

    async def get_market_cap(self, symbol: str) -> float:
        """Fetch market cap from Groww quote."""
        quote = await self.get_full_quote(symbol)
        return float(quote.get("market_cap", 0))

    async def get_volume(self, symbol: str) -> int:
        """Fetch traded volume from Groww quote."""
        quote = await self.get_full_quote(symbol)
        return int(quote.get("volume", 0))

    async def get_52w_range(self, symbol: str) -> Tuple[float, float]:
        """Fetch 52-week high and low."""
        quote = await self.get_full_quote(symbol)
        return (
            float(quote.get("week_52_low", 0)),
            float(quote.get("week_52_high", 0)),
        )

    # ── yfinance Fallbacks ────────────────────────────────────────────

    @staticmethod
    async def _yf_quote_fallback(symbol: str) -> Dict[str, Any]:
        """Fallback to yfinance for a single quote."""
        try:
            import yfinance as yf

            clean = GrowwDataService._clean_symbol(symbol)
            ticker = yf.Ticker(f"{clean}.NS")
            info = ticker.info or {}
            return {
                "last_price": float(info.get("currentPrice", info.get("regularMarketPrice", 0)) or 0),
                "ohlc": {
                    "open": float(info.get("open", info.get("regularMarketOpen", 0)) or 0),
                    "high": float(info.get("dayHigh", info.get("regularMarketDayHigh", 0)) or 0),
                    "low": float(info.get("dayLow", info.get("regularMarketDayLow", 0)) or 0),
                    "close": float(info.get("previousClose", info.get("regularMarketPreviousClose", 0)) or 0),
                },
                "volume": int(info.get("volume", info.get("regularMarketVolume", 0)) or 0),
                "market_cap": float(info.get("marketCap", 0) or 0),
                "week_52_high": float(info.get("fiftyTwoWeekHigh", 0) or 0),
                "week_52_low": float(info.get("fiftyTwoWeekLow", 0) or 0),
                "day_change_perc": float(info.get("regularMarketChangePercent", 0) or 0),
            }
        except Exception as exc:
            logger.warning("yfinance fallback quote failed for %s: %s", symbol, exc)
            return {}

    @staticmethod
    async def _yf_ltp_fallback(symbols: List[str]) -> Dict[str, float]:
        """Fallback to yfinance for batch LTP."""
        result: Dict[str, float] = {}
        try:
            import yfinance as yf

            yf_syms = [f"{s}.NS" for s in symbols]
            data = yf.download(yf_syms, period="1d", progress=False, group_by="ticker")

            for sym, yf_sym in zip(symbols, yf_syms):
                try:
                    import pandas as pd
                    if isinstance(data.columns, pd.MultiIndex):
                        if yf_sym in data.columns.get_level_values(0):
                            close_col = data[yf_sym]["Close"]
                            if isinstance(close_col, pd.DataFrame):
                                close_col = close_col.squeeze()
                            val = float(close_col.dropna().iloc[-1])
                            if val > 0:
                                result[sym] = val
                    else:
                        close_col = data["Close"]
                        if isinstance(close_col, pd.DataFrame):
                            close_col = close_col.squeeze()
                        val = float(close_col.dropna().iloc[-1])
                        if val > 0:
                            result[sym] = val
                except Exception:
                    pass
        except Exception as exc:
            logger.warning("yfinance batch LTP fallback failed: %s", exc)
        return result

    @staticmethod
    async def _yf_ohlc_fallback(symbols: List[str]) -> Dict[str, Dict[str, float]]:
        """Fallback to yfinance for batch OHLC."""
        result: Dict[str, Dict[str, float]] = {}
        try:
            import yfinance as yf

            for sym in symbols:
                try:
                    ticker = yf.Ticker(f"{sym}.NS")
                    info = ticker.info or {}
                    result[sym] = {
                        "open": float(info.get("open", info.get("regularMarketOpen", 0)) or 0),
                        "high": float(info.get("dayHigh", info.get("regularMarketDayHigh", 0)) or 0),
                        "low": float(info.get("dayLow", info.get("regularMarketDayLow", 0)) or 0),
                        "close": float(info.get("previousClose", 0) or 0),
                    }
                except Exception:
                    pass
        except Exception as exc:
            logger.warning("yfinance OHLC fallback failed: %s", exc)
        return result


# ═══════════════════════════════════════════════════════════════════════
# MODULE-LEVEL SINGLETON
# ═══════════════════════════════════════════════════════════════════════

groww_data = GrowwDataService()
