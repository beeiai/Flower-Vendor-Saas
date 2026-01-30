"""
Health and readiness check endpoints for monitoring and orchestration.
"""
from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from app.core.db import engine
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.
    Returns 200 OK when the service is running.
    Used by load balancers and orchestrators for liveness probes.
    """
    return {"status": "ok", "service": "flower-vendor-api"}


@router.get("/ready")
async def readiness_check():
    """
    Readiness check endpoint.
    Verifies that the service is ready to serve traffic by checking:
    - Database connectivity
    - Critical subsystems
    
    Returns 200 OK if ready, 503 Service Unavailable if not ready.
    """
    try:
        # Check database connectivity
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            if result.scalar() != 1:
                raise Exception("Database query returned unexpected result")
        
        logger.info("Readiness check passed - service is ready")
        return {
            "status": "ready", 
            "service": "flower-vendor-api",
            "checks": {
                "database": "ok"
            }
        }
        
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "not_ready",
                "service": "flower-vendor-api", 
                "error": str(e),
                "checks": {
                    "database": "failed"
                }
            }
        )


@router.get("/health/database")
async def database_health():
    """
    Detailed database health check.
    Provides more granular information about database connectivity.
    """
    try:
        with engine.connect() as conn:
            # Test basic connectivity
            result = conn.execute(text("SELECT 1"))
            basic_check = result.scalar() == 1
            
            # Test query performance (simple query)
            result = conn.execute(text("SELECT NOW()"))
            timestamp = result.scalar()
            
        return {
            "status": "healthy" if basic_check else "unhealthy",
            "database": {
                "connected": basic_check,
                "timestamp": timestamp.isoformat() if timestamp else None,
                "engine_url": str(engine.url) if hasattr(engine, 'url') else "unknown"
            }
        }
        
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "database": {
                "connected": False,
                "error": str(e)
            }
        }