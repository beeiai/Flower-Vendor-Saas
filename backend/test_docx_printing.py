import requests
import os
from datetime import date

# Base URL for the backend
BASE_URL = "http://localhost:8000/api"

def get_auth_token():
    """Get authentication token for testing"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            data={
                "username": "test@example.com",  # Replace with actual test credentials
                "password": "testpassword"
            }
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        else:
            print(f"Auth failed: {response.text}")
            return None
    except Exception as e:
        print(f"Auth error: {e}")
        return None

def test_docx_ledger_report():
    """Test the DOCX ledger report endpoint"""
    print("Testing DOCX Ledger Report...")
    
    # Get auth token
    token = get_auth_token()
    if not token:
        print("❌ Authentication failed")
        return
    
    try:
        response = requests.get(
            f"{BASE_URL}/print-docx/ledger-report",
            params={
                "farmer_id": 1,  # Replace with actual farmer ID
                "from_date": "2026-01-01",
                "to_date": "2026-01-31",
                "commission_pct": 12.0
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            # Save the DOCX file
            filename = f"ledger_report_{date.today().strftime('%Y%m%d')}.docx"
            with open(filename, "wb") as f:
                f.write(response.content)
            print(f"✅ DOCX report saved as {filename}")
            print(f"📄 File size: {len(response.content)} bytes")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_docx_group_patti_report():
    """Test the DOCX group patti report endpoint"""
    print("\nTesting DOCX Group Patti Report...")
    
    # Get auth token
    token = get_auth_token()
    if not token:
        print("❌ Authentication failed")
        return
    
    try:
        response = requests.get(
            f"{BASE_URL}/print-docx/group-patti-report",
            params={
                "group_id": 1,  # Replace with actual group ID
                "from_date": "2026-01-01",
                "to_date": "2026-01-31",
                "commission_pct": 12.0
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            # Save the DOCX file
            filename = f"group_patti_report_{date.today().strftime('%Y%m%d')}.docx"
            with open(filename, "wb") as f:
                f.write(response.content)
            print(f"✅ DOCX report saved as {filename}")
            print(f"📄 File size: {len(response.content)} bytes")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def setup_test_environment():
    """Setup test environment and dependencies"""
    print("📦 Checking environment...")
    try:
        # Check if requirements are installed
        import docxtpl
        import docx
        print("✅ Required dependencies installed")
        
        # Check if custom template exists
        import os
        template_path = os.path.join("app", "templates", "Report_template.docx")
        if os.path.exists(template_path):
            print("✅ Custom template found")
        else:
            print("⚠️  Custom template not found")
            print(f"   Please upload Report_template.docx to {template_path}")
            
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please run: pip install -r requirements.txt")

if __name__ == "__main__":
    print("🧪 Testing DOCX Print Service")
    print("=" * 50)
    
    # Setup environment
    setup_test_environment()
    
    # Test endpoints
    test_docx_ledger_report()
    test_docx_group_patti_report()
    
    print("\n" + "=" * 50)
    print("🏁 Testing Complete")
    print("\n📝 Notes:")
    print("- Replace test credentials with actual values")
    print("- Replace farmer_id and group_id with actual IDs from your database")
    print("- Generated DOCX files can be opened in Microsoft Word or converted to PDF")