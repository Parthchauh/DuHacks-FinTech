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

# Store session globally so auth_token is reused correctly
_session_obj = None


def get_session():
    """Login and return a connected SmartConnect object + tokens."""
    global _session_obj
    obj  = SmartConnect(api_key=API_KEY)
    totp = pyotp.TOTP(TOTP_SECRET).now()
    data = obj.generateSession(CLIENT_ID, MPIN, totp)

    if not data.get("status"):
        raise Exception("Login failed: " + str(data.get("message", "unknown")))

    # Store the authenticated object — holds the session internally
    _session_obj = obj

    return {
        "auth_token":    data["data"]["jwtToken"],
        "refresh_token": data["data"]["refreshToken"],
        "feed_token":    data["data"]["feedToken"],
        "obj":           obj,   # pass the authenticated obj directly
    }


def encrypt_token(token):
    return fernet.encrypt(token.encode()).decode()


def decrypt_token(token_enc):
    return fernet.decrypt(token_enc.encode()).decode()


def get_holdings(auth_token_or_obj):
    """
    Accepts either the authenticated SmartConnect obj or auth_token string.
    Using the obj is more reliable — avoids token header issues.
    """
    if isinstance(auth_token_or_obj, SmartConnect):
        obj = auth_token_or_obj
    else:
        # Rebuild session using stored obj if available
        global _session_obj
        if _session_obj is not None:
            obj = _session_obj
        else:
            # Last resort — create new obj and set token
            obj = SmartConnect(api_key=API_KEY)
            obj.setAccessToken(auth_token_or_obj)

    result = obj.holding()

    if not result.get("status"):
        raise Exception("Holdings failed: " + str(result.get("message")))

    return result.get("data") or []


def get_positions(auth_token_or_obj):
    global _session_obj
    if isinstance(auth_token_or_obj, SmartConnect):
        obj = auth_token_or_obj
    elif _session_obj is not None:
        obj = _session_obj
    else:
        obj = SmartConnect(api_key=API_KEY)
        obj.setAccessToken(auth_token_or_obj)

    result = obj.position()
    return result.get("data") or []


def get_portfolio_summary(auth_token_or_obj):
    holdings       = get_holdings(auth_token_or_obj)
    total_invested = sum(
        float(h.get("averageprice", 0)) * float(h.get("quantity", 0))
        for h in holdings
    )
    total_current  = sum(
        float(h.get("ltp", 0)) * float(h.get("quantity", 0))
        for h in holdings
    )
    pnl = total_current - total_invested
    return {
        "total_invested":      round(total_invested, 2),
        "total_current_value": round(total_current,  2),
        "total_pnl":           round(pnl,             2),
        "pnl_pct":             round((pnl / total_invested * 100) if total_invested > 0 else 0, 2),
        "holdings_count":      len(holdings),
    }


def place_order(auth_token_or_obj, trade):
    global _session_obj
    if isinstance(auth_token_or_obj, SmartConnect):
        obj = auth_token_or_obj
    elif _session_obj is not None:
        obj = _session_obj
    else:
        obj = SmartConnect(api_key=API_KEY)
        obj.setAccessToken(auth_token_or_obj)

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