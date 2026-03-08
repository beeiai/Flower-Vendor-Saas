from fastapi import APIRouter, Depends, Query
import logging

# Configure logging
logger = logging.getLogger(__name__)
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from typing import Optional
from decimal import Decimal
from jinja2 import Template
import os
from pathlib import Path

from app.core.db import get_db
from app.dependencies import get_current_user
from app.models.collection_item import CollectionItem
from app.models.farmer import Farmer
from app.models.farmer_group import FarmerGroup
from app.models.advance import Advance
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
    template_path = os.path.join(template_dir, template_name)
    
    if not os.path.exists(template_path):
        return f"<h1>Template not found: {template_name}</h1>"
    
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        template = Template(template_content)

        # Provide a minimal `url_for` implementation for templates rendered
        # outside of Flask. This supports usage like:
        #   {{ url_for('static', filename='images/SKFS_logo.png') }}
        def url_for(endpoint, **values):
            if endpoint == 'static':
                filename = values.get('filename', '')
                # Ensure web-style path separators
                return '/' + os.path.join('static', filename).replace('\\', '/')
            # Fallback: return root for unknown endpoints
            return '/'

        html = template.render(**data, url_for=url_for)
    except Exception as e:
        print(f"Template rendering error: {e}")
        return f"<h1>Template rendering error: {str(e)}</h1>"
    
    # Convert logo to data URI for reliable printing in production
    logo_path = os.path.join("static", "images", "SKFS_logo.png")
    if os.path.exists(logo_path):
        try:
            import base64
            with open(logo_path, "rb") as img_file:
                img_data = base64.b64encode(img_file.read()).decode('utf-8')
                # Check if the encoded data is reasonable size (less than 1MB to avoid oversized HTML)
                if len(img_data) < 1000000:  # Less than 1MB
                    # Replace all logo references with data URI
                    html = html.replace('src="/static/images/SKFS_logo.png"', f'src="data:image/png;base64,{img_data}"')
                    html = html.replace('src="SKFS_logo.png"', f'src="data:image/png;base64,{img_data}"')
                else:
                    print(f"Logo file too large for data URI ({len(img_data)} bytes), using original path")
        except Exception as e:
            print(f"Error converting logo to data URI: {e}")
            # Fallback: keep the original path if conversion fails
            pass
    
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
    logger.info(f"Ledger report requested - customer_id: {customer_id}, format: {format}")
    logger.info(f"Date range: {from_date} to {to_date}")
    
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
        logger.info(f"Using default date range: {from_date} to {to_date}")
    
    # Get data
    ledger_data = get_ledger_data(
        vendor_id=user.vendor_id,
        customer_id=customer_id,
        from_date=from_date,
        to_date=to_date,
        db=db
    )
    
    logger.info(f"Ledger data retrieved - customer: {ledger_data.get('customer')}, entries count: {len(ledger_data.get('entries', []))}")
    
    if not ledger_data.get("customer"):
        logger.warning(f"Customer not found for ID: {customer_id}")
        return JSONResponse(
            status_code=404,
            content={"detail": "Customer not found"}
        )
    
    # Calculate metadata
    record_count = ledger_data.get("record_count", 0)
    page_count = estimate_pdf_page_count("ledger", record_count=record_count)
    generated_at = datetime.now().isoformat()
    current_date = datetime.now().strftime("%d-%m-%Y")
    
    # Default commission is 12% (as requested)
    commission_pct = 12.0
    rows = []
    gross_total = 0
    commission_total = 0
    net_total = 0
    paid_total = 0
    balance_total = 0
    luggage_total = 0
    qty_total = 0
    coolie_total = 0
    
    logger.info(f"Processing {len(ledger_data.get('entries', []))} entries for ledger report")
    
    for entry in ledger_data.get("entries", []):
        # Calculate total amount (qty * rate)
        total_amount = float(entry.get("amount", 0))
        commission = total_amount * (commission_pct / 100)
        net = total_amount - commission
        paid = float(entry.get("paid", 0)) if entry.get("paid") is not None else 0.0
        luggage = float(entry.get("luggage", 0)) if entry.get("luggage") is not None else 0.0
        coolie = float(entry.get("coolie", 0)) if entry.get("coolie") is not None else 0.0
        
        logger.debug(f"DEBUG Ledger Entry - amount from DB: {entry.get('amount')}, total_amount: {total_amount:.2f}")
        
        # Parse quantity - handle string to float conversion properly
        try:
            qty_str = entry.get("qty", "0")
            qty = float(qty_str) if qty_str else 0.0
        except (ValueError, TypeError):
            logger.warning(f"Invalid qty value: {entry.get('qty')}, using 0.0")
            qty = 0.0
        
        balance = net - paid - luggage - coolie
        
        # Date and vehicle are already properly formatted in the data
        date_val = entry.get("date", "N/A")
        vehicle_val = entry.get("vehicle", "N/A")
        
        row_data = {
            "date": date_val,
            "vehicle": vehicle_val,
            "item_code": entry.get("item_code", "N/A"),
            "product_name": entry.get("item_name", "N/A"),
            "customer": ledger_data.get("customer", {}).get("name", "N/A"),
            "address": ledger_data.get("customer", {}).get("address", "N/A"),
            "qty": f"{qty:.2f}",
            "rate": entry.get("rate", "0"),
            "luggage": f"{luggage:.2f}",
            "coolie": f"{coolie:.2f}",
            "total": f"{total_amount:.2f}",
            "commission": f"{commission:.2f}",
            "net": f"{net:.2f}",
            "paid": f"{paid:.2f}",
            "balance": f"{balance:.2f}",
            "remarks": entry.get("remarks", "N/A")
        }
        
        logger.debug(f"Entry processed - date: {date_val}, vehicle: {vehicle_val}, total: {total_amount:.2f}, qty: {qty:.2f}")
        logger.debug(f"Row data keys: {list(row_data.keys())}, total value: {row_data['total']}")
        rows.append(row_data)
        gross_total += total_amount
        commission_total += commission
        net_total += net
        paid_total += paid
        balance_total += balance
        luggage_total += luggage
        qty_total += qty  # Add the parsed float qty
        coolie_total += coolie
    
    logger.info(f"Ledger report processing complete - {len(rows)} rows, gross_total: {gross_total:.2f}")
    
    # Get group name
    customer_obj = ledger_data.get("customer", {})
    group_name = "N/A"
    if isinstance(customer_obj, dict):
        group_name = customer_obj.get("group_name", "N/A")
    
    # Prepare template data (include fields expected by ledger_report.html)
    customer_name = customer_obj.get("name") if isinstance(customer_obj, dict) else "N/A"
    customer_address = customer_obj.get("address") if isinstance(customer_obj, dict) else "N/A"
    rem_advance_val = customer_obj.get("advance_total") if isinstance(customer_obj, dict) else "0"

    template_data = {
        "rows": rows,
        "name": customer_name,
        "address": customer_address,
        "rem_advance": rem_advance_val,
        "totals": {
            "qty": f"{qty_total:.2f}",
            "gross_total": f"{gross_total:.2f}",
            "commission_total": f"{commission_total:.2f}",
            "net_total": f"{net_total:.2f}",
            "paid_total": f"{paid_total:.2f}",
            "balance_total": f"{balance_total:.2f}",
            # Template expects `luggage` and `coolie` keys
            "luggage": f"{luggage_total:.2f}",
            "coolie": f"{coolie_total:.2f}",
            # keep legacy keys for backward compatibility
            "luggage_total": f"{luggage_total:.2f}",
            "coolie_total": f"{coolie_total:.2f}"
        },
        "group_name": group_name,
        "commission_pct": 12.0,
        "from_date": from_date.strftime("%d-%m-%Y"),
        "to_date": to_date.strftime("%d-%m-%Y"),
        "current_date": current_date,
        "date": current_date,
        "generated_at": generated_at
    }
    
    logger.info(f"Template data prepared - rows: {len(rows)}, group_name: {group_name}")
    logger.debug(f"Template data keys: {list(template_data.keys())}")
    
    # Render HTML
    try:
        logger.info(f"Rendering template: ledger_report.html")
        html_content = render_template("ledger_report.html", template_data)
        logger.info("Template rendering successful")
    except Exception as e:
        logger.error(f"Error rendering ledger report template: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Template rendering error: {str(e)}"}
        )
    
    if format.lower() == "json":
        response_data = {
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
        }
        logger.info(f"Returning JSON response - page_count: {page_count}, record_count: {record_count}")
        return JSONResponse(response_data)
    else:
        logger.info("Returning HTML response")
        return HTMLResponse(content=html_content)


# ================================================
# GROUP TOTAL REPORT (Aggregated by group)
# ================================================
@router.get("/group-total")
def get_group_total_report(
    from_date: Optional[date] = Query(None, description="Start date (defaults to month start)"),
    to_date: Optional[date] = Query(None, description="End date (defaults to today)"),
    group_name: Optional[str] = Query(None, description="Specific group name (if provided, only shows farmers in that group)"),
    format: str = Query("html", description="Response format: html or json"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Get Group Total Report with aggregated data for all groups or a specific group.
    
    Supports both HTML and JSON formats.
    
    Query Parameters:
    - from_date: Start date (optional, defaults to month start)
    - to_date: End date (optional, defaults to today)
    - group_name: Specific group name (optional, if provided shows only that group's farmers)
    - format: Response format (html|json, default: html)
    
    Returns:
    - If format=html: Rendered HTML template
    - If format=json: {html, metadata} with page and group counts
    """
    logger.info(f"Group Total report requested - format: {format}, group_name: {group_name}")
    logger.info(f"Date range: {from_date} to {to_date}")
    
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
        logger.info(f"Using default date range: {from_date} to {to_date}")
    
    # Get data
    group_data = get_group_total_data(
        vendor_id=user.vendor_id,
        from_date=from_date,
        to_date=to_date,
        db=db
    )
    
    logger.info(f"Group Total data retrieved - groups count: {group_data.get('group_count', 0)}, entries count: {len(group_data.get('entries', []))}")
    
    # Calculate metadata
    group_count = group_data.get("group_count", 0)
    page_count = estimate_pdf_page_count("group_total", group_count=group_count)
    generated_at = datetime.now().isoformat()
    current_date = datetime.now().strftime("%d-%m-%Y")
    
    # Transform groups to match template expectations - show individual farmers
    rows = []
    overall_qty = 0
    overall_amount = 0
    overall_paid = 0
    overall_balance = 0
    overall_net_amount = 0
    display_group_name = "All Groups"
    
    logger.info(f"Processing {len(group_data.get('entries', []))} entries for Group Total report")
    
    # Process entries directly - each entry represents a farmer's transaction
    # Group by farmer to get totals per farmer
    from collections import defaultdict
    farmer_totals = defaultdict(lambda: {
        'qty': 0,
        'amount': 0,
        'paid': 0,
        'commission': 0,
        'net_amount': 0,
        'group_name': '',
        'farmer_id': None
    })
    
    for entry in group_data.get("entries", []):
        farmer_id = entry.get("farmer_id")
        entry_group_name = entry.get("group_name", "N/A")
        
        # If group_name parameter is provided, filter to only that group
        if group_name and entry_group_name != group_name:
            continue
        
        if not farmer_id:
            continue
            
        qty = float(entry.get("qty", 0))
        amount = float(entry.get("amount", 0))
        paid = float(entry.get("paid", 0)) if entry.get("paid") is not None else 0.0
        
        # Calculate commission (12%)
        commission = amount * 0.12
        net = amount - commission
        
        farmer_totals[farmer_id]['qty'] += qty
        farmer_totals[farmer_id]['amount'] += amount
        farmer_totals[farmer_id]['paid'] += paid
        farmer_totals[farmer_id]['commission'] += commission
        farmer_totals[farmer_id]['net_amount'] += net
        farmer_totals[farmer_id]['group_name'] = entry_group_name
        farmer_totals[farmer_id]['farmer_id'] = farmer_id
    
    # Set display group name
    if group_name:
        display_group_name = group_name
    
    # Create rows for each farmer
    for farmer_id, data in farmer_totals.items():
        # Get farmer name from the entry
        farmer_entry = next((e for e in group_data.get("entries", []) if e.get("farmer_id") == farmer_id), None)
        farmer_name = farmer_entry.get("farmer_name", "Unknown") if farmer_entry else "Unknown"
        
        logger.debug(f"Processing farmer: {farmer_name} (ID: {farmer_id})")
        
        # Add row for this farmer
        row_data = {
            "farmer_name": farmer_name,
            "total_net_amount": f"{data['net_amount']:.2f}",
            "paid_amount": f"{data['paid']:.2f}",
            "ledger_no": str(farmer_id),  # Use farmer ID as ledger number
            "group_name": data['group_name']  # Include group name for display
        }
        
        logger.debug(f"Farmer row created - {farmer_name}: net={data['net_amount']:.2f}, paid={data['paid']:.2f}")
        
        rows.append(row_data)
        overall_qty += data['qty']
        overall_amount += data['amount']
        overall_paid += data['paid']
        overall_net_amount += data['net_amount']
        overall_balance += (data['net_amount'] - data['paid'])
    
    logger.info(f"Group Total processing complete - {len(rows)} farmers, overall_net_amount: {overall_net_amount:.2f}")
    
    # Log first few rows for debugging
    if rows:
        logger.info(f"First row sample: {rows[0]}")
        logger.info(f"Group name being sent: {display_group_name}")
        logger.info(f"Total paid across all rows: {overall_paid:.2f}")
    
    # Prepare template data with ALL required fields
    template_data = {
        "rows": rows,
        "group_name": display_group_name,  # Show specific group name or "All Groups"
        "overall_qty": f"{overall_qty:.2f}",
        "overall_amount": f"{overall_amount:.2f}",
        "overall_paid": f"{overall_paid:.2f}",
        "overall_net_amount": f"{overall_net_amount:.2f}",
        "overall_balance": f"{overall_balance:.2f}",
        "from_date": from_date.strftime("%d-%m-%Y"),
        "to_date": to_date.strftime("%d-%m-%Y"),
        "current_date": current_date,
        "generated_at": generated_at,
        "group_count": len(farmer_totals)
    }
    
    logger.info(f"Template data prepared - rows count: {len(rows)}, keys: {list(template_data.keys())}")
    
    # Render HTML
    try:
        logger.info(f"Rendering template: group_total_report.html")
        html_content = render_template("group_total_report.html", template_data)
        logger.info("Template rendering successful")
    except Exception as e:
        logger.error(f"Error rendering group total report template: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Template rendering error: {str(e)}"}
        )
    
    if format.lower() == "json":
        response_data = {
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
        }
        logger.info(f"Returning JSON response - page_count: {page_count}, record_count: {group_count}")
        return JSONResponse(response_data)
    else:
        logger.info("Returning HTML response")
        return HTMLResponse(content=html_content)


# ================================================
# GROUP TOTAL REPORT BY SPECIFIC GROUP NAME
# ================================================
@router.get("/group-total-by-group")
def get_group_total_report_by_group(
    start_date: Optional[date] = Query(None, description="Start date for the report"),
    end_date: Optional[date] = Query(None, description="End date for the report"),
    group_name: Optional[str] = Query(None, description="Name of the specific group"),
    format: str = Query("html", description="Response format: html or json"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Get Group Total Report for a specific group within a date range.
    
    Calculates for each customer in the group:
    - Total Quantity
    - Total Price
    - Total Commission
    - Total Luggage
    - Total Net Amount
    
    Query Parameters:
    - start_date: Start date for the report
    - end_date: End date for the report
    - group_name: Name of the specific group
    - format: Response format (html|json, default: html)
    
    Returns:
    - If format=html: Rendered HTML template from group_total_report.html
    - If format=json: {html, metadata} with page and record counts
    """
    logger.info(f"Group Total by Group report requested - group_name: {group_name}, format: {format}")
    logger.info(f"Date range: {start_date} to {end_date}")
    
    # Validate required parameters
    if not group_name:
        logger.warning("group_name parameter is required")
        return JSONResponse(
            status_code=400,
            content={"detail": "group_name parameter is required"}
        )
    
    # Set default dates if not provided
    if start_date is None or end_date is None:
        start_date, end_date = get_default_date_range()
        logger.info(f"Using default date range: {start_date} to {end_date}")
    
    # Get group by name for the specific vendor
    group = db.query(FarmerGroup).filter(
        FarmerGroup.name == group_name,
        FarmerGroup.vendor_id == user.vendor_id
    ).first()
    
    if not group:
        logger.warning(f"Group '{group_name}' not found for vendor_id: {user.vendor_id}")
        return JSONResponse(
            status_code=404,
            content={"detail": f"Group '{group_name}' not found"}
        )
    
    logger.info(f"Found group: {group.name} (ID: {group.id})")
    
    # Query collection items for this group's farmers within the date range
    # Include luggage (transport_cost), coolie_cost, and farmer address
    try:
        results = db.query(
            Farmer.id.label("farmer_id"),
            Farmer.name.label("farmer_name"),
            Farmer.address.label("farmer_address"),  # Add farmer address
            
            CollectionItem.date,
            CollectionItem.vehicle_name,
            CollectionItem.vehicle_number,
            CollectionItem.qty_kg,
            CollectionItem.rate_per_kg,
            CollectionItem.paid_amount,
            CollectionItem.transport_cost.label("luggage"),  # Add luggage
            CollectionItem.coolie_cost.label("coolie")  # Add coolie
        ).join(
            CollectionItem, CollectionItem.farmer_id == Farmer.id
        ).filter(
            Farmer.group_id == group.id,
            CollectionItem.vendor_id == user.vendor_id,
            CollectionItem.date >= start_date,
            CollectionItem.date <= end_date
        ).order_by(
            Farmer.name.asc(),
            CollectionItem.date.asc()
        ).all()
    except Exception as e:
        print(f"Error executing query for group total by group: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Database query error: {str(e)}"}
        )
    
    # Calculate data for each customer in the group
    from collections import defaultdict
    customer_data = defaultdict(lambda: {
        'total_qty': Decimal("0"),
        'total_price': Decimal("0"),
        'total_paid': Decimal("0"),
        'total_commission': Decimal("0"),
        'total_luggage': Decimal("0"),
        'total_coolie': Decimal("0"),  # Add coolie tracking
        'total_net_amount': Decimal("0"),
        'transaction_count': 0,
        'farmer_address': ''  # Store farmer address
    })
    
    logger.info(f"Processing {len(results)} collection items for group: {group_name}")
    
    # Process results to aggregate data by customer
    for row in results:
        farmer_key = row.farmer_id
        qty = Decimal(str(row.qty_kg or 0))
        rate = Decimal(str(row.rate_per_kg or 0))
        price = qty * rate
        paid = Decimal(str(row.paid_amount or 0))
        
        # Get luggage and coolie - handle both per-unit and total scenarios
        luggage_per_unit = Decimal(str(row.luggage or 0))
        luggage_total = luggage_per_unit * qty  # Luggage total = luggage rate × qty
        
        coolie_per_entry = Decimal(str(row.coolie or 0))  # Coolie is typically per entry
        
        # Calculate commission (using default 12%)
        commission = (price * Decimal("12") / 100).quantize(Decimal("0.01"))
        net_amount = price - commission
        
        logger.debug(f"Processing farmer {row.farmer_name} (ID: {farmer_key}) - qty: {qty}, price: {price}")
        
        # Update customer data
        customer_data[farmer_key]['total_qty'] += qty
        customer_data[farmer_key]['total_price'] += price
        customer_data[farmer_key]['total_paid'] += paid
        customer_data[farmer_key]['total_commission'] += commission
        customer_data[farmer_key]['total_net_amount'] += net_amount
        customer_data[farmer_key]['total_luggage'] += luggage_total  # Add luggage total
        customer_data[farmer_key]['total_coolie'] += coolie_per_entry  # Add coolie
        customer_data[farmer_key]['transaction_count'] += 1
        
        # Store farmer address (same for all entries of this farmer)
        if not customer_data[farmer_key]['farmer_address'] and hasattr(row, 'farmer_address'):
            customer_data[farmer_key]['farmer_address'] = row.farmer_address or ''
    
    # Prepare rows for the template (one row per customer)
    rows = []
    overall_qty = Decimal("0")
    overall_price = Decimal("0")  # Total price before commission
    overall_commission = Decimal("0")
    overall_net_amount = Decimal("0")  # Net amount after commission
    overall_paid = Decimal("0")
    overall_luggage = Decimal("0")
    
    logger.info(f"Creating {len(customer_data)} customer rows for template")
    
    for farmer_id, data in customer_data.items():
        # Get farmer name and address
        farmer = next((r for r in results if r.farmer_id == farmer_id), None) if results else None
        farmer_name = farmer.farmer_name if farmer else "Unknown"
        farmer_address = data['farmer_address'] or (farmer.farmer_address if farmer and hasattr(farmer, 'farmer_address') else "N/A")
        
        row_data = {
            "group_name": group_name,  # This is what the template expects
            "customer_count": 1,  # Each row represents one customer
            "farmer_name": farmer_name,
            "address": farmer_address,  # Add farmer address
            "total_qty": f"{data['total_qty']:.2f}",
            "total_price": f"{data['total_price']:.2f}",
            "total_commission": f"{data['total_commission']:.2f}",
            "total_luggage": f"{data['total_luggage']:.2f}",  # Now includes actual luggage total
            "total_coolie": f"{data['total_coolie']:.2f}",  # Now includes actual coolie total
            "total_net_amount": f"{data['total_net_amount']:.2f}",
            "paid_amount": f"{data['total_paid']:.2f}",  # Template expects paid_amount
            "total_paid": f"{data['total_paid']:.2f}",  # Keep for backward compatibility
            "total_amount": f"{data['total_net_amount']:.2f}"  # Using net amount for display
        }
        
        logger.debug(f"Customer row created - {farmer_name}: qty={data['total_qty']:.2f}, net_amount={data['total_net_amount']:.2f}")
        
        rows.append(row_data)
        overall_qty += data['total_qty']
        overall_price += data['total_price']  # Total price before commission
        overall_commission += data['total_commission']
        overall_net_amount += data['total_net_amount']
        overall_paid += data['total_paid']
        overall_luggage += data['total_luggage']
    
    logger.info(f"Group Total by Group processing complete - {len(rows)} customers, overall_qty: {overall_qty}")
    
    # Calculate metadata
    customer_count = len(customer_data)
    try:
        page_count = estimate_pdf_page_count("group_total", group_count=customer_count)
    except Exception as e:
        print(f"Error calculating page count: {e}")
        page_count = 1  # Default to 1 page if calculation fails
    generated_at = datetime.now().isoformat()
    current_date = datetime.now().strftime("%d-%m-%Y")
    
    # Prepare template data - adjust to match what the existing template expects
    try:
        template_data = {
            "rows": rows,
            "group_name": group_name,  # Add group name for header display
            "overall_qty": f"{overall_qty:.2f}",
            "overall_amount": f"{overall_price:.2f}",  # Total price
            "overall_commission": f"{overall_commission:.2f}",  # Total commission
            "overall_luggage": f"{overall_luggage:.2f}",  # Total luggage
            "overall_net_amount": f"{overall_net_amount:.2f}",  # Net amount after commission
            "overall_paid": f"{overall_paid:.2f}",
            "overall_balance": f"{(overall_net_amount - overall_paid):.2f}",  # Balance calculation
            "from_date": start_date.strftime("%d-%m-%Y") if start_date else "",
            "to_date": end_date.strftime("%d-%m-%Y") if end_date else "",
            "current_date": current_date,
            "generated_at": generated_at,
            "group_count": customer_count  # Number of customers in the group
        }
        
        logger.info(f"Template data prepared for group {group_name} - rows: {len(rows)}, overall_qty: {overall_qty:.2f}")
        logger.debug(f"Template data keys: {list(template_data.keys())}")
        
    except Exception as e:
        logger.error(f"Error preparing template data: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Template data preparation error: {str(e)}"}
        )
    
    # Render HTML using the existing template
    try:
        logger.info(f"Rendering template: group_total_report.html for group {group_name}")
        html_content = render_template("group_total_report.html", template_data)
        logger.info("Template rendering successful")
    except Exception as e:
        logger.error(f"Error rendering group total report by group template: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Template rendering error: {str(e)}"}
        )
    
    if format.lower() == "json":
        response_data = {
            "html": html_content,
            "metadata": {
                "page_count": page_count,
                "record_count": customer_count,
                "report_type": "group_total",
                "paper_size": "A4",
                "generated_at": generated_at,
                "date_range": {
                    "from": start_date.isoformat(),
                    "to": end_date.isoformat()
                },
                "group_name": group_name
            }
        }
        logger.info(f"Returning JSON response - page_count: {page_count}, record_count: {customer_count}, group_name: {group_name}")
        return JSONResponse(response_data)
    else:
        logger.info("Returning HTML response")
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
    logger.info(f"Group Patti report requested - group_id: {group_id}, format: {format}")
    logger.info(f"Date range: {from_date} to {to_date}")
    
    if from_date is None or to_date is None:
        from_date, to_date = get_default_date_range()
        logger.info(f"Using default date range: {from_date} to {to_date}")
    
    # Get data
    patti_data = get_group_patti_data(
        vendor_id=user.vendor_id,
        group_id=group_id,
        from_date=from_date,
        to_date=to_date,
        db=db
    )
    
    logger.info(f"Group Patti data retrieved - group: {patti_data.get('group')}, farmers count: {patti_data.get('farmer_count', 0)}, entries count: {patti_data.get('entry_count', 0)}")
    
    # Set commission default to 12 if missing or 0
    commission_pct = 12.0
    group_commission = patti_data.get("group", {}).get("commission_percent")
    try:
        group_commission = float(group_commission)
        if group_commission > 0:
            commission_pct = group_commission
            logger.info(f"Using group commission rate: {commission_pct}%")
    except (TypeError, ValueError):
        logger.info(f"Using default commission rate: {commission_pct}%")
        pass
    
    if not patti_data.get("group"):
        logger.warning(f"Group not found for ID: {group_id}")
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
    grand_total_luggage = 0
    grand_total_coolie = 0
    
    # Summary rows for the summary table
    summary_rows = []
    summary_qty = 0
    summary_amount = 0
    summary_paid = 0
    summary_balance = 0
    summary_luggage = 0
    summary_coolie = 0
    
    logger.info(f"Processing {len(patti_data.get('farmers', []))} farmers for Group Patti report")
    
    for farmer in patti_data.get("farmers", []):
        farmer_name = farmer.get("name", "Unknown")
        farmer_id = farmer.get("id", 0)
        farmer_address = farmer.get("address", "N/A")
        
        logger.debug(f"Processing farmer: {farmer_name} (ID: {farmer_id})")
        
        # Transform entries (from reports_db) to transactions (for template)
        transactions = []
        farmer_qty = 0
        farmer_amount = 0
        farmer_paid = 0
        farmer_balance = 0
        farmer_luggage = 0
        farmer_coolie = 0
        
        for entry in farmer.get("entries", []):
            # Parse quantity - handle string to float conversion properly
            try:
                qty_str = entry.get("qty", "0")
                qty = float(qty_str) if qty_str else 0.0
            except (ValueError, TypeError):
                logger.warning(f"Invalid qty value in group patti: {entry.get('qty')}, using 0.0")
                qty = 0.0
            
            rate = float(entry.get("rate", 0))
            # Use the pre-calculated amount from the database instead of recalculating
            total = float(entry.get("amount", 0))
            paid = float(entry.get("paid", 0))  # Get paid amount from the entry
            luggage = float(entry.get("luggage", 0))
            coolie = float(entry.get("coolie", 0))
            
            # Get vehicle info - entries from get_group_patti_data now have proper date/vehicle fields
            vehicle = entry.get("vehicle_name", entry.get("vehicle", "N/A"))
            # Date is already formatted as DD-MM-YYYY from reports_db
            date_val = entry.get("date", "N/A")
            
            transaction_data = {
                "date": date_val,
                "vehicle": vehicle,
                "item_code": entry.get("item_code", "N/A"),
                "product_name": entry.get("item_name", "N/A"),
                "qty": f"{qty:.2f}",
                "rate": f"{rate:.2f}",
                "luggage": f"{luggage:.2f}",
                "coolie": f"{coolie:.2f}",
                "total": f"{total:.2f}",
                "paid": f"{paid:.2f}",
                "amount": f"{(total - paid - luggage - coolie):.2f}",
                "remarks": entry.get("remarks", "N/A")
            }
            
            transactions.append(transaction_data)
            farmer_qty += qty
            farmer_amount += total
            farmer_paid += paid
            farmer_luggage += luggage
            farmer_coolie += coolie
        
        # Calculate commission based on commission percentage
        farmer_commission = farmer_amount * (commission_pct / 100)
        farmer_net_amount = farmer_amount - farmer_commission
        farmer_final_total = farmer_net_amount - farmer_paid - farmer_luggage - farmer_coolie
        
        # Get remaining advance for this farmer from advances table
        adv_sum = db.query(func.coalesce(func.sum(Advance.amount), 0)).filter(
            Advance.vendor_id == user.vendor_id,
            Advance.farmer_id == farmer_id
        ).scalar() or 0
        
        customer_data = {
            "id": farmer_id,
            "name": farmer_name,
            "address": farmer_address,
            "ledger_name": farmer.get("code", "N/A"),
            "balance": f"{adv_sum:.2f}",  # Remaining Advance (sum of advances given)
            "transactions": transactions,
            "total_qty": f"{farmer_qty:.2f}",
            "total_amount": f"{farmer_amount:.2f}",
            "commission": f"{farmer_commission:.2f}",
            "luggage_total": f"{farmer_luggage:.2f}",
            "coolie_total": f"{farmer_coolie:.2f}",
            "net_amount": f"{farmer_net_amount:.2f}",
            "paid_amount": f"{farmer_paid:.2f}",
            "final_total": f"{farmer_final_total:.2f}"
        }
        
        summary_data = {
            "customer": farmer_name,
            "address": farmer_address,
            "qty": f"{farmer_qty:.2f}",
            "total": f"{farmer_amount:.2f}",
            "luggage": f"{farmer_luggage:.2f}",
            "coolie": f"{farmer_coolie:.2f}",
            "paid": f"{farmer_paid:.2f}",
            "balance": f"{farmer_balance:.2f}"
        }
        
        logger.debug(f"Farmer {farmer_name} processed - qty: {farmer_qty:.2f}, amount: {farmer_amount:.2f}")
        
        customers.append(customer_data)
        summary_rows.append(summary_data)
        grand_total_qty += farmer_qty
        grand_total_amount += farmer_amount
        grand_total_paid += farmer_paid
        grand_total_balance += farmer_balance
        grand_total_luggage += farmer_luggage
        grand_total_coolie += farmer_coolie
        summary_qty += farmer_qty
        summary_amount += farmer_amount
        summary_paid += farmer_paid
        summary_balance += farmer_balance
        summary_luggage += farmer_luggage
        summary_coolie += farmer_coolie
    
    logger.info(f"Group Patti processing complete - {len(customers)} customers, grand_total_qty: {grand_total_qty:.2f}")
    
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
        "commission_pct": commission_pct,
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
    try:
        logger.info(f"Rendering template: group_patti_report.html")
        html_content = render_template("group_patti_report.html", template_data)
        logger.info("Template rendering successful")
    except Exception as e:
        logger.error(f"Error rendering group patti report template: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Template rendering error: {str(e)}"}
        )
    
    if format.lower() == "json":
        response_data = {
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
        }
        logger.info(f"Returning JSON response - page_count: {page_count}, record_count: {entry_count}, farmer_count: {farmer_count}")
        return JSONResponse(response_data)
    else:
        logger.info("Returning HTML response")
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
    - If format=json: {data, metadata} with page and record counts
    """
    try:
        logger.info(f"Daily Sales report requested - format: {format}, item_name: {item_name}")
        logger.info(f"Date range: {from_date} to {to_date}")
        
        if from_date is None or to_date is None:
            from_date, to_date = get_default_date_range()
            logger.info(f"Using default date range: {from_date} to {to_date}")
        
        # Get data with error handling
        logger.info(f"DAILY SALES REQUEST - vendor_id: {user.vendor_id}, from_date: {from_date}, to_date: {to_date}")
        
        try:
            sales_data = get_daily_sales_data(
                vendor_id=user.vendor_id,
                from_date=from_date,
                to_date=to_date,
                item_name=item_name,
                db=db
            )
            logger.info(f"Daily sales data retrieved - record_count: {sales_data.get('record_count', 0)}")
            
            # Debug: Log if empty data is returned
            if sales_data.get('record_count', 0) == 0:
                logger.warning(f"DAILY SALES RETURNED EMPTY - Request details: vendor_id={user.vendor_id}, from={from_date}, to={to_date}")
                logger.warning(f"Check backend logs above for DEBUG messages about available data")
        except Exception as db_error:
            logger.error(f"Database error fetching daily sales: {db_error}")
            return JSONResponse(
                status_code=500,
                content={"detail": f"Database error: {str(db_error)}"}
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
        total_luggage = 0
        total_coolie = 0
        total_paid = 0
        
        logger.info(f"Processing {len(sales_data.get('entries', []))} entries")
        
        # Log first few entries for debugging
        if sales_data.get('entries'):
            sample_entry = sales_data['entries'][0] if sales_data['entries'] else {}
            logger.info(f"Sample entry keys: {list(sample_entry.keys()) if isinstance(sample_entry, dict) else 'Not a dict'}")
            logger.debug(f"Sample entry data: {sample_entry}")
        
        for idx, entry in enumerate(sales_data.get("entries", [])):
            try:
                # Log first 3 entries for debugging
                if idx < 3:
                    logger.debug(f"Processing entry {idx}: party_name={entry.get('party_name')}, party={entry.get('party')}, item_name={entry.get('item_name')}, item={entry.get('item')}")
                
                # Safely extract and convert numeric values
                qty_val = entry.get("qty", "0")
                rate_val = entry.get("rate", "0")
                
                # Convert to float safely
                try:
                    qty = float(qty_val) if qty_val is not None else 0.0
                except (ValueError, TypeError):
                    qty = 0.0
                
                try:
                    rate = float(rate_val) if rate_val is not None else 0.0
                except (ValueError, TypeError):
                    rate = 0.0
                
                # Calculate total safely
                total = qty * rate
                
                # Format date properly
                entry_date = entry.get("date", "")
                if isinstance(entry_date, str):
                    # If ISO format (YYYY-MM-DD), keep it; if has T (ISO datetime), extract date part
                    entry_date = entry_date.split("T")[0] if "T" in entry_date else entry_date
                
                # Get vehicle info safely
                vehicle_val = entry.get("vehicle")
                if not vehicle_val:
                    vehicle_val = entry.get("vehicle_name")
                if not vehicle_val:
                    vehicle_val = "N/A"
                
                # Extract luggage, coolie, paid safely
                luggage_val = float(entry.get('luggage', 0)) if entry.get('luggage') is not None else 0.0
                coolie_val = float(entry.get('coolie', 0)) if entry.get('coolie') is not None else 0.0
                paid_val = float(entry.get('paid', 0)) if entry.get('paid') is not None else 0.0
                
                luggage_str = f"{luggage_val:.2f}"
                coolie_str = f"{coolie_val:.2f}"
                paid_str = f"{paid_val:.2f}"
                
                # Get all required fields safely - ensure ALL fields are populated
                row_data = {
                    "date": entry_date or "",
                    "vehicle": vehicle_val,
                    # Backend returns party_name, frontend expects party - map correctly
                    "party": entry.get("party_name") or entry.get("party") or "N/A",
                    "address": entry.get("party_address") or "N/A",
                    "item_code": entry.get("item_code") or "N/A",
                    "product_name": entry.get("item_name") or entry.get("item") or "N/A",
                    "qty": f"{qty:.2f}",
                    "rate": f"{rate:.2f}",
                    "luggage": luggage_str,
                    "coolie": coolie_str,
                    "paid": paid_str,
                    "total": f"{total:.2f}"
                }
                
                rows.append(row_data)
                total_qty += qty
                total_amount += total
                # Parse back to float for totals
                try:
                    total_luggage += float(luggage_str)
                    total_coolie += float(coolie_str)
                    total_paid += float(paid_str)
                except (ValueError, TypeError):
                    pass
                
            except Exception as entry_error:
                logger.warning(f"Error processing entry: {entry_error}, entry: {entry}")
                # Skip this entry and continue
                continue
        
        logger.info(f"Processed {len(rows)} rows successfully")
        
        # Prepare template data
        template_data = {
            "rows": rows,
            "total_qty": f"{total_qty:.2f}",
            "total_amount": f"{total_amount:.2f}",
            "from_date": from_date.strftime("%d-%m-%Y"),
            "to_date": to_date.strftime("%d-%m-%Y"),
            "current_date": current_date,
            "generated_at": generated_at,
            "item_filter": item_name or "All Items",
            "totals": {
                "record_count": len(rows),
                "total_qty": f"{total_qty:.2f}",
                "total_amount": f"{total_amount:.2f}",
                "total_luggage": f"{total_luggage:.2f}",
                "total_coolie": f"{total_coolie:.2f}",
                "total_paid": f"{total_paid:.2f}"
            }
        }
        
        # Render HTML
        try:
            html_content = render_template("daily_sales_report.html", template_data)
            logger.info("Template rendering successful")
        except Exception as render_error:
            logger.error(f"Error rendering daily sales report template: {render_error}")
            return JSONResponse(
                status_code=500,
                content={"detail": f"Template rendering error: {str(render_error)}"}
            )
        
        if format.lower() == "json":
            response_data = {
                "data": rows,  # Return the actual data array
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
            }
            logger.info(f"Returning JSON response - {len(rows)} rows")
            return JSONResponse(response_data)
        else:
            logger.info("Returning HTML response")
            return HTMLResponse(content=html_content)
            
    except Exception as e:
        logger.error(f"Unexpected error in daily-sales endpoint: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(e)}"}
        )


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
