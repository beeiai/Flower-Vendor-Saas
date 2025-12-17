from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date

from app.models.collection_item import CollectionItem
from app.models.settlement import Settlement
from app.models.settlement_item import SettlementItem
from app.models.farmer import Farmer
from app.models.advance import Advance
from app.services.audit_service import log_audit
from app.utils.serializer import serialize_model
from backend.app.models import farmer, vendor
from app.services.sms_service import send_sms
from app.services.sms_templates import settlement_template
from app.services.pdf_service import generate_settlement_pdf
from backend.app.models import settlement_item



before_farmer = serialize_model(farmer)

def calculate_settlement(
    db: Session,
    vendor_id: int,
    farmer_id: int,
    date_from: date,
    date_to: date,
    override_advance_deduction=None,
    user_id: int | None = None
):
    # 1️⃣ Fetch collection items
    items = db.query(CollectionItem).filter(
        CollectionItem.vendor_id == vendor_id,
        CollectionItem.farmer_id == farmer_id,
        CollectionItem.date >= date_from,
        CollectionItem.date <= date_to
    ).all()

    if not items:
        raise ValueError("No collection data found for given period")

    # 2️⃣ Totals
    total_qty = sum(item.qty_kg for item in items)
    total_amount = sum(item.line_total for item in items)

    total_labour = sum(item.total_labour or 0 for item in items)
    total_coolie = sum(item.coolie_cost or 0 for item in items)
    total_transport = sum(item.transport_cost or 0 for item in items)

    # 3️⃣ Commission logic
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()

    if farmer.commission_percent is not None:
        commission_percent = farmer.commission_percent
    elif farmer.group and farmer.group.commission_percent is not None:
        commission_percent = farmer.group.commission_percent
    else:
        commission_percent = 0

    total_commission = (total_amount * commission_percent) / 100

    # 4️⃣ Advance deduction
    DEFAULT_ADVANCE_DEDUCTION_PERCENT = 20

    advance_balance = farmer.advance_total or 0
    max_deductible = (total_amount * DEFAULT_ADVANCE_DEDUCTION_PERCENT) / 100

    advance_deducted = min(advance_balance, max_deductible)

    # 5️⃣ Net payable
    net_payable = (
        total_amount
        - total_commission
        - total_labour
        - total_coolie
        - total_transport
        - advance_deducted
    )

    # 6️⃣ Create settlement record
    settlement = Settlement(
        vendor_id=vendor_id,
        farmer_id=farmer_id,
        date_from=date_from,
        date_to=date_to,
        total_qty=total_qty,
        total_amount=total_amount,
        total_labour=total_labour,
        total_coolie=total_coolie,
        total_transport=total_transport,
        commission_percent=commission_percent,
        total_commission=total_commission,
        advance_deducted=advance_deducted,
        net_payable=net_payable
    )
    

    db.add(settlement)
    db.flush()  # get settlement.id

    # 7️⃣ Link settlement items
    for item in items:
        db.add(
            SettlementItem(
                settlement_id=settlement.id,
                collection_item_id=item.id,
                line_total=item.line_total
            )
        )

    # 8️⃣ Update advance ledger
    if advance_deducted > 0:
        db.add(
            Advance(
                vendor_id=vendor_id,
                farmer_id=farmer_id,
                amount=-advance_deducted,
                note=f"Deducted in settlement {date_from} to {date_to}"
            )
        )
        farmer.advance_total -= advance_deducted
        
    pdf_url = generate_settlement_pdf(
        settlement=settlement,
        farmer=farmer,
        vendor=vendor,
        settlement_items=settlement_item
    )

    settlement.pdf_url = pdf_url

    db.commit()
    db.refresh(settlement)
    
    # 🧾 Audit: Settlement created
    log_audit(
        db=db,
        vendor_id=vendor_id,
        user_id=None,  # will add later from route
        table_name="settlements",
        record_id=settlement.id,
        action="INSERT",
        before_data=None,
        after_data=serialize_model(settlement)
    )

    # 🧾 Audit: Farmer advance updated
    log_audit(
        db=db,
        vendor_id=vendor_id,
        user_id=None,
        table_name="farmers",
        record_id=farmer.id,
        action="UPDATE",
        before_data=before_farmer,
        after_data=serialize_model(farmer)
    )
    
    # 📩 Send settlement SMS
    message = settlement_template(
        farmer_name=farmer.name,
        date_from=str(date_from),
        date_to=str(date_to),
        net_payable=float(net_payable),
        advance_deducted=float(advance_deducted)
    )

    send_sms(
        db=db,
        vendor_id=vendor_id,
        farmer_id=farmer.id,
        phone=farmer.phone,
        message=message,
        sms_type="settlement"
    )


    return settlement
