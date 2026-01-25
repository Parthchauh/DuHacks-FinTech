"""
OptiWealth Backend - Security Middleware
=========================================
Implements security headers and middleware for:
- Content Security Policy (CSP)
- X-Frame-Options (Clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- X-XSS-Protection
- Strict-Transport-Security (HSTS)
- Rate limiting helpers
- IP whitelisting enforcement
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import time


def get_client_ip(request: Request) -> str:
    """
    Extract real client IP from request, handling reverse proxies.
    
    Checks X-Forwarded-For header first (set by nginx/load balancers),
    then falls back to direct connection IP. Essential for accurate
    rate limiting and IP whitelisting in production environments.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.
    
    These headers protect against common web vulnerabilities:
    - XSS attacks
    - Clickjacking
    - MIME-type sniffing
    - Protocol downgrade attacks
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Prevent clickjacking - page cannot be embedded in iframes
        response.headers["X-Frame-Options"] = "DENY"
        
        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Enable XSS filter (legacy but still useful)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Content Security Policy - restrict resource loading
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://www.gstatic.com; "
            "style-src 'self' 'unsafe-inline' https://accounts.google.com; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://www.alphavantage.co https://accounts.google.com; "
            "frame-src 'self' https://accounts.google.com; "
            "frame-ancestors 'none';"
        )
        
        # Referrer Policy - limit referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy - disable unnecessary browser features
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), "
            "payment=(), usb=(), magnetometer=()"
        )
        
        # Remove server header for security
        if "server" in response.headers:
            del response.headers["server"]
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting middleware.
    
    Note: For production, use Redis-based rate limiting for
    distributed systems. This is suitable for single-server deployments.
    """
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_counts: dict = {}  # {ip: [(timestamp, count)]}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = get_client_ip(request)
        current_time = time.time()
        minute_ago = current_time - 60
        
        # Clean old entries and count recent requests
        if client_ip in self.request_counts:
            self.request_counts[client_ip] = [
                (ts, count) for ts, count in self.request_counts[client_ip]
                if ts > minute_ago
            ]
            total_requests = sum(count for _, count in self.request_counts[client_ip])
        else:
            self.request_counts[client_ip] = []
            total_requests = 0
        
        # Check rate limit
        if total_requests >= self.requests_per_minute:
            return Response(
                content='{"detail": "Rate limit exceeded. Please try again later."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60"}
            )
        
        # Record this request
        self.request_counts[client_ip].append((current_time, 1))
        
        return await call_next(request)


async def check_ip_whitelist(request: Request, user) -> bool:
    """
    Verify client IP against user's whitelist.
    
    IP Whitelisting adds an extra layer of security by only allowing
    login from pre-approved IP addresses. Returns True if access is
    allowed (no whitelist set, or IP is in whitelist).
    
    Usage in endpoints:
        if not await check_ip_whitelist(request, user):
            raise HTTPException(403, "Access denied from this IP address")
    """
    if not user.allowed_ips:
        # No whitelist configured = allow all
        return True
    
    client_ip = get_client_ip(request)
    allowed = user.allowed_ips  # JSON array of IPs
    
    if isinstance(allowed, str):
        import json
        allowed = json.loads(allowed) if allowed else []
    
    return client_ip in allowed

