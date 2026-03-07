import os
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from fastapi.responses import HTMLResponse

# Get the base directory of the project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static", "print")

# Initialize Jinja2 environment
env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))


class PrintService:
    """Service for generating standardized HTML print templates"""
    
    @staticmethod
    def render_ledger_report(
        farmer_name: str,
        ledger_name: str,
        address: str,
        group_name: str,
        balance: float,
        commission_pct: float,
        from_date: str,
        to_date: str,
        rows: list,
        total_qty: float,
        total_amount: float,
        commission: float,
        luggage_total: float,
        coolie: float,
        net_amount: float,
        paid_amount: float,
        final_total: float,
        rem_advance: str = "0.00",
    ) -> HTMLResponse:
        """Generate HTML for ledger report.

        This method maps the older `print_templates` row structure to the
        `ledger_report.html` template expected variable names so both routes
        (`/reports/ledger/...` and `/print/ledger-report`) render correctly.
        """
        template = env.get_template("ledger_report.html")

        # Map incoming rows (which may use different keys) to template expected keys
        mapped_rows = []
        for r in rows:
            mapped_rows.append({
                "date": r.get("date") or r.get("date_str") or "N/A",
                "vehicle": r.get("vehicle") or r.get("vehicle_name") or "N/A",
                "product_name": r.get("product_name") or r.get("item_name") or r.get("ledger_name") or "",
                "qty": r.get("qty") or r.get("qty") or "0",
                "rate": r.get("price") or r.get("rate") or r.get("rate_per_kg") or "0",
                "luggage": r.get("luggage") or r.get("transport_cost") or "0",
                "gross": r.get("total") or r.get("amount") or "0",
                "paid": r.get("paid") or r.get("paid_amount") or "0",
            })

        # Prepare totals dictionary matching ledger template expectations
        totals = {
            "qty": f"{float(total_qty):.2f}" if total_qty is not None else "0.00",
            "luggage": f"{float(luggage_total):.2f}" if luggage_total is not None else "0.00",
            "coolie": f"{float(coolie):.2f}" if coolie is not None else "0.00",
            "gross_total": f"{float(total_amount):.2f}" if total_amount is not None else "0.00",
            "commission_total": f"{float(commission):.2f}" if commission is not None else "0.00",
            "net_total": f"{float(net_amount):.2f}" if net_amount is not None else "0.00",
            "paid_total": f"{float(paid_amount):.2f}" if paid_amount is not None else "0.00",
            "balance_total": f"{float(final_total):.2f}" if final_total is not None else "0.00",
        }

        template_data = {
            "rows": mapped_rows,
            "name": farmer_name,
            "address": address,
            "rem_advance": rem_advance,
            "totals": totals,
            "group_name": group_name,
            "commission_pct": f"{commission_pct:.1f}",
            "from_date": from_date,
            "to_date": to_date,
            "date": datetime.now().strftime("%d-%m-%Y"),
            "generated_at": datetime.now().isoformat(),
        }

        content = template.render(**template_data)
        
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
        
        # Insert print button before </body> tag
        content = content.replace('</body>', print_button_html + auto_print_script + '</body>')
        
        return HTMLResponse(content=content)
    
    @staticmethod
    def render_group_patti_report(
        group_name: str,
        from_date: str,
        to_date: str,
        commission_pct: float,
        customer_reports: list,
        group_total: float,
    ) -> HTMLResponse:
        """Generate HTML for group patti report with individual customer reports"""
        template = env.get_template("group_patti_report.html")
        content = template.render(
            group_name=group_name,
            from_date=from_date,
            to_date=to_date,
            commission_pct=f"{commission_pct:.1f}",
            report_date=datetime.now().strftime("%d-%m-%Y"),
            report_datetime=datetime.now().strftime("%d-%m-%Y %H:%M:%S"),
            customer_reports=customer_reports,
            group_total=f"{group_total:.2f}",
        )
        
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
        
        # Insert print button before </body> tag
        content = content.replace('</body>', print_button_html + auto_print_script + '</body>')
        
        return HTMLResponse(content=content)
    
    @staticmethod
    def render_group_total_report(
        group_name: str,
        from_date: str,
        to_date: str,
        rows: list,
        total_qty: float,
        total_amount: float,
        total_paid: float,
        total_luggage: float,
        group_total: float,
    ) -> HTMLResponse:
        """Generate HTML for group total report"""
        template = env.get_template("group_total_report.html")
        content = template.render(
            group_name=group_name,
            from_date=from_date,
            to_date=to_date,
            report_date=datetime.now().strftime("%d-%m-%Y"),
            rows=rows,
            total_qty=f"{total_qty:.2f}",
            total_amount=f"{total_amount:.2f}",
            total_paid=f"{total_paid:.2f}",
            total_luggage=f"{total_luggage:.2f}",
            group_total=f"{group_total:.2f}",
        )
        
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
        
        # Insert print button before </body> tag
        content = content.replace('</body>', print_button_html + auto_print_script + '</body>')
        
        return HTMLResponse(content=content)
    
    @staticmethod
    def render_daily_sales_report(
        from_date: str,
        to_date: str,
        item_name: str,
        rows: list,
        total_qty: float,
        total_amount: float,
    ) -> HTMLResponse:
        """Generate HTML for daily sales report"""
        template = env.get_template("daily_sales_report.html")
        content = template.render(
            from_date=from_date,
            to_date=to_date,
            item_name=item_name,
            report_date=datetime.now().strftime("%d-%m-%Y"),
            rows=rows,
            total_qty=f"{total_qty:.2f}",
            total_amount=f"{total_amount:.2f}",
        )
        
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
        
        # Insert print button before </body> tag
        content = content.replace('</body>', print_button_html + auto_print_script + '</body>')
        
        return HTMLResponse(content=content)