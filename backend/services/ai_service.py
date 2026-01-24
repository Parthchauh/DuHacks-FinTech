"""
AI Service - Portfolio Analysis and Suggestions
================================================
Provides AI-powered portfolio recommendations using OpenAI or Claude API.
Falls back to rule-based suggestions if no API key configured.
"""

import os
from typing import List, Dict, Any
import httpx


async def analyze_portfolio_with_ai(
    holdings: List[Dict[str, Any]],
    metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Analyze portfolio and generate AI-powered suggestions.
    Uses OpenAI API if available, otherwise falls back to rules.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    
    if api_key:
        return await _openai_analysis(holdings, metrics, api_key)
    else:
        return _rule_based_analysis(holdings, metrics)


async def _openai_analysis(
    holdings: List[Dict[str, Any]],
    metrics: Dict[str, Any],
    api_key: str
) -> Dict[str, Any]:
    """Use OpenAI API for portfolio analysis"""
    try:
        # Build portfolio summary
        holdings_summary = "\n".join([
            f"- {h.get('ticker')}: {h.get('actual_allocation', 0):.1f}% allocation, "
            f"{h.get('profit_loss_percent', 0):.1f}% return"
            for h in holdings[:10]
        ])
        
        prompt = f"""Analyze this Indian stock portfolio and provide 3-5 actionable suggestions:

Portfolio Value: ₹{metrics.get('total_value', 0):,.0f}
Total Return: {metrics.get('total_return_percent', 0):.2f}%
Risk Score: {metrics.get('risk_score', 5)}/10
Sharpe Ratio: {metrics.get('sharpe_ratio', 0):.2f}

Holdings:
{holdings_summary}

Provide suggestions in JSON format:
{{
  "overall_health": "good/moderate/needs_attention",
  "suggestions": [
    {{"type": "rebalance/add/reduce/hold", "ticker": "SYMBOL", "action": "Brief action", "reason": "Brief reason"}}
  ],
  "summary": "One sentence portfolio summary"
}}"""

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7,
                    "max_tokens": 500
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                # Parse JSON from response
                import json
                # Try to extract JSON from response
                if "{" in content:
                    json_start = content.index("{")
                    json_end = content.rindex("}") + 1
                    return json.loads(content[json_start:json_end])
            
    except Exception as e:
        print(f"[AI] OpenAI analysis failed: {e}")
    
    return _rule_based_analysis(holdings, metrics)


def _rule_based_analysis(
    holdings: List[Dict[str, Any]],
    metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """Rule-based portfolio analysis as fallback"""
    suggestions = []
    
    total_value = metrics.get("total_value", 0)
    risk_score = metrics.get("risk_score", 5)
    sharpe = metrics.get("sharpe_ratio", 0)
    
    # Check for over-concentration
    for h in holdings:
        allocation = h.get("actual_allocation", 0)
        if allocation > 30:
            suggestions.append({
                "type": "reduce",
                "ticker": h.get("ticker"),
                "action": f"Consider reducing position (currently {allocation:.1f}%)",
                "reason": "Single position exceeds 30% - concentration risk"
            })
    
    # Check for underperformers
    for h in holdings:
        pl_pct = h.get("profit_loss_percent", 0)
        if pl_pct < -20:
            suggestions.append({
                "type": "review",
                "ticker": h.get("ticker"),
                "action": "Review this position",
                "reason": f"Significant loss of {abs(pl_pct):.1f}% - consider tax-loss harvesting"
            })
    
    # Check risk level
    if risk_score >= 8:
        suggestions.append({
            "type": "rebalance",
            "ticker": None,
            "action": "Consider adding defensive assets",
            "reason": "High risk score indicates portfolio may be too aggressive"
        })
    
    # Sharpe ratio check
    if sharpe < 0.5:
        suggestions.append({
            "type": "optimize",
            "ticker": None,
            "action": "Review asset allocation",
            "reason": "Low Sharpe ratio suggests poor risk-adjusted returns"
        })
    
    # Determine overall health
    if len(suggestions) == 0:
        health = "good"
        summary = "Your portfolio is well balanced with good risk-adjusted returns."
    elif len(suggestions) <= 2:
        health = "moderate"
        summary = "Your portfolio has some areas that could be optimized."
    else:
        health = "needs_attention"
        summary = "Your portfolio requires attention on multiple fronts."
    
    return {
        "overall_health": health,
        "suggestions": suggestions[:5],
        "summary": summary
    }


async def explain_recommendation(
    ticker: str,
    action: str,
    context: Dict[str, Any]
) -> str:
    """Generate detailed explanation for a recommendation"""
    return f"""
**Recommendation for {ticker}: {action}**

Based on your portfolio analysis, we recommend this action because:

1. **Current Position**: {ticker} represents {context.get('allocation', 0):.1f}% of your portfolio
2. **Performance**: {context.get('return', 0):+.1f}% return since purchase
3. **Risk Factor**: This position contributes {context.get('risk_contribution', 'normal')} risk to your portfolio

**Action Steps**:
- Review the recommendation carefully
- Consider your personal risk tolerance
- Consult a financial advisor for personalized advice

*This is AI-generated analysis and not financial advice.*
"""
