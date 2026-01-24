"""
OptiWealth Backend - Main Application
======================================
FastAPI application with comprehensive security:
- Security headers (CSP, X-Frame-Options, HSTS)
- Rate limiting
- CORS for frontend communication
- Centralized authentication
- Scheduled background tasks
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal
import models
from routers import auth, portfolio, analytics
from routers.password_reset import router as password_reset_router
from routers.export import router as export_router
from routers.dividends import router as dividends_router
from routers.sessions import router as sessions_router
from routers.tax import router as tax_router
from routers.ai import router as ai_router
from routers.mfa import router as mfa_router
from routers.broker import router as broker_router
from routers.import_data import router as import_router
from routers.notifications import router as notifications_router
from middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware
from services.scheduler_service import scheduler_service
from config import get_settings

settings = get_settings()

# Create all database tables including security tables
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Advanced quant-driven portfolio analytics and rebalancing system for Indian investors",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Security Headers Middleware (must be added first)
app.add_middleware(SecurityHeadersMiddleware)

# Rate Limiting Middleware (60 requests per minute per IP)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id", "X-CSRF-Token"],
)

# Include routers
app.include_router(auth.router)
app.include_router(password_reset_router)
app.include_router(portfolio.router)
app.include_router(analytics.router)
app.include_router(export_router)
app.include_router(dividends_router)
app.include_router(sessions_router)
app.include_router(tax_router)
app.include_router(ai_router)
app.include_router(mfa_router)
app.include_router(broker_router)
app.include_router(import_router)
app.include_router(notifications_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to OptiWealth API",
        "documentation": "/api/docs",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


# Startup event
@app.on_event("startup")
async def startup_event():
    print(f"[STARTUP] {settings.APP_NAME} is starting up...")
    
    # Initialize DB (create tables)
    models.Base.metadata.create_all(bind=engine)
    print(f"[SEC] Security features enabled")
    
    # Start background scheduler for automated reports
    scheduler_service.start(SessionLocal)
    print(f"[SCHEDULER] Background tasks initialized")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    print(f"[SHUTDOWN] {settings.APP_NAME} is shutting down...")
    scheduler_service.shutdown()

