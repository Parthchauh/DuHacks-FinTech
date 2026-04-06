"""
OptiWealth Rebalancing Engine — Glide Path + Cash Floor
========================================================
Stage 8A: Glide Path equity caps by years_to_goal
Stage 8B: Cash Floor protection

Glide path caps:
  > 10 years → 90 % max equity
  7–10       → 75 %
  4–7        → 60 %
  2–4        → 45 %
  < 2        → 30 %
"""

from __future__ import annotations

import logging
from typing import List

from services.rebalancing.models import (
    DriftSignal,
    PortfolioContext,
    Position,
    Trade,
)

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════
# STAGE 8A: GLIDE PATH
# ═══════════════════════════════════════════════════════════════════════

_EQUITY_ASSET_CLASSES = {"equity", "stock", "etf"}


def _get_glide_cap(years: int) -> float:
    """Return maximum equity percentage for the given years to goal."""
    if years > 10:
        return 0.90
    if years >= 7:
        return 0.75
    if years >= 4:
        return 0.60
    if years >= 2:
        return 0.45
    return 0.30


def _is_equity_position(pos: Position) -> bool:
    """Check if position is classified as equity/stock/ETF."""
    return pos.asset_class.lower().strip() in _EQUITY_ASSET_CLASSES


def apply_glide_path(
    signals: List[DriftSignal],
    positions: List[Position],
    context: PortfolioContext,
) -> List[DriftSignal]:
    """Apply glide-path caps to equity allocation.

    If current equity % exceeds the cap for the years-to-goal:
      1. Sort equity positions by drift (most overweight first).
      2. Override HOLD/HOLD_STRONG/INCREASE → REDUCE until excess is covered.
      3. If years_to_goal < 1: override ALL equity HOLD signals to REDUCE.
      4. Tag affected signals with "glide_path_trigger": True.
    """
    if context.years_to_goal is None:
        return signals

    years = context.years_to_goal
    max_eq = _get_glide_cap(years)

    # Compute current equity percentage
    current_equity_pct = sum(
        pos.current_weight for pos in positions if _is_equity_position(pos)
    )

    if current_equity_pct <= max_eq:
        # If years_to_goal < 1, override ALL equity HOLDs even if under cap
        if years < 1:
            for sig in signals:
                pos = next((p for p in positions if p.symbol == sig.symbol), None)
                if pos and _is_equity_position(pos) and sig.action in ("HOLD", "HOLD_STRONG"):
                    sig.action = "REDUCE"
                    sig.signals["glide_path_trigger"] = True
                    sig.signals["years_to_goal"] = years
                    sig.reason += (
                        f" [Glide Path: <1 year to goal — forced REDUCE on all equity HOLDs]"
                    )
        return signals

    # ── Equity allocation exceeds cap ─────────────────────────────────
    excess_eq = current_equity_pct - max_eq
    logger.info(
        "Glide path: equity %.1f%% > cap %.1f%% (years=%d). Excess: %.1f%%",
        current_equity_pct * 100, max_eq * 100, years, excess_eq * 100,
    )

    # Collect equity signals and sort by drift (most overweight first)
    eq_signals = []
    for sig in signals:
        pos = next((p for p in positions if p.symbol == sig.symbol), None)
        if pos and _is_equity_position(pos):
            eq_signals.append((sig, pos))

    eq_signals.sort(key=lambda x: x[0].drift, reverse=True)

    reduced_amount = 0.0
    for sig, pos in eq_signals:
        if reduced_amount >= excess_eq:
            break

        # Do NOT override HOLD_STRONG if years_to_goal > 1
        if sig.action == "HOLD_STRONG" and years > 1:
            continue

        if sig.action in ("HOLD", "HOLD_STRONG", "INCREASE"):
            sig.action = "REDUCE"
            sig.signals["glide_path_trigger"] = True
            sig.signals["years_to_goal"] = years
            sig.reason += (
                f" [Glide Path override: Equity at {current_equity_pct * 100:.1f}%, "
                f"max is {max_eq * 100:.1f}%]"
            )
            overweight = max(0.0, pos.current_weight - pos.target_weight)
            reduced_amount += overweight

    # If years < 1: override ALL remaining equity HOLDs
    if years < 1:
        for sig in signals:
            pos = next((p for p in positions if p.symbol == sig.symbol), None)
            if pos and _is_equity_position(pos) and sig.action in ("HOLD", "HOLD_STRONG"):
                sig.action = "REDUCE"
                sig.signals["glide_path_trigger"] = True
                sig.signals["years_to_goal"] = years
                sig.reason += " [Glide Path: <1 year to goal — forced REDUCE]"

    return signals


# ═══════════════════════════════════════════════════════════════════════
# STAGE 8B: CASH FLOOR PROTECTION
# ═══════════════════════════════════════════════════════════════════════

def check_cash_floor(
    context: PortfolioContext,
    proposed_trades: List[Trade],
) -> List[Trade]:
    """Ensure projected cash never falls below cash_floor.

    projected_cash = cash_balance + sum(sell) - sum(buy)

    If below floor:
      1. Cancel BUY trades from lowest priority (highest number) first,
         then smallest value.
      2. If still below: generate a RAISE_CASH signal targeting most
         liquid positions with smallest loss.
    """
    if context.cash_floor <= 0:
        return proposed_trades

    current_cash = context.cash_balance
    sell_proceeds = sum(t.estimated_value for t in proposed_trades if t.action == "SELL")
    buy_costs = sum(t.estimated_value for t in proposed_trades if t.action == "BUY")

    net_cash_after = current_cash + sell_proceeds - buy_costs

    if net_cash_after >= context.cash_floor:
        return proposed_trades

    logger.info(
        "Cash floor breach: projected ₹%.0f < floor ₹%.0f. Cancelling BUYs.",
        net_cash_after, context.cash_floor,
    )

    # ── Cancel BUY trades: lowest priority first, then smallest value ─
    buys = [t for t in proposed_trades if t.action == "BUY"]
    # Sort: highest priority number first (least important), then smallest value
    buys.sort(key=lambda x: (-x.priority, x.estimated_value))

    for buy in buys:
        if net_cash_after >= context.cash_floor:
            break
        proposed_trades.remove(buy)
        net_cash_after += buy.estimated_value
        buy.signals_triggered.append("cash_floor_cancelled")
        logger.info("Cash floor: cancelled BUY %s (₹%.0f)", buy.symbol, buy.estimated_value)

    # ── If still below floor: generate RAISE_CASH signal ──────────────
    if net_cash_after < context.cash_floor:
        deficit = (context.cash_floor * 1.10) - net_cash_after  # 10 % buffer

        proposed_trades.append(
            Trade(
                symbol="RAISE_CASH",
                action="SELL",
                quantity=0,
                estimated_value=deficit,
                current_price=0.0,
                target_weight_after=0.0,
                reason=(
                    f"Mandatory cash raise to meet floor + 10%% buffer "
                    f"(Deficit: ₹{deficit:,.0f})."
                ),
                signals_triggered=["cash_floor_breach", "cash_floor_trigger"],
                priority=1,
                smallcase_order_config={},
            )
        )
        logger.warning("Cash floor: RAISE_CASH trade generated for ₹%.0f", deficit)

    return proposed_trades
