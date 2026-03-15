import math
import numpy as np
import pandas as pd
import yfinance as yf
from typing import List, Dict

from services.rebalancing.models import Position, DriftSignal, RebalancingConfig

def apply_volatility_gate(signals: List[DriftSignal], positions: List[Position], config: RebalancingConfig) -> List[DriftSignal]:
    reduce_signals = [s for s in signals if s.action == "REDUCE"]
    if not reduce_signals:
        return signals

    symbols_to_check = [s.symbol + (".NS" if not s.symbol.endswith(".NS") else "") for s in reduce_signals]
    data = yf.download(symbols_to_check, period="25d", progress=False, group_by="ticker")
    
    for sig in reduce_signals:
        pos = next((p for p in positions if p.symbol == sig.symbol), None)
        if not pos:
            continue
            
        symbol_key = sig.symbol + (".NS" if not sig.symbol.endswith(".NS") else "")
        df = data[symbol_key] if isinstance(data.columns, pd.MultiIndex) else data
        
        if df is None or len(df) < 20:
            continue
            
        recent_closes = df["Close"].squeeze().tail(21)
        daily_returns = recent_closes.pct_change().dropna()
        
        vol = daily_returns.std() * math.sqrt(252)
        threshold = config.get_vol_threshold(pos.market_cap_category)
        
        if vol > threshold:
            sig.signals["high_volatility"] = True
            sig.reason += f" Volatility ({vol*100:.1f}%) > {pos.market_cap_category} cap limit ({threshold*100:.1f}%)."
        else:
            sig.action = "HOLD"
            sig.reason += f" Vol normal ({vol*100:.1f}%). REDUCE downgraded to HOLD."
            
    return signals

def compute_risk_parity_targets(positions: List[Position]) -> Dict[str, float]:
    if not positions:
        return {}
        
    symbols = [p.symbol for p in positions]
    yf_symbols = [s + (".NS" if not s.endswith(".NS") else "") for s in symbols]
    
    data = yf.download(yf_symbols, period="252d", progress=False, group_by="ticker")
    
    returns_df = pd.DataFrame()
    for sys_sym, yf_sym in zip(symbols, yf_symbols):
        if isinstance(data.columns, pd.MultiIndex):
            if yf_sym in data.columns.get_level_values(0):
                returns_df[sys_sym] = data[yf_sym]["Close"].pct_change()
        else:
            returns_df[sys_sym] = data["Close"].pct_change()
            
    returns_df = returns_df.dropna()
    N = len(symbols)
    
    if len(returns_df) < 50 or N < 2:
        return {p.symbol: p.current_weight for p in positions}
        
    cov = returns_df.cov().values * 252
    
    # Gradient Descent for Risk Parity
    w = np.ones(N) / N
    learning_rate = 0.01
    
    for _ in range(1000):
        # Marginal risk contribution
        port_var = w.T @ cov @ w
        port_vol = np.sqrt(port_var)
        
        marginal_risk = cov @ w
        RC = (w * marginal_risk) / port_vol
        
        target_rc = port_vol / N
        
        grad = RC - target_rc
        max_err = np.max(np.abs(grad))
        
        if max_err < 1e-6:
            break
            
        if max_err > 0.05: # oscillating
            learning_rate *= 0.5
            
        w = w - learning_rate * grad
        w = np.maximum(w, 0.001) # floor at 0.1%
        w = w / w.sum()
        
    return {symbols[i]: float(w[i]) for i in range(N)}
