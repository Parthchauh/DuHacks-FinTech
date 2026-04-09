"""
OptiWealth Backend — Main Application
=======================================
FastAPI application with:
- Modern lifespan context manager (replaces deprecated on_event)
- Security headers (CSP, X-Frame-Options, HSTS)
- Rate limiting
- CORS for frontend communication
- Global exception handler for unhandled 500s
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
from routers.sector_rotation import router as sector_rotation_router
from routers.rebalancing import router as rebalancing_router
from routers.smallcase import router as smallcase_router
from routers.market_data import router as market_data_router
from routers.charts import router as charts_router
from middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware
from services.scheduler_service import scheduler_service
from config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern FastAPI lifespan handler replacing deprecated @app.on_event."""
    # ── Startup ──────────────────────────────────────────────────────────────
    print(f"[STARTUP] {settings.APP_NAME} is starting up...")
    models.Base.metadata.create_all(bind=engine)
    print("[SEC] Security features enabled")
    scheduler_service.start(SessionLocal)
    print("[SCHEDULER] Background tasks initialized")

    yield  # Application runs here

    # ── Shutdown ─────────────────────────────────────────────────────────────
    print(f"[SHUTDOWN] {settings.APP_NAME} is shutting down...")
    scheduler_service.shutdown()


# Create all database tables at import time (also done in lifespan for safety)
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Advanced quant-driven portfolio analytics and rebalancing system for Indian investors",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler for unhandled 500 errors — prevents raw tracebacks leaking."""
    import traceback
    print(f"[ERROR] Unhandled exception on {request.method} {request.url}:")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
    )

# Security Headers Middleware (must be added first)
app.add_middleware(SecurityHeadersMiddleware)

# Rate Limiting Middleware (600 requests per minute per IP for local development)
app.add_middleware(RateLimitMiddleware, requests_per_minute=600)

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
app.include_router(sector_rotation_router)
app.include_router(rebalancing_router)
app.include_router(smallcase_router)
app.include_router(market_data_router)
app.include_router(charts_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to OptiWealth API",
        "documentation": "/api/docs",
        "version": "1.0.0",
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

