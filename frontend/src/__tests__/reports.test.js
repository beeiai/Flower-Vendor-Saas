/**
 * Frontend Test Cases for Report Components
 * 
 * Run with: npm test
 * 
 * Tests all React components and hooks:
 * - PrintPreviewModal zoom, keyboard shortcuts, page counting
 * - PrintProgressDialog progress animation
 * - usePrintPreview hook state management
 * - reportService API calls
 * - pageCounter utility calculations
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrintPreviewModal from '../src/components/PrintPreviewModal';
import PrintProgressDialog from '../src/components/PrintProgressDialog';
import usePrintPreview from '../src/hooks/usePrintPreview';
import * as reportService from '../src/services/reportService';
import * as pageCounter from '../src/utils/pageCounter';

// ================================================================
// MOCKS & FIXTURES
// ================================================================

const mockHtmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Test Report</title>
  <link rel="stylesheet" href="/static/css/print.css">
</head>
<body>
  <div class="page">
    <h1>Test Report Page 1</h1>
    <p>This is test content.</p>
  </div>
  <div class="page">
    <h1>Test Report Page 2</h1>
    <p>This is test content on page 2.</p>
  </div>
</body>
</html>
`;

const mockReportData = {
  html: mockHtmlContent,
  metadata: {
    page_count: 2,
    record_count: 50,
    report_type: 'ledger',
    paper_size: 'A4',
    generated_at: new Date().toISOString(),
    date_range: {
      from: '2024-02-01',
      to: '2024-02-29'
    }
  }
};


// ================================================================
// PrintPreviewModal TESTS
// ================================================================

describe('PrintPreviewModal', () => {
  
  test('renders when isOpen is true', () => {
    render(
      <PrintPreviewModal
        isOpen={true}
        htmlContent={mockHtmlContent}
        pageCount={2}
        title="Test Report"
      />
    );
    
    expect(screen.getByText('Test Report')).toBeInTheDocument();
    console.log('✓ Modal renders when open');
  });

  test('does not render when isOpen is false', () => {
    const { container } = render(
      <PrintPreviewModal
        isOpen={false}
        htmlContent={mockHtmlContent}
        pageCount={2}
      />
    );
    
    expect(container.firstChild).toBeNull();
    console.log('✓ Modal hidden when closed');
  });

  test('displays page count badge', () => {
    render(
      <PrintPreviewModal
        isOpen={true}
        htmlContent={mockHtmlContent}
        pageCount={5}
      />
    );
    
    expect(screen.getByText(/Page.*of 5/)).toBeInTheDocument();
    console.log('✓ Page count badge displays');
  });

  test('zoom controls update zoom level', () => {
    render(
      <PrintPreviewModal
        isOpen={true}
        htmlContent={mockHtmlContent}
        pageCount={2}
      />
    );
    
    // Click 150% zoom
    const zoom150Button = screen.getByRole('button', { name: /150%/ });
    fireEvent.click(zoom150Button);
    
    // Should show 150% in zoom display
    expect(screen.getByText('150%')).toBeInTheDocument();
    console.log('✓ Zoom controls work');
  });

  test('keyboard shortcut ESC closes modal', () => {
    const mockOnClose = jest.fn();
    
    render(
      <PrintPreviewModal
        isOpen={true}
        htmlContent={mockHtmlContent}
        pageCount={2}
        onClose={mockOnClose}
      />
    );
    
    // Simulate ESC key
    fireEvent.keyDown(window, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalled();
    console.log('✓ ESC keyboard shortcut closes modal');
  });

  test('keyboard shortcut Ctrl+P triggers print', () => {
    const mockOnPrint = jest.fn();
    window.print = jest.fn();
    
    render(
      <PrintPreviewModal
        isOpen={true}
        htmlContent={mockHtmlContent}
        pageCount={2}
        onPrint={mockOnPrint}
      />
    );
    
    // Simulate Ctrl+P
    fireEvent.keyDown(window, { key: 'p', ctrlKey: true });
    
    expect(mockOnPrint).toHaveBeenCalled();
    console.log('✓ Ctrl+P keyboard shortcut triggers print');
  });

  test('Print button works', () => {
    const mockOnPrint = jest.fn();
    window.print = jest.fn();
    
    render(
      <PrintPreviewModal
        isOpen={true}
        htmlContent={mockHtmlContent}
        pageCount={2}
        onPrint={mockOnPrint}
      />
    );
    
    const printButton = screen.getByRole('button', { name: /Print/ });
    fireEvent.click(printButton);
    
    expect(mockOnPrint).toHaveBeenCalled();
    console.log('✓ Print button works');
  });

  test('Close button calls onClose callback', () => {
    const mockOnClose = jest.fn();
    
    render(
      <PrintPreviewModal
        isOpen={true}
        htmlContent={mockHtmlContent}
        pageCount={2}
        onClose={mockOnClose}
      />
    );
    
    const closeButton = screen.getByRole('button', { name: /Close/ });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
    console.log('✓ Close button works');
  });

  test('displays keyboard shortcuts hint', () => {
    render(
      <PrintPreviewModal
        isOpen={true}
        htmlContent={mockHtmlContent}
        pageCount={2}
      />
    );
    
    expect(screen.getByText(/ESC.*Close/i)).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\+P.*Print/i)).toBeInTheDocument();
    console.log('✓ Keyboard shortcuts hint displayed');
  });
});


// ================================================================
// PrintProgressDialog TESTS
// ================================================================

describe('PrintProgressDialog', () => {
  
  test('renders when isOpen is true', () => {
    render(
      <PrintProgressDialog
        isOpen={true}
        message="Loading report..."
      />
    );
    
    expect(screen.getByText('Loading report...')).toBeInTheDocument();
    console.log('✓ Progress dialog renders when open');
  });

  test('does not render when isOpen is false', () => {
    const { container } = render(
      <PrintProgressDialog
        isOpen={false}
        message="Loading report..."
      />
    );
    
    expect(container.firstChild).toBeNull();
    console.log('✓ Progress dialog hidden when closed');
  });

  test('displays progress percentage', () => {
    render(
      <PrintProgressDialog
        isOpen={true}
        progress={45}
        message="Generating report..."
      />
    );
    
    expect(screen.getByText(/45%/)).toBeInTheDocument();
    console.log('✓ Progress percentage displays');
  });

  test('displays page counter when provided', () => {
    render(
      <PrintProgressDialog
        isOpen={true}
        currentPage={3}
        totalPages={10}
      />
    );
    
    expect(screen.getByText(/Page 3 of 10/)).toBeInTheDocument();
    console.log('✓ Page counter displays');
  });

  test('auto-closes on progress completion', (done) => {
    const mockOnClose = jest.fn();
    
    const { rerender } = render(
      <PrintProgressDialog
        isOpen={true}
        progress={50}
        onClose={mockOnClose}
        autoCloseDelay={100}
      />
    );
    
    // Simulate progress completion
    rerender(
      <PrintProgressDialog
        isOpen={true}
        progress={100}
        onClose={mockOnClose}
        autoCloseDelay={100}
      />
    );
    
    // Wait for auto-close
    setTimeout(() => {
      expect(mockOnClose).toHaveBeenCalled();
      console.log('✓ Auto-close on completion works');
      done();
    }, 150);
  });

  test('displays loading spinner', () => {
    const { container } = render(
      <PrintProgressDialog
        isOpen={true}
        message="Loading..."
      />
    );
    
    // Spinner should have rotation animation
    const spinner = container.querySelector('[style*="animation"]');
    expect(spinner).toBeInTheDocument();
    console.log('✓ Loading spinner displays');
  });
});


// ================================================================
// usePrintPreview HOOK TESTS
// ================================================================

describe('usePrintPreview', () => {
  
  test('initializes with correct default state', () => {
    const { result } = renderHook(() => usePrintPreview());
    
    expect(result.current.isPreviewOpen).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.htmlContent).toBe('');
    expect(result.current.pageCount).toBe(1);
    
    console.log('✓ Hook initializes with correct defaults');
  });

  test('openPreview opens modal with data', async () => {
    const { result } = renderHook(() => usePrintPreview());
    
    const mockFetch = jest.fn().mockResolvedValue(mockReportData);
    
    await act(async () => {
      await result.current.openPreview(mockFetch, 'Test Report');
    });
    
    expect(result.current.isPreviewOpen).toBe(true);
    expect(result.current.htmlContent).toBe(mockHtmlContent);
    expect(result.current.pageCount).toBe(2);
    
    console.log('✓ openPreview opens modal with data');
  });

  test('closePreview closes modal', async () => {
    const { result } = renderHook(() => usePrintPreview());
    
    const mockFetch = jest.fn().mockResolvedValue(mockReportData);
    
    await act(async () => {
      await result.current.openPreview(mockFetch);
    });
    
    expect(result.current.isPreviewOpen).toBe(true);
    
    act(() => {
      result.current.closePreview();
    });
    
    expect(result.current.isPreviewOpen).toBe(false);
    expect(result.current.htmlContent).toBe('');
    
    console.log('✓ closePreview closes modal');
  });

  test('handles fetch errors gracefully', async () => {
    const { result } = renderHook(() => usePrintPreview());
    
    const mockFetch = jest.fn().mockRejectedValue(
      new Error('Network error')
    );
    
    await act(async () => {
      try {
        await result.current.openPreview(mockFetch);
      } catch {
        // Error expected
      }
    });
    
    expect(result.current.error).toBe('Network error');
    expect(result.current.isLoading).toBe(false);
    
    console.log('✓ Hook handles errors gracefully');
  });

  test('retryPreview retries failed fetch', async () => {
    const { result } = renderHook(() => usePrintPreview());
    
    let callCount = 0;
    const mockFetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('Failed'));
      }
      return Promise.resolve(mockReportData);
    });
    
    await act(async () => {
      try {
        await result.current.openPreview(mockFetch);
      } catch {
        // First call fails
      }
    });
    
    expect(result.current.error).not.toBeNull();
    
    await act(async () => {
      await result.current.retryPreview(mockFetch);
    });
    
    expect(result.current.isPreviewOpen).toBe(true);
    
    console.log('✓ retryPreview works');
  });
});


// ================================================================
// reportService API TESTS
// ================================================================

describe('reportService', () => {
  
  test('getDefaultDateRange returns valid dates', () => {
    const { fromDate, toDate } = reportService.getDefaultDateRange();
    
    expect(fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    
    console.log(`✓ Default date range: ${fromDate} to ${toDate}`);
  });

  test('formatDate formats date correctly', () => {
    const date = new Date(2024, 1, 15); // Feb 15, 2024
    const formatted = reportService.formatDate(date);
    
    expect(formatted).toBe('2024-02-15');
    console.log('✓ Date formatting works');
  });

  test('parseDate parses ISO date string', () => {
    const parsed = reportService.parseDate('2024-02-15');
    
    expect(parsed.getFullYear()).toBe(2024);
    expect(parsed.getMonth()).toBe(1); // 0-indexed
    expect(parsed.getDate()).toBe(15);
    
    console.log('✓ Date parsing works');
  });

  test('createReportUrl builds correct URLs', () => {
    const urlLedger = reportService.createReportUrl(
      reportService.REPORT_TYPES.LEDGER,
      { customerId: 1, format: 'html' }
    );
    
    expect(urlLedger).toContain('/api/reports/ledger/1');
    expect(urlLedger).toContain('format=html');
    
    const urlGroupTotal = reportService.createReportUrl(
      reportService.REPORT_TYPES.GROUP_TOTAL,
      { format: 'json' }
    );
    
    expect(urlGroupTotal).toContain('/api/reports/group-total');
    expect(urlGroupTotal).toContain('format=json');
    
    console.log('✓ Report URLs built correctly');
  });
});


// ================================================================
// pageCounter UTILITY TESTS
// ================================================================

describe('pageCounter', () => {
  
  test('calculateLedgerPages estimates correctly', () => {
    expect(pageCounter.calculateLedgerPages(0)).toBe(1);
    expect(pageCounter.calculateLedgerPages(27)).toBe(1);
    expect(pageCounter.calculateLedgerPages(28)).toBe(2);
    expect(pageCounter.calculateLedgerPages(54)).toBe(2);
    expect(pageCounter.calculateLedgerPages(100)).toBe(4);
    
    console.log('✓ Ledger page calculation correct');
  });

  test('calculateGroupTotalPages estimates correctly', () => {
    expect(pageCounter.calculateGroupTotalPages(0)).toBe(1);
    expect(pageCounter.calculateGroupTotalPages(21)).toBe(1);
    expect(pageCounter.calculateGroupTotalPages(22)).toBe(2);
    expect(pageCounter.calculateGroupTotalPages(100)).toBe(5);
    
    console.log('✓ Group total page calculation correct');
  });

  test('calculateDailySalesPages estimates correctly', () => {
    expect(pageCounter.calculateDailySalesPages(0)).toBe(1);
    expect(pageCounter.calculateDailySalesPages(33)).toBe(1);
    expect(pageCounter.calculateDailySalesPages(34)).toBe(2);
    expect(pageCounter.calculateDailySalesPages(100)).toBe(4);
    
    console.log('✓ Daily sales page calculation correct');
  });

  test('calculateGroupPattiPages handles various group sizes', () => {
    // Single small group
    expect(pageCounter.calculateGroupPattiPages(10, 1, 10)).toBeGreaterThanOrEqual(1);
    
    // Multiple groups
    expect(pageCounter.calculateGroupPattiPages(50, 5, 10)).toBeGreaterThanOrEqual(1);
    
    // Large groups
    expect(pageCounter.calculateGroupPattiPages(200, 2, 100)).toBeGreaterThanOrEqual(2);
    
    console.log('✓ Group patti page calculation handles various sizes');
  });

  test('formatPageCount formats correctly', () => {
    expect(pageCounter.formatPageCount(1, 5)).toBe('Page 1 of 5');
    expect(pageCounter.formatPageCount(3, 10)).toBe('Page 3 of 10');
    
    console.log('✓ Page count formatting correct');
  });

  test('validatePageCount identifies issues', () => {
    const small = pageCounter.validatePageCount(10);
    expect(small.status).toBe('ok');
    
    const medium = pageCounter.validatePageCount(50);
    expect(medium.status).toBe('warning');
    
    const large = pageCounter.validatePageCount(150);
    expect(large.status).toBe('error');
    
    console.log('✓ Page count validation works');
  });
});


// ================================================================
// INTEGRATION TESTS
// ================================================================

describe('Component Integration', () => {
  
  test('Full preview workflow: open -> zoom -> print -> close', async () => {
    const mockOnClose = jest.fn();
    const mockOnPrint = jest.fn();
    
    const { rerender } = render(
      <PrintPreviewModal
        isOpen={false}
      />
    );
    
    // Open modal
    rerender(
      <PrintPreviewModal
        isOpen={true}
        htmlContent={mockHtmlContent}
        pageCount={2}
        onPrint={mockOnPrint}
        onClose={mockOnClose}
      />
    );
    
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    // Zoom to 150%
    fireEvent.click(screen.getByRole('button', { name: /150%/ }));
    expect(screen.getByText('150%')).toBeInTheDocument();
    
    // Print
    window.print = jest.fn();
    fireEvent.click(screen.getByRole('button', { name: /Print/ }));
    expect(mockOnPrint).toHaveBeenCalled();
    
    // Close
    fireEvent.click(screen.getByRole('button', { name: /Close/ }));
    expect(mockOnClose).toHaveBeenCalled();
    
    console.log('✓ Full preview workflow works');
  });
});


// ================================================================
// RUN TESTS
// ================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PrintPreviewModal,
    PrintProgressDialog,
    usePrintPreview,
    reportService,
    pageCounter
  };
}

console.log(`
========================================
Frontend Test Suite
========================================

Run with: npm test

All component tests check:
✓ Rendering and visibility
✓ User interactions
✓ Keyboard shortcuts
✓ State management
✓ Error handling
✓ Page counting
✓ Date handling

========================================
`);
