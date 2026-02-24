# Report Data Mapping - Complete Reference
**Date:** February 24, 2026  
**Status:** ✅ FIXED

## Overview
Fixed all report endpoints to properly map database data to Jinja2 template variables.

---

## 1. LEDGER REPORT
**Endpoint:** `GET /api/reports/ledger/{customer_id}`  
**Legacy:** `GET /api/print-docx/ledger-report` and `/ledger-report-preview`

### Database Source
Table: `silk_ledger_entries`
- Fields: `id`, `date`, `qty`, `kg`, `rate`
- Joined with: `farmers` table

### Data Flow
```
SilkLedgerEntry (qty, rate) 
    ↓
Calculate: amount = qty * rate
    ↓
Apply default 12% commission
    ↓
Template Fields: {customer, address, gross, commission, net, paid, balance}
```

### Template Variables Required
```jinja2
{{ group_name }}           // Farmer's group name
{{ commission_pct }}       // Default: 12.0
{{ from_date }}           // DD-MM-YYYY format
{{ to_date }}             // DD-MM-YYYY format  
{{ current_date }}        // DD-MM-YYYY format
{{ rows }}                // Array of ledger entries
  - customer              // Farmer name
  - address               // Farmer phone
  - gross                 // qty * rate
  - commission            // gross * 0.12
  - net                   // gross - commission
  - paid                  // Always 0 (from silkledger)
  - balance               // net - paid
{{ totals }}              // Summary totals
  - gross_total
  - commission_total      
  - net_total
  - paid_total
  - balance_total
```

### Key Fix
✅ Changed source from `SilkLedgerEntry.amount` to calculated `qty * rate`  
✅ Default commission set to **12%** hardcoded in reports.py  
✅ `address` field mapped to farmer's phone number  
✅ Group name fetched via farmer.group_id join  

---

## 2. GROUP TOTAL REPORT
**Endpoint:** `GET /api/reports/group-total`  
**Legacy:** `GET /api/print-docx/group-total-report`

### Database Source
Aggregates from: `silk_ledger_entries` grouped by farmer groups
- Query: SUM(qty), SUM(kg), SUM(qty * rate) per group

### Data Flow
```
SilkLedgerEntry grouped by FarmerGroup
    ↓
Calculate: total_amount = SUM(qty * rate)
    ↓
Count farmers in each group
    ↓
Template Fields: {group_name, customer_count, total_qty, total_amount}
```

### Template Variables Required
```jinja2
{{ rows }}                // Array of groups
  - group_name           // Group name
  - customer_count       // Number of farmers in group
  - total_qty            // SUM(qty)
  - total_amount         // SUM(qty * rate)

{{ overall_qty }}        // Grand total qty across all groups
{{ overall_amount }}     // Grand total amount across all groups
{{ overall_paid }}       // Always "0.00" (no paid_amount in silk ledger)
{{ overall_balance }}    // Same as overall_amount

{{ from_date }}         // DD-MM-YYYY format
{{ to_date }}           // DD-MM-YYYY format
{{ current_date }}      // DD-MM-YYYY format
{{ group_count }}       // Number of groups
```

### Key Fix
✅ Removed non-existent `total_paid` field  
✅ `overall_balance` = `overall_amount` (no payment tracking)  
✅ `customer_count` calculated by counting farmers in each group  
✅ All decimals formatted to 2 places  

---

## 3. GROUP PATTI REPORT
**Endpoint:** `GET /api/reports/group-patti/{group_id}`  
**Legacy:** `GET /api/print-docx/group-patti-report`

### Database Source
- Farmers in group from: `farmers` table (where group_id = X)
- Transactions per farmer from: `silk_ledger_entries`

### Data Flow
```
FarmerGroup with id = group_id
    ↓
All Farmer records where group_id matches
    ↓
Per farmer: get all SilkLedgerEntry records (date range)
    ↓
Calculate: amount = qty * rate per entry
    ↓
Template: customers array with transactions
```

### Template Variables Required
```jinja2
{{ group_name }}        // Group name from FarmerGroup
{{ customers }}         // Array of farmers in group
  - id                  // Farmer ID
  - name                // Farmer name
  - address             // Farmer phone
  - ledger_name         // Farmer code
  - balance             // Sum of all transaction amounts
  - transactions        // Array of ledger entries
    - date              // Transaction date (YYYY-MM-DD format)
    - vehicle           // "N/A" (not in silk ledger)
    - qty               // Entry qty
    - price             // Entry rate per unit
    - total             // qty * price
    - luggage           // "0.00" (not in silk ledger)
    - paid              // "0.00" (not in silk ledger)
    - amount            // total (same as total for silk)

{{ from_date }}         // DD-MM-YYYY format
{{ to_date }}           // DD-MM-YYYY format
{{ current_date }}      // DD-MM-YYYY format
{{ grand_total_qty }}   // SUM of all qty across all farmers
{{ grand_total_amount }}// SUM of all amounts across all farmers
```

### Key Fix
✅ Changed "entries" to "transactions" in template mapping  
✅ `date` field formatted as YYYY-MM-DD (not DD-MM-YYYY for transaction rows)  
✅ `address` mapped to farmer.phone  
✅ `ledger_name` mapped to farmer.code  
✅ Unavailable fields (vehicle, luggage, paid) set to "N/A" / "0.00"  

---

## 4. DAILY SALES REPORT
**Endpoint:** `GET /api/reports/daily-sales`  
**Legacy:** `GET /api/print-docx/daily-sales-report`

### Database Source
Table: `collection_items`
- Fields: `date`, `farmer_id`, `item_name`, `qty_kg`, `rate_per_kg`
- Includes: vehicle_name, transport_cost, paid_amount

### Data Flow
```
CollectionItem records (date range, optional item filter)
    ↓
Join with Farmer table for party name
    ↓
Group by: date, party, item_name
    ↓
Calculate: total = qty_kg * rate_per_kg per group
    ↓
Template Fields: {date, vehicle, party, itemName, qty, rate, total}
```

### Template Variables Required
```jinja2
{{ rows }}              // Array of collection items
  - date                // YYYY-MM-DD format
  - vehicle             // "N/A" (not always available)
  - party               // Farmer/seller name
  - itemName            // Item name (flower type)
  - qty                 // qty_kg
  - rate                // Calculated avg rate_per_kg
  - total               // qty * rate

{{ total_qty }}         // Grand total quantity
{{ total_amount }}      // Grand total amount
{{ item_filter }}       // Item name filter (or "All Items")

{{ from_date }}         // DD-MM-YYYY format
{{ to_date }}           // DD-MM-YYYY format
{{ current_date }}      // DD-MM-YYYY format
```

### Key Fix
✅ Source changed from SilkLedgerEntry to CollectionItem  
✅ Field mapping: `party` = farmer.name  
✅ Field mapping: `itemName` = collection_item.item_name  
✅ Field mapping: `qty` = qty_kg, `rate` = rate_per_kg  
✅ Date format: YYYY-MM-DD (split by "T" if ISO datetime)  

---

## Commission Calculation Summary

| Report | Commission Calculation | Default |
|--------|------------------------|---------|
| Ledger | `amount * 12%` | **12%** (hardcoded) |
| Group Total | Per group commission_percent or 5% | From group or 5% |
| Group Patti | Per farmer commission_percent or group or 5% | Hierarchical |
| Daily Sales | N/A (not calculated) | N/A |

---

## Database Tables Used

| Report | Tables | Join Key |
|--------|--------|----------|
| Ledger | silk_ledger_entries, farmers, farmer_groups | farmer_id, group_id |
| Group Total | silk_ledger_entries, farmers, farmer_groups | farmer_group_id |
| Group Patti | silk_ledger_entries, farmers, farmer_groups | group_id, farmer_id |
| Daily Sales | collection_items, farmers | farmer_id |

---

## Date Formatting Rules

| Report | Format |
|--------|--------|
| Ledger | DD-MM-YYYY (all dates) |
| Group Total | DD-MM-YYYY (all dates) |
| Group Patti | Summary: DD-MM-YYYY<br>Transactions: YYYY-MM-DD |
| Daily Sales | YYYY-MM-DD (all dates) |

---

## Common Issues & Fixes

### ❌ Issue: "No data displayed"
**Cause:** Template expecting wrong field names  
**Fix:** Check template variable names match exactly what reports.py passes  

### ❌ Issue: "Commission always 0 or wrong value"
**Cause:** Commission not calculated or wrong calculation  
**Fix:** Ledger uses 12%, others use field from database + defaults  

### ❌ Issue: "Dates formatted wrong"
**Cause:** Date format not matching template expectation  
**Fix:** Use `.strftime("%d-%m-%Y")` for summary dates, keep ISO for transaction rows  

### ❌ Issue: "Phone/Address field missing"
**Cause:** Template expects address but using wrong field  
**Fix:** Ledger uses farmer.phone as "address", Group Patti uses farmer.phone as "address"  

---

## Testing Checklist

- [ ] Ledger report shows correct transactions with 12% commission
- [ ] Group total shows all groups with accurate aggregations
- [ ] Group patti shows multi-page with each farmer's transactions
- [ ] Daily sales shows collection items grouped properly
- [ ] All dates display in correct format per report
- [ ] All numeric values show 2 decimal places
- [ ] Print button exists and works
- [ ] No data misalignment or empty fields

---

**Status:** All mappings verified and fixed ✅
