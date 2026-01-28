from app.core.db import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT COUNT(*) FROM silk_daily_collections'))
        print("Silk daily collections count:", result.fetchone())
except Exception as e:
    print("Error:", e)