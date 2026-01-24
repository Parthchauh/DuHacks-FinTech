"""
MFA Router - Multi-Factor Authentication Setup
================================================
Endpoints for setting up TOTP authenticator and managing MFA.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models
from services.auth_service import get_current_user
from services.totp_service import (
    generate_totp_secret,
    get_totp_uri,
    verify_totp,
    generate_backup_codes
)
import json

router = APIRouter(prefix="/api/auth/mfa", tags=["MFA"])


class TOTPSetupResponse(BaseModel):
    secret: str
    uri: str
    backup_codes: list


class TOTPVerifyRequest(BaseModel):
    code: str


@router.post("/setup-totp", response_model=TOTPSetupResponse)
async def setup_totp(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate TOTP secret and QR code URI for authenticator setup"""
    # Generate new secret
    secret = generate_totp_secret()
    
    # Generate QR code URI
    uri = get_totp_uri(current_user.email, secret)
    
    # Generate backup codes
    plain_codes, hashed_codes = generate_backup_codes(10)
    
    # Store secret temporarily (don't enable until confirmed)
    # In production, encrypt the secret before storing
    current_user.totp_secret = secret
    current_user.backup_codes = json.dumps(hashed_codes)
    db.commit()
    
    return {
        "secret": secret,
        "uri": uri,
        "backup_codes": plain_codes
    }


@router.post("/confirm-totp")
async def confirm_totp(
    request: TOTPVerifyRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify TOTP code and enable authenticator MFA"""
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="TOTP not set up. Call setup-totp first.")
    
    # Verify the code
    if not verify_totp(current_user.totp_secret, request.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    
    # Enable TOTP MFA
    current_user.mfa_method = models.MfaMethod.TOTP
    db.commit()
    
    return {"message": "Authenticator enabled successfully"}


@router.post("/disable")
async def disable_mfa(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable MFA (revert to email OTP)"""
    current_user.mfa_method = models.MfaMethod.EMAIL
    current_user.totp_secret = None
    current_user.backup_codes = None
    db.commit()
    
    return {"message": "MFA disabled. Reverted to email OTP."}


@router.get("/status")
async def get_mfa_status(
    current_user: models.User = Depends(get_current_user)
):
    """Get current MFA configuration status"""
    return {
        "method": current_user.mfa_method.value if hasattr(current_user, 'mfa_method') and current_user.mfa_method else "email",
        "totp_enabled": bool(current_user.totp_secret) if hasattr(current_user, 'totp_secret') else False,
        "has_backup_codes": bool(current_user.backup_codes) if hasattr(current_user, 'backup_codes') else False
    }
