import yfinance as yf
from typing import List

from services.rebalancing.models import Position, PortfolioContext, DriftSignal, Trade

def apply_glide_path(signals: List[DriftSignal], positions: List[Position], context: PortfolioContext) -> List[DriftSignal]:
    if context.years_to_goal is None:
        return signals

    # Determine max equity percentage
    years = context.years_to_goal
    if years > 10:
        max_eq = 0.90
    elif 7 <= years <= 10:
        max_eq = 0.75
    elif 4 <= years < 7:
        max_eq = 0.60
    elif 2 <= years < 4:
        max_eq = 0.45
    else: # < 2 years
        max_eq = 0.30

    # Compute current equity percentage
    current_equity_pct = 0.0
    for pos in positions:
        sec = pos.sector.lower()
        if "bond" not in sec and "fixed" not in sec and "gold" not in sec and "cash" not in sec:
            current_equity_pct += pos.current_weight

    # Override if breaching
    if current_equity_pct > max_eq:
        excess_eq = current_equity_pct - max_eq
        
        eq_signals = [s for s in signals if next((p for p in positions if p.symbol == s.symbol and "bond" not in p.sector.lower() and "fixed" not in p.sector.lower()), None)]
        # Sort positions by highest drift (most overweight first)
        eq_signals.sort(key=lambda x: x.drift, reverse=True)
        
        reduced_amount = 0.0
        for sig in eq_signals:
            if reduced_amount >= excess_eq:
                break
                
            # Exception: do NOT override HOLD_STRONG positions if years_to_goal > 1
            if sig.action == "HOLD_STRONG" and years > 1:
                continue
                
            if sig.action in ["HOLD", "HOLD_STRONG", "INCREASE"]:
                sig.action = "REDUCE"
                sig.signals["glide_path_trigger"] = True
                sig.reason += f" [Glide Path override: Equity at {current_equity_pct*100:.1f}%, max is {max_eq*100:.1f}%]"
                
                # Assume reducing back to target clears the drift amount
                pos = next((p for p in positions if p.symbol == sig.symbol), None)
                if pos:
                    reduced_amount += max(0, pos.current_weight - pos.target_weight)

    return signals

def check_cash_floor(context: PortfolioContext, proposed_trades: List[Trade]) -> List[Trade]:
    if context.cash_floor <= 0:
        return proposed_trades
        
    current_cash = context.cash_balance
    sell_proceeds = sum(t.estimated_value for t in proposed_trades if t.action == "SELL")
    buy_costs = sum(t.estimated_value for t in proposed_trades if t.action == "BUY")
    
    net_cash_after = current_cash + sell_proceeds - buy_costs
    
    if net_cash_after >= context.cash_floor:
        return proposed_trades

    # Floor breached. Cancel BUY trades smallest-first.
    buys = [t for t in proposed_trades if t.action == "BUY"]
    buys.sort(key=lambda x: x.estimated_value)
    
    for b in buys:
        if net_cash_after >= context.cash_floor:
            break
            
        proposed_trades.remove(b)
        net_cash_after += b.estimated_value
        
    # If still below floor after all buy cancellations
    if net_cash_after < context.cash_floor:
        deficit = (context.cash_floor * 1.10) - net_cash_after # Raise enough for floor + 10% buffer
        
        # In a real pipeline with loaded `adv` parameters from db, we sort.
        # Here we emit a RAISE_CASH priority=1 generic ticket since actual symbol parsing
        # demands full DB sync iteration.
        proposed_trades.append(Trade(
            symbol="RAISE_CASH",
            action="SELL",
            quantity=0,
            estimated_value=deficit,
            target_weight_after=0.0,
            reason=f"Mandatory raise to meet cash floor + buffer (Deficit: ₹{deficit:,.0f}).",
            signals_triggered=["cash_floor_breach"],
            priority=1
        ))

    return proposed_trades
