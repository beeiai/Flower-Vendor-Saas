import requests
import json

# Base URL for the backend
BASE_URL = "http://localhost:8000/api"

def test_ledger_report():
    """Test the ledger report endpoint"""
    print("Testing Ledger Report...")
    try:
        response = requests.get(
            f"{BASE_URL}/print/ledger-report",
            params={
                "farmer_id": 2,
                "from_date": "2026-01-17",
                "to_date": "2026-01-28"
            }
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Ledger Report endpoint working")
            # Save the response to a file for inspection
            with open("ledger_report.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            print("📄 Saved response to ledger_report.html")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_group_patti_report():
    """Test the group patti report endpoint"""
    print("\nTesting Group Patti Report...")
    try:
        response = requests.get(
            f"{BASE_URL}/print/group-patti-report",
            params={
                "group_id": 1,
                "from_date": "2026-01-17",
                "to_date": "2026-01-28",
                "commission_pct": 12.0
            }
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Group Patti Report endpoint working")
            # Save the response to a file for inspection
            with open("group_patti_report.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            print("📄 Saved response to group_patti_report.html")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_group_total_report():
    """Test the group total report endpoint"""
    print("\nTesting Group Total Report...")
    try:
        response = requests.get(f"{BASE_URL}/print/group-total-report")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Group Total Report endpoint working")
            # Save the response to a file for inspection
            with open("group_total_report.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            print("📄 Saved response to group_total_report.html")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_daily_sales_report():
    """Test the daily sales report endpoint"""
    print("\nTesting Daily Sales Report...")
    try:
        response = requests.get(
            f"{BASE_URL}/print/daily-sales-report",
            params={
                "from_date": "2026-01-17",
                "to_date": "2026-01-28"
            }
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Daily Sales Report endpoint working")
            # Save the response to a file for inspection
            with open("daily_sales_report.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            print("📄 Saved response to daily_sales_report.html")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    print("🔍 Testing Print Endpoints\n")
    print("=" * 50)
    
    test_ledger_report()
    test_group_patti_report()
    test_group_total_report()
    test_daily_sales_report()
    
    print("\n" + "=" * 50)
    print("🏁 Testing Complete")