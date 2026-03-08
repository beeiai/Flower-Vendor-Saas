from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.core.db import get_db
from app.models.vehicle import Vehicle
from app.dependencies import get_current_user
from app.schemas.vehicle import VehicleCreate, VehicleUpdate

router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"]
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
def create_vehicle(
    data: VehicleCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    require_admin(user)

    vehicle_number = (data.vehicle_number or "").strip()
    # Fallback: if only one field is provided, use it as the plate/number
    if not vehicle_number and data.vehicle_name:
        vehicle_number = data.vehicle_name.strip()

    if not vehicle_number:
        raise HTTPException(status_code=400, detail="Vehicle number is required")

    # 🔒 Prevent duplicate vehicle numbers per vendor
    exists = db.query(Vehicle).filter(
        Vehicle.vendor_id == user.vendor_id,
        Vehicle.vehicle_number == vehicle_number
    ).first()

    if exists:
        raise HTTPException(
            status_code=400,
            detail="Vehicle already exists"
        )

    vehicle = Vehicle(
        vendor_id=user.vendor_id,
        vehicle_number=vehicle_number,
        vehicle_name=data.vehicle_name
    )

    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    # Return enriched payload for UI
    desc = (vehicle.vehicle_name or vehicle.vehicle_number or "").strip()
    if vehicle.vehicle_name and vehicle.vehicle_number:
        desc = f"{vehicle.vehicle_name} / {vehicle.vehicle_number}"
    return {
        "id": vehicle.id,
        "name": vehicle.vehicle_name or vehicle.vehicle_number,  # frontend expects `name`
        "vehicle_number": vehicle.vehicle_number,
        "vehicle_name": vehicle.vehicle_name,
        "driver_name": getattr(vehicle, "driver_name", None),
        "description": desc,
        "vehicleDescription": desc,
    }

# ---------- READ (LIST) ----------
@router.get("/")
def list_vehicles(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    # Hard cap to prevent accidental overload
    size = min(size, 1000)
    offset = (page - 1) * size
    
    # Use joinedload if needed for related data
    query = db.query(Vehicle)\
        .filter(Vehicle.vendor_id == user.vendor_id)
    
    total = db.query(func.count(Vehicle.id))\
        .filter(Vehicle.vendor_id == user.vendor_id)\
        .scalar()
    
    rows = query.offset(offset).limit(size).all()
    def as_dict(v: Vehicle):
        desc = (v.vehicle_name or v.vehicle_number or "").strip()
        if v.vehicle_name and v.vehicle_number:
            desc = f"{v.vehicle_name} / {v.vehicle_number}"
        return {
            "id": v.id,
            "name": v.vehicle_name or v.vehicle_number,  # frontend expects `name`
            "vehicle_number": v.vehicle_number,
            "vehicle_name": v.vehicle_name,
            "driver_name": getattr(v, "driver_name", None),
            # Fields many UIs expect
            "description": desc,
            "vehicleDescription": desc,
        }
    
    items = [as_dict(v) for v in rows]
    
    return items

# ---------- READ (ONE) ----------
@router.get("/{vehicle_id}")
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.vendor_id == user.vendor_id
    ).first()

    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    return vehicle

# ---------- UPDATE ----------
@router.put("/{vehicle_id}")
def update_vehicle(
    vehicle_id: int,
    data: VehicleUpdate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    require_admin(user)

    vehicle = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.vendor_id == user.vendor_id
    ).first()

    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    # 🔒 Check duplicate vehicle number
    if data.vehicle_number and data.vehicle_number != vehicle.vehicle_number:
        new_number = data.vehicle_number.strip()
        if not new_number:
            raise HTTPException(400, "Vehicle number cannot be blank")
        exists = db.query(Vehicle).filter(
            Vehicle.vendor_id == user.vendor_id,
            Vehicle.vehicle_number == new_number
        ).first()

        if exists:
            raise HTTPException(400, "Vehicle number already in use")

        vehicle.vehicle_number = new_number

    if data.vehicle_name is not None:
        vehicle.vehicle_name = data.vehicle_name

    if data.driver_name is not None:
        vehicle.driver_name = data.driver_name

    db.commit()
    db.refresh(vehicle)

    desc = (vehicle.vehicle_name or vehicle.vehicle_number or "").strip()
    if vehicle.vehicle_name and vehicle.vehicle_number:
        desc = f"{vehicle.vehicle_name} / {vehicle.vehicle_number}"
    return {
        "id": vehicle.id,
        "name": vehicle.vehicle_name or vehicle.vehicle_number,  # frontend expects `name`
        "vehicle_number": vehicle.vehicle_number,
        "vehicle_name": vehicle.vehicle_name,
        "driver_name": getattr(vehicle, "driver_name", None),
        "description": desc,
        "vehicleDescription": desc,
    }

# ---------- DELETE (SAFE) ----------
@router.delete("/{vehicle_id}")
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    require_admin(user)

    vehicle = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.vendor_id == user.vendor_id
    ).first()

    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    # ❗ HARD RULE: cannot delete if used in collections
    if vehicle.collections:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete vehicle with transaction history"
        )

    db.delete(vehicle)
    db.commit()

    return {"message": "Vehicle deleted"}
