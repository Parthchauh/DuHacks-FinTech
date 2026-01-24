"""
Scheduler Service - Automated Portfolio Reports
================================================
Uses APScheduler to send periodic portfolio summary emails.

Features:
- Weekly portfolio performance summary
- Monthly detailed report
- Drift alert checks every 6 hours

Schedule runs in background thread, survives request cycles.
"""

import os
import asyncio
import json
from datetime import datetime, timedelta
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

# These will be imported when scheduler starts
# to avoid circular imports during module load


class SchedulerService:
    """
    Background task scheduler for automated notifications.
    
    Uses APScheduler BackgroundScheduler which runs in a separate
    thread, allowing async FastAPI to continue handling requests.
    """
    
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.initialized = False
    
    def start(self, db_session_factory):
        """
        Start scheduler with database session factory.
        Called once during application startup.
        """
        if self.initialized:
            return
        
        self.db_factory = db_session_factory
        
        # Weekly summary - Every Monday at 9 AM
        self.scheduler.add_job(
            self._send_weekly_summaries,
            CronTrigger(day_of_week='mon', hour=9, minute=0),
            id='weekly_summary',
            replace_existing=True
        )
        
        # Daily summary - Every weekday at 5 PM (Market Close)
        self.scheduler.add_job(
            self._send_daily_summaries,
            CronTrigger(day_of_week='mon-fri', hour=17, minute=0),
            id='daily_summary',
            replace_existing=True
        )
        
        # Monthly report - 1st of each month at 9 AM
        self.scheduler.add_job(
            self._send_monthly_reports,
            CronTrigger(day=1, hour=9, minute=0),
            id='monthly_report',
            replace_existing=True
        )
        
        # Drift check - Every 6 hours
        self.scheduler.add_job(
            self._check_portfolio_drifts,
            CronTrigger(hour='*/6'),
            id='drift_check',
            replace_existing=True
        )
        
        self.scheduler.start()
        self.initialized = True
        print("[SCHEDULER] Background scheduler started")
    
    def shutdown(self):
        """Gracefully shutdown scheduler."""
        if self.scheduler.running:
            self.scheduler.shutdown()
            print("[SCHEDULER] Scheduler stopped")
    
    def _send_weekly_summaries(self):
        """Send weekly portfolio summary to all opted-in users."""
        from database import SessionLocal
        from services.email_service import send_email
        import models
        
        print(f"[SCHEDULER] Running weekly summary job at {datetime.utcnow()}")
        
        db = SessionLocal()
        try:
            # Get users with enabled reports and weekly frequency
            users = db.query(models.User).filter(
                models.User.is_active == True
            ).all()
            
            count = 0
            for user in users:
                prefs = user.email_preferences and json.loads(user.email_preferences) if isinstance(user.email_preferences, str) else (user.email_preferences or {})
                
                # Check if enabled (default false now for safety, or check UI logic)
                enabled = prefs.get("enabled", False)
                frequency = prefs.get("frequency", "weekly")
                
                if enabled and frequency == "weekly":
                    # Get portfolio summary
                    portfolio = db.query(models.Portfolio).filter(
                        models.Portfolio.user_id == user.id,
                        models.Portfolio.is_default == True
                    ).first()
                    
                    if portfolio:
                        asyncio.run(self._send_summary_email(user, portfolio, "Weekly"))
                        count += 1
            
            print(f"[SCHEDULER] Weekly summaries sent to {count} users")
        except Exception as e:
            print(f"[SCHEDULER] Weekly summary error: {e}")
        finally:
            db.close()

    def _send_daily_summaries(self):
        """Send daily portfolio summary to users who opted for daily frequency."""
        from database import SessionLocal
        import models
        import json
        
        print(f"[SCHEDULER] Running daily summary job at {datetime.utcnow()}")
        
        db = SessionLocal()
        try:
            users = db.query(models.User).filter(models.User.is_active == True).all()
            
            count = 0
            for user in users:
                # Handle both string (JSON) and dict (if DB driver auto-converts already, but SQLAlchemy Text is usually string)
                prefs = user.email_preferences
                if isinstance(prefs, str):
                    try:
                        prefs = json.loads(prefs)
                    except:
                        prefs = {}
                elif prefs is None:
                    prefs = {}
                    
                enabled = prefs.get("enabled", False)
                frequency = prefs.get("frequency", "weekly")
                
                if enabled and frequency == "daily":
                    portfolio = db.query(models.Portfolio).filter(
                        models.Portfolio.user_id == user.id,
                        models.Portfolio.is_default == True
                    ).first()
                    
                    if portfolio:
                        asyncio.run(self._send_summary_email(user, portfolio, "Daily"))
                        count += 1
                        
            print(f"[SCHEDULER] Daily summaries sent to {count} users")
        except Exception as e:
            print(f"[SCHEDULER] Daily summary error: {e}")
        finally:
            db.close()
    
    def _send_monthly_reports(self):
        """Send detailed monthly performance report."""
        from database import SessionLocal
        import models
        
        print(f"[SCHEDULER] Running monthly report job at {datetime.utcnow()}")
        
        db = SessionLocal()
        try:
            users = db.query(models.User).filter(
                models.User.is_active == True
            ).all()
            
            for user in users:
                prefs = user.email_preferences or {}
                if prefs.get("monthly_report", True):
                    # Send monthly report (more detailed than weekly)
                    pass  # TODO: Implement detailed monthly report
            
            print(f"[SCHEDULER] Monthly reports processed for {len(users)} users")
        except Exception as e:
            print(f"[SCHEDULER] Monthly report error: {e}")
        finally:
            db.close()
    
    def _check_portfolio_drifts(self):
        """Check all portfolios for drift and send alerts."""
        from database import SessionLocal
        from services.notification_service import notification_service
        import models
        
        print(f"[SCHEDULER] Running drift check at {datetime.utcnow()}")
        
        db = SessionLocal()
        try:
            # Get users with drift alerts enabled
            users = db.query(models.User).filter(
                models.User.is_active == True
            ).all()
            
            for user in users:
                prefs = user.email_preferences or {}
                if prefs.get("drift_alert_enabled", True):
                    chat_id = prefs.get("telegram_chat_id")
                    threshold = prefs.get("drift_threshold", 5.0)
                    
                    if chat_id:
                        # Check portfolio drift
                        portfolio = db.query(models.Portfolio).filter(
                            models.Portfolio.user_id == user.id,
                            models.Portfolio.is_default == True
                        ).first()
                        
                        if portfolio:
                            # Calculate drift (simplified)
                            holdings = db.query(models.Holding).filter(
                                models.Holding.portfolio_id == portfolio.id
                            ).all()
                            
                            drifts = []
                            for h in holdings:
                                drift = abs(h.target_allocation - (h.quantity * h.avg_buy_price / 100000 * 100))
                                if drift > threshold:
                                    drifts.append({
                                        "ticker": h.ticker,
                                        "drift": drift
                                    })
                            
                            if drifts:
                                asyncio.run(notification_service.send_drift_alert(
                                    chat_id,
                                    user.full_name,
                                    max(d["drift"] for d in drifts),
                                    drifts[:5]
                                ))
            
            print("[SCHEDULER] Drift check completed")
        except Exception as e:
            print(f"[SCHEDULER] Drift check error: {e}")
        finally:
            db.close()
    
    async def _send_summary_email(self, user, portfolio, report_type="Weekly"):
        """Send portfolio summary email to user."""
        from services.email_service import send_email
        
        subject = f"📊 {report_type} Portfolio Summary - OptiWealth"
        
        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; text-align: center;">
                <h1>{report_type} Portfolio Summary</h1>
            </div>
            <div style="padding: 20px;">
                <p>Hi {user.full_name},</p>
                <p>Here's your weekly portfolio summary for <b>{portfolio.name}</b>:</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><b>Portfolio:</b> {portfolio.name}</p>
                    <p>Review your portfolio in the dashboard for detailed metrics.</p>
                </div>
                <p><a href="http://localhost:3000/dashboard" style="background: #667eea; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">View Dashboard</a></p>
            </div>
            <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
                <p>© 2026 OptiWealth. You can manage email preferences in settings.</p>
            </div>
        </body>
        </html>
        """
        
        await send_email(user.email, subject, body_html)


# Singleton instance
scheduler_service = SchedulerService()
