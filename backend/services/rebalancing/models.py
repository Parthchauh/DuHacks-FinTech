from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime, date

class Position(BaseModel):
    symbol: str
    quantity: float
    avg_price: float
    current_price: float
    current_weight: float
    target_weight: float
    sector: str
    isin: str
    market_cap_category: str  # "large" | "mid" | "small"

class PortfolioContext(BaseModel):
    user_id: str
    total_value: float
    cash_balance: float
    cash_floor: float
    risk_tolerance: str        # "conservative" | "moderate" | "aggressive"
    goal_type: str             # "retirement" | "wealth_creation" | "income"
    goal_horizon_years: int
    years_to_goal: int
    esg_exclusions: list[str]
    factor_limits: dict
    max_drawdown_tolerance: float
    tax_bracket: str           # "30%" | "20%"

class RebalancingConfig(BaseModel):
    drift_threshold: float = 0.03
    adx_threshold: int = 25
    rs_weak_bound: float = 0.85
    rs_strong_bound: float = 1.15
    drawdown_threshold: float = 0.15
    vol_threshold_large: float = 0.30
    vol_threshold_mid: float = 0.45
    vol_threshold_small: float = 0.60
    min_trade_value: float = 500.0
    cooldown_minutes: int = 15

    def get_vol_threshold(self, market_cap_category: str) -> float:
        return {
            "large": self.vol_threshold_large,
            "mid": self.vol_threshold_mid,
            "small": self.vol_threshold_small
        }.get(market_cap_category, self.vol_threshold_mid)

class DriftSignal(BaseModel):
    symbol: str
    drift: float
    direction: str       # "overweight" | "underweight"
    action: str          # "REDUCE" | "INCREASE" | "HOLD" | "HOLD_STRONG"
    signals: dict        # {"ema":"BEARISH","adx":"DOWNTREND_CONFIRMED","rs":"WEAK","drawdown":"SIGNIFICANT"}
    reason: str          # "Reduce RELIANCE by X%: price below 100 EMA, RS weak, drift +4.2%"
    confidence: float    # 0.0-1.0, proportion of signals agreeing with action

class TaxImpact(BaseModel):
    symbol: str
    holding_period_days: int
    gain_type: str           # "STCG" | "LTCG" | "LOSS"
    gross_gain: float
    tax_liability: float
    stt_cost: float
    net_benefit: float
    harvest_eligible: bool
    action_confirmed: bool

class HarvestOpportunity(BaseModel):
    symbol: str
    isin: str
    unrealized_loss: float
    loss_pct: float
    suggested_replacement: str
    estimated_tax_saving: float
    wash_sale_window_end: date

class FactorAlert(BaseModel):
    factor: str           # "momentum" | "value" | "growth" | "quality" | "size"
    current_score: float
    limit: float
    top_contributors: list[str]   # symbols
    suggested_reduction_pct: float

class ScenarioResult(BaseModel):
    scenario_name: str
    portfolio_loss_pct: float
    portfolio_loss_inr: float
    exceeds_tolerance: bool
    top_loss_contributors: list[str]

class StressTestResult(BaseModel):
    scenarios: dict[str, ScenarioResult]
    worst_case_scenario: str
    worst_case_loss_pct: float
    stress_triggered_reduces: list[str]   # symbols

class Trade(BaseModel):
    symbol: str
    action: str               # "BUY" | "SELL"
    quantity: float
    estimated_value: float    # INR
    target_weight_after: float
    reason: str               # full audit trail
    signals_triggered: list[str]
    tax_impact: Optional[TaxImpact] = None
    priority: int             # 1=urgent 2=recommended 3=optional

class RebalancingReport(BaseModel):
    portfolio_id: str
    generated_at: datetime
    total_drift_score: float          # portfolio-level weighted avg abs(drift)
    trades: list[Trade]
    harvest_opportunities: list[HarvestOpportunity]
    factor_alerts: list[FactorAlert]
    stress_test_results: StressTestResult
    estimated_tax_savings: float
    estimated_cost_of_inaction: float
    ai_summary: str                   # 2-3 sentence plain English summary
    config_used: RebalancingConfig
