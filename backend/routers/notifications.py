"""
Notifications Router - WhatsApp & Telegram Alert Settings
==========================================================
Manage user notification preferences and test connections.
Supports WhatsApp (via CallMeBot) and Telegram.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
import models
from services.auth_service import get_current_user
from services.notification_service import notification_service

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class NotificationSettings(BaseModel):
    # WhatsApp (preferred)
    whatsapp_phone: Optional[str] = None  # Format: 919876543210
    # Telegram (fallback)
    telegram_chat_id: Optional[str] = None
    # Alert preferences
    drift_alert_enabled: bool = True
    drift_threshold: float = 5.0
    price_alert_enabled: bool = True
    rebalance_reminder_enabled: bool = True
    rebalance_frequency: str = "weekly"


class TestNotificationRequest(BaseModel):
    channel: str = "whatsapp"  # whatsapp or telegram


@router.get("/settings")
async def get_notification_settings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notification preferences."""
    prefs = current_user.email_preferences or {}
    
    return {
        # WhatsApp
        "whatsapp_phone": prefs.get("whatsapp_phone"),
        "whatsapp_connected": bool(prefs.get("whatsapp_phone")),
        "whatsapp_available": notification_service.whatsapp_enabled,
        # Telegram
        "telegram_chat_id": prefs.get("telegram_chat_id"),
        "telegram_connected": bool(prefs.get("telegram_chat_id")),
        "telegram_available": notification_service.telegram_enabled,
        # Preferences
        "drift_alert_enabled": prefs.get("drift_alert_enabled", True),
        "drift_threshold": prefs.get("drift_threshold", 5.0),
        "price_alert_enabled": prefs.get("price_alert_enabled", True),
        "rebalance_reminder_enabled": prefs.get("rebalance_reminder_enabled", True),
        "rebalance_frequency": prefs.get("rebalance_frequency", "weekly")
    }


@router.post("/settings")
async def update_notification_settings(
    settings: NotificationSettings,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update notification preferences."""
    prefs = current_user.email_preferences or {}
    
    prefs.update({
        "whatsapp_phone": settings.whatsapp_phone,
        "telegram_chat_id": settings.telegram_chat_id,
        "drift_alert_enabled": settings.drift_alert_enabled,
        "drift_threshold": settings.drift_threshold,
        "price_alert_enabled": settings.price_alert_enabled,
        "rebalance_reminder_enabled": settings.rebalance_reminder_enabled,
        "rebalance_frequency": settings.rebalance_frequency
    })
    
    current_user.email_preferences = prefs
    db.commit()
    
    return {"message": "Notification settings updated", "settings": prefs}


@router.post("/test")
async def test_notification(
    request: TestNotificationRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send test notification to verify connection."""
    prefs = current_user.email_preferences or {}
    
    if request.channel == "whatsapp":
        phone = prefs.get("whatsapp_phone")
        
        if not phone:
            raise HTTPException(
                status_code=400,
                detail="WhatsApp phone number not configured. Please enter your number first."
            )
        
        if not notification_service.whatsapp_enabled:
            raise HTTPException(
                status_code=503,
                detail="WhatsApp service not available. CALLMEBOT_API_KEY not configured."
            )
        
        success = await notification_service.send_test_whatsapp(phone)
        
        if success:
            return {"message": "Test WhatsApp message sent!", "channel": "whatsapp"}
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to send WhatsApp. Check phone format (e.g., 919876543210) and API key."
            )
    
    elif request.channel == "telegram":
        chat_id = prefs.get("telegram_chat_id")
        
        if not chat_id:
            raise HTTPException(
                status_code=400,
                detail="Telegram chat ID not configured."
            )
        
        if not notification_service.telegram_enabled:
            raise HTTPException(
                status_code=503,
                detail="Telegram service not available. TELEGRAM_BOT_TOKEN not configured."
            )
        
        success = await notification_service.send_test_notification(chat_id)
        
        if success:
            return {"message": "Test Telegram message sent!", "channel": "telegram"}
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to send Telegram. Please check your chat ID."
            )
    
    raise HTTPException(status_code=400, detail=f"Unknown channel: {request.channel}")


@router.get("/status")
async def get_notification_status(
    current_user: models.User = Depends(get_current_user)
):
    """Check notification service status."""
    prefs = current_user.email_preferences or {}
    
    return {
        "whatsapp": {
            "configured": notification_service.whatsapp_enabled,
            "connected": bool(prefs.get("whatsapp_phone")),
            "phone": prefs.get("whatsapp_phone")
        },
        "telegram": {
            "configured": notification_service.telegram_enabled,
            "connected": bool(prefs.get("telegram_chat_id")),
            "chat_id": prefs.get("telegram_chat_id")
        },
        "email": {
            "configured": True,
            "address": current_user.email
        }
    }

