import logging
from datetime import date, timedelta
from typing import List

from services.rebalancing.models import Position, PortfolioContext, DriftSignal, TaxImpact, HarvestOpportunity

STCG_RATE = 0.20          # Indian STCG rate 20%
LTCG_RATE = 0.125         # Indian LTCG rate 12.5%
LTCG_EXEMPTION = 125000.0 # 1.25L exemption
STT_RATE = 0.001          # STT 0.1%

def compute_tax_impact(action: DriftSignal, position: Position, context: PortfolioContext, purchase_date: date) -> TaxImpact:
    if action.action not in ["REDUCE", "REDUCE_RISK_PARITY", "SELL"]:
        return TaxImpact(
            symbol=position.symbol, holding_period_days=0, gain_type="NONE",
            gross_gain=0.0, tax_liability=0.0, stt_cost=0.0,
            net_benefit=0.0, harvest_eligible=False, action_confirmed=True
        )

    holding_period = (date.today() - purchase_date).days
    sell_qty = (abs(action.drift) * context.total_value) / position.current_price
    
    gross_gain = (position.current_price - position.avg_price) * sell_qty
    stt_cost = sell_qty * position.current_price * STT_RATE
    
    gain_type = ""
    tax_liability = 0.0
    harvest_eligible = False
    
    if gross_gain > 0:
        if holding_period < 365:
            gain_type = "STCG"
            tax_liability = gross_gain * STCG_RATE
        else:
            gain_type = "LTCG"
            # Hardcoding generic YTD LTCG consumed for prototypes
            ytd_ltcg_gains = 50000.0 
            ltcg_exemption_remaining = max(0, LTCG_EXEMPTION - ytd_ltcg_gains)
            taxable_gain = max(0, gross_gain - ltcg_exemption_remaining)
            tax_liability = taxable_gain * LTCG_RATE
    else:
        gain_type = "LOSS"
        harvest_eligible = True
        
    expected_risk_reduction_value = abs(action.drift) * context.total_value * 0.05 
    net_benefit = expected_risk_reduction_value - tax_liability - stt_cost
    
    action_confirmed = True
    if net_benefit <= 0 and gain_type != "LOSS":
        action_confirmed = False
        action.action = "HOLD"
        action.reason = f"Cancelled REDUCE: Tax drag (₹{tax_liability:,.0f} {gain_type}) exceeds utility."
        
    return TaxImpact(
        symbol=position.symbol,
        holding_period_days=holding_period,
        gain_type=gain_type,
        gross_gain=gross_gain,
        tax_liability=tax_liability,
        stt_cost=stt_cost,
        net_benefit=net_benefit,
        harvest_eligible=harvest_eligible,
        action_confirmed=action_confirmed
    )

def find_harvest_opportunities(positions: List[Position], transactions: List) -> List[HarvestOpportunity]:
    opportunities = []
    
    thirty_days_ago = date.today() - timedelta(days=30)
    
    for pos in positions:
        if pos.current_price < pos.avg_price:
            total_loss = (pos.avg_price - pos.current_price) * pos.quantity
            
            recent_buy = False
            for t in transactions:
                if t.symbol == pos.symbol and t.action == "BUY" and t.date.date() >= thirty_days_ago:
                    recent_buy = True
                    break
                    
            if not recent_buy:
                # Suggest sector ETF replacements
                replacement = "NIFTYBEES"
                sec_lower = pos.sector.lower()
                if "it" in sec_lower:
                    replacement = "ITBEES"
                elif "financial" in sec_lower or "bank" in sec_lower:
                    replacement = "BANKBEES"
                elif "pharma" in sec_lower:
                    replacement = "PHARMABEES"
                    
                opportunities.append(HarvestOpportunity(
                    symbol=pos.symbol,
                    isin=pos.isin,
                    unrealized_loss=total_loss,
                    loss_pct=(pos.avg_price - pos.current_price) / pos.avg_price,
                    suggested_replacement=replacement,
                    estimated_tax_saving=total_loss * 0.125, # Base assumption
                    wash_sale_window_end=thirty_days_ago
                ))
                
    # Rank by biggest portfolio impact: loss_amount * current_weight
    opportunities.sort(key=lambda x: x.unrealized_loss * next(p.current_weight for p in positions if p.symbol == x.symbol), reverse=True)
    return opportunities[:5]
