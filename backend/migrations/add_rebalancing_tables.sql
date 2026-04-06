-- ===================================================================
-- OptiWealth — Rebalancing Tables Migration
-- ===================================================================
-- Run this against your database to add rebalancing support tables.
-- Compatible with PostgreSQL (Neon) and SQLite.
-- ===================================================================

-- Rebalancing log — stores each pipeline execution result
CREATE TABLE IF NOT EXISTS rebalancing_log (
    id              SERIAL PRIMARY KEY,
    portfolio_id    INTEGER NOT NULL,
    triggered_by    VARCHAR(50) DEFAULT 'manual',
    total_drift_score FLOAT DEFAULT 0.0,
    trades_count    INTEGER DEFAULT 0,
    trades_buy_count INTEGER DEFAULT 0,
    trades_sell_count INTEGER DEFAULT 0,
    estimated_tax   FLOAT DEFAULT 0.0,
    estimated_savings FLOAT DEFAULT 0.0,
    cost_of_inaction FLOAT DEFAULT 0.0,
    ai_summary      TEXT DEFAULT '',
    report_json     TEXT DEFAULT '{}',
    status          VARCHAR(20) DEFAULT 'completed',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rebal_portfolio
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
        ON DELETE CASCADE
);

-- Index for fast portfolio history lookups
CREATE INDEX IF NOT EXISTS idx_rebal_log_portfolio
    ON rebalancing_log(portfolio_id, created_at DESC);


-- Harvest log — tracks tax-loss harvest executions
CREATE TABLE IF NOT EXISTS harvest_log (
    id              SERIAL PRIMARY KEY,
    portfolio_id    INTEGER NOT NULL,
    rebalancing_id  INTEGER,
    symbol          VARCHAR(20) NOT NULL,
    replacement     VARCHAR(20) NOT NULL,
    unrealized_loss FLOAT DEFAULT 0.0,
    tax_saved       FLOAT DEFAULT 0.0,
    wash_sale_safe  BOOLEAN DEFAULT TRUE,
    executed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_harvest_portfolio
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_harvest_rebal
        FOREIGN KEY (rebalancing_id) REFERENCES rebalancing_log(id)
        ON DELETE SET NULL
);


-- Broker connections — stores Groww/Smallcase auth state
CREATE TABLE IF NOT EXISTS broker_connections (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE,
    broker_name     VARCHAR(50) DEFAULT 'groww',
    auth_token      TEXT DEFAULT '',
    refresh_token   TEXT DEFAULT '',
    token_expires   TIMESTAMP,
    holdings_synced BOOLEAN DEFAULT FALSE,
    last_sync       TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_broker_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);


-- Rebalancing config per portfolio (optional override of defaults)
CREATE TABLE IF NOT EXISTS rebalancing_config (
    id              SERIAL PRIMARY KEY,
    portfolio_id    INTEGER NOT NULL UNIQUE,
    drift_threshold FLOAT DEFAULT 0.05,
    min_trade_value FLOAT DEFAULT 500.0,
    tax_aware       BOOLEAN DEFAULT TRUE,
    auto_execute    BOOLEAN DEFAULT FALSE,
    rebalance_frequency VARCHAR(20) DEFAULT 'quarterly',
    risk_tolerance  FLOAT DEFAULT 0.15,
    max_turnover    FLOAT DEFAULT 0.30,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rebalcfg_portfolio
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
        ON DELETE CASCADE
);
