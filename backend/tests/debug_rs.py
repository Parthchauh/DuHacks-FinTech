import pandas as pd
import numpy as np

def create_mock_df(trend="flat"):
    dates = pd.date_range(end=pd.Timestamp.today(), periods=200)
    if trend == "down":
        close = np.linspace(200, 100, 200)
        high = close + 5
        low = close - 5
    elif trend == "up":
        close = np.linspace(100, 200, 200)
        high = close + 5
        low = close - 5
    else:
        close = np.full(200, 150.0)
        high = np.full(200, 155.0)
        low = np.full(200, 145.0)
    df = pd.DataFrame({"Close": close, "High": high, "Low": low}, index=dates)
    return df

mock_market = {
    "RELIANCE.NS": create_mock_df("down"),
    "TCS.NS": create_mock_df("down"),
    "ITC.NS": create_mock_df("down"),
    "^NSEI": create_mock_df("up")
}
market_data = pd.concat(mock_market.values(), axis=1, keys=mock_market.keys())

# Let's run Nifty 30d return
nifty_df = market_data["^NSEI"]
nifty_close = nifty_df["Close"].squeeze()
nifty_30d_return = (nifty_close.iloc[-1] - nifty_close.iloc[-30]) / nifty_close.iloc[-30]
print(f"NIFTY 30d: {nifty_30d_return}")

# Stock 30d
df = market_data["RELIANCE.NS"]
close_series = df["Close"].squeeze()
stock_30d_return = (close_series.iloc[-1] - close_series.iloc[-30]) / close_series.iloc[-30]
print(f"STOCK 30d: {stock_30d_return}")

nifty_ref = 1.0 + nifty_30d_return
rs = (1.0 + stock_30d_return) / nifty_ref
print(f"RS: {rs}")
print(f"RS < 100.0: {rs < 100.0}")
