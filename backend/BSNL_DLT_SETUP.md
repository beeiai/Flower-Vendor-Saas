# BSNL DLT Integration Guide for Fast2SMS

This guide explains how to set up BSNL DLT compliance for SMS sending in the Flower Vendor SaaS system.

## 📋 Overview

To send SMS in India, you must comply with TRAI regulations by registering on the BSNL DLT (Distributed Ledger Technology) portal. This implementation supports both DLT-compliant and traditional SMS modes.

---

## ✅ Prerequisites

Before configuring the application, complete these steps:

### 1️⃣ Register on BSNL DLT Portal

1. Visit: **https://uengage.bsnl.co.in**
2. Click **"Register as Principal Entity"**
3. Fill in your business details:
   - Company/Business name
   - PAN number
   - Address
   - Email & mobile number
4. Upload required documents:
   - PAN card
   - GST certificate (if available)
   - Business proof
5. Submit and wait for approval (usually 24–48 hours)

**After approval, you will receive:**
- ✅ **Entity ID (PE ID)** - Your Principal Entity identifier

---

### 2️⃣ Create Sender ID (Header)

1. Login to the BSNL DLT portal
2. Go to **Header Registration**
3. Create a Sender ID (example: `FLOWER`, `MYSHOP`)
   - Should be unique and related to your business
   - Maximum 6 characters (alphanumeric)
4. Wait for approval

**After approval, you will receive:**
- ✅ **Sender ID** - Your approved header

---

### 3️⃣ Create SMS Template

1. Go to **Template Registration** on BSNL DLT portal
2. Select template type:
   - **Transactional** - For order confirmations, settlements
   - **Service Implicit** - For service-related updates
   - **Promotional** - For marketing messages
3. Write the SMS content with variables using `{#var#}` syntax

**Example Template for Daily Sales Report:**
```
Dear {#var#}, Your daily sales summary from {#var#} to {#var#}. Total Qty: {#var#} kg. Amount: Rs.{#var#}. Thank you!
```

**Variables in order:**
1. Customer Name
2. From Date
3. To Date
4. Total Quantity
5. Total Amount

4. Submit for approval

**After approval, you will receive:**
- ✅ **Template ID** - Unique 10-19 digit number (e.g., `1707500000000001234`)

---

### 4️⃣ Add DLT Details in Fast2SMS

1. Login to your **Fast2SMS dashboard**
2. Go to **DLT Registration / DLT Template** section
3. Add the following:
   - **Entity ID** (from Step 1)
   - **Sender ID** (from Step 2)
   - **Template ID** (from Step 3)
4. Save the configuration

---

## 🔧 Application Configuration

### Environment Variables

Copy `.env.sms.example` to `.env` or add these variables to your existing `.env` file:

```bash
# Fast2SMS API Base URL (use bulkV2 for DLT)
SMS_API_URL=https://www.fast2sms.com/dev/bulkV2

# Fast2SMS API Key (from your Fast2SMS dashboard)
SMS_API_KEY=your_fast2sms_api_key_here

# Sender ID registered on BSNL DLT
SMS_SENDER_ID=FLOWER

# Entity ID (PE ID) from BSNL DLT
SMS_ENTITY_ID=your_entity_id_here

# Template ID from BSNL DLT
SMS_TEMPLATE_ID=your_template_id_here

# Route type (use "dlt" for DLT-compliant)
SMS_DLT_ROUTE=dlt

# Maximum retry attempts
SMS_MAX_RETRY=3
```

---

## 📤 API Usage

### Send SMS with DLT Template

**Endpoint:** `POST /api/sms/send`

**Request Body:**
```json
{
  "phone": "9876543210",
  "message": "Gowtham",
  "template_variables": {
    "customer_name": "Gowtham",
    "amount": "1000",
    "date": "05-03-2026"
  }
}
```

**How it works:**
- The backend checks if `SMS_TEMPLATE_ID` is configured
- If yes, it uses DLT route with template variables
- If no, it falls back to traditional SMS mode

---

## 🎯 Available Template Functions

The application provides helper functions for common SMS templates:

### 1. Collection Received
```python
from app.services.sms_templates import get_collection_received_dlt_variables

variables = get_collection_received_dlt_variables(
    farmer_name="John",
    date="05-03-2026",
    qty=15.5,
    amount=2500.00
)
# Returns: {"farmer_name": "John", "date": "05-03-2026", "quantity": "15.5", "amount": "2500.00"}
```

### 2. Settlement Generated
```python
from app.services.sms_templates import get_settlement_dlt_variables

variables = get_settlement_dlt_variables(
    farmer_name="John",
    date_from="01-03-2026",
    date_to="05-03-2026",
    net_payable=10000.00,
    advance_deducted=500.00
)
# Returns: {"farmer_name": "John", "date_from": "01-03-2026", "date_to": "05-03-2026", "advance_deducted": "500.00", "net_payable": "10000.00"}
```

### 3. Daily Sales Summary
```python
from app.services.sms_templates import daily_sales_customer_dlt_variables

variables = daily_sales_customer_dlt_variables(
    customer_name="John",
    from_date="04-03-2026",
    to_date="05-03-2026",
    total_qty=25.0,
    total_amount=4500.00
)
# Returns: {"customer_name": "John", "from_date": "04-03-2026", "to_date": "05-03-2026", "total_qty": "25.0", "total_amount": "4500.00"}
```

---

## 🔄 Backward Compatibility

The system maintains backward compatibility:

### Traditional Mode (Non-DLT)
If you don't set `SMS_TEMPLATE_ID`, the system will use the old format:
```json
{
  "api_key": "YOUR_KEY",
  "sender": "SENDER",
  "to": "PHONE",
  "message": "Full message text"
}
```

### DLT Mode (Recommended)
When `SMS_TEMPLATE_ID` is set:
```json
{
  "route": "dlt",
  "sender_id": "SENDER",
  "template_id": "TEMPLATE_ID",
  "numbers": "PHONE",
  "variables_values": ["value1", "value2"]
}
```

---

## 📝 Important Notes

1. **Variable Order Matters**: The order of variables in your DLT template must match the order you pass them in the API call.

2. **Character Limits**: 
   - SMS content should not exceed 160 characters (for single SMS)
   - Longer messages will be split into multiple SMS

3. **Template Approval**: Any changes to template content require re-approval from BSNL.

4. **Testing**: Always test with a small batch before sending to all customers.

5. **Compliance**: Sending SMS without DLT registration may result in message blocking by telecom operators.

---

## 🚀 Quick Start Checklist

- [ ] Register on BSNL DLT portal
- [ ] Obtain Entity ID (PE ID)
- [ ] Register and approve Sender ID
- [ ] Create and approve SMS template with variables
- [ ] Get Template ID
- [ ] Add DLT details in Fast2SMS dashboard
- [ ] Update environment variables in backend
- [ ] Test SMS sending with template variables
- [ ] Verify SMS logs in the system

---

## 🆘 Troubleshooting

### SMS Not Sending
- Check if `SMS_API_KEY` is correct
- Verify `SMS_SENDER_ID` matches approved header
- Ensure `SMS_TEMPLATE_ID` is valid
- Check Fast2SMS account balance

### Wrong Variables in SMS
- Verify variable order matches template
- Check that all required variables are provided
- Ensure variable values are strings, not numbers

### DLT vs Non-DLT Confusion
- If `SMS_TEMPLATE_ID` is set → DLT mode is used
- If `SMS_TEMPLATE_ID` is not set → Traditional mode is used

---

## 📞 Support

For issues related to:
- **BSNL DLT Registration**: Contact BSNL support at https://uengage.bsnl.co.in
- **Fast2SMS API**: Contact Fast2SMS support
- **Application Issues**: Contact the development team

---

## 📚 References

- BSNL DLT Portal: https://uengage.bsnl.co.in
- Fast2SMS Documentation: https://www.fast2sms.com/api-docs
- TRAI Regulations: https://trai.gov.in
