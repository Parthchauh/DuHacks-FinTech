"""
OptiWealth Backend - CSRF Protection Middleware
=================================================
Implements CSRF (Cross-Site Request Forgery) protection:
- Double submit cookie pattern
- Token validation on state-changing requests
- Secure token generation
- SameSite cookie attribute
"""

from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import secrets
import hashlib

# CSRF token cookie name
CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"

# Methods that require CSRF protection
PROTECTED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

# Paths exempt from CSRF (login, register need to work without token)
EXEMPT_PATHS = {
    "/api/auth/login",
    "/api/auth/login/json",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/refresh",
    "/api/health",
    "/api/docs",
    "/api/openapi.json",
}


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF Protection using Double Submit Cookie pattern.
    
    How it works:
    1. Server sets a random CSRF token in a cookie
    2. Client must include this token in X-CSRF-Token header
    3. Server validates token matches cookie
    
    This works because:
    - Cookies are automatically sent by browser
    - But attacker's site can't read the cookie value (same-origin policy)
    - So they can't set the matching header
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip for exempt paths
        if request.url.path in EXEMPT_PATHS:
            response = await call_next(request)
            return self._ensure_csrf_cookie(response, request)
        
        # Skip for safe methods (GET, HEAD, OPTIONS)
        if request.method not in PROTECTED_METHODS:
            response = await call_next(request)
            return self._ensure_csrf_cookie(response, request)
        
        # Validate CSRF token for protected methods
        cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
        header_token = request.headers.get(CSRF_HEADER_NAME)
        
        if not cookie_token or not header_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing. Please refresh the page and try again."
            )
        
        # Constant-time comparison to prevent timing attacks
        if not secrets.compare_digest(cookie_token, header_token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token invalid. Please refresh the page and try again."
            )
        
        response = await call_next(request)
        return self._ensure_csrf_cookie(response, request)
    
    def _ensure_csrf_cookie(self, response: Response, request: Request) -> Response:
        """Ensure CSRF cookie is set."""
        # Only set cookie if not already present
        if CSRF_COOKIE_NAME not in request.cookies:
            token = secrets.token_urlsafe(32)
            response.set_cookie(
                key=CSRF_COOKIE_NAME,
                value=token,
                httponly=False,  # Must be readable by JavaScript
                secure=True,     # HTTPS only in production
                samesite="strict",
                max_age=86400    # 24 hours
            )
        return response


def generate_csrf_token() -> str:
    """Generate a secure CSRF token."""
    return secrets.token_urlsafe(32)
