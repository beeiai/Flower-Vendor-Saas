from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

from app.core.db import get_db
from app.models.farmer import Farmer
from app.models.collection_item import CollectionItem
from app.models.farmer_group import FarmerGroup
from app.schemas.farmer import FarmerCreate, FarmerUpdate
from fastapi import Body
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/farmers",
    tags=["Farmers"]
)

# ---------- RBAC ----------
def require_admin(user):
    if user.role != "vendor_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

# ---------- Helpers ----------
def _generate_farmer_code(db: Session, vendor_id: int) -> str:
    """Generate a unique farmer_code within a vendor scope.

    Uses a simple sequential scheme: F{vendor}-{NNNN} and ensures uniqueness.
    """
    base = db.query(Farmer).filter(Farmer.vendor_id == vendor_id).count() + 1
    while True:
        code = f"F{vendor_id}-{base:04d}"
        exists = db.query(Farmer.id).filter(Farmer.farmer_code == code).first()
        if not exists:
            return code
        base += 1

# ---------- CREATE ----------
@router.post("/", status_code=201)
def create_farmer(
    data: FarmerCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    require_admin(user)

    # Resolve group by name within the vendor scope.
    group = (
        db.query(FarmerGroup)
        .filter(
            FarmerGroup.name == data.group_name,
            FarmerGroup.vendor_id == user.vendor_id,
        )
        .first()
    )

    if not group:
        raise HTTPException(status_code=400, detail="Farmer group not found")

    farmer = Farmer(
        vendor_id=user.vendor_id,
        group_id=group.id,
        farmer_code=_generate_farmer_code(db, user.vendor_id),
        name=data.name,
        phone=data.phone,
        address=data.address,
        commission_percent=10,
        advance_total=0,
    )

    db.add(farmer)
    db.commit()
    db.refresh(farmer)

    return farmer


# ---------- READ (LIST) ----------
@router.get("/")
def list_farmers(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    # Hard cap to prevent accidental overload
    size = min(size, 1000)
    offset = (page - 1) * size
    
    # Use joinedload to prevent N+1 queries
    query = db.query(Farmer)\
        .options(joinedload(Farmer.group))\
        .filter(Farmer.vendor_id == user.vendor_id)
    
    total = db.query(func.count(Farmer.id))\
        .filter(Farmer.vendor_id == user.vendor_id)\
        .scalar()
    
    rows = query.offset(offset).limit(size).all()

    def to_ui(f: Farmer):
        grp_name = f.group.name if f.group else None
        return {
            "id": f.id,
            "name": f.name,
            "group": grp_name,
            "groupName": grp_name,
            "contact": f.phone,
            "phone": f.phone,
            "address": f.address,
            "farmer_code": f.farmer_code,
            "code": f.farmer_code,
        }

    items = [to_ui(f) for f in rows]
    
    return items


# ---------- READ (SELECT UI: by group / search) ----------
@router.get("/by-group/")
def list_farmers_by_group(
    group_id: int | None = None,
    group_name: str | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    """Return farmers for a given group (by id or name), optionally filtered by q.

    The payload is shaped for dropdown/autocomplete components:
    [{ id, name, code, label, value, phone }].
    """
    # Hard cap to prevent accidental overload
    size = min(size, 1000)
    offset = (page - 1) * size
    query = db.query(Farmer)\
        .options(joinedload(Farmer.group))\
        .filter(Farmer.vendor_id == user.vendor_id)

    if group_id is None and group_name:
        grp = db.query(FarmerGroup.id).filter(
            FarmerGroup.vendor_id == user.vendor_id,
            FarmerGroup.name.ilike(group_name)
        ).first()
        if grp:
            group_id = grp.id if hasattr(grp, "id") else grp[0]

    if group_id is not None:
        query = query.filter(Farmer.group_id == group_id)

    if q:
        like = f"%{q}%"
        query = query.filter(or_(Farmer.name.ilike(like), Farmer.farmer_code.ilike(like)))

    total = query.count()
    rows = query.order_by(Farmer.name.asc()).offset(offset).limit(size).all()

    def to_select(f: Farmer):
        code = f.farmer_code or ""
        label = f"{code} - {f.name}".strip(" -")
        return {
            "id": f.id,
            "name": f.name,
            "group_name": f.group.name if f.group else None,
            "code": code,
            "farmer_code": code,
            "label": label,
            "value": f.id,
            "phone": f.phone,
            # Expose address so frontend can show it when a customer is selected.
            "address": f.address,
        }

    items = [to_select(f) for f in rows]
    
    return items


@router.get("/group/{group_id}/")
def list_farmers_group_path(
    group_id: int,
    q: str | None = None,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    return list_farmers_by_group(group_id=group_id, group_name=None, q=q, db=db, user=user)


# ---------- SELECT2-compatible search ----------
@router.get("/select2")
def select2(
    group_id: int | None = None,
    group_name: str | None = None,
    group: int | None = None,
    groupId: int | None = None,
    q: str | None = None,
    term: str | None = None,
    search: str | None = None,
    query: str | None = None,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    # Normalize incoming params from various UIs (Select2 often uses ?term=xxx)
    def _n(v):
        if v is None:
            return None
        if isinstance(v, str) and v.strip() == "":
            return None
        if v in ("undefined", "null"):
            return None
        return v

    q = _n(q)
    term = _n(term)
    search = _n(search)
    query = _n(query)
    group_id = _n(group_id)
    group_name = _n(group_name)
    group = _n(group)
    groupId = _n(groupId)

    if q is None:
        q = term
    if q is None:
        q = search
    if q is None:
        q = query
    if group_id is None:
        group_id = groupId if group_id is None else group_id
    if group_id is None:
        group_id = group

    # If no group is provided, return all farmers for vendor
    base = list_farmers_by_group(group_id=group_id, group_name=group_name, q=q, db=db, user=user)

    # Simple pagination on the Python side (data sets expected to be small per vendor)
    start = max(0, (page - 1) * per_page)
    end = start + per_page
    slice_ = base[start:end]
    return {
        "results": [{"id": f["id"], "text": f["label"], "code": f["code"], "name": f["name"]} for f in slice_],
        "pagination": {"more": end < len(base)},
    }


# ---------- Customers alias (some UIs use /customers) ----------
customers = APIRouter(prefix="/customers", tags=["Customers"]) 


@customers.get("/by-group/")
def customers_by_group(group_id: int | None = None, group_name: str | None = None, q: str | None = None, db: Session = Depends(get_db), user = Depends(get_current_user)):
    return list_farmers_by_group(group_id=group_id, group_name=group_name, q=q, db=db, user=user)


@customers.get("/group/{group_id}/")
def customers_group_path(group_id: int, q: str | None = None, db: Session = Depends(get_db), user = Depends(get_current_user)):
    return list_farmers_group_path(group_id=group_id, q=q, db=db, user=user)


@customers.get("/select2")
def customers_select2(
    group_id: int | None = None,
    group_name: str | None = None,
    group: int | None = None,
    groupId: int | None = None,
    q: str | None = None,
    term: str | None = None,
    search: str | None = None,
    query: str | None = None,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    return select2(
        group_id=group_id,
        group_name=group_name,
        group=group,
        groupId=groupId,
        q=q,
        term=term,
        search=search,
        query=query,
        page=page,
        per_page=per_page,
        db=db,
        user=user,
    )


# Root customers endpoint returning select list (no pagination) for UIs that call /customers with optional params
@customers.get("/")
def customers_root(
    group_id: int | None = None,
    group_name: str | None = None,
    group: int | None = None,
    groupId: int | None = None,
    q: str | None = None,
    term: str | None = None,
    search: str | None = None,
    query: str | None = None,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    return customers_select2(
        group_id=group_id,
        group_name=group_name,
        group=group,
        groupId=groupId,
        q=q,
        term=term,
        search=search,
        query=query,
        page=1,
        per_page=1000,
        db=db,
        user=user,
    )


# Compatibility create/delete endpoints so legacy /customers API continues to work
from pydantic import BaseModel, ConfigDict


class CustomerCompatCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    groupId: int | None = None
    contact: str | None = None
    address: str | None = None


@customers.post("/", status_code=201)
def create_customer_compat(
    payload: CustomerCompatCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Create a Farmer row from the simpler /customers payload.

    This keeps the existing React UI contract while persisting into the
    canonical farmers/farmer_groups tables.
    """

    # Resolve group by id within the vendor scope, if provided
    group = None
    if payload.groupId is not None:
        group = (
            db.query(FarmerGroup)
            .filter(
                FarmerGroup.id == payload.groupId,
                FarmerGroup.vendor_id == user.vendor_id,
            )
            .first()
        )
        if not group:
            raise HTTPException(status_code=400, detail="Farmer group not found")

    farmer = Farmer(
        vendor_id=user.vendor_id,
        group_id=group.id if group else None,
        farmer_code=_generate_farmer_code(db, user.vendor_id),
        name=payload.name,
        phone=payload.contact,
        address=payload.address,
        commission_percent=10,
        advance_total=0,
    )

    db.add(farmer)
    db.commit()
    db.refresh(farmer)

    # Shape matches list_farmers() output so frontend can reuse it
    grp_name = farmer.group.name if getattr(farmer, "group", None) else None
    return {
        "id": farmer.id,
        "name": farmer.name,
        "group": grp_name,
        "groupName": grp_name,
        "contact": farmer.phone,
        "address": farmer.address,
    }


@customers.delete("/{customer_id}/")
def delete_customer_compat(
    customer_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Delete a farmer via /customers/{id}/ compatibility endpoint."""

    farmer = db.query(Farmer).filter(
        Farmer.id == customer_id,
        Farmer.vendor_id == user.vendor_id,
    ).first()

    if not farmer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if farmer.collections:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete customer with transaction history",
        )

    db.delete(farmer)
    db.commit()

    return {"message": "Customer deleted"}

# ---------- READ (ONE) ----------
@router.get("/{farmer_id}")
def get_farmer(
    farmer_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    farmer = db.query(Farmer).filter(
        Farmer.id == farmer_id,
        Farmer.vendor_id == user.vendor_id
    ).first()

    if not farmer:
        raise HTTPException(404, "Farmer not found")

    return farmer

# ---------- UPDATE ----------
@router.put("/{farmer_id}")
def update_farmer(
    farmer_id: int,
    data: FarmerUpdate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    require_admin(user)

    farmer = db.query(Farmer).filter(
        Farmer.id == farmer_id,
        Farmer.vendor_id == user.vendor_id
    ).first()

    if not farmer:
        raise HTTPException(404, "Farmer not found")

    # 🔒 Validate group if updated
    if data.group_id:
        group = db.query(FarmerGroup).filter(
            FarmerGroup.id == data.group_id,
            FarmerGroup.vendor_id == user.vendor_id
        ).first()

        if not group:
            raise HTTPException(400, "Invalid farmer group")

        farmer.group_id = data.group_id

    # Safe field updates
    for field, value in data.dict(exclude_unset=True).items():
        setattr(farmer, field, value)

    db.commit()
    db.refresh(farmer)

    return farmer

# ---------- DELETE (SAFE) ----------
@router.delete("/{farmer_id}")
def delete_farmer(
    farmer_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    require_admin(user)

    farmer = db.query(Farmer).filter(
        Farmer.id == farmer_id,
        Farmer.vendor_id == user.vendor_id
    ).first()

    if not farmer:
        raise HTTPException(404, "Farmer not found")

    # ❗ HARD RULE: no delete if history exists
    if farmer.collections:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete farmer with transaction history"
        )

    db.delete(farmer)
    db.commit()

    return {"message": "Farmer deleted"}


# ---------- TRANSACTIONS (List & Replace - minimal) ----------
@router.get("/{farmer_id}/transactions/")
def list_transactions(
    farmer_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    # Return collection items mapped to frontend transaction shape
    rows = db.query(CollectionItem).filter(
        CollectionItem.farmer_id == farmer_id,
        CollectionItem.vendor_id == user.vendor_id
    ).all()

    def map_row(r):
        return {
            "id": r.id,
            "date": r.date.isoformat() if r.date else None,
            "vehicle": r.vehicle_name or r.vehicle_number or "",
            "itemCode": r.item_code or "",
            "itemName": r.item_name or "",
            "qty": float(r.qty_kg or 0),
            "rate": float(r.rate_per_kg or 0),
            "laguage": float(r.labour_per_kg or 0),
            "coolie": float(r.coolie_cost or 0),
            "paidAmt": float(r.paid_amount or 0),
            "remarks": r.remarks or "",
        }

    return [map_row(r) for r in rows]


@router.post("/{farmer_id}/transactions/", status_code=201)
def create_transaction(
    farmer_id: int,
    item: dict,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Create a single collection item for a farmer.
    """
    from logging import getLogger
    from datetime import datetime
    from app.models.vehicle import Vehicle

    logger = getLogger(__name__)

    # Validate farmer ownership
    farmer = db.query(Farmer).filter(
        Farmer.id == farmer_id,
        Farmer.vendor_id == user.vendor_id
    ).first()
    if not farmer:
        raise HTTPException(404, "Farmer not found")

    # Parse date
    date_str = item.get("date") or datetime.now().date().isoformat()
    try:
        item_date = datetime.fromisoformat(date_str).date()
    except:
        item_date = datetime.now().date()

    # Resolve vehicle by name (or create a placeholder if not found)
    vehicle_name = str(item.get("vehicle") or "").strip()
    vehicle = None
    if vehicle_name:
        vehicle = db.query(Vehicle).filter(
            Vehicle.vendor_id == user.vendor_id,
            Vehicle.vehicle_name == vehicle_name
        ).first()
        if not vehicle:
            # Try by vehicle_number as fallback
            vehicle = db.query(Vehicle).filter(
                Vehicle.vendor_id == user.vendor_id,
                Vehicle.vehicle_number == vehicle_name
            ).first()

    qty = float(item.get("qty") or 0)
    rate = float(item.get("rate") or 0)
    laguage = float(item.get("laguage") or 0)
    coolie = float(item.get("coolie") or 0)
    paid_amt = float(item.get("paidAmt") or 0)

    total_labour = qty * laguage
    line_total = (qty * rate) - total_labour - coolie

    collection_item = CollectionItem(
        vendor_id=user.vendor_id,
        collection_id=None,  # not using collection parent for now
        farmer_id=farmer_id,
        group_id=farmer.group_id,
        date=item_date,
        vehicle_number=vehicle.vehicle_number if vehicle else vehicle_name,
        vehicle_name=vehicle.vehicle_name if vehicle else vehicle_name,
        item_code=str(item.get("itemCode") or ""),
        item_name=str(item.get("itemName") or ""),
        qty_kg=qty,
        rate_per_kg=rate,
        labour_per_kg=laguage,
        coolie_cost=coolie,
        transport_cost=0,
        total_labour=total_labour,
        line_total=line_total,
        paid_amount=paid_amt,
        remarks=str(item.get("remarks") or ""),
    )
    db.add(collection_item)
    db.commit()
    db.refresh(collection_item)

    logger.info(
        "Transaction created: farmer_id=%s, vendor_id=%s",
        farmer_id,
        user.vendor_id,
    )

    # Return the same shape the frontend expects (so UI remains consistent)
    return {
        "id": collection_item.id,
        "date": collection_item.date.isoformat() if collection_item.date else None,
        "vehicle": collection_item.vehicle_name or collection_item.vehicle_number or "",
        "itemCode": collection_item.item_code or "",
        "itemName": collection_item.item_name or "",
        "qty": float(collection_item.qty_kg or 0),
        "rate": float(collection_item.rate_per_kg or 0),
        "laguage": float(collection_item.labour_per_kg or 0),
        "coolie": float(collection_item.coolie_cost or 0),
        "paidAmt": float(collection_item.paid_amount or 0),
        "remarks": collection_item.remarks or "",
    }


@router.put("/{farmer_id}/transactions/")
def replace_transactions(
    farmer_id: int,
    items: list[dict],
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Update collection items for a farmer. Only add new transactions without deleting existing ones.
    
    The frontend sends items with the Daily Transactions UI shape; we persist
    them as CollectionItem records.
    """
    from logging import getLogger
    from datetime import datetime
    from app.models.vehicle import Vehicle

    logger = getLogger(__name__)

    # Validate farmer ownership
    farmer = db.query(Farmer).filter(
        Farmer.id == farmer_id,
        Farmer.vendor_id == user.vendor_id
    ).first()
    if not farmer:
        raise HTTPException(404, "Farmer not found")

    # Create new collection items from the provided transactions (add to existing ones)
    created = []
    for item_data in items:
        # Parse date
        date_str = item_data.get("date") or datetime.now().date().isoformat()
        try:
            item_date = datetime.fromisoformat(date_str).date()
        except:
            item_date = datetime.now().date()

        # Resolve vehicle by name (or create a placeholder if not found)
        vehicle_name = str(item_data.get("vehicle") or "").strip()
        vehicle = None
        if vehicle_name:
            vehicle = db.query(Vehicle).filter(
                Vehicle.vendor_id == user.vendor_id,
                Vehicle.vehicle_name == vehicle_name
            ).first()
            if not vehicle:
                # Try by vehicle_number as fallback
                vehicle = db.query(Vehicle).filter(
                    Vehicle.vendor_id == user.vendor_id,
                    Vehicle.vehicle_number == vehicle_name
                ).first()

        qty = float(item_data.get("qty") or 0)
        rate = float(item_data.get("rate") or 0)
        laguage = float(item_data.get("laguage") or 0)
        coolie = float(item_data.get("coolie") or 0)
        paid_amt = float(item_data.get("paidAmt") or 0)

        total_labour = qty * laguage
        line_total = (qty * rate) - total_labour - coolie

        collection_item = CollectionItem(
            vendor_id=user.vendor_id,
            collection_id=None,  # not using collection parent for now
            farmer_id=farmer_id,
            group_id=farmer.group_id,
            date=item_date,
            vehicle_number=vehicle.vehicle_number if vehicle else vehicle_name,
            vehicle_name=vehicle.vehicle_name if vehicle else vehicle_name,
            item_code=str(item_data.get("itemCode") or ""),
            item_name=str(item_data.get("itemName") or ""),
            qty_kg=qty,
            rate_per_kg=rate,
            labour_per_kg=laguage,
            coolie_cost=coolie,
            transport_cost=0,
            total_labour=total_labour,
            line_total=line_total,
            paid_amount=paid_amt,
            remarks=str(item_data.get("remarks") or ""),
        )
        db.add(collection_item)
        created.append(collection_item)

    db.commit()
    for c in created:
        db.refresh(c)

    logger.info(
        "Transactions persisted: farmer_id=%s, vendor_id=%s, count=%s",
        farmer_id,
        user.vendor_id,
        len(created),
    )

    # Return the same shape the frontend expects (so UI remains consistent)
    return [
        {
            "id": c.id,
            "date": c.date.isoformat() if c.date else None,
            "vehicle": c.vehicle_name or c.vehicle_number or "",
            "itemCode": c.item_code or "",
            "itemName": c.item_name or "",
            "qty": float(c.qty_kg or 0),
            "rate": float(c.rate_per_kg or 0),
            "laguage": float(c.labour_per_kg or 0),
            "coolie": float(c.coolie_cost or 0),
            "paidAmt": float(c.paid_amount or 0),
            "remarks": c.remarks or "",
        }
        for c in created
    ]
