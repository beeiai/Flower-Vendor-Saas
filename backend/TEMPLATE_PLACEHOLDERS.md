# Template Placeholders Guide

Your `Report_template.docx` should contain these placeholders to work with the DOCX printing system.

## 📝 Required Placeholders

### Header Information
```
{{ shop_name }}           # SREE KRISHNA FLOWER STALL
{{ phone }}               # 8147848760
{{ proprietor }}          # K.C.N & SONS
{{ mobile }}              # 9972878307
{{ business_type }}       # FLOWER MERCHANTS – 7795018307
{{ shop_address }}        # Shop No: B-32, S.K.R Market, Bangalore - 560002
{{ trademark }}           # S.K.F.S
```

### Customer/Group Information
```
{{ farmer_name }}         # Customer name (for ledger reports)
{{ ledger_name }}         # Ledger identifier
{{ address }}             # Customer address
{{ group_name }}          # Group name
{{ balance }}             # Current balance
{{ from_date }}          # Report start date
{{ to_date }}            # Report end date
{{ current_date }}       # Generation date
```

### Dynamic Table Rows
```
{% for row in rows %}
  {{ row.date }}          # Transaction date
  {{ row.qty }}           # Quantity
  {{ row.price }}         # Rate per unit
  {{ row.total }}         # Total amount
  {{ row.luggage }}       # Luggage/transport cost
  {{ row.paid_amount }}   # Paid amount
  {{ row.amount }}        # Net amount
{% endfor %}
```

### Summary/Totals Section
```
{{ total_qty }}          # Total quantity
{{ total_amount }}       # Gross total amount
{{ commission_value }}   # Commission amount
{{ commission_pct }}     # Commission percentage
{{ luggage_total }}      # Total luggage costs
{{ coolie }}             # Coolie charges
{{ net_amount }}         # Net amount after commission
{{ paid_amount }}        # Total paid amount
{{ final_total }}        # Final balance
```

### Group Patti Specific
```
{{ customer_name }}      # Individual customer name
{{ gross }}              # Gross amount for customer
{{ commission }}         # Commission for customer
{{ net }}                # Net amount for customer
{{ paid }}               # Paid amount for customer
{{ balance }}            # Balance for customer

# Group totals
{{ total_gross }}        # Total gross for group
{{ total_commission }}   # Total commission for group
{{ total_net }}          # Total net for group
{{ total_paid }}         # Total paid for group
{{ total_balance }}      # Total balance for group
```

## 🎨 Template Design Tips

1. **Table Formatting**: 
   - Use "Table Grid" style for borders
   - Ensure consistent column widths
   - Set appropriate row heights

2. **Placeholder Placement**:
   - Place dynamic table rows inside a table structure
   - Position summary fields where you want totals to appear
   - Header information should be at the top of the document

3. **Styling**:
   - Use consistent fonts throughout
   - Apply bold formatting to headers
   - Consider using different font sizes for hierarchy

## 📋 Example Structure

Your template should have this general structure:

```
[Header Section with shop info]
[Customer/Group Information]
[Table Header Row]
[Dynamic Rows Section - {% for row in rows %} ... {% endfor %}]
[Summary/Totals Section]
```

## ✅ Testing Your Template

After adding placeholders:
1. Save as `Report_template.docx` in `backend/app/templates/`
2. Run the test script: `python test_docx_printing.py`
3. Check generated reports for proper placeholder replacement
4. Verify table borders and formatting are preserved

The system will automatically replace all placeholders with actual data when generating reports.