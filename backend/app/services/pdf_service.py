import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
PDF_DIR = os.path.join(BASE_DIR, "static", "settlements")

os.makedirs(PDF_DIR, exist_ok=True)


def generate_settlement_pdf(
    *,
    settlement,
    farmer,
    vendor,
    settlement_items
) -> str:
    """
    Generates settlement PDF and returns file path
    """

    file_name = f"settlement_{settlement.id}.pdf"
    file_path = os.path.join(PDF_DIR, file_name)

    c = canvas.Canvas(file_path, pagesize=A4)
    width, height = A4
    y = height - 40

    # 🟩 HEADER
    c.setFont("Helvetica-Bold", 16)
    c.drawString(40, y, vendor.name)
    y -= 20

    c.setFont("Helvetica", 10)
    c.drawString(40, y, vendor.address or "")
    y -= 30

    # 🟦 SETTLEMENT INFO
    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, y, "Settlement Report")
    y -= 20

    c.setFont("Helvetica", 10)
    c.drawString(40, y, f"Farmer: {farmer.name}")
    y -= 15
    c.drawString(40, y, f"Period: {settlement.date_from} to {settlement.date_to}")
    y -= 25

    # 🧾 TABLE HEADER
    c.setFont("Helvetica-Bold", 9)
    headers = ["Date", "Qty (kg)", "Rate", "Amount"]
    x_positions = [40, 150, 220, 300]

    for i, header in enumerate(headers):
        c.drawString(x_positions[i], y, header)

    y -= 15
    c.setFont("Helvetica", 9)

    # 📋 ROWS
    for item in settlement_items:
        if y < 60:
            c.showPage()
            y = height - 40

        c.drawString(40, y, str(item.collection_item.date))
        c.drawString(150, y, f"{item.collection_item.qty_kg}")
        c.drawString(220, y, f"₹{item.collection_item.rate_per_kg}")
        c.drawString(300, y, f"₹{item.line_total}")
        y -= 14

    y -= 20

    # 🧮 SUMMARY
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y, f"Total Amount: ₹{settlement.total_amount}")
    y -= 14
    c.drawString(40, y, f"Commission: ₹{settlement.total_commission}")
    y -= 14
    c.drawString(40, y, f"Advance Deducted: ₹{settlement.advance_deducted}")
    y -= 18

    c.setFont("Helvetica-Bold", 12)
    c.drawString(40, y, f"Net Payable: ₹{settlement.net_payable}")

    y -= 30
    c.setFont("Helvetica", 9)
    c.drawString(40, y, f"Generated on {datetime.now().strftime('%d-%m-%Y %H:%M')}")

    c.save()

    return f"/static/settlements/{file_name}"
