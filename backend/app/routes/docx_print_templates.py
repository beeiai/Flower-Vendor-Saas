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


router = APIRouter(
    prefix="/print-docx",
    tags=["DOCX Print Templates"]
)


# PDF Preview Endpoints
@router.get("/ledger-report-preview")
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
    from fastapi.responses import HTMLResponse
    from jinja2 import Template
    import os
    
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
        
        # Transform data for template - ensure proper date and vehicle mapping
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
            
            # Format date properly as DD-MM-YYYY
            date_str = item.date.strftime("%d-%m-%Y") if item.date else "N/A"
            
            # Get vehicle information - try multiple field names
            vehicle_info = item.vehicle_name or item.vehicle_number or item.vehicle or "N/A"
            
            rows.append({
                "date": date_str,
                "vehicle": vehicle_info,
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
        for row in rows:
            qty = float(row["qty"])
            price = float(row["price"])
            total = float(row["total"])
            luggage = float(row["luggage"])
            paid = float(row["paid_amount"])
            amount = float(row["amount"])
            
            # Commission calculation per row
            row_commission = total * commission_rate
            row_net = total - row_commission
            row_balance = row_net + luggage - paid
            
            transformed_rows.append({
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
        html_content = html_content.replace('</body>', print_button_html + '</body>')
        
        # Fix logo path with proper error handling
        import os
        import logging
        logo_path = os.path.join("templates", "SKFS_logo.png")
        if os.path.exists(logo_path):
            html_content = html_content.replace('src="SKFS_logo.png"', 'src="/templates/SKFS_logo.png"')
            html_content = html_content.replace("src='SKFS_logo.png'", 'src="/templates/SKFS_logo.png"')
        else:
            logger = logging.getLogger(__name__)
            logger.warning(f"Logo file not found at: {logo_path}")
            # Remove broken image references
            html_content = html_content.replace('src="SKFS_logo.png"', '')
            html_content = html_content.replace("src='SKFS_logo.png'", '')
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


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
    LEGACY ENDPOINT - Redirects to new HTML-based report system
    Generate ledger report for a specific farmer and return as HTML (viewable/printable)
    
    Note: This endpoint now uses the new HTML template system instead of DOCX.
    Use /api/reports/ledger/{farmer_id}?format=html for future integrations.
    """
    from fastapi.responses import HTMLResponse
    from jinja2 import Template
    import os
    
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
        
        # Transform rows to match template structure - include date and vehicle
        transformed_rows = []
        for row in rows:
            qty = float(row["qty"])
            price = float(row["price"])
            total = float(row["total"])
            luggage = float(row["luggage"])
            paid = float(row["paid_amount"])
            
            # Commission calculation per row
            row_commission = total * commission_rate
            row_net = total - row_commission
            row_balance = row_net + luggage - paid
            
            transformed_rows.append({
                "date": row["date"],
                "vehicle": row["vehicle"],
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
        html_content = html_content.replace('</body>', print_button_html + '</body>')
        
        # Fix logo path with proper error handling
        import os
        import logging
        logo_path = os.path.join("templates", "SKFS_logo.png")
        if os.path.exists(logo_path):
            html_content = html_content.replace('src="SKFS_logo.png"', 'src="/templates/SKFS_logo.png"')
            html_content = html_content.replace("src='SKFS_logo.png'", 'src="/templates/SKFS_logo.png"')
        else:
            logger = logging.getLogger(__name__)
            logger.warning(f"Logo file not found at: {logo_path}")
            # Remove broken image references
            html_content = html_content.replace('src="SKFS_logo.png"', '')
            html_content = html_content.replace("src='SKFS_logo.png'", '')
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
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
        
        template = Template(template_content)
        html_content = template.render(
            group_name=group.name,
            customers=rows,
            totals=totals,
            from_date=from_date.strftime("%d-%m-%Y"),
            to_date=to_date.strftime("%d-%m-%Y"),
            current_date=__import__('datetime').datetime.now().strftime("%d-%m-%Y"),
            generated_at=__import__('datetime').datetime.now().isoformat()
        )
        
        # Insert print button before </body> tag
        html_content = html_content.replace('</body>', print_button_html + '</body>')
        
        # Fix logo path with proper error handling
        import os
        import logging
        logo_path = os.path.join("templates", "SKFS_logo.png")
        if os.path.exists(logo_path):
            html_content = html_content.replace('src="SKFS_logo.png"', 'src="/templates/SKFS_logo.png"')
            html_content = html_content.replace("src='SKFS_logo.png'", 'src="/templates/SKFS_logo.png"')
        else:
            logger = logging.getLogger(__name__)
            logger.warning(f"Logo file not found at: {logo_path}")
            # Remove broken image references
            html_content = html_content.replace('src="SKFS_logo.png"', '')
            html_content = html_content.replace("src='SKFS_logo.png'", '')
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate group patti report: {str(e)}")


@router.get("/group-total-report")
def get_group_total_report_docx(
    group_id: int = Query(..., description="Group ID", gt=0),
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
    
    Query Parameters:
    - group_id: Group ID (required, must be > 0)
    - from_date: Start date (required, format: YYYY-MM-DD)
    - to_date: End date (required, format: YYYY-MM-DD)
    """
    from fastapi.responses import HTMLResponse
    from jinja2 import Template
    import os
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Validate date range
        if from_date > to_date:
            raise HTTPException(
                status_code=422, 
                detail="from_date cannot be later than to_date"
            )
        
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
            logger.warning(f"No farmers found in group {group_id}")
            # Still generate report but with empty data
            pass
        
        # Fetch all collection items for all farmers in one query
        farmer_ids = [f.id for f in farmers] if farmers else []
        query = db.query(CollectionItem).filter(
            CollectionItem.date >= from_date,
            CollectionItem.date <= to_date,
            CollectionItem.vendor_id == user.vendor_id
        )
        
        if farmer_ids:
            query = query.filter(CollectionItem.farmer_id.in_(farmer_ids))
        
        all_items = query.order_by(CollectionItem.date).all()
        
        # Create farmer lookup for customer names
        farmer_lookup = {f.id: f for f in farmers} if farmers else {}
        
        # Transform data for template
        rows = []
        total_qty = 0
        total_amount = 0
        total_paid = 0
        total_luggage = 0
        
        for item in all_items:
            qty = float(item.qty_kg or 0)
            rate = float(item.rate_per_kg or 0)
            total = qty * rate
            paid = float(item.paid_amount or 0)
            luggage = float(item.transport_cost or 0)
            
            # Get farmer name from lookup
            farmer_obj = farmer_lookup.get(item.farmer_id)
            customer_name = farmer_obj.name if farmer_obj else "Unknown"
            
            rows.append({
                "date": item.date.strftime("%d-%m-%Y"),
                "customer_name": customer_name,
                "item_name": item.item_name or "N/A",
                "qty": f"{qty:.2f}",
                "rate": f"{rate:.2f}",
                "total": f"{total:.2f}",
                "paid": f"{paid:.2f}",
                "luggage": f"{luggage:.2f}"
            })
            
            total_qty += qty
            total_amount += total
            total_paid += paid
            total_luggage += luggage
        
        # Calculate group total
        group_total = total_amount - total_paid
        
        # Aggregate data by group (row structure for group_total_report template)
        # The template expects rows with: group_name, customer_count, total_qty, total_amount
        aggregated_rows = [{
            "group_name": group.name,
            "customer_count": len(farmers) if farmers else 0,
            "total_qty": f"{total_qty:.2f}",
            "total_amount": f"{total_amount:.2f}",
            "total_paid": f"{total_paid:.2f}",
            "balance": f"{group_total:.2f}"
        }]
        
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
        
        template = Template(template_content)
        html_content = template.render(
            rows=aggregated_rows,
            overall_qty=f"{total_qty:.2f}",
            overall_amount=f"{total_amount:.2f}",
            overall_paid=f"{total_paid:.2f}",
            overall_balance=f"{group_total:.2f}",
            from_date=from_date.strftime("%d-%m-%Y"),
            to_date=to_date.strftime("%d-%m-%Y"),
            current_date=__import__('datetime').datetime.now().strftime("%d-%m-%Y"),
            generated_at=__import__('datetime').datetime.now().isoformat()
        )
        
        # Insert print button before </body> tag
        html_content = html_content.replace('</body>', print_button_html + '</body>')
        
        # Fix logo path with proper error handling
        import os
        import logging
        logo_path = os.path.join("templates", "SKFS_logo.png")
        if os.path.exists(logo_path):
            html_content = html_content.replace('src="SKFS_logo.png"', 'src="/templates/SKFS_logo.png"')
            html_content = html_content.replace("src='SKFS_logo.png'", 'src="/templates/SKFS_logo.png"')
        else:
            logger = logging.getLogger(__name__)
            logger.warning(f"Logo file not found at: {logo_path}")
            # Remove broken image references
            html_content = html_content.replace('src="SKFS_logo.png"', '')
            html_content = html_content.replace("src='SKFS_logo.png'", '')
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate group total report: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate group total report: {str(e)}")


@router.get("/daily-sales-report")
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
    from fastapi.responses import HTMLResponse
    from jinja2 import Template
    import os
    
    try:
        # Base query for collection items
        query = db.query(CollectionItem).filter(
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
                "date": item.date.strftime("%d-%m-%Y"),
                "vehicle": item.vehicle or "N/A",  # Assuming vehicle field exists in CollectionItem
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
        
        template = Template(template_content)
        html_content = template.render(
            rows=rows,
            total_qty=f"{total_qty:.2f}",
            total_amount=f"{total_amount:.2f}",
            item_filter=item_name or "All Items",
            from_date=from_date.strftime("%d-%m-%Y"),
            to_date=to_date.strftime("%d-%m-%Y"),
            current_date=__import__('datetime').datetime.now().strftime("%d-%m-%Y"),
            generated_at=__import__('datetime').datetime.now().isoformat()
        )
        
        # Insert print button before </body> tag
        html_content = html_content.replace('</body>', print_button_html + '</body>')
        
        # Fix logo path with proper error handling
        import os
        import logging
        logo_path = os.path.join("templates", "SKFS_logo.png")
        if os.path.exists(logo_path):
            html_content = html_content.replace('src="SKFS_logo.png"', 'src="/templates/SKFS_logo.png"')
            html_content = html_content.replace("src='SKFS_logo.png'", 'src="/templates/SKFS_logo.png"')
        else:
            logger = logging.getLogger(__name__)
            logger.warning(f"Logo file not found at: {logo_path}")
            # Remove broken image references
            html_content = html_content.replace('src="SKFS_logo.png"', '')
            html_content = html_content.replace("src='SKFS_logo.png'", '')
        
        return HTMLResponse(content=html_content)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate daily sales report: {str(e)}")