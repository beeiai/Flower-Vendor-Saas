from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
import app.core.audit_events 

DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# ✅ THIS IS WHAT YOU ARE MISSING
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

