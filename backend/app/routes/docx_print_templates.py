from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import date
from typing import Optional
from pathlib import Path
import os

from app.core.db import get_db
from app.dependencies import get_current_user
from app.models.collection_item import CollectionItem
from app.models.farmer import Farmer
from app.models.farmer_group import FarmerGroup
from app.routes.reports import render_template  # Use shared render_template function


router = APIRouter(
    prefix="/print-docx",
    tags=["DOCX Print Templates"]
)


# PDF Preview Endpoints
@router.get("/ledger-report-preview/")
def get_ledger_report_pdf(
    farmer_id: int = Query(..., description="Farmer ID"),
    from_date: date = Query(..., description="Start date"),
    to_date: date = Query(..., description="End date"),
    commission_pct: float = Query(12.0, description="Commission percentage"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    LEGACY ENDPOINT - Redirects to new HTML-based report system
    Generate PDF preview of ledger report for a specific farmer
    
    Note: This endpoint now uses the new HTML template system instead of DOCX.
    Use /api/reports/ledger/{farmer_id}?format=html for future integrations.
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
        
        # Fetch collection items for the date range with vehicle relationship
        items = db.query(CollectionItem).options(joinedload(CollectionItem.vehicle)).filter(
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
                "date": item.date.strftime("%d-%m-%Y") if item.date else "N/A",
                "vehicle": getattr(item, 'vehicle', 'N/A') if hasattr(item, 'vehicle') else "N/A",
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
        
        # Transform rows to match template structure
        transformed_rows = []
        for item in items:  # Use the original items to get date and vehicle
            qty = float(item.qty_kg or 0)
            rate = float(item.rate_per_kg or 0)
            luggage = float(item.transport_cost or 0)
            coolie = float(item.coolie_cost or 0)  # Add coolie from item
            paid = float(item.paid_amount or 0)
            total = qty * rate
            
            # Commission calculation per row
            row_commission = total * commission_rate
            row_net = total - row_commission
            row_balance = row_net - paid - luggage - coolie
            
            # Get vehicle information
            vehicle_info = "N/A"
            if hasattr(item, 'vehicle') and item.vehicle:
                vehicle_info = item.vehicle.vehicle_number or item.vehicle.vehicle_name or "N/A"
            elif hasattr(item, 'vehicle_number') and item.vehicle_number:
                vehicle_info = item.vehicle_number
            elif hasattr(item, 'vehicle_name') and item.vehicle_name:
                vehicle_info = item.vehicle_name
            
            transformed_rows.append({
                "date": item.date.strftime("%d-%m-%Y") if item.date else "N/A",
                "vehicle": vehicle_info,
                "item_code": item.item_code or "N/A",
                "product_name": item.item_name or "N/A",
                "customer": farmer.name,
                "address": farmer.address or "N/A",
                "qty": f"{qty:.2f}",
                "rate": f"{rate:.2f}",
                "luggage": f"{luggage:.2f}",
                "coolie": f"{coolie:.2f}",
                "paid": f"{paid:.2f}",
                "gross": f"{total:.2f}",
                "commission": f"{row_commission:.2f}",
                "net": f"{row_net:.2f}",
                "balance": f"{row_balance:.2f}"
            })
        
        # Prepare template data
        template_data = {
            "rows": transformed_rows,
            "totals": {
                "gross_total": f"{total_amount:.2f}",
                "commission_total": f"{commission:.2f}",
                "net_total": f"{net_amount:.2f}",
                "paid_total": f"{total_paid:.2f}",
                "balance_total": f"{final_total:.2f}",
                "luggage_total": f"{total_luggage:.2f}",
                "coolie_total": "0.00"  # Would need to be calculated if needed
            },
            "group_name": group_name,
            "commission_pct": commission_pct,
            "from_date": from_date.strftime("%d-%m-%Y"),
            "to_date": to_date.strftime("%d-%m-%Y"),
            "current_date": __import__('datetime').datetime.now().strftime("%d-%m-%Y"),
            "generated_at": __import__('datetime').datetime.now().isoformat()
        }
        
        # Use shared render_template function (handles logo and no print button)
        html_content = render_template("ledger_report.html", template_data)
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/ledger-report/")
def get_ledger_report_docx(
    farmer_id: int = Query(..., description="Farmer ID"),
    from_date: date = Query(..., description="Start date"),
    to_date: date = Query(..., description="End date"),
    commission_pct: float = Query(12.0, description="Commission percentage"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    LEGACY ENDPOINT - Redirects to new HTML-based report system
    Generate ledger report for a specific farmer and return as HTML (viewable/printable)
    
    Note: This endpoint now uses the new HTML template system instead of DOCX.
    Use /api/reports/ledger/{farmer_id}?format=html for future integrations.
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
        
        # Fetch collection items for the date range with vehicle relationship
        items = db.query(CollectionItem).options(joinedload(CollectionItem.vehicle)).filter(
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
                "date": item.date.strftime("%d-%m-%Y") if item.date else "N/A",
                "vehicle": getattr(item, 'vehicle', 'N/A') if hasattr(item, 'vehicle') else "N/A",
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
        
        # Transform rows to match template structure
        transformed_rows = []
        for item in items:  # Use the original items to get date and vehicle
            qty = float(item.qty_kg or 0)
            rate = float(item.rate_per_kg or 0)
            luggage = float(item.transport_cost or 0)
            paid = float(item.paid_amount or 0)
            total = qty * rate
            
            # Commission calculation per row
            row_commission = total * commission_rate
            row_net = total - row_commission
            row_balance = row_net + luggage - paid
            
            # Get vehicle information
            vehicle_info = "N/A"
            if hasattr(item, 'vehicle') and item.vehicle:
                vehicle_info = item.vehicle.vehicle_number or item.vehicle.vehicle_name or "N/A"
            elif hasattr(item, 'vehicle_number') and item.vehicle_number:
                vehicle_info = item.vehicle_number
            elif hasattr(item, 'vehicle_name') and item.vehicle_name:
                vehicle_info = item.vehicle_name
            
            transformed_rows.append({
                "date": item.date.strftime("%d-%m-%Y") if item.date else "N/A",
                "vehicle": vehicle_info,
                "customer": farmer.name,
                "address": farmer.address or "N/A",
                "gross": f"{total:.2f}",
                "commission": f"{row_commission:.2f}",
                "net": f"{row_net:.2f}",
                "paid": f"{paid:.2f}",
                "balance": f"{row_balance:.2f}"
            })
        
        # Load and render HTML template
        template_path = os.path.join("templates", "ledger_report.html")
        
        if not os.path.exists(template_path):
            raise HTTPException(status_code=500, detail=f"Template not found: {template_path}")
        
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # Add print button with JavaScript
        print_button_html = '''
        <div style="position: fixed; top: 10px; right: 10px; z-index: 1000; background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
            <button onclick="window.print()" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">🖨️ Print</button>
        </div>
        '''
        
        # Add script to automatically trigger print when page loads
        auto_print_script = '''
        <script>
            // Auto-print when page loads
            window.onload = function() {
                // Small delay to ensure page is fully loaded
                setTimeout(function() {
                    window.print();
                }, 500);
            };
        </script>
        '''
        
        template = Template(template_content)
        html_content = template.render(
            group_name=group_name,
            commission_pct=commission_pct,
            from_date=from_date.strftime("%d-%m-%Y"),
            to_date=to_date.strftime("%d-%m-%Y"),
            current_date=__import__('datetime').datetime.now().strftime("%d-%m-%Y"),
            rows=transformed_rows,
            totals={
                "gross_total": f"{total_amount:.2f}",
                "commission_total": f"{commission:.2f}",
                "net_total": f"{net_amount:.2f}",
                "paid_total": f"{total_paid:.2f}",
                "balance_total": f"{final_total:.2f}"
            },
            generated_at=__import__('datetime').datetime.now().isoformat()
        )
        
        # Insert print button before </body> tag
        html_content = html_content.replace('</body>', print_button_html + auto_print_script + '</body>')
        
        # Fix logo path - use absolute path from templates directory
        BASE_DIR = Path(__file__).resolve().parent.parent
        logo_path = BASE_DIR / "templates" / "SKFS_logo.png"
        if logo_path.exists():
            html_content = html_content.replace('src="SKFS_logo.png"', f'src="file:///{logo_path.as_posix()}"')
        else:
            html_content = html_content.replace('src="SKFS_logo.png"', 'src="/templates/SKFS_logo.png"')
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/group-patti-report/")
def get_group_patti_report_docx(
    group_id: int = Query(..., description="Group ID"),
    from_date: date = Query(..., description="Start date"),
    to_date: date = Query(..., description="End date"),
    commission_pct: float = Query(12.0, description="Commission percentage"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    LEGACY ENDPOINT - Redirects to new HTML-based report system
    Generate group patti report and return as HTML (viewable/printable)
    
    Note: This endpoint now uses the new HTML template system instead of DOCX.
    Use /api/reports/group-patti/{group_id}?format=html for future integrations.
    """
    # Import here to avoid circular imports
    from fastapi.responses import HTMLResponse
    from jinja2 import Template
    import os
    
    try:
        # Verify group exists and user has access
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
        
        # Fetch all collection items for all farmers in one query with vehicle relationship
        farmer_ids = [f.id for f in farmers]
        all_items = db.query(CollectionItem).options(joinedload(CollectionItem.vehicle)).filter(
            CollectionItem.farmer_id.in_(farmer_ids),
            CollectionItem.date >= from_date,
            CollectionItem.date <= to_date,
            CollectionItem.vendor_id == user.vendor_id
        ).order_by(CollectionItem.date).all()
        
        # Group items by farmer_id for faster lookup
        items_by_farmer = {}
        for item in all_items:
            if item.farmer_id not in items_by_farmer:
                items_by_farmer[item.farmer_id] = []
            items_by_farmer[item.farmer_id].append(item)
        
        # Calculate report for each farmer
        customers = []
        totals = {
            'gross': 0,
            'commission': 0,
            'net': 0,
            'paid': 0,
            'balance': 0,
            'customer_count': len(farmers)
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
            farmer_qty = 0
            
            # Transform entries for this farmer
            transactions = []
            for item in items:
                qty = float(item.qty_kg or 0)
                rate = float(item.rate_per_kg or 0)
                paid = float(item.paid_amount or 0)
                luggage = float(item.transport_cost or 0)
                
                farmer_gross += qty * rate
                farmer_paid += paid
                farmer_luggage += luggage
                farmer_qty += qty
                
                # Add transaction entry
                transactions.append({
                    "date": item.date.strftime("%d-%m-%Y") if item.date else "N/A",
                    "vehicle": getattr(item, 'vehicle', 'N/A') if hasattr(item, 'vehicle') else (getattr(item.vehicle, 'vehicle_number', 'N/A') if hasattr(item, 'vehicle') and item.vehicle else (getattr(item, 'vehicle_number', 'N/A') if hasattr(item, 'vehicle_number') else "N/A")),
                    "qty": f"{qty:.2f}",
                    "price": f"{rate:.2f}",
                    "total": f"{qty * rate:.2f}",
                    "luggage": f"{luggage:.2f}",
                    "paid": f"{paid:.2f}",
                    "amount": f"{(qty * rate + luggage - paid):.2f}"
                })
            
            # Calculate commission and net
            farmer_commission = farmer_gross * (commission_pct / 100)
            farmer_net = farmer_gross - farmer_commission
            farmer_balance = farmer_net + farmer_luggage - farmer_paid
            
            # Add to customer list
            customers.append({
                'id': farmer.id,
                'name': farmer.name,
                'address': farmer.address or "N/A",
                'ledger_name': farmer.farmer_code or "N/A",
                'balance': f"{farmer_balance:.2f}",
                'total_qty': f"{farmer_qty:.2f}",
                'total_amount': f"{farmer_gross:.2f}",
                'total_paid': f"{farmer_paid:.2f}",
                'commission': f"{farmer_commission:.2f}",
                'net_amount': f"{farmer_net:.2f}",
                'luggage_total': f"{farmer_luggage:.2f}",
                'coolie': "0.00",  # Placeholder
                'final_total': f"{farmer_balance:.2f}",
                'transactions': transactions
            })
            
            # Add to group totals
            totals['gross'] += farmer_gross
            totals['commission'] += farmer_commission
            totals['net'] += farmer_net
            totals['paid'] += farmer_paid
            totals['balance'] += farmer_balance

        # Calculate commission for totals
        total_commission = totals['gross'] * (commission_pct / 100)
        total_net = totals['gross'] - total_commission
        total_balance = total_net + totals['paid']

        # Load and render HTML template
        template_path = os.path.join("templates", "group_patti_report.html")
        
        if not os.path.exists(template_path):
            raise HTTPException(status_code=500, detail=f"Template not found: {template_path}")
        
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # Add print button with JavaScript
        print_button_html = '''
        <div style="position: fixed; top: 10px; right: 10px; z-index: 1000; background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
            <button onclick="window.print()" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">🖨️ Print</button>
        </div>
        '''
        
        # Add script to automatically trigger print when page loads
        auto_print_script = '''
        <script>
            // Auto-print when page loads
            window.onload = function() {
                // Small delay to ensure page is fully loaded
                setTimeout(function() {
                    window.print();
                }, 500);
            };
        </script>
        '''
        
        template = Template(template_content)
        html_content = template.render(
            group_name=group.name,
            customers=customers,
            rows=[],  # Empty rows for this context
            totals={
                'customer_count': len(customers),
                'gross_total': f"{totals['gross']:.2f}",
                'commission_total': f"{total_commission:.2f}",
                'net_total': f"{total_net:.2f}",
                'paid_total': f"{totals['paid']:.2f}",
                'balance_total': f"{total_balance:.2f}",
                'total_qty': f"{sum(float(c['total_qty']) for c in customers):.2f}" if customers else "0.00",
                'total_amount': f"{totals['gross']:.2f}"
            },
            commission_pct=commission_pct,
            from_date=from_date.strftime("%d-%m-%Y"),
            to_date=to_date.strftime("%d-%m-%Y"),
            current_date=__import__('datetime').datetime.now().strftime("%d-%m-%Y"),
            generated_at=__import__('datetime').datetime.now().isoformat(),
            farmer_count=len(customers),
            entry_count=len(all_items),
            grand_total_qty=f"{sum(float(c['total_qty']) for c in customers):.2f}" if customers else "0.00",
            grand_total_amount=f"{totals['gross']:.2f}"
        )
        
        # Insert print button before </body> tag
        html_content = html_content.replace('</body>', print_button_html + auto_print_script + '</body>')
        
        # Fix logo path - use absolute path from templates directory
        BASE_DIR = Path(__file__).resolve().parent.parent
        logo_path = BASE_DIR / "templates" / "SKFS_logo.png"
        if logo_path.exists():
            html_content = html_content.replace('src="SKFS_logo.png"', f'src="file:///{logo_path.as_posix()}"')
        else:
            html_content = html_content.replace('src="SKFS_logo.png"', 'src="/templates/SKFS_logo.png"')
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate group patti report: {str(e)}")


@router.get("/group-total-report/")
def get_group_total_report_docx(
    group_id: Optional[int] = Query(None, description="Group ID (if None, aggregates all groups)"),
    from_date: date = Query(..., description="Start date"),
    to_date: date = Query(..., description="End date"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    LEGACY ENDPOINT - Redirects to new HTML-based report system
    Generate group total report and return as HTML (viewable/printable)
    
    Note: This endpoint now uses the new HTML template system instead of DOCX.
    Use /api/reports/group-total?format=html for future integrations.
    """
    try:
        # Handle the case where group_id might be passed as string "null" or empty
        if group_id is not None and str(group_id).lower() == 'null':
            group_id = None
        elif group_id is not None and str(group_id).strip() == '':
            group_id = None
            
        # Check if a specific group is requested
        if group_id is not None:
            # Fetch specific group details
            group = db.query(FarmerGroup).filter(
                FarmerGroup.id == group_id,
                FarmerGroup.vendor_id == user.vendor_id
            ).first()
            
            if not group:
                raise HTTPException(status_code=404, detail="Group not found")
            
            # Fetch all farmers in the specific group
            farmers = db.query(Farmer).filter(
                Farmer.group_id == group_id,
                Farmer.vendor_id == user.vendor_id
            ).all()
            
            if not farmers:
                raise HTTPException(status_code=404, detail="No farmers found in group")
            
            # Fetch all collection items for all farmers in the specific group
            farmer_ids = [f.id for f in farmers]
            all_items = db.query(CollectionItem).filter(
                CollectionItem.farmer_id.in_(farmer_ids),
                CollectionItem.date >= from_date,
                CollectionItem.date <= to_date,
                CollectionItem.vendor_id == user.vendor_id
            ).order_by(CollectionItem.date).all()
            
            # Calculate group totals
            total_qty = 0
            total_amount = 0
            total_paid = 0
            total_luggage = 0
            
            # Process all items to calculate totals
            for item in all_items:
                qty = float(item.qty_kg or 0)
                rate = float(item.rate_per_kg or 0)
                total = qty * rate
                paid = float(item.paid_amount or 0)
                luggage = float(item.transport_cost or 0)
                
                total_qty += qty
                total_amount += total
                total_paid += paid
                total_luggage += luggage
            
            # Calculate group total
            group_total = total_amount - total_paid
            
            # Prepare data for the group_total_report.html template
            # The template expects rows with: group_name, customer_count, total_qty, total_amount
            rows = [{
                "group_name": group.name,
                "customer_count": len(farmers),
                "total_qty": f"{total_qty:.2f}",
                "total_amount": f"{total_amount:.2f}"
            }]
            
            group_count = 1  # Showing one specific group
            overall_qty = total_qty
            overall_amount = total_amount
            overall_paid = total_paid
            overall_balance = group_total
        else:
            # Aggregate data for ALL groups for the vendor
            # Fetch all groups for the vendor
            all_groups = db.query(FarmerGroup).filter(
                FarmerGroup.vendor_id == user.vendor_id
            ).all()
            
            if not all_groups:
                raise HTTPException(status_code=404, detail="No groups found for vendor")
            
            rows = []
            overall_qty = 0
            overall_amount = 0
            overall_paid = 0
            overall_balance = 0
            group_count = 0
            
            # Process each group individually to get detailed breakdown
            for group in all_groups:
                # Fetch all farmers in this group
                farmers = db.query(Farmer).filter(
                    Farmer.group_id == group.id,
                    Farmer.vendor_id == user.vendor_id
                ).all()
                
                if not farmers:
                    continue
                
                # Fetch all collection items for all farmers in this group with vehicle relationship
                farmer_ids = [f.id for f in farmers]
                group_items = db.query(CollectionItem).options(joinedload(CollectionItem.vehicle)).filter(
                    CollectionItem.farmer_id.in_(farmer_ids),
                    CollectionItem.date >= from_date,
                    CollectionItem.date <= to_date,
                    CollectionItem.vendor_id == user.vendor_id
                ).all()
                
                # Calculate totals for this specific group
                group_qty = 0
                group_amount = 0
                group_paid = 0
                group_luggage = 0
                
                for item in group_items:
                    qty = float(item.qty_kg or 0)
                    rate = float(item.rate_per_kg or 0)
                    total = qty * rate
                    paid = float(item.paid_amount or 0)
                    luggage = float(item.transport_cost or 0)
                    
                    group_qty += qty
                    group_amount += total
                    group_paid += paid
                    group_luggage += luggage
                
                group_total = group_amount - group_paid
                
                # Add this group's data to rows
                rows.append({
                    "group_name": group.name,
                    "customer_count": len(farmers),
                    "total_qty": f"{group_qty:.2f}",
                    "total_amount": f"{group_amount:.2f}"
                })
                
                # Add to overall totals
                overall_qty += group_qty
                overall_amount += group_amount
                overall_paid += group_paid
                overall_balance += group_total
                group_count += 1
        
        # Load and render HTML template
        template_path = os.path.join("templates", "group_total_report.html")
        
        if not os.path.exists(template_path):
            raise HTTPException(status_code=500, detail=f"Template not found: {template_path}")
        
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # Add print button with JavaScript
        print_button_html = '''
        <div style="position: fixed; top: 10px; right: 10px; z-index: 1000; background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
            <button onclick="window.print()" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">🖨️ Print</button>
        </div>
        '''
        
        # Add script to automatically trigger print when page loads
        auto_print_script = '''
        <script>
            // Auto-print when page loads
            window.onload = function() {
                // Small delay to ensure page is fully loaded
                setTimeout(function() {
                    window.print();
                }, 500);
            };
        </script>
        '''
        
        template = Template(template_content)
        html_content = template.render(
            rows=rows,
            overall_qty=f"{overall_qty:.2f}",
            overall_amount=f"{overall_amount:.2f}",
            overall_paid=f"{overall_paid:.2f}",
            overall_balance=f"{overall_balance:.2f}",
            from_date=from_date.strftime("%d-%m-%Y"),
            to_date=to_date.strftime("%d-%m-%Y"),
            current_date=__import__('datetime').datetime.now().strftime("%d-%m-%Y"),
            generated_at=__import__('datetime').datetime.now().isoformat(),
            group_count=group_count
        )
        
        # Insert print button before </body> tag
        html_content = html_content.replace('</body>', print_button_html + auto_print_script + '</body>')
        
        # Fix logo path - use absolute path from templates directory
        BASE_DIR = Path(__file__).resolve().parent.parent
        logo_path = BASE_DIR / "templates" / "SKFS_logo.png"
        if logo_path.exists():
            html_content = html_content.replace('src="SKFS_logo.png"', f'src="file:///{logo_path.as_posix()}"')
        else:
            html_content = html_content.replace('src="SKFS_logo.png"', 'src="/templates/SKFS_logo.png"')
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate group total report: {str(e)}")


@router.get("/daily-sales-report/")
def get_daily_sales_report_docx(
    from_date: date = Query(..., description="Start date"),
    to_date: date = Query(..., description="End date"),
    item_name: Optional[str] = Query(None, description="Filter by item name"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    LEGACY ENDPOINT - Redirects to new HTML-based report system
    Generate daily sales report and return as HTML (viewable/printable)
    
    Note: This endpoint now uses the new HTML template system instead of DOCX.
    Use /api/reports/daily-sales?format=html for future integrations.
    """
    try:
        # Base query for collection items with vehicle relationship
        query = db.query(CollectionItem).options(joinedload(CollectionItem.vehicle)).filter(
            CollectionItem.date >= from_date,
            CollectionItem.date <= to_date,
            CollectionItem.vendor_id == user.vendor_id
        )
        
        if item_name:
            query = query.filter(CollectionItem.item_name.ilike(f"%{item_name}%"))
        
        items = query.order_by(CollectionItem.date).all()
        
        # Transform data for template - match the template structure
        rows = []
        total_qty = 0
        total_amount = 0
        
        for item in items:
            qty = float(item.qty_kg or 0)
            rate = float(item.rate_per_kg or 0)
            total = qty * rate
            
            rows.append({
                "date": item.date.strftime("%d-%m-%Y") if item.date else "N/A",
                "vehicle": getattr(item, 'vehicle', 'N/A') if hasattr(item, 'vehicle') else (item.vehicle_number if hasattr(item, 'vehicle_number') else "N/A"),
                "party": item.farmer.name if item.farmer else "N/A",  # Get farmer name as party
                "itemName": item.item_name or "N/A",
                "qty": f"{qty:.2f}",
                "rate": f"{rate:.2f}",
                "total": f"{total:.2f}"
            })
            
            total_qty += qty
            total_amount += total
        
        # Load and render HTML template
        template_path = os.path.join("templates", "daily_sales_report.html")
        
        if not os.path.exists(template_path):
            raise HTTPException(status_code=500, detail=f"Template not found: {template_path}")
        
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # Add print button with JavaScript
        print_button_html = '''
        <div style="position: fixed; top: 10px; right: 10px; z-index: 1000; background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
            <button onclick="window.print()" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">🖨️ Print</button>
        </div>
        '''
        
        # Add script to automatically trigger print when page loads
        auto_print_script = '''
        <script>
            // Auto-print when page loads
            window.onload = function() {
                // Small delay to ensure page is fully loaded
                setTimeout(function() {
                    window.print();
                }, 500);
            };
        </script>
        '''
        
        template = Template(template_content)
        html_content = template.render(
            rows=rows,
            total_qty=f"{total_qty:.2f}",
            total_amount=f"{total_amount:.2f}",
            item_filter=item_name or "All Items",
            from_date=from_date.strftime("%d-%m-%Y"),
            to_date=to_date.strftime("%d-%m-%Y"),
            current_date=__import__('datetime').datetime.now().strftime("%d-%m-%Y"),
            generated_at=__import__('datetime').datetime.now().isoformat(),
            totals={
                "record_count": len(rows),
                "total_qty": f"{total_qty:.2f}",
                "total_amount": f"{total_amount:.2f}"
            }
        )
        
        # Insert print button before </body> tag
        html_content = html_content.replace('</body>', print_button_html + auto_print_script + '</body>')
        
        # Fix logo path - use absolute path from templates directory
        BASE_DIR = Path(__file__).resolve().parent.parent
        logo_path = BASE_DIR / "templates" / "SKFS_logo.png"
        if logo_path.exists():
            html_content = html_content.replace('src="SKFS_logo.png"', f'src="file:///{logo_path.as_posix()}"')
        else:
            html_content = html_content.replace('src="SKFS_logo.png"', 'src="/templates/SKFS_logo.png"')
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate daily sales report: {str(e)}")