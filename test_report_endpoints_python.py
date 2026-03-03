# Test Report Endpoints - Python Version
import requests
import sys

BASE_URL = "https://flower-saas-backend-4th7.onrender.com/api"

def test_endpoint(endpoint, description):
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\nTesting: {description}")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url)
        
        if response.status_code == 200:
            print(f"✅ SUCCESS: {response.status_code}")
            return True
        elif response.status_code == 404:
            print(f"❌ NOT FOUND: {response.status_code}")
            print(f"   Available routes might be different")
            return False
        elif response.status_code == 401:
            print(f"⚠️  UNAUTHORIZED: {response.status_code} (but route exists!)")
            return True  # Route exists, just needs auth
        else:
            print(f"❌ ERROR: {response.status_code} - {response.reason}")
            return False
            
    except Exception as e:
        print(f"❌ NETWORK ERROR: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("REPORT ENDPOINTS VERIFICATION TEST")
    print("=" * 60)
    
    tests = [
        {
            "endpoint": "/reports/daily-sales?from_date=2026-03-02&to_date=2026-03-03&format=json",
            "description": "Daily Sales Report (JSON)"
        },
        {
            "endpoint": "/reports/group-total-by-group?start_date=2026-03-03&end_date=2026-03-03&group_name=kmp&format=html",
            "description": "Group Total By Group (HTML)"
        },
        {
            "endpoint": "/reports/group-patti/1?from_date=2026-03-03&to_date=2026-03-03&format=html",
            "description": "Group Patti Report (HTML)"
        },
        {
            "endpoint": "/reports/group-total?from_date=2026-03-03&to_date=2026-03-03&format=html",
            "description": "Group Total Report (HTML)"
        },
        {
            "endpoint": "/health",
            "description": "Health Check (baseline)"
        }
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        result = test_endpoint(test["endpoint"], test["description"])
        if result:
            passed += 1
        else:
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 60)
    
    if failed > 0:
        print("\n⚠️  TROUBLESHOOTING STEPS:")
        print("1. Check if backend was successfully deployed to Render")
        print("2. Verify git push completed without errors")
        print("3. Check Render deployment logs for any route registration errors")
        print("4. Ensure all required files were committed and pushed")
        return 1
    else:
        print("\n✅ All endpoints are accessible!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
