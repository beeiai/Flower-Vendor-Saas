#!/usr/bin/env python3
"""
Security Verification Script
Tests all security requirements for the Master Admin system
"""

import requests
import json
import jwt
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"
MASTER_CREDS = {
    "username": "FlowerSaas Admin",
    "password": "FlowerSaas0226"
}

def test_1_signup_disabled():
    """Test 1: Verify signup endpoint returns 404"""
    print("🔍 Test 1: Verifying signup is disabled...")
    try:
        response = requests.post(f"{BASE_URL}/api/auth/register")
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 404:
            print("   ✅ PASS: Signup endpoint correctly returns 404")
            return True
        else:
            print(f"   ❌ FAIL: Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False

def test_2_master_login():
    """Test 2: Verify master login works"""
    print("\n🔍 Test 2: Verifying master login...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/admin/master-login",
            json=MASTER_CREDS,
            headers={"Content-Type": "application/json"}
        )
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                print("   ✅ PASS: Master login successful")
                print(f"   Token: {token[:50]}...")
                return token
            else:
                print("   ❌ FAIL: No access_token in response")
                return None
        else:
            print(f"   ❌ FAIL: Login failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return None

def test_3_vendor_creation_requires_token(master_token):
    """Test 3: Verify vendor creation requires master token"""
    print("\n🔍 Test 3: Verifying vendor creation requires master token...")
    
    vendor_data = {
        "name": "Test Vendor",
        "contact_person": "Test Person",
        "phone": "1234567890",
        "email": "test@example.com",
        "address": "Test Address"
    }
    
    # Test without token
    print("   Testing without token...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/admin/create-vendor",
            json=vendor_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"   Status Code (no token): {response.status_code}")
        if response.status_code == 401:
            print("   ✅ PASS: No token correctly returns 401")
        else:
            print(f"   ❌ FAIL: Expected 401, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False
    
    # Test with master token
    print("   Testing with master token...")
    try:
        response = requests.post(
            f"{BASE_URL}/api/admin/create-vendor",
            json=vendor_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {master_token}"
            }
        )
        print(f"   Status Code (with token): {response.status_code}")
        if response.status_code == 200:
            print("   ✅ PASS: Master token allows vendor creation")
            return True
        else:
            print(f"   ❌ FAIL: Expected 200, got {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False

def test_4_token_expiry(master_token):
    """Test 4: Verify token expiry is ~7200 seconds"""
    print("\n🔍 Test 4: Verifying token expiry...")
    try:
        # Decode JWT without verification to check claims
        decoded = jwt.decode(master_token, options={"verify_signature": False})
        exp = decoded.get("exp")
        iat = decoded.get("iat")
        
        if exp and iat:
            expiry_seconds = exp - iat
            print(f"   Token issued at: {datetime.fromtimestamp(iat)}")
            print(f"   Token expires at: {datetime.fromtimestamp(exp)}")
            print(f"   Expiry duration: {expiry_seconds} seconds ({expiry_seconds/3600:.1f} hours)")
            
            if 7100 <= expiry_seconds <= 7300:  # Allow 100 second tolerance
                print("   ✅ PASS: Token expiry is approximately 2 hours")
                return True
            else:
                print(f"   ❌ FAIL: Expected ~7200 seconds, got {expiry_seconds}")
                return False
        else:
            print("   ❌ FAIL: Token missing exp or iat claims")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False

def test_5_system_settings():
    """Test 5: Verify system_settings table exists with credentials"""
    print("\n🔍 Test 5: Verifying system_settings table...")
    import psycopg2
    
    try:
        conn = psycopg2.connect('postgresql://postgres:Sandy3715@localhost:5432/flowersaas')
        cur = conn.cursor()
        
        # Check if table exists and has data
        cur.execute("SELECT COUNT(*) FROM system_settings")
        count = cur.fetchone()[0]
        print(f"   system_settings table row count: {count}")
        
        # Check for required settings
        cur.execute("""
            SELECT key, value 
            FROM system_settings 
            WHERE key IN ('MASTER_ADMIN_USERNAME', 'MASTER_ADMIN_PASSWORD_HASH')
        """)
        rows = cur.fetchall()
        
        settings = {row[0]: row[1] for row in rows}
        print(f"   Found settings: {list(settings.keys())}")
        
        if 'MASTER_ADMIN_USERNAME' in settings and 'MASTER_ADMIN_PASSWORD_HASH' in settings:
            print("   ✅ PASS: system_settings table contains required credentials")
            conn.close()
            return True
        else:
            print("   ❌ FAIL: Missing required settings in system_settings table")
            conn.close()
            return False
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False

def main():
    print("=" * 60)
    print("🔐 SECURITY VERIFICATION TEST SUITE")
    print("=" * 60)
    
    results = []
    
    # Test 1: Signup disabled
    results.append(("Signup Disabled (404)", test_1_signup_disabled()))
    
    # Test 2: Master login
    master_token = test_2_master_login()
    results.append(("Master Login", master_token is not None))
    
    if master_token:
        # Test 3: Vendor creation requires token
        results.append(("Vendor Creation Requires Token", test_3_vendor_creation_requires_token(master_token)))
        
        # Test 4: Token expiry
        results.append(("Token Expiry (~7200s)", test_4_token_expiry(master_token)))
    
    # Test 5: System settings
    results.append(("System Settings Table", test_5_system_settings()))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 VERIFICATION SUMMARY")
    print("=" * 60)
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
    
    print(f"\n📊 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL SECURITY VERIFICATIONS PASSED!")
        print("\n🟢 SECURITY RECOMMENDATION:")
        print("   After confirming everything works, remove MASTER_ADMIN_PASSWORD_HASH")
        print("   from .env to prevent accidental credential leaks.")
        print("   The database should be the single source of truth.")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review above output.")
    
    print("=" * 60)

if __name__ == "__main__":
    main()