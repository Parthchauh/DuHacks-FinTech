import os
import pyotp
import logging
from SmartApi import SmartConnect
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

API_KEY     = os.getenv("ANGELONE_API_KEY")
CLIENT_ID   = os.getenv("ANGELONE_CLIENT_ID")
MPIN        = os.getenv("ANGELONE_MPIN")
TOTP_SECRET = os.getenv("ANGELONE_TOTP_SECRET")

_key = os.getenv("TOKEN_ENCRYPTION_KEY")
fernet = Fernet(_key.encode()) if _key else None


def get_session() -> dict:
    """
    Returns authenticated SmartConnect obj + tokens.
    Always use the returned 'obj' for all subsequent API calls.
    """
    obj  = SmartConnect(api_key=API_KEY)
    totp = pyotp.TOTP(TOTP_SECRET).now()
    data = obj.generateSession(CLIENT_ID, MPIN, totp)

    if not data.get("status"):
        raise Exception("Login failed: " + str(data.get("message", "unknown")))

    return {
        "obj":           obj,                        # use this for all calls
        "auth_token":    data["data"]["jwtToken"],
        "refresh_token": data["data"]["refreshToken"],
        "feed_token":    data["data"]["feedToken"],
    }


def encrypt_token(token: str) -> str:
    return fernet.encrypt(token.encode()).decode()


def decrypt_token(token_enc: str) -> str:
    return fernet.decrypt(token_enc.encode()).decode()


def get_holdings(obj: SmartConnect) -> list:
    """Pass the SmartConnect obj from get_session() directly."""
    result = obj.holding()
    if not result.get("status"):
        raise Exception("Holdings failed: " + str(result.get("message")))
    return result.get("data") or []


def get_positions(obj: SmartConnect) -> list:
    result = obj.position()
    return result.get("data") or []


def get_portfolio_summary(obj: SmartConnect) -> dict:
    holdings       = get_holdings(obj)
    total_invested = sum(float(h.get("averageprice", 0)) * float(h.get("quantity", 0)) for h in holdings)
    total_current  = sum(float(h.get("ltp", 0))          * float(h.get("quantity", 0)) for h in holdings)
    pnl            = total_current - total_invested
    return {
        "total_invested":      round(total_invested, 2),
        "total_current_value": round(total_current,  2),
        "total_pnl":           round(pnl,             2),
        "pnl_pct":             round((pnl / total_invested * 100) if total_invested > 0 else 0, 2),
        "holdings_count":      len(holdings),
    }


def place_order(obj: SmartConnect, trade: dict) -> dict:
    params = {
        "variety":         "NORMAL",
        "tradingsymbol":   trade["symbol"],
        "symboltoken":     trade.get("symbol_token", ""),
        "transactiontype": trade["action"],
        "exchange":        trade.get("exchange", "NSE"),
        "ordertype":       "MARKET",
        "producttype":     "DELIVERY",
        "duration":        "DAY",
        "quantity":        str(int(trade["quantity"])),
    }
    result = obj.placeOrder(params)
    if not result.get("status"):
        raise Exception("Order failed: " + str(result.get("message")))
    return {"order_id": result["data"]["orderid"], "symbol": trade["symbol"]}