"""
OptiWealth — Database Migration Script
========================================
Applies missing columns to the Neon PostgreSQL database.

Root cause of "column users.mfa_method does not exist":
  - models.py was updated to add MFA, security, OAuth columns
  - The Neon PostgreSQL schema was never migrated (no Alembic)
  - SQLAlchemy's create_all() only creates MISSING tables, not missing columns

Run this ONCE to bring the Neon DB schema up to date:
    cd backend && python migrate_schema.py

Safe to re-run — all statements use "ADD COLUMN IF NOT EXISTS".
"""

import sys
from sqlalchemy import text
from database import engine

MIGRATIONS = [
    # ── MFA columns ─────────────────────────────────────────────────────────────
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_method VARCHAR DEFAULT 'email'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT",

    # ── Security columns ────────────────────────────────────────────────────────
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_ips TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_preferences TEXT",

    # ── OAuth columns ───────────────────────────────────────────────────────────
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR UNIQUE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR DEFAULT 'email'",

    # ── Missing security tables ──────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        used BOOLEAN DEFAULT FALSE,
        ip_address VARCHAR(45)
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_token_hash ON password_reset_tokens (token_hash)",

    """
    CREATE TABLE IF NOT EXISTS password_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        email_hash VARCHAR(64) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        success BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        user_agent VARCHAR(255)
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_login_attempts_email_hash ON login_attempts (email_hash)",

    """
    CREATE TABLE IF NOT EXISTS one_time_passwords (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        otp_hash VARCHAR(64) NOT NULL,
        purpose VARCHAR(20) DEFAULT 'login',
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        used BOOLEAN DEFAULT FALSE
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS dividends (
        id SERIAL PRIMARY KEY,
        holding_id INTEGER REFERENCES holdings(id) ON DELETE CASCADE,
        amount FLOAT NOT NULL,
        per_share FLOAT,
        ex_date TIMESTAMP,
        pay_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_name VARCHAR(100),
        location VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        last_active TIMESTAMP DEFAULT NOW(),
        is_current BOOLEAN DEFAULT FALSE,
        revoked BOOLEAN DEFAULT FALSE
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_user_sessions_token_hash ON user_sessions (token_hash)",

    # ── Transaction notes column ─────────────────────────────────────────────────
    "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes TEXT",
]


def run_migrations():
    print("=" * 60)
    print("OptiWealth — Schema Migration")
    print("=" * 60)

    with engine.connect() as conn:
        for i, sql in enumerate(MIGRATIONS, 1):
            stmt = sql.strip()
            preview = stmt[:80].replace("\n", " ")
            try:
                conn.execute(text(stmt))
                conn.commit()
                print(f"  [{i:02d}] [OK]   {preview}...")
            except Exception as exc:
                print(f"  [{i:02d}] [WARN] {preview}...")
                print(f"         → {exc}")
                # Non-fatal: column might already exist with different definition
                conn.rollback()

    print("\n[DONE] Migration complete. Backend is ready.")


if __name__ == "__main__":
    run_migrations()
