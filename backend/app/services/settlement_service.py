from datetime import date
from sqlalchemy.orm import Session

from app.models.collection_item import CollectionItem
from app.models.settlement import Settlement
from app.models.settlement_item import SettlementItem
from app.models.farmer import Farmer
from app.models.advance import Advance
from app.models.vendor import Vendor

from app.utils.serializer import serialize_model
from app.services.sms_service import send_sms
from app.services.sms_templates import settlement_template, get_settlement_dlt_variables
from app.services.pdf_service import generate_settlement_pdf


DEFAULT_ADVANCE_DEDUCTION_PERCENT = 20  # client requirement


def calculate_settlement(
    db: Session,
    vendor_id: int,
    farmer_id: int,
    date_from: date,
    date_to: date,
    override_advance_percent: float | None = None,
    user_id: int | None = None,
):
    """
    Generates settlement for a farmer within a date range.
    """

    # -------------------------------------------------
    # 1️⃣ Fetch farmer
    # -------------------------------------------------
    farmer = (
        db.query(Farmer)
        .filter(Farmer.id == farmer_id, Farmer.vendor_id == vendor_id)
        .first()
    )

    if not farmer:
        raise ValueError("Farmer not found")

    before_farmer = serialize_model(farmer)

    # -------------------------------------------------
    # 2️⃣ Fetch vendor
    # -------------------------------------------------
    vendor = (
        db.query(Vendor)
        .filter(Vendor.id == vendor_id)
        .first()
    )

    if not vendor:
        raise ValueError("Vendor not found")

    # -------------------------------------------------
    # 3️⃣ Fetch collection items
    # -------------------------------------------------
    items = (
        db.query(CollectionItem)
        .filter(
            CollectionItem.vendor_id == vendor_id,
            CollectionItem.farmer_id == farmer_id,
            CollectionItem.date >= date_from,
            CollectionItem.date <= date_to,
        )
        .all()
    )

    if not items:
        raise ValueError("No collection data found for given period")

    # -------------------------------------------------
    # 4️⃣ Totals
    # -------------------------------------------------
    total_qty = sum(i.qty_kg for i in items)
    total_amount = sum(i.line_total for i in items)

    total_labour = sum(i.total_labour or 0 for i in items)
    total_coolie = sum(i.coolie_cost or 0 for i in items)
    total_transport = sum(i.transport_cost or 0 for i in items)

    # -------------------------------------------------
    # 5️⃣ Commission logic
    # -------------------------------------------------
    if farmer.commission_percent is not None:
        commission_percent = farmer.commission_percent
    elif farmer.group and farmer.group.commission_percent is not None:
        commission_percent = farmer.group.commission_percent
    else:
        commission_percent = 0

    total_commission = (total_amount * commission_percent) / 100

    # -------------------------------------------------
    # 6️⃣ Advance deduction logic (PERCENT-BASED)
    # -------------------------------------------------
    deduction_percent = (
        override_advance_percent
        if override_advance_percent is not None
        else DEFAULT_ADVANCE_DEDUCTION_PERCENT
    )

    advance_balance = farmer.advance_total or 0
    max_deductible = (total_amount * deduction_percent) / 100
    advance_deducted = min(advance_balance, max_deductible)

    # -------------------------------------------------
    # 7️⃣ Net payable
    # -------------------------------------------------
    net_payable = (
        total_amount
        - total_commission
        - total_labour
        - total_coolie
        - total_transport
        - advance_deducted
    )

    # -------------------------------------------------
    # 8️⃣ Create settlement
    # -------------------------------------------------
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
        net_payable=net_payable,
    )

    db.add(settlement)
    db.flush()  # get settlement.id

    # -------------------------------------------------
    # 9️⃣ Settlement items
    # -------------------------------------------------
    for item in items:
        db.add(
            SettlementItem(
                settlement_id=settlement.id,
                collection_item_id=item.id,
                line_total=item.line_total,
            )
        )

    # -------------------------------------------------
    # 🔟 Advance ledger update
    # -------------------------------------------------
    if advance_deducted > 0:
        db.add(
            Advance(
                vendor_id=vendor_id,
                farmer_id=farmer_id,
                amount=-advance_deducted,
                note=f"Advance adjusted in settlement {date_from} to {date_to}",
            )
        )
        farmer.advance_total -= advance_deducted

    # -------------------------------------------------
    # 1️⃣1️⃣ PDF generation
    # -------------------------------------------------
    pdf_url = generate_settlement_pdf(
        settlement=settlement,
        farmer=farmer,
        vendor=vendor,
        settlement_items=items,
    )

    settlement.pdf_url = pdf_url

    # -------------------------------------------------
    # 1️⃣2️⃣ Commit transaction
    # -------------------------------------------------
    db.commit()
    db.refresh(settlement)

    # -------------------------------------------------
    # 1️⃣3️⃣ SMS notification
    # -------------------------------------------------
    # Prepare DLT template variables
    dlt_variables = get_settlement_dlt_variables(
        farmer_name=farmer.name,
        date_from=str(date_from),
        date_to=str(date_to),
        net_payable=float(net_payable),
        advance_deducted=float(advance_deducted),
    )

    # For DLT compliance, message parameter can be ignored when using template_variables
    # The actual template is configured in environment variables
    send_sms(
        db=db,
        vendor_id=vendor_id,
        farmer_id=farmer.id,
        phone=farmer.phone,
        message="settlement",  # This will be ignored in DLT mode
        sms_type="settlement",
        template_variables=dlt_variables,
    )

    return settlement
