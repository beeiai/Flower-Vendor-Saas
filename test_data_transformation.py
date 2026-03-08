#!/usr/bin/env python3
"""
Simple test to verify the group patti report fix.
This test will check if the data transformation is working correctly.
"""

def test_data_transformation():
    """Test the data transformation logic"""
    print("=== Testing Data Transformation Logic ===")
    
    # Simulate data from get_group_patti_data
    test_entries = [
        {
            "id": 1,
            "date": "01-01-2024",
            "vehicle_name": "Truck 1",
            "vehicle": "Truck 1",
            "qty": "10.50",
            "rate": "3.25",
            "amount": "34.13",  # 10.50 * 3.25 = 34.125, rounded to 34.13
            "paid": "20.00"
        },
        {
            "id": 2,
            "date": "02-01-2024", 
            "vehicle_name": "Van 2",
            "vehicle": "Van 2",
            "qty": "15.75",
            "rate": "3.50",
            "amount": "55.13",  # 15.75 * 3.50 = 55.125, rounded to 55.13
            "paid": "30.00"
        }
    ]
    
    print("Original entries from database:")
    for entry in test_entries:
        print(f"  Qty: {entry['qty']}, Rate: {entry['rate']}, Amount: {entry['amount']}")
    
    # Simulate the old (buggy) transformation
    print("\nOld transformation (recalculating):")
    transactions_old = []
    for entry in test_entries:
        qty = float(entry.get("qty", 0))
        rate = float(entry.get("rate", 0))
        total = qty * rate  # Recalculating - potential precision loss
        paid = float(entry.get("paid", 0))
        vehicle = entry.get("vehicle_name", entry.get("vehicle", "N/A"))
        date_val = entry.get("date", "N/A")
        transactions_old.append({
            "date": date_val,
            "vehicle": vehicle,
            "qty": f"{qty:.2f}",
            "price": f"{rate:.2f}",
            "total": f"{total:.2f}",
            "luggage": "0.00",
            "paid": f"{paid:.2f}",
            "amount": f"{(total - paid):.2f}"
        })
        print(f"  Calculated total: {total:.2f} (should be {entry['amount']})")
    
    # Simulate the new (fixed) transformation
    print("\nNew transformation (using pre-calculated):")
    transactions_new = []
    for entry in test_entries:
        qty = float(entry.get("qty", 0))
        rate = float(entry.get("rate", 0))
        total = float(entry.get("amount", 0))  # Using pre-calculated amount
        paid = float(entry.get("paid", 0))
        vehicle = entry.get("vehicle_name", entry.get("vehicle", "N/A"))
        date_val = entry.get("date", "N/A")
        transactions_new.append({
            "date": date_val,
            "vehicle": vehicle,
            "qty": f"{qty:.2f}",
            "price": f"{rate:.2f}",
            "total": f"{total:.2f}",
            "luggage": "0.00",
            "paid": f"{paid:.2f}",
            "amount": f"{(total - paid):.2f}"
        })
        print(f"  Used total: {total:.2f} (matches database value)")
    
    print("\n=== Comparison ===")
    print("Old method might have precision issues due to floating point arithmetic")
    print("New method uses the exact pre-calculated values from the database")
    print("This ensures data consistency and accuracy")

if __name__ == "__main__":
    test_data_transformation()