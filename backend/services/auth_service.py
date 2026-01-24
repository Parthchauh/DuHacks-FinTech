"""
OptiWealth Backend - Authentication & Security Service
========================================================
Implements secure authentication with:
- Argon2id password hashing (winner of Password Hashing Competition)
- JWT access/refresh tokens with proper expiry
- Password strength validation
- Disposable email blocking
- Rate limiting helpers
- Security event logging

Why Argon2id over bcrypt?
- Memory-hard: Resistant to GPU/ASIC attacks
- Side-channel resistant (protects against timing attacks)
- Better for Python 3.13+ (bcrypt has compatibility issues)
- Recommended by OWASP for new applications
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple
import re
import hashlib
import secrets
import logging
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHash
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from config import get_settings
import models

settings = get_settings()

# Configure Argon2id with secure defaults
# time_cost: iterations (higher = slower but safer)
# memory_cost: KB of memory (higher = more resistant to GPU attacks)
# parallelism: threads (match server cores)
ph = PasswordHasher(
    time_cost=3,          # 3 iterations
    memory_cost=65536,    # 64 MB
    parallelism=4,        # 4 threads
    hash_len=32,          # 256-bit hash
    salt_len=16           # 128-bit salt
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Security event logger
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.INFO)

# Disposable email domains (sample - extend in production)
DISPOSABLE_EMAIL_DOMAINS = {
    "tempmail.com", "throwaway.com", "mailinator.com", "guerrillamail.com",
    "10minutemail.com", "temp-mail.org", "fakeinbox.com", "trashmail.com",
    "tempinbox.com", "disposable.com", "getnada.com", "maildrop.cc",
    "yopmail.com", "sharklasers.com", "spam4.me", "discard.email"
}


# =============================================================================
# PASSWORD HASHING - Argon2id
# =============================================================================

def get_password_hash(password: str) -> str:
    """
    Hash password using Argon2id algorithm.
    
    Argon2id combines Argon2i (side-channel resistant) and Argon2d 
    (GPU-resistant) for best of both worlds. The hash includes:
    - Algorithm identifier
    - Cost parameters
    - Salt (auto-generated)
    - Hash value
    
    Format: $argon2id$v=19$m=65536,t=3,p=4$salt$hash
    """
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against Argon2id hash.
    Uses constant-time comparison to prevent timing attacks.
    """
    try:
        ph.verify(hashed_password, plain_password)
        return True
    except (VerifyMismatchError, InvalidHash):
        return False


def check_needs_rehash(hashed_password: str) -> bool:
    """
    Check if password hash needs rehashing due to parameter changes.
    Enables gradual migration when security parameters are upgraded.
    """
    return ph.check_needs_rehash(hashed_password)


# =============================================================================
# PASSWORD STRENGTH VALIDATION
# =============================================================================

def validate_password_strength(password: str) -> Tuple[bool, str, int]:
    """
    Validate password against strong password policy.
    
    Requirements:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 digit
    - At least 1 special character
    
    Returns: (is_valid, message, strength_score 0-100)
    """
    score = 0
    messages = []
    
    # Length check
    if len(password) < 8:
        messages.append("Password must be at least 8 characters")
    else:
        score += 20
        if len(password) >= 12:
            score += 10
        if len(password) >= 16:
            score += 10
    
    # Uppercase check
    if not re.search(r'[A-Z]', password):
        messages.append("Password must contain at least 1 uppercase letter")
    else:
        score += 15
    
    # Lowercase check
    if not re.search(r'[a-z]', password):
        messages.append("Password must contain at least 1 lowercase letter")
    else:
        score += 15
    
    # Digit check
    if not re.search(r'\d', password):
        messages.append("Password must contain at least 1 number")
    else:
        score += 15
    
    # Special character check
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        messages.append("Password must contain at least 1 special character")
    else:
        score += 15
    
    # Bonus for variety
    if re.search(r'[!@#$%^&*(),.?":{}|<>].*[!@#$%^&*(),.?":{}|<>]', password):
        score += 5  # Multiple special chars
    
    is_valid = len(messages) == 0
    message = messages[0] if messages else "Password is strong"
    
    return is_valid, message, min(100, score)


# =============================================================================
# EMAIL VALIDATION
# =============================================================================

def is_disposable_email(email: str) -> bool:
    """
    Check if email is from a disposable email provider.
    These are commonly used for spam/fraud and should be blocked.
    """
    domain = email.lower().split('@')[-1]
    return domain in DISPOSABLE_EMAIL_DOMAINS


def validate_email_format(email: str) -> bool:
    """
    Validate email format using RFC 5322 compliant regex.
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


# =============================================================================
# JWT TOKENS
# =============================================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create short-lived access token for API authentication."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    if "type" not in to_encode:
        to_encode["type"] = "access"
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create long-lived refresh token for obtaining new access tokens."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str, token_type: str = "access") -> Optional[int]:
    """Verify JWT token and extract user ID."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != token_type:
            return None
        user_id = payload.get("sub")
        return int(user_id) if user_id else None
    except JWTError:
        return None


# =============================================================================
# OTP GENERATION (for MFA)
# =============================================================================

def generate_otp(length: int = 6) -> str:
    """
    Generate cryptographically secure OTP.
    Uses secrets module for true randomness (not pseudo-random).
    """
    return ''.join(secrets.choice('0123456789') for _ in range(length))


def hash_otp(otp: str) -> str:
    """
    Hash OTP for storage (never store plaintext OTPs).
    Uses SHA-256 since OTPs are short-lived and don't need slow hashing.
    """
    return hashlib.sha256(otp.encode()).hexdigest()


# =============================================================================
# SECURITY EVENT LOGGING
# =============================================================================

def log_security_event(event_type: str, email: str, ip_address: str, success: bool, details: str = ""):
    """
    Log security events for audit trail.
    Events: registration, login, password_reset, mfa_attempt
    """
    security_logger.info(
        f"SECURITY_EVENT | type={event_type} | email={hash_email(email)} | "
        f"ip={ip_address} | success={success} | details={details}"
    )


def hash_email(email: str) -> str:
    """Hash email for logging (PII protection)."""
    return hashlib.sha256(email.encode()).hexdigest()[:16]


# =============================================================================
# USER AUTHENTICATION
# =============================================================================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Dependency to get authenticated user from JWT token.
    Returns user object or raises 401 Unauthorized.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    user_id = verify_token(token)
    if user_id is None:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[models.User]:
    """
    Authenticate user by email and password.
    Returns user if valid, None otherwise.
    Uses constant-time operations to prevent timing attacks.
    """
    user = db.query(models.User).filter(models.User.email == email).first()
    
    # Always verify against a hash to prevent timing attacks
    # Even if user doesn't exist, we still do a hash comparison
    if not user:
        # Dummy hash to maintain constant time
        verify_password(password, ph.hash("dummy_password"))
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    # Check if hash needs rehashing (security parameter upgrade)
    if check_needs_rehash(user.hashed_password):
        user.hashed_password = get_password_hash(password)
        db.commit()
    
    return user


# =============================================================================
# OTP PERSISTENCE (MFA)
# =============================================================================

def create_otp_entry(db: Session, user_id: int, purpose: str = "login") -> str:
    """Generate, hash, and store a new OTP for the user."""
    code = generate_otp(6)
    code_hash = hash_otp(code)
    
    # Invalidate existing OTPs for this purpose
    db.query(models.OneTimePassword).filter(
        models.OneTimePassword.user_id == user_id,
        models.OneTimePassword.purpose == purpose
    ).delete()
    
    otp_entry = models.OneTimePassword(
        user_id=user_id,
        otp_hash=code_hash,
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(otp_entry)
    db.commit()
    
    return code


def verify_otp_entry(db: Session, user_id: int, code: str, purpose: str = "login") -> bool:
    """Verify an OTP code."""
    code_hash = hash_otp(code)
    
    # Debug finding
    print(f"DEBUG: Checking OTP for user {user_id}, purpose {purpose}")
    print(f"DEBUG: Input code: {code}, Hash: {code_hash}")
    
    # Check if ANY entry exists for user/purpose
    entries = db.query(models.OneTimePassword).filter(
        models.OneTimePassword.user_id == user_id,
        models.OneTimePassword.purpose == purpose
    ).all()
    print(f"DEBUG: Found {len(entries)} entries for user/purpose")
    for e in entries:
        print(f"  - ID: {e.id}, Hash: {e.otp_hash}, Exp: {e.expires_at}, Used: {e.used}")

    entry = db.query(models.OneTimePassword).filter(
        models.OneTimePassword.user_id == user_id,
        models.OneTimePassword.purpose == purpose,
        models.OneTimePassword.otp_hash == code_hash,
        models.OneTimePassword.used == False,
        models.OneTimePassword.expires_at > datetime.utcnow()
    ).first()
    
    if entry:
        print(f"DEBUG: Match found! Entry ID {entry.id}")
        entry.used = True
        db.commit()
        return True
    
    print("DEBUG: No matching valid entry found")
    return False


# =============================================================================
# CAPTCHA
# =============================================================================

def generate_math_captcha() -> dict:
    """Generate a simple math captcha."""
    a = secrets.randbelow(20) + 1  # 1-20
    b = secrets.randbelow(20) + 1  # 1-20
    
    # Randomly choose addition or subtraction
    if secrets.choice([True, False]):
        question = f"What is {a} + {b}?"
        answer = str(a + b)
    else:
        # Ensure positive result for subtraction
        if a < b: a, b = b, a
        question = f"What is {a} - {b}?"
        answer = str(a - b)
        
    # Sign the answer to avoid server-side storage
    # Token valid for 5 minutes
    token = create_access_token({"captcha_answer": answer, "type": "captcha"}, expires_delta=timedelta(minutes=5))
    
    return {
        "question": question,
        "token": token
    }


def verify_captcha_answer(token: str, user_answer: str) -> bool:
    """Verify captcha answer against signed token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "captcha":
            return False
            
        correct_answer = payload.get("captcha_answer")
        return user_answer.strip() == correct_answer
    except JWTError:
        return False

