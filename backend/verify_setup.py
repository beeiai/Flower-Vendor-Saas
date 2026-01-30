import os
from app.core.db import engine
from sqlalchemy import text

# Check if system_settings table exists and has the required entries
try:
    with engine.connect() as conn:
        # Check if table exists
        result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_settings')"))
        table_exists = result.scalar()
        
        if not table_exists:
            print("❌ system_settings table does not exist")
            exit(1)
        
        print("✅ system_settings table exists")
        
        # Check for master admin credentials
        result = conn.execute(text("SELECT key, value FROM system_settings WHERE key IN ('MASTER_ADMIN_USERNAME', 'MASTER_ADMIN_PASSWORD_HASH')"))
        rows = result.fetchall()
        
        credentials = {}
        for row in rows:
            credentials[row[0]] = row[1]
        
        if 'MASTER_ADMIN_USERNAME' in credentials:
            print(f"✅ MASTER_ADMIN_USERNAME found: {credentials['MASTER_ADMIN_USERNAME']}")
        else:
            print("❌ MASTER_ADMIN_USERNAME not found")
            
        if 'MASTER_ADMIN_PASSWORD_HASH' in credentials:
            print(f"✅ MASTER_ADMIN_PASSWORD_HASH found: {credentials['MASTER_ADMIN_PASSWORD_HASH'][:20]}...")
        else:
            print("❌ MASTER_ADMIN_PASSWORD_HASH not found")
            
        # If credentials don't exist, insert test ones
        if 'MASTER_ADMIN_USERNAME' not in credentials or 'MASTER_ADMIN_PASSWORD_HASH' not in credentials:
            print("\n🔧 Inserting test credentials...")
            test_username = "FlowerSaas Admin"
            test_password_hash = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S"  # Pre-hashed test password
            
            if 'MASTER_ADMIN_USERNAME' not in credentials:
                conn.execute(text("INSERT INTO system_settings (key, value) VALUES ('MASTER_ADMIN_USERNAME', :value)"), 
                           {'value': test_username})
            
            if 'MASTER_ADMIN_PASSWORD_HASH' not in credentials:
                conn.execute(text("INSERT INTO system_settings (key, value) VALUES ('MASTER_ADMIN_PASSWORD_HASH', :value)"), 
                           {'value': test_password_hash})
            
            conn.commit()
            print("✅ Test credentials inserted")
            
except Exception as e:
    print(f"❌ Database error: {e}")
    exit(1)