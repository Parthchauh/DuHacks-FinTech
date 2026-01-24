"""
OptiWealth Backend - Database Configuration
============================================
This module establishes the SQLAlchemy database connection and provides
the session management infrastructure. SQLAlchemy ORM is used instead of
raw SQL for type safety, query building, and cross-database compatibility.

Key Components:
- engine: Manages the connection pool to PostgreSQL
- SessionLocal: Factory for creating database sessions (unit of work pattern)
- Base: Declarative base for all ORM models
- get_db: Dependency injection function for FastAPI endpoints

The get_db() generator pattern ensures proper session cleanup even if
requests fail, preventing connection leaks in the connection pool.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import get_settings

settings = get_settings()

# Create database engine with connection pooling
# PostgreSQL is chosen for ACID compliance, JSON support, and production scalability
engine = create_engine(settings.DATABASE_URL)

# Session factory - autocommit=False ensures explicit transaction control
# autoflush=False prevents premature writes before commit
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class - all ORM models inherit from this
Base = declarative_base()


def get_db():
    """
    Database session dependency for FastAPI endpoints.
    
    Uses a generator pattern to ensure the session is always closed after
    the request completes, even if an exception occurs. This prevents
    connection pool exhaustion and ensures data consistency.
    
    Usage in endpoints:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
