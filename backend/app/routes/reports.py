from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Optional

from app.core.db import get_db
from app.dependencies import get_current_user
from app.models.collection_item import CollectionItem
from app.models.farmer import Farmer

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


@router.get("/daily-sales")
def get_daily_sales(
    from_date: date = Query(..., description="Start date for the report"),
    to_date: date = Query(..., description="End date for the report"),
    item_name: Optional[str] = Query(None, description="Filter by item name (optional)"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Returns daily sales report data grouped by date, party, and item.
    
    Query Parameters:
    - from_date: Start date (required)
    - to_date: End date (required)
    - item_name: Optional filter for specific item name
    
    Returns a list of sale records with:
    - id, date, party (farmer name), itemName, qty, rate, total
    """
    
    # Base query: join collection_items with farmers to get party names
    query = (
        db.query(
            CollectionItem.id,
            CollectionItem.date,
            Farmer.name.label("party_name"),
            CollectionItem.item_name,
            CollectionItem.qty_kg,
            CollectionItem.rate_per_kg
        )
        .join(Farmer, CollectionItem.farmer_id == Farmer.id)
        .filter(
            CollectionItem.vendor_id == user.vendor_id,
            CollectionItem.date >= from_date,
            CollectionItem.date <= to_date,
            CollectionItem.item_name.isnot(None),  # Only include items with names
            CollectionItem.item_name != ""
        )
    )
    
    # Apply item filter if provided
    if item_name:
        query = query.filter(CollectionItem.item_name == item_name)
    
    # Order by date and party
    results = query.order_by(
        CollectionItem.date.asc(),
        Farmer.name.asc()
    ).all()
    
    # Transform to response format
    sales_data = []
    for row in results:
        qty = float(row.qty_kg or 0)
        rate = float(row.rate_per_kg or 0)
        total = qty * rate
        
        sales_data.append({
            "id": row.id,
            "date": row.date.isoformat(),
            "party": row.party_name or "Unknown",
            "itemName": row.item_name or "",
            "qty": qty,
            "rate": rate,
            "total": total
        })
    
    return sales_data


@router.get("/daily-sales/items")
def get_available_items(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Returns a distinct list of item names used in collection items.
    Used for populating the item filter dropdown.
    """
    
    items = (
        db.query(CollectionItem.item_name)
        .filter(
            CollectionItem.vendor_id == user.vendor_id,
            CollectionItem.item_name.isnot(None),
            CollectionItem.item_name != ""
        )
        .distinct()
        .order_by(CollectionItem.item_name.asc())
        .all()
    )
    
    return [item[0] for item in items if item[0]]
