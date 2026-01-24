"""
Report Service - Email Summary Reports
=======================================
Generate and send periodic portfolio summary reports via email.
"""

from typing import Dict, Any
from datetime import datetime
from services.email_service import send_email


async def generate_portfolio_summary_html(
    user_name: str,
    portfolio_name: str,
    metrics: Dict[str, Any],
    top_performers: list,
    recent_activity: list
) -> str:
    """
    Generate HTML email content for portfolio summary.
    """
    total_value = metrics.get("total_value", 0)
    total_return = metrics.get("total_return", 0)
    return_percent = metrics.get("total_return_percent", 0)
    
    return_color = "#10B981" if total_return >= 0 else "#EF4444"
    return_sign = "+" if total_return >= 0 else ""
    
    # Top performers section
    performers_html = ""
    for p in top_performers[:5]:
        p_color = "#10B981" if p.get("profit_loss_percent", 0) >= 0 else "#EF4444"
        p_sign = "+" if p.get("profit_loss_percent", 0) >= 0 else ""
        performers_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">{p.get('ticker', '')}</td>
            <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">₹{p.get('current_value', 0):,.0f}</td>
            <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; color: {p_color};">{p_sign}{p.get('profit_loss_percent', 0):.1f}%</td>
        </tr>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F3F4F6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">OptiWealth</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Weekly Portfolio Summary</p>
            </div>
            
            <!-- Main Content -->
            <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px;">
                <p style="color: #374151; font-size: 16px;">Hi {user_name},</p>
                <p style="color: #6B7280; font-size: 14px;">Here's your weekly update for <strong>{portfolio_name}</strong>:</p>
                
                <!-- Portfolio Value Card -->
                <div style="background: #F9FAFB; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
                    <p style="color: #6B7280; margin: 0 0 8px 0; font-size: 14px;">Total Portfolio Value</p>
                    <h2 style="color: #111827; margin: 0; font-size: 36px;">₹{total_value:,.0f}</h2>
                    <p style="color: {return_color}; margin: 8px 0 0 0; font-size: 18px; font-weight: 600;">
                        {return_sign}₹{abs(total_return):,.0f} ({return_sign}{return_percent:.2f}%)
                    </p>
                </div>
                
                <!-- Top Holdings -->
                <h3 style="color: #111827; font-size: 18px; margin: 24px 0 16px 0;">Top Holdings</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #F3F4F6;">
                            <th style="padding: 12px; text-align: left; font-size: 12px; color: #6B7280;">TICKER</th>
                            <th style="padding: 12px; text-align: left; font-size: 12px; color: #6B7280;">VALUE</th>
                            <th style="padding: 12px; text-align: left; font-size: 12px; color: #6B7280;">RETURN</th>
                        </tr>
                    </thead>
                    <tbody>
                        {performers_html}
                    </tbody>
                </table>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:3000/dashboard" 
                       style="display: inline-block; background: #3B82F6; color: white; padding: 14px 28px; 
                              text-decoration: none; border-radius: 8px; font-weight: 600;">
                        View Full Dashboard
                    </a>
                </div>
                
                <!-- Footer -->
                <div style="border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 20px;">
                    <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0;">
                        Generated on {datetime.now().strftime('%B %d, %Y')}<br>
                        OptiWealth - Smart Portfolio Management
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html


async def send_weekly_summary(
    user_email: str,
    user_name: str,
    portfolio_name: str,
    metrics: Dict[str, Any],
    holdings: list
) -> bool:
    """
    Send weekly portfolio summary email.
    """
    # Sort holdings by value for top performers
    sorted_holdings = sorted(
        holdings,
        key=lambda x: x.get("current_value", 0),
        reverse=True
    )
    
    html_content = await generate_portfolio_summary_html(
        user_name=user_name,
        portfolio_name=portfolio_name,
        metrics=metrics,
        top_performers=sorted_holdings[:5],
        recent_activity=[]
    )
    
    return await send_email(
        to_email=user_email,
        subject=f"Your Weekly Portfolio Summary - {datetime.now().strftime('%b %d')}",
        html_content=html_content
    )
