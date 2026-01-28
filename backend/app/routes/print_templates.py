from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Optional

from app.core.db import get_db
from app.dependencies import get_current_user
from app.models.collection_item import CollectionItem
from app.models.farmer import Farmer
from app.models.farmer_group import FarmerGroup
from app.services.print_service import PrintService

router = APIRouter(
    prefix="/print",
    tags=["Print Templates"]
)


@router.get("/ledger-report")
def get_ledger_report(
    farmer_id: int = Query(..., description="Farmer ID"),
    from_date: date = Query(..., description="Start date"),
    to_date: date = Query(..., description="End date"),
    commission_pct: float = Query(12.0, description="Commission percentage"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Generate HTML ledger report for a specific farmer
    """
    # Fetch farmer details
    farmer = db.query(Farmer).filter(
        Farmer.id == farmer_id,
        Farmer.vendor_id == user.vendor_id
    ).first()
    
    if not farmer:
        return {"error": "Farmer not found"}
    
    # Fetch group name
    group = db.query(FarmerGroup).filter(FarmerGroup.id == farmer.group_id).first()
    group_name = group.name if group else "N/A"
    
    # Fetch collection items for the date range
    items = db.query(CollectionItem).filter(
        CollectionItem.farmer_id == farmer_id,
        CollectionItem.date >= from_date,
        CollectionItem.date <= to_date,
        CollectionItem.vendor_id == user.vendor_id
    ).all()
    
    # Transform data for template
    rows = []
    total_qty = 0
    total_amount = 0
    total_luggage = 0
    total_paid = 0
    
    for item in items:
        qty = float(item.qty_kg or 0)
        rate = float(item.rate_per_kg or 0)
        luggage = float(item.transport_cost or 0)
        paid = float(item.paid_amount or 0)
        total = qty * rate
        
        rows.append({
            "date": item.date.strftime("%d-%m-%Y"),
            "qty": f"{qty:.2f}",
            "price": f"{rate:.2f}",
            "total": f"{total:.2f}",
            "luggage": f"{luggage:.2f}",
            "paid": f"{paid:.2f}",
            "amount": f"{(total + luggage - paid):.2f}"
        })
        
        total_qty += qty
        total_amount += total
        total_luggage += luggage
        total_paid += paid
    
    # Calculate summary
    commission_rate = commission_pct / 100
    commission = total_amount * commission_rate
    net_amount = total_amount - commission
    final_total = net_amount + total_luggage - total_paid
    
    return PrintService.render_ledger_report(
        farmer_name=farmer.name,
        ledger_name=farmer.farmer_code or "N/A",
        address=farmer.address or "N/A",
        group_name=group_name,
        balance=final_total,
        commission_pct=commission_pct,
        from_date=from_date.strftime("%d-%m-%Y"),
        to_date=to_date.strftime("%d-%m-%Y"),
        rows=rows,
        total_qty=total_qty,
        total_amount=total_amount,
        commission=commission,
        luggage_total=total_luggage,
        coolie=0.0,
        net_amount=net_amount,
        paid_amount=total_paid,
        final_total=final_total,
    )


@router.get("/group-patti-report")
def get_group_patti_report(
    group_id: int = Query(..., description="Group ID"),
    from_date: date = Query(..., description="Start date"),
    to_date: date = Query(..., description="End date"),
    commission_pct: float = Query(12.0, description="Commission percentage"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Generate HTML group patti report with individual customer reports (1 per page)
    Optimized to reduce database queries
    """
    # Fetch group details
    group = db.query(FarmerGroup).filter(
        FarmerGroup.id == group_id,
        FarmerGroup.vendor_id == user.vendor_id
    ).first()
    
    if not group:
        return {"error": "Group not found"}
    
    # Fetch all farmers in the group
    farmers = db.query(Farmer).filter(
        Farmer.group_id == group_id,
        Farmer.vendor_id == user.vendor_id
    ).all()
    
    if not farmers:
        return {"error": "No farmers found in group"}
    
    # Fetch all collection items for all farmers in one query (optimization)
    farmer_ids = [f.id for f in farmers]
    all_items = db.query(CollectionItem).filter(
        CollectionItem.farmer_id.in_(farmer_ids),
        CollectionItem.date >= from_date,
        CollectionItem.date <= to_date,
        CollectionItem.vendor_id == user.vendor_id
    ).all()
    
    # Group items by farmer_id for faster lookup
    items_by_farmer = {}
    for item in all_items:
        if item.farmer_id not in items_by_farmer:
            items_by_farmer[item.farmer_id] = []
        items_by_farmer[item.farmer_id].append(item)
    
    # Calculate individual report for each farmer
    customer_reports = []
    group_total = 0
    
    # Create a lookup dict for farmer details
    farmer_lookup = {f.id: f for f in farmers}
    
    for farmer in farmers:
        # Get items for this farmer from the grouped dict (no additional query)
        items = items_by_farmer.get(farmer.id, [])
        
        # Transform data for template
        rows = []
        total_qty = 0
        total_amount = 0
        total_luggage = 0
        total_paid = 0
        
        for item in items:
            qty = float(item.qty_kg or 0)
            rate = float(item.rate_per_kg or 0)
            luggage = float(item.transport_cost or 0)
            paid = float(item.paid_amount or 0)
            total = qty * rate
            
            rows.append({
                "date": item.date.strftime("%d-%m-%Y"),
                "qty": f"{qty:.2f}",
                "price": f"{rate:.2f}",
                "total": f"{total:.2f}",
                "luggage": f"{luggage:.2f}",
                "paid": f"{paid:.2f}",
                "amount": f"{(total + luggage - paid):.2f}"
            })
            
            total_qty += qty
            total_amount += total
            total_luggage += luggage
            total_paid += paid
        
        # Calculate summary
        commission_rate = commission_pct / 100
        commission = total_amount * commission_rate
        net_amount = total_amount - commission
        final_total = net_amount + total_luggage - total_paid
        
        # Add customer report
        customer_reports.append({
            "customer_name": farmer.name,
            "address": farmer.address or "N/A",
            "rows": rows,
            "total_qty": f"{total_qty:.2f}",
            "gross_total": f"{total_amount:.2f}",
            "commission_amount": f"{commission:.2f}",
            "luggage_total": f"{total_luggage:.2f}",
            "coolie": "0.00",
            "net_amount": f"{net_amount:.2f}",
            "paid_total": f"{total_paid:.2f}",
            "final_total": f"{final_total:.2f}"
        })
        
        group_total += total_amount
    
    return PrintService.render_group_patti_report(
        group_name=group.name,
        from_date=from_date.strftime("%d-%m-%Y"),
        to_date=to_date.strftime("%d-%m-%Y"),
        commission_pct=commission_pct,
        customer_reports=customer_reports,
        group_total=group_total,
    )


@router.get("/group-total-report")
def get_group_total_report(
    group_id: int = Query(..., description="Group ID"),
    from_date: date = Query(..., description="Start date"),
    to_date: date = Query(..., description="End date"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Generate HTML group total summary report for a specific group and date range
    Optimized to reduce database queries
    """
    # Fetch group details
    group = db.query(FarmerGroup).filter(
        FarmerGroup.id == group_id,
        FarmerGroup.vendor_id == user.vendor_id
    ).first()
    
    if not group:
        return {"error": "Group not found"}
    
    # Fetch all farmers in the group
    farmers = db.query(Farmer).filter(
        Farmer.group_id == group_id,
        Farmer.vendor_id == user.vendor_id
    ).all()
    
    if not farmers:
        return {"error": "No farmers found in group"}
    
    # Fetch all collection items for all farmers in one query (optimization)
    farmer_ids = [f.id for f in farmers]
    all_items = db.query(CollectionItem).filter(
        CollectionItem.farmer_id.in_(farmer_ids),
        CollectionItem.date >= from_date,
        CollectionItem.date <= to_date,
        CollectionItem.vendor_id == user.vendor_id
    ).all()
    
    # Calculate totals for group
    total_qty = 0
    total_amount = 0
    total_paid = 0
    total_luggage = 0
    
    rows = []
    
    # Group items by farmer for report
    items_by_farmer = {}
    for item in all_items:
        if item.farmer_id not in items_by_farmer:
            items_by_farmer[item.farmer_id] = []
        items_by_farmer[item.farmer_id].append(item)
    
    # Create a lookup dict for farmer details
    farmer_lookup = {f.id: f for f in farmers}
    
    # Process each farmer
    for farmer in farmers:
        items = items_by_farmer.get(farmer.id, [])
        
        farmer_qty = 0
        farmer_amount = 0
        farmer_paid = 0
        farmer_luggage = 0
        
        for item in items:
            qty = float(item.qty_kg or 0)
            rate = float(item.rate_per_kg or 0)
            paid = float(item.paid_amount or 0)
            luggage = float(item.transport_cost or 0)
            
            farmer_qty += qty
            farmer_amount += qty * rate
            farmer_paid += paid
            farmer_luggage += luggage
        
        # Calculate net amount (gross - commission)
        commission = farmer_amount * 0.12  # 12% commission
        net_amount = farmer_amount - commission
        balance = net_amount + farmer_luggage - farmer_paid
        
        rows.append({
            "customer_name": farmer.name,
            "total_qty": f"{farmer_qty:.2f}",
            "gross_total": f"{farmer_amount:.2f}",
            "paid_total": f"{farmer_paid:.2f}",
            "balance": f"{balance:.2f}"
        })
        
        total_qty += farmer_qty
        total_amount += farmer_amount
        total_paid += farmer_paid
        total_luggage += farmer_luggage
    
    # Calculate group totals
    group_commission = total_amount * 0.12
    group_net = total_amount - group_commission
    group_balance = group_net + total_luggage - total_paid
    
    return PrintService.render_group_total_report(
        group_name=group.name,
        from_date=from_date.strftime("%d-%m-%Y"),
        to_date=to_date.strftime("%d-%m-%Y"),
        rows=rows,
        total_qty=total_qty,
        total_amount=total_amount,
        total_paid=total_paid,
        total_luggage=total_luggage,
        group_total=group_balance,
    )


@router.get("/daily-sales-report")
def get_daily_sales_report(
    from_date: date = Query(..., description="Start date"),
    to_date: date = Query(..., description="End date"),
    item_name: Optional[str] = Query(None, description="Filter by item name"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Generate HTML daily sales report
    """
    # Base query
    query = (
        db.query(
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
            CollectionItem.item_name.isnot(None),
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
    rows = []
    total_qty = 0
    total_amount = 0
    
    for row in results:
        qty = float(row.qty_kg or 0)
        rate = float(row.rate_per_kg or 0)
        total = qty * rate
        
        rows.append({
            "date": row.date.strftime("%d-%m-%Y"),
            "party": row.party_name or "Unknown",
            "itemName": row.item_name or "",
            "qty": f"{qty:.2f}",
            "rate": f"{rate:.2f}",
            "total": f"{total:.2f}"
        })
        
        total_qty += qty
        total_amount += total
    
    return PrintService.render_daily_sales_report(
        from_date=from_date.strftime("%d-%m-%Y"),
        to_date=to_date.strftime("%d-%m-%Y"),
        item_name=item_name,
        rows=rows,
        total_qty=total_qty,
        total_amount=total_amount,
    )