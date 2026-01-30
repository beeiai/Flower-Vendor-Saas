import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from app.core.db import engine
from app.routes.auth import router as auth_router
from app.routes.settlements import router as settlement_router
from fastapi.staticfiles import StaticFiles
from app.core.startup import *  # noqa: F401
from app.routes import farmers, farmer_groups, vehicles
from app.routes import items as catalog_items
from app.routes import advances
from app.routes import silk
from app.routes import reports
from app.routes import sms
from app.routes import saala
from app.routes import print_templates
from app.routes import health  # Health check endpoints
from app.routes.admin import router as admin_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.core.config import settings
from app.core.rate_limiter import rate_limit_middleware
from app.core.security_middleware import SecurityHeadersMiddleware
from app.core.structured_logging import log_security_event
from app.core.redis_client import redis_client
from app.core.request_id_middleware import RequestIDMiddleware
from app.core.cache_middleware import PerRequestCacheMiddleware
import uvicorn

# Initialize structured logging
from app.core.structured_logging import setup_structured_logging
setup_structured_logging()

logger = logging.getLogger(__name__)

# Create the FastAPI app first
app = FastAPI(
    title="Flower Vendor SaaS API",
    version="1.0.0",
    # Security: Disable OpenAPI in production
    docs_url=None if settings.REQUIRE_SECURE_SECRETS else "/docs",
    redoc_url=None if settings.REQUIRE_SECURE_SECRETS else "/redoc",
    openapi_url=None if settings.REQUIRE_SECURE_SECRETS else "/openapi.json"
)

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize application resources on startup."""
    logger.info("Starting application...")
    
    # Validate master admin credentials are configured
    if not settings.MASTER_ADMIN_USERNAME or not settings.MASTER_ADMIN_PASSWORD_HASH:
        logger.error("MASTER_ADMIN_USERNAME and MASTER_ADMIN_PASSWORD_HASH must be set in environment variables")
        raise RuntimeError("Master admin credentials not configured. Application cannot start.")
    
    # Redis connection will be initialized lazily when first needed
    # This prevents startup failures if Redis is unavailable
    logger.info("Application started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up application resources on shutdown."""
    logger.info("Shutting down application...")
    # Close Redis connection if it was opened
    await redis_client.close()
    logger.info("Application shut down successfully")

# Security Middleware Chain (Order matters!)
# 1. Request ID middleware (first for traceability)
app.add_middleware(RequestIDMiddleware)

# 2. Rate limiting (reject excessive requests early)
app.middleware("http")(rate_limit_middleware)

# 3. Security headers
app.add_middleware(SecurityHeadersMiddleware)

# 4. Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 5. Per-request cache cleanup
app.add_middleware(PerRequestCacheMiddleware)

# 5. CORS configuration is environment-driven so production can restrict origins
# without changing code. Defaults are localhost Vite dev URLs.
allowed_origins = [o for o in settings.CORS_ALLOWED_ORIGINS.split(",") if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    # Security: Expose only necessary headers
    expose_headers=["X-Request-ID"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(settlement_router, prefix="/api")
app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(farmers.router, prefix="/api")
app.include_router(farmer_groups.router, prefix="/api")
app.include_router(vehicles.router, prefix="/api")
app.include_router(catalog_items.router, prefix="/api")
app.include_router(catalog_items.alias, prefix="/api")
app.include_router(farmers.customers, prefix="/api")
app.include_router(advances.router, prefix="/api")
app.include_router(silk.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(sms.router, prefix="/api")
app.include_router(saala.router, prefix="/api")
app.include_router(print_templates.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(admin_router, prefix="/api")


# Legacy health endpoint for backward compatibility
@app.get("/api/health")
def legacy_health() -> dict:
    """Legacy health check endpoint (maintained for compatibility).
    
    Use /api/health instead for new integrations.
    """
    return {"status": "ok"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Enhanced catch-all handler with proper error logging and optional Sentry integration.

    HTTPExceptions and validation errors are handled by FastAPI; this only
    normalizes unexpected server errors.
    """
    import os
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Log detailed error information
    logger.error(
        f"Unhandled exception in {request.method} {request.url.path}",
        extra={
            "exception_type": type(exc).__name__,
            "exception_message": str(exc)[:500],  # Longer truncation for better debugging
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", "unknown")
        },
        exc_info=True  # Include full stack trace in logs
    )
    
    # Log security event for audit trail
    log_security_event(
        "unhandled_exception",
        {
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host if request.client else "unknown",
            "exception_type": type(exc).__name__,
            "exception_message": str(exc)[:200]
        },
        severity="ERROR"
    )
    
    # Optional Sentry integration
    sentry_dsn = os.getenv("SENTRY_DSN")
    if sentry_dsn:
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except ImportError:
            # Sentry SDK not installed, silently ignore
            pass
        except Exception as sentry_error:
            logger.warning(f"Failed to send error to Sentry: {sentry_error}")
    
    # Return safe error response to client
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error.",
            "request_id": getattr(request.state, "request_id", None)
        },
    )


@app.get("/")
def home():
    return {"message": "API is running"}




@app.get("/db-test")
def test_db():
    """Database connectivity test endpoint (for debugging only)."""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            db_status = result.scalar()
            logger.info("Database connectivity test successful")
            return {"db": "connected", "result": db_status}
    except Exception as e:
        logger.error(f"Database connectivity test failed: {str(e)}")
        # Do not leak DB errors; just return a generic message.
        return {"db": "error", "details": "Database connectivity issue"}
