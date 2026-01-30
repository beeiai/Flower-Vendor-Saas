from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import date

from app.core.db import get_db
from app.dependencies import get_current_user
from app.models.collection import Collection
from app.models.collection_item import CollectionItem
from app.models.farmer import Farmer
from app.models.vehicle import Vehicle
from app.schemas.collection import CollectionItemCreate

router = APIRouter(
    prefix="/collections",
    tags=["Collections"]
)

# ---------- CREATE COLLECTION ITEMS (BULK) ----------
@router.post("/", status_code=201)
def create_collection_items(
    items: list[CollectionItemCreate],
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    if not items:
        raise HTTPException(400, "No collection items provided")

    created_items = []

    for item in items:
        # 🔒 Validate farmer
        farmer = db.query(Farmer).filter(
            Farmer.id == item.farmer_id,
            Farmer.vendor_id == user.vendor_id
        ).first()

        if not farmer:
            raise HTTPException(400, "Invalid farmer")

        # 🔒 Validate vehicle
        vehicle = db.query(Vehicle).filter(
            Vehicle.id == item.vehicle_id,
            Vehicle.vendor_id == user.vendor_id
        ).first()

        if not vehicle:
            raise HTTPException(400, "Invalid vehicle")

        # 🔢 SERVER-SIDE CALCULATIONS
        total_labour = item.qty_kg * item.labour_per_kg
        line_total = (
            item.qty_kg * item.rate_per_kg
            - total_labour
            - item.coolie_cost
            - item.transport_cost
        )

        if line_total < 0:
            raise HTTPException(400, "Invalid pricing values")

        collection_item = CollectionItem(
            vendor_id=user.vendor_id,
            farmer_id=farmer.id,
            group_id=farmer.group_id,
            vehicle_id=vehicle.id,
            date=item.date or date.today(),
            qty_kg=item.qty_kg,
            rate_per_kg=item.rate_per_kg,
            labour_per_kg=item.labour_per_kg,
            coolie_cost=item.coolie_cost,
            transport_cost=item.transport_cost,
            total_labour=total_labour,
            line_total=line_total,
            is_locked=False
        )

        db.add(collection_item)
        created_items.append(collection_item)

    db.commit()
    return created_items

@router.get("/")
def list_collections(
    from_date: date | None = None,
    to_date: date | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    # Hard cap to prevent accidental overload
    size = min(size, 1000)
    offset = (page - 1) * size
    
    # Use joinedload for related data to prevent N+1 queries
    q = db.query(CollectionItem)\
        .options(
            joinedload(CollectionItem.farmer),
            joinedload(CollectionItem.vehicle),
            joinedload(CollectionItem.group)
        )\
        .filter(CollectionItem.vendor_id == user.vendor_id)

    if from_date:
        q = q.filter(CollectionItem.date >= from_date)
    if to_date:
        q = q.filter(CollectionItem.date <= to_date)
    
    # Add pagination
    total = q.count()
    items = q.order_by(CollectionItem.date.desc()).offset(offset).limit(size).all()
    
    return {
        "items": items,
        "pagination": {
            "page": page,
            "size": size,
            "total": total,
            "pages": (total + size - 1) // size
        }
    }

@router.put("/{item_id}")
def update_collection_item(
    item_id: int,
    data: CollectionItemCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    item = db.query(CollectionItem).filter(
        CollectionItem.id == item_id,
        CollectionItem.vendor_id == user.vendor_id
    ).first()

    if not item:
        raise HTTPException(404, "Collection item not found")

    if item.is_locked:
        raise HTTPException(400, "Item is locked after settlement")

    # Recalculate server-side
    item.qty_kg = data.qty_kg
    item.rate_per_kg = data.rate_per_kg
    item.labour_per_kg = data.labour_per_kg
    item.coolie_cost = data.coolie_cost
    item.transport_cost = data.transport_cost

    item.total_labour = data.qty_kg * data.labour_per_kg
    item.line_total = (
        data.qty_kg * data.rate_per_kg
        - item.total_labour
        - data.coolie_cost
        - data.transport_cost
    )

    if item.line_total < 0:
        raise HTTPException(400, "Invalid pricing")

    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_collection_item(
    item_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    item = db.query(CollectionItem).filter(
        CollectionItem.id == item_id,
        CollectionItem.vendor_id == user.vendor_id
    ).first()

    if not item:
        raise HTTPException(404, "Item not found")

    if item.is_locked:
        raise HTTPException(400, "Cannot delete settled item")

    db.delete(item)
    db.commit()

    return {"message": "Collection item deleted"}
