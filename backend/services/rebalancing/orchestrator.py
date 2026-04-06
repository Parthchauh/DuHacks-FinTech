"""
OptiWealth Rebalancing Engine — Orchestrator
===============================================
Stage 9: Master Pipeline — 18-step rebalancing workflow

Pipeline order:
  1. Load / validate positions + context
  2. Stage 1:  Drift Detection (detect_drift_with_signals)
  3. Stage 2:  Volatility Gate  (apply_volatility_gate)
  4. Stage 3:  Risk Parity      (compute_risk_parity_targets)
  5. Stage 4:  Tax Engine        (compute_tax_impact per signal)
  6. Stages 5-8 (parallel via asyncio.gather):
       5. Factor Exposure  (check_factor_exposures)
       6. ESG Filter        (apply_esg_filter)
       7. Stress Test        (run_stress_tests)
       8. Glide Path         (apply_glide_path)
  7. Generate trades from final signals
  8. Apply cash floor protection
  9. Compute cost-of-inaction
 10. Generate AI summary
 11. Build RebalancingReport
 12. Persist report (if not dry_run)
"""

from __future__ import annotations

import asyncio
import logging
import math
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from services.rebalancing.models import (
    DriftSignal,
    HarvestOpportunity,
    PortfolioContext,
    Position,
    RebalancingConfig,
    RebalancingReport,
    StressTestResult,
    TaxImpact,
    Trade,
)
from services.rebalancing.drift_signals import detect_drift_with_signals
from services.rebalancing.risk_engine import (
    apply_volatility_gate,
    compute_risk_parity_targets,
)
from services.rebalancing.tax_engine import (
    compute_tax_impact,
    find_harvest_opportunities,
)
from services.rebalancing.factor_esg import (
    apply_esg_filter,
    check_factor_exposures,
)
from services.rebalancing.scenario_engine import run_stress_tests
from services.rebalancing.glide_path import apply_glide_path, check_cash_floor

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════
# DB INTEGRATION HELPERS
# ═══════════════════════════════════════════════════════════════════════

def _load_portfolio_data(
    portfolio_id: str,
    db: Optional[Session],
) -> Tuple[List[Position], PortfolioContext]:
    """Load positions and context from the database.

    Reads from:
      - portfolios table (id, user_id)
      - holdings table   (ticker, quantity, avg_buy_price, target_allocation, asset_type)
      - users table      (risk_profile)
      - investment_goals  (years_to_goal)

    Falls back to empty portfolio if DB unavailable.
    """
    if db is None:
        logger.warning("No DB session provided. Returning empty portfolio data.")
        return [], PortfolioContext(portfolio_id=portfolio_id)

    try:
        from models import Portfolio, Holding, User, InvestmentGoal
        from services.groww_service import groww_data
        import asyncio

        portfolio_row = db.query(Portfolio).filter(
            Portfolio.id == int(portfolio_id)
        ).first()

        if not portfolio_row:
            logger.warning("Portfolio %s not found in DB.", portfolio_id)
            return [], PortfolioContext(portfolio_id=portfolio_id)

        user_row = db.query(User).filter(User.id == portfolio_row.user_id).first()
        holdings_rows = db.query(Holding).filter(Holding.portfolio_id == portfolio_row.id).all()

        if not holdings_rows:
            return [], PortfolioContext(
                portfolio_id=portfolio_id,
                user_id=str(portfolio_row.user_id),
            )

        # ── Fetch current prices via Groww API (batch LTP) ────────────
        ticker_symbols = [h.ticker for h in holdings_rows]
        try:
            # Use asyncio to call async groww_data from sync context
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    live_prices = pool.submit(
                        asyncio.run, groww_data.get_live_prices(ticker_symbols)
                    ).result()
            else:
                live_prices = asyncio.run(groww_data.get_live_prices(ticker_symbols))
        except Exception as exc:
            logger.warning("Live price fetch failed: %s — using avg_buy_price.", exc)
            live_prices = {}

        positions: List[Position] = []
        total_value = 0.0

        for h in holdings_rows:
            current_price = live_prices.get(h.ticker, h.avg_buy_price)

            pos_value = h.quantity * current_price
            total_value += pos_value

            # Map asset_type string to position-level asset_class
            asset_class_map = {
                "EQUITY": "equity", "ETF": "ETF", "MUTUAL_FUND": "ETF",
                "GOLD": "gold", "BOND": "bond", "CASH": "cash",
            }
            asset_class = asset_class_map.get(h.asset_type or "EQUITY", "equity")

            positions.append(Position(
                symbol=h.ticker,
                isin=None,
                quantity=float(h.quantity),
                avg_price=float(h.avg_buy_price),
                current_price=current_price,
                current_value=pos_value,
                current_weight=0.0,  # computed below
                target_weight=float(h.target_allocation or 0.0) / 100.0,
                sector=h.asset_type or "equity",
                asset_class=asset_class,
                market_cap_category="large",
            ))

        # Compute weights
        if total_value > 0:
            for p in positions:
                p.current_weight = p.current_value / total_value

        # ── Build context ─────────────────────────────────────────────
        risk_tolerance = "moderate"
        if user_row and user_row.risk_profile:
            risk_tolerance = user_row.risk_profile.value if hasattr(user_row.risk_profile, "value") else str(user_row.risk_profile)

        years_to_goal = 10
        try:
            goal = db.query(InvestmentGoal).filter(
                InvestmentGoal.user_id == portfolio_row.user_id
            ).first()
            if goal and goal.target_date:
                delta = (goal.target_date - datetime.utcnow()).days
                years_to_goal = max(0, int(delta / 365))
        except Exception:
            pass

        # Cash balance = any CASH-type holding
        cash_balance = sum(
            p.current_value for p in positions if p.asset_class == "cash"
        )

        context = PortfolioContext(
            user_id=str(portfolio_row.user_id),
            portfolio_id=portfolio_id,
            total_value=total_value,
            cash_balance=cash_balance if cash_balance > 0 else total_value * 0.05,
            cash_floor=total_value * 0.02,
            risk_tolerance=risk_tolerance,
            years_to_goal=years_to_goal,
            max_drawdown_tolerance={"conservative": 0.10, "moderate": 0.20, "aggressive": 0.30}.get(risk_tolerance, 0.20),
        )

        return positions, context

    except Exception as exc:
        logger.error("Failed to load portfolio data: %s", exc, exc_info=True)
        return [], PortfolioContext(portfolio_id=portfolio_id)


def _persist_report(
    report: RebalancingReport,
    db: Optional[Session],
) -> None:
    """Persist the rebalancing report to the rebalancing_log table."""
    if db is None:
        logger.info("Dry run or no DB — skipping persistence.")
        return

    try:
        from sqlalchemy import text
        db.execute(
            text("""
                INSERT INTO rebalancing_log 
                    (portfolio_id, triggered_by, total_drift_score, 
                     trades_count, estimated_tax, ai_summary, created_at)
                VALUES (:pid, :trigger, :drift, :trades, :tax, :summary, :ts)
            """),
            {
                "pid": report.portfolio_id,
                "trigger": report.triggered_by,
                "drift": report.total_drift_score,
                "trades": len(report.trades),
                "tax": report.estimated_tax_liability,
                "summary": report.ai_summary[:500] if report.ai_summary else "",
                "ts": report.generated_at.isoformat(),
            },
        )
        db.commit()
        logger.info("Rebalancing report persisted for portfolio %s.", report.portfolio_id)
    except Exception as exc:
        logger.warning("Failed to persist rebalancing report: %s", exc)
        try:
            db.rollback()
        except Exception:
            pass


# ═══════════════════════════════════════════════════════════════════════
# TRADE GENERATION
# ═══════════════════════════════════════════════════════════════════════

def _generate_trades(
    signals: List[DriftSignal],
    positions: List[Position],
    context: PortfolioContext,
    tax_impacts: Dict[str, TaxImpact],
    risk_parity_targets: Dict[str, float],
    config: RebalancingConfig,
) -> List[Trade]:
    """Convert post-pipeline signals into executable Trade objects.

    Rules:
      - REDUCE → SELL trade. Qty = floor(drift * total_value / price).
      - INCREASE → BUY trade. Qty = floor(drift * total_value / price).
      - HOLD / HOLD_STRONG → no trade.
      - Skip if estimated_value < min_trade_value (₹500).
      - Attach tax_impact to sell trades.
      - Include smallcase_order_config stub for broker routing.
    """
    trades: List[Trade] = []

    for sig in signals:
        if sig.action in ("HOLD", "HOLD_STRONG"):
            continue

        pos = next((p for p in positions if p.symbol == sig.symbol), None)
        if not pos or pos.current_price <= 0:
            continue

        abs_drift = abs(sig.drift)
        notional = abs_drift * context.total_value
        quantity = int(math.floor(notional / pos.current_price))

        if quantity <= 0:
            continue

        estimated_value = quantity * pos.current_price
        if estimated_value < config.min_trade_value:
            continue

        # Map signal action to trade action
        if sig.action in ("REDUCE", "REDUCE_RISK_PARITY"):
            action = "SELL"
            # Cap sell quantity at position quantity
            quantity = min(quantity, int(pos.quantity))
            estimated_value = quantity * pos.current_price
        else:
            action = "BUY"

        # Risk parity target adjustment
        rp_target = risk_parity_targets.get(sig.symbol, pos.target_weight)
        target_weight_after = rp_target

        # Signals triggered summary
        signals_triggered = []
        for k, v in sig.signals.items():
            if v is True or (isinstance(v, str) and v in ("BEARISH", "DOWNTREND_CONFIRMED", "WEAK", "SIGNIFICANT")):
                signals_triggered.append(k)

        # Smallcase order config stub
        sc_config = {
            "exchange": "NSE",
            "symbol": pos.symbol,
            "action": action,
            "quantity": quantity,
            "order_type": "MARKET",
            "product": "CNC",  # Cash and Carry (delivery)
        }

        trade = Trade(
            symbol=sig.symbol,
            action=action,
            quantity=quantity,
            estimated_value=estimated_value,
            current_price=pos.current_price,
            target_weight_after=target_weight_after,
            reason=sig.reason,
            signals_triggered=signals_triggered,
            tax_impact=tax_impacts.get(sig.symbol),
            priority=sig.priority,
            smallcase_order_config=sc_config,
        )
        trades.append(trade)

    # Sort: SELLs first (to free up cash), then BUYs. Within each, by priority.
    trades.sort(key=lambda t: (0 if t.action == "SELL" else 1, t.priority))
    return trades


# ═══════════════════════════════════════════════════════════════════════
# COST OF INACTION
# ═══════════════════════════════════════════════════════════════════════

def _compute_cost_of_inaction(
    signals: List[DriftSignal],
    positions: List[Position],
    context: PortfolioContext,
    stress_result: Optional[StressTestResult],
) -> float:
    """Estimate the cost of not rebalancing (annualized ₹).

    Cost components:
      1. Drift drag: sum(abs(drift) * current_value * 0.02)  — 2% expected underperformance per unit drift
      2. Stress exposure: worst-case loss × probability weight (10%)
      3. Tax drag from unmanaged gains growing
    """
    cost = 0.0

    # 1. Drift drag
    for sig in signals:
        pos = next((p for p in positions if p.symbol == sig.symbol), None)
        if pos:
            cost += abs(sig.drift) * pos.current_value * 0.02

    # 2. Stress exposure
    if stress_result and stress_result.worst_case_loss_inr > 0:
        cost += stress_result.worst_case_loss_inr * 0.10

    # 3. Basic opportunity cost (2% of excess drift holdings)
    total_excess = sum(
        max(0, p.current_weight - p.target_weight) * context.total_value
        for p in positions
    )
    cost += total_excess * 0.01

    return round(cost, 2)


# ═══════════════════════════════════════════════════════════════════════
# AI SUMMARY
# ═══════════════════════════════════════════════════════════════════════

async def _generate_ai_summary(
    trades: List[Trade],
    signals: List[DriftSignal],
    stress_result: Optional[StressTestResult],
    context: PortfolioContext,
    config: RebalancingConfig,
) -> str:
    """Generate a human-readable AI summary of the rebalancing recommendation.

    Uses the existing ai_service for OpenAI integration. Falls back to a
    structured rule-based summary if API is unavailable.
    """
    sell_trades = [t for t in trades if t.action == "SELL"]
    buy_trades = [t for t in trades if t.action == "BUY"]

    total_sell = sum(t.estimated_value for t in sell_trades)
    total_buy = sum(t.estimated_value for t in buy_trades)
    total_tax = sum((t.tax_impact.tax_liability if t.tax_impact else 0.0) for t in sell_trades)

    # ── Attempt AI summary ────────────────────────────────────────────
    try:
        from services.ai_service import analyze_portfolio_with_ai

        holdings_for_ai = [
            {
                "ticker": t.symbol,
                "actual_allocation": next(
                    (s.drift * 100 for s in signals if s.symbol == t.symbol), 0
                ),
                "profit_loss_percent": (
                    (t.current_price - next(
                        (p.avg_price for s in signals for p in [] if s.symbol == t.symbol), t.current_price
                    )) / t.current_price * 100 if t.current_price > 0 else 0
                ),
            }
            for t in trades
        ]

        metrics_for_ai = {
            "total_value": context.total_value,
            "total_return_percent": 0.0,
            "risk_score": {"conservative": 3, "moderate": 5, "aggressive": 8}.get(context.risk_tolerance, 5),
            "sharpe_ratio": 1.0,
        }

        result = await analyze_portfolio_with_ai(holdings_for_ai, metrics_for_ai)
        ai_summary_text = result.get("summary", "")
        if ai_summary_text:
            return ai_summary_text
    except Exception as exc:
        logger.debug("AI summary generation failed: %s. Using rule-based.", exc)

    # ── Rule-based fallback ───────────────────────────────────────────
    lines = []
    lines.append(f"**Rebalancing Analysis** for portfolio worth ₹{context.total_value:,.0f}.")

    if not trades:
        lines.append("Your portfolio is well-balanced. No trades recommended at this time.")
        return " ".join(lines)

    lines.append(
        f"**{len(trades)} trade(s)** recommended: "
        f"{len(sell_trades)} sell (₹{total_sell:,.0f}), "
        f"{len(buy_trades)} buy (₹{total_buy:,.0f})."
    )

    if total_tax > 0:
        lines.append(f"Estimated tax impact: ₹{total_tax:,.0f}.")

    # Highlight urgent trades
    urgent = [t for t in trades if t.priority == 1]
    if urgent:
        urgent_syms = ", ".join(t.symbol for t in urgent)
        lines.append(f"**Urgent actions**: {urgent_syms} (high volatility or stress-triggered).")

    # Stress warning
    if stress_result and stress_result.worst_case_loss_pct < -0.15:
        lines.append(
            f"⚠️ Stress test warning: {stress_result.worst_case_scenario} scenario "
            f"projects {abs(stress_result.worst_case_loss_pct) * 100:.1f}% loss "
            f"(₹{stress_result.worst_case_loss_inr:,.0f})."
        )

    return " ".join(lines)


# ═══════════════════════════════════════════════════════════════════════
# MASTER ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════

async def execute_smart_rebalancing_pipeline(
    portfolio_id: str,
    db: Optional[Session] = None,
    triggered_by: str = "manual",
    positions_mock: Optional[List[Position]] = None,
    context_mock: Optional[PortfolioContext] = None,
    config_mock: Optional[RebalancingConfig] = None,
    dry_run: bool = False,
) -> RebalancingReport:
    """Execute the full 9-stage smart rebalancing pipeline.

    Args:
        portfolio_id: Unique portfolio identifier.
        db: SQLAlchemy Session (None for testing).
        triggered_by: "manual" | "scheduled" | "drift_alert".
        positions_mock: Override positions (for testing / API preview).
        context_mock: Override context (for testing / API preview).
        config_mock: Override config (for testing / API preview).
        dry_run: If True, do NOT persist to DB.

    Returns:
        RebalancingReport with all trades, alerts, and AI summary.
    """
    started = datetime.utcnow()
    logger.info("═══ Rebalancing Pipeline START [%s] ═══", portfolio_id)

    # ── Step 1: Load data ─────────────────────────────────────────────
    if positions_mock is not None and context_mock is not None:
        positions = positions_mock
        context = context_mock
    else:
        positions, context = _load_portfolio_data(portfolio_id, db)

    config = config_mock or context.config or RebalancingConfig()

    if not positions:
        logger.warning("No positions found for portfolio %s. Returning empty report.", portfolio_id)
        return RebalancingReport(
            portfolio_id=portfolio_id,
            generated_at=started,
            triggered_by=triggered_by,
            ai_summary="No holdings found in this portfolio. Add holdings to enable rebalancing.",
            config_used=config,
        )

    context.portfolio_id = portfolio_id
    context.total_value = context.total_value or sum(p.current_value for p in positions)
    logger.info("Step 1: Loaded %d positions. Total value: ₹%.0f", len(positions), context.total_value)

    # ── Step 2: Stage 1 — Drift Detection ─────────────────────────────
    logger.info("Step 2: Running drift detection...")
    signals = detect_drift_with_signals(positions, context)
    total_drift = sum(abs(s.drift) * next(
        (p.current_weight for p in positions if p.symbol == s.symbol), 0
    ) for s in signals)
    logger.info("Step 2: %d signals generated. Portfolio drift: %.4f", len(signals), total_drift)

    # ── Step 3: Stage 2 — Volatility Gate ─────────────────────────────
    logger.info("Step 3: Applying volatility gate...")
    signals = apply_volatility_gate(signals, positions, config)

    # ── Step 4: Stage 3 — Risk Parity ─────────────────────────────────
    logger.info("Step 4: Computing risk parity targets...")
    risk_parity_targets = compute_risk_parity_targets(positions)

    # Inject risk-parity-driven REDUCE for assets significantly over RP target
    for sig in signals:
        rp_target = risk_parity_targets.get(sig.symbol, sig.drift + next(
            (p.target_weight for p in positions if p.symbol == sig.symbol), 0
        ))
        pos = next((p for p in positions if p.symbol == sig.symbol), None)
        if pos and pos.current_weight > rp_target * 1.15 and sig.action == "HOLD":
            sig.action = "REDUCE_RISK_PARITY"
            sig.signals["risk_parity_triggered"] = True
            sig.reason += f" [Risk parity: weight {pos.current_weight:.2%} > RP target {rp_target:.2%}]"

    # ── Step 5: Stage 4 — Tax Engine ──────────────────────────────────
    logger.info("Step 5: Computing tax impacts...")
    tax_impacts: Dict[str, TaxImpact] = {}
    for sig in signals:
        if sig.action in ("REDUCE", "REDUCE_RISK_PARITY"):
            pos = next((p for p in positions if p.symbol == sig.symbol), None)
            if pos:
                purchase_date = date.today() - timedelta(days=200)
                impact = compute_tax_impact(sig, pos, context, purchase_date)
                tax_impacts[sig.symbol] = impact

    # ── Steps 6-9: Stages 5-8 (parallel) ─────────────────────────────
    logger.info("Steps 6-9: Running factor/ESG/stress/glide stages in parallel...")

    async def _run_factor():
        return check_factor_exposures(positions, context)

    async def _run_esg():
        return apply_esg_filter(signals, positions, context)

    async def _run_stress():
        return run_stress_tests(positions, context)

    async def _run_glide():
        return apply_glide_path(signals, positions, context)

    factor_alerts, _, stress_result, _ = await asyncio.gather(
        _run_factor(),
        _run_esg(),
        _run_stress(),
        _run_glide(),
    )

    # Apply stress-triggered REDUCE overrides
    if stress_result and stress_result.stress_triggered_reduces:
        for sym in stress_result.stress_triggered_reduces:
            sig = next((s for s in signals if s.symbol == sym), None)
            if sig and sig.action in ("HOLD", "HOLD_STRONG"):
                sig.action = "REDUCE"
                sig.priority = min(sig.priority, 2)
                sig.signals["stress_triggered"] = True
                sig.reason += f" [Stress test: {stress_result.worst_case_scenario} breach]"

    # ── Step 10: Generate Trades ──────────────────────────────────────
    logger.info("Step 10: Generating trades...")
    trades = _generate_trades(signals, positions, context, tax_impacts, risk_parity_targets, config)

    # ── Step 11: Harvest Opportunities ────────────────────────────────
    logger.info("Step 11: Finding harvest opportunities...")
    harvest_ops = find_harvest_opportunities(positions, [])

    # ── Step 12: Cash Floor Protection ────────────────────────────────
    logger.info("Step 12: Checking cash floor...")
    trades = check_cash_floor(context, trades)

    # ── Step 13: Cost of Inaction ─────────────────────────────────────
    cost_inaction = _compute_cost_of_inaction(signals, positions, context, stress_result)

    # ── Step 14: AI Summary ───────────────────────────────────────────
    logger.info("Step 14: Generating AI summary...")
    ai_summary = await _generate_ai_summary(trades, signals, stress_result, context, config)

    # ── Step 15: Build Report ─────────────────────────────────────────
    total_tax_liability = sum(
        (t.tax_impact.tax_liability if t.tax_impact else 0.0) for t in trades if t.action == "SELL"
    )
    total_tax_savings = sum(h.tax_saving_estimate for h in harvest_ops)

    report = RebalancingReport(
        portfolio_id=portfolio_id,
        generated_at=started,
        triggered_by=triggered_by,
        total_portfolio_value=context.total_value,
        total_drift_score=total_drift,
        trades=trades,
        trades_buy_count=sum(1 for t in trades if t.action == "BUY"),
        trades_sell_count=sum(1 for t in trades if t.action == "SELL"),
        estimated_tax_liability=total_tax_liability,
        estimated_tax_savings=total_tax_savings,
        harvest_opportunities=harvest_ops,
        factor_alerts=factor_alerts,
        stress_test=stress_result,
        stress_test_results=stress_result,
        ai_summary=ai_summary,
        cost_of_inaction=cost_inaction,
        config_used=config,
    )

    # ── Step 16: Persist ──────────────────────────────────────────────
    if not dry_run:
        _persist_report(report, db)
    else:
        logger.info("Dry run — report not persisted.")

    elapsed = (datetime.utcnow() - started).total_seconds()
    logger.info(
        "═══ Rebalancing Pipeline DONE [%s] ═══ %d trades, %.2fs elapsed",
        portfolio_id, len(trades), elapsed,
    )

    return report
