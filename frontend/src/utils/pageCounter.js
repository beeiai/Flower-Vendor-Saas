/**
 * Frontend Page Counter Utility
 * 
 * Client-side estimates for report page counts.
 * Aligns with backend page_counter.py for consistency.
 * 
 * Note: Backend provides accurate counts via JSON metadata.
 * This utility is for UI estimation and fallback purposes.
 */

// A4 dimensions in pixels (at 96dpi)
const A4_HEIGHT_PX = 1122; // 297mm
const A4_WIDTH_PX = 794;   // 210mm
const MARGIN_TOP_PX = 20;
const MARGIN_BOTTOM_PX = 20;
const MARGIN_LEFT_PX = 20;
const MARGIN_RIGHT_PX = 20;

const USABLE_HEIGHT = A4_HEIGHT_PX - MARGIN_TOP_PX - MARGIN_BOTTOM_PX; // 1082px
const USABLE_WIDTH = A4_WIDTH_PX - MARGIN_LEFT_PX - MARGIN_RIGHT_PX;   // 754px

const HEADER_HEIGHT = 150;  // Logo + title in pixels
const FOOTER_HEIGHT = 50;   // Page number, etc.
const CONTENT_HEIGHT = USABLE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT; // ~882px

/**
 * Calculate pages for Ledger Report
 * ~25-28 rows per page (each row ~8mm / ~30px)
 */
export function calculateLedgerPages(recordCount) {
  if (recordCount === 0) return 1;
  
  const rowsPerPage = 27;
  const pages = Math.ceil(recordCount / rowsPerPage);
  
  return Math.max(1, pages);
}

/**
 * Calculate pages for Group Total Report
 * ~20-22 groups per page (each group row ~10mm / ~38px)
 */
export function calculateGroupTotalPages(groupCount) {
  if (groupCount === 0) return 1;
  
  const groupsPerPage = 21;
  const pages = Math.ceil(groupCount / groupsPerPage);
  
  return Math.max(1, pages);
}

/**
 * Calculate pages for Daily Sales Report
 * ~32-35 rows per page (compact layout, ~7mm / ~26px per row)
 */
export function calculateDailySalesPages(recordCount) {
  if (recordCount === 0) return 1;
  
  const rowsPerPage = 33;
  const pages = Math.ceil(recordCount / rowsPerPage);
  
  return Math.max(1, pages);
}

/**
 * Calculate pages for Group Patti Report (most complex)
 * 
 * Per group with 15 entries: ~450px (fits ~2 groups per page)
 * Per group with 30 entries: ~820px (fits ~1 group per page)
 * Per group with 50+ entries: requires 2+ pages
 * 
 * @param {number} totalRecords - Total transactions across all groups
 * @param {number} groupCount - Number of groups
 * @param {number} avgRecordsPerGroup - Average records per group (optional)
 * @returns {number} Estimated page count
 */
export function calculateGroupPattiPages(totalRecords, groupCount, avgRecordsPerGroup = null) {
  if (totalRecords === 0) return 1;
  if (groupCount === 0) return 1;
  
  // Calculate average if not provided
  const avgRecords = avgRecordsPerGroup || (totalRecords / groupCount);
  
  // Each group occupies:
  // - Header: 30px
  // - Footer: 30px
  // - Gap: 20px
  // - Detail rows: 7mm (~26px) each
  
  const groupContentHeight = 80; // header + footer + gap
  const perRecordHeight = 26;
  
  const avgGroupHeight = groupContentHeight + (avgRecords * perRecordHeight);
  
  if (avgGroupHeight < CONTENT_HEIGHT) {
    const groupsPerPage = Math.floor(CONTENT_HEIGHT / avgGroupHeight);
    const pages = Math.ceil(groupCount / Math.max(1, groupsPerPage));
    return Math.max(1, pages);
  } else {
    // Large groups: each group may need multiple pages
    const pagesPerGroup = Math.ceil(avgGroupHeight / CONTENT_HEIGHT);
    const pages = groupCount * pagesPerGroup;
    return Math.max(1, pages);
  }
}

/**
 * Unified function to estimate page count
 * Aligns with backend estimate_pdf_page_count()
 * 
 * @param {string} reportType - 'ledger', 'group_total', 'daily_sales', or 'group_patti'
 * @param {number} recordCount - Number of detail records
 * @param {number} groupCount - Number of groups (for group_patti)
 * @param {number} avgRecordsPerGroup - Average records per group (for group_patti)
 * @returns {number} Estimated page count
 */
export function estimatePdfPageCount(
  reportType,
  recordCount = 0,
  groupCount = 0,
  avgRecordsPerGroup = null
) {
  switch (reportType) {
    case 'ledger':
      return calculateLedgerPages(recordCount);
    case 'group_total':
      return calculateGroupTotalPages(groupCount);
    case 'daily_sales':
      return calculateDailySalesPages(recordCount);
    case 'group_patti':
      return calculateGroupPattiPages(recordCount, groupCount, avgRecordsPerGroup);
    default:
      return 1;
  }
}

/**
 * Estimate page count from HTML content
 * Useful for fallback when metadata is unavailable
 * 
 * @param {string} htmlContent - HTML string to analyze
 * @returns {number} Estimated page count based on content height
 */
export function estimatePagesFromHtml(htmlContent) {
  try {
    // Create a temporary DOM element
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Get total content height
    const pages = doc.querySelectorAll('.page');
    if (pages.length > 0) {
      return pages.length;
    }
    
    // Fallback: estimate from total body height
    const body = doc.body;
    if (body) {
      const heights = Array.from(doc.querySelectorAll('*')).map(el => {
        const style = window.getComputedStyle(el);
        const height = parseFloat(style.height);
        return isNaN(height) ? 0 : height;
      });
      
      const totalHeight = Math.max(...heights);
      return Math.ceil(totalHeight / A4_HEIGHT_PX) || 1;
    }
    
    return 1;
  } catch (error) {
    console.error('Error estimating pages from HTML:', error);
    return 1; // Fallback to 1 page
  }
}

/**
 * Format page count for display
 * 
 * @param {number} current - Current page number
 * @param {number} total - Total pages
 * @returns {string} Formatted string like "Page 3 of 10"
 */
export function formatPageCount(current, total) {
  return `Page ${Math.max(1, current)} of ${Math.max(1, total)}`;
}

/**
 * Check if page count is acceptable for browser preview
 * Large documents may cause performance issues
 * 
 * @param {number} pageCount - Number of pages
 * @param {number} warningThreshold - Warn if exceeds this (default: 50)
 * @param {number} errorThreshold - Error if exceeds this (default: 100)
 * @returns {Object} { status, message } where status is 'ok', 'warning', or 'error'
 */
export function validatePageCount(pageCount, warningThreshold = 50, errorThreshold = 100) {
  if (pageCount >= errorThreshold) {
    return {
      status: 'error',
      message: `Report has ${pageCount} pages. Browser preview may be slow. Consider printing to PDF directly.`
    };
  }
  
  if (pageCount >= warningThreshold) {
    return {
      status: 'warning',
      message: `Report has ${pageCount} pages. Browser preview may be slower. Consider opening in new tab.`
    };
  }
  
  return {
    status: 'ok',
    message: `Report ready (${pageCount} pages)`
  };
}

export default {
  calculateLedgerPages,
  calculateGroupTotalPages,
  calculateDailySalesPages,
  calculateGroupPattiPages,
  estimatePdfPageCount,
  estimatePagesFromHtml,
  formatPageCount,
  validatePageCount
};
