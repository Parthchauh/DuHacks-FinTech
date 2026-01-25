"""
OptiWealth Backend - Database Models (ORM)
===========================================
This module defines the SQLAlchemy ORM models representing the database schema.
Each class maps to a PostgreSQL table with relationships maintained via foreign keys.

Entity Relationship Overview:
- User (1) --> (N) Portfolio: One user can have multiple portfolios
- Portfolio (1) --> (N) Holding: A portfolio contains multiple asset holdings
- Portfolio (1) --> (N) Transaction: All buy/sell activity is recorded

Design Decisions:
- Soft fields (is_active, is_verified) allow account management without deletion
- cascade="all, delete-orphan" ensures child records are cleaned up with parents
- Timestamps (created_at, updated_at) enable audit trails and sorting
- target_allocation on Holding enables the rebalancing algorithm to calculate drift
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


class TransactionType(str, enum.Enum):
    """
    Enum for transaction categories. Inherits from str for JSON serialization.
    BUY/SELL affect holdings; DIVIDEND/DEPOSIT/WITHDRAWAL are cash flows.
    """
    BUY = "BUY"
    SELL = "SELL"
    DIVIDEND = "DIVIDEND"
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"


class RiskProfile(str, enum.Enum):
    """
    User's risk tolerance level. Determines suggested asset allocations
    and volatility tolerance in portfolio optimization recommendations.
    """
    CONSERVATIVE = "conservative"   # Lower risk, focus on bonds/stable assets
    MODERATE = "moderate"           # Balanced risk-reward approach
    AGGRESSIVE = "aggressive"       # Higher equity allocation, growth focus


class MfaMethod(str, enum.Enum):
    """MFA authentication method options"""
    NONE = "none"
    EMAIL = "email"
    TOTP = "totp"


class User(Base):
    """
    User account model. Stores authentication credentials and preferences.
    Risk profile influences the efficient frontier optimization suggestions.
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)  # Bcrypt hash, never store plaintext
    full_name = Column(String, nullable=False)
    currency = Column(String, default="INR")  # Display currency for Indian market
    risk_profile = Column(SQLEnum(RiskProfile), default=RiskProfile.MODERATE)
    is_active = Column(Boolean, default=True)  # Soft delete flag
    is_verified = Column(Boolean, default=False)  # Email verification status
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # MFA Configuration
    mfa_method = Column(SQLEnum(MfaMethod), default=MfaMethod.EMAIL)
    totp_secret = Column(String, nullable=True)  # Base32 TOTP secret (encrypted in prod)
    backup_codes = Column(Text, nullable=True)  # JSON array of hashed backup codes
    
    # Security Settings
    allowed_ips = Column(Text, nullable=True)  # JSON array of whitelisted IPs
    email_preferences = Column(Text, nullable=True)  # JSON for email settings
    
    # OAuth Providers
    google_id = Column(String, nullable=True, unique=True)  # Google OAuth sub claim
    auth_provider = Column(String, default="email")  # "email", "google", "google_linked"
    
    # One user can have multiple portfolios (e.g., "Retirement", "Trading")
    portfolios = relationship("Portfolio", back_populates="owner", cascade="all, delete-orphan")


class Portfolio(Base):
    """
    Investment portfolio container. Users may maintain multiple portfolios
    for different investment goals (retirement, education, speculation).
    The is_default flag marks the primary portfolio shown on dashboard.
    """
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_default = Column(Boolean, default=False)  # Primary portfolio for quick access
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    owner = relationship("User", back_populates="portfolios")
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="portfolio", cascade="all, delete-orphan")


class Holding(Base):
    """
    Individual asset position within a portfolio. Tracks quantity and cost basis.
    
    The target_allocation field is crucial for rebalancing:
    - Stores the user's desired percentage allocation (e.g., 40% in NIFTY ETF)
    - Compared against actual_allocation (calculated at runtime from current prices)
    - The difference is "drift" which triggers rebalancing recommendations
    
    avg_buy_price enables P&L calculations without querying transaction history.
    """
    __tablename__ = "holdings"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False, index=True)  # e.g., "RELIANCE", "NIFTYBEES"
    name = Column(String, nullable=False)  # Full company/fund name
    asset_type = Column(String, default="EQUITY")  # EQUITY, ETF, MUTUAL_FUND, GOLD, BOND, CASH
    quantity = Column(Float, nullable=False)  # Number of shares/units owned
    avg_buy_price = Column(Float, nullable=False)  # Volume-weighted average cost basis
    target_allocation = Column(Float, default=0.0)  # Target % of total portfolio value
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    portfolio = relationship("Portfolio", back_populates="holdings")


class Transaction(Base):
    """
    Immutable transaction record for audit trail and tax reporting.
    Every buy/sell operation creates a new transaction record.
    Dividends and cash flows are also tracked for complete P&L accounting.
    """
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False)
    transaction_type = Column(SQLEnum(TransactionType), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)  # Price per unit at execution
    total_amount = Column(Float, nullable=False)  # quantity * price + fees
    fees = Column(Float, default=0.0)  # Broker fees, STT, etc.
    notes = Column(Text, nullable=True)  # Optional reason/memo
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    executed_at = Column(DateTime, default=datetime.utcnow)  # When trade was executed
    
    portfolio = relationship("Portfolio", back_populates="transactions")


class StockPrice(Base):
    """
    Price cache to reduce external API calls (Alpha Vantage has 25/day limit).
    Prices are fetched from API only if cache is stale (>5 minutes old).
    This table is ephemeral and can be truncated without data loss.
    """
    __tablename__ = "stock_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False, index=True)
    price = Column(Float, nullable=False)
    change = Column(Float, default=0.0)  # Absolute change from previous close
    change_percent = Column(Float, default=0.0)  # Percentage change
    volume = Column(Integer, default=0)  # Trading volume
    fetched_at = Column(DateTime, default=datetime.utcnow)  # Cache timestamp


class HistoricalPrice(Base):
    """
    Historical OHLCV data for analytics calculations.
    Used to compute: returns, volatility, correlation, beta, efficient frontier.
    Stored locally to avoid repeated API calls for the same date range.
    """
    __tablename__ = "historical_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False, index=True)
    date = Column(DateTime, nullable=False)
    open_price = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)  # Most important - used for returns
    volume = Column(Integer, default=0)


class InvestmentGoal(Base):
    """
    Goal-based investing support. Users can set financial targets
    (e.g., "Retirement: ₹1 Cr by 2040") and track progress.
    Priority helps sort and allocate when goals compete for funds.
    """
    __tablename__ = "investment_goals"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)  # Progress towards goal
    target_date = Column(DateTime, nullable=False)
    priority = Column(Integer, default=1)  # 1 = highest priority
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# =============================================================================
# SECURITY MODELS
# =============================================================================

class PasswordResetToken(Base):
    """
    Secure password reset tokens.
    Token is hashed before storage (SHA-256), expires after 1 hour.
    """
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    used = Column(Boolean, default=False)
    ip_address = Column(String(45))  # IPv6 compatible


class PasswordHistory(Base):
    """Track password history to prevent reuse. Stores last 5 password hashes per user."""
    __tablename__ = "password_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LoginAttempt(Base):
    """Track login attempts for security monitoring and rate limiting."""
    __tablename__ = "login_attempts"

    id = Column(Integer, primary_key=True, index=True)
    email_hash = Column(String(64), nullable=False, index=True)  # Hashed email for privacy
    ip_address = Column(String(45), nullable=False)
    success = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_agent = Column(String(255))


class OneTimePassword(Base):
    """
    Store OTPs for Multi-Factor Authentication (MFA).
    OTPs are short-lived (5-10 mins) and hashed for security.
    """
    __tablename__ = "one_time_passwords"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    otp_hash = Column(String(64), nullable=False)
    purpose = Column(String(20), default="login")  # login, transaction
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    used = Column(Boolean, default=False)


class Dividend(Base):
    """
    Track dividend payments for holdings.
    Enables income tracking and yield calculations.
    """
    __tablename__ = "dividends"

    id = Column(Integer, primary_key=True, index=True)
    holding_id = Column(Integer, ForeignKey("holdings.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)  # Total dividend amount received
    per_share = Column(Float, nullable=True)  # Dividend per share
    ex_date = Column(DateTime, nullable=True)  # Ex-dividend date
    pay_date = Column(DateTime, nullable=True)  # Payment date
    created_at = Column(DateTime, default=datetime.utcnow)
    
    holding = relationship("Holding", backref="dividends")


class UserSession(Base):
    """
    Track active user sessions for security management.
    Enables session listing and remote logout functionality.
    """
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    device_name = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    is_current = Column(Boolean, default=False)
    revoked = Column(Boolean, default=False)
    
    user = relationship("User", backref="sessions")

