import os
from app.core.security import hash_password
from app.core.db import engine
from sqlalchemy import text

# Set test environment variables
os.environ['SECRET_KEY'] = 'test-secret-key-for-testing-purposes-only-change-in-production'
os.environ['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/saas_db'
os.environ['MASTER_ADMIN_USERNAME'] = 'FlowerSaas Admin'
password = 'FlowerSaas0226'
hashed_password = hash_password(password)[:72]  # bcrypt max 72 bytes

os.environ['MASTER_ADMIN_PASSWORD_HASH'] = hashed_password

print('Environment variables set:')
print(f'MASTER_ADMIN_USERNAME: {os.environ["MASTER_ADMIN_USERNAME"]}')
print(f'MASTER_ADMIN_PASSWORD_HASH: {os.environ["MASTER_ADMIN_PASSWORD_HASH"]}')

# Also insert into database
with engine.connect() as conn:
    # Check if already exists
    result = conn.execute(text('SELECT COUNT(*) FROM system_settings WHERE key = \'MASTER_ADMIN_USERNAME\''))
    exists = result.scalar() > 0
    
    if exists:
        # Update existing
        conn.execute(text('UPDATE system_settings SET value = :value WHERE key = \'MASTER_ADMIN_USERNAME\''), 
                    {'value': os.environ['MASTER_ADMIN_USERNAME']})
        conn.execute(text('UPDATE system_settings SET value = :value WHERE key = \'MASTER_ADMIN_PASSWORD_HASH\''), 
                    {'value': os.environ['MASTER_ADMIN_PASSWORD_HASH']})
    else:
        # Insert new
        conn.execute(text('INSERT INTO system_settings (key, value) VALUES (:key, :value)'), 
                    {'key': 'MASTER_ADMIN_USERNAME', 'value': os.environ['MASTER_ADMIN_USERNAME']})
        conn.execute(text('INSERT INTO system_settings (key, value) VALUES (:key, :value)'), 
                    {'key': 'MASTER_ADMIN_PASSWORD_HASH', 'value': os.environ['MASTER_ADMIN_PASSWORD_HASH']})
    
    conn.commit()
    print('Credentials inserted into database')

# Verify the credentials are in the database
with engine.connect() as conn:
    result = conn.execute(text('SELECT key, value FROM system_settings WHERE key IN (\'MASTER_ADMIN_USERNAME\', \'MASTER_ADMIN_PASSWORD_HASH\')'))
    rows = result.fetchall()
    print('\nDatabase contents:')
    for row in rows:
        print(f'{row[0]}: {row[1][:20]}...')