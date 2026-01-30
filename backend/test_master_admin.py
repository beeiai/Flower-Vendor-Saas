"""
Test script to verify the master admin functionality works as expected.
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.security import hash_password
from app.core.db import engine
from sqlalchemy import text

def setup_master_admin():
    """
    Set up master admin credentials in the system_settings table for testing.
    """
    print("Setting up master admin credentials...")
    
    # Define test credentials
    username = "test_master_admin"
    password = "Secure123"
    password_hash = hash_password(password[:72])  # bcrypt max 72 bytes
    
    # Store in system_settings table
    with engine.connect() as conn:
        # Check if already exists
        result = conn.execute(
            text("SELECT COUNT(*) FROM system_settings WHERE key = 'MASTER_ADMIN_USERNAME'")
        )
        exists = result.scalar() > 0
        
        if exists:
            # Update existing
            conn.execute(
                text("UPDATE system_settings SET value = :value WHERE key = 'MASTER_ADMIN_USERNAME'"),
                {"value": username}
            )
            conn.execute(
                text("UPDATE system_settings SET value = :value WHERE key = 'MASTER_ADMIN_PASSWORD_HASH'"),
                {"value": password_hash}
            )
        else:
            # Insert new
            conn.execute(
                text("INSERT INTO system_settings (key, value) VALUES (:key, :value)"),
                {"key": "MASTER_ADMIN_USERNAME", "value": username}
            )
            conn.execute(
                text("INSERT INTO system_settings (key, value) VALUES (:key, :value)"),
                {"key": "MASTER_ADMIN_PASSWORD_HASH", "value": password_hash}
            )
        
        conn.commit()
    
    print(f"Master admin credentials set up:")
    print(f"  Username: {username}")
    print(f"  Password: {password}")
    print("  (Remember to set these in your environment variables for production)")
    print()
    print("You can now test the following endpoints:")
    print("  POST /api/auth/master-login")
    print("  POST /api/admin/create-vendor")
    print("  POST /api/admin/change-master-password")

if __name__ == "__main__":
    setup_master_admin()