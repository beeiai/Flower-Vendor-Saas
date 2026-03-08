def collection_received_template(
    farmer_name: str,
    date: str,
    qty: float,
    amount: float
) -> str:
    """
    Traditional template - returns formatted message
    For DLT compliance, use get_collection_received_dlt_variables() instead
    """
    return (
        f"Dear {farmer_name},\n"
        f"Flowers received on {date}.\n"
        f"Quantity: {qty} kg\n"
        f"Amount: ₹{amount}\n"
        f"- Flower Vendor"
    )


def get_collection_received_dlt_variables(
    farmer_name: str,
    date: str,
    qty: float,
    amount: float
) -> dict:
    """
    Returns variables for DLT template substitution
    Template should be registered on BSNL DLT with these variables:
    Dear {#var#}, Flowers received on {#var#}. Quantity: {#var#} kg. Amount: Rs.{#var#} - Flower Vendor
    """
    return {
        "farmer_name": farmer_name,
        "date": date,
        "quantity": str(qty),
        "amount": str(amount)
    }


def settlement_template(
    farmer_name: str,
    date_from: str,
    date_to: str,
    net_payable: float,
    advance_deducted: float
) -> str:
    """
    Traditional template - returns formatted message
    For DLT compliance, use get_settlement_dlt_variables() instead
    """
    return (
        f"Settlement Summary for {farmer_name}\n"
        f"Period: {date_from} to {date_to}\n"
        f"Advance Deducted: ₹{advance_deducted}\n"
        f"Net Payable: ₹{net_payable}\n"
        f"- Flower Vendor"
    )


def get_settlement_dlt_variables(
    farmer_name: str,
    date_from: str,
    date_to: str,
    net_payable: float,
    advance_deducted: float
) -> dict:
    """
    Returns variables for DLT template substitution
    Template should be registered on BSNL DLT with these variables:
    Settlement Summary for {#var#}. Period: {#var#} to {#var#}. Advance Deducted: Rs.{#var#}. Net Payable: Rs.{#var#} - Flower Vendor
    """
    return {
        "farmer_name": farmer_name,
        "date_from": date_from,
        "date_to": date_to,
        "advance_deducted": str(advance_deducted),
        "net_payable": str(net_payable)
    }


def daily_vendor_summary_template(
    date: str,
    total_qty: float,
    total_revenue: float
) -> str:
    """
    Traditional template - returns formatted message
    For DLT compliance, use get_daily_vendor_summary_dlt_variables() instead
    """
    return (
        f"Daily Summary ({date})\n"
        f"Total Qty: {total_qty} kg\n"
        f"Revenue: ₹{total_revenue}\n"
        f"- Flower SaaS"
    )


def get_daily_vendor_summary_dlt_variables(
    date: str,
    total_qty: float,
    total_revenue: float
) -> dict:
    """
    Returns variables for DLT template substitution
    Template should be registered on BSNL DLT with these variables:
    Daily Summary ({#var#}). Total Qty: {#var#} kg. Revenue: Rs.{#var#} - Flower SaaS
    """
    return {
        "date": date,
        "total_qty": str(total_qty),
        "total_revenue": str(total_revenue)
    }


def daily_sales_customer_dlt_variables(
    customer_name: str,
    from_date: str,
    to_date: str,
    total_qty: float,
    total_amount: float
) -> dict:
    """
    Returns variables for DLT template substitution for daily sales report
    Template should be registered on BSNL DLT with these variables:
    Dear {#var#}, Your daily sales summary from {#var#} to {#var#}. Total Qty: {#var#} kg. Amount: Rs.{#var#}. Thank you!
    """
    return {
        "customer_name": customer_name,
        "from_date": from_date,
        "to_date": to_date,
        "total_qty": str(total_qty),
        "total_amount": str(total_amount)
    }
