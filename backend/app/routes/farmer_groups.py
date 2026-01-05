from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.db import get_db
from app.models.farmer_group import FarmerGroup
from app.models.farmer import Farmer
from app.schemas.farmer_group import FarmerGroupCreate, FarmerGroupUpdate
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/farmer-groups",
    tags=["Farmer Groups"]
)

# ---------- RBAC ----------
def require_admin(user):
    if user.role != "vendor_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

# ---------- CREATE ----------
@router.post("/", status_code=201)
def create_farmer_group(
    data: FarmerGroupCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    require_admin(user)

    # 🔒 Prevent duplicate group name per vendor
    exists = db.query(FarmerGroup).filter(
        FarmerGroup.vendor_id == user.vendor_id,
        FarmerGroup.name.ilike(data.name)
    ).first()

    if exists:
        raise HTTPException(
            status_code=400,
            detail="Group name already exists"
        )

    group = FarmerGroup(
        vendor_id=user.vendor_id,
        name=data.name,
        commission_percent=data.commission_percent
    )

    db.add(group)
    db.commit()
    db.refresh(group)

    return group

# ---------- READ (LIST) ----------
@router.get("/")
def list_farmer_groups(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    return db.query(FarmerGroup).filter(
        FarmerGroup.vendor_id == user.vendor_id
    ).all()

# ---------- READ (ONE) ----------
@router.get("/{group_id}")
def get_farmer_group(
    group_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    group = db.query(FarmerGroup).filter(
        FarmerGroup.id == group_id,
        FarmerGroup.vendor_id == user.vendor_id
    ).first()

    if not group:
        raise HTTPException(404, "Farmer group not found")

    return group

# ---------- UPDATE ----------
@router.put("/{group_id}")
def update_farmer_group(
    group_id: int,
    data: FarmerGroupUpdate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    require_admin(user)

    group = db.query(FarmerGroup).filter(
        FarmerGroup.id == group_id,
        FarmerGroup.vendor_id == user.vendor_id
    ).first()

    if not group:
        raise HTTPException(404, "Farmer group not found")

    # 🔒 Prevent duplicate name on update
    if data.name and data.name != group.name:
        exists = db.query(FarmerGroup).filter(
            FarmerGroup.vendor_id == user.vendor_id,
            FarmerGroup.name.ilike(data.name)
        ).first()

        if exists:
            raise HTTPException(400, "Group name already exists")

        group.name = data.name

    if data.commission_percent is not None:
        if not (0 <= data.commission_percent <= 100):
            raise HTTPException(400, "Invalid commission percent")
        group.commission_percent = data.commission_percent

    db.commit()
    db.refresh(group)

    return group

# ---------- DELETE (SAFE) ----------
@router.delete("/{group_id}")
def delete_farmer_group(
    group_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    require_admin(user)

    group = db.query(FarmerGroup).filter(
        FarmerGroup.id == group_id,
        FarmerGroup.vendor_id == user.vendor_id
    ).first()

    if not group:
        raise HTTPException(404, "Farmer group not found")

    # ❗ HARD RULE: cannot delete if farmers exist
    has_farmers = db.query(Farmer).filter(
        Farmer.group_id == group_id
    ).first()

    if has_farmers:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete group with farmers"
        )

    db.delete(group)
    db.commit()

    return {"message": "Farmer group deleted"}


# ---------- MEMBERS (for dropdown/search) ----------
@router.get("/{group_id}/farmers")
def list_group_farmers(
    group_id: int,
    q: str | None = None,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    query = db.query(Farmer).filter(
        Farmer.vendor_id == user.vendor_id,
        Farmer.group_id == group_id,
    )
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
