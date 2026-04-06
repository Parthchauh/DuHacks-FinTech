from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import yfinance as yf

from services.rebalancing.models import (
    AdxSignal,
    DrawdownSignal,
    DriftAction,
    DriftDirection,
    DriftSignal,
    EmaSignal,
    PortfolioContext,
    Position,
    RelativeStrengthSignal,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class _SignalBundle:
    ema: EmaSignal
    adx: AdxSignal
    rs: RelativeStrengthSignal
    drawdown: DrawdownSignal


def _to_nse_ticker(symbol: str) -> str:
    """
    Convert internal symbol to NSE ticker for yfinance.

    Indian convention: NSE primary. If symbol already has a suffix, keep it.
    """

    s = symbol.strip()
    if not s:
        raise ValueError("symbol must be a non-empty string.")
    if s.startswith("^"):
        return s
    if s.endswith(".NS") or s.endswith(".BO"):
        return s
    return f"{s}.NS"


def _get_ohlcv_frame(download_df: pd.DataFrame, ticker: str) -> pd.DataFrame:
    """
    Extract per-ticker OHLCV frame from yfinance.download output.
    """

    if download_df is None or download_df.empty:
        raise ValueError("yfinance returned empty OHLCV dataframe.")

    if isinstance(download_df.columns, pd.MultiIndex):
        if ticker not in download_df.columns.get_level_values(0):
            raise ValueError(f"Missing OHLCV data for ticker '{ticker}'.")
        frame = download_df[ticker].copy()
    else:
        # Single ticker download returns a flat dataframe.
        frame = download_df.copy()

    needed = {"Open", "High", "Low", "Close", "Volume"}
    missing = needed.difference(set(frame.columns))
    if missing:
        raise ValueError(f"OHLCV frame for '{ticker}' missing columns: {sorted(missing)}")
    frame = frame.dropna(subset=["Close", "High", "Low"])
    return frame


def _ema(series: pd.Series, span: int) -> pd.Series:
    """
    EMA using pandas ewm (Wilder not used here; standard EMA per spec).
    """

    if span <= 1:
        raise ValueError("EMA span must be > 1.")
    return series.ewm(span=span, adjust=False).mean()


def _wilder_ema(series: pd.Series, window: int) -> pd.Series:
    """
    Wilder's smoothing (EMA with alpha=1/window).
    """

    if window <= 1:
        raise ValueError("Wilder window must be > 1.")
    alpha = 1.0 / float(window)
    return series.ewm(alpha=alpha, adjust=False).mean()


def _compute_adx_dmi(frame: pd.DataFrame, window: int) -> Tuple[float, float, float]:
    """
    Compute ADX(14), +DI(14), -DI(14) using Wilder smoothing.
    Returns (adx, plus_di, minus_di) for the last available bar.
    """

    high = frame["High"].astype(float)
    low = frame["Low"].astype(float)
    close = frame["Close"].astype(float)

    prev_close = close.shift(1)
    prev_high = high.shift(1)
    prev_low = low.shift(1)

    tr = pd.concat(
        [
            (high - low).abs(),
            (high - prev_close).abs(),
            (low - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)

    up_move = high - prev_high
    down_move = prev_low - low

    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

    plus_dm_s = _wilder_ema(pd.Series(plus_dm, index=frame.index), window=window)
    minus_dm_s = _wilder_ema(pd.Series(minus_dm, index=frame.index), window=window)
    atr = _wilder_ema(tr, window=window)

    eps = 1e-12
    plus_di = 100.0 * (plus_dm_s / (atr + eps))
    minus_di = 100.0 * (minus_dm_s / (atr + eps))

    dx = 100.0 * (plus_di - minus_di).abs() / ((plus_di + minus_di) + eps)
    adx = _wilder_ema(dx, window=window)

    adx_last = float(adx.dropna().iloc[-1])
    plus_last = float(plus_di.dropna().iloc[-1])
    minus_last = float(minus_di.dropna().iloc[-1])
    return adx_last, plus_last, minus_last


def _compute_relative_strength_30d(stock_close: pd.Series, nifty_close: pd.Series) -> float:
    """
    RS per spec: stock_30d_return / nifty_30d_return.
    """

    if len(stock_close) < 31 or len(nifty_close) < 31:
        raise ValueError("Need at least 31 closes to compute 30D returns.")

    s0 = float(stock_close.iloc[-31])
    s1 = float(stock_close.iloc[-1])
    n0 = float(nifty_close.iloc[-31])
    n1 = float(nifty_close.iloc[-1])

    if s0 == 0.0 or n0 == 0.0:
        raise ValueError("Close price is zero; cannot compute returns.")

    stock_ret = (s1 - s0) / s0
    nifty_ret = (n1 - n0) / n0

    # If NIFTY return ~0, RS becomes unstable; treat as neutral ratio 1.0.
    if abs(nifty_ret) < 1e-8:
        return 1.0
    return float(stock_ret / nifty_ret)


def _compute_drawdown_60d(stock_close: pd.Series) -> float:
    """
    Drawdown per spec: (current_price - rolling_max_60d) / rolling_max_60d.
    """

    if len(stock_close) < 60:
        raise ValueError("Need at least 60 closes to compute 60D drawdown.")
    window = stock_close.iloc[-60:].astype(float)
    rolling_max = float(window.max())
    current = float(window.iloc[-1])
    if rolling_max == 0.0:
        raise ValueError("Rolling max close is zero; cannot compute drawdown.")
    return float((current - rolling_max) / rolling_max)


def _decide_action(direction: DriftDirection, bundle: _SignalBundle) -> DriftAction:
    """
    Decision matrix per spec.
    """

    if direction == DriftDirection.OVERWEIGHT:
        if (bundle.ema == EmaSignal.BEARISH or bundle.adx == AdxSignal.DOWNTREND_CONFIRMED) and bundle.rs == RelativeStrengthSignal.WEAK:
            return DriftAction.REDUCE
        if bundle.ema == EmaSignal.BULLISH and bundle.adx == AdxSignal.UPTREND_CONFIRMED and bundle.rs == RelativeStrengthSignal.STRONG:
            return DriftAction.HOLD_STRONG
        return DriftAction.HOLD

    # UNDERWEIGHT
    if bundle.ema == EmaSignal.BULLISH and bundle.rs == RelativeStrengthSignal.STRONG:
        return DriftAction.INCREASE
    return DriftAction.HOLD


def _confidence_for_action(action: DriftAction, direction: DriftDirection, bundle: _SignalBundle) -> float:
    """
    Confidence = (# signals agreeing with action) / 4.
    """

    agree = 0
    if action == DriftAction.REDUCE:
        agree += 1 if bundle.ema == EmaSignal.BEARISH else 0
        agree += 1 if bundle.adx == AdxSignal.DOWNTREND_CONFIRMED else 0
        agree += 1 if bundle.rs == RelativeStrengthSignal.WEAK else 0
        agree += 1 if bundle.drawdown == DrawdownSignal.SIGNIFICANT else 0
    elif action == DriftAction.INCREASE:
        agree += 1 if bundle.ema == EmaSignal.BULLISH else 0
        agree += 1 if bundle.adx == AdxSignal.UPTREND_CONFIRMED else 0
        agree += 1 if bundle.rs == RelativeStrengthSignal.STRONG else 0
        # Drawdown does not generally "agree" with increasing; significant drawdown is a caution.
        agree += 1 if bundle.drawdown == DrawdownSignal.NORMAL else 0
    elif action == DriftAction.HOLD_STRONG:
        agree += 1 if bundle.ema == EmaSignal.BULLISH else 0
        agree += 1 if bundle.adx == AdxSignal.UPTREND_CONFIRMED else 0
        agree += 1 if bundle.rs == RelativeStrengthSignal.STRONG else 0
        agree += 1 if bundle.drawdown == DrawdownSignal.NORMAL else 0
    else:
        # HOLD is used when mixed; define confidence as how many are neutral/mixed relative to direction.
        # This intentionally yields mid-range values and prevents overconfidence on HOLD.
        agree += 1 if bundle.ema == EmaSignal.NEUTRAL else 0
        agree += 1 if bundle.adx == AdxSignal.RANGING else 0
        agree += 1 if bundle.rs == RelativeStrengthSignal.NEUTRAL else 0
        agree += 1 if bundle.drawdown == DrawdownSignal.NORMAL else 0

    return float(agree / 4.0)


def _priority_from_confidence(confidence: float) -> int:
    if confidence > 0.75:
        return 1
    if confidence > 0.5:
        return 2
    return 3


def _build_reason(action: DriftAction, symbol: str, drift_pct: float, bundle: _SignalBundle, drawdown_value: float) -> str:
    """
    Build the human-readable audit string per required format.
    """

    drift_str = f"{abs(drift_pct):.2f}"
    parts: List[str] = []

    if bundle.ema == EmaSignal.BEARISH:
        parts.append("price below 50 EMA and 100 EMA")
    elif bundle.ema == EmaSignal.BULLISH:
        parts.append("price above 50 EMA and 100 EMA")
    else:
        parts.append("price near EMA band")

    if bundle.rs == RelativeStrengthSignal.WEAK:
        parts.append("RS weak vs NIFTY")
    elif bundle.rs == RelativeStrengthSignal.STRONG:
        parts.append("RS strong vs NIFTY")
    else:
        parts.append("RS neutral vs NIFTY")

    if bundle.adx == AdxSignal.DOWNTREND_CONFIRMED:
        parts.append("ADX confirms downtrend")
    elif bundle.adx == AdxSignal.UPTREND_CONFIRMED:
        parts.append("ADX confirms uptrend")
    else:
        parts.append("ADX indicates ranging market")

    if bundle.drawdown == DrawdownSignal.SIGNIFICANT:
        parts.append(f"60-day drawdown {drawdown_value * 100:.1f}%")

    return f"{action.value.title().replace('_', ' ')} {symbol} by {drift_str}%: " + ", ".join(parts)


def detect_drift_with_signals(positions: List[Position], context: PortfolioContext) -> List[DriftSignal]:
    """
    Stage 1: Drift detection + technical/risk signals (EMA, ADX/DMI, RS vs NIFTY, drawdown).

    Args:
        positions: Current portfolio positions with current/target weights.
        context: PortfolioContext containing RebalancingConfig thresholds.

    Returns:
        List of DriftSignal objects for positions breaching drift threshold.
    """

    cfg = context.config
    threshold = float(cfg.drift_threshold)
    drifted: List[Tuple[Position, float]] = []

    for p in positions:
        d = float(p.current_weight - p.target_weight)
        if abs(d) > threshold:
            drifted.append((p, d))

    if not drifted:
        return []

    tickers = sorted({_to_nse_ticker(p.symbol) for p, _ in drifted} | {"^NSEI"})

    try:
        download_df = yf.download(
            tickers=tickers,
            period="200d",
            interval="1d",
            group_by="ticker",
            auto_adjust=False,
            progress=False,
            threads=True,
        )
    except Exception as e:
        raise RuntimeError(f"Failed to fetch OHLCV data from yfinance for drift signals: {e}") from e

    nifty_frame = _get_ohlcv_frame(download_df, "^NSEI")
    nifty_close = nifty_frame["Close"].astype(float).dropna()

    out: List[DriftSignal] = []

    for pos, drift in drifted:
        yf_ticker = _to_nse_ticker(pos.symbol)
        try:
            frame = _get_ohlcv_frame(download_df, yf_ticker)
        except Exception as e:
            logger.warning("Skipping %s due to missing OHLCV: %s", pos.symbol, str(e))
            continue

        close = frame["Close"].astype(float).dropna()
        if len(close) < 120:
            logger.warning("Skipping %s due to insufficient history (%d rows).", pos.symbol, len(close))
            continue

        # SIGNAL 1 — EMA
        ema50 = _ema(close, span=50).iloc[-1]
        ema100 = _ema(close, span=100).iloc[-1]
        current_price = float(pos.current_price) if float(pos.current_price) > 0 else float(close.iloc[-1])

        if current_price < float(ema50) and current_price < float(ema100):
            ema_sig = EmaSignal.BEARISH
        elif current_price > float(ema50) and current_price > float(ema100):
            ema_sig = EmaSignal.BULLISH
        else:
            ema_sig = EmaSignal.NEUTRAL

        # SIGNAL 2 — ADX + DMI (14)
        try:
            adx_value, plus_di, minus_di = _compute_adx_dmi(frame, window=14)
        except Exception as e:
            logger.warning("ADX computation failed for %s: %s", pos.symbol, str(e))
            adx_value, plus_di, minus_di = 0.0, 0.0, 0.0

        if adx_value > float(cfg.adx_threshold) and minus_di > plus_di:
            adx_sig = AdxSignal.DOWNTREND_CONFIRMED
        elif adx_value > float(cfg.adx_threshold) and plus_di > minus_di:
            adx_sig = AdxSignal.UPTREND_CONFIRMED
        else:
            adx_sig = AdxSignal.RANGING

        # SIGNAL 3 — Relative Strength vs NIFTY 50 (30D)
        try:
            rs_value = _compute_relative_strength_30d(close, nifty_close)
        except Exception as e:
            logger.warning("RS computation failed for %s: %s", pos.symbol, str(e))
            rs_value = 1.0

        if rs_value < float(cfg.rs_weak_bound):
            rs_sig = RelativeStrengthSignal.WEAK
        elif rs_value > float(cfg.rs_strong_bound):
            rs_sig = RelativeStrengthSignal.STRONG
        else:
            rs_sig = RelativeStrengthSignal.NEUTRAL

        # SIGNAL 4 — Drawdown (60D)
        try:
            drawdown_value = _compute_drawdown_60d(close)
        except Exception as e:
            logger.warning("Drawdown computation failed for %s: %s", pos.symbol, str(e))
            drawdown_value = 0.0

        dd_sig = DrawdownSignal.SIGNIFICANT if drawdown_value < -float(cfg.drawdown_threshold) else DrawdownSignal.NORMAL

        direction = DriftDirection.OVERWEIGHT if drift > 0 else DriftDirection.UNDERWEIGHT
        bundle = _SignalBundle(ema=ema_sig, adx=adx_sig, rs=rs_sig, drawdown=dd_sig)

        action = _decide_action(direction, bundle)
        confidence = _confidence_for_action(action, direction, bundle)
        priority = _priority_from_confidence(confidence)

        signal_dict: Dict[str, object] = {
            "ema": bundle.ema.value,
            "adx": bundle.adx.value,
            "rs": bundle.rs.value,
            "drawdown": bundle.drawdown.value,
        }

        reason = _build_reason(action, pos.symbol, drift_pct=round(float(drift) * 100.0, 2), bundle=bundle, drawdown_value=drawdown_value)

        out.append(
            DriftSignal(
                symbol=pos.symbol,
                drift=float(drift),
                drift_pct=round(float(drift) * 100.0, 2),
                direction=direction,
                action=action,
                signals=signal_dict,
                reason=reason,
                confidence=float(confidence),
                priority=int(priority),
            )
        )

    # Stable ordering: urgent first, then highest absolute drift.
    out.sort(key=lambda s: (s.priority, -abs(float(s.drift))))
    return out
