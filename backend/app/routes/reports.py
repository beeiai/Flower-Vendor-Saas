from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from typing import Optional
from jinja2 import Template

from app.core.db import get_db
from app.dependencies import get_current_user
from app.models.collection_item import CollectionItem
from app.models.farmer import Farmer
from app.utils.page_counter import estimate_pdf_page_count
from app.utils.reports_db import (
    get_ledger_data,
    get_group_total_data,
    get_group_patti_data,
    get_daily_sales_data,
    get_default_date_range
)

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


def render_template(template_name: str, data: dict, template_dir: str = "templates") -> str:
    """
    Render Jinja2 template with provided data and add print button.
    
    Args:
        template_name: Name of template file (e.g., 'ledger_report.html')
        data: Dictionary of variables to pass to template
        template_dir: Directory containing templates
    
    Returns:
        Rendered HTML string with corrected asset paths and print button
    """
    import os
    template_path = os.path.join(template_dir, template_name)
    
    if not os.path.exists(template_path):
        return f"<h1>Template not found: {template_name}</h1>"
    
    with open(template_path, 'r', encoding='utf-8') as f:
        template_content = f.read()
    
    template = Template(template_content)
    html = template.render(**data)
    
    # Add print button with JavaScript
    print_button_html = '''
    <div style="position: fixed; top: 10px; right: 10px; z-index: 1000; background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
        <button onclick="window.print()" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">🖨️ Print</button>
    </div>
    '''
    
    # Insert print button before </body> tag
    html = html.replace('</body>', print_button_html + '</body>')
    
    # Fix logo path: replace relative path with absolute /templates path
    # Templates reference logo as: <img src="SKFS_logo.png">
    # Must route to /templates/ for proper serving
    html = html.replace('src="SKFS_logo.png"', 'src="/templates/SKFS_logo.png"')
    
    return html


# ================================================
# LEDGER REPORT (Silk Ledger for specific customer)
# ================================================
@router.get("/ledger/{customer_id}")
def get_ledger_report(
    customer_id: int,
    from_date: Optional[date] = Query(None, description="Start date (defaults to month start)"),
    to_date: Optional[date] = Query(None, description="End date (defaults to today)"),
    format: str = Query("html", description="Response format: html or json"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Get Ledger Report for a specific customer (farmer).
    
    Supports both HTML (for printing) and JSON (for API consumption and preview).
    
    Query Parameters:
    - customer_id: Farmer ID
    - from_date: Start date (optional, defaults to month start)
    - to_date: End date (optional, defaults to today)
    - format: Response format (html|json, default: html)
    
    Returns:
    - If format=html: Rendered HTML template (Content-Type: text/html)
    - If format=json: {html, metadata} with page count and record count
    """
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
    
    # Get data
    ledger_data = get_ledger_data(
        vendor_id=user.vendor_id,
        customer_id=customer_id,
        from_date=from_date,
        to_date=to_date,
        db=db
    )
    
    if not ledger_data.get("customer"):
        return JSONResponse(
            status_code=404,
            content={"detail": "Customer not found"}
        )
    
    # Calculate metadata
    record_count = ledger_data.get("record_count", 0)
    page_count = estimate_pdf_page_count("ledger", record_count=record_count)
    generated_at = datetime.now().isoformat()
    current_date = datetime.now().strftime("%d-%m-%Y")
    
    # Default commission is 12%
    commission_pct = 12.0
    
    # Transform entries to match template expectations
    rows = []
    gross_total = 0
    commission_total = 0
    net_total = 0
    paid_total = 0
    balance_total = 0
    
    for entry in ledger_data.get("entries", []):
        gross = float(entry.get("amount", 0))  # Use "amount" from ledger_data
        commission = gross * (commission_pct / 100)  # Calculate commission
        net = gross - commission
        paid = float(entry.get("paid", 0))
        balance = net - paid
        
        rows.append({
            "customer": ledger_data.get("customer", {}).get("name", "N/A"),
            "address": ledger_data.get("customer", {}).get("phone", "N/A"),
            "gross": f"{gross:.2f}",
            "commission": f"{commission:.2f}",
            "net": f"{net:.2f}",
            "paid": f"{paid:.2f}",
            "balance": f"{balance:.2f}"
        })
        
        gross_total += gross
        commission_total += commission
        net_total += net
        paid_total += paid
        balance_total += balance
    
    # Get group name
    customer_obj = ledger_data.get("customer", {})
    group_name = "N/A"
    if isinstance(customer_obj, dict):
        group_name = customer_obj.get("group_name", "N/A")
    
    # Prepare template data
    template_data = {
        "rows": rows,
        "totals": {
            "gross_total": f"{gross_total:.2f}",
            "commission_total": f"{commission_total:.2f}",
            "net_total": f"{net_total:.2f}",
            "paid_total": f"{paid_total:.2f}",
            "balance_total": f"{balance_total:.2f}"
        },
        "group_name": group_name,
        "commission_pct": 12.0,
        "from_date": from_date.strftime("%d-%m-%Y"),
        "to_date": to_date.strftime("%d-%m-%Y"),
        "current_date": current_date,
        "generated_at": generated_at
    }
    
    # Render HTML
    html_content = render_template("ledger_report.html", template_data)
    
    if format.lower() == "json":
        return JSONResponse({
            "html": html_content,
            "metadata": {
                "page_count": page_count,
                "record_count": record_count,
                "report_type": "ledger",
                "paper_size": "A4",
                "generated_at": generated_at,
                "date_range": {
                    "from": from_date.isoformat(),
                    "to": to_date.isoformat()
                }
            }
        })
    else:
        return HTMLResponse(content=html_content)


# ================================================
# GROUP TOTAL REPORT (Aggregated by group)
# ================================================
@router.get("/group-total")
def get_group_total_report(
    from_date: Optional[date] = Query(None, description="Start date (defaults to month start)"),
    to_date: Optional[date] = Query(None, description="End date (defaults to today)"),
    format: str = Query("html", description="Response format: html or json"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Get Group Total Report with aggregated data for all groups.
    
    Supports both HTML and JSON formats.
    
    Query Parameters:
    - from_date: Start date (optional, defaults to month start)
    - to_date: End date (optional, defaults to today)
    - format: Response format (html|json, default: html)
    
    Returns:
    - If format=html: Rendered HTML template
    - If format=json: {html, metadata} with page and group counts
    """
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
    
    # Get data
    group_data = get_group_total_data(
        vendor_id=user.vendor_id,
        from_date=from_date,
        to_date=to_date,
        db=db
    )
    
    # Calculate metadata
    group_count = group_data.get("group_count", 0)
    page_count = estimate_pdf_page_count("group_total", group_count=group_count)
    generated_at = datetime.now().isoformat()
    current_date = datetime.now().strftime("%d-%m-%Y")
    
    # Transform groups to match template expectations
    rows = []
    overall_qty = 0
    overall_amount = 0
    overall_paid = 0
    overall_balance = 0
    
    for group in group_data.get("groups", []):
        total_qty = float(group.get("total_qty", 0))
        total_amount = float(group.get("total_amount", 0))
        # Get number of farmers in this group for customer_count
        farmer_count = db.query(Farmer).filter(
            Farmer.group_id == group.get("id"),
            Farmer.vendor_id == user.vendor_id
        ).count()
        balance = total_amount  # No paid_amount in group_data, total_amount is the balance
        
        rows.append({
            "group_name": group.get("name", "N/A"),
            "customer_count": farmer_count,
            "total_qty": f"{total_qty:.2f}",
            "total_amount": f"{total_amount:.2f}"
        })
        
        overall_qty += total_qty
        overall_amount += total_amount
        overall_balance += balance
    
    # Prepare template data
    template_data = {
        "rows": rows,
        "overall_qty": f"{overall_qty:.2f}",
        "overall_amount": f"{overall_amount:.2f}",
        "overall_paid": "0.00",
        "overall_balance": f"{overall_balance:.2f}",
        "from_date": from_date.strftime("%d-%m-%Y"),
        "to_date": to_date.strftime("%d-%m-%Y"),
        "current_date": current_date,
        "generated_at": generated_at,
        "group_count": group_count
    }
    
    # Render HTML
    html_content = render_template("group_total_report.html", template_data)
    
    if format.lower() == "json":
        return JSONResponse({
            "html": html_content,
            "metadata": {
                "page_count": page_count,
                "record_count": group_count,
                "report_type": "group_total",
                "paper_size": "A4",
                "generated_at": generated_at,
                "date_range": {
                    "from": from_date.isoformat(),
                    "to": to_date.isoformat()
                }
            }
        })
    else:
        return HTMLResponse(content=html_content)


# ================================================
# GROUP PATTI REPORT (Detailed by group and farmer)
# ================================================
@router.get("/group-patti/{group_id}")
def get_group_patti_report(
    group_id: int,
    from_date: Optional[date] = Query(None, description="Start date (defaults to month start)"),
    to_date: Optional[date] = Query(None, description="End date (defaults to today)"),
    format: str = Query("html", description="Response format: html or json"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Get Group Patti (Group Details) Report with individual farmer entries.
    
    Shows each farmer in the group with their transactions.
    
    Query Parameters:
    - group_id: Farmer Group ID
    - from_date: Start date (optional, defaults to month start)
    - to_date: End date (optional, defaults to today)
    - format: Response format (html|json, default: html)
    
    Returns:
    - If format=html: Rendered multi-page HTML template
    - If format=json: {html, metadata} with detailed page and entry counts
    """
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
    
    # Get data
    patti_data = get_group_patti_data(
        vendor_id=user.vendor_id,
        group_id=group_id,
        from_date=from_date,
        to_date=to_date,
        db=db
    )
    
    if not patti_data.get("group"):
        return JSONResponse(
            status_code=404,
            content={"detail": "Group not found"}
        )
    
    # Calculate metadata
    farmer_count = patti_data.get("farmer_count", 0)
    entry_count = patti_data.get("entry_count", 0)
    page_count = estimate_pdf_page_count(
        "group_patti",
        record_count=entry_count,
        group_count=farmer_count,
        avg_records_per_group=(entry_count / farmer_count if farmer_count > 0 else 0)
    )
    generated_at = datetime.now().isoformat()
    current_date = datetime.now().strftime("%d-%m-%Y")
    group_name = patti_data.get("group", {}).get("name", "Unknown Group")
    
    # Transform farmers data to match template expectations
    customers = []
    grand_total_qty = 0
    grand_total_amount = 0
    grand_total_paid = 0
    grand_total_balance = 0
    
    # Summary rows for the summary table
    summary_rows = []
    summary_qty = 0
    summary_amount = 0
    summary_paid = 0
    summary_balance = 0
    
    for farmer in patti_data.get("farmers", []):
        farmer_name = farmer.get("name", "Unknown")
        farmer_id = farmer.get("id", 0)
        
        # Transform entries (from reports_db) to transactions (for template)
        transactions = []
        farmer_qty = 0
        farmer_amount = 0
        farmer_paid = 0
        farmer_balance = 0
        
        for entry in farmer.get("entries", []):
            qty = float(entry.get("qty", 0))
            rate = float(entry.get("rate", 0))
            total = qty * rate
            luggage = 0  # Not available in silk ledger entries
            paid = 0  # Not available in silk ledger entries
            amount = total
            
            transactions.append({
                "date": entry.get("date", "").split("T")[0] if isinstance(entry.get("date"), str) else entry.get("date", ""),
                "vehicle": "N/A",
                "qty": f"{qty:.2f}",
                "price": f"{rate:.2f}",
                "total": f"{total:.2f}",
                "luggage": f"{luggage:.2f}",
                "paid": f"{paid:.2f}",
                "amount": f"{amount:.2f}"
            })
            
            farmer_qty += qty
            farmer_amount += total
            farmer_paid += paid
            farmer_balance += amount
        
        customers.append({
            "id": farmer_id,
            "name": farmer_name,
            "address": farmer.get("phone", "N/A"),
            "ledger_name": farmer.get("code", "N/A"),
            "balance": f"{farmer_balance:.2f}",
            "transactions": transactions
        })
        
        # Add to summary
        summary_rows.append({
            "customer": farmer_name,
            "address": farmer.get("address", "N/A"),
            "qty": f"{farmer_qty:.2f}",
            "total": f"{farmer_amount:.2f}",
            "paid": f"{farmer_paid:.2f}",
            "balance": f"{farmer_balance:.2f}"
        })
        
        grand_total_qty += farmer_qty
        grand_total_amount += farmer_amount
        grand_total_paid += farmer_paid
        grand_total_balance += farmer_balance
        summary_qty += farmer_qty
        summary_amount += farmer_amount
        summary_paid += farmer_paid
        summary_balance += farmer_balance
    
    # Prepare template data
    template_data = {
        "customers": customers,
        "rows": summary_rows,  # For summary table
        "totals": {
            "qty": f"{summary_qty:.2f}",
            "amount": f"{summary_amount:.2f}",
            "paid": f"{summary_paid:.2f}",
            "balance": f"{summary_balance:.2f}",
            "qty_total": f"{grand_total_qty:.2f}",
            "amount_total": f"{grand_total_amount:.2f}",
            "paid_total": f"{grand_total_paid:.2f}",
            "balance_total": f"{grand_total_balance:.2f}"
        },
        "group_name": group_name,
        "from_date": from_date.strftime("%d-%m-%Y"),
        "to_date": to_date.strftime("%d-%m-%Y"),
        "current_date": current_date,
        "generated_at": generated_at,
        "farmer_count": farmer_count,
        "entry_count": entry_count,
        "grand_total_qty": f"{grand_total_qty:.2f}",
        "grand_total_amount": f"{grand_total_amount:.2f}"
    }
    
    # Render HTML
    html_content = render_template("group_patti_report.html", template_data)
    
    if format.lower() == "json":
        return JSONResponse({
            "html": html_content,
            "metadata": {
                "page_count": page_count,
                "record_count": entry_count,
                "report_type": "group_patti",
                "paper_size": "A4",
                "generated_at": generated_at,
                "date_range": {
                    "from": from_date.isoformat(),
                    "to": to_date.isoformat()
                },
                "farmer_count": farmer_count
            }
        })
    else:
        return HTMLResponse(content=html_content)


# ================================================
# DAILY SALES REPORT (Collection data)
# ================================================
@router.get("/daily-sales")
def get_daily_sales_report(
    from_date: Optional[date] = Query(None, description="Start date (defaults to month start)"),
    to_date: Optional[date] = Query(None, description="End date (defaults to today)"),
    item_name: Optional[str] = Query(None, description="Filter by item name (optional)"),
    format: str = Query("html", description="Response format: html or json"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Get Daily Sales Report from collection data.
    
    Shows daily collections aggregated by date, party, and item.
    
    Query Parameters:
    - from_date: Start date (optional, defaults to month start)
    - to_date: End date (optional, defaults to today)
    - item_name: Filter by specific item name (optional)
    - format: Response format (html|json, default: html)
    
    Returns:
    - If format=html: Rendered HTML template
    - If format=json: {html, metadata} with page and record counts
    """
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
    
    # Get data
    sales_data = get_daily_sales_data(
        vendor_id=user.vendor_id,
        from_date=from_date,
        to_date=to_date,
        item_name=item_name,
        db=db
    )
    
    # Calculate metadata
    record_count = sales_data.get("record_count", 0)
    page_count = estimate_pdf_page_count("daily_sales", record_count=record_count)
    generated_at = datetime.now().isoformat()
    current_date = datetime.now().strftime("%d-%m-%Y")
    
    # Transform entries to match template expectations
    rows = []
    total_qty = 0
    total_amount = 0
    
    for entry in sales_data.get("entries", []):
        qty = float(entry.get("qty", 0))
        rate = float(entry.get("rate", 0))
        total = qty * rate
        
        # Format date properly
        entry_date = entry.get("date", "")
        if isinstance(entry_date, str):
            # If ISO format (YYYY-MM-DD), keep it; if has T (ISO datetime), extract date part
            entry_date = entry_date.split("T")[0] if "T" in entry_date else entry_date
        
        rows.append({
            "date": entry_date,
            "vehicle": entry.get("vehicle", "N/A"),
            "party": entry.get("party", "N/A"),
            "itemName": entry.get("item", "N/A"),
            "qty": f"{qty:.2f}",
            "rate": f"{rate:.2f}",
            "total": f"{total:.2f}"
        })
        
        total_qty += qty
        total_amount += total
    
    # Prepare template data
    template_data = {
        "rows": rows,
        "total_qty": f"{total_qty:.2f}",
        "total_amount": f"{total_amount:.2f}",
        "from_date": from_date.strftime("%d-%m-%Y"),
        "to_date": to_date.strftime("%d-%m-%Y"),
        "current_date": current_date,
        "generated_at": generated_at,
        "item_filter": item_name or "All Items"
    }
    
    # Render HTML
    html_content = render_template("daily_sales_report.html", template_data)
    
    if format.lower() == "json":
        return JSONResponse({
            "html": html_content,
            "metadata": {
                "page_count": page_count,
                "record_count": record_count,
                "report_type": "daily_sales",
                "paper_size": "A4",
                "generated_at": generated_at,
                "date_range": {
                    "from": from_date.isoformat(),
                    "to": to_date.isoformat()
                }
            }
        })
    else:
        return HTMLResponse(content=html_content)


# ================================================
# LEGACY / UTILITY ENDPOINTS
# ================================================
@router.get("/daily-sales/items")
def get_available_items(
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Returns a distinct list of item names used in collection items.
    Used for populating the item filter dropdown.
    """
    items = (
        db.query(CollectionItem.item_name)
        .filter(
            CollectionItem.vendor_id == user.vendor_id,
            CollectionItem.item_name.isnot(None),
            CollectionItem.item_name != ""
        )
        .distinct()
        .order_by(CollectionItem.item_name.asc())
        .all()
    )
    
    return [item[0] for item in items if item[0]]
