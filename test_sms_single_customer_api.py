#!/usr/bin/env python3
"""
Test script for SMS Single Customer Daily Sale API endpoints
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
API_BASE = "http://localhost:8000/api"  # Adjust based on your setup
AUTH_TOKEN = "your_jwt_token_here"  # You'll need to get this from a successful login

def test_sms_endpoints():
    """Test all SMS-related endpoints"""
    
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    
    print("=" * 60)
    print("SMS SINGLE CUSTOMER DAILY SALE API TEST")
    print("=" * 60)
    
    # Test 1: Get available groups
    print("\n1. Testing /reports/sms-available-groups...")
    try:
        response = requests.get(f"{API_BASE}/reports/sms-available-groups", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            groups = response.json()
            print(f"Available groups: {groups}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Get customers by group
    print("\n2. Testing /reports/sms-customers-by-group/kmp...")
    try:
        response = requests.get(f"{API_BASE}/reports/sms-customers-by-group/kmp", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            customers = response.json()
            print(f"Customers in 'kmp' group: {customers}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: Get daily sales data for specific customer
    print("\n3. Testing /reports/sms-single-customer-daily-sale...")
    try:
        # Use yesterday's date for testing
        today = datetime.now()
        yesterday = today - timedelta(days=1)
        
        params = {
            "group_name": "kmp",
            "customer_name": "gowtham",
            "from_date": yesterday.strftime("%Y-%m-%d"),
            "to_date": today.strftime("%Y-%m-%d")
        }
        
        response = requests.get(
            f"{API_BASE}/reports/sms-single-customer-daily-sale",
            params=params,
            headers=headers
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Response data:")
            print(json.dumps(data, indent=2))
            
            # Verify required fields
            required_fields = ["customer_name", "group_name", "from_date", "to_date", 
                             "sales_data", "totals", "sms_content", "record_count"]
            
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                print(f"❌ Missing fields: {missing_fields}")
            else:
                print("✅ All required fields present")
                
                # Verify data structure
                if data["sales_data"]:
                    first_record = data["sales_data"][0]
                    required_record_fields = ["sl_no", "date", "item_name", "qty", "rate", "total"]
                    missing_record_fields = [field for field in required_record_fields if field not in first_record]
                    if missing_record_fields:
                        print(f"❌ Missing record fields: {missing_record_fields}")
                    else:
                        print("✅ Record structure correct")
                else:
                    print("⚠️  No sales data found for the specified criteria")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 4: Test with invalid parameters
    print("\n4. Testing error handling with invalid parameters...")
    try:
        params = {
            "group_name": "nonexistent_group",
            "customer_name": "nonexistent_customer",
            "from_date": "2026-03-03",
            "to_date": "2026-03-02"  # Invalid date range
        }
        
        response = requests.get(
            f"{API_BASE}/reports/sms-single-customer-daily-sale",
            params=params,
            headers=headers
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 400:
            print("✅ Correctly handled invalid date range")
        elif response.status_code == 404:
            print("✅ Correctly handled nonexistent customer/group")
        else:
            print(f"Unexpected response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_frontend_integration():
    """Test the frontend API integration"""
    print("\n" + "=" * 60)
    print("FRONTEND API INTEGRATION TEST")
    print("=" * 60)
    
    # This would be run in the browser console
    test_script = """
    // Test script for browser console
    async function testSmsApi() {
        try {
            // Test get available groups
            console.log('Testing getSmsAvailableGroups...');
            const groups = await api.getSmsAvailableGroups();
            console.log('Groups:', groups);
            
            // Test get customers by group
            if (groups && groups.length > 0) {
                console.log('Testing getSmsCustomersByGroup...');
                const customers = await api.getSmsCustomersByGroup(groups[0]);
                console.log('Customers:', customers);
                
                // Test get daily sales data
                if (customers && customers.length > 0) {
                    console.log('Testing getSmsSingleCustomerDailySale...');
                    const salesData = await api.getSmsSingleCustomerDailySale(
                        groups[0],
                        customers[0].name,
                        '2026-03-01',
                        '2026-03-03'
                    );
                    console.log('Sales Data:', salesData);
                }
            }
        } catch (error) {
            console.error('API Test Error:', error);
        }
    }
    
    // Run the test
    testSmsApi();
    """
    
    print("To test frontend integration, run this in your browser console:")
    print(test_script)

if __name__ == "__main__":
    print("SMS Single Customer Daily Sale - API Test Suite")
    print("Make sure your backend is running and you have a valid JWT token")
    print()
    
    test_sms_endpoints()
    test_frontend_integration()
    
    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)