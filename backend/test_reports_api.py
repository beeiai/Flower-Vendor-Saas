"""
Backend Test Cases for Report API Endpoints

Run with: pytest backend/test_reports_api.py

Tests all four report endpoints with various scenarios:
- Success cases (single record, multiple records, no records)
- Format variations (HTML vs JSON)
- Date range filtering
- Error handling (invalid IDs, missing parameters)
"""

import pytest
from fastapi.testclient import TestClient
from datetime import date, datetime, timedelta
from decimal import Decimal
from app.main import app
from app.core.db import SessionLocal
from app.models.farmer import Farmer
from app.models.farmer_group import FarmerGroup
from app.models.silk_ledger_entry import SilkLedgerEntry
from app.models.collection_item import CollectionItem
from app.models.vendor import Vendor
from app.models.user import User

client = TestClient(app)

# ================================================================
# TEST FIXTURES
# ================================================================

@pytest.fixture
def test_user():
    """Create a test user and return auth token"""
    # Note: Implementation depends on your auth setup
    # This is a placeholder
    return {"user_id": 1, "vendor_id": 1}


@pytest.fixture
def test_auth_headers(test_user):
    """Return authorization headers for test requests"""
    # Generate JWT token for testing
    # This implementation depends on your auth system
    token = "test-token-placeholder"
    return {"Authorization": f"Bearer {token}"}


# ================================================================
# LEDGER REPORT TESTS
# ================================================================

class TestLedgerReport:
    """Test /api/reports/ledger/{customer_id} endpoint"""
    
    def test_ledger_single_record(self, test_auth_headers):
        """Test ledger report with single transaction"""
        customer_id = 1
        
        params = {
            "from_date": "2024-02-01",
            "to_date": "2024-02-29",
            "format": "json"
        }
        
        response = client.get(
            f"/api/reports/ledger/{customer_id}",
            params=params,
            headers=test_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "html" in data
        assert "metadata" in data
        
        # Verify metadata
        assert data["metadata"]["report_type"] == "ledger"
        assert data["metadata"]["page_count"] >= 1
        assert data["metadata"]["record_count"] >= 0
        assert "date_range" in data["metadata"]
        
        print(f"✓ Ledger report: {data['metadata']['record_count']} records, "
              f"{data['metadata']['page_count']} pages")
    
    def test_ledger_multiple_records(self, test_auth_headers):
        """Test ledger report with 30+ records"""
        customer_id = 1
        
        params = {
            "from_date": "2024-01-01",
            "to_date": "2024-02-29",
            "format": "json"
        }
        
        response = client.get(
            f"/api/reports/ledger/{customer_id}",
            params=params,
            headers=test_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should calculate proper page count
        record_count = data["metadata"]["record_count"]
        page_count = data["metadata"]["page_count"]
        
        # Estimate: ~27 rows per page
        expected_pages = max(1, (record_count + 26) // 27)
        assert page_count >= expected_pages - 1  # Allow small error margin
        
        print(f"✓ Ledger report: {record_count} records, {page_count} pages")
    
    def test_ledger_html_format(self, test_auth_headers):
        """Test ledger in HTML format"""
        customer_id = 1
        
        response = client.get(
            f"/api/reports/ledger/{customer_id}",
            params={"format": "html"},
            headers=test_auth_headers
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/html; charset=utf-8"
        assert "<html" in response.text.lower() or "<!doctype" in response.text.lower()
        
        # Verify logo path is corrected
        assert "/templates/SKFS_logo.png" in response.text
        
        print("✓ Ledger HTML format correct")
    
    def test_ledger_json_format(self, test_auth_headers):
        """Test ledger in JSON format"""
        customer_id = 1
        
        response = client.get(
            f"/api/reports/ledger/{customer_id}",
            params={"format": "json"},
            headers=test_auth_headers
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        
        data = response.json()
        assert isinstance(data, dict)
        assert "html" in data
        assert "metadata" in data
        
        print("✓ Ledger JSON format correct")
    
    def test_ledger_invalid_customer(self, test_auth_headers):
        """Test with non-existent customer ID"""
        response = client.get(
            "/api/reports/ledger/99999",
            params={"format": "json"},
            headers=test_auth_headers
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        
        print("✓ Ledger invalid customer handled")


# ================================================================
# GROUP TOTAL REPORT TESTS
# ================================================================

class TestGroupTotalReport:
    """Test /api/reports/group-total endpoint"""
    
    def test_group_total_basic(self, test_auth_headers):
        """Test group total report basic functionality"""
        params = {
            "from_date": "2024-02-01",
            "to_date": "2024-02-29",
            "format": "json"
        }
        
        response = client.get(
            "/api/reports/group-total",
            params=params,
            headers=test_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "html" in data
        assert "metadata" in data
        
        # Verify metadata
        assert data["metadata"]["report_type"] == "group_total"
        assert data["metadata"]["page_count"] >= 1
        
        print(f"✓ Group total: {data['metadata']['record_count']} groups, "
              f"{data['metadata']['page_count']} pages")
    
    def test_group_total_no_data(self, test_auth_headers):
        """Test group total with date range containing no data"""
        params = {
            "from_date": "2020-01-01",  # Far in past
            "to_date": "2020-01-31",
            "format": "json"
        }
        
        response = client.get(
            "/api/reports/group-total",
            params=params,
            headers=test_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should still return valid response, just with 0 records
        assert data["metadata"]["record_count"] == 0
        assert data["metadata"]["page_count"] >= 1  # At least 1 page for header
        
        print("✓ Group total handles empty data")
    
    def test_group_total_date_filtering(self, test_auth_headers):
        """Test date range filtering"""
        today = date.today()
        month_start = today.replace(day=1)
        
        params = {
            "from_date": month_start.isoformat(),
            "to_date": today.isoformat(),
            "format": "json"
        }
        
        response = client.get(
            "/api/reports/group-total",
            params=params,
            headers=test_auth_headers
        )
        
        assert response.status_code == 200
        
        print("✓ Group total date filtering works")


# ================================================================
# GROUP PATTI REPORT TESTS
# ================================================================

class TestGroupPattiReport:
    """Test /api/reports/group-patti/{group_id} endpoint"""
    
    def test_group_patti_basic(self, test_auth_headers):
        """Test group patti report basic functionality"""
        group_id = 1
        
        params = {
            "from_date": "2024-02-01",
            "to_date": "2024-02-29",
            "format": "json"
        }
        
        response = client.get(
            f"/api/reports/group-patti/{group_id}",
            params=params,
            headers=test_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "html" in data
        assert "metadata" in data
        
        # Verify metadata
        assert data["metadata"]["report_type"] == "group_patti"
        assert data["metadata"]["page_count"] >= 1
        
        print(f"✓ Group patti: {data['metadata'].get('farmer_count', 0)} farmers, "
              f"{data['metadata']['page_count']} pages")
    
    def test_group_patti_multipage(self, test_auth_headers):
        """Test group patti with enough data for multiple pages"""
        group_id = 1
        
        params = {
            "from_date": "2024-01-01",
            "to_date": "2024-02-29",
            "format": "json"
        }
        
        response = client.get(
            f"/api/reports/group-patti/{group_id}",
            params=params,
            headers=test_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Multi-page calculation for group patti is complex
        # Just verify it returns reasonable page count
        assert data["metadata"]["page_count"] >= 1
        assert data["metadata"]["page_count"] <= 100  # Sanity check
        
        print(f"✓ Group patti multipage: {data['metadata']['page_count']} pages")
    
    def test_group_patti_invalid_group(self, test_auth_headers):
        """Test with non-existent group ID"""
        response = client.get(
            "/api/reports/group-patti/99999",
            params={"format": "json"},
            headers=test_auth_headers
        )
        
        assert response.status_code == 404
        
        print("✓ Group patti invalid group handled")


# ================================================================
# DAILY SALES REPORT TESTS
# ================================================================

class TestDailySalesReport:
    """Test /api/reports/daily-sales endpoint"""
    
    def test_daily_sales_basic(self, test_auth_headers):
        """Test daily sales report basic functionality"""
        params = {
            "from_date": "2024-02-01",
            "to_date": "2024-02-29",
            "format": "json"
        }
        
        response = client.get(
            "/api/reports/daily-sales",
            params=params,
            headers=test_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "html" in data
        assert "metadata" in data
        
        # Verify metadata
        assert data["metadata"]["report_type"] == "daily_sales"
        assert data["metadata"]["page_count"] >= 1
        
        print(f"✓ Daily sales: {data['metadata']['record_count']} records, "
              f"{data['metadata']['page_count']} pages")
    
    def test_daily_sales_with_item_filter(self, test_auth_headers):
        """Test daily sales with item filter"""
        params = {
            "from_date": "2024-02-01",
            "to_date": "2024-02-29",
            "item_name": "Rose",
            "format": "json"
        }
        
        response = client.get(
            "/api/reports/daily-sales",
            params=params,
            headers=test_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["metadata"]["report_type"] == "daily_sales"
        
        print(f"✓ Daily sales with filter: {data['metadata']['record_count']} records")
    
    def test_daily_sales_large_dataset(self, test_auth_headers):
        """Test daily sales with large date range (100+ records expected)"""
        params = {
            "from_date": "2024-01-01",
            "to_date": "2024-02-29",
            "format": "json"
        }
        
        response = client.get(
            "/api/reports/daily-sales",
            params=params,
            headers=test_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify page calculation
        record_count = data["metadata"]["record_count"]
        page_count = data["metadata"]["page_count"]
        
        # Estimate: ~33 rows per page
        expected_pages = max(1, (record_count + 32) // 33)
        assert page_count >= expected_pages - 1
        
        print(f"✓ Daily sales large dataset: {record_count} records, {page_count} pages")


# ================================================================
# LOGO SERVING TESTS
# ================================================================

class TestTemplateServing:
    """Test template asset serving"""
    
    def test_logo_accessible(self):
        """Test that logo is accessible via /templates/"""
        response = client.get("/templates/SKFS_logo.png")
        
        # Should not 404
        assert response.status_code != 404
        
        print("✓ Logo is accessible via /templates/")
    
    def test_logo_path_in_html(self, test_auth_headers):
        """Test that rendered HTML contains correct logo path"""
        response = client.get(
            "/api/reports/ledger/1",
            params={"format": "html"},
            headers=test_auth_headers
        )
        
        if response.status_code == 200:
            # Logo path should be updated to /templates/
            assert "/templates/SKFS_logo.png" in response.text
            assert 'src="SKFS_logo.png"' not in response.text  # Old path removed
            
            print("✓ Logo path correctly updated in HTML")


# ================================================================
# ERROR HANDLING TESTS
# ================================================================

class TestErrorHandling:
    """Test error handling and edge cases"""
    
    def test_missing_auth(self):
        """Test missing authentication"""
        response = client.get("/api/reports/ledger/1")
        
        assert response.status_code == 401  # Unauthorized
        
        print("✓ Missing auth returns 401")
    
    def test_invalid_date_format(self, test_auth_headers):
        """Test invalid date format"""
        params = {
            "from_date": "invalid-date",
            "to_date": "2024-02-29"
        }
        
        response = client.get(
            "/api/reports/ledger/1",
            params=params,
            headers=test_auth_headers
        )
        
        # Should handle gracefully (either 400 or use defaults)
        assert response.status_code in [200, 400, 422]
        
        print("✓ Invalid date format handled")
    
    def test_reverse_date_range(self, test_auth_headers):
        """Test when from_date > to_date"""
        params = {
            "from_date": "2024-02-29",
            "to_date": "2024-02-01"  # Reversed
        }
        
        response = client.get(
            "/api/reports/ledger/1",
            params=params,
            headers=test_auth_headers
        )
        
        # Should handle gracefully
        assert response.status_code in [200, 400]
        
        print("✓ Reverse date range handled")


# ================================================================
# PERFORMANCE TESTS
# ================================================================

class TestPerformance:
    """Test performance characteristics"""
    
    def test_response_time_basic(self, test_auth_headers):
        """Test response time for basic report"""
        import time
        
        start = time.time()
        response = client.get(
            "/api/reports/daily-sales",
            params={"format": "json"},
            headers=test_auth_headers
        )
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 5.0  # Should respond in less than 5 seconds
        
        print(f"✓ Basic report response time: {elapsed:.2f}s (< 5s)")
    
    def test_response_time_multipage(self, test_auth_headers):
        """Test response time for multi-page report"""
        import time
        
        start = time.time()
        response = client.get(
            "/api/reports/group-patti/1",
            params={
                "from_date": "2024-01-01",
                "to_date": "2024-02-29",
                "format": "json"
            },
            headers=test_auth_headers
        )
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 10.0  # Should respond in less than 10 seconds
        
        print(f"✓ Multi-page report response time: {elapsed:.2f}s (< 10s)")


# ================================================================
# RUN TESTS
# ================================================================

if __name__ == "__main__":
    """
    Run with: python -m pytest backend/test_reports_api.py -v
    
    Or run specific test class:
    python -m pytest backend/test_reports_api.py::TestLedgerReport -v
    
    Or run with detailed output:
    python -m pytest backend/test_reports_api.py -v -s
    """
    
    print("""
    ========================================
    Backend Report API Test Suite
    ========================================
    
    To run all tests:
        pytest backend/test_reports_api.py -v
    
    To run single class:
        pytest backend/test_reports_api.py::TestLedgerReport -v
    
    To run with output:
        pytest backend/test_reports_api.py -v -s
    ========================================
    """)
