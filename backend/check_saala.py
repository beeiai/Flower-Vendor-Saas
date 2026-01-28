from app.core.db import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT COUNT(*) FROM saala_customers'))
        print("Saala customers count:", result.fetchone())
        
        result = conn.execute(text('SELECT COUNT(*) FROM saala_transactions'))
        print("Saala transactions count:", result.fetchone())
except Exception as e:
    print("Error:", e)