"""
Database query functions for report generation.
Handles data aggregation, filtering, and commission calculations.
Uses FastAPI dependency-injected SQLAlchemy sessions.
"""
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from collections import defaultdict
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
    
    # Priority 4: Default 12%
    return (amount * Decimal("12") / 100).quantize(Decimal("0.01"))


def get_ledger_data(
    vendor_id: int,
    customer_id: int,
    from_date: date = None,
    to_date: date = None,
    db: Session = None
) -> Dict[str, Any]:
    """
    Get Ledger data for a specific customer (farmer) using CollectionItem data.
    This provides proper date and vehicle information.
    
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
    
    # Fetch collection items (transactions) with all required fields
    entries = db.query(
        CollectionItem.id,
        CollectionItem.date,
        CollectionItem.vehicle_name,
        CollectionItem.vehicle_number,
        CollectionItem.item_code,
        CollectionItem.item_name,
        CollectionItem.qty_kg,
        CollectionItem.rate_per_kg,
        CollectionItem.transport_cost.label("luggage"),
        CollectionItem.coolie_cost.label("coolie"),
        CollectionItem.paid_amount,
        CollectionItem.remarks
    ).filter(
        CollectionItem.vendor_id == vendor_id,
        CollectionItem.farmer_id == customer_id,
        CollectionItem.date >= from_date,
        CollectionItem.date <= to_date
    ).order_by(CollectionItem.date.asc()).all()
    
    # Calculate aggregates
    total_qty = Decimal("0")
    total_amount = Decimal("0")
    total_paid = Decimal("0")
    total_luggage = Decimal("0")
    total_coolie = Decimal("0")
    
    entries_list = []
    for entry in entries:
        qty = Decimal(str(entry.qty_kg)) if entry.qty_kg is not None else Decimal("0")
        rate = Decimal(str(entry.rate_per_kg)) if entry.rate_per_kg is not None else Decimal("0")
        amount = qty * rate
        paid = Decimal(str(entry.paid_amount)) if entry.paid_amount is not None else Decimal("0")
        luggage = Decimal(str(entry.luggage)) if entry.luggage is not None else Decimal("0")
        coolie = Decimal(str(entry.coolie)) if entry.coolie is not None else Decimal("0")
        
        total_qty += qty
        total_amount += amount
        total_paid += paid
        total_luggage += luggage
        total_coolie += coolie
        
        # Format date as DD-MM-YYYY
        date_str = entry.date.strftime("%d-%m-%Y") if entry.date else "N/A"
        
        # Get vehicle info
        vehicle_info = entry.vehicle_name or entry.vehicle_number or "N/A"
        
        entries_list.append({
            "id": entry.id,
            "date": date_str,
            "vehicle": vehicle_info,
            "item_code": entry.item_code or "N/A",
            "item_name": entry.item_name or "N/A",
            "qty": str(qty),
            "rate": str(rate),
            "luggage": str(luggage),
            "coolie": str(coolie),
            "amount": str(amount),
            "paid": str(paid),
            "remarks": entry.remarks or "N/A"
        })
    
    return {
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "code": customer.farmer_code,
            "address": customer.address or "N/A",
            "advance_total": str(customer.advance_total or 0),
            "group_name": group_name
        },
        "entries": entries_list,
        "total_qty": str(total_qty),
        "total_amount": str(total_amount),
        "total_paid": str(total_paid),
        "total_luggage": str(total_luggage),
        "total_coolie": str(total_coolie),
        "record_count": len(entries_list)
    }


def get_group_total_data(
    vendor_id: int,
    from_date: date = None,
    to_date: date = None,
    db: Session = None
) -> Dict[str, Any]:
    """
    Get aggregated totals for all farmer groups using CollectionItem data.
    This provides proper date and vehicle information.
    
    Returns grouped data with:
    - Group name
    - Total qty, amount per group
    - Customer breakdown with date and vehicle info
    """
    if not db:
        return {"groups": [], "entries": [], "grand_total_amount": "0"}
    
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
    
    # Query: get all collection items with group information and all required fields
    results = db.query(
        FarmerGroup.id.label("group_id"),
        FarmerGroup.name.label("group_name"),
        Farmer.id.label("farmer_id"),
        Farmer.name.label("farmer_name"),
        Farmer.address.label("farmer_address"),
        
        CollectionItem.date,
        CollectionItem.vehicle_name,
        CollectionItem.vehicle_number,
        CollectionItem.item_code,
        CollectionItem.item_name,
        CollectionItem.qty_kg,
        CollectionItem.rate_per_kg,
        CollectionItem.transport_cost.label("luggage"),
        CollectionItem.coolie_cost.label("coolie"),
        CollectionItem.paid_amount,
        CollectionItem.remarks
    ).join(
        Farmer, Farmer.group_id == FarmerGroup.id
    ).join(
        CollectionItem, CollectionItem.farmer_id == Farmer.id
    ).filter(
        FarmerGroup.vendor_id == vendor_id,
        CollectionItem.vendor_id == vendor_id,
        CollectionItem.date >= from_date,
        CollectionItem.date <= to_date
    ).order_by(
        FarmerGroup.name.asc(),
        CollectionItem.date.asc()
    ).all()
    
    # Group data by group_id
    grouped_data = defaultdict(list)
    
    grand_total = Decimal("0")
    grand_total_luggage = Decimal("0")
    grand_total_coolie = Decimal("0")
    entries_list = []
    
    for row in results:
        qty = Decimal(str(row.qty_kg or 0))
        rate = Decimal(str(row.rate_per_kg or 0))
        amount = qty * rate
        paid = Decimal(str(row.paid_amount or 0))
        luggage = Decimal(str(row.luggage or 0))
        coolie = Decimal(str(row.coolie or 0))
        
        # Format date as DD-MM-YYYY
        date_str = row.date.strftime("%d-%m-%Y") if row.date else "N/A"
        
        # Get vehicle info
        vehicle_info = row.vehicle_name or row.vehicle_number or "N/A"
        
        # Add to grouped data
        grouped_data[row.group_id].append({
            "group_id": row.group_id,
            "group_name": row.group_name,
            "farmer_id": row.farmer_id,
            "customer_name": row.farmer_name,
            "customer_address": row.farmer_address or "N/A",
            "date": date_str,
            "vehicle": vehicle_info,
            "item_code": row.item_code or "N/A",
            "item_name": row.item_name or "N/A",
            "qty": str(qty),
            "rate": str(rate),
            "luggage": str(luggage),
            "coolie": str(coolie),
            "amount": str(amount),
            "paid": str(paid),
            "remarks": row.remarks or "N/A"
        })
        
        grand_total += amount
        grand_total_luggage += luggage
        grand_total_coolie += coolie
        
        # Add to entries list for detailed view
        entries_list.append({
            "group_id": row.group_id,
            "group_name": row.group_name,
            "farmer_id": row.farmer_id,
            "customer_name": row.farmer_name,
            "customer_address": row.farmer_address or "N/A",
            "date": date_str,
            "vehicle": vehicle_info,
            "item_code": row.item_code or "N/A",
            "item_name": row.item_name or "N/A",
            "qty": str(qty),
            "rate": str(rate),
            "luggage": str(luggage),
            "coolie": str(coolie),
            "amount": str(amount),
            "paid": str(paid),
            "remarks": row.remarks or "N/A"
        })
    
    # Create group summaries
    groups_list = []
    for group_id, group_entries in grouped_data.items():
        if not group_entries:
            continue
            
        group_name = group_entries[0]["group_name"]
        total_qty = sum(Decimal(e["qty"]) for e in group_entries)
        total_amount = sum(Decimal(e["amount"]) for e in group_entries)
        total_paid = sum(Decimal(e["paid"]) for e in group_entries)
        
        groups_list.append({
            "id": group_id,
            "name": group_name,
            "total_qty": str(total_qty),
            "total_amount": str(total_amount),
            "total_paid": str(total_paid),
            "customer_count": len(set(e["farmer_id"] for e in group_entries)),
            "entry_count": len(group_entries)
        })
    
    return {
        "groups": groups_list,
        "entries": entries_list,
        "grand_total_amount": str(grand_total),
        "grand_total_luggage": str(grand_total_luggage),
        "grand_total_coolie": str(grand_total_coolie),
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
        # Get this farmer's collection items (transactions) with all required fields
        entries = db.query(
            CollectionItem.id,
            CollectionItem.date,
            CollectionItem.vehicle_name,
            CollectionItem.vehicle_number,
            CollectionItem.item_code,
            CollectionItem.item_name,
            CollectionItem.qty_kg,
            CollectionItem.rate_per_kg,
            CollectionItem.transport_cost.label("luggage"),
            CollectionItem.coolie_cost.label("coolie"),
            CollectionItem.paid_amount,
            CollectionItem.remarks
        ).filter(
            CollectionItem.vendor_id == vendor_id,
            CollectionItem.farmer_id == farmer.id,
            CollectionItem.date >= from_date,
            CollectionItem.date <= to_date
        ).order_by(CollectionItem.date.asc()).all()
                
        farmer_total_qty = Decimal("0")
        farmer_total_amount = Decimal("0")
        farmer_total_paid = Decimal("0")
        farmer_total_luggage = Decimal("0")
        farmer_total_coolie = Decimal("0")
        entries_list = []
                
        for entry in entries:
            qty = Decimal(str(entry.qty_kg)) if entry.qty_kg is not None else Decimal("0")
            rate = Decimal(str(entry.rate_per_kg)) if entry.rate_per_kg is not None else Decimal("0")
            amount = qty * rate
            paid = Decimal(str(entry.paid_amount)) if entry.paid_amount is not None else Decimal("0")
            luggage = Decimal(str(entry.luggage)) if entry.luggage is not None else Decimal("0")
            coolie = Decimal(str(entry.coolie)) if entry.coolie is not None else Decimal("0")
                    
            farmer_total_qty += qty
            farmer_total_amount += amount
            farmer_total_paid += paid
            farmer_total_luggage += luggage
            farmer_total_coolie += coolie
                    
            # Format date as DD-MM-YYYY
            date_str = entry.date.strftime("%d-%m-%Y") if entry.date else "N/A"
                    
            # Get vehicle info
            vehicle_info = entry.vehicle_name or entry.vehicle_number or "N/A"
                    
            entries_list.append({
                "id": entry.id,
                "date": date_str,
                "vehicle": vehicle_info,
                "item_code": entry.item_code or "N/A",
                "item_name": entry.item_name or "N/A",
                "qty": str(qty),
                "rate": str(rate),
                "luggage": str(luggage),
                "coolie": str(coolie),
                "amount": str(amount),
                "paid": str(paid),
                "remarks": entry.remarks or "N/A"
            })
                
        grand_total_qty += farmer_total_qty
        grand_total_amount += farmer_total_amount
        total_entry_count += len(entries_list)
                
        # Calculate farmer's commission (using default 12% as requested)
        farmer_commission = (farmer_total_amount * Decimal("12") / 100).quantize(Decimal("0.01"))
                
        farmers_list.append({
            "id": farmer.id,
            "name": farmer.name,
            "code": farmer.farmer_code,
            "address": farmer.address or "N/A",
            
            "entries": entries_list,
            "total_qty": str(farmer_total_qty),
            "total_amount": str(farmer_total_amount),
            "total_paid": str(farmer_total_paid),
            "total_luggage": str(farmer_total_luggage),
            "total_coolie": str(farmer_total_coolie),
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
    Get daily collection/sales data with vehicle information.
    Uses CollectionItem data for complete information including vehicle details.
    
    Returns data with date, vehicle, party, item, qty, rate, and amount.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if not db:
        logger.error("Database session is None")
        return {"entries": [], "grand_total_qty": "0", "grand_total_amount": "0"}
    
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
        logger.info(f"Using default date range: {from_date} to {to_date}")
    
    logger.info(f"Querying daily sales - vendor_id: {vendor_id}, from: {from_date}, to: {to_date}, item: {item_name}")
    
    try:
        # First, let's debug: Check if there are ANY collection items for this vendor
        total_items_count = db.query(CollectionItem).filter(
            CollectionItem.vendor_id == vendor_id
        ).count()
        logger.info(f"DEBUG: Total CollectionItems in DB for vendor {vendor_id}: {total_items_count}")
        
        # Check date range of available data
        min_max_dates = db.query(
            func.min(CollectionItem.date).label('min_date'),
            func.max(CollectionItem.date).label('max_date')
        ).filter(
            CollectionItem.vendor_id == vendor_id
        ).first()
        
        if min_max_dates and min_max_dates.min_date:
            logger.info(f"DEBUG: Available date range in DB: {min_max_dates.min_date} to {min_max_dates.max_date}")
            logger.info(f"DEBUG: Requested date range: {from_date} to {to_date}")
        else:
            logger.warning(f"DEBUG: No CollectionItems found for vendor {vendor_id}")
        
        # Query collection items with vehicle information and all required fields
        # IMPORTANT: Use outerjoin but apply filters correctly to avoid excluding NULL farmer records
        query = db.query(
            CollectionItem.date,
            CollectionItem.vehicle_name,
            CollectionItem.vehicle_number,
            Farmer.name.label("party_name"),
            Farmer.address.label("party_address"),
            
            CollectionItem.item_code,
            CollectionItem.item_name,
            CollectionItem.qty_kg,
            CollectionItem.rate_per_kg,
            CollectionItem.transport_cost.label("luggage"),
            CollectionItem.coolie_cost.label("coolie"),
            CollectionItem.paid_amount,
            CollectionItem.remarks
        ).outerjoin(
            Farmer, CollectionItem.farmer_id == Farmer.id
        ).where(
            # Use .where() instead of .filter() for clarity - same behavior but clearer intent
            CollectionItem.vendor_id == vendor_id,
            CollectionItem.date >= from_date,
            CollectionItem.date <= to_date
        )
        
        # Optional: filter by item name
        if item_name:
            logger.info(f"Filtering by item_name: {item_name}")
            query = query.where(CollectionItem.item_name == item_name)
        
        logger.info(f"Executing query...")
        
        # Log the SQL query for debugging
        try:
            compiled_query = str(query)
            logger.info(f"SQL Query: {compiled_query}")
            logger.info(f"SQL Parameters: vendor_id={vendor_id}, from_date={from_date}, to_date={to_date}")
        except Exception as compile_error:
            logger.warning(f"Could not compile query for logging: {compile_error}")
        
        results = query.order_by(
            CollectionItem.date.asc(),
            Farmer.name.asc()
        ).all()
        
        logger.info(f"Query returned {len(results)} results")
        
        # If no results, log more details
        if len(results) == 0:
            logger.warning(f"No results found! Checking if data exists outside date range...")
            # Check if there are items just outside our range
            nearby_items = db.query(CollectionItem).filter(
                CollectionItem.vendor_id == vendor_id,
                or_(
                    CollectionItem.date < from_date,
                    CollectionItem.date > to_date
                )
            ).limit(5).all()
            
            if nearby_items:
                logger.warning(f"Found {len(nearby_items)} items OUTSIDE the requested date range:")
                for idx, item in enumerate(nearby_items):
                    logger.warning(f"  Item {idx+1}: date={item.date}, farmer_id={item.farmer_id}, qty={item.qty_kg}")
            else:
                logger.warning(f"No CollectionItems found at all for vendor {vendor_id}")
        
        entries_list = []
        grand_total_qty = Decimal("0")
        grand_total_amount = Decimal("0")
        grand_total_luggage = Decimal("0")
        grand_total_coolie = Decimal("0")
        
        for idx, row in enumerate(results):
            try:
                # Safely convert numeric values
                try:
                    qty = Decimal(str(row.qty_kg)) if row.qty_kg is not None else Decimal("0")
                except (ValueError, TypeError, Exception) as e:
                    logger.warning(f"Invalid qty_kg at index {idx}: {row.qty_kg}, error: {e}")
                    qty = Decimal("0")
                
                try:
                    rate = Decimal(str(row.rate_per_kg)) if row.rate_per_kg is not None else Decimal("0")
                except (ValueError, TypeError, Exception) as e:
                    logger.warning(f"Invalid rate_per_kg at index {idx}: {row.rate_per_kg}, error: {e}")
                    rate = Decimal("0")
                
                amount = qty * rate
                
                try:
                    paid = Decimal(str(row.paid_amount)) if row.paid_amount is not None else Decimal("0")
                except (ValueError, TypeError, Exception) as e:
                    logger.warning(f"Invalid paid_amount at index {idx}: {row.paid_amount}, error: {e}")
                    paid = Decimal("0")
                
                try:
                    luggage = Decimal(str(row.luggage)) if row.luggage is not None else Decimal("0")
                except (ValueError, TypeError, Exception) as e:
                    logger.warning(f"Invalid luggage at index {idx}: {row.luggage}, error: {e}")
                    luggage = Decimal("0")
                
                try:
                    coolie = Decimal(str(row.coolie)) if row.coolie is not None else Decimal("0")
                except (ValueError, TypeError, Exception) as e:
                    logger.warning(f"Invalid coolie at index {idx}: {row.coolie}, error: {e}")
                    coolie = Decimal("0")
                
                # Format date as DD-MM-YYYY
                try:
                    date_str = row.date.strftime("%d-%m-%Y") if row.date else "N/A"
                except Exception as e:
                    logger.warning(f"Invalid date at index {idx}: {row.date}, error: {e}")
                    date_str = "N/A"
                
                # Get vehicle info
                vehicle_info = row.vehicle_name or row.vehicle_number or "N/A"
                
                grand_total_qty += qty
                grand_total_amount += amount
                grand_total_luggage += luggage
                grand_total_coolie += coolie
                
                entries_list.append({
                    "date": date_str,
                    "vehicle": vehicle_info,
                    "vehicle_name": vehicle_info,  # For backward compatibility
                    "party": row.party_name or "Unknown",
                    "party_address": row.party_address or "N/A",
                    
                    "item_code": row.item_code or "N/A",
                    "item": row.item_name or "Unspecified",
                    "qty": str(qty),
                    "rate": str(rate),
                    "luggage": str(luggage),
                    "coolie": str(coolie),
                    "amount": str(amount),
                    "paid": str(paid),
                    "remarks": row.remarks or "N/A"
                })
            except Exception as row_error:
                logger.warning(f"Error processing row {idx}: {row_error}")
                # Skip this row and continue
                continue
        
        logger.info(f"Successfully processed {len(entries_list)} entries")
        
        return {
            "entries": entries_list,
            "grand_total_qty": str(grand_total_qty),
            "grand_total_amount": str(grand_total_amount),
            "grand_total_luggage": str(grand_total_luggage),
            "grand_total_coolie": str(grand_total_coolie),
            "record_count": len(entries_list),
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Database query failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        # Return empty data instead of crashing
        return {
            "entries": [],
            "grand_total_qty": "0",
            "grand_total_amount": "0",
            "error": str(e)
        }
