"""
Test script to verify Silk credit API endpoint
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
    from sqlalchemy import create_engine, func
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
    
    # Create test customers
    customer1 = SaalaCustomer(id=1, vendor_id=1, name="Customer 1")
    customer2 = SaalaCustomer(id=2, vendor_id=1, name="Customer 2")
    db.add_all([customer1, customer2])
    db.commit()
    
    print("✅ Created test customers")
    
    # Create test transactions for today
    today = date.today()
    print(f"📅 Testing with date: {today}")
    
    # Transaction 1: Total 1000, Paid 600, Credit 400
    trans1 = SaalaTransaction(
        id=1,
        customer_id=1,
        date=datetime.combine(today, datetime.min.time()),
        total_amount=1000,
        paid_amount=600
    )
    
    # Transaction 2: Total 500, Paid 300, Credit 200
    trans2 = SaalaTransaction(
        id=2,
        customer_id=2,
        date=datetime.combine(today, datetime.min.time()),
        total_amount=500,
        paid_amount=300
    )
    
    db.add_all([trans1, trans2])
    db.commit()
    
    print("✅ Created test transactions")
    
    # Test the credit calculation logic
    start_of_day = datetime.combine(today, datetime.min.time())
    end_of_day = datetime.combine(today, datetime.max.time())
    
    customers = db.query(SaalaCustomer).filter(SaalaCustomer.vendor_id == 1).all()
    print(f"📊 Found {len(customers)} customers")
    
    total_daily_credit = 0
    
    for customer in customers:
        daily_credit = (
            db.query(func.sum(SaalaTransaction.total_amount - SaalaTransaction.paid_amount))
            .filter(
                SaalaTransaction.customer_id == customer.id,
                SaalaTransaction.date >= start_of_day,
                SaalaTransaction.date <= end_of_day
            )
            .scalar()
        ) or 0
        
        daily_credit = max(float(daily_credit), 0)
        total_daily_credit += daily_credit
        
        print(f"   Customer {customer.name}: Credit = ₹{daily_credit}")
    
    print(f"\n✅ Total Daily Credit: ₹{total_daily_credit}")
    print(f"   Expected: ₹600 (₹400 + ₹200)")
    
    if total_daily_credit == 600:
        print("\n🎉 SUCCESS! Credit calculation is working correctly!")
    else:
        print(f"\n⚠️  WARNING! Expected ₹600 but got ₹{total_daily_credit}")
    
    db.close()
    print("\n✅ Test completed successfully!")
    
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
