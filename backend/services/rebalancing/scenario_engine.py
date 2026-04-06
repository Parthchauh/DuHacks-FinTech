"""
OptiWealth Rebalancing Engine — Scenario / Stress-Test Engine
===============================================================
Stage 7: Stress Test Engine

Scenarios use NSE sector classifications with historically calibrated shocks.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Union

from services.rebalancing.models import (
    DriftSignal,
    PortfolioContext,
    Position,
    ScenarioResult,
    StressTestResult,
)

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════
# HISTORICAL STRESS SCENARIOS (NSE sector classifications)
# ═══════════════════════════════════════════════════════════════════════
SCENARIOS: Dict[str, Dict[str, float]] = {
    "covid_crash_2020": {
        "Financial Services": -0.45,
        "IT":                 -0.30,
        "Auto":               -0.40,
        "FMCG":               -0.15,
        "Pharma":             +0.10,
        "Metal":              -0.50,
        "Realty":             -0.55,
        "default":            -0.38,
    },
    "gfc_2008": {
        "Financial Services": -0.65,
        "IT":                 -0.55,
        "Auto":               -0.60,
        "FMCG":               -0.35,
        "Pharma":             -0.20,
        "Metal":              -0.70,
        "Realty":             -0.75,
        "default":            -0.60,
    },
    "rate_hike_2022": {
        "Financial Services": -0.10,
        "IT":                 -0.30,
        "Realty":             -0.20,
        "FMCG":               -0.08,
        "Pharma":             -0.12,
        "default":            -0.15,
    },
    "nifty_correction_2024": {
        "Smallcap":           -0.22,
        "Midcap":             -0.18,
        "default":            -0.10,
    },
    "taper_tantrum_2013": {
        "Financial Services": -0.20,
        "IT":                 -0.15,
        "default":            -0.20,
    },
}

# ── Sector keyword → scenario key mapping ─────────────────────────────
_SECTOR_ALIASES: Dict[str, str] = {
    "bank":       "Financial Services",
    "financial":  "Financial Services",
    "nbfc":       "Financial Services",
    "insurance":  "Financial Services",
    "it":         "IT",
    "tech":       "IT",
    "technology": "IT",
    "software":   "IT",
    "auto":       "Auto",
    "automobile": "Auto",
    "fmcg":       "FMCG",
    "consumer":   "FMCG",
    "pharma":     "Pharma",
    "healthcare": "Pharma",
    "metal":      "Metal",
    "mining":     "Metal",
    "steel":      "Metal",
    "realty":     "Realty",
    "real estate": "Realty",
    "energy":     "default",
    "oil":        "default",
    "power":      "default",
    "telecom":    "default",
}


def _resolve_sector_shock(
    pos: Position,
    scenario_data: Dict[str, float],
) -> float:
    """Map a position's sector to the appropriate shock factor.

    Matches position.sector against NSE sector keys in the scenario.
    Falls back to market-cap aliases (Smallcap/Midcap) then default.
    """
    sector_lower = pos.sector.lower().strip()

    # 1. Direct match against scenario keys (case-insensitive)
    for key, shock in scenario_data.items():
        if key.lower() == sector_lower or key.lower() in sector_lower:
            return shock

    # 2. Alias lookup
    for keyword, canonical in _SECTOR_ALIASES.items():
        if keyword in sector_lower:
            if canonical in scenario_data:
                return scenario_data[canonical]

    # 3. Market-cap bucket fallback
    if pos.market_cap_category == "small" and "Smallcap" in scenario_data:
        return scenario_data["Smallcap"]
    if pos.market_cap_category == "mid" and "Midcap" in scenario_data:
        return scenario_data["Midcap"]

    return scenario_data.get("default", -0.10)


# ═══════════════════════════════════════════════════════════════════════
# STAGE 7: STRESS TEST ENGINE
# ═══════════════════════════════════════════════════════════════════════

def run_stress_tests(
    positions: List[Position],
    context: PortfolioContext,
) -> StressTestResult:
    """Run historical stress scenarios on the current portfolio.

    For each scenario:
      1. Apply sector-specific shock to each position.
      2. Compute portfolio-level loss (₹ and %).
      3. Check against max_drawdown_tolerance.
      4. Identify top 3 loss contributors.
      5. Generate REDUCE signals for breaching scenarios.

    Returns StressTestResult with all scenarios + worst case.
    """
    if not positions or context.total_value <= 0:
        return StressTestResult()

    scenario_results: Dict[str, ScenarioResult] = {}
    worst_case_scenario = ""
    worst_case_loss_pct = 0.0
    worst_case_loss_inr = 0.0

    for scenario_name, scenario_data in SCENARIOS.items():
        position_losses: List[Dict[str, Union[str, float]]] = []
        total_scenario_loss = 0.0

        for pos in positions:
            pos_value = pos.current_weight * context.total_value
            shock = _resolve_sector_shock(pos, scenario_data)
            loss_inr = pos_value * shock  # negative shock → negative loss_inr (= actual loss)
            total_scenario_loss += loss_inr

            if shock < 0:
                position_losses.append({
                    "symbol": pos.symbol,
                    "loss_inr": abs(loss_inr),
                    "loss_pct": abs(shock),
                })

        portfolio_loss_pct = total_scenario_loss / context.total_value
        breaches = abs(portfolio_loss_pct) > context.max_drawdown_tolerance

        # Sort by largest absolute loss
        position_losses.sort(key=lambda x: x["loss_inr"], reverse=True)
        top_contributors = position_losses[:3]
        top_contributor_symbols = [str(c["symbol"]) for c in top_contributors]

        scenario_results[scenario_name] = ScenarioResult(
            scenario_name=scenario_name,
            loss_inr=abs(total_scenario_loss),
            loss_pct=portfolio_loss_pct,
            portfolio_loss_pct=portfolio_loss_pct,
            portfolio_loss_inr=abs(total_scenario_loss),
            breaches_tolerance=breaches,
            exceeds_tolerance=breaches,
            top_loss_contributors=top_contributor_symbols,
        )

        if portfolio_loss_pct < worst_case_loss_pct:
            worst_case_loss_pct = portfolio_loss_pct
            worst_case_loss_inr = abs(total_scenario_loss)
            worst_case_scenario = scenario_name

    # ── Collect stress-triggered reduce symbols ───────────────────────
    stress_triggered: List[str] = []
    for res in scenario_results.values():
        if res.breaches_tolerance:
            for contributor in res.top_loss_contributors:
                sym = contributor if isinstance(contributor, str) else str(contributor.get("symbol", ""))
                if sym and sym not in stress_triggered:
                    stress_triggered.append(sym)

    logger.info(
        "Stress tests complete. Worst case: %s (%.1f%%). Breach symbols: %s",
        worst_case_scenario,
        worst_case_loss_pct * 100,
        stress_triggered,
    )

    return StressTestResult(
        scenarios=scenario_results,
        worst_case_scenario=worst_case_scenario,
        worst_case_loss_inr=worst_case_loss_inr,
        worst_case_loss_pct=worst_case_loss_pct,
        stress_triggered_reduces=stress_triggered,
    )
