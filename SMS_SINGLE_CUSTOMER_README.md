# SMS Single Customer Daily Sale - Implementation Guide

## Overview
This implementation provides a complete solution for the "SMS Single Customer Daily Sale" ERP screen that allows users to:
1. Filter customers by group
2. Select a specific customer
3. View daily sales transactions within a date range
4. Calculate totals automatically
5. Generate and send SMS summaries

## File Structure
```
backend/
├── app/
│  └── routes/
│      └── sms_single_customer.py          # New API endpoints
frontend/
├── src/
│   ├── components/
│   │  └── utility/
│   │      └── SmsSingleCustomerDailySale.jsx  # React component
│   └── utils/
│       └── api.js                          # Updated with new API methods
├── test_sms_single_customer_api.py         # Backend test script
└── SMS_SINGLE_CUSTOMER_DAILY_SALE_SOLUTION.md  # Complete documentation
```

## Database Schema

### Key Tables Used:
1. **farmer_groups** - Groups/Parties that organize customers
2. **farmers** - Customer records with group associations  
3. **collection_items** - Daily sales transaction records

### Required Fields:
- **Groups**: `id`, `name`, `vendor_id`
- **Customers**: `id`, `name`, `group_id`, `vendor_id`
- **Sales**: `id`, `date`, `farmer_id`, `item_name`, `qty_kg`, `rate_per_kg`, `vendor_id`

## API Endpoints

### 1. Get SMS Single Customer Daily Sale Data
```
GET /api/reports/sms-single-customer-daily-sale
```
**Parameters:**
- `group_name` (required): Group name to filter by
- `customer_name` (required): Customer name within the group
- `from_date` (required): Start date (YYYY-MM-DD)
- `to_date` (required): End date (YYYY-MM-DD)

**Response:**
```json
{
  "customer_name": "gowtham",
  "group_name": "kmp", 
  "from_date": "03-03-2026",
  "to_date": "03-03-2026",
  "sales_data": [
    {
      "sl_no": 1,
      "date": "03-03-2026",
      "item_name": "Rose (Red)",
      "qty": 15.50,
      "rate": 45.00,
      "total": 697.50
    }
  ],
  "totals": {
    "total_quantity": 15.50,
    "amount_total": 697.50
  },
  "sms_content": "Dear gowtham,\n\nYour daily sales summary (03-03-2026 to 03-03-2026):\nTotal Quantity: 15.50 KG\nAmount Total: ₹697.50\n\nThank you for your business!",
  "record_count": 1
}
```

### 2. Get Available Groups with Sales Data
```
GET /api/reports/sms-available-groups
```
**Response:**
```json
["kmp", "retailers", "wholesale"]
```

### 3. Get Customers by Group with Sales Data
```
GET /api/reports/sms-customers-by-group/{group_name}
```
**Response:**
```json
[
  {"id": 1, "name": "gowtham"},
  {"id": 2, "name": "john doe"}
]
```

## Frontend Component Usage

### Basic Implementation:
```jsx
import SmsSingleCustomerDailySale from './components/utility/SmsSingleCustomerDailySale';

function App() {
  const handleCancel = () => {
    console.log('SMS window closed');
  };
  
  const showNotification = (message, type) => {
    // Your notification system
    console.log(`${type}: ${message}`);
  };

  return (
    <SmsSingleCustomerDailySale 
      onCancel={handleCancel}
      showNotify={showNotification}
    />
  );
}
```

### API Integration:
The component uses these API methods from `api.js`:
- `getSmsAvailableGroups()` - Load available groups
- `getSmsCustomersByGroup(groupName)` - Load customers in a group
- `getSmsSingleCustomerDailySale(groupName, customerName, fromDate, toDate)` - Get sales data
- `sendSms({phoneNumber, message})` - Send SMS

## Key Features

### 1. **Group-based Filtering**
- Only shows groups that have customers with actual sales data
- Customers are filtered by selected group
- Prevents selection of customers from wrong groups

### 2. **Date Range Validation**
- Validates that from_date ≤ to_date
- Proper date formatting (DD-MM-YYYY in display)
- Handles edge cases like same-day ranges

### 3. **Automatic Calculations**
- Real-time calculation of Total Quantity (sum of QTY)
- Real-time calculation of Amount Total (sum of QTY × RATE)
- Displayed in summary widgets with proper formatting

### 4. **SMS Generation**
- Auto-generated SMS template with customer name
- Includes date range, total quantity, and amount
- Professional formatting for business communication

### 5. **Error Handling**
- Authentication validation
- Proper error messages for missing data
- Loading states during API calls
- Network error handling

### 6. **Responsive Design**
- Mobile-friendly interface
- Proper column widths and spacing
- Sticky headers for large datasets
- Summary widgets with visual hierarchy

## Testing

### Backend Testing:
```bash
python test_sms_single_customer_api.py
```

### Frontend Testing:
Run in browser console:
```javascript
// Test API methods
await api.getSmsAvailableGroups();
await api.getSmsCustomersByGroup('kmp');
await api.getSmsSingleCustomerDailySale('kmp', 'gowtham', '2026-03-01', '2026-03-03');
```

## Integration Points

### 1. **Database Integration**
- Uses existing `farmer_groups`, `farmers`, and `collection_items` tables
- No schema changes required
- Leverages existing vendor_id filtering

### 2. **Authentication**
- Uses existing JWT authentication system
- Integrates with `get_current_user` dependency
- Respects vendor scoping

### 3. **Existing Components**
- Follows same patterns as `DailySaleView.jsx`
- Uses same styling system (Tailwind CSS)
- Compatible with existing notification system

## Customization Options

### 1. **SMS Template**
Modify the `generate_sms_content` function in `sms_single_customer.py`:
```python
def generate_sms_content(customer_name: str, from_date: date, to_date: date, 
                        total_qty: Decimal, total_amount: Decimal) -> str:
    return f"""Your custom SMS template here
    Customer: {customer_name}
    Period: {from_date} to {to_date}
    Quantity: {total_qty} KG
    Amount: ₹{total_amount}
    """
```

### 2. **Data Fields**
Adjust the query in `get_sms_single_customer_daily_sale` to include additional fields:
```python
sales_query = db.query(
    CollectionItem.date,
    CollectionItem.item_name,
    CollectionItem.qty_kg,
    CollectionItem.rate_per_kg,
    CollectionItem.vehicle_name,  # Add vehicle info
    CollectionItem.remarks         # Add remarks
)
```

### 3. **UI Customization**
Modify the React component to change:
- Layout and styling
- Column order and visibility
- Summary widget design
- Button labels and actions

## Troubleshooting

### Common Issues:

1. **"Customer not found in group"**
   - Verify the customer exists in the specified group
   - Check that the customer has sales data in the date range

2. **"No data available"**
   - Verify date range includes actual sales data
   - Check that the customer has transactions in that period

3. **Authentication errors**
   - Ensure valid JWT token is present
   - Verify user has access to the vendor data

4. **Empty dropdowns**
   - Check that groups/customers have associated sales data
   - Verify database connections are working

## Performance Considerations

- **Database Indexes**: Ensure proper indexes on `farmer_id`, `date`, and `vendor_id`
- **Query Optimization**: Uses efficient JOINs and filtering
- **Caching**: Consider caching group/customer lists for better performance
- **Pagination**: For large datasets, consider implementing pagination

This implementation provides a production-ready solution that integrates seamlessly with your existing ERP system while following established patterns and conventions.