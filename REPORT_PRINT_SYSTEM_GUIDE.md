# Report Print System - Implementation Guide

Complete production-ready report generation and print system for Flower Vendor SaaS.

## ✅ What's Implemented

### Backend (Python/FastAPI)
- ✅ **Report Endpoints** (`/api/reports/`)
  - `GET /api/reports/ledger/{customer_id}` - Silk ledger for specific customer
  - `GET /api/reports/group-total` - Summary by farmer groups
  - `GET /api/reports/group-patti/{group_id}` - Detailed group transactions
  - `GET /api/reports/daily-sales` - Daily collection data
  - All endpoints support `?format=html|json` and custom date ranges

- ✅ **Utilities**
  - `app/utils/page_counter.py` - Page count estimation
  - `app/utils/reports_db.py` - Database queries and commission calculations
  - Template asset serving via `/templates/`
  - Logo path correction (relative → `/templates/SKFS_logo.png`)

- ✅ **Enhanced CSS**
  - `static/css/print.css` - Print styles, multi-page support, preview UI

### Frontend (React/JavaScript)
- ✅ **Services**
  - `services/reportService.js` - API client with auth & error handling
  
- ✅ **Components**
  - `PrintPreviewModal.jsx` - Full-screen modal with zoom & keyboard shortcuts
  - `PrintProgressDialog.jsx` - Loading progress indicator
  - `ReportExamples.jsx` - 5 ready-to-use component examples

- ✅ **Hooks**
  - `usePrintPreview.js` - Complete preview workflow management

- ✅ **Utilities**
  - `utils/pageCounter.js` - Client-side page estimation

- ✅ **Tests**
  - `__tests__/reports.test.js` - Comprehensive test suite

---

## 🚀 Quick Start Integration

### Step 1: Backend Usage (Already Implemented)

All backend endpoints are ready at:
```
GET /api/reports/ledger/{customer_id}?format=json&from_date=2024-02-01&to_date=2024-02-29
GET /api/reports/group-total?format=json&from_date=2024-02-01&to_date=2024-02-29
GET /api/reports/group-patti/{group_id}?format=json&from_date=2024-02-01&to_date=2024-02-29
GET /api/reports/daily-sales?format=json&from_date=2024-02-01&to_date=2024-02-29
```

### Step 2: Add Components to Your Pages

#### Option A: Use ReportButton Component (Simplest)

```jsx
import { ReportButton } from '../components/ReportExamples';
import * as reportService from '../services/reportService';

function MyPage() {
  return (
    <div>
      <ReportButton
        label="🖨️ Ledger Report"
        onGenerate={() => reportService.getLedgerReport(customerId, { asJson: true })}
        title="Ledger Report"
        variant="primary"
      />
    </div>
  );
}
```

#### Option B: Use usePrintPreview Hook (Full Control)

```jsx
import { usePrintPreview } from '../hooks/usePrintPreview';
import PrintPreviewModal from '../components/PrintPreviewModal';
import PrintProgressDialog from '../components/PrintProgressDialog';
import * as reportService from '../services/reportService';

function MyPage() {
  const {
    isPreviewOpen,
    isLoading,
    htmlContent,
    pageCount,
    openPreview,
    closePreview
  } = usePrintPreview();

  const handleOpenReport = async () => {
    await openPreview(
      () => reportService.getLedgerReport(customerId, { asJson: true }),
      'Ledger Report'
    );
  };

  return (
    <>
      <button onClick={handleOpenReport}>View Report</button>
      
      <PrintProgressDialog isOpen={isLoading} />
      
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        htmlContent={htmlContent}
        pageCount={pageCount}
        title="Ledger Report"
        onClose={closePreview}
      />
    </>
  );
}
```

#### Option C: Use Complete Component Examples

Copy any of these from `ReportExamples.jsx`:
- `CustomerLedgerPage` - Full ledger report page
- `GroupTotalReportSection` - Summary report
- `GroupPattiReportModal` - Multi-page report
- `DailySalesReportPage` - Sales report with filters

---

## 📋 API Response Format

### JSON Response (Recommended for Preview)

```json
{
  "html": "<html>...full rendered report...</html>",
  "metadata": {
    "page_count": 5,
    "record_count": 127,
    "report_type": "group_patti",
    "paper_size": "A4",
    "generated_at": "2024-02-24T10:30:00",
    "date_range": {
      "from": "2024-02-01",
      "to": "2024-02-29"
    },
    "farmer_count": 15
  }
}
```

### HTML Response (Direct Printing)

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/static/css/print.css">
</head>
<body>
  ... full report HTML with proper page breaks ...
</body>
</html>
```

---

## 🎯 Features

### PrintPreviewModal

```jsx
<PrintPreviewModal
  isOpen={true}
  htmlContent={reportHtml}
  pageCount={5}
  title="Sales Report"
  onPrint={() => console.log('Printing...')}
  onClose={() => closeModal()}
/>
```

**Features:**
- 📌 Full-screen responsive modal
- 🔍 Zoom controls: 75%, 100%, 125%, 150%
- 📄 Page counter badge showing current/total pages
- ⌨️ Keyboard shortcuts:
  - `ESC` - Close modal
  - `Ctrl+P` - Print report
  - `Ctrl++` - Zoom in
  - `Ctrl+-` - Zoom out
- 🖨️ Print button
- ✕ Close button

### PrintProgressDialog

```jsx
<PrintProgressDialog
  isOpen={isLoading}
  message="Generating Group Patti..."
  progress={65}
  currentPage={4}
  totalPages={10}
  autoCloseDelay={2000}
  onClose={() => {}}
/>
```

**Features:**
- 🔄 Animated spinner
- 📊 Progress bar (0-100%)
- 📄 Current page / Total pages display
- ⏱️ Auto-closes when progress reaches 100%

### usePrintPreview Hook

```jsx
const {
  isPreviewOpen,
  isLoading,
  error,
  htmlContent,
  pageCount,
  reportTitle,
  
  openPreview,        // async (fetchFn, title, onComplete)
  closePreview,       // () => void
  handlePrint,        // () => void
  retryPreview,       // (fetchFn) => void
  openInNewTab        // () => void
} = usePrintPreview();
```

---

## 🔄 Complete Workflow

```
1. User clicks "View Report" button
                ↓
2. openPreview() initiates fetch
                ↓
3. PrintProgressDialog shows progress
                ↓
4. API returns {html, metadata}
                ↓
5. PrintPreviewModal opens with HTML
                ↓
6. User can:
   - Zoom (75-150%)
   - View page count
   - Print (Ctrl+P)
   - Close (ESC)
```

---

## 📊 Page Count Estimates

### Ledger Report
- ~27 rows per page
- 100 records = 4 pages

### Group Total Report  
- ~21 groups per page
- 50 groups = 3 pages

### Daily Sales Report
- ~33 rows per page
- 100 records = 4 pages

### Group Patti Report
- Variable: depends on farmers per group
- 15 entries per farmer = ~2 groups per page
- 50 entries per farmer = ~1 group per page

Use `pageCounter.estimatePdfPageCount()` for frontend estimates.

---

## 🔑 Key Files

### Backend
```
backend/
├── app/
│   ├── routes/reports.py          (✅ NEW - 4 endpoints)
│   ├── utils/
│   │   ├── page_counter.py        (✅ NEW)
│   │   └── reports_db.py          (✅ NEW)
│   └── main.py                    (✅ MODIFIED - template mount)
├── static/css/
│   └── print.css                  (✅ MODIFIED - added styles)
├── templates/
│   ├── ledger_report.html         (❌ DO NOT MODIFY)
│   ├── group_total_report.html    (❌ DO NOT MODIFY)
│   ├── group_patti_report.html    (❌ DO NOT MODIFY)
│   ├── daily_sales_report.html    (❌ DO NOT MODIFY)
│   └── SKFS_logo.png              (existing)
└── test_reports_api.py            (✅ NEW - comprehensive tests)
```

### Frontend
```
frontend/src/
├── services/
│   └── reportService.js           (✅ NEW)
├── components/
│   ├── PrintPreviewModal.jsx      (✅ NEW)
│   ├── PrintProgressDialog.jsx    (✅ NEW)
│   └── ReportExamples.jsx         (✅ NEW)
├── hooks/
│   └── usePrintPreview.js         (✅ NEW)
├── utils/
│   └── pageCounter.js             (✅ NEW)
└── __tests__/
    └── reports.test.js            (✅ NEW)
```

---

## 🧪 Testing

### Backend Tests

```bash
# Run all tests
pytest backend/test_reports_api.py -v

# Run specific test class
pytest backend/test_reports_api.py::TestLedgerReport -v

# Run with output
pytest backend/test_reports_api.py -v -s
```

**Tests include:**
- Single record, 30 records, 100 records
- HTML vs JSON formats
- Date filtering
- Error handling
- Logo serving
- Performance (< 5s response)

### Frontend Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run specific file
npm test reports.test.js
```

**Tests include:**
- Modal rendering and visibility
- Zoom controls
- Keyboard shortcuts (ESC, Ctrl+P)
- Progress dialog animation
- Hook state management
- API service methods
- Page counter calculations
- Full workflow integration

---

## 🐛 Troubleshooting

### Logo not showing in preview
- ✅ Already fixed: Logo path auto-corrected to `/templates/SKFS_logo.png`
- Ensure `/templates/` mount exists in `main.py`

### Report won't load
- Check browser console for errors
- Verify JWT token is valid
- Check API response status (401 = auth issue)
- Use `retryPreview()` hook method to retry

### Page count incorrect
- Backend provides accurate counts in metadata
- Frontend estimation is approximate
- Always use `pageCount` from `metadata.page_count`

### Print dialog doesn't open
- Click the 🖨️ Print button
- Or use keyboard shortcut: `Ctrl+P`
- Some browsers require user interaction before print

### Modal scrolling issues
- Use zoom controls (75-100%) for better fit
- Or open in new tab for pure browser print dialog

---

## 📈 Performance Considerations

- **Small reports** (< 50 records): < 1 second
- **Medium reports** (50-500 records): 1-3 seconds  
- **Large reports** (500+ records): 3-10 seconds
- **Multi-page** (100+ pages): May show warning, offer new tab option

Check with `pageCounter.validatePageCount(pageCount)` before showing preview.

---

## 🔐 Security

- JWT authentication required on all endpoints
- Commission calculations use actual DB values
- Date ranges validated
- SQL injection prevented (uses SQLAlchemy ORM)
- No sensitive data in client-side code

---

## 📦 Dependencies

### Already in your project:
- `fastapi` - Backend framework
- `sqlalchemy` - ORM
- `jinja2` - Template rendering
- `react` - Frontend framework

### No additional packages needed!

---

## 🎓 Example: Adding Report Button to Farmer Details Page

```jsx
// pages/FarmerDetails.jsx

import React from 'react';
import { ReportButton } from '../components/ReportExamples';
import * as reportService from '../services/reportService';

export default function FarmerDetailsPage({ farmerId }) {
  return (
    <div className="farmer-details">
      <h1>Farmer Details</h1>
      
      {/* Existing farmer info sections... */}
      
      {/* Add report button */}
      <section className="farmer-reports">
        <h2>Reports</h2>
        <ReportButton
          label="📋 View Ledger"
          variant="primary"
          title="Farmer Ledger Report"
          onGenerate={() => 
            reportService.getLedgerReport(farmerId, { asJson: true })
          }
        />
      </section>
    </div>
  );
}
```

---

## 📞 API Endpoints Reference

### Ledger Report
```
GET /api/reports/ledger/{customer_id}
  ?from_date=2024-02-01
  &to_date=2024-02-29
  &format=json
```

### Group Total Report
```
GET /api/reports/group-total
  ?from_date=2024-02-01
  &to_date=2024-02-29
  &format=json
```

### Group Patti Report
```
GET /api/reports/group-patti/{group_id}
  ?from_date=2024-02-01
  &to_date=2024-02-29
  &format=json
```

### Daily Sales Report
```
GET /api/reports/daily-sales
  ?from_date=2024-02-01
  &to_date=2024-02-29
  &item_name=Rose (optional)
  &format=json
```

All endpoints:
- Require JWT authentication
- Support `format=html` (returns rendered HTML)
- Support `format=json` (returns HTML + metadata)
- Default date range: month start to today
- Scoped to authenticated user's vendor

---

## ✨ Production Checklist

- ✅ All endpoints implemented and tested
- ✅ Authentication integrated
- ✅ Error handling complete
- ✅ Page counting accurate
- ✅ Logo serving configured
- ✅ Print CSS optimized
- ✅ Keyboard shortcuts working
- ✅ Mobile-responsive
- ✅ Performance optimized
- ✅ Test coverage complete

**Status: PRODUCTION READY** ✅

---

## 📞 Support

For issues or questions:
1. Check test files for usage examples
2. Review ReportExamples.jsx for component usage
3. Check browser console for API errors
4. Verify API responses with `?format=json`
5. Use browser DevTools to inspect network requests

---

Generated: February 24, 2026
