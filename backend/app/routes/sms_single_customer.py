"""
SMS Single Customer Daily Sale API Endpoint
This module provides the backend endpoint for fetching daily sales data 
for a specific customer within a group for SMS generation.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
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

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])

def generate_sms_content(customer_name: str, from_date: date, to_date: date, 
                        total_qty: Decimal, total_amount: Decimal) -> str:
    """Generate SMS content for the customer"""
    try:
        return f"""Dear {customer_name},

Your daily sales summary ({from_date.strftime('%d-%m-%Y')} to {to_date.strftime('%d-%m-%Y')}):
Total Quantity: {float(total_qty):.2f} KG
Amount Total: ₹{float(total_amount):.2f}

Thank you for your business!"""
    except Exception as e:
        logger.error(f"Error generating SMS content: {e}")
        return f"Dear {customer_name}, Sales summary from {from_date} to {to_date}. Please contact for details."

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
    try:
        logger.info(f"SMS Single Customer request - group: {group_name}, customer: {customer_name}, from: {from_date}, to: {to_date}")
        
        # Validate date range
        if from_date > to_date:
            logger.warning(f"Invalid date range: from {from_date} > to {to_date}")
            raise HTTPException(status_code=400, detail="From date cannot be after to date")
        
        # Get customer with group validation
        logger.info(f"Searching for customer {customer_name} in group {group_name}")
        customer = db.query(Farmer).join(FarmerGroup).filter(
            Farmer.name == customer_name,
            FarmerGroup.name == group_name,
            Farmer.vendor_id == user.vendor_id
        ).first()
        
        if not customer:
            logger.warning(f"Customer '{customer_name}' not found in group '{group_name}'")
            raise HTTPException(
                status_code=404, 
                detail=f"Customer '{customer_name}' not found in group '{group_name}'"
            )
        
        logger.info(f"Found customer: {customer.name} (ID: {customer.id})")
        
        # Get sales data with proper joins
        logger.info(f"Querying sales data for customer {customer.id} from {from_date} to {to_date}")
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
        
        try:
            sales_data = sales_query.all()
            logger.info(f"Retrieved {len(sales_data)} sales records")
        except Exception as query_error:
            logger.error(f"Database query failed: {query_error}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(query_error)}")
        
        # Format the data with SL.NO
        formatted_data = []
        total_qty = Decimal("0")
        total_amount = Decimal("0")
        
        for idx, sale in enumerate(sales_data, 1):
            try:
                # Safely handle numeric values
                qty = Decimal(str(sale.qty_kg)) if sale.qty_kg is not None else Decimal("0")
                rate = Decimal(str(sale.rate_per_kg)) if sale.rate_per_kg is not None else Decimal("0")
                line_total = qty * rate
                
                # Format date safely
                try:
                    date_str = sale.date.strftime("%d-%m-%Y") if sale.date else "N/A"
                except Exception:
                    date_str = "N/A"
                
                formatted_data.append({
                    "sl_no": idx,
                    "date": date_str,
                    "item_name": sale.item_name or "N/A",
                    "qty": float(qty),
                    "rate": float(rate),
                    "total": float(line_total)
                })
                
                total_qty += qty
                total_amount += line_total
                
            except Exception as row_error:
                logger.warning(f"Error processing sale row {idx}: {row_error}")
                # Skip this row and continue
                continue
        
        logger.info(f"Formatted {len(formatted_data)} records, total_qty: {float(total_qty):.2f}, total_amount: {float(total_amount):.2f}")
        
        # Generate SMS content
        sms_content = generate_sms_content(
            customer_name=customer_name,
            from_date=from_date,
            to_date=to_date,
            total_qty=total_qty,
            total_amount=total_amount
        )
        
        response_data = {
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
        
        logger.info(f"Returning response with {len(formatted_data)} records")
        return response_data
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in sms-single-customer-daily-sale: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(e)}"}
        )

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