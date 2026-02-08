from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Optional

from app.core.db import get_db
from app.dependencies import get_current_user
from app.models.collection_item import CollectionItem
from app.models.farmer import Farmer
from app.models.farmer_group import FarmerGroup
from app.services.docx_report_service import DocxReportService


router = APIRouter(
    prefix="/print-docx",
    tags=["DOCX Print Templates"]
)


@router.get("/ledger-report")
def get_ledger_report_docx(
    farmer_id: int = Query(..., description="Farmer ID"),
    from_date: date = Query(..., description="Start date"),
    to_date: date = Query(..., description="End date"),
    commission_pct: float = Query(12.0, description="Commission percentage"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Generate DOCX ledger report for a specific farmer and return as downloadable file
    """
    try:
        # Fetch farmer details
        farmer = db.query(Farmer).filter(
            Farmer.id == farmer_id,
            Farmer.vendor_id == user.vendor_id
        ).first()
        
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")
        
        # Fetch group name
        group = db.query(FarmerGroup).filter(FarmerGroup.id == farmer.group_id).first()
        group_name = group.name if group else "N/A"
        
        # Fetch collection items for the date range
        items = db.query(CollectionItem).filter(
            CollectionItem.farmer_id == farmer_id,
            CollectionItem.date >= from_date,
            CollectionItem.date <= to_date,
            CollectionItem.vendor_id == user.vendor_id
        ).all()
        
        # Transform data for template
        rows = []
        total_qty = 0
        total_amount = 0
        total_luggage = 0
        total_paid = 0
        
        for item in items:
            qty = float(item.qty_kg or 0)
            rate = float(item.rate_per_kg or 0)
            luggage = float(item.transport_cost or 0)
            paid = float(item.paid_amount or 0)
            total = qty * rate
            
            rows.append({
                "date": item.date.strftime("%d-%m-%Y"),
                "qty": f"{qty:.2f}",
                "price": f"{rate:.2f}",
                "total": f"{total:.2f}",
                "luggage": f"{luggage:.2f}",
                "paid_amount": f"{paid:.2f}",
                "amount": f"{(total + luggage - paid):.2f}"
            })
            
            total_qty += qty
            total_amount += total
            total_luggage += luggage
            total_paid += paid
        
        # Calculate summary
        commission_rate = commission_pct / 100
        commission = total_amount * commission_rate
        net_amount = total_amount - commission
        final_total = net_amount + total_luggage - total_paid
        
        # Generate and return DOCX report
        return DocxReportService.generate_ledger_pdf(
            farmer_name=farmer.name,
            ledger_name=farmer.farmer_code or "N/A",
            address=farmer.address or "N/A",
            group_name=group_name,
            balance=final_total,
            commission_pct=commission_pct,
            from_date=from_date.strftime("%d-%m-%Y"),
            to_date=to_date.strftime("%d-%m-%Y"),
            rows=rows,
            total_qty=total_qty,
            total_amount=total_amount,
            commission=commission,
            luggage_total=total_luggage,
            coolie=0.0,
            net_amount=net_amount,
            paid_amount=total_paid,
            final_total=final_total,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/group-patti-report")
def get_group_patti_report_docx(
    group_id: int = Query(..., description="Group ID"),
    from_date: date = Query(..., description="Start date"),
    to_date: date = Query(..., description="End date"),
    commission_pct: float = Query(12.0, description="Commission percentage"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Generate DOCX group patti report and return as downloadable file
    """
    try:
        # Fetch group details
        group = db.query(FarmerGroup).filter(
            FarmerGroup.id == group_id,
            FarmerGroup.vendor_id == user.vendor_id
        ).first()
        
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Fetch all farmers in the group
        farmers = db.query(Farmer).filter(
            Farmer.group_id == group_id,
            Farmer.vendor_id == user.vendor_id
        ).all()
        
        if not farmers:
            raise HTTPException(status_code=404, detail="No farmers found in group")
        
        # Fetch all collection items for all farmers in one query
        farmer_ids = [f.id for f in farmers]
        all_items = db.query(CollectionItem).filter(
            CollectionItem.farmer_id.in_(farmer_ids),
            CollectionItem.date >= from_date,
            CollectionItem.date <= to_date,
            CollectionItem.vendor_id == user.vendor_id
        ).all()
        
        # Group items by farmer_id for faster lookup
        items_by_farmer = {}
        for item in all_items:
            if item.farmer_id not in items_by_farmer:
                items_by_farmer[item.farmer_id] = []
            items_by_farmer[item.farmer_id].append(item)
        
        # Calculate report for each farmer
        rows = []
        totals = {
            'gross': 0,
            'commission': 0,
            'net': 0,
            'paid': 0,
            'balance': 0
        }
        
        # Create a lookup dict for farmer details
        farmer_lookup = {f.id: f for f in farmers}
        
        for farmer in farmers:
            # Get items for this farmer
            items = items_by_farmer.get(farmer.id, [])
            
            # Calculate totals for this farmer
            farmer_gross = 0
            farmer_paid = 0
            farmer_luggage = 0
            
            for item in items:
                qty = float(item.qty_kg or 0)
                rate = float(item.rate_per_kg or 0)
                paid = float(item.paid_amount or 0)
                luggage = float(item.transport_cost or 0)
                
                farmer_gross += qty * rate
                farmer_paid += paid
                farmer_luggage += luggage
            
            # Calculate commission and net
            farmer_commission = farmer_gross * (commission_pct / 100)
            farmer_net = farmer_gross - farmer_commission
            farmer_balance = farmer_net + farmer_luggage - farmer_paid
            
            # Add to report rows
            rows.append({
                'customer_name': farmer.name,
                'gross': f"{farmer_gross:.2f}",
                'commission': f"{farmer_commission:.2f}",
                'net': f"{farmer_net:.2f}",
                'paid': f"{farmer_paid:.2f}",
                'balance': f"{farmer_balance:.2f}"
            })
            
            # Add to group totals
            totals['gross'] += farmer_gross
            totals['commission'] += farmer_commission
            totals['net'] += farmer_net
            totals['paid'] += farmer_paid
            totals['balance'] += farmer_balance
        
        # Generate and return DOCX report
        return DocxReportService.generate_group_patti_pdf(
            group_name=group.name,
            from_date=from_date.strftime("%d-%m-%Y"),
            to_date=to_date.strftime("%d-%m-%Y"),
            commission_pct=commission_pct,
            rows=rows,
            totals=totals,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate group patti report: {str(e)}")


# Additional endpoints can be added here for other report types
# - group-total-report
# - daily-sales-report
# etc.