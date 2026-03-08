/**
 * INTEGRATION EXAMPLES & TEST CASES
 * 
 * This file demonstrates how to integrate the report print system
 * into your React pages and components.
 * 
 * All code examples are production-ready and can be copy-pasted
 * into your components with minimal modification.
 */

// ============================================================
// EXAMPLE 1: Ledger Report in a Customer Details Page
// ============================================================

import React from 'react';
import PrintPreviewModal from '../components/PrintPreviewModal';
import PrintProgressDialog from '../components/PrintProgressDialog';
import usePrintPreview from '../hooks/usePrintPreview';
import * as reportService from '../services/reportService';

/**
 * Customer Ledger Page Component
 * Shows ledger report for a specific customer
 * 
 * Usage:
 * <CustomerLedgerPage customerId={42} />
 */
export function CustomerLedgerPage({ customerId }) {
  const {
    isPreviewOpen,
    isLoading,
    error,
    htmlContent,
    pageCount,
    openPreview,
    closePreview,
    handlePrint,
    retryPreview,
    openInNewTab,
    fallbackUrl
  } = usePrintPreview();

  const [fromDate, setFromDate] = React.useState(null);
  const [toDate, setToDate] = React.useState(null);

  /**
   * Open ledger report preview
   */
  const handleOpenPreview = async () => {
    try {
      await openPreview(
        () => reportService.getLedgerReport(customerId, {
          fromDate,
          toDate,
          asJson: true
        }),
        'Ledger Report',
        () => console.log('Preview loaded successfully')
      );
    } catch (err) {
      console.error('Failed to open preview:', err);
    }
  };

  return (
    <div>
      <h2>Customer Ledger</h2>
      
      {/* Date range selector */}
      <div style={{ marginBottom: '20px' }}>
        <label>
          From:
          <input
            type="date"
            value={fromDate || ''}
            onChange={(e) => setFromDate(e.target.value || null)}
          />
        </label>
        <label style={{ marginLeft: '10px' }}>
          To:
          <input
            type="date"
            value={toDate || ''}
            onChange={(e) => setToDate(e.target.value || null)}
          />
        </label>
      </div>

      {/* Preview button */}
      <button 
        onClick={handleOpenPreview}
        disabled={isLoading}
        style={{ 
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Loading...' : '🖨️ Preview Report'}
      </button>

      {/* Error display */}
      {error && (
        <div style={{ 
          color: 'red', 
          margin: '10px 0',
          padding: '10px',
          backgroundColor: '#fee',
          borderRadius: '4px'
        }}>
          <strong>Error:</strong> {error}
          <button 
            onClick={() => retryPreview(
              () => reportService.getLedgerReport(customerId, {
                fromDate, toDate, asJson: true
              })
            )}
            style={{ marginLeft: '10px' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Progress dialog while loading */}
      <PrintProgressDialog
        isOpen={isLoading}
        message="Generating ledger report..."
        progress={isLoading ? Math.random() * 100 : 100}
      />

      {/* Preview modal */}
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        htmlContent={htmlContent}
        previewUrl={fallbackUrl}
        pageCount={pageCount}
        title={`Ledger Report (${pageCount} pages)`}
        onPrint={handlePrint}
        onClose={closePreview}
      />
    </div>
  );
}


// ============================================================
// EXAMPLE 2: Group Total Report in Admin Dashboard
// ============================================================

/**
 * Group Total Report Component
 * Shows summary of all farmer groups
 * 
 * Usage:
 * <GroupTotalReportSection />
 */
export function GroupTotalReportSection() {
  const {
    isPreviewOpen,
    isLoading,
    htmlContent,
    pageCount,
    openPreview,
    closePreview,
    retryPreview,
    fallbackUrl
  } = usePrintPreview();

  const [dateRange, setDateRange] = React.useState(reportService.getDefaultDateRange());

  const handleGenerateReport = async () => {
    await openPreview(
      () => reportService.getGroupTotalReport({
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        asJson: true
      }),
      'Group Total Report'
    );
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <h3>📊 Group Total Report</h3>
      
      <button 
        onClick={handleGenerateReport}
        disabled={isLoading}
        style={{
          padding: '8px 16px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Loading...' : 'Generate Report'}
      </button>

      <PrintProgressDialog isOpen={isLoading} />
      
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        htmlContent={htmlContent}
        previewUrl={fallbackUrl}
        pageCount={pageCount}
        title="Group Total Report"
        onClose={closePreview}
      />
    </div>
  );
}


// ============================================================
// EXAMPLE 3: Group Patti Report (Multi-Page)
// ============================================================

/**
 * Group Patti Report Component
 * Detailed report with all farmers in a group
 * 
 * Usage:
 * <GroupPattiReportModal groupId={5} isOpen={true} onClose={() => {}} />
 */
export function GroupPattiReportModal({ groupId, isOpen, onClose }) {
  const {
    isPreviewOpen,
    isLoading,
    htmlContent,
    pageCount,
    openPreview,
    closePreview,
    fallbackUrl
  } = usePrintPreview();

  React.useEffect(() => {
    if (isOpen && groupId) {
      openPreview(
        () => reportService.getGroupPattiReport(groupId, { asJson: true }),
        `Group Patti Report - Group #${groupId}`
      );
    }
  }, [isOpen, groupId, openPreview]);

  const handleClose = () => {
    closePreview();
    onClose();
  };

  return (
    <>
      <PrintProgressDialog
        isOpen={isLoading}
        message={`Loading Group Patti Report (${pageCount} pages)...`}
      />

      <PrintPreviewModal
        isOpen={isPreviewOpen}
        htmlContent={htmlContent}
        previewUrl={fallbackUrl}
        pageCount={pageCount}
        title={`Group Patti Report - Group #${groupId} (${pageCount} pages)`}
        onClose={handleClose}
      />
    </>
  );
}


// ============================================================
// EXAMPLE 4: Daily Sales Report with Filters
// ============================================================

/**
 * Daily Sales Report Component
 * Sales data with optional item filter
 * 
 * Usage:
 * <DailySalesReportPage />
 */
export function DailySalesReportPage() {
  const {
    isPreviewOpen,
    isLoading,
    error,
    htmlContent,
    pageCount,
    openPreview,
    closePreview,
    fallbackUrl
  } = usePrintPreview();

  const [filters, setFilters] = React.useState({
    fromDate: reportService.getDefaultDateRange().fromDate,
    toDate: reportService.getDefaultDateRange().toDate,
    itemName: null
  });

  const [availableItems, setAvailableItems] = React.useState([]);

  // Load available items on mount
  React.useEffect(() => {
    loadAvailableItems();
  }, []);

  const loadAvailableItems = async () => {
    try {
      const items = await reportService.getAvailableItems?.();
      if (items) {
        setAvailableItems(items);
      }
    } catch (err) {
      console.error('Failed to load item list:', err);
    }
  };

  const handleGenerateReport = async () => {
    await openPreview(
      () => reportService.getDailySalesReport({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        itemName: filters.itemName,
        asJson: true
      }),
      'Daily Sales Report'
    );
  };

  return (
    <div>
      <h2>Daily Sales Report</h2>

      {/* Filters */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Item:
            <select
              value={filters.itemName || ''}
              onChange={(e) => setFilters({ 
                ...filters, 
                itemName: e.target.value || null 
              })}
              style={{ marginLeft: '5px' }}
            >
              <option value="">All Items</option>
              {availableItems.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label>
            From:
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              style={{ marginLeft: '5px' }}
            />
          </label>
          <label style={{ marginLeft: '10px' }}>
            To:
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              style={{ marginLeft: '5px' }}
            />
          </label>
        </div>
      </div>

      {/* Action buttons */}
      <button 
        onClick={handleGenerateReport}
        disabled={isLoading}
        style={{
          padding: '10px 20px',
          marginRight: '10px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Loading...' : '📋 Generate Report'}
      </button>

      {error && (
        <div style={{ 
          color: '#d32f2f', 
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#ffebee',
          borderRadius: '4px'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Dialogs */}
      <PrintProgressDialog
        isOpen={isLoading}
        message="Generating daily sales report..."
      />

      <PrintPreviewModal
        isOpen={isPreviewOpen}
        htmlContent={htmlContent}
        previewUrl={fallbackUrl}
        pageCount={pageCount}
        title={`Daily Sales Report (${pageCount} pages)`}
        onClose={closePreview}
      />
    </div>
  );
}


// ============================================================
// EXAMPLE 5: Button Component for Reports
// ============================================================

/**
 * Reusable Report Button Component
 * 
 * Usage:
 * <ReportButton
 *   label="View Ledger"
 *   onGenerate={async () => reportService.getLedgerReport(1, {asJson: true})}
 *   title="Ledger Report"
 * />
 */
export function ReportButton({ 
  label, 
  onGenerate, 
  title = 'Report',
  variant = 'primary' 
}) {
  const {
    isPreviewOpen,
    isLoading,
    htmlContent,
    pageCount,
    openPreview,
    closePreview,
    error,
    fallbackUrl
  } = usePrintPreview();

  const handleClick = async () => {
    try {
      await openPreview(onGenerate, title);
    } catch (err) {
      console.error('Report generation failed:', err);
    }
  };

  const buttonStyles = {
    primary: {
      backgroundColor: '#007bff',
      color: 'white'
    },
    success: {
      backgroundColor: '#28a745',
      color: 'white'
    },
    danger: {
      backgroundColor: '#dc3545',
      color: 'white'
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.6 : 1,
          ...buttonStyles[variant]
        }}
      >
        {isLoading ? '⏳ Loading...' : label}
      </button>

      <PrintProgressDialog isOpen={isLoading} />

      <PrintPreviewModal
        isOpen={isPreviewOpen}
        htmlContent={htmlContent}
        previewUrl={fallbackUrl}
        pageCount={pageCount}
        title={title}
        onClose={closePreview}
      />

      {error && (
        <div style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
          Error: {error}
        </div>
      )}
    </>
  );
}


export default {
  CustomerLedgerPage,
  GroupTotalReportSection,
  GroupPattiReportModal,
  DailySalesReportPage,
  ReportButton
};
