#!/usr/bin/env python3
"""
Test script for SMS Single Customer Daily Sale functionality
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_imports():
    """Test that all required modules can be imported"""
    try:
        from app.routes.sms_single_customer import router
        print("✅ SMS Single Customer router imported successfully")
    except Exception as e:
        print(f"❌ Failed to import SMS Single Customer router: {e}")
        return False
    
    try:
        from app.main import app
        print("✅ Main app imported successfully")
    except Exception as e:
        print(f"❌ Failed to import main app: {e}")
        return False
    
    # Check if router is registered
    router_names = [route.name for route in app.routes if hasattr(route, 'name')]
    sms_routes = [name for name in router_names if 'sms' in name.lower()]
    print(f"✅ Found SMS-related routes: {sms_routes}")
    
    return True

def test_api_structure():
    """Test the API endpoint structure"""
    try:
        from app.routes.sms_single_customer import get_sms_single_customer_daily_sale
        import inspect
        
        # Get function signature
        sig = inspect.signature(get_sms_single_customer_daily_sale)
        params = list(sig.parameters.keys())
        required_params = ['group_name', 'customer_name', 'from_date', 'to_date']
        
        print(f"✅ API function signature: {params}")
        
        # Check required parameters
        missing_params = [p for p in required_params if p not in params]
        if missing_params:
            print(f"❌ Missing required parameters: {missing_params}")
            return False
        else:
            print("✅ All required parameters present")
            
        return True
    except Exception as e:
        print(f"❌ Failed to test API structure: {e}")
        return False

def test_frontend_component():
    """Test frontend component structure"""
    try:
        # Check if component file exists
        component_path = os.path.join('frontend', 'src', 'components', 'utility', 'SmsSingleCustomerDailySale.jsx')
        if os.path.exists(component_path):
            print("✅ Frontend component file exists")
            
            # Read and check basic structure
            with open(component_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            required_elements = [
                'useState',
                'useEffect',
                'selectedGroup',
                'selectedCustomer',
                'salesData',
                'fetchDailySales',
                'handleSendSms'
            ]
            
            missing_elements = [elem for elem in required_elements if elem not in content]
            if missing_elements:
                print(f"❌ Missing frontend elements: {missing_elements}")
                return False
            else:
                print("✅ All required frontend elements present")
                return True
        else:
            print("❌ Frontend component file not found")
            return False
    except Exception as e:
        print(f"❌ Failed to test frontend component: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("SMS SINGLE CUSTOMER DAILY SALE - IMPLEMENTATION TEST")
    print("=" * 60)
    
    tests = [
        ("Import Tests", test_imports),
        ("API Structure Tests", test_api_structure),
        ("Frontend Component Tests", test_frontend_component)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        print(f"\n🧪 {test_name}")
        print("-" * 40)
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} PASSED")
            else:
                failed += 1
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            failed += 1
            print(f"❌ {test_name} ERROR: {e}")
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 60)
    
    if failed == 0:
        print("🎉 All tests passed! Implementation is ready.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())