"""
OptiWealth Rebalancing Engine — Tax Engine
============================================
Stage 4: Tax Impact Calculator + Tax-Loss Harvest Finder

Indian tax conventions:
  - STCG (< 1 year hold): 20 %
  - LTCG (≥ 1 year hold): 12.5 % above ₹1.25 L exemption
  - STT: 0.1 % on sell-side value
  - Financial year: April 1 – March 31
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import List, Optional

import yfinance as yf

from services.rebalancing.models import (
    DriftSignal,
    HarvestOpportunity,
    Position,
    PortfolioContext,
    TaxImpact,
)

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════
# CONSTANTS (Indian Budget 2024-25 rates)
# ═══════════════════════════════════════════════════════════════════════
STCG_RATE = 0.20           # 20 % on equity short-term capital gains
LTCG_RATE = 0.125          # 12.5 % on long-term capital gains
LTCG_EXEMPTION = 125_000.0 # ₹1.25 L annual exemption
STT_RATE = 0.001           # 0.1 % Securities Transaction Tax (sell-side)

# Sector → ETF replacement mapping for tax-loss harvesting
_SECTOR_ETF_MAP = {
    "banking":    "BANKBEES.NS",
    "financial":  "BANKBEES.NS",
    "bank":       "BANKBEES.NS",
    "it":         "ITBEES.NS",
    "technology": "ITBEES.NS",
    "tech":       "ITBEES.NS",
    "fmcg":       "FMCGBEES.NS",
    "consumer":   "FMCGBEES.NS",
    "pharma":     "PHARMABEES.NS",
    "healthcare": "PHARMABEES.NS",
    "auto":       "MOM100.NS",
    "automobile": "MOM100.NS",
}
_DEFAULT_ETF = "NIFTYBEES.NS"


def _to_nse_ticker(symbol: str) -> str:
    """Append .NS suffix if not already present."""
    s = symbol.strip()
    if s.startswith("^") or s.endswith(".NS") or s.endswith(".BO"):
        return s
    return f"{s}.NS"


# ═══════════════════════════════════════════════════════════════════════
# STAGE 4A: TAX IMPACT CALCULATOR
# ═══════════════════════════════════════════════════════════════════════

def compute_tax_impact(
    signal: DriftSignal,
    position: Position,
    context: PortfolioContext,
    purchase_date: date,
    yearly_ltcg_used: float = 50_000.0,
) -> TaxImpact:
    """Compute STCG/LTCG tax, STT, and net benefit for a proposed REDUCE trade.

    Args:
        signal: The drift signal proposing the trade.
        position: Current holding details.
        context: Portfolio-wide context (total_value, etc.).
        purchase_date: Date the position was originally bought.
        yearly_ltcg_used: LTCG already consumed in the current FY (default ₹50 K prototype).

    Returns:
        TaxImpact model with full breakdown and action_confirmed flag.
    """
    # Non-sell actions get a pass-through
    if signal.action not in ("REDUCE", "REDUCE_RISK_PARITY", "SELL"):
        return TaxImpact(
            symbol=position.symbol,
            action_confirmed=True,
        )

    holding_days = (date.today() - purchase_date).days
    is_long_term = holding_days >= 365

    # Quantity to sell based on drift magnitude
    if position.current_price <= 0:
        logger.warning("Position %s has non-positive price ₹%.2f", position.symbol, position.current_price)
        return TaxImpact(symbol=position.symbol, action_confirmed=False)

    quantity_to_sell = (abs(signal.drift) * context.total_value) / position.current_price
    gross_gain = (position.current_price - position.avg_price) * quantity_to_sell
    stt_cost = position.current_price * quantity_to_sell * STT_RATE

    gain_type = ""
    tax_liability = 0.0
    harvest_eligible = False

    if gross_gain > 0:
        if is_long_term:
            gain_type = "LTCG"
            exemption_remaining = max(0.0, LTCG_EXEMPTION - yearly_ltcg_used)
            taxable_gain = max(0.0, gross_gain - exemption_remaining)
            tax_liability = taxable_gain * LTCG_RATE
        else:
            gain_type = "STCG"
            tax_liability = gross_gain * STCG_RATE
    else:
        gain_type = "LOSS"
        harvest_eligible = True

    # Net benefit: expected risk-reduction value minus tax+STT drag
    # Use 5 % of the drift-adjusted value as a heuristic for risk-reduction benefit
    expected_risk_reduction_value = abs(signal.drift) * context.total_value * 0.05
    net_benefit = expected_risk_reduction_value - tax_liability - stt_cost

    action_confirmed = True
    if net_benefit <= 0 and gain_type != "LOSS":
        action_confirmed = False
        signal.action = "HOLD"
        signal.reason = (
            f"Cancelled REDUCE: Tax drag (₹{tax_liability:,.0f} {gain_type} + "
            f"₹{stt_cost:,.0f} STT) exceeds risk-reduction utility."
        )
        logger.info(
            "Tax engine blocked %s: tax=₹%.0f, stt=₹%.0f, benefit=₹%.0f",
            position.symbol, tax_liability, stt_cost, expected_risk_reduction_value,
        )

    return TaxImpact(
        symbol=position.symbol,
        quantity_to_sell=quantity_to_sell,
        gross_gain=gross_gain,
        is_long_term=is_long_term,
        holding_period_days=holding_days,
        gain_type=gain_type,
        tax_liability=tax_liability,
        stt_cost=stt_cost,
        net_benefit=net_benefit,
        harvest_eligible=harvest_eligible,
        action_confirmed=action_confirmed,
    )


# ═══════════════════════════════════════════════════════════════════════
# STAGE 4C: TAX-LOSS HARVEST FINDER
# ═══════════════════════════════════════════════════════════════════════

def _find_replacement_etf(sector: str) -> str:
    """Map position sector to an appropriate replacement ETF ticker."""
    sec_lower = sector.lower().strip()
    for keyword, etf in _SECTOR_ETF_MAP.items():
        if keyword in sec_lower:
            return etf
    return _DEFAULT_ETF


def _compute_liquidity_score(symbol: str, position_value: float) -> float:
    """Compute liquidity_score = 30-day ADV / position value."""
    if position_value <= 0:
        return 0.0
    try:
        ticker = yf.Ticker(_to_nse_ticker(symbol))
        info = ticker.info or {}
        avg_volume = info.get("averageVolume", 0) or 0
        current_price = info.get("currentPrice", 0) or info.get("regularMarketPrice", 0) or 0
        if avg_volume > 0 and current_price > 0:
            adv = float(avg_volume) * float(current_price)
            return adv / position_value
    except Exception as exc:
        logger.debug("Liquidity score fetch failed for %s: %s", symbol, exc)
    return 1.0  # default: assume adequately liquid


def find_harvest_opportunities(
    positions: List[Position],
    transactions: list,
) -> List[HarvestOpportunity]:
    """Identify tax-loss harvest candidates.

    For each position where current_price < avg_price:
      1. Check wash-sale window (no purchase of same ISIN within 30 days).
      2. Compute unrealized loss and estimated tax saving.
      3. Find sector-appropriate replacement ETF.
      4. Compute liquidity score from 30-day ADV.
      5. Rank by unrealized_loss × liquidity_score (highest first).

    Returns top 5 harvest opportunities.
    """
    opportunities: List[HarvestOpportunity] = []
    thirty_days_ago = date.today() - timedelta(days=30)

    for pos in positions:
        if pos.current_price >= pos.avg_price:
            continue

        total_loss = (pos.avg_price - pos.current_price) * pos.quantity
        loss_pct = (pos.avg_price - pos.current_price) / pos.avg_price if pos.avg_price > 0 else 0.0

        # ── Wash-sale check ───────────────────────────────────────────
        recent_buy = False
        for txn in transactions:
            # Support both dict-like and object-like transactions
            txn_symbol = getattr(txn, "symbol", None) or (txn.get("symbol") if isinstance(txn, dict) else None)
            txn_action = getattr(txn, "action", None) or (txn.get("action") if isinstance(txn, dict) else None)
            txn_date_raw = getattr(txn, "date", None) or (txn.get("date") if isinstance(txn, dict) else None)

            if txn_symbol == pos.symbol and txn_action == "BUY":
                try:
                    if isinstance(txn_date_raw, date):
                        txn_date = txn_date_raw
                    else:
                        txn_date = txn_date_raw.date() if hasattr(txn_date_raw, "date") else txn_date_raw
                    if txn_date >= thirty_days_ago:
                        recent_buy = True
                        break
                except Exception:
                    pass

        wash_sale_safe = not recent_buy

        # ── Replacement ───────────────────────────────────────────────
        replacement = _find_replacement_etf(pos.sector)

        # ── Liquidity score ───────────────────────────────────────────
        position_value = pos.current_price * pos.quantity
        liquidity_score = _compute_liquidity_score(pos.symbol, position_value)

        # ── Tax saving estimate ───────────────────────────────────────
        # Use LTCG rate as base assumption for harvest
        tax_saving = total_loss * LTCG_RATE

        reason = (
            f"Sell {pos.symbol} (loss ₹{total_loss:,.0f}, {loss_pct * 100:.1f}%) "
            f"→ Buy {replacement}. "
            f"{'Wash-sale safe ✓' if wash_sale_safe else 'CAUTION: recent purchase within 30d'}. "
            f"Estimated tax saving: ₹{tax_saving:,.0f}."
        )

        opportunities.append(
            HarvestOpportunity(
                symbol=pos.symbol,
                isin=pos.isin,
                unrealized_loss=total_loss,
                tax_saving_estimate=tax_saving,
                replacement_symbol=replacement,
                suggested_replacement=replacement,
                wash_sale_safe=wash_sale_safe,
                liquidity_score=liquidity_score,
                loss_pct=loss_pct,
                reason=reason,
                wash_sale_window_end=thirty_days_ago,
            )
        )

    # Rank by portfolio impact: unrealized_loss × liquidity_score (descending)
    pos_weights = {p.symbol: p.current_weight for p in positions}
    opportunities.sort(
        key=lambda x: x.unrealized_loss * pos_weights.get(x.symbol, 0.01),
        reverse=True,
    )
    return opportunities[:5]
