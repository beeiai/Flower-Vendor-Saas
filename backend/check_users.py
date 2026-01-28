from app.core.db import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT COUNT(*) FROM users'))
        print("Users count:", result.fetchone())
        
        result = conn.execute(text('SELECT * FROM users LIMIT 1'))
        print("First user:", result.fetchone())
except Exception as e:
    print("Error:", e)