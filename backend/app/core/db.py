from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import time
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)

DATABASE_URL = settings.DATABASE_URL


# ===============================
# 🔌 RENDER + POSTGRES CONNECTION
# ===============================

connect_args = {
    "connect_timeout": 10,
}

# Render Postgres requires SSL
if "render.com" in DATABASE_URL:
    connect_args["sslmode"] = "require"


engine = create_engine(
    DATABASE_URL,

    # ✅ Pool sizing (safe for Render free tier)
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,

    # ✅ Stability
    pool_pre_ping=True,
    pool_reset_on_return="rollback",

    # ✅ Logging
    echo=False,

    connect_args=connect_args,
)


# ===============================
# 🧠 SESSION FACTORY
# ===============================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=True,
)

Base = declarative_base()


# ===============================
# 🔁 DB RETRY (for Render startup race)
# ===============================

def wait_for_db(max_retries: int = 10, delay: int = 3):
    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✅ Database connected")
            return
        except Exception as e:
            logger.warning(f"⏳ DB not ready (attempt {attempt+1}): {e}")
            time.sleep(delay)

    raise RuntimeError("❌ Database not available after retries")


# ===============================
# 📦 FASTAPI / FLASK DEPENDENCY
# ===============================

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ===============================
# 🧰 SESSION MANAGER (for services)
# ===============================

class DatabaseSessionManager:

    def __init__(self):
        self.Session = SessionLocal

    def get_session(self):
        return self.Session()

    @contextmanager
    def get_session_context(self):
        session = self.Session()
        try:
            yield session
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


db_manager = DatabaseSessionManager()


# ===============================
# ❤️ HEALTH CHECK
# ===============================

def check_db_health() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"DB health check failed: {e}")
        return False