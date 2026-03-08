"""
Page counter utility for calculating expected page counts for various reports.
Uses A4 page dimensions with standard margins to estimate record-to-page ratio.
"""
import math


# A4 Page Dimensions (in mm)
A4_WIDTH = 210
A4_HEIGHT = 297
MARGIN_TOP = 5
MARGIN_BOTTOM = 5
MARGIN_LEFT = 5
MARGIN_RIGHT = 5

# Usable area
USABLE_WIDTH = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT  # 200mm
USABLE_HEIGHT = A4_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM  # 287mm

# Header/Footer space (logo, title, etc.) - approximate in mm
HEADER_HEIGHT = 40  # Logo + title
FOOTER_HEIGHT = 15  # Page number, etc.

# Available space for content
CONTENT_HEIGHT = USABLE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT  # ~232mm


def calculate_ledger_pages(record_count: int) -> int:
    """
    Calculate pages for Ledger Report (Silk Ledger Entries).
    
    Layout: Vertical table with columns for date, qty, kg, rate, amount
    Typical row height: ~8mm (with padding)
    Header row: ~10mm
    
    Per page capacity: ~25-28 rows
    """
    if record_count == 0:
        return 1
    
    rows_per_page = 27
    total_rows = record_count + 1  # +1 for header
    pages = math.ceil(record_count / rows_per_page)
    
    return max(1, pages)


def calculate_group_total_pages(group_count: int) -> int:
    """
    Calculate pages for Group Total Report.
    
    Layout: Summary table with groups and totals
    Typical row height: ~10mm (with padding)
    Header row: ~12mm
    
    Per page capacity: ~20-22 groups
    """
    if group_count == 0:
        return 1
    
    groups_per_page = 21
    pages = math.ceil(group_count / groups_per_page)
    
    return max(1, pages)


def calculate_daily_sales_pages(record_count: int) -> int:
    """
    Calculate pages for Daily Sales Report.
    
    Layout: Daily sales table with columns for date, party, item, qty, rate, total
    Typical row height: ~7mm (compact)
    Header row: ~9mm
    
    Per page capacity: ~32-35 rows
    """
    if record_count == 0:
        return 1
    
    rows_per_page = 33
    pages = math.ceil(record_count / rows_per_page)
    
    return max(1, pages)


def calculate_group_patti_pages(
    total_records: int,
    group_count: int,
    avg_records_per_group: float = None
) -> int:
    """
    Calculate pages for Group Patti Report (most complex).
    
    Layout: Multi-section report with:
    - Group header (8mm)
    - Detail rows (7mm each)
    - Group footer/summary (8mm)
    - Gap between groups (5mm)
    
    Per group with 15 entries: ~130mm (fits ~2 groups per page)
    Per group with 30 entries: ~235mm (fits ~1 group per page)
    Per group with 50+ entries: requires 2+ pages
    
    Args:
        total_records: Total transactions across all groups
        group_count: Number of groups
        avg_records_per_group: Average records per group (optional, auto-calculated)
    
    Returns:
        Estimated page count
    """
    if total_records == 0:
        return 1
    
    if group_count == 0:
        return 1
    
    # Calculate average if not provided
    if avg_records_per_group is None:
        avg_records_per_group = total_records / group_count
    
    # Each group occupies: header (8) + footer (8) + gap (5) + detail rows
    # Detail row height: 7mm
    group_content_height = 21  # header + footer + gap
    per_record_height = 7
    
    # Available space accounting for first page header
    first_page_available = CONTENT_HEIGHT
    subsequent_page_available = CONTENT_HEIGHT
    
    # Simple calculation: estimate groups per page
    # First group typically fits with header; subsequent groups depend on content
    avg_group_height = group_content_height + (avg_records_per_group * per_record_height)
    
    if avg_group_height < first_page_available:
        groups_per_page = int(first_page_available / avg_group_height)
        pages = math.ceil(group_count / max(1, groups_per_page))
    else:
        # Large groups: each group may need multiple pages
        pages_per_group = math.ceil(avg_group_height / subsequent_page_available)
        pages = group_count * pages_per_group
    
    return max(1, pages)


def estimate_pdf_page_count(
    report_type: str,
    record_count: int = 0,
    group_count: int = 0,
    avg_records_per_group: float = None
) -> int:
    """
    Unified function to estimate page count for any report type.
    
    Args:
        report_type: 'ledger', 'group_total', 'daily_sales', or 'group_patti'
        record_count: Number of detail records
        group_count: Number of groups (for group_patti)
        avg_records_per_group: Average records per group (for group_patti)
    
    Returns:
        Estimated page count
    """
    if report_type == "ledger":
        return calculate_ledger_pages(record_count)
    elif report_type == "group_total":
        return calculate_group_total_pages(group_count)
    elif report_type == "daily_sales":
        return calculate_daily_sales_pages(record_count)
    elif report_type == "group_patti":
        return calculate_group_patti_pages(record_count, group_count, avg_records_per_group)
    else:
        return 1
