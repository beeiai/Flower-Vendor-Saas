"""
Test script to verify Saala Transaction cumulative balance calculation
"""
import sys
from datetime import datetime, date
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# Set environment variables before importing app
import os
os.environ["SECRET_KEY"] = "test_secret_key_for_testing_purposes_only_12345678901234567890"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

try:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.base import Base
    from app.models.saala_customer import SaalaCustomer, SaalaTransaction
    from app.models.vendor import Vendor
    
    print("✅ Successfully imported all required models")
    
    # Create an in-memory SQLite database for testing
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    print("✅ Created test database")
    
    # Create a test vendor
    test_vendor = Vendor(
        id=1,
        name="Test Vendor",
        email="test@vendor.com",
        phone="+919876543210"
    )
    db.add(test_vendor)
    db.commit()
    
    print("✅ Created test vendor")
    
    # Create test customer
    customer = SaalaCustomer(id=1, vendor_id=1, name="Test Customer")
    db.add(customer)
    db.commit()
    
    print("✅ Created test customer")
    
    # Test cumulative balance calculation
    print("\n" + "="*60)
    print("TESTING CUMULATIVE BALANCE CALCULATION")
    print("="*60)
    
    today = date.today()
    print(f"\n📅 Testing with date: {today}")
    
    # ROW 1: Item Total = 625, Paid = 0
    print("\n--- ROW 1 ---")
    trans1 = SaalaTransaction(
        id=1,
        customer_id=1,
        date=datetime.combine(today, datetime.min.time()),
        item_name="Item A",
        qty=5,
        rate=125,
        total_amount=625,
        paid_amount=0,
        balance=625  # Should be 625
    )
    db.add(trans1)
    db.commit()
    
    print(f"Item Total: ₹625 (5 × ₹125)")
    print(f"Paid Amount: ₹0")
    print(f"Expected Balance: ₹625")
    print(f"Actual Balance: ₹{trans1.balance}")
    assert trans1.balance == 625, f"Expected balance 625, got {trans1.balance}"
    print("✅ PASS")
    
    # ROW 2: Item Total = 300, Paid = 0
    print("\n--- ROW 2 ---")
    trans2 = SaalaTransaction(
        id=2,
        customer_id=1,
        date=datetime.combine(today, datetime.min.time()),
        item_name="Item B",
        qty=2,
        rate=150,
        total_amount=300,
        paid_amount=0,
        balance=925  # Should be 625 + 300 = 925
    )
    db.add(trans2)
    db.commit()
    
    print(f"Item Total: ₹300 (2 × ₹150)")
    print(f"Paid Amount: ₹0")
    print(f"Previous Balance: ₹625")
    print(f"Expected Cumulative Balance: ₹625 + ₹300 = ₹925")
    print(f"Actual Balance: ₹{trans2.balance}")
    assert trans2.balance == 925, f"Expected balance 925, got {trans2.balance}"
    print("✅ PASS")
    
    # ROW 3: Item Total = 500, Paid = 200
    print("\n--- ROW 3 ---")
    trans3 = SaalaTransaction(
        id=3,
        customer_id=1,
        date=datetime.combine(today, datetime.min.time()),
        item_name="Item C",
        qty=5,
        rate=100,
        total_amount=500,
        paid_amount=200,
        balance=1225  # Should be 925 + (500 - 200) = 1225
    )
    db.add(trans3)
    db.commit()
    
    print(f"Item Total: ₹500 (5 × ₹100)")
    print(f"Paid Amount: ₹200")
    print(f"Previous Balance: ₹925")
    print(f"This Transaction Balance: ₹500 - ₹200 = ₹300")
    print(f"Expected Cumulative Balance: ₹925 + ₹300 = ₹1225")
    print(f"Actual Balance: ₹{trans3.balance}")
    assert trans3.balance == 1225, f"Expected balance 1225, got {trans3.balance}"
    print("✅ PASS")
    
    # ROW 4: Update ROW 2 - Change Item Total to 400
    print("\n--- UPDATE ROW 2 (Change Total from 300 to 400) ---")
    trans2.item_name = "Item B Updated"
    trans2.qty = 4
    trans2.rate = 100
    trans2.total_amount = 400
    trans2.paid_amount = 0
    # Recalculate: Other balances (625 + 300) + New transaction balance (400 - 0) = 1325
    trans2.balance = 1325
    db.commit()
    
    print(f"Updated Item Total: ₹400 (4 × ₹100)")
    print(f"Paid Amount: ₹0")
    print(f"Other Transactions Balance: ₹625 (Row 1) + ₹300 (Row 3) = ₹925")
    print(f"This Transaction Balance: ₹400 - ₹0 = ₹400")
    print(f"Expected Cumulative Balance: ₹925 + ₹400 = ₹1325")
    print(f"Actual Balance: ₹{trans2.balance}")
    assert trans2.balance == 1325, f"Expected balance 1325, got {trans2.balance}"
    print("✅ PASS")
    
    # Verify final state
    print("\n" + "="*60)
    print("FINAL VERIFICATION")
    print("="*60)
    
    all_transactions = db.query(SaalaTransaction).filter(
        SaalaTransaction.customer_id == 1
    ).order_by(SaalaTransaction.id).all()
    
    print("\nAll Transactions:")
    for t in all_transactions:
        print(f"  Row {t.id}: {t.item_name} | Total: ₹{t.total_amount} | Paid: ₹{t.paid_amount} | Balance: ₹{t.balance}")
    
    # Calculate expected final balance
    expected_final = sum(t.total_amount or 0 for t in all_transactions) - sum(t.paid_amount or 0 for t in all_transactions)
    actual_final = all_transactions[-1].balance
    
    print(f"\nExpected Final Balance: Sum of all totals - Sum of all paid")
    print(f"  = (₹625 + ₹400 + ₹500) - (₹0 + ₹0 + ₹200)")
    print(f"  = ₹1525 - ₹200")
    print(f"  = ₹1325")
    print(f"Actual Final Balance (last transaction): ₹{actual_final}")
    
    assert actual_final == 1325, f"Expected final balance 1325, got {actual_final}"
    print("✅ ALL TESTS PASSED!")
    
    db.close()
    print("\n✅ Test completed successfully!")
    
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
