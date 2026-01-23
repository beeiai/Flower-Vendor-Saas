from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from app.core.db import get_db
from app.dependencies import get_current_user
from app.models.silk_ledger_entry import SilkLedgerEntry
from app.models.silk_collection import SilkCollection, CollectionStatus
from app.models.silk_physical_digital_entry import SilkPhysicalDigitalEntry
from app.models.farmer import Farmer
from app.models.collection_item import CollectionItem
from pydantic import BaseModel, Field


router = APIRouter(
    prefix="/silk",
    tags=["Silk"]
)


# ========== SCHEMAS ==========

class SilkCollectionCreate(BaseModel):
    """Schema for creating a silk collection entry"""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    credit: float = Field(0, ge=0, description="Credit amount")
    cash: float = Field(0, ge=0, description="Cash amount")
    upi: float = Field(0, ge=0, description="UPI/PhonePe amount")


class SilkPhysicalDigitalEntryCreate(BaseModel):
    """Schema for creating a silk physical and digital collection entry"""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    physical_kg: float = Field(0, ge=0, description="Physical collection in KG")
    physical_rate: float = Field(0, ge=0, description="Physical collection rate per KG")
    digital_kg: float = Field(0, ge=0, description="Digital collection in KG")
    digital_rate: float = Field(0, ge=0, description="Digital collection rate per KG")


class GroupAggregation(BaseModel):
    """Group-level aggregation"""
    groupName: str
    kg: float
    amount: float


class LedgerSummary(BaseModel):
    """Response model for ledger aggregation"""
    groups: list[GroupAggregation]
    grandTotals: dict


class CollectionResponse(BaseModel):
    """Response model for collection save"""
    id: int
    date: str
    credit_amount: float
    cash_amount: float
    upi_amount: float
    total_entered: float
    ledger_total: float
    difference: float
    status: str
    message: str


class SilkPhysicalDigitalResponse(BaseModel):
    """Response model for physical and digital silk collection save"""
    id: int
    date: str
    physical_kg: float
    physical_rate: float
    physical_amount: float
    digital_kg: float
    digital_rate: float
    digital_amount: float
    total_kg: float
    total_amount: float
    message: str


# ========== ENDPOINTS ==========

@router.get("/ledger", response_model=LedgerSummary)
def get_silk_ledger_aggregation(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Aggregates transactions from collection_items by customer group for a specific date.
    
    Returns:
    - Group-wise aggregation (kg, amount)
    - Grand totals across all groups
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Query regular transactions (collection_items) for the target date
    # Join with Farmer and FarmerGroup to get names
    from app.models.farmer_group import FarmerGroup
    query = (
        db.query(
            CollectionItem,
            FarmerGroup.name.label("group_name")
        )
        .outerjoin(FarmerGroup, CollectionItem.group_id == FarmerGroup.id)
        .filter(
            CollectionItem.vendor_id == user.vendor_id,
            CollectionItem.date == target_date
        )
        .all()
    )

    # Aggregate by group
    groups = {}
    for item, group_name in query:
        gname = group_name or "Unassigned"
        
        if gname not in groups:
            groups[gname] = {
                "groupName": gname,
                "kg": 0,
                "amount": 0
            }
        
        kg = float(item.qty_kg or 0)
        rate = float(item.rate_per_kg or 0)
        groups[gname]["kg"] += kg
        groups[gname]["amount"] += kg * rate

    # Sort groups alphabetically
    group_list = sorted(groups.values(), key=lambda x: x["groupName"])

    # Compute grand totals
    grand_totals = {
        "kg": sum(g["kg"] for g in group_list),
        "amount": sum(g["amount"] for g in group_list)
    }

    return {
        "groups": group_list,
        "grandTotals": grand_totals
    }


@router.post("/collections", response_model=CollectionResponse)
def save_silk_collection(
    data: SilkCollectionCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Saves a silk collection entry with manual payment inputs
    and performs reconciliation against ledger totals.
    
    Business Rules:
    - Computes total_entered = credit + cash + upi
    - Fetches ledger total for the date
    - Computes difference = total_entered - ledger_total
    - Sets status to MATCHED if |difference| <= 0.01, else MISMATCH
    """
    try:
        target_date = datetime.strptime(data.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Validate amounts
    if data.credit < 0 or data.cash < 0 or data.upi < 0:
        raise HTTPException(status_code=400, detail="Payment amounts cannot be negative")

    # Compute total entered
    total_entered = Decimal(str(data.credit)) + Decimal(str(data.cash)) + Decimal(str(data.upi))

    # Fetch ledger total for the date from regular transactions
    ledger_total = (
        db.query(func.sum(CollectionItem.qty_kg * CollectionItem.rate_per_kg))
        .filter(
            CollectionItem.vendor_id == user.vendor_id,
            CollectionItem.date == target_date
        )
        .scalar() or Decimal("0")
    )

    # Compute difference and status
    difference = total_entered - ledger_total
    status = CollectionStatus.MATCHED if abs(difference) <= Decimal("0.01") else CollectionStatus.MISMATCH

    # Check if an entry already exists for this date
    existing = (
        db.query(SilkCollection)
        .filter(
            SilkCollection.vendor_id == user.vendor_id,
            SilkCollection.date == target_date
        )
        .first()
    )

    if existing:
        # Update existing entry
        existing.credit_amount = Decimal(str(data.credit))
        existing.cash_amount = Decimal(str(data.cash))
        existing.upi_amount = Decimal(str(data.upi))
        existing.total_entered = total_entered
        existing.ledger_total = ledger_total
        existing.difference = difference
        existing.status = status
        existing.updated_at = func.now()
        
        db.commit()
        db.refresh(existing)
        
        collection = existing
        message = "Collection entry updated successfully"
    else:
        # Create new entry
        collection = SilkCollection(
            vendor_id=user.vendor_id,
            date=target_date,
            credit_amount=Decimal(str(data.credit)),
            cash_amount=Decimal(str(data.cash)),
            upi_amount=Decimal(str(data.upi)),
            total_entered=total_entered,
            ledger_total=ledger_total,
            difference=difference,
            status=status,
            created_by=user.id
        )
        
        db.add(collection)
        db.commit()
        db.refresh(collection)
        
        message = "Collection entry saved successfully"

    return {
        "id": collection.id,
        "date": collection.date.isoformat(),
        "credit_amount": float(collection.credit_amount),
        "cash_amount": float(collection.cash_amount),
        "upi_amount": float(collection.upi_amount),
        "total_entered": float(collection.total_entered),
        "ledger_total": float(collection.ledger_total),
        "difference": float(collection.difference),
        "status": collection.status.value,
        "message": message
    }


@router.post("/physical-digital-entries", response_model=SilkPhysicalDigitalResponse)
def save_silk_physical_digital_entry(
    data: SilkPhysicalDigitalEntryCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Saves a silk physical and digital collection entry.
    """
    try:
        target_date = datetime.strptime(data.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Validate amounts
    if data.physical_kg < 0 or data.physical_rate < 0 or data.digital_kg < 0 or data.digital_rate < 0:
        raise HTTPException(status_code=400, detail="Collection amounts cannot be negative")

    # Calculate derived values
    physical_amount = Decimal(str(data.physical_kg)) * Decimal(str(data.physical_rate))
    digital_amount = Decimal(str(data.digital_kg)) * Decimal(str(data.digital_rate))
    total_kg = Decimal(str(data.physical_kg)) + Decimal(str(data.digital_kg))
    total_amount = physical_amount + digital_amount

    # Check if an entry already exists for this date
    existing = (
        db.query(SilkPhysicalDigitalEntry)
        .filter(
            SilkPhysicalDigitalEntry.vendor_id == user.vendor_id,
            SilkPhysicalDigitalEntry.date == target_date
        )
        .first()
    )

    if existing:
        # Update existing entry
        existing.physical_kg = Decimal(str(data.physical_kg))
        existing.physical_rate = Decimal(str(data.physical_rate))
        existing.physical_amount = physical_amount
        existing.digital_kg = Decimal(str(data.digital_kg))
        existing.digital_rate = Decimal(str(data.digital_rate))
        existing.digital_amount = digital_amount
        existing.total_kg = total_kg
        existing.total_amount = total_amount
        existing.updated_at = func.now()
        
        db.commit()
        db.refresh(existing)
        
        entry = existing
        message = "Physical and digital collection entry updated successfully"
    else:
        # Create new entry
        entry = SilkPhysicalDigitalEntry(
            vendor_id=user.vendor_id,
            date=target_date,
            physical_kg=Decimal(str(data.physical_kg)),
            physical_rate=Decimal(str(data.physical_rate)),
            physical_amount=physical_amount,
            digital_kg=Decimal(str(data.digital_kg)),
            digital_rate=Decimal(str(data.digital_rate)),
            digital_amount=digital_amount,
            total_kg=total_kg,
            total_amount=total_amount,
            created_by=user.id
        )
        
        db.add(entry)
        db.commit()
        db.refresh(entry)
        
        message = "Physical and digital collection entry saved successfully"

    return {
        "id": entry.id,
        "date": entry.date.isoformat(),
        "physical_kg": float(entry.physical_kg),
        "physical_rate": float(entry.physical_rate),
        "physical_amount": float(entry.physical_amount),
        "digital_kg": float(entry.digital_kg),
        "digital_rate": float(entry.digital_rate),
        "digital_amount": float(entry.digital_amount),
        "total_kg": float(entry.total_kg),
        "total_amount": float(entry.total_amount),
        "message": message
    }


@router.get("/physical-digital-entries")
def list_silk_physical_digital_entries(
    from_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Fetches silk physical and digital collection history with optional date range filtering.
    """
    query = db.query(SilkPhysicalDigitalEntry).filter(
        SilkPhysicalDigitalEntry.vendor_id == user.vendor_id
    )

    if from_date:
        try:
            start = datetime.strptime(from_date, "%Y-%m-%d").date()
            query = query.filter(SilkPhysicalDigitalEntry.date >= start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid from_date format")

    if to_date:
        try:
            end = datetime.strptime(to_date, "%Y-%m-%d").date()
            query = query.filter(SilkPhysicalDigitalEntry.date <= end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid to_date format")

    entries = query.order_by(SilkPhysicalDigitalEntry.date.desc()).all()

    return [
        {
            "id": e.id,
            "date": e.date.isoformat(),
            "physical_kg": float(e.physical_kg),
            "physical_rate": float(e.physical_rate),
            "physical_amount": float(e.physical_amount),
            "digital_kg": float(e.digital_kg),
            "digital_rate": float(e.digital_rate),
            "digital_amount": float(e.digital_amount),
            "total_kg": float(e.total_kg),
            "total_amount": float(e.total_amount),
            "created_at": e.created_at.isoformat() if e.created_at else None
        }
        for e in entries
    ]



@router.get("/collections")
def list_silk_collections(
    from_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Fetches silk collection history with optional date range filtering.
    """
    query = db.query(SilkCollection).filter(
        SilkCollection.vendor_id == user.vendor_id
    )

    if from_date:
        try:
            start = datetime.strptime(from_date, "%Y-%m-%d").date()
            query = query.filter(SilkCollection.date >= start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid from_date format")

    if to_date:
        try:
            end = datetime.strptime(to_date, "%Y-%m-%d").date()
            query = query.filter(SilkCollection.date <= end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid to_date format")

    collections = query.order_by(SilkCollection.date.desc()).all()

    return [
        {
            "id": c.id,
            "date": c.date.isoformat(),
            "credit_amount": float(c.credit_amount),
            "cash_amount": float(c.cash_amount),
            "upi_amount": float(c.upi_amount),
            "total_entered": float(c.total_entered),
            "ledger_total": float(c.ledger_total),
            "difference": float(c.difference),
            "status": c.status.value,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in collections
    ]

    
@router.post("/sync-from-transactions")
def sync_silk_ledger_from_transactions(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Sync silk ledger entries from regular collection items.
    Creates silk ledger entries from collection items grouped by customer group.
    """
    try:
        # Get all collection items for the user's vendor for the last 30 days
        from datetime import timedelta
        thirty_days_ago = datetime.now().date() - timedelta(days=30)
        
        collection_items = db.query(CollectionItem).filter(
            CollectionItem.vendor_id == user.vendor_id,
            CollectionItem.date >= thirty_days_ago
        ).all()
        
        created_count = 0
        for item in collection_items:
            # Skip items without farmer_id or date
            if not item.farmer_id or not item.date:
                continue
                
            # Check if silk ledger entry already exists for this combination
            existing_silk = db.query(SilkLedgerEntry).filter(
                SilkLedgerEntry.vendor_id == user.vendor_id,
                SilkLedgerEntry.customer_id == item.farmer_id,
                SilkLedgerEntry.date == item.date,
                SilkLedgerEntry.kg == item.qty_kg,
                SilkLedgerEntry.rate == item.rate_per_kg
            ).first()
            
            if not existing_silk:
                silk_entry = SilkLedgerEntry(
                    vendor_id=user.vendor_id,
                    customer_id=item.farmer_id,
                    date=item.date,
                    qty=item.qty_kg,  # Using qty_kg as pieces for silk
                    kg=item.qty_kg,   # Using qty_kg as kg for silk
                    rate=item.rate_per_kg
                )
                db.add(silk_entry)
                created_count += 1
        
        db.commit()
        return {"message": f"Successfully synced {created_count} silk ledger entries from collection items", "created_count": created_count}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")
