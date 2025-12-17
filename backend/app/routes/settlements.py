from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Optional

from app.core.db import get_db
from app.core.dependencies import get_current_user
from app.services.settlement_service import calculate_settlement

router = APIRouter(
    prefix="/settlements",
    tags=["Settlements"]
)


@router.post("/generate")
def generate_settlement(
    farmer_id: int = Query(..., description="Farmer ID to generate settlement"),
    override_advance_deduction: Optional[float] = Query(
        None,
        description="Optional manual advance deduction amount"
    ),
    date_from: Optional[date] = Query(
        None,
        description="Start date (default: last 15 days)"
    ),
    date_to: Optional[date] = Query(
        None,
        description="End date (default: today)"
    ),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Generate settlement for a farmer within a date range.
    Default date range is last 15 days.
    Default advance deduction is 20% of gross (unless overridden).
    """

    # 📅 Default date logic
    if not date_to:
        date_to = date.today()

    if not date_from:
        date_from = date_to - timedelta(days=15)

    try:
        settlement = calculate_settlement(
            db=db,
            vendor_id=current_user.vendor_id,
            farmer_id=farmer_id,
            date_from=date_from,
            date_to=date_to,
            override_advance_deduction=override_advance_deduction
            user_id=current_user.id
        )

        return {
            "success": True,
            "settlement_id": settlement.id,
            "farmer_id": farmer_id,
            "date_from": date_from,
            "date_to": date_to,
            "net_payable": float(settlement.net_payable),
            "advance_deducted": float(settlement.advance_deducted),
            "commission": float(settlement.total_commission)
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Settlement failed: {str(e)}")
