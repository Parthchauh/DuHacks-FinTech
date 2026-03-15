from typing import List, Dict
from services.rebalancing.models import Position, PortfolioContext, StressTestResult, ScenarioResult, DriftSignal

SCENARIOS = {
  "covid_crash_2020":     {"equity": -0.38, "gold": +0.12, "bonds": +0.05, "it": -0.35, "fmcg": -0.20},
  "taper_tantrum_2013":   {"equity": -0.20, "bonds": -0.08, "gold": -0.05},
  "gfc_2008":             {"equity": -0.60, "bonds": +0.10, "gold": +0.25, "it": -0.55},
  "rate_hike_2022":       {"equity": -0.15, "it": -0.30, "fmcg": -0.05, "bonds": -0.12},
  "nifty_correction_2024":{"equity": -0.10, "smallcap": -0.20, "midcap": -0.15}
}

def _map_sector_to_drawdown(pos: Position, scenario_data: Dict[str, float]) -> float:
    # 1. Map each position to its sector bucket
    if "it" in pos.sector.lower() or "tech" in pos.sector.lower():
        if "it" in scenario_data: return scenario_data["it"]
    if "fmcg" in pos.sector.lower() or "consumer" in pos.sector.lower():
        if "fmcg" in scenario_data: return scenario_data["fmcg"]
    if "gold" in pos.sector.lower():
        if "gold" in scenario_data: return scenario_data["gold"]
    if "bond" in pos.sector.lower() or "fixed" in pos.sector.lower():
        if "bonds" in scenario_data: return scenario_data["bonds"]
    
    # Market cap fallbacks for broad equities if available
    if pos.market_cap_category == "small" and "smallcap" in scenario_data:
        return scenario_data["smallcap"]
    elif pos.market_cap_category == "mid" and "midcap" in scenario_data:
        return scenario_data["midcap"]
        
    return scenario_data.get("equity", -0.10)

def run_stress_tests(positions: List[Position], context: PortfolioContext) -> StressTestResult:
    scenario_results = {}
    
    worst_case_scenario = ""
    worst_case_loss_pct = 0.0
    
    for scenario_name, scenario_data in SCENARIOS.items():
        stressed_portfolio_value = 0.0
        position_losses = []
        
        for pos in positions:
            pos_value = pos.current_weight * context.total_value
            dd_factor = _map_sector_to_drawdown(pos, scenario_data)
            
            stressed_pos_value = pos_value * (1.0 + dd_factor)
            stressed_portfolio_value += stressed_pos_value
            
            # Record absolute loss for contributing sorting (loss is positive here)
            if dd_factor < 0:
                pos_loss_inr = pos_value * abs(dd_factor)
                position_losses.append((pos.symbol, pos_loss_inr))
                
        scenario_loss_pct = (stressed_portfolio_value - context.total_value) / context.total_value if context.total_value > 0 else 0.0
        
        exceeds = abs(scenario_loss_pct) > context.max_drawdown_tolerance
        
        position_losses.sort(key=lambda x: x[1], reverse=True)
        top_contributors = [p[0] for p in position_losses[:3]]
        
        scenario_results[scenario_name] = ScenarioResult(
            scenario_name=scenario_name,
            portfolio_loss_pct=scenario_loss_pct,
            portfolio_loss_inr=context.total_value - stressed_portfolio_value,
            exceeds_tolerance=exceeds,
            top_loss_contributors=top_contributors
        )
        
        if scenario_loss_pct < worst_case_loss_pct:
            worst_case_loss_pct = scenario_loss_pct
            worst_case_scenario = scenario_name
            
    # Track which symbols are persistently causing failures across any scenario
    stress_triggered_reduces = []
    for res in scenario_results.values():
        if res.exceeds_tolerance:
            stress_triggered_reduces.extend(res.top_loss_contributors)
            
    # Deduplicate
    stress_triggered_reduces = list(set(stress_triggered_reduces))
            
    return StressTestResult(
        scenarios=scenario_results,
        worst_case_scenario=worst_case_scenario,
        worst_case_loss_pct=worst_case_loss_pct,
        stress_triggered_reduces=stress_triggered_reduces
    )
