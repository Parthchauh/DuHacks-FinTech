import httpx
from config import get_settings
from typing import Optional, List, Dict, Any
import json

settings = get_settings()

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

async def send_email(
    to_email: str,
    subject: str,
    body_html: str,
    body_text: Optional[str] = None
) -> bool:
    """
    Send an email using Brevo HTTP API v3.
    Use this instead of SMTP for better reliability and detailed error responses.
    """
    
    if not settings.SMTP_PASSWORD:
        print("[ERROR] Email not configured - API Key (SMTP_PASSWORD) missing")
        return False
        
    # Headers for Brevo API
    headers = {
        "accept": "application/json",
        "api-key": settings.SMTP_PASSWORD,
        "content-type": "application/json"
    }
    
    # Construct payload
    payload = {
        "sender": {
            "name": settings.APP_NAME,
            "email": settings.FROM_EMAIL
        },
        "to": [
            {
                "email": to_email
            }
        ],
        "subject": subject,
        "htmlContent": body_html
    }
    
    if body_text:
        payload["textContent"] = body_text

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                BREVO_API_URL,
                headers=headers,
                json=payload,
                timeout=10.0
            )
            
            if response.status_code in (200, 201, 202):
                print(f"[SUCCESS] Email sent successfully to {to_email}")
                return True
            else:
                print(f"[ERROR] Failed to send email via API: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print(f"[ERROR] Exception sending email: {str(e)}")
        return False



async def send_welcome_email(to_email: str, user_name: str) -> bool:
    """Send welcome email to new users"""
    
    subject = "Welcome to OptiWealth"
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }}
            .container {{ max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }}
            .header {{ background: #2563eb; padding: 32px; text-align: center; }}
            .header h1 {{ color: white; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }}
            .content {{ padding: 40px; }}
            .feature-list {{ background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 24px 0; }}
            .feature-item {{ display: flex; align-items: flex-start; margin-bottom: 16px; }}
            .feature-item:last-child {{ margin-bottom: 0; }}
            .bullet {{ width: 6px; height: 6px; background: #2563eb; border-radius: 50%; margin-top: 10px; margin-right: 12px; flex-shrink: 0; }}
            .button {{ display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin-top: 24px; font-weight: 500; font-size: 16px; text-align: center; width: 100%; box-sizing: border-box; }}
            .footer {{ text-align: center; padding: 32px; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }}
            .highlight {{ color: #2563eb; font-weight: 600; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to OptiWealth</h1>
            </div>
            <div class="content">
                <p style="margin-top: 0; font-size: 16px;">Hi {user_name},</p>
                <p>Thank you for joining OptiWealth. We are excited to help you optimize your investment journey.</p>
                
                <div class="feature-list">
                    <div style="font-weight: 600; margin-bottom: 16px; color: #0f172a;">What you can do with OptiWealth:</div>
                    <div class="feature-item">
                        <div class="bullet"></div>
                        <div><strong>Portfolio Tracking:</strong> Monitor your investments with real-time analytics.</div>
                    </div>
                    <div class="feature-item">
                        <div class="bullet"></div>
                        <div><strong>Risk Analysis:</strong> Understand your exposure with advanced metrics like Sharpe Ratio and Beta.</div>
                    </div>
                    <div class="feature-item">
                        <div class="bullet"></div>
                        <div><strong>Smart Rebalancing:</strong> Get AI-driven suggestions to maintain your target allocation.</div>
                    </div>
                    <div class="feature-item">
                        <div class="bullet"></div>
                        <div><strong>Monte Carlo Simulations:</strong> Project future performance based on historical volatility.</div>
                    </div>
                </div>
                
                <a href="{settings.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
            </div>
            <div class="footer">
                <p>&copy; 2026 OptiWealth. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    body_text = f"""
    Welcome to OptiWealth!
    
    Hi {user_name},
    
    Thank you for joining OptiWealth.
    
    You can now:
    - Track your portfolio
    - Analyze risk metrics
    - Optimize allocations
    - Run market simulations
    
    Access your dashboard here: {settings.FRONTEND_URL}/dashboard
    """
    
    return await send_email(to_email, subject, body_html, body_text)


async def send_password_reset_email(to_email: str, user_name: str, reset_link: str) -> bool:
    """Send password reset email with secure link"""
    
    subject = "Reset Your Password"
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; }}
            .container {{ max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; overflow: hidden; }}
            .header {{ padding: 32px 32px 0 32px; text-align: center; }}
            .content {{ padding: 32px; }}
            .button {{ display: inline-block; background: #2563eb; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px; margin: 24px 0; text-align: center; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }}
            .warning {{ background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; padding: 12px; border-radius: 8px; font-size: 14px; margin-top: 16px; text-align: center; }}
            .footer {{ text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0; color: #0f172a;">Password Reset Request</h2>
            </div>
            <div class="content">
                <p>Hi {user_name},</p>
                <p>We received a request to reset the password for your OptiWealth account.</p>
                <p style="text-align: center;">
                    <a href="{reset_link}" class="button">Reset Password</a>
                </p>
                <div class="warning">
                    This link is valid for 1 hour.
                </div>
                <p style="color: #64748b; font-size: 14px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>OptiWealth Security Team</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    body_text = f"Reset your password here: {reset_link}"
    
    return await send_email(to_email, subject, body_html, body_text)


async def send_mfa_otp_email(to_email: str, user_name: str, otp: str) -> bool:
    """Send MFA OTP email"""
    
    subject = "Login Verification Code"
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; }}
            .container {{ max-width: 450px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; overflow: hidden; }}
            .header {{ background: #0f172a; color: white; padding: 24px; text-align: center; }}
            .content {{ padding: 32px; text-align: center; }}
            .otp-box {{ background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; margin: 24px 0; }}
            .otp {{ font-family: 'Monaco', 'Consolas', monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #0f172a; display: block; }}
            .footer {{ text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0; font-size: 20px;">Verification Code</h2>
            </div>
            <div class="content">
                <p style="margin-top: 0;">Hi {user_name},</p>
                <p>Use this code to complete your login:</p>
                <div class="otp-box">
                    <span class="otp">{otp}</span>
                </div>
                <p style="font-size: 14px; color: #64748b;">This code expires in 10 minutes.</p>
                <p style="font-size: 14px; color: #64748b; margin-top: 24px;">Don't share this code with anyone.</p>
            </div>
            <div class="footer">
                <p>OptiWealth Security</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(to_email, subject, body_html, f"Your verification code is: {otp}")


async def send_password_change_success_email(to_email: str, user_name: str) -> bool:
    """Send notification that password was changed successfully"""
    
    subject = "Security Alert: Password Changed"
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; }}
            .container {{ max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; overflow: hidden; }}
            .header {{ background: #2563eb; padding: 24px; text-align: center; }}
            .content {{ padding: 32px; }}
            .footer {{ text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0; color: white; font-size: 20px;">Password Changed</h2>
            </div>
            <div class="content">
                <p style="margin-top: 0;">Hi {user_name},</p>
                <p>Your OptiWealth account password was successfully changed just now.</p>
                <p>If you did this, you can safely ignore this email.</p>
                <p style="color: #dc2626; font-weight: 500; margin-top: 24px;">If you did not make this change, please recover your account immediately.</p>
            </div>
            <div class="footer">
                <p>OptiWealth Security Team</p>
            </div>
        </div>
    </body>
    </html>
    """
    
async def send_account_deleted_email(to_email: str, user_name: str) -> bool:
    """Send confirmation of account deletion"""
    
    subject = "OptiWealth Account Deleted"
    
    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; }}
            .container {{ max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; overflow: hidden; }}
            .header {{ background: #dc2626; padding: 24px; text-align: center; }}
            .content {{ padding: 32px; }}
            .footer {{ text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0; color: white; font-size: 20px;">Account Deleted</h2>
            </div>
            <div class="content">
                <p style="margin-top: 0;">Hi {user_name},</p>
                <p>As requested, your OptiWealth account and all associated data have been permanently deleted.</p>
                <p>We are sorry to see you go. If you decide to come back, you will need to create a new account.</p>
                <p style="margin-top: 24px;">Thank you for giving us a try.</p>
            </div>
            <div class="footer">
                <p>OptiWealth Team</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(to_email, subject, body_html, "Your account has been deleted.")

