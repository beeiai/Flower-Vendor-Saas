/**
 * usePrintPreview Hook
 * 
 * Custom hook that manages the complete report preview workflow:
 * - Fetching report data from backend
 * - Showing progress dialog while loading
 * - Handling errors with fallback to new tab
 * - Managing modal state
 * 
 * Usage:
 * ```jsx
 * const {
 *   isPreviewOpen,
 *   htmlContent,
 *   pageCount,
 *   isLoading,
 *   error,
 *   openPreview,
 *   closePreview,
 *   handlePrint
 * } = usePrintPreview();
 * 
 * // Open ledger report
 * openPreview(() => 
 *   reportService.getLedgerReport(customerId, { asJson: true })
 * );
 * ```
 */

import { useState, useCallback } from 'react';
import * as reportService from '../services/reportService';

export const usePrintPreview = () => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [reportTitle, setReportTitle] = useState('Print Preview');
  const [fallbackUrl, setFallbackUrl] = useState(null);

  /**
   * Open preview modal with report data
   * 
   * @param {Function} fetchFn - Function that returns Promise with report data
   * @param {string} title - Report title for display
   * @param {Function} onComplete - Optional callback when preview is ready
   */
  const openPreview = useCallback(async (fetchFn, title = 'Print Preview', onComplete = null) => {
    setIsLoading(true);
    setError(null);
    setReportTitle(title);
    setCurrentPage(1);

    try {
      // Simulate progress by updating state periodically
      const progressInterval = setInterval(() => {
        setCurrentPage(prev => Math.min(prev + 1, pageCount));
      }, 100);

      // Call the fetch function
      const result = await fetchFn();

      clearInterval(progressInterval);

      // Handle different response types
      // Normalize axios responses that wrap Blob in `data`
      const payload = result && result.data instanceof Blob ? result.data : result;

      if (typeof payload === 'string') {
        // HTML response
        setHtmlContent(payload);
        setPageCount(1);
      } else if (payload && payload.html && payload.metadata) {
        // JSON response with metadata
        setHtmlContent(result.html);
        setPageCount(result.metadata.page_count || 1);
        
        // Store fallback URL info (in case user wants to open in new tab)
        setFallbackUrl(result.metadata.fallback_url);
      } else if (payload && payload.content) {
        // Alternative response format
        setHtmlContent(payload.content);
        setPageCount(payload.page_count || 1);
      } else if (payload instanceof Blob) {
        // Blob response (PDF/HTML/DOCX)
        const type = String(payload.type || '').toLowerCase();
        if (type.includes('html') || type.startsWith('text/')) {
          const txt = await payload.text();
          setHtmlContent(txt || '');
          setPageCount(1);
        } else if (type.includes('pdf')) {
          const url = URL.createObjectURL(payload);
          setFallbackUrl(url);
          setHtmlContent('');
          setPageCount(1);
        } else {
          // Other binary (docx) - expose URL for download/open
          const url = URL.createObjectURL(payload);
          setFallbackUrl(url);
          setHtmlContent('');
          setPageCount(1);
        }
      } else {
        throw new Error('Invalid report format returned from server');
      }

      setIsPreviewOpen(true);

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
      setError(err.message || 'Failed to generate report');

      // If preview loading fails, offer fallback to new tab
      showFallbackOption();
    } finally {
      setIsLoading(false);
    }
  }, [pageCount]);

  /**
   * Close the preview modal
   */
  const closePreview = useCallback(() => {
    // Revoke any created blob URLs to avoid memory leaks
    try {
      if (fallbackUrl && String(fallbackUrl).startsWith('blob:')) {
        URL.revokeObjectURL(fallbackUrl);
      }
    } catch (e) {
      // ignore
    }
    setFallbackUrl(null);
    setIsPreviewOpen(false);
    setHtmlContent('');
    setError(null);
    setCurrentPage(1);
  }, []);

  /**
   * Handle print action
   * Called when user clicks print button
   */
  const handlePrint = useCallback(() => {
    console.log('Print triggered for report:', reportTitle);
    // Additional print tracking/logging can be added here
  }, [reportTitle]);

  /**
   * Show fallback option when preview fails
   * Offers user to open report in new tab instead
   */
  const showFallbackOption = useCallback(() => {
    if (window.confirm(
      'Failed to load preview. Would you like to open the report in a new tab instead?'
    )) {
      openInNewTab();
    }
  }, []);

  /**
   * Open report in new tab (fallback method)
   */
  const openInNewTab = useCallback(() => {
    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank');
    }
  }, [fallbackUrl]);

  /**
   * Retry opening preview after error
   * 
   * @param {Function} fetchFn - Same fetch function that failed
   */
  const retryPreview = useCallback((fetchFn) => {
    setError(null);
    openPreview(fetchFn, reportTitle);
  }, [openPreview, reportTitle]);

  return {
    // State
    isPreviewOpen,
    isLoading,
    error,
    htmlContent,
    fallbackUrl,
    pageCount,
    currentPage,
    reportTitle,

    // Methods
    openPreview,
    closePreview,
    handlePrint,
    retryPreview,
    openInNewTab
  };
};

export default usePrintPreview;
