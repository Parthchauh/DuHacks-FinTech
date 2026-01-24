"""
Notification Service - WhatsApp & Telegram Alerts
==================================================
Sends portfolio notifications via WhatsApp (CallMeBot) or Telegram.
Supports: drift alerts, price changes, rebalance reminders.

WhatsApp Setup (CallMeBot - Free):
1. Save the number +34 644 51 95 23 in your contacts
2. Send "I allow callmebot to send me messages" to this number via WhatsApp
3. You'll receive an API key - add to .env as CALLMEBOT_API_KEY
4. Add your phone number (with country code) as WHATSAPP_PHONE

Telegram Setup:
1. Create bot via @BotFather on Telegram
2. Get bot token and add to .env as TELEGRAM_BOT_TOKEN
3. User sends /start to bot, we store their chat_id
"""

import os
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
from urllib.parse import quote

TELEGRAM_API_URL = "https://api.telegram.org/bot{token}/{method}"
CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php"


class NotificationService:
    """
    Unified notification service supporting WhatsApp and Telegram.
    
    WhatsApp via CallMeBot is FREE and requires no business verification.
    Just send a message to activate your number and get an API key.
    """
    
    def __init__(self):
        self.telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.whatsapp_apikey = os.getenv("CALLMEBOT_API_KEY")
        self.telegram_enabled = bool(self.telegram_token)
        self.whatsapp_enabled = bool(self.whatsapp_apikey)
    
    async def send_whatsapp(
        self, 
        phone: str, 
        message: str
    ) -> bool:
        """
        Send WhatsApp message via CallMeBot API.
        
        CallMeBot is a free service that allows sending WhatsApp messages
        without needing a business account or Facebook approval.
        Rate limit: ~10 messages per minute.
        
        Phone format: Country code + number (e.g., 919876543210 for India)
        """
        if not self.whatsapp_apikey:
            print("[NOTIFICATION] WhatsApp not configured - missing CALLMEBOT_API_KEY")
            return False
        
        # Clean phone number (remove spaces, dashes, +)
        phone = phone.replace(" ", "").replace("-", "").replace("+", "")
        
        try:
            # URL encode the message
            encoded_message = quote(message)
            
            url = f"{CALLMEBOT_URL}?phone={phone}&text={encoded_message}&apikey={self.whatsapp_apikey}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=15.0)
                
                if response.status_code == 200 and "Message queued" in response.text:
                    print(f"[NOTIFICATION] WhatsApp sent to {phone}")
                    return True
                else:
                    print(f"[NOTIFICATION] WhatsApp failed: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            print(f"[NOTIFICATION] WhatsApp error: {e}")
            return False
    
    async def send_telegram(
        self, 
        chat_id: str, 
        message: str,
        parse_mode: str = "HTML"
    ) -> bool:
        """Send message via Telegram Bot API."""
        if not self.telegram_token:
            print("[NOTIFICATION] Telegram not configured")
            return False
        
        try:
            url = TELEGRAM_API_URL.format(
                token=self.telegram_token,
                method="sendMessage"
            )
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json={
                    "chat_id": chat_id,
                    "text": message,
                    "parse_mode": parse_mode
                }, timeout=10.0)
                
                if response.status_code == 200:
                    print(f"[NOTIFICATION] Telegram sent to {chat_id}")
                    return True
                else:
                    print(f"[NOTIFICATION] Telegram failed: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"[NOTIFICATION] Telegram error: {e}")
            return False
    
    async def send_notification(
        self,
        message: str,
        phone: Optional[str] = None,
        chat_id: Optional[str] = None,
        prefer_whatsapp: bool = True
    ) -> bool:
        """
        Send notification via preferred channel.
        Falls back to alternative if primary fails.
        """
        if prefer_whatsapp and phone and self.whatsapp_enabled:
            # Strip HTML tags for WhatsApp (plain text only)
            plain_message = message.replace("<b>", "*").replace("</b>", "*")\
                                   .replace("<i>", "_").replace("</i>", "_")\
                                   .replace("<code>", "`").replace("</code>", "`")
            result = await self.send_whatsapp(phone, plain_message)
            if result:
                return True
        
        if chat_id and self.telegram_enabled:
            return await self.send_telegram(chat_id, message)
        
        return False
    
    async def send_drift_alert(
        self,
        user_name: str,
        drift_percent: float,
        top_drifts: List[Dict[str, Any]],
        phone: Optional[str] = None,
        chat_id: Optional[str] = None
    ) -> bool:
        """Send portfolio drift alert."""
        drifts_text = "\n".join([
            f"• *{d['ticker']}*: {d['drift']:+.1f}%"
            for d in top_drifts[:5]
        ])
        
        message = f"""
🔔 *Portfolio Drift Alert*

Hi {user_name},

Your portfolio has drifted *{drift_percent:.1f}%* from target allocations.

*Top Deviations:*
{drifts_text}

Consider rebalancing to maintain your investment strategy.

_— OptiWealth_
"""
        return await self.send_notification(message.strip(), phone=phone, chat_id=chat_id)
    
    async def send_price_alert(
        self,
        ticker: str,
        current_price: float,
        change_percent: float,
        phone: Optional[str] = None,
        chat_id: Optional[str] = None
    ) -> bool:
        """Send price movement alert."""
        emoji = "📈" if change_percent > 0 else "📉"
        
        message = f"""
{emoji} *Price Alert: {ticker}*

Current Price: ₹{current_price:,.2f}
Change: *{change_percent:+.2f}%*

_— OptiWealth_
"""
        return await self.send_notification(message.strip(), phone=phone, chat_id=chat_id)
    
    async def send_rebalance_reminder(
        self,
        user_name: str,
        last_rebalance: Optional[datetime] = None,
        phone: Optional[str] = None,
        chat_id: Optional[str] = None
    ) -> bool:
        """Weekly/monthly reminder to review portfolio."""
        days_since = "N/A"
        if last_rebalance:
            days_since = (datetime.utcnow() - last_rebalance).days
        
        message = f"""
📊 *Rebalance Reminder*

Hi {user_name},

It's time to review your portfolio allocation!

Last rebalanced: *{days_since} days ago*

Regular rebalancing helps maintain your target risk level.

_— OptiWealth_
"""
        return await self.send_notification(message.strip(), phone=phone, chat_id=chat_id)
    
    async def send_test_whatsapp(self, phone: str) -> bool:
        """Send test WhatsApp message."""
        message = """
✅ *OptiWealth Connected!*

Your WhatsApp notifications are now active.

You'll receive:
• Portfolio drift alerts
• Price movement notifications
• Rebalancing reminders

_— OptiWealth Notification Service_
"""
        return await self.send_whatsapp(phone, message.strip())
    
    async def send_test_notification(self, chat_id: str) -> bool:
        """Send test Telegram message."""
        message = """
✅ <b>OptiWealth Connected!</b>

Your Telegram notifications are now active.

You'll receive:
• Portfolio drift alerts
• Price movement notifications
• Rebalancing reminders

<i>— OptiWealth Notification Service</i>
"""
        return await self.send_telegram(chat_id, message.strip())


# Singleton instance
notification_service = NotificationService()

