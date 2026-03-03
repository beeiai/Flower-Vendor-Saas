"""
SMS Single Customer Daily Sale API Endpoint
This module provides the backend endpoint for fetching daily sales data 
for a specific customer within a group for SMS generation.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import List, Optional
from decimal import Decimal

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.farmer import Farmer
from app.models.farmer_group import FarmerGroup
from app.models.collection_item import CollectionItem

router = APIRouter(prefix="/reports", tags=["Reports"])

def generate_sms_content(customer_name: str, from_date: date, to_date: date, 
                        total_qty: Decimal, total_amount: Decimal) -> str:
    """Generate SMS content for the customer"""
    return f"""Dear {customer_name},

Your daily sales summary ({from_date.strftime('%d-%m-%Y')} to {to_date.strftime('%d-%m-%Y')}):
Total Quantity: {float(total_qty):.2f} KG
Amount Total: ₹{float(total_amount):.2f}

Thank you for your business!"""

@router.get("/sms-single-customer-daily-sale")
def get_sms_single_customer_daily_sale(
    group_name: str = Query(..., description="Group name"),
    customer_name: str = Query(..., description="Customer name"),
    from_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Get daily sales data for a specific customer within a group for SMS generation.
    
    Returns:
    - Sales transactions with SL.NO, DATE, ITEM NAME, QTY, RATE, TOTAL
    - Total Quantity and Amount Total for SMS summary
    - Auto-generated SMS content
    """
    
    # Validate date range
    if from_date > to_date:
        raise HTTPException(status_code=400, detail="From date cannot be after to date")
    
    # Get customer with group validation
    customer = db.query(Farmer).join(FarmerGroup).filter(
        Farmer.name == customer_name,
        FarmerGroup.name == group_name,
        Farmer.vendor_id == user.vendor_id
    ).first()
    
    if not customer:
        raise HTTPException(
            status_code=404, 
            detail=f"Customer '{customer_name}' not found in group '{group_name}'"
        )
    
    # Get sales data with proper joins
    sales_query = db.query(
        CollectionItem.date,
        CollectionItem.item_name,
        CollectionItem.qty_kg,
        CollectionItem.rate_per_kg,
        CollectionItem.id
    ).filter(
        CollectionItem.farmer_id == customer.id,
        CollectionItem.date >= from_date,
        CollectionItem.date <= to_date,
        CollectionItem.vendor_id == user.vendor_id
    ).order_by(CollectionItem.date, CollectionItem.id)
    
    sales_data = sales_query.all()
    
    # Format the data with SL.NO
    formatted_data = []
    for idx, sale in enumerate(sales_data, 1):
        total_amount = sale.qty_kg * sale.rate_per_kg
        formatted_data.append({
            "sl_no": idx,
            "date": sale.date.strftime("%d-%m-%Y"),
            "item_name": sale.item_name,
            "qty": float(sale.qty_kg),
            "rate": float(sale.rate_per_kg),
            "total": float(total_amount)
        })
    
    # Calculate totals
    total_qty = sum(sale.qty_kg for sale in sales_data)
    total_amount = sum(sale.qty_kg * sale.rate_per_kg for sale in sales_data)
    
    # Generate SMS content
    sms_content = generate_sms_content(
        customer_name=customer_name,
        from_date=from_date,
        to_date=to_date,
        total_qty=total_qty,
        total_amount=total_amount
    )
    
    return {
        "customer_name": customer_name,
        "group_name": group_name,
        "from_date": from_date.strftime("%d-%m-%Y"),
        "to_date": to_date.strftime("%d-%m-%Y"),
        "sales_data": formatted_data,
        "totals": {
            "total_quantity": float(total_qty),
            "amount_total": float(total_amount)
        },
        "sms_content": sms_content,
        "record_count": len(formatted_data)
    }

# Additional utility endpoints for frontend integration

@router.get("/sms-available-groups")
def get_sms_available_groups(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """Get all groups that have customers with sales data"""
    groups_with_sales = db.query(FarmerGroup.name).distinct().join(
        Farmer
    ).join(
        CollectionItem
    ).filter(
        FarmerGroup.vendor_id == user.vendor_id
    ).order_by(FarmerGroup.name).all()
    
    return [group[0] for group in groups_with_sales]

@router.get("/sms-customers-by-group/{group_name}")
def get_sms_customers_by_group(
    group_name: str,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """Get customers in a specific group who have sales data"""
    customers = db.query(Farmer.name, Farmer.id).join(
        CollectionItem
    ).join(
        FarmerGroup
    ).filter(
        FarmerGroup.name == group_name,
        FarmerGroup.vendor_id == user.vendor_id
    ).distinct().order_by(Farmer.name).all()
    
    return [{"id": customer.id, "name": customer.name} for customer in customers]