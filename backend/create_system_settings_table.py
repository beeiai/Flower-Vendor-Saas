from app.core.db import engine
from sqlalchemy import text

# Read and execute the SQL
with open('create_system_settings.sql', 'r') as f:
    sql = f.read()

with engine.connect() as conn:
    conn.execute(text(sql))
    conn.commit()
    print('Table created successfully')