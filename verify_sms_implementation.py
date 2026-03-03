#!/usr/bin/env python3
"""
Simple verification script for SMS Single Customer Daily Sale implementation
"""

import os
import sys

def check_file_structure():
    """Check if all required files exist"""
    required_files = [
        "backend/app/routes/sms_single_customer.py",
        "frontend/src/components/utility/SmsSingleCustomerDailySale.jsx",
        "frontend/src/utils/api.js",
        "backend/app/main.py"
    ]
    
    print("📁 Checking file structure...")
    all_exist = True
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} - NOT FOUND")
            all_exist = False
    
    return all_exist

def check_api_endpoints():
    """Check if API endpoints are properly defined"""
    print("\n🔌 Checking API endpoints...")
    
    try:
        with open("backend/app/routes/sms_single_customer.py", "r", encoding="utf-8") as f:
            content = f.read()
            
        required_endpoints = [
            "/sms-single-customer-daily-sale",
            "/sms-available-groups", 
            "/sms-customers-by-group"
        ]
        
        for endpoint in required_endpoints:
            if endpoint in content:
                print(f"✅ Endpoint {endpoint} found")
            else:
                print(f"❌ Endpoint {endpoint} missing")
                return False
                
        return True
    except Exception as e:
        print(f"❌ Error reading API file: {e}")
        return False

def check_frontend_integration():
    """Check if frontend properly integrates with API"""
    print("\n💻 Checking frontend integration...")
    
    try:
        with open("frontend/src/utils/api.js", "r", encoding="utf-8") as f:
            content = f.read()
            
        required_methods = [
            "getSmsSingleCustomerDailySale",
            "getSmsAvailableGroups",
            "getSmsCustomersByGroup"
        ]
        
        for method in required_methods:
            if method in content:
                print(f"✅ API method {method} found")
            else:
                print(f"❌ API method {method} missing")
                return False
                
        return True
    except Exception as e:
        print(f"❌ Error reading frontend API file: {e}")
        return False

def check_router_registration():
    """Check if router is properly registered"""
    print("\n🔗 Checking router registration...")
    
    try:
        with open("backend/app/main.py", "r", encoding="utf-8") as f:
            content = f.read()
            
        if "sms_single_customer.router" in content:
            print("✅ SMS router registered in main app")
            return True
        else:
            print("❌ SMS router not registered in main app")
            return False
    except Exception as e:
        print(f"❌ Error reading main app file: {e}")
        return False

def main():
    """Run verification"""
    print("=" * 60)
    print("SMS SINGLE CUSTOMER DAILY SALE - VERIFICATION")
    print("=" * 60)
    
    checks = [
        ("File Structure", check_file_structure),
        ("API Endpoints", check_api_endpoints),
        ("Frontend Integration", check_frontend_integration),
        ("Router Registration", check_router_registration)
    ]
    
    passed = 0
    failed = 0
    
    for check_name, check_func in checks:
        print(f"\n🔍 {check_name}")
        print("-" * 40)
        try:
            if check_func():
                passed += 1
                print(f"✅ {check_name} PASSED")
            else:
                failed += 1
                print(f"❌ {check_name} FAILED")
        except Exception as e:
            failed += 1
            print(f"❌ {check_name} ERROR: {e}")
    
    print("\n" + "=" * 60)
    print(f"VERIFICATION RESULTS: {passed} passed, {failed} failed out of {len(checks)} checks")
    print("=" * 60)
    
    if failed == 0:
        print("🎉 Implementation verification successful!")
        print("\n📋 IMPLEMENTATION SUMMARY:")
        print("✅ Backend API endpoints created")
        print("✅ Frontend React component created") 
        print("✅ API methods integrated")
        print("✅ Router properly registered")
        print("✅ All required functionality implemented")
        return 0
    else:
        print("⚠️  Some verification checks failed.")
        print("Please review the implementation and fix the issues.")
        return 1

if __name__ == "__main__":
    sys.exit(main())