"""
OptiWealth — Smallcase Gateway SDK Integration Service
========================================================
Provides broker-agnostic trade execution via the Smallcase Gateway.

Smallcase Gateway flow:
  1. Frontend initializes scGateway SDK with gateway_name + gateway_secret.
  2. Backend creates a transaction (connect / order) via REST API.
  3. Frontend opens the gateway URL → user authenticates with broker.
  4. Post-auth callback returns smallcase_auth_token.
  5. Backend fetches holdings or places orders using the auth token.

Environment variables required:
  SMALLCASE_GATEWAY_NAME   — Gateway name from Smallcase dashboard
  SMALLCASE_GATEWAY_SECRET — API secret for JWT signing
  SMALLCASE_API_BASE       — https://gatewayapi.smallcase.com (default)
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict, List, Optional

import httpx
import jwt

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════

SMALLCASE_GATEWAY_NAME = os.getenv("SMALLCASE_GATEWAY_NAME", "")
SMALLCASE_GATEWAY_SECRET = os.getenv("SMALLCASE_GATEWAY_SECRET", "")
SMALLCASE_API_BASE = os.getenv(
    "SMALLCASE_API_BASE", "https://gatewayapi.smallcase.com"
)

_SUPPORTED_BROKERS = [
    "kite",          # Zerodha
    "angel",         # AngelOne
    "5paisa",        # 5paisa
    "upstox",        # Upstox
    "groww",         # Groww
    "iifl",          # IIFL Securities
    "motilal",       # Motilal Oswal
    "aliceblue",     # Alice Blue
]


def _sign_jwt(payload: Dict[str, Any]) -> str:
    """Sign a JWT payload with the gateway secret."""
    if not SMALLCASE_GATEWAY_SECRET:
        raise ValueError("SMALLCASE_GATEWAY_SECRET is not configured.")

    payload.setdefault("iat", int(time.time()))
    payload.setdefault("exp", int(time.time()) + 3600)  # 1 hour
    payload.setdefault("guest", True)

    return jwt.encode(payload, SMALLCASE_GATEWAY_SECRET, algorithm="HS256")


def _get_auth_headers() -> Dict[str, str]:
    """Build common auth headers for Smallcase API calls."""
    if not SMALLCASE_GATEWAY_NAME:
        raise ValueError("SMALLCASE_GATEWAY_NAME is not configured.")

    return {
        "x-gateway-name": SMALLCASE_GATEWAY_NAME,
        "x-gateway-secret": SMALLCASE_GATEWAY_SECRET,
        "Content-Type": "application/json",
    }


# ═══════════════════════════════════════════════════════════════════════
# CONNECTION / AUTH
# ═══════════════════════════════════════════════════════════════════════

async def create_guest_session() -> Dict[str, str]:
    """Create a guest session and return the signed JWT for SDK init.

    Returns:
        {"auth_token": "<JWT>", "gateway_name": "<name>"}
    """
    guest_jwt = _sign_jwt({"guest": True})
    return {
        "auth_token": guest_jwt,
        "gateway_name": SMALLCASE_GATEWAY_NAME,
    }


async def create_connect_transaction(
    smallcase_auth_token: str,
    broker: str = "kite",
) -> Dict[str, Any]:
    """Initiate a broker connection transaction.

    The frontend uses the returned transactionId to open the Gateway widget.
    After user authenticates with broker, the callback returns the auth token.

    Args:
        smallcase_auth_token: JWT from guest session or prior auth.
        broker: Broker slug (default: kite/Zerodha).

    Returns:
        {"transactionId": "...", "broker": "...", "redirectUrl": "..."}
    """
    if broker not in _SUPPORTED_BROKERS:
        logger.warning("Unsupported broker '%s'. Defaulting to kite.", broker)
        broker = "kite"

    url = f"{SMALLCASE_API_BASE}/v2/transaction/new"
    headers = _get_auth_headers()
    headers["x-gateway-authtoken"] = smallcase_auth_token

    payload = {
        "intent": "CONNECT",
        "broker": [broker],
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

            transaction_data = data.get("data", {})
            logger.info("Connect transaction created: %s", transaction_data.get("transactionId", ""))
            return transaction_data

        except httpx.HTTPStatusError as exc:
            logger.error(
                "Smallcase connect failed: %d — %s",
                exc.response.status_code, exc.response.text,
            )
            raise
        except Exception as exc:
            logger.error("Smallcase connect error: %s", exc)
            raise


# ═══════════════════════════════════════════════════════════════════════
# HOLDINGS IMPORT
# ═══════════════════════════════════════════════════════════════════════

async def fetch_holdings(
    smallcase_auth_token: str,
) -> List[Dict[str, Any]]:
    """Fetch user's broker holdings via Smallcase API.

    Returns a list of position dicts compatible with Position model:
        [{"symbol": "RELIANCE", "quantity": 100, "avg_price": 2000.0, ...}]
    """
    url = f"{SMALLCASE_API_BASE}/v2/user/holdings"
    headers = _get_auth_headers()
    headers["x-gateway-authtoken"] = smallcase_auth_token

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

            raw_holdings = data.get("data", {}).get("holdings", [])
            positions = []

            for h in raw_holdings:
                positions.append({
                    "symbol": h.get("tradingsymbol", h.get("symbol", "")),
                    "isin": h.get("isin", ""),
                    "quantity": float(h.get("quantity", 0)),
                    "avg_price": float(h.get("averagePrice", h.get("avg_price", 0))),
                    "current_price": float(h.get("lastPrice", h.get("ltp", 0))),
                    "exchange": h.get("exchange", "NSE"),
                    "sector": h.get("sector", "equity"),
                })

            logger.info("Fetched %d holdings from Smallcase.", len(positions))
            return positions

        except httpx.HTTPStatusError as exc:
            logger.error(
                "Smallcase holdings fetch failed: %d — %s",
                exc.response.status_code, exc.response.text,
            )
            raise
        except Exception as exc:
            logger.error("Smallcase holdings error: %s", exc)
            raise


# ═══════════════════════════════════════════════════════════════════════
# ORDER EXECUTION
# ═══════════════════════════════════════════════════════════════════════

async def create_order_transaction(
    smallcase_auth_token: str,
    trades: List[Dict[str, Any]],
    order_type: str = "MARKET",
) -> Dict[str, Any]:
    """Create a basket order transaction for rebalancing execution.

    Args:
        smallcase_auth_token: Auth token from prior broker connect.
        trades: List of trade dicts: [{"symbol", "action", "quantity", "exchange"}].
        order_type: "MARKET" (default) or "LIMIT".

    Returns:
        {"transactionId": "...", "orderBatches": [...]}
    """
    url = f"{SMALLCASE_API_BASE}/v2/transaction/new"
    headers = _get_auth_headers()
    headers["x-gateway-authtoken"] = smallcase_auth_token

    # Build Smallcase order format
    order_batches = []
    for trade in trades:
        order_batches.append({
            "tradingsymbol": trade["symbol"],
            "exchange": trade.get("exchange", "NSE"),
            "transactionType": trade["action"],  # BUY or SELL
            "quantity": int(trade["quantity"]),
            "orderType": order_type,
            "product": "CNC",  # Cash and Carry (delivery)
        })

    payload = {
        "intent": "TRANSACTION",
        "orderConfig": {
            "type": "SECURITIES",
            "orders": order_batches,
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

            transaction_data = data.get("data", {})
            logger.info(
                "Order transaction created: %s (%d orders)",
                transaction_data.get("transactionId", ""),
                len(order_batches),
            )
            return transaction_data

        except httpx.HTTPStatusError as exc:
            logger.error(
                "Smallcase order failed: %d — %s",
                exc.response.status_code, exc.response.text,
            )
            raise
        except Exception as exc:
            logger.error("Smallcase order error: %s", exc)
            raise


async def check_order_status(
    smallcase_auth_token: str,
    transaction_id: str,
) -> Dict[str, Any]:
    """Poll a transaction to check its completion status.

    Returns:
        {"status": "COMPLETED" | "PENDING" | "FAILED", "orders": [...]}
    """
    url = f"{SMALLCASE_API_BASE}/v2/transaction/{transaction_id}"
    headers = _get_auth_headers()
    headers["x-gateway-authtoken"] = smallcase_auth_token

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data.get("data", {})
        except Exception as exc:
            logger.error("Order status check failed: %s", exc)
            return {"status": "UNKNOWN", "error": str(exc)}
