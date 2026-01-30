import asyncio
from app.core.config import settings
from sqlalchemy import create_engine, text
from app.core.db import DATABASE_URL

print('Checking if system_settings table exists...')
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings')"))
        table_exists = result.scalar()
        print(f'system_settings table exists: {table_exists}')
        
        if table_exists:
            result = conn.execute(text('SELECT * FROM system_settings'))
            rows = result.fetchall()
            print('Current system_settings:')
            for row in rows:
                print(f'  {row}')
        else:
            print("system_settings table does not exist yet")
            
except Exception as e:
    print(f'Database error: {e}')