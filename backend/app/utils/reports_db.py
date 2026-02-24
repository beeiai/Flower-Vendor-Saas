"""
Database query functions for report generation.
Handles data aggregation, filtering, and commission calculations.
Uses FastAPI dependency-injected SQLAlchemy sessions.
"""
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from app.models.silk_ledger_entry import SilkLedgerEntry
from app.models.farmer import Farmer
from app.models.farmer_group import FarmerGroup
from app.models.collection_item import CollectionItem
from app.models.saala_customer import SaalaCustomer, SaalaTransaction


def get_default_date_range() -> tuple:
    """Get default date range: first day of month to today."""
    today = datetime.now().date()
    first_day_of_month = today.replace(day=1)
    return first_day_of_month, today


def calculate_commission(
    amount: Decimal,
    commission_percent: Optional[Decimal] = None,
    farmer_id: Optional[int] = None,
    group_id: Optional[int] = None,
    db: Optional[Session] = None
) -> Decimal:
    """
    Calculate commission with priority order:
    1. Passed commission_percent (highest priority)
    2. Farmer's commission_percent override
    3. Group's commission_percent
    4. Default 5%
    
    Args:
        amount: Transaction amount
        commission_percent: Direct commission percentage (overrides everything)
        farmer_id: Farmer ID to fetch their commission override
        group_id: Group ID to fetch group commission
        db: Database session for queries
    
    Returns:
        Commission amount
    """
    if amount is None or amount <= 0:
        return Decimal("0.00")
    
    # Priority 1: Passed percent
    if commission_percent is not None and commission_percent > 0:
        return (amount * commission_percent / 100).quantize(Decimal("0.01"))
    
    # Priority 2: Get farmer's commission override
    if db and farmer_id:
        farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
        if farmer and farmer.commission_percent:
            return (amount * farmer.commission_percent / 100).quantize(Decimal("0.01"))
    
    # Priority 3: Get group commission
    if db and group_id:
        group = db.query(FarmerGroup).filter(FarmerGroup.id == group_id).first()
        if group and group.commission_percent:
            return (amount * group.commission_percent / 100).quantize(Decimal("0.01"))
    
    # Priority 4: Default 5%
    return (amount * Decimal("5") / 100).quantize(Decimal("0.01"))


def get_ledger_data(
    vendor_id: int,
    customer_id: int,
    from_date: date = None,
    to_date: date = None,
    db: Session = None
) -> Dict[str, Any]:
    """
    Get Silk Ledger data for a specific customer (farmer).
    
    Args:
        vendor_id: Vendor/vendor_id
        customer_id: Farmer ID
        from_date: Start date (defaults to month start)
        to_date: End date (defaults to today)
        db: Database session
    
    Returns:
        Dictionary with ledger data and metadata
    """
    if not db:
        return {"entries": [], "total_qty": "0", "total_kg": "0", "total_amount": "0", "customer": None}
    
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
    
    # Fetch customer/farmer info
    customer = db.query(Farmer).filter(
        Farmer.id == customer_id,
        Farmer.vendor_id == vendor_id
    ).first()
    
    if not customer:
        return {"entries": [], "total_qty": "0", "total_kg": "0", "total_amount": "0", "customer": None}
    
    # Get group name
    group_name = "N/A"
    if customer.group_id:
        group = db.query(FarmerGroup).filter(FarmerGroup.id == customer.group_id).first()
        if group:
            group_name = group.name
    
    # Fetch ledger entries
    entries = db.query(
        SilkLedgerEntry.id,
        SilkLedgerEntry.date,
        SilkLedgerEntry.qty,
        SilkLedgerEntry.kg,
        SilkLedgerEntry.rate
    ).filter(
        SilkLedgerEntry.vendor_id == vendor_id,
        SilkLedgerEntry.customer_id == customer_id,
        SilkLedgerEntry.date >= from_date,
        SilkLedgerEntry.date <= to_date
    ).order_by(SilkLedgerEntry.date.asc()).all()
    
    # Calculate aggregates
    total_qty = Decimal("0")
    total_kg = Decimal("0")
    total_amount = Decimal("0")
    
    entries_list = []
    for entry in entries:
        qty = Decimal(str(entry.qty or 0))
        kg = Decimal(str(entry.kg or 0))
        rate = Decimal(str(entry.rate or 0))
        amount = qty * rate
        
        total_qty += qty
        total_kg += kg
        total_amount += amount
        
        entries_list.append({
            "id": entry.id,
            "date": entry.date.isoformat(),
            "qty": str(qty),
            "kg": str(kg),
            "rate": str(rate),
            "amount": str(amount)
        })
    
    return {
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "code": customer.farmer_code,
            "phone": customer.phone,
            "group_name": group_name
        },
        "entries": entries_list,
        "total_qty": str(total_qty),
        "total_kg": str(total_kg),
        "total_amount": str(total_amount),
        "record_count": len(entries_list)
    }


def get_group_total_data(
    vendor_id: int,
    from_date: date = None,
    to_date: date = None,
    db: Session = None
) -> Dict[str, Any]:
    """
    Get aggregated totals for all farmer groups.
    
    Returns grouped data with:
    - Group name
    - Total qty, kg, amount per group
    - Average rate
    - Commission
    """
    if not db:
        return {"groups": [], "grand_total_amount": "0"}
    
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
    
    # Query: aggregate by group
    group_data = db.query(
        FarmerGroup.id,
        FarmerGroup.name,
        FarmerGroup.commission_percent,
        func.sum(SilkLedgerEntry.qty).label("total_qty"),
        func.sum(SilkLedgerEntry.kg).label("total_kg"),
        func.sum(SilkLedgerEntry.qty * SilkLedgerEntry.rate).label("total_amount"),
        func.avg(SilkLedgerEntry.rate).label("avg_rate"),
        func.count(SilkLedgerEntry.id).label("entry_count")
    ).join(
        Farmer, Farmer.group_id == FarmerGroup.id
    ).join(
        SilkLedgerEntry, SilkLedgerEntry.customer_id == Farmer.id
    ).filter(
        FarmerGroup.vendor_id == vendor_id,
        SilkLedgerEntry.date >= from_date,
        SilkLedgerEntry.date <= to_date
    ).group_by(
        FarmerGroup.id,
        FarmerGroup.name,
        FarmerGroup.commission_percent
    ).order_by(
        FarmerGroup.name.asc()
    ).all()
    
    groups_list = []
    grand_total = Decimal("0")
    
    for group in group_data:
        total_qty = Decimal(str(group.total_qty or 0))
        total_kg = Decimal(str(group.total_kg or 0))
        total_amount = Decimal(str(group.total_amount or 0))
        avg_rate = Decimal(str(group.avg_rate or 0))
        commission = calculate_commission(
            total_amount,
            group.commission_percent,
            db=db
        )
        
        grand_total += total_amount
        
        groups_list.append({
            "id": group.id,
            "name": group.name,
            "total_qty": str(total_qty),
            "total_kg": str(total_kg),
            "total_amount": str(total_amount),
            "avg_rate": str(avg_rate),
            "commission": str(commission),
            "entry_count": group.entry_count
        })
    
    return {
        "groups": groups_list,
        "grand_total_amount": str(grand_total),
        "group_count": len(groups_list),
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat()
    }


def get_group_patti_data(
    vendor_id: int,
    group_id: int,
    from_date: date = None,
    to_date: date = None,
    db: Session = None
) -> Dict[str, Any]:
    """
    Get detailed Group Patti (Group Details) report.
    Shows all farmers in a group with their ledger entries.
    
    Returns structure:
    - Group header info
    - List of farmers with their entries
    - Farmer subtotals and group grand total
    """
    if not db:
        return {
            "group": None,
            "farmers": [],
            "grand_total_amount": "0",
            "grand_total_qty": "0",
            "entry_count": 0
        }
    
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
    
    # Fetch group info
    group = db.query(FarmerGroup).filter(
        FarmerGroup.id == group_id,
        FarmerGroup.vendor_id == vendor_id
    ).first()
    
    if not group:
        return {
            "group": None,
            "farmers": [],
            "grand_total_amount": "0",
            "grand_total_qty": "0",
            "entry_count": 0
        }
    
    # Fetch all farmers in group
    farmers = db.query(Farmer).filter(
        Farmer.group_id == group_id,
        Farmer.vendor_id == vendor_id
    ).order_by(Farmer.name.asc()).all()
    
    farmers_list = []
    grand_total_qty = Decimal("0")
    grand_total_amount = Decimal("0")
    total_entry_count = 0
    
    for farmer in farmers:
        # Get this farmer's ledger entries
        entries = db.query(
            SilkLedgerEntry.id,
            SilkLedgerEntry.date,
            SilkLedgerEntry.qty,
            SilkLedgerEntry.kg,
            SilkLedgerEntry.rate
        ).filter(
            SilkLedgerEntry.vendor_id == vendor_id,
            SilkLedgerEntry.customer_id == farmer.id,
            SilkLedgerEntry.date >= from_date,
            SilkLedgerEntry.date <= to_date
        ).order_by(SilkLedgerEntry.date.asc()).all()
        
        if not entries:
            continue  # Skip farmers with no entries
        
        farmer_total_qty = Decimal("0")
        farmer_total_amount = Decimal("0")
        entries_list = []
        
        for entry in entries:
            qty = Decimal(str(entry.qty or 0))
            kg = Decimal(str(entry.kg or 0))
            rate = Decimal(str(entry.rate or 0))
            amount = qty * rate
            
            farmer_total_qty += qty
            farmer_total_amount += amount
            
            entries_list.append({
                "id": entry.id,
                "date": entry.date.isoformat(),
                "qty": str(qty),
                "kg": str(kg),
                "rate": str(rate),
                "amount": str(amount)
            })
        
        grand_total_qty += farmer_total_qty
        grand_total_amount += farmer_total_amount
        total_entry_count += len(entries_list)
        
        # Calculate farmer's commission
        farmer_commission = calculate_commission(
            farmer_total_amount,
            farmer.commission_percent,
            group.commission_percent,
            db=db
        )
        
        farmers_list.append({
            "id": farmer.id,
            "name": farmer.name,
            "code": farmer.farmer_code,
            "phone": farmer.phone,
            "entries": entries_list,
            "total_qty": str(farmer_total_qty),
            "total_amount": str(farmer_total_amount),
            "commission": str(farmer_commission),
            "entry_count": len(entries_list)
        })
    
    return {
        "group": {
            "id": group.id,
            "name": group.name,
            "commission_percent": str(group.commission_percent) if group.commission_percent else "5.00"
        },
        "farmers": farmers_list,
        "grand_total_qty": str(grand_total_qty),
        "grand_total_amount": str(grand_total_amount),
        "farmer_count": len(farmers_list),
        "entry_count": total_entry_count,
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat()
    }


def get_daily_sales_data(
    vendor_id: int,
    from_date: date = None,
    to_date: date = None,
    item_name: Optional[str] = None,
    db: Session = None
) -> Dict[str, Any]:
    """
    Get daily collection/sales data aggregated by date and farmer.
    Uses CollectionItem (flower collections) data.
    
    Returns data grouped by date and party with quantities and amounts.
    """
    if not db:
        return {"entries": [], "grand_total_qty": "0", "grand_total_amount": "0"}
    
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
    
    # Query collection items
    query = db.query(
        CollectionItem.date,
        Farmer.name.label("party_name"),
        CollectionItem.item_name,
        func.sum(CollectionItem.qty_kg).label("total_qty"),
        func.sum(CollectionItem.qty_kg * CollectionItem.rate_per_kg).label("total_amount"),
        func.avg(CollectionItem.rate_per_kg).label("avg_rate"),
        func.count(CollectionItem.id).label("line_count")
    ).outerjoin(
        Farmer, CollectionItem.farmer_id == Farmer.id
    ).filter(
        CollectionItem.vendor_id == vendor_id,
        CollectionItem.date >= from_date,
        CollectionItem.date <= to_date
    )
    
    # Optional: filter by item name
    if item_name:
        query = query.filter(CollectionItem.item_name == item_name)
    
    results = query.group_by(
        CollectionItem.date,
        Farmer.name,
        CollectionItem.item_name
    ).order_by(
        CollectionItem.date.asc(),
        Farmer.name.asc()
    ).all()
    
    entries_list = []
    grand_total_qty = Decimal("0")
    grand_total_amount = Decimal("0")
    
    for row in results:
        total_qty = Decimal(str(row.total_qty or 0))
        total_amount = Decimal(str(row.total_amount or 0))
        avg_rate = Decimal(str(row.avg_rate or 0))
        
        grand_total_qty += total_qty
        grand_total_amount += total_amount
        
        entries_list.append({
            "date": row.date.isoformat() if row.date else None,
            "party": row.party_name or "Unknown",
            "item": row.item_name or "Unspecified",
            "qty": str(total_qty),
            "rate": str(avg_rate),
            "amount": str(total_amount),
            "line_count": row.line_count
        })
    
    return {
        "entries": entries_list,
        "grand_total_qty": str(grand_total_qty),
        "grand_total_amount": str(grand_total_amount),
        "record_count": len(entries_list),
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat()
    }
