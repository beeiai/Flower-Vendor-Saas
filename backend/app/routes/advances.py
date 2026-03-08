from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies import get_current_user
from app.models.farmer import Farmer
from app.models.advance import Advance


router = APIRouter(prefix="/customers", tags=["Advances"])


class AdvanceCreate(BaseModel):
    """Payload for creating an advance entry.

    Mirrors the legacy Node API shape so the existing frontend can
    continue sending { type, val, date, remarks }.
    """

    model_config = ConfigDict(extra="forbid")

    type: Literal["give", "deduct"]
    val: float = Field(..., gt=0)
    # Accepted for compatibility but we currently rely on created_at
    date: str | None = None
    remarks: str | None = ""


@router.get("/{farmer_id}/advances/")
def get_customer_advances(
    farmer_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Return advance summary + logs for a given customer.

    Response shape is compatible with the existing React AdvanceTracker:
    { given, deducted, balance, logs: [{ id, type, val, date, remarks }...] }.
    """

    farmer = (
        db.query(Farmer)
        .filter(Farmer.id == farmer_id, Farmer.vendor_id == user.vendor_id)
        .first()
    )
    if not farmer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    rows = (
        db.query(Advance)
        .filter(Advance.vendor_id == user.vendor_id, Advance.farmer_id == farmer_id)
        .order_by(Advance.created_at.asc())
        .all()
    )

    given = 0.0
    deducted = 0.0
    logs: list[dict] = []

    for a in rows:
        amt = float(a.amount or 0)
        if amt >= 0:
            given += amt
            direction = "give"
        else:
            deducted += -amt
            direction = "deduct"

        logs.append(
            {
                "id": a.id,
                "type": direction,
                "val": abs(amt),
                "date": a.created_at.isoformat() if getattr(a, "created_at", None) else None,
                "remarks": a.note or "",
            }
        )

    balance = given - deducted
    return {
        "given": given,
        "deducted": deducted,
        "balance": balance,
        "logs": logs,
    }


@router.post("/{farmer_id}/advances/", status_code=status.HTTP_201_CREATED)
def add_customer_advance(
    farmer_id: int,
    payload: AdvanceCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Create a new advance row for a customer.

    We encode direction using the sign of `amount` on the existing
    `advances` table so no schema changes are required:
    * type == "give"   -> amount = +val
    * type == "deduct" -> amount = -val
    """

    farmer = (
        db.query(Farmer)
        .filter(Farmer.id == farmer_id, Farmer.vendor_id == user.vendor_id)
        .first()
    )
    if not farmer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    amount = payload.val if payload.type == "give" else -payload.val

    adv = Advance(
        vendor_id=user.vendor_id,
        farmer_id=farmer_id,
        amount=amount,
        note=payload.remarks or "",
    )

    db.add(adv)
    db.commit()
    db.refresh(adv)

    return {
        "id": adv.id,
        "type": payload.type,
        "val": float(payload.val),
        "date": adv.created_at.isoformat() if getattr(adv, "created_at", None) else None,
        "remarks": adv.note or "",
    }
