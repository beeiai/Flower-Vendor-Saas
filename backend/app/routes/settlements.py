from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date

from app.core.db import get_db
from app.dependencies import get_current_user
from app.models.settlement import Settlement
from app.models.settlement_item import SettlementItem
from app.models.collection_item import CollectionItem
from app.models.farmer import Farmer
from app.schemas.settlement import SettlementCreate

router = APIRouter(
    prefix="/settlements",
    tags=["Settlements"]
)

# ---------- RBAC ----------
def require_admin(user):
    if user.role != "vendor_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

# ---------- CREATE SETTLEMENT ----------
@router.post("/", status_code=201)
def generate_settlement(
    data: SettlementCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    require_admin(user)

    # 🔒 Validate farmer
    farmer = db.query(Farmer).filter(
        Farmer.id == data.farmer_id,
        Farmer.vendor_id == user.vendor_id
    ).first()

    if not farmer:
        raise HTTPException(400, "Invalid farmer")

    # 🔒 Fetch unsettled collection items
    items = db.query(CollectionItem).filter(
        CollectionItem.vendor_id == user.vendor_id,
        CollectionItem.farmer_id == farmer.id,
        CollectionItem.date.between(data.date_from, data.date_to),
        CollectionItem.is_locked == False
    ).all()

    if not items:
        raise HTTPException(
            status_code=400,
            detail="No unsettled collections found"
        )

    # ---------- FINANCIAL CALCULATIONS ----------
    gross_amount = sum(i.qty_kg * i.rate_per_kg for i in items)
    total_labour = sum(i.total_labour for i in items)
    total_coolie = sum(i.coolie_cost for i in items)
    total_transport = sum(i.transport_cost for i in items)

    net_before_commission = (
        gross_amount
        - total_labour
        - total_coolie
        - total_transport
    )

    commission_percent = (
        farmer.commission_percent
        if farmer.commission_percent is not None
        else farmer.group.commission_percent
    )

    commission_amount = net_before_commission * (commission_percent / 100)

    net_after_commission = net_before_commission - commission_amount

    # ---------- ADVANCE DEDUCTION ----------
    max_advance_allowed = net_after_commission * (
        data.advance_deduction_percent / 100
    )

    advance_deducted = min(farmer.advance_total, max_advance_allowed)

    net_payable = net_after_commission - advance_deducted

    if net_payable < 0:
        raise HTTPException(400, "Invalid settlement calculation")

    # ---------- ATOMIC TRANSACTION ----------
    settlement = Settlement(
        vendor_id=user.vendor_id,
        farmer_id=farmer.id,
        date_from=data.date_from,
        date_to=data.date_to,
        gross_amount=gross_amount,
        total_labour=total_labour,
        total_coolie=total_coolie,
        total_transport=total_transport,
        commission_percent=commission_percent,
        commission_amount=commission_amount,
        advance_deducted=advance_deducted,
        net_payable=net_payable
    )

    db.add(settlement)
    db.flush()  # get settlement.id

    # Link & lock collection items
    for item in items:
        db.add(SettlementItem(
            settlement_id=settlement.id,
            collection_item_id=item.id
        ))
        item.is_locked = True

    # Reduce farmer advance
    farmer.advance_total -= advance_deducted

    db.commit()
    db.refresh(settlement)

    return settlement

@router.post("/{settlement_id}/void")
def void_settlement(
    settlement_id: int,
    reason: str,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    require_admin(user)

    settlement = db.query(Settlement).filter(
        Settlement.id == settlement_id,
        Settlement.vendor_id == user.vendor_id,
        Settlement.status == "ACTIVE"
    ).first()

    if not settlement:
        raise HTTPException(404, "Active settlement not found")

    # Restore farmer advance
    farmer = settlement.farmer
    farmer.advance_total += settlement.advance_deducted

    # Unlock collection items
    for item in settlement.items:
        item.is_locked = False

    # Mark settlement voided
    settlement.status = "VOIDED"
    settlement.voided_at = datetime.utcnow()
    settlement.void_reason = reason

    db.commit()

    return {"message": "Settlement voided successfully"}

@router.post("/recalculate", status_code=200)
def recalculate_settlement(
    data: SettlementCreate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    require_admin(user)

    farmer = db.query(Farmer).filter(
        Farmer.id == data.farmer_id,
        Farmer.vendor_id == user.vendor_id
    ).first()

    if not farmer:
        raise HTTPException(400, "Invalid farmer")

    # Fetch or create settlement
    settlement = db.query(Settlement).filter(
        Settlement.vendor_id == user.vendor_id,
        Settlement.farmer_id == farmer.id,
        Settlement.date_from == data.date_from,
        Settlement.date_to == data.date_to
    ).first()

    # 🔁 Restore advance if settlement already existed
    if settlement:
        farmer.advance_total += settlement.advance_deducted
    else:
        settlement = Settlement(
            vendor_id=user.vendor_id,
            farmer_id=farmer.id,
            date_from=data.date_from,
            date_to=data.date_to
        )
        db.add(settlement)
        db.flush()

    # Recalculate from collections
    items = db.query(CollectionItem).filter(
        CollectionItem.vendor_id == user.vendor_id,
        CollectionItem.farmer_id == farmer.id,
        CollectionItem.date.between(data.date_from, data.date_to)
    ).all()

    if not items:
        raise HTTPException(400, "No collections found")

    gross = sum(i.qty_kg * i.rate_per_kg for i in items)
    labour = sum(i.total_labour for i in items)
    coolie = sum(i.coolie_cost for i in items)
    transport = sum(i.transport_cost for i in items)

    net = gross - labour - coolie - transport

    commission_percent = (
        farmer.commission_percent
        if farmer.commission_percent is not None
        else farmer.group.commission_percent
    )

    commission = net * (commission_percent / 100)
    net_after_commission = net - commission

    advance_deducted = min(
        farmer.advance_total,
        net_after_commission * (data.advance_deduction_percent / 100)
    )

    settlement.gross_amount = gross
    settlement.total_labour = labour
    settlement.total_coolie = coolie
    settlement.total_transport = transport
    settlement.commission_percent = commission_percent
    settlement.commission_amount = commission
    settlement.advance_deducted = advance_deducted
    settlement.net_payable = net_after_commission - advance_deducted

    farmer.advance_total -= advance_deducted

    db.commit()
    return settlement
