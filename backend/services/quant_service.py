"""
OptiWealth Backend - Quantitative Finance Engine
=================================================
This module implements the core quantitative finance algorithms used for
portfolio analysis, risk assessment, and optimization. These are industry-standard
calculations drawn from Modern Portfolio Theory (MPT) and financial risk management.

Key Concepts Implemented:
- Returns & Volatility: Basic building blocks for all risk metrics
- Sharpe/Sortino Ratio: Risk-adjusted return measures
- Correlation & Covariance: Asset relationship analysis for diversification
- Beta & Alpha: CAPM-based systematic risk and excess return
- Efficient Frontier: MPT optimization for optimal risk-return tradeoff
- Monte Carlo: Stochastic simulation for VaR and future projections

Mathematical Foundation:
All calculations assume log-normal price distribution and use annualization
factor of 252 (trading days per year). Risk-free rate defaults to Indian
10-year government bond yield (~7.2%).
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from scipy import stats
from scipy.optimize import minimize
import math
from config import get_settings

settings = get_settings()


# =============================================================================
# RETURNS CALCULATIONS
# =============================================================================

def calculate_returns(prices: List[float]) -> List[float]:
    """
    Calculate simple daily returns from a price series.
    
    Formula: r_t = (P_t - P_{t-1}) / P_{t-1}
    
    Simple returns are additive across assets but not across time.
    Preferred for short-term analysis and portfolio weight calculations.
    """
    if len(prices) < 2:
        return []
    returns = []
    for i in range(1, len(prices)):
        if prices[i - 1] != 0:
            daily_return = (prices[i] - prices[i - 1]) / prices[i - 1]
            returns.append(daily_return)
    return returns


def calculate_log_returns(prices: List[float]) -> List[float]:
    """
    Calculate logarithmic (continuously compounded) returns.
    
    Formula: r_t = ln(P_t / P_{t-1})
    
    Log returns are additive across time (not assets), making them preferred
    for multi-period analysis and statistical modeling. They also better
    approximate normally distributed returns for pricing models.
    """
    if len(prices) < 2:
        return []
    returns = []
    for i in range(1, len(prices)):
        if prices[i - 1] > 0 and prices[i] > 0:
            returns.append(math.log(prices[i] / prices[i - 1]))
    return returns


def calculate_mean_return(returns: List[float], annualize: bool = True) -> float:
    """
    Calculate arithmetic mean of returns, optionally annualized.
    
    Annualization: Multiply daily mean by 252 (trading days per year).
    This assumes returns are i.i.d., which is an approximation.
    """
    if not returns:
        return 0.0
    mean = np.mean(returns)
    return mean * 252 if annualize else mean


def calculate_volatility(returns: List[float], annualize: bool = True) -> float:
    """
    Calculate volatility (standard deviation) of returns.
    
    Annualization: Multiply by sqrt(252) per the square-root-of-time rule.
    Uses ddof=1 for sample standard deviation (Bessel's correction).
    
    Volatility is the primary measure of total risk in finance.
    Higher volatility = wider range of possible outcomes.
    """
    if len(returns) < 2:
        return 0.0
    std = np.std(returns, ddof=1)
    return std * math.sqrt(252) if annualize else std


# =============================================================================
# RISK-ADJUSTED RETURN METRICS
# =============================================================================

def calculate_sharpe_ratio(
    portfolio_return: float,
    volatility: float,
    risk_free_rate: float = None
) -> float:
    """
    Calculate the Sharpe Ratio - excess return per unit of total risk.
    
    Formula: Sharpe = (R_p - R_f) / σ_p
    
    Interpretation:
    - Sharpe > 1.0: Good risk-adjusted return
    - Sharpe > 2.0: Very good
    - Sharpe > 3.0: Excellent (rare in real portfolios)
    
    Developed by William Sharpe (1966), Nobel laureate.
    This is the most widely used risk-adjusted performance measure.
    """
    if risk_free_rate is None:
        risk_free_rate = settings.RISK_FREE_RATE
    
    if volatility == 0:
        return 0.0
    
    return (portfolio_return - risk_free_rate) / volatility


def calculate_sortino_ratio(
    returns: List[float],
    risk_free_rate: float = None
) -> float:
    """
    Calculate Sortino Ratio - like Sharpe but only penalizes downside volatility.
    
    Formula: Sortino = (R_p - R_f) / σ_downside
    
    The Sortino ratio addresses a Sharpe limitation: upside volatility
    (positive surprises) shouldn't be penalized. Only negative returns
    below the target are included in the denominator.
    
    Better for asymmetric return distributions common in options, hedge funds.
    """
    if risk_free_rate is None:
        risk_free_rate = settings.RISK_FREE_RATE / 252
    
    if not returns:
        return 0.0
    
    excess_returns = [r - risk_free_rate for r in returns]
    negative_returns = [r for r in excess_returns if r < 0]
    
    if not negative_returns:
        return float('inf')  # No downside risk = perfect
    
    downside_deviation = np.std(negative_returns, ddof=1) * math.sqrt(252)
    mean_return = np.mean(returns) * 252
    
    if downside_deviation == 0:
        return 0.0
    
    return (mean_return - settings.RISK_FREE_RATE) / downside_deviation


# =============================================================================
# CORRELATION & COVARIANCE - DIVERSIFICATION ANALYSIS
# =============================================================================

def calculate_covariance(returns1: List[float], returns2: List[float]) -> float:
    """
    Calculate covariance between two return series.
    
    Covariance measures how two assets move together. Positive covariance
    means they tend to move in the same direction; negative means opposite.
    Used in portfolio variance calculation and MPT optimization.
    """
    if len(returns1) != len(returns2) or len(returns1) < 2:
        return 0.0
    return np.cov(returns1, returns2)[0][1]


def calculate_correlation(returns1: List[float], returns2: List[float]) -> float:
    """
    Calculate Pearson correlation coefficient between two return series.
    
    Range: [-1, +1]
    - +1: Perfect positive correlation (assets move together)
    - 0: No linear relationship
    - -1: Perfect negative correlation (assets move opposite)
    
    Lower correlations between assets = better diversification benefits.
    Markowitz showed that diversification reduces risk without sacrificing return.
    """
    if len(returns1) != len(returns2) or len(returns1) < 2:
        return 0.0
    correlation, _ = stats.pearsonr(returns1, returns2)
    return correlation if not math.isnan(correlation) else 0.0


def calculate_correlation_matrix(assets: Dict[str, List[float]]) -> List[Dict]:
    """
    Build a correlation matrix for multiple assets.
    
    Returns a list of correlation pairs for heatmap visualization.
    The matrix is symmetric (corr(A,B) = corr(B,A)) so we only compute
    the upper triangle to avoid redundant calculations.
    """
    tickers = list(assets.keys())
    result = []
    
    for i, ticker1 in enumerate(tickers):
        for j, ticker2 in enumerate(tickers):
            if i <= j:
                if i == j:
                    correlation = 1.0
                else:
                    correlation = calculate_correlation(assets[ticker1], assets[ticker2])
                
                result.append({
                    "asset1": ticker1,
                    "asset2": ticker2,
                    "correlation": round(correlation, 4)
                })
    
    return result


def calculate_covariance_matrix(assets: Dict[str, List[float]]) -> np.ndarray:
    """
    Compute the variance-covariance matrix for portfolio optimization.
    
    This N×N matrix contains variances on the diagonal and covariances
    off-diagonal. It's the key input for Markowitz mean-variance optimization.
    Annualized by multiplying by 252 trading days.
    """
    tickers = list(assets.keys())
    n = len(tickers)
    
    if n == 0:
        return np.array([])
    
    returns_matrix = np.array([assets[t] for t in tickers])
    return np.cov(returns_matrix) * 252  # Annualize


# =============================================================================
# CAPM METRICS - SYSTEMATIC RISK
# =============================================================================

def calculate_beta(asset_returns: List[float], market_returns: List[float]) -> float:
    """
    Calculate Beta - measure of systematic (market) risk.
    
    Formula: β = Cov(R_asset, R_market) / Var(R_market)
    
    Interpretation:
    - β = 1.0: Asset moves exactly with the market
    - β > 1.0: Asset is more volatile than market (aggressive)
    - β < 1.0: Asset is less volatile than market (defensive)
    - β < 0: Asset moves opposite to market (rare, e.g., gold sometimes)
    
    From CAPM theory by Sharpe, Lintner, and Mossin (1960s).
    NIFTYBEES is used as market proxy for Indian equities.
    """
    if len(asset_returns) != len(market_returns) or len(asset_returns) < 2:
        return 1.0  # Default to market beta
    
    market_var = np.var(market_returns, ddof=1)
    if market_var == 0:
        return 1.0
    
    covariance = calculate_covariance(asset_returns, market_returns)
    return covariance / market_var


def calculate_alpha(
    portfolio_return: float,
    market_return: float,
    beta: float,
    risk_free_rate: float = None
) -> float:
    """
    Calculate Jensen's Alpha - excess return over CAPM expected return.
    
    Formula: α = R_p - [R_f + β(R_m - R_f)]
    
    Alpha represents the value added (or destroyed) by active management.
    Positive alpha means the portfolio outperformed its risk-adjusted benchmark.
    
    Interpretation:
    - α > 0: Manager adds value (outperformance)
    - α = 0: Performance matches expected for given risk
    - α < 0: Underperformance vs risk-adjusted expectation
    """
    if risk_free_rate is None:
        risk_free_rate = settings.RISK_FREE_RATE
    
    expected_return = risk_free_rate + beta * (market_return - risk_free_rate)
    return portfolio_return - expected_return


# =============================================================================
# RISK METRICS - DRAWDOWN & VAR
# =============================================================================

def calculate_max_drawdown(prices: List[float]) -> float:
    """
    Calculate Maximum Drawdown - largest peak-to-trough decline.
    
    Formula: MDD = max((Peak - Trough) / Peak) for all peaks
    
    Max drawdown represents the worst-case loss an investor would have
    experienced if they bought at the peak and sold at the trough.
    
    Key risk metric for evaluating downside protection and recovery time.
    A 50% drawdown requires 100% gain to recover (asymmetric returns).
    """
    if not prices:
        return 0.0
    
    peak = prices[0]
    max_dd = 0.0
    
    for price in prices:
        if price > peak:
            peak = price
        drawdown = (peak - price) / peak if peak > 0 else 0
        max_dd = max(max_dd, drawdown)
    
    return max_dd


def calculate_var(returns: List[float], confidence: float = 0.95) -> float:
    """
    Calculate Value at Risk (VaR) using historical simulation.
    
    VaR answers: "What is the maximum expected loss at a given confidence level?"
    
    At 95% confidence, VaR is the 5th percentile of the return distribution.
    This means there's a 5% chance of losses exceeding this amount.
    
    Used by banks and regulators for capital requirements.
    Limitation: Doesn't capture tail risk beyond the VaR threshold.
    """
    if not returns:
        return 0.0
    
    return np.percentile(returns, (1 - confidence) * 100)


# =============================================================================
# PORTFOLIO OPTIMIZATION - MODERN PORTFOLIO THEORY (MPT)
# =============================================================================

def calculate_portfolio_return(weights: np.ndarray, expected_returns: np.ndarray) -> float:
    """
    Calculate expected portfolio return as weighted average of asset returns.
    Formula: R_p = Σ(w_i × R_i)
    """
    return np.dot(weights, expected_returns)


def calculate_portfolio_volatility(weights: np.ndarray, cov_matrix: np.ndarray) -> float:
    """
    Calculate portfolio volatility from weights and covariance matrix.
    
    Formula: σ_p = sqrt(w^T × Σ × w)
    
    This is the key insight of Markowitz (1952): portfolio risk is NOT
    the weighted average of individual risks, but depends on correlations.
    Diversification works because portfolio volatility < weighted avg volatility
    when assets aren't perfectly correlated.
    """
    return math.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))


def optimize_portfolio_sharpe(
    expected_returns: np.ndarray,
    cov_matrix: np.ndarray,
    risk_free_rate: float = None
) -> Tuple[np.ndarray, float]:
    """
    Find the Maximum Sharpe Ratio Portfolio (Tangency Portfolio).
    
    Uses Sequential Least Squares Programming (SLSQP) to solve:
        maximize: (R_p - R_f) / σ_p
        subject to: Σw_i = 1, 0 ≤ w_i ≤ 1 (no short selling)
    
    The tangency portfolio is the point where a line from the risk-free
    rate is tangent to the efficient frontier - optimal risk-return tradeoff.
    This is what a rational investor would choose according to MPT.
    """
    if risk_free_rate is None:
        risk_free_rate = settings.RISK_FREE_RATE
    
    n = len(expected_returns)
    
    def neg_sharpe(weights):
        port_return = calculate_portfolio_return(weights, expected_returns)
        port_vol = calculate_portfolio_volatility(weights, cov_matrix)
        if port_vol == 0:
            return 0
        return -(port_return - risk_free_rate) / port_vol
    
    constraints = {'type': 'eq', 'fun': lambda w: np.sum(w) - 1}
    bounds = tuple((0, 1) for _ in range(n))
    initial_weights = np.array([1/n] * n)
    
    result = minimize(
        neg_sharpe,
        initial_weights,
        method='SLSQP',
        bounds=bounds,
        constraints=constraints
    )
    
    optimal_weights = result.x
    optimal_sharpe = -result.fun
    
    return optimal_weights, optimal_sharpe


def optimize_portfolio_min_volatility(
    expected_returns: np.ndarray,
    cov_matrix: np.ndarray,
    target_return: float = None
) -> np.ndarray:
    """
    Find the Minimum Volatility Portfolio for a given target return.
    
    This traces out points on the efficient frontier by solving:
        minimize: σ_p (portfolio volatility)
        subject to: Σw_i = 1, R_p = target, 0 ≤ w_i ≤ 1
    
    Called repeatedly with different target returns to build the frontier.
    The leftmost point (no target constraint) is the Global Minimum Variance portfolio.
    """
    n = len(expected_returns)
    
    def portfolio_vol(weights):
        return calculate_portfolio_volatility(weights, cov_matrix)
    
    constraints = [{'type': 'eq', 'fun': lambda w: np.sum(w) - 1}]
    
    if target_return is not None:
        constraints.append({
            'type': 'eq',
            'fun': lambda w: calculate_portfolio_return(w, expected_returns) - target_return
        })
    
    bounds = tuple((0, 1) for _ in range(n))
    initial_weights = np.array([1/n] * n)
    
    result = minimize(
        portfolio_vol,
        initial_weights,
        method='SLSQP',
        bounds=bounds,
        constraints=constraints
    )
    
    return result.x


def calculate_efficient_frontier(
    expected_returns: np.ndarray,
    cov_matrix: np.ndarray,
    num_points: int = 50
) -> List[Dict]:
    """
    Generate the Efficient Frontier curve.
    
    The efficient frontier is the set of portfolios that offer:
    - Maximum return for a given level of risk, OR
    - Minimum risk for a given level of return
    
    All rational investors should choose portfolios ON the frontier.
    Portfolios below are suboptimal (same risk, less return).
    
    Implementation: Sweep through target returns from min to max,
    solving the min-volatility problem at each point.
    """
    min_ret = min(expected_returns)
    max_ret = max(expected_returns)
    
    target_returns = np.linspace(min_ret * 0.9, max_ret * 1.1, num_points)
    frontier_points = []
    
    for target in target_returns:
        try:
            weights = optimize_portfolio_min_volatility(expected_returns, cov_matrix, target)
            port_return = calculate_portfolio_return(weights, expected_returns)
            port_vol = calculate_portfolio_volatility(weights, cov_matrix)
            sharpe = calculate_sharpe_ratio(port_return, port_vol)
            
            frontier_points.append({
                "expected_return": round(port_return * 100, 2),
                "volatility": round(port_vol * 100, 2),
                "sharpe_ratio": round(sharpe, 2),
                "weights": {f"asset_{i}": round(w, 4) for i, w in enumerate(weights)}
            })
        except:
            continue
    
    return frontier_points


# =============================================================================
# MONTE CARLO SIMULATION - STOCHASTIC FORECASTING
# =============================================================================

def monte_carlo_simulation(
    initial_value: float,
    expected_return: float,
    volatility: float,
    days: int = 252,
    simulations: int = 1000
) -> Dict:
    """
    Run Monte Carlo simulation for portfolio value projection.
    
    Uses Geometric Brownian Motion (GBM) model:
        dS = μS dt + σS dW
    
    Discretized: S_{t+1} = S_t × exp((μ - σ²/2)Δt + σ√Δt × Z)
    where Z ~ N(0,1)
    
    The -σ²/2 term is the Ito correction for continuous compounding.
    
    Output includes percentile bands (5th to 95th) for confidence intervals
    and Value at Risk (VaR) as the 5th percentile of final values.
    
    Use cases:
    - Retirement planning: "What's the range of outcomes in 10 years?"
    - Risk assessment: "What's the worst 5% scenario?"
    """
    dt = 1 / 252  # Daily time step (fraction of year)
    
    all_paths = []
    for _ in range(simulations):
        prices = [initial_value]
        for _ in range(days):
            # GBM step with Ito correction
            daily_return = (expected_return - 0.5 * volatility**2) * dt + \
                          volatility * math.sqrt(dt) * np.random.normal()
            new_price = prices[-1] * math.exp(daily_return)
            prices.append(new_price)
        all_paths.append(prices)
    
    paths_array = np.array(all_paths)
    
    # Calculate percentile bands at each time step
    percentile_5 = np.percentile(paths_array, 5, axis=0).tolist()
    percentile_25 = np.percentile(paths_array, 25, axis=0).tolist()
    percentile_50 = np.percentile(paths_array, 50, axis=0).tolist()
    percentile_75 = np.percentile(paths_array, 75, axis=0).tolist()
    percentile_95 = np.percentile(paths_array, 95, axis=0).tolist()
    
    final_values = paths_array[:, -1]
    expected_value = np.mean(final_values)
    var_95 = initial_value - np.percentile(final_values, 5)  # Loss vs initial
    
    return {
        "percentile_5": percentile_5,
        "percentile_25": percentile_25,
        "percentile_50": percentile_50,
        "percentile_75": percentile_75,
        "percentile_95": percentile_95,
        "expected_value": expected_value,
        "var_95": var_95
    }


# =============================================================================
# COMPOSITE RISK SCORING
# =============================================================================

def calculate_risk_score(volatility: float, max_drawdown: float, beta: float) -> Tuple[float, str]:
    """
    Calculate a composite risk score (1-10) from multiple risk factors.
    
    Combines three risk dimensions:
    - Volatility (50% weight): Total price fluctuation
    - Max Drawdown (30% weight): Worst historical loss
    - Beta (20% weight): Market sensitivity
    
    Each factor is normalized to 0-10 scale then weighted.
    The final score maps to risk levels: Low (1-3), Medium (4-6), High (7-10).
    
    This provides a single, intuitive number for non-technical users.
    """
    vol_score = min(volatility / 0.4, 1) * 10  # 40% annual vol = max risk
    dd_score = min(max_drawdown / 0.5, 1) * 10  # 50% drawdown = max risk
    beta_score = min(abs(beta) / 2, 1) * 10  # Beta of 2 = max risk
    
    risk_score = 0.5 * vol_score + 0.3 * dd_score + 0.2 * beta_score
    risk_score = max(1, min(10, risk_score))
    
    if risk_score <= 3:
        risk_level = "Low"
    elif risk_score <= 6:
        risk_level = "Medium"
    else:
        risk_level = "High"
    
    return round(risk_score, 1), risk_level


def calculate_diversification_score(correlation_matrix: List[Dict]) -> float:
    """
    Calculate a diversification score (0-100) based on asset correlations.
    
    Lower average correlation = better diversification = higher score.
    
    Formula: Score = (1 - avg|correlation|) × 100
    
    Interpretation:
    - 80-100: Excellent diversification (low correlations)
    - 60-80: Good diversification
    - 40-60: Moderate (some concentration risk)
    - 0-40: Poor (assets move together, limited diversification benefit)
    """
    if not correlation_matrix:
        return 0.0
    
    # Only use off-diagonal correlations (exclude self-correlations)
    correlations = [
        c["correlation"] for c in correlation_matrix 
        if c["asset1"] != c["asset2"]
    ]
    
    if not correlations:
        return 100.0  # Single asset
    
    avg_correlation = np.mean(np.abs(correlations))
    
    return round((1 - avg_correlation) * 100, 1)
