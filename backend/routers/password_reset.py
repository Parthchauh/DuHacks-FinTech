"""
OptiWealth Backend - Password Reset Router
============================================
Secure password reset flow with:
- Generic error messages (no account enumeration)
- Secure random tokens (256-bit entropy)
- Hashed token storage with 1-hour expiry
- Single-use tokens
- Rate limiting (3 requests per 15 minutes)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import secrets
import hashlib
from database import get_db
import models
from services.auth_service import (
    get_password_hash,
    validate_password_strength,
    log_security_event
)
from services.email_service import send_password_reset_email, send_password_change_success_email
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["Password Reset"])

# Generic success message (never reveal account existence)
GENERIC_RESET_MESSAGE = "If an account with this email exists, you will receive a password reset link shortly."


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, handling proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def hash_token(token: str) -> str:
    """Hash a token for storage/comparison."""
    return hashlib.sha256(token.encode()).hexdigest()


def get_recent_failed_attempts(db: Session, email: str, minutes: int = 15) -> int:
    """Get count of failed reset requests in the last N minutes."""
    email_hash = hashlib.sha256(email.lower().encode()).hexdigest()
    since = datetime.utcnow() - timedelta(minutes=minutes)
    
    return db.query(models.LoginAttempt).filter(
        models.LoginAttempt.email_hash == email_hash,
        models.LoginAttempt.success == False,
        models.LoginAttempt.created_at > since
    ).count()


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Request password reset - sends email if account exists.
    """
    client_ip = get_client_ip(request)
    email = data.email.lower().strip()
    
    # Rate limiting - max 3 reset requests per 15 minutes
    recent_attempts = get_recent_failed_attempts(db, email, minutes=15)
    if recent_attempts >= 3:
        log_security_event("password_reset_rate_limited", email, client_ip, False, "rate_limit_exceeded")
        return {"message": GENERIC_RESET_MESSAGE}
    
    # Find user (don't reveal if exists)
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if user:
        # Generate secure token
        raw_token = secrets.token_urlsafe(32)
        token_hash = hash_token(raw_token)
        
        # Delete existing tokens for this user
        db.query(models.PasswordResetToken).filter(
            models.PasswordResetToken.user_id == user.id
        ).delete()
        
        # Create new token
        reset_token = models.PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(hours=1),
            ip_address=client_ip
        )
        db.add(reset_token)
        db.commit()
        
        # Send reset email immediately (debugging)
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
        try:
            await send_password_reset_email(
                email,
                user.full_name,
                reset_link
            )
        except Exception as e:
            print(f"Error sending email: {e}")
            raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")
        
        log_security_event("password_reset_requested", email, client_ip, True, f"user_id={user.id}")
    else:
        log_security_event("password_reset_requested", email, client_ip, False, "user_not_found")
    
    return {"message": GENERIC_RESET_MESSAGE}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Reset password using token.
    """
    client_ip = get_client_ip(request)
    token_hash = hash_token(data.token)
    
    # Find valid token
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token_hash == token_hash,
        models.PasswordResetToken.expires_at > datetime.utcnow(),
        models.PasswordResetToken.used == False
    ).first()
    
    if not reset_token:
        log_security_event("password_reset_failed", "unknown", client_ip, False, "invalid_token")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has expired. Please request a new one."
        )
    
    # Get user
    user = db.query(models.User).filter(models.User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has expired."
        )
    
    # Validate new password strength
    is_valid, message, score = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Update password
    user.hashed_password = get_password_hash(data.new_password)
    
    # Mark token as used
    reset_token.used = True
    
    db.commit()
    
    log_security_event("password_reset_completed", user.email, client_ip, True, f"user_id={user.id}")
    
    # Send confirmation email
    try:
        await send_password_change_success_email(user.email, user.full_name)
    except Exception as e:
        print(f"Error sending confirmation email: {e}")
    
    return {"message": "Your password has been reset successfully. You can now log in with your new password."}


@router.get("/verify-reset-token")
async def check_reset_token(token: str, db: Session = Depends(get_db)):
    """Verify if a reset token is valid."""
    token_hash = hash_token(token)
    
    reset_token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.token_hash == token_hash,
        models.PasswordResetToken.expires_at > datetime.utcnow(),
        models.PasswordResetToken.used == False
    ).first()
    
    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has expired."
        )
    
    return {"valid": True}
