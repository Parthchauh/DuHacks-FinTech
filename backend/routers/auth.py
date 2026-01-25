"""
OptiWealth Backend - Authentication Router
============================================
Secure authentication endpoints with:
- Generic error messages (no user enumeration)
- Password strength validation
- Multi-Factor Authentication (MFA)
- Captcha protection for repeated failures
- Disposable email blocking
- Security event logging
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import hashlib
import json
from datetime import datetime, timedelta
from services.auth_service import (
    get_password_hash, 
    authenticate_user, 
    create_access_token, 
    create_refresh_token,
    verify_token,
    get_current_user,
    validate_password_strength,
    is_disposable_email,
    validate_email_format,
    log_security_event,
    generate_math_captcha,
    verify_captcha_answer,
    create_otp_entry,
    verify_otp_entry
)
from services.email_service import send_welcome_email, send_mfa_otp_email, send_account_deleted_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Generic error message to prevent user enumeration
GENERIC_AUTH_ERROR = "Invalid credentials. Please check your email and password."


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, handling proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_failed_attempts_by_ip(db: Session, ip_address: str, minutes: int = 15) -> int:
    """Get count of failed login attempts from IP in last N minutes."""
    since = datetime.utcnow() - timedelta(minutes=minutes)
    return db.query(models.LoginAttempt).filter(
        models.LoginAttempt.ip_address == ip_address,
        models.LoginAttempt.success == False,
        models.LoginAttempt.created_at > since
    ).count()


@router.get("/captcha", response_model=schemas.CaptchaResponse)
async def get_captcha():
    """Get a simple math captcha to prevent bot attacks."""
    return generate_math_captcha()


@router.post("/validate-password")
async def validate_password(data: dict):
    """
    Validate password strength before registration.
    Returns strength score and validation messages.
    """
    password = data.get("password", "")
    is_valid, message, score = validate_password_strength(password)
    
    return {
        "is_valid": is_valid,
        "message": message,
        "score": score,
        "strength": "weak" if score < 40 else "medium" if score < 70 else "strong"
    }


@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: schemas.UserCreate, 
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Register a new user with comprehensive validation.
    """
    client_ip = get_client_ip(request)
    
    # Validate email format
    if not validate_email_format(user_data.email):
        log_security_event("registration", user_data.email, client_ip, False, "invalid_email_format")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid email address"
        )
    
    # Block disposable emails
    if is_disposable_email(user_data.email):
        log_security_event("registration", user_data.email, client_ip, False, "disposable_email")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use a permanent email address. Temporary email addresses are not allowed."
        )
    
    # Validate password strength
    is_valid, message, score = validate_password_strength(user_data.password)
    if not is_valid:
        log_security_event("registration", user_data.email, client_ip, False, "weak_password")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Check if email already exists (GENERIC ERROR to prevent enumeration)
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        log_security_event("registration", user_data.email, client_ip, False, "duplicate_email")
        # Return success-like response or generic error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account already exists"
        )
    
    # Create user
    db_user = models.User(
        email=user_data.email.lower().strip(),  # Normalize email
        full_name=user_data.full_name.strip(),
        hashed_password=get_password_hash(user_data.password),
        is_verified=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create default portfolio
    default_portfolio = models.Portfolio(
        name="My Portfolio",
        description="Default portfolio",
        is_default=True,
        user_id=db_user.id
    )
    db.add(default_portfolio)
    db.commit()
    
    # Log successful registration
    log_security_event("registration", user_data.email, client_ip, True, f"user_id={db_user.id}")
    
    # Send welcome email in background
    background_tasks.add_task(send_welcome_email, db_user.email, db_user.full_name)
    
    return db_user


@router.post("/login", response_model=schemas.Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """
    Classic OAuth2 Login (No MFA Support).
    Deprecated for sensitive operations. Use /login/json for MFA.
    """
    client_ip = get_client_ip(request)
    
    # Enforce basic rate limit check
    if get_failed_attempts_by_ip(db, client_ip) > 15:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please try again later."
        )
    
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        log_security_event("login", form_data.username, client_ip, False, "invalid_credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GENERIC_AUTH_ERROR,
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    log_security_event("login", form_data.username, client_ip, True, f"user_id={user.id}")
    
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


def record_login_attempt(db: Session, request: Request, email: str, success: bool):
    """Record login attempt to DB for rate limiting."""
    client_ip = get_client_ip(request)
    email_hash = hashlib.sha256(email.lower().encode()).hexdigest()
    
    attempt = models.LoginAttempt(
        email_hash=email_hash,
        ip_address=client_ip,
        success=success,
        user_agent=request.headers.get("user-agent", "unknown")[:255]
    )
    db.add(attempt)
    db.commit()


@router.post("/login/json", response_model=schemas.LoginResponse)
async def login_json(
    credentials: schemas.LoginRequest, 
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Secure Login with MFA and Captcha support.
    """
    client_ip = get_client_ip(request)
    
    # 1. Check Rate Limiting / Captcha Requirement
    failed_attempts = get_failed_attempts_by_ip(db, client_ip)
    
    if failed_attempts >= 15:
        # Require captcha
        if not credentials.captcha_token or not credentials.captcha_answer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed attempts. Captcha required."
            )
        
        if not verify_captcha_answer(credentials.captcha_token, credentials.captcha_answer):
            record_login_attempt(db, request, credentials.email, False)
            log_security_event("login", credentials.email, client_ip, False, "invalid_captcha")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid captcha."
            )

    # 2. Authenticate User
    user = authenticate_user(db, credentials.email, credentials.password)
    
    if not user:
        record_login_attempt(db, request, credentials.email, False)
        log_security_event("login", credentials.email, client_ip, False, "invalid_credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GENERIC_AUTH_ERROR
        )

    # 3. Initiate MFA
    record_login_attempt(db, request, credentials.email, True)
    
    # Generate OTP
    otp_code = create_otp_entry(db, user.id, purpose="login")
    
    # Send Email
    background_tasks.add_task(send_mfa_otp_email, user.email, user.full_name, otp_code)
    
    # Store temporary MFA session
    mfa_token = create_access_token(
        data={"sub": str(user.id), "type": "mfa_pending"},
        expires_delta=timedelta(minutes=10)
    )
    
    log_security_event("login_step1", credentials.email, client_ip, True, "mfa_initiated")
    
    return {
        "mfa_required": True,
        "mfa_token": mfa_token,
        "message": "Please enter the verification code sent to your email."
    }


@router.post("/verify-mfa", response_model=schemas.LoginResponse)
async def verify_mfa(
    data: schemas.VerifyMFARequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Verify OTP and complete login.
    """
    client_ip = get_client_ip(request)
    print(f"DEBUG: verifying MFA for IP {client_ip}")
    print(f"DEBUG: Token: {data.mfa_token[:10]}...")
    print(f"DEBUG: OTP Input: {data.otp}")
    
    # Decode temp token
    user_id = verify_token(data.mfa_token, token_type="mfa_pending")
    print(f"DEBUG: User ID from token: {user_id}")
    
    if not user_id:
        print("DEBUG: Token validation failed (None)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please login again."
        )
    
    # Verify OTP
    is_valid = verify_otp_entry(db, user_id, data.otp, purpose="login")
    print(f"DEBUG: OTP valid? {is_valid}")
    
    if not is_valid:
        log_security_event("login_mfa", f"user_{user_id}", client_ip, False, "invalid_otp")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code."
        )
    
    # Login Success
    user = db.query(models.User).filter(models.User.id == user_id).first()
    log_security_event("login_success", user.email, client_ip, True, "mfa_verified")
    
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "mfa_required": False
    }


@router.post("/google", response_model=schemas.LoginResponse)
async def google_login(
    payload: schemas.GoogleLoginRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Authenticate with Google ID Token.
    1. Verify token with Google.
    2. Check if user exists (by email).
    3. If exists, login.
    4. If not, register (provider='google').
    """
    client_ip = get_client_ip(request)
    
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        from config import get_settings
        
        settings = get_settings()
        
        # Verify token with Google
        idinfo = id_token.verify_oauth2_token(
            payload.id_token, 
            google_requests.Request(), 
            audience=settings.GOOGLE_CLIENT_ID
        )
        
        email = idinfo['email']
        name = idinfo.get('name', '')
        google_id = idinfo['sub']
        
        # Check if user exists
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            # Register new user
            user = models.User(
                email=email,
                full_name=name,
                hashed_password="",  # No password for Google users
                google_id=google_id,
                auth_provider='google',
                is_verified=True  # Google emails are verified
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create default portfolio
            default_portfolio = models.Portfolio(
                name="My Portfolio",
                description="Default portfolio",
                is_default=True,
                user_id=user.id
            )
            db.add(default_portfolio)
            db.commit()
            
            # Send welcome email
            background_tasks.add_task(send_welcome_email, user.email, user.full_name)
            
            log_security_event("registration", email, client_ip, True, "provider=google")
            
        else:
            # Login existing user
            # Optional: Link Google ID if not already linked
            if not user.google_id:
                user.google_id = google_id
                if user.auth_provider == 'email':
                    user.auth_provider = 'google_linked'
                db.commit()
            
            log_security_event("login", email, client_ip, True, "provider=google")

        # Generate Tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "mfa_required": False
        }
        
    except ValueError:
        log_security_event("login_failed", "unknown", client_ip, False, "invalid_google_token")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google Token"
        )


@router.post("/refresh", response_model=schemas.Token)
async def refresh_token_endpoint(refresh_token: str, db: Session = Depends(get_db)):
    """Get new access token using refresh token."""
    user_id = verify_token(refresh_token, token_type="refresh")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please login again."
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please login again."
        )
    
    new_access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=schemas.UserResponse)
async def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.put("/me", response_model=schemas.UserResponse)
async def update_me(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile."""
    if user_update.full_name:
        current_user.full_name = user_update.full_name.strip()
    if user_update.currency:
        current_user.currency = user_update.currency
    if user_update.risk_profile:
        current_user.risk_profile = user_update.risk_profile
    if user_update.email_preferences is not None:
        # Store as JSON string since column is Text
        current_user.email_preferences = json.dumps(user_update.email_preferences)
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permanently delete account and all associated data.
    This action is irreversible.
    """
    try:
        email = current_user.email
        name = current_user.full_name
        user_id = current_user.id
        
        # Log the event before deletion
        log_security_event("account_deleted", email, "user_initiated", True, f"user_id={user_id}")
        
        # 1. Manual Cleanup of Dependencies (Fix for FK Constraint Errors)
        # Even if cascade is set in models, manual deletion ensures consistency across all DB types
        
        # Delete Investment Goals (Missing relationship in User model)
        db.query(models.InvestmentGoal).filter(models.InvestmentGoal.user_id == user_id).delete()
        
        # Delete Portfolios (Will cascade to Holdings & Transactions if models match)
        # But we delete manually to be safe
        db.query(models.Portfolio).filter(models.Portfolio.user_id == user_id).delete()
        
        # Delete Security Tokens
        db.query(models.OneTimePassword).filter(models.OneTimePassword.user_id == user_id).delete()
        db.query(models.PasswordResetToken).filter(models.PasswordResetToken.user_id == user_id).delete()
        db.query(models.UserSession).filter(models.UserSession.user_id == user_id).delete()
        
        # 2. Delete User
        db.delete(current_user)
        db.commit()
        
        # 3. Send confirmation email
        background_tasks.add_task(send_account_deleted_email, email, name)
        
        return None
        
    except Exception as e:
        db.rollback()
        # Log the actual error for debugging
        print(f"Delete Account Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account. Please try again or contact support."
        )
