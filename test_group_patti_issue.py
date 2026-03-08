#!/usr/bin/env python3
"""
Test script to debug the group patti report issue.
This will help identify why not all records are being returned.
"""

import os
import sys
from datetime import date, datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

from app.core.config import Settings
from app.core.db import get_db
from app.utils.reports_db import get_group_patti_data, get_ledger_data

def test_group_patti_data():
    """Test the group patti data function directly"""
    print("=== Testing Group Patti Data Function ===")
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        # Test with a known group (you'll need to adjust these values)
        vendor_id = 1  # Adjust based on your test data
        group_id = 1   # Adjust based on your test data
        from_date = date(2024, 1, 1)
        to_date = date(2024, 12, 31)
        
        print(f"Testing with vendor_id={vendor_id}, group_id={group_id}")
        print(f"Date range: {from_date} to {to_date}")
        
        # Get group patti data
        patti_data = get_group_patti_data(
            vendor_id=vendor_id,
            group_id=group_id,
            from_date=from_date,
            to_date=to_date,
            db=db
        )
        
        print(f"Group: {patti_data.get('group', {}).get('name', 'Unknown')}")
        print(f"Farmer count: {patti_data.get('farmer_count', 0)}")
        print(f"Entry count: {patti_data.get('entry_count', 0)}")
        print(f"Grand total amount: {patti_data.get('grand_total_amount', '0')}")
        
        # Print details for each farmer
        for i, farmer in enumerate(patti_data.get('farmers', [])):
            print(f"\n--- Farmer {i+1}: {farmer.get('name', 'Unknown')} ---")
            print(f"  ID: {farmer.get('id')}")
            print(f"  Code: {farmer.get('code')}")
            print(f"  Phone: {farmer.get('phone')}")
            print(f"  Entry count: {farmer.get('entry_count', 0)}")
            print(f"  Total qty: {farmer.get('total_qty', '0')}")
            print(f"  Total amount: {farmer.get('total_amount', '0')}")
            print(f"  Total paid: {farmer.get('total_paid', '0')}")
            print(f"  Commission: {farmer.get('commission', '0')}")
            
            # Print first few entries
            entries = farmer.get('entries', [])
            print(f"  First 3 entries:")
            for j, entry in enumerate(entries[:3]):
                print(f"    {j+1}. Date: {entry.get('date')}, Qty: {entry.get('qty')}, "
                      f"Rate: {entry.get('rate')}, Amount: {entry.get('amount')}, "
                      f"Paid: {entry.get('paid')}")
            
            if len(entries) > 3:
                print(f"    ... and {len(entries) - 3} more entries")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def test_ledger_data():
    """Test the ledger data function for comparison"""
    print("\n=== Testing Ledger Data Function ===")
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        # Test with a known customer (you'll need to adjust these values)
        vendor_id = 1      # Adjust based on your test data
        customer_id = 1    # Adjust based on your test data
        from_date = date(2024, 1, 1)
        to_date = date(2024, 12, 31)
        
        print(f"Testing with vendor_id={vendor_id}, customer_id={customer_id}")
        print(f"Date range: {from_date} to {to_date}")
        
        # Get ledger data
        ledger_data = get_ledger_data(
            vendor_id=vendor_id,
            customer_id=customer_id,
            from_date=from_date,
            to_date=to_date,
            db=db
        )
        
        customer = ledger_data.get('customer', {})
        print(f"Customer: {customer.get('name', 'Unknown')}")
        print(f"Group: {customer.get('group_name', 'N/A')}")
        print(f"Record count: {ledger_data.get('record_count', 0)}")
        print(f"Total qty: {ledger_data.get('total_qty', '0')}")
        print(f"Total amount: {ledger_data.get('total_amount', '0')}")
        print(f"Total paid: {ledger_data.get('total_paid', '0')}")
        
        # Print first few entries
        entries = ledger_data.get('entries', [])
        print(f"First 5 entries:")
        for i, entry in enumerate(entries[:5]):
            print(f"  {i+1}. Date: {entry.get('date')}, Vehicle: {entry.get('vehicle')}, "
                  f"Qty: {entry.get('qty')}, Rate: {entry.get('rate')}, "
                  f"Amount: {entry.get('amount')}, Paid: {entry.get('paid')}")
        
        if len(entries) > 5:
            print(f"  ... and {len(entries) - 5} more entries")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("Group Patti Report Debug Test")
    print("=" * 50)
    
    test_ledger_data()
    test_group_patti_data()
    
    print("\n" + "=" * 50)
    print("Test completed. Check the output above for any discrepancies.")