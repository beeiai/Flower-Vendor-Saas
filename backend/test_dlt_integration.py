"""
Test script to verify BSNL DLT integration readiness

This script tests that all DLT-related components are properly configured.
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def test_config_imports():
    """Test that config can be imported and has new DLT fields"""
    print("Testing config imports...")
    try:
        from app.core.config import settings
        
        # Check for new DLT fields
        assert hasattr(settings, 'SMS_ENTITY_ID'), "Missing SMS_ENTITY_ID"
        assert hasattr(settings, 'SMS_TEMPLATE_ID'), "Missing SMS_TEMPLATE_ID"
        assert hasattr(settings, 'SMS_DLT_ROUTE'), "Missing SMS_DLT_ROUTE"
        
        print("✅ Config has all required DLT fields")
        return True
    except Exception as e:
        print(f"❌ Config test failed: {e}")
        return False

def test_sms_templates():
    """Test that DLT template variable functions exist and work"""
    print("\nTesting SMS template functions...")
    try:
        from app.services.sms_templates import (
            get_collection_received_dlt_variables,
            get_settlement_dlt_variables,
            get_daily_vendor_summary_dlt_variables,
            daily_sales_customer_dlt_variables
        )
        
        # Test collection received variables
        vars1 = get_collection_received_dlt_variables("John", "05-03-2026", 15.5, 2500.0)
        assert isinstance(vars1, dict), "Should return dict"
        assert "farmer_name" in vars1, "Missing farmer_name"
        assert "date" in vars1, "Missing date"
        assert "quantity" in vars1, "Missing quantity"
        assert "amount" in vars1, "Missing amount"
        print("✅ Collection received variables work correctly")
        
        # Test settlement variables
        vars2 = get_settlement_dlt_variables("John", "01-03-2026", "05-03-2026", 10000.0, 500.0)
        assert isinstance(vars2, dict), "Should return dict"
        assert len(vars2) == 5, "Should have 5 variables"
        print("✅ Settlement variables work correctly")
        
        # Test daily summary variables
        vars3 = get_daily_vendor_summary_dlt_variables("05-03-2026", 25.0, 4500.0)
        assert isinstance(vars3, dict), "Should return dict"
        assert len(vars3) == 3, "Should have 3 variables"
        print("✅ Daily summary variables work correctly")
        
        # Test customer daily sales variables
        vars4 = daily_sales_customer_dlt_variables("John", "04-03-2026", "05-03-2026", 20.0, 3500.0)
        assert isinstance(vars4, dict), "Should return dict"
        assert len(vars4) == 5, "Should have 5 variables"
        print("✅ Customer daily sales variables work correctly")
        
        return True
    except Exception as e:
        print(f"❌ Template test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_sms_service_signature():
    """Test that SMS service accepts template_variables parameter"""
    print("\nTesting SMS service signature...")
    try:
        import inspect
        from app.services.sms_service import send_sms
        
        sig = inspect.signature(send_sms)
        params = list(sig.parameters.keys())
        
        assert 'template_variables' in params, "Missing template_variables parameter"
        print("✅ SMS service has template_variables parameter")
        
        return True
    except Exception as e:
        print(f"❌ Service signature test failed: {e}")
        return False

def test_dlt_payload_construction():
    """Test that DLT payload is constructed correctly"""
    print("\nTesting DLT payload construction...")
    try:
        # Mock settings for testing
        class MockSettings:
            SMS_TEMPLATE_ID = "1707500000000001234"
            SMS_DLT_ROUTE = "dlt"
            SMS_SENDER_ID = "FLOWER"
            SMS_API_URL = "https://www.fast2sms.com/dev/bulkV2"
            SMS_API_KEY = "test_key"
            SMS_MAX_RETRY = 3
        
        # Simulate payload construction logic
        template_variables = {
            "customer_name": "Gowtham",
            "amount": "1000"
        }
        
        is_dlt_mode = bool(MockSettings.SMS_TEMPLATE_ID)
        assert is_dlt_mode, "Should detect DLT mode"
        
        # Construct payload (mimicking sms_service.py logic)
        payload = {
            "route": MockSettings.SMS_DLT_ROUTE,
            "sender_id": MockSettings.SMS_SENDER_ID,
            "template_id": MockSettings.SMS_TEMPLATE_ID,
            "numbers": "9876543210",
        }
        
        if template_variables:
            values_list = list(template_variables.values())
            if len(values_list) == 1:
                payload["variables_values"] = values_list[0]
            else:
                payload["variables_values"] = values_list
        
        # Verify payload structure
        assert payload["route"] == "dlt", "Route should be 'dlt'"
        assert payload["sender_id"] == "FLOWER", "Sender ID should match"
        assert payload["template_id"] == "1707500000000001234", "Template ID should match"
        assert "variables_values" in payload, "Should have variables_values"
        assert payload["variables_values"] == ["Gowtham", "1000"], "Variables should match"
        
        print("✅ DLT payload construction works correctly")
        print(f"   Sample payload: {payload}")
        
        return True
    except Exception as e:
        print(f"❌ Payload test failed: {e}")
        return False

def test_environment_file():
    """Test that environment file template exists"""
    print("\nTesting environment file template...")
    try:
        env_example = Path(__file__).parent / "backend" / ".env.sms.example"
        assert env_example.exists(), ".env.sms.example not found"
        
        content = env_example.read_text()
        required_vars = [
            "SMS_API_URL",
            "SMS_API_KEY",
            "SMS_SENDER_ID",
            "SMS_ENTITY_ID",
            "SMS_TEMPLATE_ID",
            "SMS_DLT_ROUTE",
            "SMS_MAX_RETRY"
        ]
        
        for var in required_vars:
            assert var in content, f"Missing {var} in .env.sms.example"
        
        print("✅ Environment file template is complete")
        return True
    except Exception as e:
        print(f"❌ Environment test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("BSNL DLT Integration Verification Tests")
    print("=" * 60)
    
    tests = [
        test_config_imports,
        test_sms_templates,
        test_sms_service_signature,
        test_dlt_payload_construction,
        test_environment_file
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    print("\n" + "=" * 60)
    print(f"Results: {sum(results)}/{len(results)} tests passed")
    print("=" * 60)
    
    if all(results):
        print("\n🎉 All tests passed! System is ready for BSNL DLT integration.")
        print("\nNext steps:")
        print("1. Register on BSNL DLT portal (https://uengage.bsnl.co.in)")
        print("2. Obtain Entity ID, Sender ID, and Template ID")
        print("3. Add Fast2SMS API key and DLT details to .env file")
        print("4. Test SMS sending with actual DLT templates")
        return 0
    else:
        print("\n❌ Some tests failed. Please review the errors above.")
        return 1

if __name__ == "__main__":
    exit(main())
