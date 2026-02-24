/**
 * Report Service
 * 
 * Handles all API calls for report generation.
 * Supports both HTML (direct viewing) and JSON (for enhanced preview with metadata).
 * 
 * Features:
 * - Automatic date range defaults (month start to today)
 * - JSON metadata with page counts and record counts
 * - Error handling and retry logic
 * - Fallback to new tab on preview failures
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

// Define available reports
export const REPORT_TYPES = {
  LEDGER: 'ledger',
  GROUP_TOTAL: 'group_total',
  GROUP_PATTI: 'group_patti',
  DAILY_SALES: 'daily_sales'
};

/**
 * Get the default date range (start of month to today)
 * @returns {Object} { fromDate, toDate } in YYYY-MM-DD format
 */
export function getDefaultDateRange() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const fromDate = formatDate(firstDay);
  const toDate = formatDate(today);
  
  return { fromDate, toDate };
}

/**
 * Format date to YYYY-MM-DD string
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date string to Date object
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {Date} Date object
 */
export function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Generic fetch function with error handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise} Response promise
 */
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response;
}

/**
 * Get Ledger Report (for specific customer)
 * 
 * @param {number} customerId - Farmer ID
 * @param {Object} options - Optional parameters
 * @param {string} options.fromDate - Start date (YYYY-MM-DD, optional)
 * @param {string} options.toDate - End date (YYYY-MM-DD, optional)
 * @param {boolean} options.asJson - Return JSON with metadata (default: true for preview)
 * @returns {Promise<Object>} Report data
 * 
 * @example
 * const report = await reportService.getLedgerReport(1, { asJson: true });
 * console.log(report.metadata.page_count); // 3
 */
export async function getLedgerReport(customerId, options = {}) {
  const { fromDate, toDate, asJson = true } = options;
  const { fromDate: defaultFrom, toDate: defaultTo } = getDefaultDateRange();
  
  const params = new URLSearchParams({
    from_date: fromDate || defaultFrom,
    to_date: toDate || defaultTo,
    format: asJson ? 'json' : 'html'
  });
  
  const url = `${API_BASE}/reports/ledger/${customerId}?${params}`;
  const response = await fetchWithAuth(url);
  
  return asJson ? response.json() : response.text();
}

/**
 * Get Group Total Report (aggregated by group)
 * 
 * @param {Object} options - Optional parameters
 * @param {string} options.fromDate - Start date (YYYY-MM-DD, optional)
 * @param {string} options.toDate - End date (YYYY-MM-DD, optional)
 * @param {boolean} options.asJson - Return JSON with metadata (default: true for preview)
 * @returns {Promise<Object>} Report data
 * 
 * @example
 * const report = await reportService.getGroupTotalReport({ asJson: true });
 * console.log(report.metadata.record_count); // Number of groups
 */
export async function getGroupTotalReport(options = {}) {
  const { fromDate, toDate, asJson = true } = options;
  const { fromDate: defaultFrom, toDate: defaultTo } = getDefaultDateRange();
  
  const params = new URLSearchParams({
    from_date: fromDate || defaultFrom,
    to_date: toDate || defaultTo,
    format: asJson ? 'json' : 'html'
  });
  
  const url = `${API_BASE}/reports/group-total?${params}`;
  const response = await fetchWithAuth(url);
  
  return asJson ? response.json() : response.text();
}

/**
 * Get Group Patti Report (detailed by group and farmer)
 * 
 * @param {number} groupId - Farmer Group ID
 * @param {Object} options - Optional parameters
 * @param {string} options.fromDate - Start date (YYYY-MM-DD, optional)
 * @param {string} options.toDate - End date (YYYY-MM-DD, optional)
 * @param {boolean} options.asJson - Return JSON with metadata (default: true for preview)
 * @returns {Promise<Object>} Report data with farmer details
 * 
 * @example
 * const report = await reportService.getGroupPattiReport(5, { asJson: true });
 * console.log(report.metadata.farmer_count); // Number of farmers
 */
export async function getGroupPattiReport(groupId, options = {}) {
  const { fromDate, toDate, asJson = true } = options;
  const { fromDate: defaultFrom, toDate: defaultTo } = getDefaultDateRange();
  
  const params = new URLSearchParams({
    from_date: fromDate || defaultFrom,
    to_date: toDate || defaultTo,
    format: asJson ? 'json' : 'html'
  });
  
  const url = `${API_BASE}/reports/group-patti/${groupId}?${params}`;
  const response = await fetchWithAuth(url);
  
  return asJson ? response.json() : response.text();
}

/**
 * Get Daily Sales Report (from collection data)
 * 
 * @param {Object} options - Optional parameters
 * @param {string} options.fromDate - Start date (YYYY-MM-DD, optional)
 * @param {string} options.toDate - End date (YYYY-MM-DD, optional)
 * @param {string} options.itemName - Filter by item name (optional)
 * @param {boolean} options.asJson - Return JSON with metadata (default: true for preview)
 * @returns {Promise<Object>} Report data with daily sales
 * 
 * @example
 * const report = await reportService.getDailySalesReport({ 
 *   fromDate: '2024-02-01',
 *   asJson: true 
 * });
 */
export async function getDailySalesReport(options = {}) {
  const { fromDate, toDate, itemName, asJson = true } = options;
  const { fromDate: defaultFrom, toDate: defaultTo } = getDefaultDateRange();
  
  const params = new URLSearchParams({
    from_date: fromDate || defaultFrom,
    to_date: toDate || defaultTo,
    format: asJson ? 'json' : 'html'
  });
  
  if (itemName) {
    params.append('item_name', itemName);
  }
  
  const url = `${API_BASE}/reports/daily-sales?${params}`;
  const response = await fetchWithAuth(url);
  
  return asJson ? response.json() : response.text();
}

/**
 * Generate report with enhanced error handling and fallback
 * 
 * @param {Function} fetchFn - Report fetch function (e.g., getLedgerReport)
 * @param {Array} args - Arguments to pass to fetch function
 * @param {Object} callbacks - Optional callbacks
 * @param {Function} callbacks.onSuccess - Called on successful fetch
 * @param {Function} callbacks.onError - Called on error
 * @returns {Promise<Object>} Report data
 */
export async function generateReport(fetchFn, args, callbacks = {}) {
  try {
    const report = await fetchFn(...args);
    
    if (callbacks.onSuccess) {
      callbacks.onSuccess(report);
    }
    
    return report;
  } catch (error) {
    console.error('Report generation failed:', error);
    
    if (callbacks.onError) {
      callbacks.onError(error);
    }
    
    throw error;
  }
}

/**
 * Open report in new tab (fallback when preview fails)
 * 
 * @param {string} reportUrl - Full API URL to report endpoint
 * @param {string} windowName - Name for new window (default: '_blank')
 */
export function openReportInNewTab(reportUrl, windowName = '_blank') {
  const fullUrl = reportUrl.includes('http') ? reportUrl : API_BASE + reportUrl;
  window.open(fullUrl, windowName);
}

/**
 * Create printable report URL
 * Constructs the API endpoint URL for a specific report
 * 
 * @param {string} reportType - Type of report (LEDGER, GROUP_TOTAL, etc.)
 * @param {Object} params - Report parameters
 * @returns {string} Full API URL
 * 
 * @example
 * const url = reportService.createReportUrl(
 *   REPORT_TYPES.LEDGER,
 *   { customerId: 1, format: 'html' }
 * );
 */
export function createReportUrl(reportType, params = {}) {
  const { customerId, groupId, fromDate, toDate, itemName, format = 'html' } = params;
  const { fromDate: defaultFrom, toDate: defaultTo } = getDefaultDateRange();
  
  const queryParams = new URLSearchParams({
    from_date: fromDate || defaultFrom,
    to_date: toDate || defaultTo,
    format
  });
  
  if (itemName) {
    queryParams.append('item_name', itemName);
  }
  
  switch (reportType) {
    case REPORT_TYPES.LEDGER:
      return `${API_BASE}/reports/ledger/${customerId}?${queryParams}`;
    case REPORT_TYPES.GROUP_TOTAL:
      return `${API_BASE}/reports/group-total?${queryParams}`;
    case REPORT_TYPES.GROUP_PATTI:
      return `${API_BASE}/reports/group-patti/${groupId}?${queryParams}`;
    case REPORT_TYPES.DAILY_SALES:
      return `${API_BASE}/reports/daily-sales?${queryParams}`;
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}
