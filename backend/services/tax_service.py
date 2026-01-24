"""
Tax Service - Capital Gains and Tax-Loss Harvesting
====================================================
Calculate capital gains and identify tax-loss harvesting opportunities.
"""

from typing import List, Dict, Any
from datetime import datetime, timedelta


def calculate_capital_gains(
    holdings: List[Dict[str, Any]],
    transactions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Calculate short-term and long-term capital gains.
    
    India tax rules:
    - STCG (< 1 year): 15% on equity
    - LTCG (> 1 year): 10% above Rs 1 lakh exemption
    """
    stcg = 0.0
    ltcg = 0.0
    total_realized = 0.0
    
    # Process SELL transactions
    one_year_ago = datetime.utcnow() - timedelta(days=365)
    
    for txn in transactions:
        if txn.get("transaction_type") != "SELL":
            continue
        
        sell_amount = txn.get("total_amount", 0)
        sell_date = txn.get("executed_at")
        
        # Find corresponding buy (simplified - assumes FIFO)
        buy_price = 0
        for h in holdings:
            if h.get("ticker") == txn.get("ticker"):
                buy_price = h.get("avg_buy_price", 0)
                break
        
        buy_amount = txn.get("quantity", 0) * buy_price
        gain = sell_amount - buy_amount
        total_realized += gain
        
        # Determine STCG vs LTCG (simplified)
        if isinstance(sell_date, str):
            try:
                sell_date = datetime.fromisoformat(sell_date.replace("Z", "+00:00"))
            except:
                sell_date = datetime.utcnow()
        
        if sell_date and sell_date > one_year_ago:
            stcg += gain
        else:
            ltcg += gain
    
    return {
        "short_term_gains": round(stcg, 2),
        "long_term_gains": round(ltcg, 2),
        "total_realized": round(total_realized, 2),
        "stcg_tax_estimate": round(stcg * 0.15, 2),  # 15% STCG tax
        "ltcg_tax_estimate": round(max(0, ltcg - 100000) * 0.10, 2)  # 10% above 1L
    }


def find_harvest_opportunities(
    holdings: List[Dict[str, Any]],
    min_loss_threshold: float = 1000
) -> List[Dict[str, Any]]:
    """
    Find holdings with unrealized losses that could be harvested.
    
    Tax-loss harvesting = selling at a loss to offset gains.
    """
    opportunities = []
    
    for h in holdings:
        current_value = h.get("current_value", 0)
        invested = h.get("quantity", 0) * h.get("avg_buy_price", 0)
        unrealized_loss = invested - current_value
        
        if unrealized_loss >= min_loss_threshold:
            opportunities.append({
                "ticker": h.get("ticker"),
                "name": h.get("name"),
                "quantity": h.get("quantity"),
                "avg_buy_price": h.get("avg_buy_price"),
                "current_price": h.get("current_price"),
                "unrealized_loss": round(unrealized_loss, 2),
                "loss_percent": round((unrealized_loss / invested) * 100, 2) if invested > 0 else 0,
                "potential_tax_savings": round(unrealized_loss * 0.15, 2)  # Assuming STCG offset
            })
    
    # Sort by largest loss
    opportunities.sort(key=lambda x: x["unrealized_loss"], reverse=True)
    
    return opportunities


def estimate_tax_liability(
    stcg: float,
    ltcg: float,
    dividends: float = 0
) -> Dict[str, Any]:
    """
    Estimate total tax liability on investment income.
    """
    stcg_tax = stcg * 0.15 if stcg > 0 else 0
    ltcg_tax = max(0, ltcg - 100000) * 0.10 if ltcg > 0 else 0
    dividend_tax = dividends * 0.0  # Dividends taxed at slab rate, simplified to 0
    
    return {
        "stcg_tax": round(stcg_tax, 2),
        "ltcg_tax": round(ltcg_tax, 2),
        "dividend_tax": round(dividend_tax, 2),
        "total_tax_estimate": round(stcg_tax + ltcg_tax + dividend_tax, 2)
    }
