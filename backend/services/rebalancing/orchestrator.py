import os
from datetime import datetime, date
from typing import List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

# Models
from services.rebalancing.models import (
    Position, PortfolioContext, RebalancingConfig, DriftSignal, Trade, RebalancingReport, TaxImpact, HarvestOpportunity
)

# Modules 1-4
from services.rebalancing.drift_signals import detect_drift_with_signals
from services.rebalancing.risk_engine import apply_volatility_gate, compute_risk_parity_targets
from services.rebalancing.tax_engine import compute_tax_impact, find_harvest_opportunities
from services.rebalancing.factor_esg import check_factor_exposures, apply_esg_filter
from services.rebalancing.scenario_engine import run_stress_tests
from services.rebalancing.glide_path import apply_glide_path, check_cash_floor

def _merge_risk_parity_signals(signals: List[DriftSignal], rp_targets: dict, positions: List[Position], config: RebalancingConfig) -> List[DriftSignal]:
    for pos in positions:
        target = rp_targets.get(pos.symbol, pos.current_weight)
        if pos.current_weight > (target * 1.20):
            # Budget exceeded
            sig = next((s for s in signals if s.symbol == pos.symbol), None)
            if sig:
                sig.action = "REDUCE_RISK_PARITY"
                sig.reason += f" Risk-parity limit breached (current {pos.current_weight*100:.1f}% > target {target*100:.1f}%)."
            else:
                signals.append(DriftSignal(
                    symbol=pos.symbol, drift=pos.current_weight-target, direction="overweight", action="REDUCE_RISK_PARITY", 
                    signals={"risk_parity_breach": True}, reason=f"Exceeds risk contribution target {target*100:.1f}%.", confidence=1.0
                ))
    return signals

def _filter_by_tax_confirmation(signals: List[DriftSignal], tax_impacts: List[TaxImpact]) -> List[DriftSignal]:
    for sig in signals:
        if sig.action in ["REDUCE", "REDUCE_RISK_PARITY"]:
            impact = next((t for t in tax_impacts if t.symbol == sig.symbol), None)
            if impact and not impact.action_confirmed:
                sig.action = "HOLD"
                sig.reason += " Downgraded to HOLD by Tax filter."
    return signals

def _generate_trades(signals: List[DriftSignal], positions: List[Position], context: PortfolioContext, config: RebalancingConfig, tax_impacts: List[TaxImpact]) -> List[Trade]:
    trades = []
    
    for sig in signals:
        if sig.action in ["HOLD", "HOLD_STRONG"]:
            continue
            
        pos = next((p for p in positions if p.symbol == sig.symbol), None)
        if not pos:
            continue
            
        qty = (abs(sig.drift) * context.total_value) / pos.current_price
        val = qty * pos.current_price
        
        if val < config.min_trade_value:
            continue
            
        priority = 3
        if sig.confidence > 0.75 and abs(sig.drift) > 0.05:
            priority = 1
        elif sig.confidence > 0.50:
            priority = 2
            
        action = "SELL" if sig.action in ["REDUCE", "REDUCE_RISK_PARITY"] else "BUY"
        t_impact = next((t for t in tax_impacts if t.symbol == sig.symbol), None) if action == "SELL" else None
        
        trades.append(Trade(
            symbol=pos.symbol, action=action, quantity=qty, estimated_value=val,
            target_weight_after=pos.target_weight, reason=sig.reason,
            signals_triggered=list(sig.signals.keys()), tax_impact=t_impact, priority=priority
        ))
        
    return trades

async def _generate_ai_summary(signals: List[DriftSignal], trades: List[Trade], stress_result) -> str:
    # A generic proxy summary when actual AI inference is unavailable
    sell_count = sum(1 for t in trades if t.action == "SELL")
    buy_count = sum(1 for t in trades if t.action == "BUY")
    return f"Engine recommends {sell_count} reductions and {buy_count} additions to optimize risk. Worst-case stress scenario identified as {stress_result.worst_case_scenario} with a potential {stress_result.worst_case_loss_pct*100:.1f}% drawdown."

# Stub proxy getters until full repository pattern is wired
def _load_portfolio_data(portfolio_id: str, db: Session) -> Tuple[List[Position], PortfolioContext, RebalancingConfig]:
    return [], PortfolioContext(), RebalancingConfig()

def _get_purchase_date(symbol: str, db: Session) -> date:
    return date.today().replace(year=date.today().year - 2)

def _get_transactions(portfolio_id: str, db: Session) -> List:
    return []

def _persist_report(report: RebalancingReport, triggered_by: str, db: Session):
    pass

async def execute_smart_rebalancing_pipeline(
    portfolio_id: str, db: Session, triggered_by: str,
    positions_mock: List[Position] = None, context_mock: PortfolioContext = None, config_mock: RebalancingConfig = None, dry_run: bool = False
) -> RebalancingReport:
    """18-step master pipeline execution."""
    
    # 0. Rate limiting (Pseudo code - omitting actual DB query for brevity unless requested)
    # last_run = db.query(rebalancing_log)...
    
    # 1. Load Data
    positions = positions_mock if positions_mock else []
    context = context_mock if context_mock else PortfolioContext()
    config = config_mock if config_mock else RebalancingConfig()

    # 2. Drift Signals
    raw_signals = detect_drift_with_signals(positions, context, config)
    
    # 3. Volatility Gate
    vol_signals = apply_volatility_gate(raw_signals, positions, config)
    
    # 4. Risk Parity Targets
    rp_targets = compute_risk_parity_targets(positions)
    
    # 5. Risk Parity Signals
    rp_signals = _merge_risk_parity_signals(vol_signals, rp_targets, positions, config)
    
    # 6. Factor Alerts
    factor_alerts = check_factor_exposures(positions, context)
    
    # 7. ESG Filter
    esg_signals = apply_esg_filter(rp_signals, positions, context)
    
    # 8. Stress Test
    stress_result = run_stress_tests(positions, context)
    
    # 9. Glide Path
    gp_signals = apply_glide_path(esg_signals, positions, context)
    
    # 10. Tax Impacts
    tax_impacts = [
        compute_tax_impact(s, next(p for p in positions if p.symbol == s.symbol), context, _get_purchase_date(s.symbol, db))
        for s in gp_signals if s.action in ("REDUCE", "REDUCE_RISK_PARITY", "INCREASE")
    ]
    
    # 11. Tax Signals Filter
    tax_signals = _filter_by_tax_confirmation(gp_signals, tax_impacts)
    
    # 12. Harvest Opportunities
    harvest_opps = find_harvest_opportunities(positions, _get_transactions(portfolio_id, db))
    
    # 13. Trades
    trades = _generate_trades(tax_signals, positions, context, config, tax_impacts)
    
    # 14. Cash Floor Finalizing
    final_trades = check_cash_floor(context, trades)
    
    # 15. AI Summary
    ai_summary = await _generate_ai_summary(tax_signals, final_trades, stress_result)
    
    # 16. Compile Report
    total_drift = sum(abs(p.current_weight - p.target_weight) * p.current_weight for p in positions)
    estimated_cost_inaction = context.total_value * total_drift * 0.05
    tax_savings = sum(h.estimated_tax_saving for h in harvest_opps)
    
    report = RebalancingReport(
        portfolio_id=portfolio_id,
        generated_at=datetime.utcnow(),
        total_drift_score=total_drift,
        trades=final_trades,
        harvest_opportunities=harvest_opps,
        factor_alerts=factor_alerts,
        stress_test_results=stress_result,
        estimated_tax_savings=tax_savings,
        estimated_cost_of_inaction=estimated_cost_inaction,
        ai_summary=ai_summary,
        config_used=config
    )
    
    # 17. Persist
    if not dry_run:
        _persist_report(report, triggered_by, db)
        
    # 18. Return
    return report
