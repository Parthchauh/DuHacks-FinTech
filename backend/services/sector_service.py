"""
OptiWealth Backend - Sector Rotation Service
===============================================
Implements sector-based momentum strategy using Relative Strength (RS):
- Sector definitions mapping Indian stocks to industry groups
- RS computation over rolling windows (1M, 3M, 6M)
- Sector ranking and top-N selection
- Leading stock picks per sector
- Portfolio rotation suggestions with impact analysis

RS methodology:
    RS = (Sector Return / Market Return) over a rolling window.
    RS > 1.0 means the sector outperforms the market.
    Composite RS = weighted average of 1M (20%), 3M (40%), 6M (40%).
"""

import logging
import math
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from config import get_settings

settings = get_settings()
logger = logging.getLogger("sector_rotation")

# =============================================================================
# INDIAN SECTOR DEFINITIONS
# =============================================================================

# Mapping of sectors to constituent stocks with metadata
SECTOR_DEFINITIONS: Dict[str, Dict] = {
    "Information Technology": {
        "etf": "ITBEES",
        "stocks": {
            "TCS": {"name": "Tata Consultancy Services", "weight": 0.30, "mcap": "large"},
            "INFY": {"name": "Infosys Ltd", "weight": 0.25, "mcap": "large"},
            "WIPRO": {"name": "Wipro Ltd", "weight": 0.15, "mcap": "large"},
        },
        "color": "#3b82f6",
    },
    "Banking & Finance": {
        "etf": "BANKBEES",
        "stocks": {
            "HDFCBANK": {"name": "HDFC Bank Ltd", "weight": 0.25, "mcap": "large"},
            "ICICIBANK": {"name": "ICICI Bank Ltd", "weight": 0.20, "mcap": "large"},
            "SBIN": {"name": "State Bank of India", "weight": 0.15, "mcap": "large"},
            "KOTAKBANK": {"name": "Kotak Mahindra Bank", "weight": 0.15, "mcap": "large"},
            "AXISBANK": {"name": "Axis Bank Ltd", "weight": 0.10, "mcap": "large"},
            "BAJFINANCE": {"name": "Bajaj Finance Ltd", "weight": 0.15, "mcap": "large"},
        },
        "color": "#10b981",
    },
    "Energy & Oil": {
        "etf": None,
        "stocks": {
            "RELIANCE": {"name": "Reliance Industries Ltd", "weight": 0.50, "mcap": "large"},
        },
        "color": "#f59e0b",
    },
    "FMCG & Consumer": {
        "etf": None,
        "stocks": {
            "HINDUNILVR": {"name": "Hindustan Unilever Ltd", "weight": 0.35, "mcap": "large"},
            "ITC": {"name": "ITC Ltd", "weight": 0.35, "mcap": "large"},
        },
        "color": "#8b5cf6",
    },
    "Automobile": {
        "etf": None,
        "stocks": {
            "MARUTI": {"name": "Maruti Suzuki India Ltd", "weight": 0.50, "mcap": "large"},
        },
        "color": "#ef4444",
    },
    "Pharma & Healthcare": {
        "etf": None,
        "stocks": {
            "SUNPHARMA": {"name": "Sun Pharmaceutical", "weight": 0.50, "mcap": "large"},
        },
        "color": "#06b6d4",
    },
    "Infrastructure & Capital Goods": {
        "etf": None,
        "stocks": {
            "LT": {"name": "Larsen & Toubro Ltd", "weight": 0.50, "mcap": "large"},
        },
        "color": "#78716c",
    },
    "Telecom": {
        "etf": None,
        "stocks": {
            "BHARTIARTL": {"name": "Bharti Airtel Ltd", "weight": 1.0, "mcap": "large"},
        },
        "color": "#ec4899",
    },
    "Consumer Discretionary": {
        "etf": None,
        "stocks": {
            "TITAN": {"name": "Titan Company Ltd", "weight": 1.0, "mcap": "large"},
        },
        "color": "#14b8a6",
    },
}

# Market benchmark
MARKET_BENCHMARK = "NIFTYBEES"


# =============================================================================
# MOCK SECTOR PERFORMANCE DATA
# =============================================================================
# In production, replace with real API calls (Alpha Vantage / Yahoo Finance / NSE)

def _generate_sector_returns(seed: int = 42) -> Dict[str, Dict[str, float]]:
    """
    Generate realistic mock sector returns for demo.
    Returns dict: sector_name -> {"1m": float, "3m": float, "6m": float}

    Uses deterministic seeding with date so values are consistent
    within a day but change daily to simulate real market behavior.
    """
    # Seed based on current date for daily consistency
    today = datetime.utcnow().date()
    day_seed = today.toordinal() + seed
    rng = random.Random(day_seed)

    # Base market return (NIFTY 50)
    market_returns = {
        "1m": rng.gauss(0.02, 0.03),   # ~2% monthly avg
        "3m": rng.gauss(0.06, 0.05),   # ~6% quarterly
        "6m": rng.gauss(0.12, 0.08),   # ~12% semi-annual
    }

    sector_returns = {}
    for sector in SECTOR_DEFINITIONS:
        # Each sector has different characteristic volatility
        vol_mult = rng.uniform(0.8, 1.5)
        sector_returns[sector] = {
            "1m": market_returns["1m"] + rng.gauss(0, 0.04) * vol_mult,
            "3m": market_returns["3m"] + rng.gauss(0, 0.06) * vol_mult,
            "6m": market_returns["6m"] + rng.gauss(0, 0.10) * vol_mult,
        }

    return sector_returns, market_returns


def _generate_stock_rs_scores(sector: str, sector_rs: float, seed: int = 42) -> List[Dict]:
    """Generate individual stock RS scores within a sector."""
    today = datetime.utcnow().date()
    rng = random.Random(today.toordinal() + hash(sector) + seed)

    stocks = SECTOR_DEFINITIONS[sector]["stocks"]
    results = []
    for ticker, info in stocks.items():
        # Stock RS varies around sector RS
        stock_rs = sector_rs + rng.gauss(0, 0.15)
        volume = rng.randint(500000, 10000000)
        results.append({
            "ticker": ticker,
            "name": info["name"],
            "rs_score": round(stock_rs, 3),
            "volume_avg": volume,
            "mcap": info["mcap"],
            "weight_in_sector": info["weight"],
        })

    # Sort by RS descending
    results.sort(key=lambda x: x["rs_score"], reverse=True)
    return results


# =============================================================================
# RELATIVE STRENGTH CALCULATIONS
# =============================================================================

def compute_relative_strength(
    sector_return: float,
    market_return: float
) -> float:
    """
    Compute Relative Strength ratio.

    RS = (1 + sector_return) / (1 + market_return)
    RS > 1.0 = outperformance, RS < 1.0 = underperformance.
    """
    if market_return <= -1.0:
        return 1.0  # avoid division by zero
    return (1 + sector_return) / (1 + market_return)


def compute_composite_rs(rs_1m: float, rs_3m: float, rs_6m: float) -> float:
    """
    Weighted composite RS score.
    Weights: 1M = 20%, 3M = 40%, 6M = 40%
    Recent momentum matters but longer trends matter more.
    """
    return 0.20 * rs_1m + 0.40 * rs_3m + 0.40 * rs_6m


def classify_momentum(rs_1m: float, rs_3m: float) -> str:
    """
    Classify sector momentum signal.
    Returns: 'strong_up', 'up', 'neutral', 'down', 'strong_down'
    """
    if rs_1m > 1.05 and rs_3m > 1.05:
        return "strong_up"
    elif rs_1m > 1.02 or rs_3m > 1.02:
        return "up"
    elif rs_1m < 0.95 and rs_3m < 0.95:
        return "strong_down"
    elif rs_1m < 0.98 or rs_3m < 0.98:
        return "down"
    return "neutral"


# =============================================================================
# PUBLIC API FUNCTIONS
# =============================================================================

async def get_sector_rankings(top_n: int = 5) -> Dict:
    """
    Get ranked sectors by composite RS score.

    Returns:
        {
            "rankings": [...],
            "market_returns": {"1m": ..., "3m": ..., "6m": ...},
            "as_of": datetime,
            "top_n": int
        }
    """
    sector_returns, market_returns = _generate_sector_returns()

    rankings = []
    for sector_name, sector_info in SECTOR_DEFINITIONS.items():
        s_ret = sector_returns[sector_name]
        m_ret = market_returns

        rs_1m = compute_relative_strength(s_ret["1m"], m_ret["1m"])
        rs_3m = compute_relative_strength(s_ret["3m"], m_ret["3m"])
        rs_6m = compute_relative_strength(s_ret["6m"], m_ret["6m"])
        composite = compute_composite_rs(rs_1m, rs_3m, rs_6m)
        momentum = classify_momentum(rs_1m, rs_3m)

        rankings.append({
            "sector": sector_name,
            "color": sector_info["color"],
            "rs_1m": round(rs_1m, 3),
            "rs_3m": round(rs_3m, 3),
            "rs_6m": round(rs_6m, 3),
            "composite_rs": round(composite, 3),
            "momentum": momentum,
            "return_1m": round(s_ret["1m"] * 100, 2),
            "return_3m": round(s_ret["3m"] * 100, 2),
            "return_6m": round(s_ret["6m"] * 100, 2),
            "etf": sector_info.get("etf"),
        })

    # Sort by composite RS descending
    rankings.sort(key=lambda x: x["composite_rs"], reverse=True)

    # Add rank
    for i, r in enumerate(rankings):
        r["rank"] = i + 1

    return {
        "rankings": rankings,
        "market_returns": {
            "return_1m": round(market_returns["1m"] * 100, 2),
            "return_3m": round(market_returns["3m"] * 100, 2),
            "return_6m": round(market_returns["6m"] * 100, 2),
        },
        "as_of": datetime.utcnow().isoformat(),
        "top_n": top_n,
    }


async def get_sector_signals(top_n: int = 3) -> Dict:
    """
    Get momentum signals for top-N sectors with leading stocks.

    Returns top sectors to overweight with 3-5 stock picks each.
    """
    data = await get_sector_rankings(top_n)
    top_sectors = data["rankings"][:top_n]
    bottom_sectors = data["rankings"][-top_n:]

    signals = []
    for sector in top_sectors:
        stocks = _generate_stock_rs_scores(sector["sector"], sector["composite_rs"])
        # Pick top 3-5 stocks
        top_stocks = stocks[:min(5, len(stocks))]

        signals.append({
            "sector": sector["sector"],
            "color": sector["color"],
            "composite_rs": sector["composite_rs"],
            "momentum": sector["momentum"],
            "signal": "OVERWEIGHT",
            "top_stocks": top_stocks,
        })

    underweight = []
    for sector in bottom_sectors:
        underweight.append({
            "sector": sector["sector"],
            "color": sector["color"],
            "composite_rs": sector["composite_rs"],
            "momentum": sector["momentum"],
            "signal": "UNDERWEIGHT",
        })

    return {
        "overweight": signals,
        "underweight": underweight,
        "as_of": datetime.utcnow().isoformat(),
    }


async def get_rotation_suggestions(
    holdings: List[Dict],
    total_value: float,
    top_n: int = 3,
) -> Dict:
    """
    Generate buy/sell suggestions to rotate portfolio toward stronger sectors.

    Args:
        holdings: List of {"ticker": str, "current_value": float, ...}
        total_value: Total portfolio value
        top_n: Number of top sectors to rotate into

    Returns: Suggested trades and impact analysis
    """
    data = await get_sector_rankings(top_n)
    rankings = data["rankings"]

    # Map user holdings to sectors
    ticker_to_sector = {}
    for sector_name, sector_info in SECTOR_DEFINITIONS.items():
        for ticker in sector_info["stocks"]:
            ticker_to_sector[ticker] = sector_name

    # Current sector allocation
    current_allocation: Dict[str, float] = {}
    for h in holdings:
        sector = ticker_to_sector.get(h.get("ticker", ""), "Other")
        current_allocation[sector] = current_allocation.get(sector, 0) + h.get("current_value", 0)

    # Normalize to percentages
    if total_value > 0:
        current_pct = {s: round(v / total_value * 100, 1) for s, v in current_allocation.items()}
    else:
        current_pct = {}

    # Build target allocation: overweight top sectors, underweight bottom
    # Target: Top-N get 60% of portfolio equally, rest split remaining
    top_sectors = [r["sector"] for r in rankings[:top_n]]
    bottom_sectors = [r["sector"] for r in rankings[top_n:]]

    target_per_top = round(60.0 / top_n, 1)
    remaining = 40.0
    target_per_bottom = round(remaining / max(len(bottom_sectors), 1), 1)

    suggested_allocation: Dict[str, float] = {}
    for s in top_sectors:
        suggested_allocation[s] = target_per_top
    for s in bottom_sectors:
        suggested_allocation[s] = target_per_bottom

    # Generate trade suggestions
    trades = []
    for sector in set(list(current_pct.keys()) + list(suggested_allocation.keys())):
        curr = current_pct.get(sector, 0)
        target = suggested_allocation.get(sector, 0)
        diff = target - curr

        if abs(diff) < 1.0:
            continue  # Skip negligible changes

        trade_type = "BUY" if diff > 0 else "SELL"
        trade_value = abs(diff / 100 * total_value)

        # Pick specific stocks from this sector
        sector_info = SECTOR_DEFINITIONS.get(sector)
        suggested_stocks = []
        if sector_info:
            for ticker, stock_info in list(sector_info["stocks"].items())[:3]:
                suggested_stocks.append({
                    "ticker": ticker,
                    "name": stock_info["name"],
                })

        trades.append({
            "sector": sector,
            "trade_type": trade_type,
            "current_pct": curr,
            "target_pct": target,
            "diff_pct": round(diff, 1),
            "trade_value": round(trade_value, 2),
            "suggested_stocks": suggested_stocks,
        })

    # Sort: BUYs first, then by absolute diff
    trades.sort(key=lambda x: (0 if x["trade_type"] == "BUY" else 1, -abs(x["diff_pct"])))

    # Simulated impact
    rng = random.Random(datetime.utcnow().date().toordinal())
    expected_return_boost = round(rng.uniform(0.5, 3.0), 1)
    risk_change = round(rng.uniform(-1.0, 0.5), 1)

    return {
        "current_allocation": current_pct,
        "suggested_allocation": suggested_allocation,
        "trades": trades,
        "impact": {
            "expected_return_change_pct": expected_return_boost,
            "risk_change_pct": risk_change,
            "rationale": f"Rotating into top {top_n} RS sectors should improve risk-adjusted returns.",
        },
        "as_of": datetime.utcnow().isoformat(),
    }
