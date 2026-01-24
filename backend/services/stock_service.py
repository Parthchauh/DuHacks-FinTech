import httpx
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from cachetools import TTLCache
from config import get_settings

settings = get_settings()

# Cache stock prices for 5 minutes to reduce API calls
price_cache = TTLCache(maxsize=500, ttl=300)
historical_cache = TTLCache(maxsize=100, ttl=3600)

# Common Indian stocks mapping (for offline/demo mode)
INDIAN_STOCKS = {
    "NIFTYBEES": {"name": "Nippon India Nifty 50 BeES", "price": 245.50, "type": "ETF"},
    "JUNIORBEES": {"name": "Nippon India Junior BeES", "price": 540.20, "type": "ETF"},
    "GOLDBEES": {"name": "Nippon India Gold BeES", "price": 58.15, "type": "ETF"},
    "RELIANCE": {"name": "Reliance Industries Ltd", "price": 2950.00, "type": "EQUITY"},
    "TCS": {"name": "Tata Consultancy Services", "price": 3850.00, "type": "EQUITY"},
    "INFY": {"name": "Infosys Ltd", "price": 1580.00, "type": "EQUITY"},
    "HDFCBANK": {"name": "HDFC Bank Ltd", "price": 1650.00, "type": "EQUITY"},
    "ICICIBANK": {"name": "ICICI Bank Ltd", "price": 1120.00, "type": "EQUITY"},
    "SBIN": {"name": "State Bank of India", "price": 620.00, "type": "EQUITY"},
    "BHARTIARTL": {"name": "Bharti Airtel Ltd", "price": 1480.00, "type": "EQUITY"},
    "ITC": {"name": "ITC Ltd", "price": 465.00, "type": "EQUITY"},
    "KOTAKBANK": {"name": "Kotak Mahindra Bank", "price": 1750.00, "type": "EQUITY"},
    "LT": {"name": "Larsen & Toubro Ltd", "price": 3450.00, "type": "EQUITY"},
    "HINDUNILVR": {"name": "Hindustan Unilever Ltd", "price": 2650.00, "type": "EQUITY"},
    "WIPRO": {"name": "Wipro Ltd", "price": 480.00, "type": "EQUITY"},
    "AXISBANK": {"name": "Axis Bank Ltd", "price": 1050.00, "type": "EQUITY"},
    "MARUTI": {"name": "Maruti Suzuki India Ltd", "price": 11200.00, "type": "EQUITY"},
    "SUNPHARMA": {"name": "Sun Pharmaceutical", "price": 1720.00, "type": "EQUITY"},
    "TITAN": {"name": "Titan Company Ltd", "price": 3200.00, "type": "EQUITY"},
    "BAJFINANCE": {"name": "Bajaj Finance Ltd", "price": 6800.00, "type": "EQUITY"},
    "INR": {"name": "Indian Rupee (Cash)", "price": 1.00, "type": "CASH"},
    "LIQUIDBEES": {"name": "Nippon India Liquid BeES", "price": 1000.00, "type": "LIQUID"},
    "BANKBEES": {"name": "Nippon India Bank BeES", "price": 485.00, "type": "ETF"},
    "ITBEES": {"name": "Nippon India IT BeES", "price": 38.50, "type": "ETF"},
}


async def get_stock_quote(ticker: str) -> Optional[Dict]:
    """Get current stock quote for a ticker"""
    # Check cache first
    if ticker in price_cache:
        return price_cache[ticker]
    
    # Try Alpha Vantage API
    if settings.ALPHA_VANTAGE_API_KEY and settings.ALPHA_VANTAGE_API_KEY != "demo":
        try:
            async with httpx.AsyncClient() as client:
                # For Indian stocks, append .BSE or .NSE
                symbol = f"{ticker}.BSE" if not ticker.endswith((".BSE", ".NSE")) else ticker
                
                response = await client.get(
                    "https://www.alphavantage.co/query",
                    params={
                        "function": "GLOBAL_QUOTE",
                        "symbol": symbol,
                        "apikey": settings.ALPHA_VANTAGE_API_KEY
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "Global Quote" in data and data["Global Quote"]:
                        quote_data = data["Global Quote"]
                        result = {
                            "ticker": ticker,
                            "price": float(quote_data.get("05. price", 0)),
                            "change": float(quote_data.get("09. change", 0)),
                            "change_percent": float(quote_data.get("10. change percent", "0").replace("%", "")),
                            "volume": int(quote_data.get("06. volume", 0)),
                            "fetched_at": datetime.utcnow()
                        }
                        price_cache[ticker] = result
                        return result
        except Exception as e:
            print(f"Alpha Vantage API error for {ticker}: {e}")
    
    # Fallback to mock data for Indian stocks
    if ticker.upper() in INDIAN_STOCKS:
        stock_info = INDIAN_STOCKS[ticker.upper()]
        # Add some randomness to simulate price movement
        import random
        base_price = stock_info["price"]
        price = base_price * (1 + random.uniform(-0.02, 0.02))
        change = price - base_price
        
        result = {
            "ticker": ticker,
            "price": round(price, 2),
            "change": round(change, 2),
            "change_percent": round((change / base_price) * 100, 2),
            "volume": random.randint(100000, 5000000),
            "fetched_at": datetime.utcnow()
        }
        price_cache[ticker] = result
        return result
    
    return None


async def get_stock_prices(tickers: List[str]) -> Dict[str, float]:
    """Get current prices for multiple tickers"""
    prices = {}
    for ticker in tickers:
        quote = await get_stock_quote(ticker)
        if quote:
            prices[ticker] = quote["price"]
        elif ticker.upper() in INDIAN_STOCKS:
            prices[ticker] = INDIAN_STOCKS[ticker.upper()]["price"]
    return prices


async def get_historical_prices(ticker: str, days: int = 365) -> List[Dict]:
    """Get historical prices for a ticker"""
    cache_key = f"{ticker}_{days}"
    if cache_key in historical_cache:
        return historical_cache[cache_key]
    
    # Try Alpha Vantage
    if settings.ALPHA_VANTAGE_API_KEY and settings.ALPHA_VANTAGE_API_KEY != "demo":
        try:
            async with httpx.AsyncClient() as client:
                symbol = f"{ticker}.BSE" if not ticker.endswith((".BSE", ".NSE")) else ticker
                
                response = await client.get(
                    "https://www.alphavantage.co/query",
                    params={
                        "function": "TIME_SERIES_DAILY",
                        "symbol": symbol,
                        "outputsize": "full" if days > 100 else "compact",
                        "apikey": settings.ALPHA_VANTAGE_API_KEY
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "Time Series (Daily)" in data:
                        time_series = data["Time Series (Daily)"]
                        result = []
                        for date_str, values in list(time_series.items())[:days]:
                            result.append({
                                "date": datetime.strptime(date_str, "%Y-%m-%d"),
                                "open": float(values["1. open"]),
                                "high": float(values["2. high"]),
                                "low": float(values["3. low"]),
                                "close": float(values["4. close"]),
                                "volume": int(values["5. volume"])
                            })
                        historical_cache[cache_key] = result
                        return result
        except Exception as e:
            print(f"Historical prices API error for {ticker}: {e}")
    
    # Generate mock historical data
    result = generate_mock_historical_data(ticker, days)
    historical_cache[cache_key] = result
    return result


def generate_mock_historical_data(ticker: str, days: int) -> List[Dict]:
    """Generate realistic mock historical data for Indian stocks"""
    import random
    import math
    
    base_price = INDIAN_STOCKS.get(ticker.upper(), {}).get("price", 1000)
    result = []
    
    # Parameters for price simulation
    volatility = 0.02  # 2% daily volatility
    drift = 0.0003  # Small positive drift (annual ~10%)
    
    current_price = base_price * 0.85  # Start 15% lower (to show growth)
    
    for i in range(days, 0, -1):
        date = datetime.now() - timedelta(days=i)
        
        # Skip weekends
        if date.weekday() >= 5:
            continue
        
        # Random walk with drift
        daily_return = drift + volatility * random.gauss(0, 1)
        current_price *= (1 + daily_return)
        
        # Generate OHLC from close price
        high = current_price * (1 + abs(random.gauss(0, 0.01)))
        low = current_price * (1 - abs(random.gauss(0, 0.01)))
        open_price = low + random.random() * (high - low)
        
        result.append({
            "date": date,
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(current_price, 2),
            "volume": random.randint(500000, 10000000)
        })
    
    return result


def search_stocks(query: str) -> List[Dict]:
    """Search for stocks by name or ticker"""
    query = query.upper()
    results = []
    
    for ticker, info in INDIAN_STOCKS.items():
        if query in ticker or query in info["name"].upper():
            results.append({
                "ticker": ticker,
                "name": info["name"],
                "type": info["type"],
                "price": info["price"]
            })
    
    return results[:10]  # Limit to 10 results
