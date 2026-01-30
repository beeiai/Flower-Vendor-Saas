from app.core.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"))
    tables = [row[0] for row in result]
    print("Tables in database:")
    for table in tables:
        print(f"  - {table}")