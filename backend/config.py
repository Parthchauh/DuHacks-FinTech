"""
OptiWealth Backend - Application Configuration
================================================
This module centralizes all application settings using Pydantic BaseSettings.
Configuration values are loaded from environment variables (.env file) with
sensible defaults. Using Pydantic ensures type validation and prevents
misconfiguration errors at startup rather than runtime.

The lru_cache decorator ensures settings are loaded once and reused across
the application, avoiding repeated file I/O and environment variable parsing.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables.
    All sensitive values (API keys, passwords) should be set in .env file.
    """
    
    # Application metadata
    APP_NAME: str = "OptiWealth API"
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:3000"
    
    # PostgreSQL connection string
    # Format: postgresql://user:password@host:port/database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/optiwealth"
    
    # JWT Authentication Configuration
    # SECRET_KEY: Used for signing JWT tokens - MUST be changed in production
    # ALGORITHM: HS256 is symmetric HMAC, suitable for single-server deployments
    # Token expiry times balance security (shorter) vs UX (longer)
    SECRET_KEY: str = "your-super-secret-key-change-in-production-abc123xyz789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # External API Keys
    # Alpha Vantage: Free tier allows 25 API calls/day for stock data
    ALPHA_VANTAGE_API_KEY: str = "demo"
    TWELVE_DATA_API_KEY: str = ""  # Alternative stock API (optional)
    
    # Brevo SMTP Configuration for transactional emails
    # Free tier: 300 emails/day - sufficient for user notifications
    SMTP_HOST: str = "smtp-relay.brevo.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@optiwealth.in"
    
    # Financial Parameters
    # Risk-free rate approximates Indian 10-year government bond yield (~7.2%)
    # Used in Sharpe ratio, CAPM calculations, and portfolio optimization
    RISK_FREE_RATE: float = 0.072
    
    # Google OAuth Configuration
    GOOGLE_CLIENT_ID: str = ""  # Set in .env.local or .env
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    """
    Returns cached application settings instance.
    Using lru_cache ensures the .env file is read only once,
    improving performance for frequently accessed settings.
    """
    return Settings()
