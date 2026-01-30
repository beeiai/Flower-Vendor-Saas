from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import logging


DATABASE_URL = settings.DATABASE_URL

# Configure connection pool with production-appropriate settings
# Optimized for performance: larger pool for high-concurrency scenarios
engine = create_engine(
    DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,  # Verify connections before use
    pool_reset_on_return="rollback",
    # Performance: Enable prepared statement caching
    query_cache_size=1200,
    # Security: Disable statement logging in production
    echo=False,
    # Connection optimization
    connect_args={
        "connect_timeout": 10,
        # Enable connection keepalive
        "keepalives_idle": 300,
        "keepalives_interval": 30,
        "keepalives_count": 3,
    }
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    # Expire objects on commit to prevent stale data
    expire_on_commit=True
)

Base = declarative_base()

def get_db():
    """Dependency for getting database session with proper cleanup."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        # Rollback on any exception
        db.rollback()
        raise
    finally:
        # Always close the session
        db.close()


class DatabaseSessionManager:
    """Lightweight session manager to reduce session creation overhead."""
    
    def __init__(self):
        self.Session = SessionLocal
    
    def get_session(self):
        """Get a session from the pool."""
        return self.Session()
    
    def get_session_context(self):
        """Context manager for session that ensures proper cleanup."""
        session = self.Session()
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


db_manager = DatabaseSessionManager()

