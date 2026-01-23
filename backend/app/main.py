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
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.rate_limiter import rate_limit_middleware

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Flower Vendor SaaS API",
    version="1.0.0",
)

# Attach rate limiting as the first middleware so it runs before handlers.
app.middleware("http")(rate_limit_middleware)

# CORS configuration is environment-driven so production can restrict origins
# without changing code. Defaults are localhost Vite dev URLs.
allowed_origins = [o for o in settings.CORS_ALLOWED_ORIGINS.split(",") if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
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


@app.get("/api/health")
def health() -> dict:
    """Lightweight health check used by the SPA to verify backend availability.

    Kept unauthenticated on purpose so that login screens can call it without
    a JWT. Returns a minimal, stable payload.
    """

    return {"status": "ok"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all handler to avoid leaking stack traces to clients.

    HTTPExceptions and validation errors are handled by FastAPI; this only
    normalizes unexpected server errors.
    """
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error."},
    )


@app.get("/")
def home():
    return {"message": "API is running"}




@app.get("/db-test")
def test_db():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            return {"db": "connected", "result": result.scalar()}
    except Exception:
        # Do not leak DB errors; just return a generic message.
        return {"db": "error", "details": "Database connectivity issue"}
