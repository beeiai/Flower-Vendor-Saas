# BSNL DLT Integration - Implementation Checklist

## ✅ Development Tasks (COMPLETED)

### Backend Implementation
- [x] Added DLT configuration fields to `config.py`
  - [x] `SMS_ENTITY_ID` - Entity ID from BSNL
  - [x] `SMS_TEMPLATE_ID` - Template ID from BSNL
  - [x] `SMS_DLT_ROUTE` - Route type (default: "dlt")

- [x] Updated `sms_service.py` for DLT support
  - [x] Automatic DLT mode detection
  - [x] Template variables parameter
  - [x] Fast2SMS DLT payload construction
  - [x] Backward compatibility maintained

- [x] Enhanced `sms_templates.py` with DLT functions
  - [x] `get_collection_received_dlt_variables()`
  - [x] `get_settlement_dlt_variables()`
  - [x] `get_daily_vendor_summary_dlt_variables()`
  - [x] `daily_sales_customer_dlt_variables()`

- [x] Updated `sms.py` route
  - [x] Added `template_variables` parameter
  - [x] Updated API documentation

- [x] Modified `settlement_service.py`
  - [x] Integrated DLT variable functions
  - [x] Pass template variables to SMS service

### Frontend Implementation
- [x] Updated `api.js` sendSms function
  - [x] Support for templateVariables in payload
  - [x] Backward compatible with existing code

### Documentation & Configuration
- [x] Created `.env.sms.example` template
- [x] Created `BSNL_DLT_SETUP.md` guide
- [x] Created `DLT_INTEGRATION_SUMMARY.md` overview
- [x] Created `test_dlt_integration.py` verification script
- [x] Created this checklist document

---

## 📋 External Registration Steps (TODO)

### Step 1: BSNL DLT Portal Registration
- [ ] Visit https://uengage.bsnl.co.in
- [ ] Click "Register as Principal Entity"
- [ ] Fill business details:
  - [ ] Company/Business name
  - [ ] PAN number
  - [ ] Address
  - [ ] Email & mobile number
- [ ] Upload documents:
  - [ ] PAN card
  - [ ] GST certificate (if available)
  - [ ] Business proof
- [ ] Submit application
- [ ] Wait for approval (24-48 hours)
- [ ] **Receive Entity ID (PE ID)** ⬅️ Save this!

**Estimated Time:** 2-3 days including approval

---

### Step 2: Sender ID Registration
- [ ] Login to BSNL DLT portal
- [ ] Navigate to "Header Registration"
- [ ] Create Sender ID (e.g., "FLOWER", "MYSHOP")
  - [ ] Max 6 characters
  - [ ] Alphanumeric
  - [ ] Related to business
- [ ] Submit for approval
- [ ] Wait for approval
- [ ] **Receive approved Sender ID** ⬅️ Save this!

**Estimated Time:** 1-2 days

---

### Step 3: SMS Template Creation
- [ ] Login to BSNL DLT portal
- [ ] Go to "Template Registration"
- [ ] Select template type:
  - [ ] Transactional (for order confirmations, settlements)
  - [ ] Service Implicit (for service updates)
  - [ ] Promotional (for marketing)
- [ ] Write SMS content with variables using `{#var#}` syntax

**Example Template:**
```
Dear {#var#}, Your daily sales summary from {#var#} to {#var#}. 
Total Qty: {#var#} kg. Amount: Rs.{#var#}. Thank you!
```

- [ ] Define variables in order:
  1. [ ] Customer Name
  2. [ ] From Date
  3. [ ] To Date
  4. [ ] Total Quantity
  5. [ ] Total Amount
- [ ] Submit for approval
- [ ] Wait for approval
- [ ] **Receive Template ID** ⬅️ Save this!

**Estimated Time:** 1-2 days

**Note:** Create separate templates for:
- [ ] Collection received notifications
- [ ] Settlement generated notifications
- [ ] Daily sales reports
- [ ] Other use cases as needed

---

### Step 4: Fast2SMS Configuration
- [ ] Login to Fast2SMS dashboard
- [ ] Navigate to "DLT Registration / DLT Template" section
- [ ] Add DLT details:
  - [ ] Enter Entity ID (from Step 1)
  - [ ] Enter Sender ID (from Step 2)
  - [ ] Enter Template ID (from Step 3)
- [ ] Save configuration
- [ ] Verify all details are correct

**Estimated Time:** 10-15 minutes

---

## 🔧 Application Configuration Steps (TODO)

### Step 5: Environment Variables Setup
- [ ] Copy `.env.sms.example` to `.env` OR add to existing `.env`:
  ```bash
  cp .env.sms.example .env
  ```

- [ ] Edit `.env` file and update values:
  ```bash
  # Fast2SMS + BSNL DLT Configuration
  SMS_API_URL=https://www.fast2sms.com/dev/bulkV2
  SMS_API_KEY=your_actual_fast2sms_api_key
  SMS_SENDER_ID=FLOWER                    # Your approved sender ID
  SMS_ENTITY_ID=your_entity_id_from_bsnl  # From BSNL approval
  SMS_TEMPLATE_ID=your_template_id        # From BSNL approval
  SMS_DLT_ROUTE=dlt
  SMS_MAX_RETRY=3
  ```

**Important:**
- [ ] Replace `your_actual_fast2sms_api_key` with your Fast2SMS API key
- [ ] Replace placeholders with actual IDs from BSNL
- [ ] Keep `SMS_DLT_ROUTE=dlt` for DLT compliance

**Estimated Time:** 5-10 minutes

---

### Step 6: Testing & Verification
- [ ] Run verification test script:
  ```bash
  cd backend
  python test_dlt_integration.py
  ```
- [ ] Verify all tests pass
- [ ] Start the backend server
- [ ] Test SMS sending via frontend UI
- [ ] Check SMS logs in database
- [ ] Verify SMS delivery on recipient phone

**Test Cases:**
- [ ] Send collection received SMS
- [ ] Send settlement generated SMS
- [ ] Send daily sales report SMS
- [ ] Verify SMS logs are created
- [ ] Check message content matches template

**Estimated Time:** 30-60 minutes

---

## 🎯 Final Verification Checklist

Before going live with DLT-compliant SMS:

### Configuration
- [ ] Entity ID is correctly set in `.env`
- [ ] Sender ID matches approved header
- [ ] Template ID is valid and approved
- [ ] Fast2SMS API key is correct
- [ ] SMS API URL points to DLT endpoint (`/bulkV2`)
- [ ] `SMS_DLT_ROUTE=dlt` is set

### Templates
- [ ] All required SMS templates are registered on BSNL
- [ ] Variable order in code matches template definition
- [ ] Templates are linked to Fast2SMS account
- [ ] Test messages have been sent and received

### Code
- [ ] Backend uses DLT mode (check `is_dlt_mode` logic)
- [ ] Template variables are passed correctly
- [ ] SMS service constructs proper DLT payload
- [ ] Error handling works for failed sends
- [ ] SMS logging captures all attempts

### Frontend
- [ ] API client supports template variables
- [ ] UI components can pass template data
- [ ] Error messages display correctly
- [ ] Success notifications work

---

## 📊 Timeline Estimate

| Phase | Task | Duration |
|-------|------|----------|
| **External** | BSNL DLT Registration | 2-3 days |
| **External** | Sender ID Approval | 1-2 days |
| **External** | Template Approval | 1-2 days |
| **Configuration** | Fast2SMS Setup | 15 minutes |
| **Configuration** | Environment Variables | 10 minutes |
| **Testing** | Verification Tests | 1 hour |
| **Testing** | Live SMS Testing | 1 hour |

**Total Estimated Time:** 5-7 working days (mostly waiting for approvals)

---

## 🚨 Common Issues & Solutions

### Issue: SMS Not Sending
**Check:**
- [ ] Fast2SMS account has sufficient balance
- [ ] API key is correct
- [ ] Sender ID is approved and matches exactly
- [ ] Template ID is valid
- [ ] Phone number format is correct (with country code)

### Issue: Wrong Variables in Received SMS
**Check:**
- [ ] Variable order in code matches template
- [ ] All required variables are provided
- [ ] Variable values are strings (not numbers)
- [ ] Template on BSNL portal has correct variable count

### Issue: DLT vs Non-DLT Confusion
**Solution:**
- If `SMS_TEMPLATE_ID` is set → System uses DLT mode
- If `SMS_TEMPLATE_ID` is empty → System uses traditional mode
- Check logs to verify which mode is active

---

## 📞 Support Contacts

### BSNL DLT Portal
- Website: https://uengage.bsnl.co.in
- Support: Available via portal contact form

### Fast2SMS
- Dashboard: https://www.fast2sms.com
- API Docs: https://www.fast2sms.com/api-docs
- Support: Available via dashboard

### Application Development
- Code Issues: Contact development team
- Configuration Help: Refer to BSNL_DLT_SETUP.md
- Testing Support: Run test_dlt_integration.py

---

## ✨ Success Criteria

The integration is complete when:

✅ All development tasks are marked complete (DONE - see top of checklist)
✅ BSNL DLT registration is approved (Entity ID, Sender ID, Template ID received)
✅ Fast2SMS is configured with DLT details
✅ Environment variables are properly set
✅ Test script passes all checks
✅ Live SMS messages are sent successfully via DLT route
✅ SMS recipients receive messages with correct template formatting
✅ SMS logs show successful delivery status

---

## 🎉 Current Status

**Development Status:** ✅ COMPLETE
- All code changes implemented
- Documentation created
- Test scripts ready
- Configuration templates prepared

**Next Action:** Begin external registration process (Step 1 above)

**Estimated Completion:** 5-7 days from starting BSNL registration

---

**Last Updated:** March 5, 2026
**Prepared By:** Development Team
**Version:** 1.0
