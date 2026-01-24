"""
TOTP Service - Time-based One-Time Password for MFA
====================================================
Implements TOTP (RFC 6238) for authenticator app support.
Compatible with Google Authenticator, Microsoft Authenticator, etc.
"""

import pyotp
import secrets
import hashlib
from typing import List, Tuple


def generate_totp_secret() -> str:
    """
    Generate a new random TOTP secret.
    Returns a base32-encoded secret suitable for QR codes.
    """
    return pyotp.random_base32()


def get_totp_uri(email: str, secret: str, issuer: str = "OptiWealth") -> str:
    """
    Generate otpauth:// URI for QR code generation.
    This URI can be scanned by authenticator apps.
    
    Args:
        email: User's email (displayed in authenticator app)
        secret: Base32-encoded TOTP secret
        issuer: Application name shown in authenticator
    
    Returns:
        otpauth:// URI string
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def verify_totp(secret: str, code: str, valid_window: int = 1) -> bool:
    """
    Verify a TOTP code against the secret.
    
    Args:
        secret: Base32-encoded TOTP secret
        code: 6-digit code from authenticator app
        valid_window: Number of 30-second periods to check before/after
                      (1 = accepts codes from 30 seconds ago/ahead)
    
    Returns:
        True if code is valid, False otherwise
    """
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=valid_window)
    except Exception:
        return False


def generate_backup_codes(count: int = 10) -> Tuple[List[str], List[str]]:
    """
    Generate backup codes for account recovery.
    
    Returns:
        Tuple of (plain_codes, hashed_codes)
        - plain_codes: Display to user (once only!)
        - hashed_codes: Store in database
    """
    plain_codes = []
    hashed_codes = []
    
    for _ in range(count):
        # Generate 8-character alphanumeric code
        code = secrets.token_hex(4).upper()
        formatted_code = f"{code[:4]}-{code[4:]}"
        
        plain_codes.append(formatted_code)
        hashed_codes.append(hash_backup_code(formatted_code))
    
    return plain_codes, hashed_codes


def hash_backup_code(code: str) -> str:
    """Hash a backup code for storage"""
    return hashlib.sha256(code.encode()).hexdigest()


def verify_backup_code(code: str, hashed_codes: List[str]) -> Tuple[bool, int]:
    """
    Verify a backup code against stored hashes.
    
    Returns:
        Tuple of (is_valid, index)
        - is_valid: True if code matches
        - index: Position in list (for removal after use)
    """
    code_hash = hash_backup_code(code)
    
    for i, stored_hash in enumerate(hashed_codes):
        if code_hash == stored_hash:
            return True, i
    
    return False, -1


def get_current_totp(secret: str) -> str:
    """
    Get the current TOTP code (for testing/debugging only).
    """
    totp = pyotp.TOTP(secret)
    return totp.now()
