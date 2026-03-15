import os
import requests
import numpy as np
import math
import yfinance as yf
from typing import List

from services.rebalancing.models import Position, PortfolioContext, FactorAlert, DriftSignal

# In-memory cache to prevent alpha vantage / yfinance rate limits during orchestrator loops
_FACTOR_CACHE = {}

def check_factor_exposures(positions: List[Position], context: PortfolioContext) -> List[FactorAlert]:
    alerts = []
    if not context.factor_limits or not positions:
        return alerts

    factor_data = {}
    
    for pos in positions:
        sym = pos.symbol + (".NS" if not pos.symbol.endswith(".NS") else "")
        if sym not in _FACTOR_CACHE:
            try:
                t = yf.Ticker(sym)
                info = t.info
                # Momentum approx 6-month return
                hist = t.history(period="6mo")
                mom = 0.0
                if len(hist) > 0:
                    mom = (hist["Close"].iloc[-1] - hist["Close"].iloc[0]) / hist["Close"].iloc[0]
                    
                _FACTOR_CACHE[sym] = {
                    "pb": info.get("priceToBook", 0.0),
                    "eps_growth": info.get("earningsGrowth", 0.0),
                    "roe": info.get("returnOnEquity", 0.0),
                    "momentum": mom,
                    "marketCap": info.get("marketCap", 1e9)
                }
            except:
                _FACTOR_CACHE[sym] = {"pb": 1.0, "eps_growth": 0.0, "roe": 0.0, "momentum": 0.0, "marketCap": 1e9}
        
        factor_data[pos.symbol] = _FACTOR_CACHE[sym]

    port_factors = {"value": 0.0, "growth": 0.0, "quality": 0.0, "momentum": 0.0, "size": 0.0}
    
    # Portfolio-level weighted factors
    for pos in positions:
        data = factor_data[pos.symbol]
        w = pos.current_weight
        
        val_score = 1.0 / data["pb"] if data["pb"] > 0 else 0.0 
        
        port_factors["value"] += (val_score * w)
        port_factors["growth"] += (data["eps_growth"] * w)
        port_factors["quality"] += (data["roe"] * w)
        port_factors["momentum"] += (data["momentum"] * w)
        port_factors["size"] += (math.log10(data["marketCap"]) * w if data["marketCap"] > 0 else 0.0) 

    # Normalize roughly using standard typical maximums for India universe bounds
    port_factors["value"] = min(1.0, port_factors["value"]) # P/B > 1 usually
    port_factors["size"] = port_factors["size"] / 13.0 # Cap normalization

    for factor, limit in context.factor_limits.items():
        score = port_factors.get(factor, 0.0)
        
        if score > limit:
            sorted_pos = sorted(positions, key=lambda x: factor_data[x.symbol].get("pb" if factor == "value" else "roe", 0) * x.current_weight, reverse=True)
            top_contributors = [p.symbol for p in sorted_pos[:3]]
            
            alerts.append(FactorAlert(
                factor=factor,
                current_score=score,
                limit=limit,
                top_contributors=top_contributors,
                suggested_reduction_pct=min(1.0, (score - limit) / score)
            ))

    return alerts

def apply_esg_filter(signals: List[DriftSignal], positions: List[Position], context: PortfolioContext) -> List[DriftSignal]:
    if not context.esg_exclusions:
        return signals
        
    for idx, sig in enumerate(signals):
        pos = next((p for p in positions if p.symbol == sig.symbol), None)
        if not pos:
            continue
            
        if pos.sector in context.esg_exclusions:
            if sig.action in ["INCREASE", "HOLD_STRONG"]:
                sig.action = "HOLD"
                sig.signals["esg_override"] = True
                sig.reason += f" [ESG: sector {pos.sector} excluded]"
                
    return signals
