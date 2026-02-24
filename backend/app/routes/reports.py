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
    Render Jinja2 template with provided data.
    
    Args:
        template_name: Name of template file (e.g., 'ledger_report.html')
        data: Dictionary of variables to pass to template
        template_dir: Directory containing templates
    
    Returns:
        Rendered HTML string with corrected asset paths
    """
    import os
    template_path = os.path.join(template_dir, template_name)
    
    if not os.path.exists(template_path):
        return f"<h1>Template not found: {template_name}</h1>"
    
    with open(template_path, 'r', encoding='utf-8') as f:
        template_content = f.read()
    
    template = Template(template_content)
    html = template.render(**data)
    
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
    
    # Prepare template data
    template_data = {
        "customer": ledger_data["customer"],
        "entries": ledger_data["entries"],
        "totals": {
            "qty": ledger_data["total_qty"],
            "kg": ledger_data["total_kg"],
            "amount": ledger_data["total_amount"]
        },
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
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
    
    # Prepare template data
    template_data = {
        "groups": group_data["groups"],
        "grand_total": group_data["grand_total_amount"],
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
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
    
    # Prepare template data
    template_data = {
        "group": patti_data["group"],
        "farmers": patti_data["farmers"],
        "grand_total_qty": patti_data["grand_total_qty"],
        "grand_total_amount": patti_data["grand_total_amount"],
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
        "generated_at": generated_at,
        "farmer_count": farmer_count,
        "entry_count": entry_count
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
    
    # Prepare template data
    template_data = {
        "entries": sales_data["entries"],
        "grand_total_qty": sales_data["grand_total_qty"],
        "grand_total_amount": sales_data["grand_total_amount"],
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
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
