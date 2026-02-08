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
    ) -> HTMLResponse:
        """Generate HTML for ledger report"""
        template = env.get_template("ledger_report.html")
        content = template.render(
            farmer_name=farmer_name,
            ledger_name=ledger_name,
            address=address,
            group_name=group_name,
            balance=f"{balance:.2f}",
            commission_pct=f"{commission_pct:.1f}",
            from_date=from_date,
            to_date=to_date,
            report_date=datetime.now().strftime("%d-%m-%Y"),
            report_datetime=datetime.now().strftime("%d-%m-%Y %H:%M:%S"),
            rows=rows,
            total_qty=f"{total_qty:.2f}",
            total_amount=f"{total_amount:.2f}",
            commission=f"{commission:.2f}",
            luggage_total=f"{luggage_total:.2f}",
            coolie=f"{coolie:.2f}",
            net_amount=f"{net_amount:.2f}",
            paid_amount=f"{paid_amount:.2f}",
            final_total=f"{final_total:.2f}",
        )
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
        return HTMLResponse(content=content)