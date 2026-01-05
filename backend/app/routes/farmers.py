from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

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
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    rows = db.query(Farmer).filter(
        Farmer.vendor_id == user.vendor_id
    ).all()

    def to_ui(f: Farmer):
        grp_name = f.group.name if getattr(f, "group", None) else None
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

    return [to_ui(f) for f in rows]


# ---------- READ (SELECT UI: by group / search) ----------
@router.get("/by-group/")
def list_farmers_by_group(
    group_id: int | None = None,
    group_name: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
):
    """Return farmers for a given group (by id or name), optionally filtered by q.

    The payload is shaped for dropdown/autocomplete components:
    [{ id, name, code, label, value, phone }].
    """
    query = db.query(Farmer).filter(Farmer.vendor_id == user.vendor_id)

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

    rows = query.order_by(Farmer.name.asc()).all()

    def to_select(f: Farmer):
        code = f.farmer_code or ""
        label = f"{code} - {f.name}".strip(" -")
        return {
            "id": f.id,
            "name": f.name,
            "group_name": f.group.name if getattr(f, "group", None) else None,
            "code": code,
            "farmer_code": code,
            "label": label,
            "value": f.id,
            "phone": f.phone,
        }

    return [to_select(f) for f in rows]


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


@router.put("/{farmer_id}/transactions/")
def replace_transactions(
    farmer_id: int,
    items: list[dict],
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    # This is a lightweight replace: echo back received items.
    # Full persistence requires collection creation and validation; implement as needed later.
    from logging import getLogger

    logger = getLogger(__name__)
    logger.info(
        "Transactions replace requested: farmer_id=%s, vendor_id=%s, items=%s",
        farmer_id,
        getattr(user, "vendor_id", None),
        len(items),
    )
    return items
