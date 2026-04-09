from __future__ import annotations

import math
from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Sequence

from pydantic import BaseModel, Field, validator


class MarketCapCategory(str, Enum):
    """Indian equity market-cap bucket used for volatility thresholds."""

    LARGE = "large"
    MID = "mid"
    SMALL = "small"


class DriftDirection(str, Enum):
    """Drift direction relative to target allocation."""

    OVERWEIGHT = "overweight"
    UNDERWEIGHT = "underweight"


class DriftAction(str, Enum):
    """High-level recommendation produced by drift + signal matrix."""

    REDUCE = "REDUCE"
    INCREASE = "INCREASE"
    HOLD = "HOLD"
    HOLD_STRONG = "HOLD_STRONG"
    REDUCE_RISK_PARITY = "REDUCE_RISK_PARITY"
    RAISE_CASH = "RAISE_CASH"


class EmaSignal(str, Enum):
    """EMA regime classification (50/100) based on current price."""

    BEARISH = "BEARISH"
    BULLISH = "BULLISH"
    NEUTRAL = "NEUTRAL"


class AdxSignal(str, Enum):
    """Trend regime classification using ADX + DMI."""

    DOWNTREND_CONFIRMED = "DOWNTREND_CONFIRMED"
    UPTREND_CONFIRMED = "UPTREND_CONFIRMED"
    RANGING = "RANGING"


class RelativeStrengthSignal(str, Enum):
    """Relative strength classification vs NIFTY 50 (30D return ratio)."""

    WEAK = "WEAK"
    STRONG = "STRONG"
    NEUTRAL = "NEUTRAL"


class DrawdownSignal(str, Enum):
    """Drawdown classification vs 60D rolling high."""

    SIGNIFICANT = "SIGNIFICANT"
    NORMAL = "NORMAL"


class GainType(str, Enum):
    """Indian capital gains classification for equities."""

    STCG = "STCG"
    LTCG = "LTCG"
    LOSS = "LOSS"
    NONE = "NONE"


class TradeAction(str, Enum):
    """Trade side."""

    BUY = "BUY"
    SELL = "SELL"


class TriggeredBy(str, Enum):
    """Rebalancing run trigger."""

    MANUAL = "manual"
    SCHEDULED = "scheduled"
    DRIFT_ALERT = "drift_alert"
    API_PREVIEW = "api_preview"


class Position(BaseModel):
    """
    Live position snapshot used by the rebalancing engine.

    All weights are fractions (0.0–1.0). All money amounts are in INR (₹).
    """

    symbol: str = Field(..., min_length=1, description="Internal symbol, typically NSE ticker without suffix.")
    isin: str = Field("", description="ISIN if available.")
    name: Optional[str] = Field(None, description="Human-friendly instrument name if available.")

    quantity: float = Field(..., ge=0.0)
    avg_price: float = Field(..., ge=0.0)
    current_price: float = Field(..., ge=0.0)

    current_weight: float = Field(..., ge=0.0, le=1.0)
    target_weight: float = Field(..., ge=0.0, le=1.0)

    sector: str = Field("Unknown", description="NSE sector classification or equivalent.")
    asset_class: str = Field("equity", description='e.g. "equity", "stock", "ETF", "cash".')
    market_cap_category: MarketCapCategory = Field(MarketCapCategory.MID)

    @property
    def current_value(self) -> float:
        """Return current market value (₹) for this position."""

        return float(self.quantity * self.current_price)

    @property
    def drift(self) -> float:
        """Return drift as current_weight - target_weight."""

        return float(self.current_weight - self.target_weight)

    class Config:
        use_enum_values = True


class RebalancingConfig(BaseModel):
    """User-configurable thresholds used across the pipeline."""

    drift_threshold: float = Field(0.03, ge=0.0, le=0.25)
    adx_threshold: int = Field(25, ge=5, le=80)
    rs_weak_bound: float = Field(0.85, ge=0.0, le=5.0)
    rs_strong_bound: float = Field(1.15, ge=0.0, le=5.0)
    drawdown_threshold: float = Field(0.15, ge=0.0, le=0.95)

    vol_threshold_large: float = Field(0.30, ge=0.0, le=2.0)
    vol_threshold_mid: float = Field(0.45, ge=0.0, le=2.0)
    vol_threshold_small: float = Field(0.60, ge=0.0, le=2.0)

    min_trade_value: float = Field(500.0, ge=0.0)
    cooldown_minutes: int = Field(15, ge=0, le=1440)

    def get_vol_threshold(self, market_cap_category: str | MarketCapCategory) -> float:
        """Return the applicable volatility threshold for a market-cap bucket."""

        cat = market_cap_category.value if isinstance(market_cap_category, MarketCapCategory) else str(market_cap_category).lower()
        return {
            MarketCapCategory.LARGE.value: float(self.vol_threshold_large),
            MarketCapCategory.MID.value: float(self.vol_threshold_mid),
            MarketCapCategory.SMALL.value: float(self.vol_threshold_small),
        }.get(cat, float(self.vol_threshold_mid))


class PortfolioContext(BaseModel):
    """Context for a portfolio rebalancing run."""

    user_id: str = Field("", description="User identifier (string to support int/uuid without coupling).")
    portfolio_id: Optional[str] = Field(None, description="Portfolio identifier if available.")

    total_value: float = Field(0.0, ge=0.0, description="Total portfolio value (₹), including invested + cash.")
    cash_balance: float = Field(0.0, ge=0.0, description="Available cash (₹).")
    cash_floor: float = Field(0.0, ge=0.0, description="Minimum cash to retain (₹).")

    risk_tolerance: Literal["conservative", "moderate", "aggressive"] = "moderate"
    goal_type: Literal["retirement", "wealth_creation", "income", "other"] = "wealth_creation"
    goal_horizon_years: int = Field(10, ge=0, le=60)
    years_to_goal: int = Field(10, ge=0, le=60)

    esg_exclusions: List[str] = Field(default_factory=list)
    factor_limits: Dict[str, float] = Field(default_factory=dict)
    max_drawdown_tolerance: float = Field(0.20, ge=0.0, le=1.0)

    tax_bracket: str = Field("30%", description='Display-only; core engine uses fixed STCG/LTCG rules for equities.')
    config: RebalancingConfig = Field(default_factory=RebalancingConfig)


class DriftSignal(BaseModel):
    """Single-asset drift signal enriched with technical and risk signals."""

    symbol: str
    drift: float
    drift_pct: float = Field(0.0, description="drift * 100, rounded to 2 decimals")
    direction: DriftDirection
    action: DriftAction
    signals: Dict[str, Any] = Field(default_factory=dict)
    reason: str = ""
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    priority: int = Field(3, ge=1, le=3)

    @validator("drift_pct", always=True)
    def _compute_drift_pct(cls, v: float, values: Dict[str, Any]) -> float:
        drift = float(values.get("drift", 0.0))
        return float(round(drift * 100.0, 2))

    @validator("priority", always=True)
    def _default_priority(cls, v: int, values: Dict[str, Any]) -> int:
        # Backward compatible: if not provided, infer from confidence.
        if isinstance(v, int) and 1 <= v <= 3:
            return v
        conf = float(values.get("confidence", 0.0))
        if conf > 0.75:
            return 1
        if conf > 0.5:
            return 2
        return 3

    class Config:
        use_enum_values = True


class TaxImpact(BaseModel):
    """Per-trade estimated tax impact (Indian equity conventions)."""

    symbol: str
    holding_period_days: int = Field(0, ge=0)
    gain_type: GainType = GainType.NONE
    gross_gain: float = 0.0
    tax_liability: float = 0.0
    stt_cost: float = 0.0
    net_benefit: float = 0.0
    harvest_eligible: bool = False
    action_confirmed: bool = True

    class Config:
        use_enum_values = True


class HarvestOpportunity(BaseModel):
    """Tax-loss harvesting candidate with replacement suggestion."""

    symbol: str
    unrealized_loss: float = Field(..., ge=0.0, description="Absolute unrealized loss (₹).")
    tax_saving_estimate: float = Field(..., ge=0.0, description="Estimated tax saving (₹).")
    replacement_symbol: str
    wash_sale_safe: bool
    liquidity_score: float = Field(..., ge=0.0)
    reason: str

    # Backward-compat fields used by prototype router/service (will be removed when downstream updated)
    isin: Optional[str] = None
    loss_pct: Optional[float] = None
    suggested_replacement: Optional[str] = None
    estimated_tax_saving: Optional[float] = None
    wash_sale_window_end: Optional[date] = None


class FactorAlert(BaseModel):
    """Portfolio-level factor exposure breach alert."""

    factor: str
    current_exposure: float
    limit: float
    breach_pct: float
    top_contributors: List[str]
    recommendation: str


class ScenarioLossContributor(BaseModel):
    """Per-position contribution to scenario loss."""

    symbol: str
    loss_inr: float
    loss_pct: float


class ScenarioResult(BaseModel):
    """Stress scenario result at portfolio level."""

    loss_inr: float
    loss_pct: float
    breaches_tolerance: bool
    top_loss_contributors: List[ScenarioLossContributor]


class StressTestResult(BaseModel):
    """Aggregate stress test results across scenarios."""

    scenarios: Dict[str, ScenarioResult]
    worst_case_scenario: str
    worst_case_loss_inr: float
    worst_case_loss_pct: float


class Trade(BaseModel):
    """Executable trade instruction with full audit trail."""

    id: Optional[str] = Field(None, description="Optional identifier for selection/execution.")
    symbol: str
    action: TradeAction
    quantity: int = Field(..., ge=0)
    estimated_value: float = Field(..., ge=0.0, description="Estimated INR value.")
    current_price: float = Field(..., ge=0.0)
    target_weight_after: float = Field(..., ge=0.0, le=1.0)
    reason: str
    signals_triggered: List[str] = Field(default_factory=list)
    tax_impact: Optional[TaxImpact] = None
    priority: int = Field(3, ge=1, le=3)
    smallcase_order_config: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        use_enum_values = True


class RebalancingReport(BaseModel):
    """Full output of the smart rebalancing pipeline."""

    portfolio_id: str
    generated_at: datetime
    triggered_by: TriggeredBy = TriggeredBy.MANUAL

    total_portfolio_value: float = Field(..., ge=0.0)
    total_drift_score: float = Field(..., ge=0.0)

    trades: List[Trade] = Field(default_factory=list)
    trades_buy_count: int = 0
    trades_sell_count: int = 0

    estimated_tax_liability: float = 0.0
    estimated_tax_savings: float = 0.0

    harvest_opportunities: List[HarvestOpportunity] = Field(default_factory=list)
    factor_alerts: List[FactorAlert] = Field(default_factory=list)
    stress_test: StressTestResult

    ai_summary: str
    cost_of_inaction: float = 0.0
    config_used: RebalancingConfig = Field(default_factory=RebalancingConfig)

    # Backward-compat for existing router/service naming (will be removed when downstream updated)
    stress_test_results: Optional[StressTestResult] = None
    estimated_cost_of_inaction: Optional[float] = None

    @validator("trades_buy_count", always=True)
    def _calc_buy_count(cls, v: int, values: Dict[str, Any]) -> int:
        trades: Sequence[Trade] = values.get("trades") or []
        return int(sum(1 for t in trades if t.action == TradeAction.BUY.value or t.action == TradeAction.BUY))

    @validator("trades_sell_count", always=True)
    def _calc_sell_count(cls, v: int, values: Dict[str, Any]) -> int:
        trades: Sequence[Trade] = values.get("trades") or []
        return int(sum(1 for t in trades if t.action == TradeAction.SELL.value or t.action == TradeAction.SELL))

    @validator("stress_test_results", always=True)
    def _mirror_stress_field(cls, v: Optional[StressTestResult], values: Dict[str, Any]) -> Optional[StressTestResult]:
        # Prototype uses "stress_test_results"; canonical is "stress_test"
        return v or values.get("stress_test")

    @validator("estimated_cost_of_inaction", always=True)
    def _mirror_cost_field(cls, v: Optional[float], values: Dict[str, Any]) -> Optional[float]:
        return v if v is not None else values.get("cost_of_inaction")


def compute_cost_of_inaction(
    total_value: float, total_drift_score: float, portfolio_vol: float
) -> float:
    """
    Compute risk-adjusted INR cost of not rebalancing.

    Formula: (weighted_avg_drift² * portfolio_vol * total_value)
    where weighted_avg_drift is the portfolio-level drift score (0–1).
    """

    if total_value < 0:
        raise ValueError("total_value must be non-negative for cost_of_inaction computation.")
    if not (0.0 <= total_drift_score <= 1.0):
        raise ValueError("total_drift_score must be between 0.0 and 1.0 (fraction).")
    if portfolio_vol < 0:
        raise ValueError("portfolio_vol must be non-negative (annualized).")
    return float((total_drift_score ** 2) * portfolio_vol * total_value)


def compute_total_drift_score(positions: Sequence[Position]) -> float:
    """
    Compute portfolio-level weighted average absolute drift.

    Uses current weights as weights: sum(|drift_i| * current_weight_i).
    """

    if not positions:
        return 0.0
    score = 0.0
    for p in positions:
        score += abs(float(p.current_weight - p.target_weight)) * float(p.current_weight)
    # Keep within [0,1] by construction; still guard against tiny float overshoots.
    return float(min(max(score, 0.0), 1.0))


def annualized_vol_from_daily_returns(daily_returns: Sequence[float]) -> float:
    """
    Compute realized annualized volatility from a sequence of daily returns.

    Uses population std (ddof=0) consistent with many realized-vol implementations.
    """

    rets = [float(r) for r in daily_returns if r is not None and not math.isnan(float(r))]
    if len(rets) < 2:
        raise ValueError("Need at least 2 daily returns to compute volatility.")
    mean = sum(rets) / len(rets)
    var = sum((r - mean) ** 2 for r in rets) / len(rets)
    return float(math.sqrt(var) * math.sqrt(252.0))
