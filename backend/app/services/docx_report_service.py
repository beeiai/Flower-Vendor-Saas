import os
from datetime import datetime
from typing import List, Dict, Any
from docxtpl import DocxTemplate
import tempfile
from fastapi import HTTPException
from fastapi.responses import Response

# Get the base directory of the project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
TEMPLATE_DIR = os.path.join(BASE_DIR, "app", "templates")
CUSTOM_TEMPLATE_PATH = os.path.join(TEMPLATE_DIR, "Report_template.docx")


class DocxReportService:
    """Simplified service for generating DOCX reports with PDF conversion"""
    
    @staticmethod
    def generate_ledger_pdf(
        farmer_name: str,
        ledger_name: str,
        address: str,
        group_name: str,
        balance: float,
        commission_pct: float,
        from_date: str,
        to_date: str,
        rows: List[Dict[str, Any]],
        total_qty: float,
        total_amount: float,
        commission: float,
        luggage_total: float,
        coolie: float,
        net_amount: float,
        paid_amount: float,
        final_total: float
    ) -> Response:
        """Generate PDF ledger report using DOCX template"""
        try:
            # Use your custom template
            template_path = CUSTOM_TEMPLATE_PATH
            
            # Ensure template directory exists
            os.makedirs(TEMPLATE_DIR, exist_ok=True)
            
            # Check if custom template exists
            if not os.path.exists(template_path):
                raise HTTPException(status_code=500, detail=f"Custom template not found at {template_path}. Please upload Report_template.docx to the templates directory.")
            
            # Load template
            doc = DocxTemplate(template_path)
            
            # Prepare context with proper formatting
            context = {
                'shop_name': 'SREE KRISHNA FLOWER STALL',
                'phone': '8147848760',
                'proprietor': 'K.C.N & SONS',
                'mobile': '9972878307',
                'business_type': 'FLOWER MERCHANTS – 7795018307',
                'shop_address': 'Shop No: B-32, S.K.R Market, Bangalore - 560002',
                'trademark': 'S.K.F.S',
                'farmer_name': farmer_name,
                'ledger_name': ledger_name,
                'address': address,
                'group_name': group_name,
                'balance': f"{balance:,.2f}",
                'from_date': from_date,
                'to_date': to_date,
                'current_date': datetime.now().strftime("%d-%m-%Y"),
                'rows': rows,
                'total_qty': f"{total_qty:,.2f}",
                'total_amount': f"{total_amount:,.2f}",
                'commission_value': f"{commission:,.2f}",
                'luggage_total': f"{luggage_total:,.2f}",
                'coolie': f"{coolie:,.2f}",
                'net_amount': f"{net_amount:,.2f}",
                'paid_amount': f"{paid_amount:,.2f}",
                'final_total': f"{final_total:,.2f}",
                'commission_pct': commission_pct
            }
            
            # Render template
            doc.render(context)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp_file:
                doc.save(tmp_file.name)
                temp_path = tmp_file.name
            
            # For now, return DOCX file (in production, convert to PDF)
            with open(temp_path, 'rb') as f:
                content = f.read()
            
            # Clean up
            os.unlink(temp_path)
            
            # Return as downloadable file
            return Response(
                content=content,
                media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                headers={
                    'Content-Disposition': f'attachment; filename="ledger_report_{farmer_name}_{datetime.now().strftime("%Y%m%d")}.docx"'
                }
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
    
    @staticmethod
    def generate_group_patti_pdf(
        group_name: str,
        from_date: str,
        to_date: str,
        commission_pct: float,
        rows: List[Dict[str, Any]],
        totals: Dict[str, float]
    ) -> Response:
        """Generate PDF group patti report"""
        try:
            # Use your custom template for group patti as well
            template_path = CUSTOM_TEMPLATE_PATH
            os.makedirs(TEMPLATE_DIR, exist_ok=True)
            
            if not os.path.exists(template_path):
                raise HTTPException(status_code=500, detail=f"Custom template not found at {template_path}. Please upload Report_template.docx to the templates directory.")
            
            doc = DocxTemplate(template_path)
            
            context = {
                'shop_name': 'SREE KRISHNA FLOWER STALL',
                'group_name': group_name,
                'from_date': from_date,
                'to_date': to_date,
                'commission_pct': commission_pct,
                'current_date': datetime.now().strftime("%d-%m-%Y"),
                'rows': rows,
                'total_gross': f"{totals.get('gross', 0):,.2f}",
                'total_commission': f"{totals.get('commission', 0):,.2f}",
                'total_net': f"{totals.get('net', 0):,.2f}",
                'total_paid': f"{totals.get('paid', 0):,.2f}",
                'total_balance': f"{totals.get('balance', 0):,.2f}"
            }
            
            doc.render(context)
            
            with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp_file:
                doc.save(tmp_file.name)
                temp_path = tmp_file.name
            
            with open(temp_path, 'rb') as f:
                content = f.read()
            
            os.unlink(temp_path)
            
            return Response(
                content=content,
                media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                headers={
                    'Content-Disposition': f'attachment; filename="group_patti_{group_name}_{datetime.now().strftime("%Y%m%d")}.docx"'
                }
            )
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate group patti report: {str(e)}")
    
    @staticmethod
    def generate_group_total_pdf(
        group_name: str,
        from_date: str,
        to_date: str,
        rows: List[Dict[str, Any]],
        total_qty: float,
        total_amount: float,
        total_paid: float,
        total_luggage: float,
        group_total: float,
    ) -> Response:
        """Generate PDF group total report using DOCX template"""
        try:
            # Use your custom template for group total as well
            template_path = CUSTOM_TEMPLATE_PATH
            os.makedirs(TEMPLATE_DIR, exist_ok=True)
            
            if not os.path.exists(template_path):
                raise HTTPException(status_code=500, detail=f"Custom template not found at {template_path}. Please upload Report_template.docx to the templates directory.")
            
            doc = DocxTemplate(template_path)
            
            # Prepare context for template
            context = {
                "shop_name": "SREE KRISHNA FLOWER STALL",
                "phone": "8147848760",
                "proprietor": "K.C.N & SONS",
                "mobile": "9972878307",
                "business_type": "FLOWER MERCHANTS – 7795018307",
                "shop_address": "Shop No: B-32, S.K.R Market, Bangalore - 560002",
                "trademark": "S.K.F.S",
                "group_name": group_name,
                "from_date": from_date,
                "to_date": to_date,
                "current_date": datetime.now().strftime("%d-%m-%Y"),
                "rows": rows,
                "total_qty": f"{total_qty:,.2f}",
                "total_amount": f"{total_amount:,.2f}",
                "total_paid": f"{total_paid:,.2f}",
                "total_luggage": f"{total_luggage:,.2f}",
                "group_total": f"{group_total:,.2f}",
                "commission_pct": 12.0,  # Default value
                "balance": f"{group_total:,.2f}",  # For compatibility
                "commission_value": f"{total_amount * 0.12:,.2f}",  # For compatibility
                "net_amount": f"{total_amount * 0.88:,.2f}",  # For compatibility
                "final_total": f"{group_total:,.2f}",  # For compatibility
            }
            
            # Render the template with context
            doc.render(context)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp_file:
                doc.save(tmp_file.name)
                temp_path = tmp_file.name
            
            # Read the content
            with open(temp_path, 'rb') as f:
                content = f.read()
            
            # Clean up
            os.unlink(temp_path)
            
            # Create response with proper headers for download
            return Response(
                content=content,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f"attachment; filename=group_total_report_{group_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"
                }
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate group total report: {str(e)}")

    @staticmethod
    def generate_daily_sales_pdf(
        from_date: str,
        to_date: str,
        item_name: str,
        rows: List[Dict[str, Any]],
        total_qty: float,
        total_amount: float,
    ) -> Response:
        """Generate PDF daily sales report using DOCX template"""
        try:
            # Use your custom template for daily sales as well
            template_path = CUSTOM_TEMPLATE_PATH
            os.makedirs(TEMPLATE_DIR, exist_ok=True)
            
            if not os.path.exists(template_path):
                raise HTTPException(status_code=500, detail=f"Custom template not found at {template_path}. Please upload Report_template.docx to the templates directory.")
            
            doc = DocxTemplate(template_path)
            
            # Prepare context for template
            context = {
                "shop_name": "SREE KRISHNA FLOWER STALL",
                "phone": "8147848760",
                "proprietor": "K.C.N & SONS",
                "mobile": "9972878307",
                "business_type": "FLOWER MERCHANTS – 7795018307",
                "shop_address": "Shop No: B-32, S.K.R Market, Bangalore - 560002",
                "trademark": "S.K.F.S",
                "from_date": from_date,
                "to_date": to_date,
                "item_name": item_name,
                "current_date": datetime.now().strftime("%d-%m-%Y"),
                "rows": rows,
                "total_qty": f"{total_qty:,.2f}",
                "total_amount": f"{total_amount:,.2f}",
                "group_name": "Daily Sales",  # For compatibility
                "total_paid": f"0.00",  # For compatibility
                "total_luggage": f"0.00",  # For compatibility
                "commission_pct": 12.0,  # For compatibility
                "balance": f"{total_amount:,.2f}",  # For compatibility
                "commission_value": f"{total_amount * 0.12:,.2f}",  # For compatibility
                "net_amount": f"{total_amount * 0.88:,.2f}",  # For compatibility
                "final_total": f"{total_amount:,.2f}",  # For compatibility
            }
            
            # Render the template with context
            doc.render(context)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp_file:
                doc.save(tmp_file.name)
                temp_path = tmp_file.name
            
            # Read the content
            with open(temp_path, 'rb') as f:
                content = f.read()
            
            # Clean up
            os.unlink(temp_path)
            
            # Create response with proper headers for download
            return Response(
                content=content,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f"attachment; filename=daily_sales_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"
                }
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate daily sales report: {str(e)}")