import requests
import os
from datetime import date

# Base URL for the backend
BASE_URL = "http://localhost:8000/api"

def test_print_endpoints():
    """Test all print endpoints"""
    
    # Test 1: Ledger Report
    print("Testing Ledger Report...")
    try:
        response = requests.get(
            f"{BASE_URL}/print/ledger-report",
            params={
                "farmer_id": 1,
                "from_date": "2024-01-01",
                "to_date": "2024-12-31"
            }
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Ledger Report endpoint working")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 2: Group Patti Report
    print("Testing Group Patti Report...")
    try:
        response = requests.get(
            f"{BASE_URL}/print/group-patti-report",
            params={
                "group_id": 1,
                "from_date": "2024-01-01",
                "to_date": "2024-12-31",
                "commission_pct": 12.0
            }
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Group Patti Report endpoint working")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 3: Group Total Report
    print("Testing Group Total Report...")
    try:
        response = requests.get(f"{BASE_URL}/print/group-total-report")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Group Total Report endpoint working")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 4: Daily Sales Report
    print("Testing Daily Sales Report...")
    try:
        response = requests.get(
            f"{BASE_URL}/print/daily-sales-report",
            params={
                "from_date": "2024-01-01",
                "to_date": "2024-12-31"
            }
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Daily Sales Report endpoint working")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_print_endpoints()