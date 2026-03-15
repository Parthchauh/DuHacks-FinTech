import yfinance as yf
import pandas as pd
import ta
from typing import List

from services.rebalancing.models import Position, PortfolioContext, RebalancingConfig, DriftSignal

def detect_drift_with_signals(positions: List[Position], context: PortfolioContext, config: RebalancingConfig) -> List[DriftSignal]:
    signals = []
    drifted_positions = []
    
    # Step 1: Drift detection
    for pos in positions:
        drift = pos.current_weight - pos.target_weight
        if abs(drift) > config.drift_threshold:
            drifted_positions.append((pos, drift))
            
    if not drifted_positions:
        return []
        
    # Step 2: Fetch signals
    symbols_to_fetch = [pos.symbol + (".NS" if not pos.symbol.endswith(".NS") else "") for pos, _ in drifted_positions]
    symbols_to_fetch.append("^NSEI")
    
    # Fetch 200-day daily OHLCV
    market_data = yf.download(symbols_to_fetch, period="200d", group_by="ticker", progress=False)
    
    # NIFTY 50 baseline
    nifty_df = market_data["^NSEI"] if isinstance(market_data.columns, pd.MultiIndex) else market_data
    nifty_30d_return = 0.0
    if len(nifty_df) >= 30:
        nifty_close = nifty_df["Close"].squeeze()
        nifty_30d_return = (nifty_close.iloc[-1] - nifty_close.iloc[-30]) / nifty_close.iloc[-30]
        
    for pos, drift in drifted_positions:
        direction = "overweight" if drift > 0 else "underweight"
        symbol_key = pos.symbol + (".NS" if not pos.symbol.endswith(".NS") else "")
        
        df = market_data[symbol_key] if isinstance(market_data.columns, pd.MultiIndex) else market_data
        if df is None or len(df) < 100:
            continue
            
        close_series = df["Close"].squeeze()
        high_series = df["High"].squeeze()
        low_series = df["Low"].squeeze()
        
        # 1. EMA Signal
        ema50 = ta.trend.EMAIndicator(close=close_series, window=50).ema_indicator().iloc[-1]
        ema100 = ta.trend.EMAIndicator(close=close_series, window=100).ema_indicator().iloc[-1]
        
        ema_sig = "NEUTRAL"
        if pos.current_price < ema50 and pos.current_price < ema100:
            ema_sig = "BEARISH"
        elif pos.current_price > ema50 and pos.current_price > ema100:
            ema_sig = "BULLISH"
            
        # 2. ADX + DMI
        adx_sig = "RANGING"
        if len(df) >= 28:
            adx_ind = ta.trend.ADXIndicator(high=high_series, low=low_series, close=close_series, window=14)
            adx = adx_ind.adx().iloc[-1]
            pos_di = adx_ind.adx_pos().iloc[-1]
            neg_di = adx_ind.adx_neg().iloc[-1]
            
            if adx > config.adx_threshold:
                if neg_di > pos_di:
                    adx_sig = "DOWNTREND_CONFIRMED"
                elif pos_di > neg_di:
                    adx_sig = "UPTREND_CONFIRMED"
                    
        # 3. Relative Strength vs NIFTY 50
        rs_sig = "NEUTRAL"
        if len(df) >= 30:
            stock_30d_return = (close_series.iloc[-1] - close_series.iloc[-30]) / close_series.iloc[-30]
            # Ensure no division by zero; if Nifty return is -1.0, set RS to 1.0 safely
            nifty_ref = 1.0 + nifty_30d_return
            if nifty_ref == 0:
                nifty_ref = 0.0001
            rs = (1.0 + stock_30d_return) / nifty_ref
            
            if rs < config.rs_weak_bound:
                rs_sig = "WEAK"
            elif rs > config.rs_strong_bound:
                rs_sig = "STRONG"
                
        # 4. Drawdown
        dd_sig = "NORMAL"
        if len(df) >= 60:
            recent_60d = close_series.tail(60)
            rolling_max = recent_60d.cummax()
            drawdown = (recent_60d - rolling_max) / rolling_max
            max_dd = drawdown.min()
            
            if max_dd < -config.drawdown_threshold:
                dd_sig = "SIGNIFICANT"
                
        signal_dict = {
            "ema": ema_sig,
            "adx": adx_sig,
            "rs": rs_sig,
            "drawdown": dd_sig
        }
        
        # Step 3: Decision Matrix
        action = "HOLD"
        reason = f"Drift {drift*100:+.1f}%. Signals mixed."
        confidence = 0.5
        
        if direction == "overweight":
            if (ema_sig == "BEARISH" or adx_sig == "DOWNTREND_CONFIRMED") and rs_sig == "WEAK":
                action = "REDUCE"
                reason = f"Reduce overweight position by {drift*100:.1f}%. Technicals bearish, RS weak."
                confidence = 0.8 + (0.1 if dd_sig == "SIGNIFICANT" else 0.0)
            elif ema_sig == "BULLISH":
                action = "HOLD_STRONG"
                reason = f"Position is overweight by {drift*100:.1f}%, but technicals are bullish. Delaying reduction."
                confidence = 0.7
            else:
                action = "HOLD"
        else:
            if ema_sig == "BULLISH" and rs_sig == "STRONG":
                action = "INCREASE"
                reason = f"Increase underweight position by {abs(drift)*100:.1f}%. Momentum strong."
                confidence = 0.9
            else:
                action = "HOLD"
                
        signals.append(DriftSignal(
            symbol=pos.symbol,
            drift=drift,
            direction=direction,
            action=action,
            signals=signal_dict,
            reason=reason,
            confidence=confidence
        ))
        
    return signals
