"""
OptiWealth Rebalancing Engine — Factor Exposure + ESG Filter
==============================================================
Stage 5: Factor Exposure Control
Stage 6: ESG Sector Filter

Factors tracked: Value (1/PE), Growth (EPS growth), Quality (ROE),
Momentum (6-month return), Size (log market cap).
"""

from __future__ import annotations

import logging
import math
from typing import Dict, List

import yfinance as yf

from services.rebalancing.models import (
    DriftSignal,
    FactorAlert,
    PortfolioContext,
    Position,
)

logger = logging.getLogger(__name__)

# In-memory cache to avoid rate-limits within a single orchestrator run
_FACTOR_CACHE: Dict[str, Dict] = {}


def _to_nse_ticker(symbol: str) -> str:
    """Append .NS suffix if not already present."""
    s = symbol.strip()
    if s.startswith("^") or s.endswith(".NS") or s.endswith(".BO"):
        return s
    return f"{s}.NS"


def _fetch_factor_data(symbol: str) -> Dict:
    """Fetch raw factor data for a single ticker from yfinance. Cached."""
    yf_sym = _to_nse_ticker(symbol)
    if yf_sym in _FACTOR_CACHE:
        return _FACTOR_CACHE[yf_sym]

    defaults = {
        "pe": 0.0,
        "eps_growth": 0.0,
        "roe": 0.0,
        "momentum": 0.0,
        "marketCap": 1e9,
    }

    try:
        ticker = yf.Ticker(yf_sym)
        info = ticker.info or {}

        # Value factor: 1 / trailingPE
        raw_pe = info.get("trailingPE", None)
        pe = float(raw_pe) if raw_pe and raw_pe > 0 else 0.0

        # Growth factor: earningsGrowth (YoY EPS growth)
        eps_growth = float(info.get("earningsGrowth", 0.0) or 0.0)

        # Quality factor: returnOnEquity
        roe = float(info.get("returnOnEquity", 0.0) or 0.0)

        # Momentum: 6-month price return
        momentum = 0.0
        hist = ticker.history(period="6mo")
        if hist is not None and len(hist) > 1:
            start_price = float(hist["Close"].iloc[0])
            end_price = float(hist["Close"].iloc[-1])
            if start_price > 0:
                momentum = (end_price - start_price) / start_price

        market_cap = float(info.get("marketCap", 1e9) or 1e9)

        data = {
            "pe": pe,
            "eps_growth": eps_growth,
            "roe": roe,
            "momentum": momentum,
            "marketCap": market_cap,
        }
    except Exception as exc:
        logger.warning("Factor data fetch failed for %s: %s", symbol, exc)
        data = defaults

    _FACTOR_CACHE[yf_sym] = data
    return data


# ═══════════════════════════════════════════════════════════════════════
# STAGE 5: FACTOR EXPOSURE CONTROL
# ═══════════════════════════════════════════════════════════════════════

def check_factor_exposures(
    positions: List[Position],
    context: PortfolioContext,
) -> List[FactorAlert]:
    """Check portfolio factor exposures against limits.

    For each factor (value, growth, quality, momentum, size):
      1. Compute raw score per position via yfinance.
      2. Min-max normalize across portfolio (0-1).
      3. Compute portfolio weighted score.
      4. Alert if score > limit × 1.20 (20 % over limit).
      5. Identify top 2 contributors.

    Returns list of FactorAlerts for breached factors.
    """
    alerts: List[FactorAlert] = []
    if not context.factor_limits or not positions:
        return alerts

    # ── Fetch raw factor data ─────────────────────────────────────────
    factor_data: Dict[str, Dict] = {}
    for pos in positions:
        factor_data[pos.symbol] = _fetch_factor_data(pos.symbol)

    # ── Compute raw scores per factor ─────────────────────────────────
    factor_names = ["value", "growth", "quality", "momentum", "size"]
    raw_scores: Dict[str, Dict[str, float]] = {f: {} for f in factor_names}

    max_mcap = max(
        (d["marketCap"] for d in factor_data.values() if d["marketCap"] > 0),
        default=1e9,
    )
    log_max_mcap = math.log(max_mcap) if max_mcap > 1 else 1.0

    for pos in positions:
        d = factor_data[pos.symbol]
        raw_scores["value"][pos.symbol] = 1.0 / d["pe"] if d["pe"] > 0 else 0.0
        raw_scores["growth"][pos.symbol] = d["eps_growth"]
        raw_scores["quality"][pos.symbol] = d["roe"]
        raw_scores["momentum"][pos.symbol] = d["momentum"]
        raw_scores["size"][pos.symbol] = (
            math.log(d["marketCap"]) / log_max_mcap
            if d["marketCap"] > 1 else 0.0
        )

    # ── Min-max normalize each factor across portfolio (0-1) ──────────
    normalized: Dict[str, Dict[str, float]] = {}
    for factor in factor_names:
        values = list(raw_scores[factor].values())
        min_val = min(values) if values else 0.0
        max_val = max(values) if values else 1.0
        spread = max_val - min_val if max_val != min_val else 1.0

        normalized[factor] = {}
        for sym, val in raw_scores[factor].items():
            normalized[factor][sym] = (val - min_val) / spread

    # ── Weighted portfolio factor scores ──────────────────────────────
    portfolio_factor: Dict[str, float] = {}
    for factor in factor_names:
        score = 0.0
        for pos in positions:
            score += pos.current_weight * normalized[factor].get(pos.symbol, 0.0)
        portfolio_factor[factor] = score

    # ── Check against limits (breach = >20 % over limit) ─────────────
    for factor, limit in context.factor_limits.items():
        if factor not in portfolio_factor:
            continue

        current = portfolio_factor[factor]
        breach_threshold = limit * 1.20

        if current > breach_threshold:
            breach_pct = (current - limit) / limit if limit > 0 else 0.0

            # Find top 2 contributors to this factor
            contributions = sorted(
                positions,
                key=lambda p: normalized.get(factor, {}).get(p.symbol, 0.0) * p.current_weight,
                reverse=True,
            )
            top_syms = [p.symbol for p in contributions[:2]]

            recommendation = (
                f"Reduce {', '.join(top_syms)} to lower {factor} exposure. "
                f"Current: {current:.2f}, Limit: {limit:.2f} "
                f"(breach: {breach_pct * 100:.1f}%)."
            )

            alerts.append(
                FactorAlert(
                    factor=factor,
                    current_exposure=current,
                    current_score=current,
                    limit=limit,
                    breach_pct=breach_pct,
                    top_contributors=top_syms,
                    recommendation=recommendation,
                    suggested_reduction_pct=min(1.0, breach_pct),
                )
            )
            logger.info(
                "Factor breach: %s = %.3f > limit %.3f × 1.2 = %.3f. Top: %s",
                factor, current, limit, breach_threshold, top_syms,
            )

    return alerts


# ═══════════════════════════════════════════════════════════════════════
# STAGE 6: ESG FILTER
# ═══════════════════════════════════════════════════════════════════════

def apply_esg_filter(
    signals: List[DriftSignal],
    positions: List[Position],
    context: PortfolioContext,
) -> List[DriftSignal]:
    """Apply ESG exclusion filter to signals.

    If a position's sector is in the exclusion list:
      - INCREASE / HOLD_STRONG → downgrade to HOLD (prevent adding exposure)
      - REDUCE actions are NOT blocked (ESG allows reducing exposure)
    """
    if not context.esg_exclusions:
        return signals

    excluded_lower = {e.lower().strip() for e in context.esg_exclusions}

    for sig in signals:
        pos = next((p for p in positions if p.symbol == sig.symbol), None)
        if not pos:
            continue

        if pos.sector.lower().strip() in excluded_lower:
            if sig.action in ("INCREASE", "HOLD_STRONG"):
                original_action = sig.action
                sig.action = "HOLD"
                sig.signals["esg_override"] = True
                sig.reason += f" [ESG: sector '{pos.sector}' excluded by client preference]"
                logger.info(
                    "ESG filter: %s %s → HOLD (sector '%s' excluded)",
                    original_action, sig.symbol, pos.sector,
                )

    return signals
