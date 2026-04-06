"""
OptiWealth Rebalancing Engine — Risk Engine
=============================================
Stage 2: Volatility Gate
Stage 3: Risk Parity Solver

Indian market conventions:
  - Market cap thresholds: large > ₹20,000 Cr, mid > ₹5,000 Cr
  - Annualized vol: daily_std * sqrt(252)
"""

from __future__ import annotations

import logging
import math
from typing import Dict, List

import numpy as np
import pandas as pd
import yfinance as yf

from services.rebalancing.models import (
    DriftSignal,
    Position,
    PortfolioContext,
    RebalancingConfig,
)

logger = logging.getLogger(__name__)

# ₹ Crore thresholds for market-cap classification
_LARGE_CAP_THRESHOLD = 20_000 * 1e7   # ₹20,000 Cr = 2e11
_MID_CAP_THRESHOLD = 5_000 * 1e7      # ₹5,000 Cr  = 5e10


def _to_nse_ticker(symbol: str) -> str:
    """Append .NS suffix if not already present (NSE primary convention)."""
    s = symbol.strip()
    if not s:
        raise ValueError("symbol must be a non-empty string.")
    if s.startswith("^"):
        return s
    if s.endswith(".NS") or s.endswith(".BO"):
        return s
    return f"{s}.NS"


def _classify_market_cap(market_cap: float) -> str:
    """Classify market cap into large / mid / small per Indian convention."""
    if market_cap > _LARGE_CAP_THRESHOLD:
        return "large"
    if market_cap > _MID_CAP_THRESHOLD:
        return "mid"
    return "small"


# ═══════════════════════════════════════════════════════════════════════
# STAGE 2: VOLATILITY GATE
# ═══════════════════════════════════════════════════════════════════════

def apply_volatility_gate(
    signals: List[DriftSignal],
    positions: List[Position],
    config: RebalancingConfig | None = None,
) -> List[DriftSignal]:
    """Apply volatility gate to REDUCE signals.

    For each REDUCE signal:
      1. Fetch 25 days of closes and compute 20-day annualized realized vol.
      2. Determine market-cap category from yfinance Ticker.info["marketCap"].
      3. If vol > sector threshold: keep REDUCE, add high_volatility flag,
         upgrade priority to 1 (urgent).
      4. If vol ≤ threshold AND confidence < 0.5: downgrade to HOLD.
    """
    if config is None:
        config = RebalancingConfig()

    reduce_signals = [s for s in signals if s.action in ("REDUCE", "REDUCE_RISK_PARITY")]
    if not reduce_signals:
        return signals

    # Build symbol → yfinance ticker mapping
    sym_to_yf = {s.symbol: _to_nse_ticker(s.symbol) for s in reduce_signals}
    yf_tickers = list(set(sym_to_yf.values()))

    # Download 25 days of closes in one batch
    try:
        data = yf.download(yf_tickers, period="25d", progress=False, group_by="ticker")
    except Exception as exc:
        logger.warning("Volatility gate download failed: %s — skipping gate.", exc)
        return signals

    for sig in reduce_signals:
        pos = next((p for p in positions if p.symbol == sig.symbol), None)
        if not pos:
            continue

        yf_sym = sym_to_yf[sig.symbol]

        # ── Extract close prices ──────────────────────────────────────
        try:
            if isinstance(data.columns, pd.MultiIndex):
                if yf_sym not in data.columns.get_level_values(0):
                    continue
                df = data[yf_sym]
            else:
                df = data

            if df is None or len(df) < 20:
                continue

            close_col = df["Close"]
            if isinstance(close_col, pd.DataFrame):
                close_col = close_col.squeeze()
            recent_closes = close_col.dropna().tail(21)
            if len(recent_closes) < 20:
                continue
        except Exception as exc:
            logger.warning("Vol-gate: could not extract closes for %s: %s", sig.symbol, exc)
            continue

        daily_returns = recent_closes.pct_change().dropna()
        vol = float(daily_returns.std()) * math.sqrt(252)

        # ── Determine market-cap category from yfinance ───────────────
        mkt_cap_cat = pos.market_cap_category
        try:
            ticker_obj = yf.Ticker(yf_sym)
            info = ticker_obj.info or {}
            raw_mcap = info.get("marketCap", None)
            if raw_mcap is not None and raw_mcap > 0:
                mkt_cap_cat = _classify_market_cap(float(raw_mcap))
        except Exception:
            pass  # fall back to position's own category

        threshold = config.get_vol_threshold(mkt_cap_cat)

        # ── Apply gate logic ──────────────────────────────────────────
        if vol > threshold:
            sig.signals["high_volatility"] = True
            sig.priority = 1
            sig.reason += (
                f" Volatility ({vol * 100:.1f}%) > {mkt_cap_cat}-cap limit "
                f"({threshold * 100:.1f}%)."
            )
            logger.info(
                "Vol-gate KEEP-REDUCE %s: vol=%.1f%% > threshold=%.1f%%",
                sig.symbol, vol * 100, threshold * 100,
            )
        else:
            # Low-vol environment — only block if confidence is low
            if sig.confidence < 0.5:
                sig.action = "HOLD"
                sig.signals["volatility_gate_blocked"] = True
                sig.reason += (
                    f" Vol normal ({vol * 100:.1f}%). Low confidence "
                    f"({sig.confidence:.2f}). REDUCE downgraded to HOLD."
                )
                logger.info(
                    "Vol-gate BLOCKED %s: vol=%.1f%%, confidence=%.2f",
                    sig.symbol, vol * 100, sig.confidence,
                )
            else:
                sig.reason += f" Volatility ({vol * 100:.1f}%) within bounds."

    return signals


# ═══════════════════════════════════════════════════════════════════════
# STAGE 3: RISK PARITY SOLVER (Gradient Descent)
# ═══════════════════════════════════════════════════════════════════════

def compute_risk_parity_targets(positions: List[Position]) -> Dict[str, float]:
    """Compute equal-risk-contribution target weights via gradient descent.

    Target: each asset contributes equally to total portfolio risk.

    RC_i = w_i * (Σ @ w)[i] / σ_p
    Goal:  RC_i ≈ 1/n for all i

    Solver:
      w ← 1/n
      for 1..1000 iterations:
        grad_i = RC_i − (1/n)
        w_i = w_i − lr * grad_i
        w = max(w, 1e-8); w = w / Σw
        converge when max|RC_i − 1/n| < 1e-8

    Returns dict mapping symbol → risk-parity target weight.
    """
    if not positions or len(positions) < 2:
        return {p.symbol: p.current_weight for p in positions} if positions else {}

    symbols = [p.symbol for p in positions]
    yf_symbols = [_to_nse_ticker(s) for s in symbols]

    try:
        data = yf.download(
            yf_symbols,
            period="252d",
            progress=False,
            group_by="ticker",
        )
    except Exception as exc:
        logger.warning("Risk parity download failed: %s — returning current weights.", exc)
        return {p.symbol: p.current_weight for p in positions}

    # Build daily returns dataframe
    returns_df = pd.DataFrame()
    for sys_sym, yf_sym in zip(symbols, yf_symbols):
        try:
            if isinstance(data.columns, pd.MultiIndex):
                if yf_sym in data.columns.get_level_values(0):
                    close_col = data[yf_sym]["Close"]
                    if isinstance(close_col, pd.DataFrame):
                        close_col = close_col.squeeze()
                    returns_df[sys_sym] = close_col.pct_change()
                else:
                    logger.warning("Missing data for %s in risk parity batch.", yf_sym)
            else:
                close_col = data["Close"]
                if isinstance(close_col, pd.DataFrame):
                    close_col = close_col.squeeze()
                returns_df[sys_sym] = close_col.pct_change()
        except Exception as exc:
            logger.warning("Risk parity: failed to extract %s: %s", yf_sym, exc)

    returns_df = returns_df.dropna()
    n = len(symbols)

    if len(returns_df) < 50 or returns_df.shape[1] < 2:
        logger.info("Insufficient data for risk parity (%d rows). Returning current weights.", len(returns_df))
        return {p.symbol: p.current_weight for p in positions}

    # Annualized covariance matrix
    cov = returns_df.cov().values * 252

    # ── Gradient descent solver ───────────────────────────────────────
    w = np.ones(n) / n
    learning_rate = 0.01
    target_rc = 1.0 / n

    for iteration in range(1000):
        port_var = float(w.T @ cov @ w)
        if port_var <= 0:
            break
        port_vol = math.sqrt(port_var)

        marginal = cov @ w
        rc = (w * marginal) / port_vol

        gradient = rc - target_rc
        max_err = float(np.max(np.abs(gradient)))

        if max_err < 1e-8:
            logger.info("Risk parity converged at iteration %d.", iteration)
            break

        # Adaptive learning rate when oscillating
        if max_err > 0.05:
            learning_rate *= 0.5

        w = w - learning_rate * gradient
        w = np.maximum(w, 1e-8)
        w = w / w.sum()

    # Validate
    total = float(w.sum())
    if abs(total - 1.0) > 0.001:
        logger.warning("Risk parity weights sum to %.6f — renormalizing.", total)
        w = w / w.sum()

    return {symbols[i]: float(w[i]) for i in range(n)}
