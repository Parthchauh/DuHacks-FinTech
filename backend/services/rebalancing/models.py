"""
OptiWealth Rebalancing Engine — Models
=======================================
Pydantic models and enums for the 9-stage CFA-grade rebalancing pipeline.

All Indian market conventions:
  - Currency: INR (₹)
  - Tax: STCG 20 %, LTCG 12.5 % above ₹1.25 L exemption, STT 0.1 % sell-side
  - Exchange: NSE primary, BSE secondary
  - Benchmark: NIFTY 50 (^NSEI via yfinance)
"""

from __future__ import annotations

import enum
from datetime import datetime, date
from typing import Dict, List, Optional, Union

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════
# SIGNAL ENUMS (used by drift_signals.py)
# ═══════════════════════════════════════════════════════════════════════

class EmaSignal(str, enum.Enum):
    """EMA(50)/EMA(100) trend classification."""
    BEARISH = "BEARISH"
    BULLISH = "BULLISH"
    NEUTRAL = "NEUTRAL"


class AdxSignal(str, enum.Enum):
    """ADX + Directional Movement (14-period) classification."""
    DOWNTREND_CONFIRMED = "DOWNTREND_CONFIRMED"
    UPTREND_CONFIRMED = "UPTREND_CONFIRMED"
    RANGING = "RANGING"


class RelativeStrengthSignal(str, enum.Enum):
    """30-day relative strength vs NIFTY 50."""
    WEAK = "WEAK"
    STRONG = "STRONG"
    NEUTRAL = "NEUTRAL"


class DrawdownSignal(str, enum.Enum):
    """60-day drawdown classification."""
    SIGNIFICANT = "SIGNIFICANT"   # drawdown < -15 %
    NORMAL = "NORMAL"


class DriftDirection(str, enum.Enum):
    """Whether positional weight exceeds or falls short of target."""
    OVERWEIGHT = "overweight"
    UNDERWEIGHT = "underweight"


class DriftAction(str, enum.Enum):
    """Action determined by the decision matrix."""
    REDUCE = "REDUCE"
    INCREASE = "INCREASE"
    HOLD = "HOLD"
    HOLD_STRONG = "HOLD_STRONG"
    REDUCE_RISK_PARITY = "REDUCE_RISK_PARITY"


# ═══════════════════════════════════════════════════════════════════════
# POSITION & CONTEXT
# ═══════════════════════════════════════════════════════════════════════

class Position(BaseModel):
    """Single holding inside a portfolio."""
    symbol: str
    isin: Optional[str] = None
    quantity: float
    avg_price: float
    current_price: float
    current_value: float = 0.0
    current_weight: float
    target_weight: float
    sector: str
    asset_class: str = "equity"          # equity | ETF | bond | cash | gold
    market_cap_category: str = "small"   # large | mid | small

    def model_post_init(self, __context: object) -> None:
        """Compute current_value if caller omitted it."""
        if self.current_value == 0.0 and self.quantity > 0 and self.current_price > 0:
            object.__setattr__(self, "current_value", self.quantity * self.current_price)


class RebalancingConfig(BaseModel):
    """User-specific rebalancing thresholds (persisted in rebalancing_config table)."""
    drift_threshold: float = 0.03
    adx_threshold: int = 25
    rs_weak_bound: float = 0.85
    rs_strong_bound: float = 1.15
    drawdown_threshold: float = 0.15
    vol_threshold_large: float = 0.30
    vol_threshold_mid: float = 0.45
    vol_threshold_small: float = 0.60
    min_trade_value: float = 500.0       # ₹500
    cooldown_minutes: int = 15

    def get_vol_threshold(self, market_cap_category: str) -> float:
        """Return volatility threshold for a given market-cap bucket."""
        mapping = {
            "large": self.vol_threshold_large,
            "mid": self.vol_threshold_mid,
            "small": self.vol_threshold_small,
        }
        return mapping.get(market_cap_category, self.vol_threshold_small)


class PortfolioContext(BaseModel):
    """Runtime context passed through all pipeline stages."""
    user_id: str = ""
    portfolio_id: str = ""
    total_value: float = 0.0
    cash_balance: float = 0.0
    cash_floor: float = 1000.0
    risk_tolerance: str = "moderate"     # conservative | moderate | aggressive
    goal_horizon_years: int = 10
    years_to_goal: int = 10
    esg_exclusions: List[str] = Field(default_factory=list)
    factor_limits: Dict[str, float] = Field(
        default_factory=lambda: {
            "momentum": 0.50,
            "growth": 0.50,
            "value": 0.50,
            "quality": 0.50,
        }
    )
    max_drawdown_tolerance: float = 0.20
    config: RebalancingConfig = Field(default_factory=RebalancingConfig)


# ═══════════════════════════════════════════════════════════════════════
# DRIFT SIGNAL
# ═══════════════════════════════════════════════════════════════════════

class DriftSignal(BaseModel):
    """Output of Stage 1 (drift detection) enriched through subsequent stages."""
    symbol: str
    drift: float
    drift_pct: float = 0.0               # drift * 100, rounded to 2 dp
    direction: Union[DriftDirection, str] = DriftDirection.OVERWEIGHT
    action: Union[DriftAction, str] = DriftAction.HOLD
    signals: Dict[str, Union[str, bool, float]] = Field(default_factory=dict)
    reason: str = ""
    confidence: float = 0.0              # 0.0–1.0
    priority: int = 3                    # 1=urgent, 2=recommended, 3=optional

    class Config:
        use_enum_values = True

    def model_post_init(self, __context: object) -> None:
        """Auto-compute drift_pct if not set."""
        if self.drift_pct == 0.0 and self.drift != 0.0:
            object.__setattr__(self, "drift_pct", round(self.drift * 100.0, 2))


# ═══════════════════════════════════════════════════════════════════════
# TAX MODELS
# ═══════════════════════════════════════════════════════════════════════

class TaxImpact(BaseModel):
    """Tax implications of a proposed sell trade."""
    symbol: str
    quantity_to_sell: float = 0.0
    gross_gain: float = 0.0
    is_long_term: bool = False
    holding_period_days: int = 0
    gain_type: str = "NONE"              # STCG | LTCG | LOSS | NONE
    tax_liability: float = 0.0
    stt_cost: float = 0.0
    net_benefit: float = 0.0
    harvest_eligible: bool = False
    action_confirmed: bool = True


class HarvestOpportunity(BaseModel):
    """Tax-loss harvest candidate."""
    symbol: str
    isin: Optional[str] = None
    unrealized_loss: float               # ₹ absolute
    tax_saving_estimate: float           # ₹
    replacement_symbol: str
    wash_sale_safe: bool                 # no same-ISIN purchase within 30 days
    liquidity_score: float = 0.0
    loss_pct: float = 0.0
    reason: str = ""
    wash_sale_window_end: Optional[date] = None
    suggested_replacement: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════
# FACTOR & ESG
# ═══════════════════════════════════════════════════════════════════════

class FactorAlert(BaseModel):
    """Alert when portfolio factor exposure breaches limits."""
    factor: str                            # momentum | value | growth | quality
    current_exposure: float = 0.0
    current_score: float = 0.0             # alias for backward compat
    limit: float = 0.0
    breach_pct: float = 0.0                # how much over limit (ratio)
    top_contributors: List[str] = Field(default_factory=list)
    recommendation: str = ""
    suggested_reduction_pct: float = 0.0   # backward compat


# ═══════════════════════════════════════════════════════════════════════
# STRESS TEST
# ═══════════════════════════════════════════════════════════════════════

class ScenarioResult(BaseModel):
    """Impact of a single historical stress scenario on the portfolio."""
    scenario_name: str = ""
    loss_inr: float = 0.0
    loss_pct: float = 0.0
    portfolio_loss_pct: float = 0.0       # alias kept for backward compat
    portfolio_loss_inr: float = 0.0       # alias kept for backward compat
    breaches_tolerance: bool = False
    exceeds_tolerance: bool = False       # alias kept for backward compat
    top_loss_contributors: Union[
        List[Dict[str, Union[str, float]]],
        List[str],
    ] = Field(default_factory=list)

    def model_post_init(self, __context: object) -> None:
        """Sync alias fields."""
        if self.loss_inr == 0.0 and self.portfolio_loss_inr != 0.0:
            object.__setattr__(self, "loss_inr", self.portfolio_loss_inr)
        if self.loss_pct == 0.0 and self.portfolio_loss_pct != 0.0:
            object.__setattr__(self, "loss_pct", self.portfolio_loss_pct)
        if not self.breaches_tolerance and self.exceeds_tolerance:
            object.__setattr__(self, "breaches_tolerance", self.exceeds_tolerance)


class StressTestResult(BaseModel):
    """Full stress-test report across all scenarios."""
    scenarios: Dict[str, ScenarioResult] = Field(default_factory=dict)
    worst_case_scenario: str = ""
    worst_case_loss_inr: float = 0.0
    worst_case_loss_pct: float = 0.0
    stress_triggered_reduces: List[str] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════
# TRADE
# ═══════════════════════════════════════════════════════════════════════

class Trade(BaseModel):
    """Executable trade generated by the engine."""
    symbol: str
    action: str                            # BUY | SELL
    quantity: int = 0
    estimated_value: float = 0.0           # ₹
    current_price: float = 0.0
    target_weight_after: float = 0.0
    reason: str = ""
    signals_triggered: List[str] = Field(default_factory=list)
    tax_impact: Optional[TaxImpact] = None
    priority: int = 3                      # 1=urgent, 2=recommended, 3=optional
    smallcase_order_config: Dict = Field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════
# REBALANCING REPORT
# ═══════════════════════════════════════════════════════════════════════

class RebalancingReport(BaseModel):
    """Final output of the 9-stage rebalancing pipeline."""
    portfolio_id: str = ""
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    triggered_by: str = "manual"           # manual | scheduled | drift_alert
    total_portfolio_value: float = 0.0
    total_drift_score: float = 0.0         # portfolio-level weighted avg abs drift
    trades: List[Trade] = Field(default_factory=list)
    trades_buy_count: int = 0
    trades_sell_count: int = 0
    estimated_tax_liability: float = 0.0
    estimated_tax_savings: float = 0.0     # from harvest opportunities
    harvest_opportunities: List[HarvestOpportunity] = Field(default_factory=list)
    factor_alerts: List[FactorAlert] = Field(default_factory=list)
    stress_test: Optional[StressTestResult] = None
    stress_test_results: Optional[StressTestResult] = None  # alias for compat
    ai_summary: str = ""
    cost_of_inaction: float = 0.0
    config_used: Optional[RebalancingConfig] = None

    def model_post_init(self, __context: object) -> None:
        """Sync alias fields and compute counts."""
        if self.stress_test is None and self.stress_test_results is not None:
            object.__setattr__(self, "stress_test", self.stress_test_results)
        if self.trades_buy_count == 0 and self.trades_sell_count == 0 and self.trades:
            object.__setattr__(
                self,
                "trades_buy_count",
                sum(1 for t in self.trades if t.action == "BUY"),
            )
            object.__setattr__(
                self,
                "trades_sell_count",
                sum(1 for t in self.trades if t.action == "SELL"),
            )
