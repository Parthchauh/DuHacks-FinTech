from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============== Enums ==============
class TransactionType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    DIVIDEND = "DIVIDEND"
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"


class RiskProfile(str, Enum):
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


class AssetType(str, Enum):
    EQUITY = "EQUITY"
    ETF = "ETF"
    MUTUAL_FUND = "MUTUAL_FUND"
    GOLD = "GOLD"
    BOND = "BOND"
    CASH = "CASH"


# ============== User Schemas ==============
class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    currency: Optional[str] = None
    risk_profile: Optional[RiskProfile] = None
    email_preferences: Optional[dict] = None


class UserResponse(UserBase):
    id: int
    currency: str
    risk_profile: RiskProfile
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== Auth Schemas ==============
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    captcha_token: Optional[str] = None
    captcha_answer: Optional[str] = None


class CaptchaResponse(BaseModel):
    token: str
    question: str


class VerifyMFARequest(BaseModel):
    mfa_token: str
    otp: str


class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: Optional[str] = None
    mfa_required: bool = False
    mfa_token: Optional[str] = None
    message: Optional[str] = None


# ============== Holding Schemas ==============
class HoldingBase(BaseModel):
    ticker: str
    name: str
    asset_type: AssetType = AssetType.EQUITY
    quantity: float = Field(gt=0)
    avg_buy_price: float = Field(gt=0)
    target_allocation: float = Field(ge=0, le=100, default=0)


class HoldingCreate(HoldingBase):
    pass


class HoldingUpdate(BaseModel):
    quantity: Optional[float] = None
    avg_buy_price: Optional[float] = None
    target_allocation: Optional[float] = None


class HoldingResponse(HoldingBase):
    id: int
    portfolio_id: int
    created_at: datetime
    
    # Computed fields (will be set by API)
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    profit_loss: Optional[float] = None
    profit_loss_percent: Optional[float] = None
    actual_allocation: Optional[float] = None
    drift: Optional[float] = None
    
    class Config:
        from_attributes = True


# ============== Portfolio Schemas ==============
class PortfolioBase(BaseModel):
    name: str
    description: Optional[str] = None


class PortfolioCreate(PortfolioBase):
    is_default: bool = False


class PortfolioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class PortfolioResponse(PortfolioBase):
    id: int
    is_default: bool
    user_id: int
    created_at: datetime
    holdings: List[HoldingResponse] = []
    
    # Computed fields
    total_value: Optional[float] = None
    total_invested: Optional[float] = None
    total_profit_loss: Optional[float] = None
    total_profit_loss_percent: Optional[float] = None
    
    class Config:
        from_attributes = True


class PortfolioSummary(BaseModel):
    id: int
    name: str
    total_value: float
    holding_count: int


# ============== Transaction Schemas ==============
class TransactionBase(BaseModel):
    ticker: str
    transaction_type: TransactionType
    quantity: float = Field(gt=0)
    price: float = Field(gt=0)
    fees: float = Field(ge=0, default=0)
    notes: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionResponse(TransactionBase):
    id: int
    total_amount: float
    portfolio_id: int
    executed_at: datetime
    
    class Config:
        from_attributes = True


# ============== Stock Price Schemas ==============
class StockQuote(BaseModel):
    ticker: str
    price: float
    change: float
    change_percent: float
    volume: int
    fetched_at: datetime


class HistoricalPriceData(BaseModel):
    date: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


# ============== Analytics Schemas ==============
class PortfolioMetrics(BaseModel):
    total_value: float
    total_invested: float
    total_return: float
    total_return_percent: float
    daily_change: float
    daily_change_percent: float
    
    # Risk Metrics
    sharpe_ratio: float
    volatility: float
    beta: float
    alpha: float
    
    # Risk Score (1-10)
    risk_score: float
    risk_level: str  # Low, Medium, High
    
    # Diversification
    diversification_score: float
    sector_concentration: dict  # sector -> percentage


class CorrelationData(BaseModel):
    asset1: str
    asset2: str
    correlation: float


class RebalanceTrade(BaseModel):
    ticker: str
    name: str
    trade_type: str  # BUY or SELL
    current_allocation: float
    target_allocation: float
    current_value: float
    target_value: float
    trade_amount: float
    shares: float
    reason: str


class RebalancePlan(BaseModel):
    trades: List[RebalanceTrade]
    total_buy_amount: float
    total_sell_amount: float
    metrics_before: PortfolioMetrics
    metrics_after: PortfolioMetrics


class MonteCarloResult(BaseModel):
    percentile_5: List[float]
    percentile_25: List[float]
    percentile_50: List[float]
    percentile_75: List[float]
    percentile_95: List[float]
    expected_value: float
    var_95: float  # Value at Risk (95%)


class EfficientFrontierPoint(BaseModel):
    expected_return: float
    volatility: float
    sharpe_ratio: float
    weights: dict  # ticker -> weight


# ============== Investment Goal Schemas ==============
class GoalBase(BaseModel):
    name: str
    target_amount: float = Field(gt=0)
    target_date: datetime
    priority: int = Field(ge=1, le=5, default=1)


class GoalCreate(GoalBase):
    pass


class GoalResponse(GoalBase):
    id: int
    current_amount: float
    progress_percent: float
    monthly_investment_needed: float
    
    class Config:
        from_attributes = True
