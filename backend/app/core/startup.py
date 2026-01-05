# This file is intentionally imported once at app startup
# to register SQLAlchemy events (audit logging) and create any missing tables

import app.core.audit_events  # noqa: F401

# Auto-create missing tables (safe: only creates if not present)
from app.core.db import Base, engine  # noqa: E402
import app.models  # noqa: F401, E402

Base.metadata.create_all(bind=engine)
