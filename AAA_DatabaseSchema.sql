-- OptiWealth Database Schema
-- Generated from backend/models.py
-- Parameters for PostgreSQL

-- Enable UUID extension if needed (though we use Integer IDs primarily)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Enums
-- ==========================================

DO $$ BEGIN
    CREATE TYPE risk_profile_enum AS ENUM ('conservative', 'moderate', 'aggressive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE mfa_method_enum AS ENUM ('none', 'email', 'totp');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- Tables
-- ==========================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR NOT NULL,
    currency VARCHAR DEFAULT 'INR',
    risk_profile risk_profile_enum DEFAULT 'moderate',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- MFA Configuration
    mfa_method mfa_method_enum DEFAULT 'email',
    totp_secret VARCHAR,
    backup_codes TEXT,
    
    -- Security Settings
    allowed_ips TEXT,
    email_preferences TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Portfolios
CREATE TABLE IF NOT EXISTS portfolios (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

-- 3. Holdings
CREATE TABLE IF NOT EXISTS holdings (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    asset_type VARCHAR DEFAULT 'EQUITY',
    quantity FLOAT NOT NULL,
    avg_buy_price FLOAT NOT NULL,
    target_allocation FLOAT DEFAULT 0.0,
    portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holdings_ticker ON holdings(ticker);
CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_id ON holdings(portfolio_id);

-- 4. Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR NOT NULL,
    transaction_type transaction_type_enum NOT NULL,
    quantity FLOAT NOT NULL,
    price FLOAT NOT NULL,
    total_amount FLOAT NOT NULL,
    fees FLOAT DEFAULT 0.0,
    notes TEXT,
    portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON transactions(portfolio_id);

-- 5. Stock Prices (Cache)
CREATE TABLE IF NOT EXISTS stock_prices (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR NOT NULL,
    price FLOAT NOT NULL,
    change FLOAT DEFAULT 0.0,
    change_percent FLOAT DEFAULT 0.0,
    volume INTEGER DEFAULT 0,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker ON stock_prices(ticker);

-- 6. Historical Prices
CREATE TABLE IF NOT EXISTS historical_prices (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR NOT NULL,
    date TIMESTAMP NOT NULL,
    open_price FLOAT NOT NULL,
    high FLOAT NOT NULL,
    low FLOAT NOT NULL,
    close FLOAT NOT NULL,
    volume INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_historical_prices_ticker ON historical_prices(ticker);

-- 7. Investment Goals
CREATE TABLE IF NOT EXISTS investment_goals (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    target_amount FLOAT NOT NULL,
    current_amount FLOAT DEFAULT 0.0,
    target_date TIMESTAMP NOT NULL,
    priority INTEGER DEFAULT 1,
    user_id INTEGER NOT NULL REFERENCES users(id), -- Note: Not set to Cascade in Model, but we handle manually in code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investment_goals_user_id ON investment_goals(user_id);

-- ==========================================
-- Security Tables
-- ==========================================

-- 8. Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- 9. Password History
CREATE TABLE IF NOT EXISTS password_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);

-- 10. Login Attempts
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    email_hash VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_agent VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_hash ON login_attempts(email_hash);

-- 11. One Time Passwords (MFA)
CREATE TABLE IF NOT EXISTS one_time_passwords (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(64) NOT NULL,
    purpose VARCHAR(20) DEFAULT 'login',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_one_time_passwords_user_id ON one_time_passwords(user_id);

-- 12. Dividends
CREATE TABLE IF NOT EXISTS dividends (
    id SERIAL PRIMARY KEY,
    holding_id INTEGER NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
    amount FLOAT NOT NULL,
    per_share FLOAT,
    ex_date TIMESTAMP,
    pay_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dividends_holding_id ON dividends(holding_id);

-- 13. User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_name VARCHAR(100),
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN DEFAULT FALSE,
    revoked BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
