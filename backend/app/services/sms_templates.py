def collection_received_template(
    farmer_name: str,
    date: str,
    qty: float,
    amount: float
) -> str:
    return (
        f"Dear {farmer_name},\n"
        f"Flowers received on {date}.\n"
        f"Quantity: {qty} kg\n"
        f"Amount: ₹{amount}\n"
        f"- Flower Vendor"
    )


def settlement_template(
    farmer_name: str,
    date_from: str,
    date_to: str,
    net_payable: float,
    advance_deducted: float
) -> str:
    return (
        f"Settlement Summary for {farmer_name}\n"
        f"Period: {date_from} to {date_to}\n"
        f"Advance Deducted: ₹{advance_deducted}\n"
        f"Net Payable: ₹{net_payable}\n"
        f"- Flower Vendor"
    )


def daily_vendor_summary_template(
    date: str,
    total_qty: float,
    total_revenue: float
) -> str:
    return (
        f"Daily Summary ({date})\n"
        f"Total Qty: {total_qty} kg\n"
        f"Revenue: ₹{total_revenue}\n"
        f"- Flower SaaS"
    )
