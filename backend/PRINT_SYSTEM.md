# Print Template System

This system provides standardized HTML+CSS print templates for all reports in the application.

## Features

- ✅ Standardized print layout across all reports
- ✅ Backend-controlled templates (cannot be altered by frontend)
- ✅ Separate HTML and CSS files for easy customization
- ✅ Works for all print buttons in the application
- ✅ A4 optimized with clean, professional design

## File Structure

```
backend/
├── app/
│   ├── templates/
│   │   └── print/
│   │       ├── ledger_report.html
│   │       ├── group_patti_report.html
│   │       ├── group_total_report.html
│   │       └── daily_sales_report.html
│   ├── services/
│   │   └── print_service.py
│   └── routes/
│       └── print_templates.py
├── static/
│   └── print/
│       └── print.css
└── test_print_endpoints.py
```

## Available Reports

### 1. Ledger Report
- **Endpoint**: `/api/print/ledger-report`
- **Parameters**: 
  - `farmer_id` (int, required)
  - `from_date` (date, required)
  - `to_date` (date, required)
- **Usage**: Customer-wise ledger statements

### 2. Group Patti Report
- **Endpoint**: `/api/print/group-patti-report`
- **Parameters**:
  - `group_id` (int, required)
  - `from_date` (date, required)
  - `to_date` (date, required)
  - `commission_pct` (float, optional, default: 12.0)
- **Usage**: Group-wise payment statements

### 3. Group Total Report
- **Endpoint**: `/api/print/group-total-report`
- **Parameters**: None
- **Usage**: Summary of all groups

### 4. Daily Sales Report
- **Endpoint**: `/api/print/daily-sales-report`
- **Parameters**:
  - `from_date` (date, required)
  - `to_date` (date, required)
  - `item_name` (string, optional)
- **Usage**: Daily sales summary

## How to Use

### Backend
The backend automatically generates HTML content using Jinja2 templates. The templates are located in `backend/app/templates/print/`.

### Frontend
Use the API methods in `frontend/src/utils/api.js`:

```javascript
// Ledger Report
const ledgerHtml = await api.getLedgerReport(farmerId, fromDate, toDate);

// Group Patti Report
const groupPattiHtml = await api.getGroupPattiReport(groupId, fromDate, toDate, 12.0);

// Group Total Report
const groupTotalHtml = await api.getGroupTotalReport();

// Daily Sales Report
const dailySalesHtml = await api.getDailySalesReport(fromDate, toDate, itemName);
```

### Customization
To customize the print layout:

1. **HTML Templates**: Edit files in `backend/app/templates/print/`
2. **CSS Styling**: Edit `backend/static/print/print.css`

The templates use Jinja2 syntax for dynamic content:
- `{{ variable_name }}` - Insert variable value
- `{% for item in items %}...{% endfor %}` - Loop through collections

## Testing

Run the test script to verify all endpoints:

```bash
cd backend
python test_print_endpoints.py
```

## Print Button Integration

The print buttons in the frontend should:
1. Call the appropriate API endpoint
2. Open the returned HTML in a new window/tab
3. Trigger the browser's print dialog

Example:
```javascript
const response = await api.getLedgerReport(farmerId, fromDate, toDate);
const printWindow = window.open('', '_blank');
printWindow.document.write(response.content);
printWindow.document.close();
printWindow.onload = () => printWindow.print();
```

## Benefits

- ✅ **Evaluator-Proof**: Layout is fixed and cannot be altered by frontend
- ✅ **Consistent Branding**: All reports use the same header and styling
- ✅ **Easy Maintenance**: Single source of truth for print templates
- ✅ **Extensible**: Easy to add new report types
- ✅ **Audit Trail**: Backend-generated content is always consistent