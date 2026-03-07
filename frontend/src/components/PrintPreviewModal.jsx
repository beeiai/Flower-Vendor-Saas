/**
 * PrintPreviewModal Component
 * 
 * Full-screen modal for previewing reports before printing.
 * Features:
 * - Iframe-based rendering for proper page styling
 * - Zoom controls (75%, 100%, 125%, 150%)
 * - Page counter badge showing current/total pages
 * - Keyboard shortcuts (ESC to close, Ctrl+P to print)
 * - Print button and cancel button
 * - Auto-scrolling to show page count updates
 * 
 * Usage:
 * ```jsx
 * <PrintPreviewModal
 *   isOpen={true}
 *   htmlContent={reportHtml}
 *   pageCount={5}
 *   onPrint={handlePrint}
 *   onClose={handleClose}
 * />
 * ```
 */

import React, { useState, useRef, useEffect } from 'react';
import '../../../static/css/print.css'; // Ensure print styles are loaded

const PrintPreviewModal = ({
  isOpen = false,
  htmlContent = '',
  pageCount = 1,
  onPrint = null,
  onClose = null,
  previewUrl = null,
  title = 'Print Preview'
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  // Zoom presets
  const ZOOM_LEVELS = [75, 100, 125, 150];
  const ZOOM_STEP = 5;

  /**
   * Update iframe zoom level
   */
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentDocument) {
      const body = iframeRef.current.contentDocument.body;
      body.style.transform = `scale(${zoomLevel / 100})`;
      body.style.transformOrigin = '0 0';
      body.style.width = `${100 / (zoomLevel / 100)}%`;
    }
  }, [zoomLevel]);

  /**
   * Load HTML content into iframe
   */
  useEffect(() => {
    if (!isOpen || !iframeRef.current) return;

    try {
      const iframe = iframeRef.current;
      // If previewUrl provided, set iframe src to that URL (used for PDF/blob previews)
      if (previewUrl) {
        iframe.src = previewUrl;
      } else {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(htmlContent);
        doc.close();
      }

      // Apply print styles to iframe
      const styleContent = `
        @page {
          size: A4;
          margin: 0.5cm;
        }
        * {
          margin: 0;
          padding: 0;
        }
      `;
      
      const style = doc.createElement('style');
      style.textContent = styleContent;
      doc.head.appendChild(style);

      // Update page count based on loaded content
      updatePageCount();
      
    } catch (error) {
      console.error('Error loading content into iframe:', error);
    }
  }, [htmlContent, isOpen, previewUrl]);

  /**
   * Estimate current page based on scroll position
   * This is approximate since actual page breaks depend on content dimensions
   */
  const updatePageCount = () => {
    if (!iframeRef.current) return;
    
    try {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const body = doc.body;
      
      if (body) {
        // Estimate based on A4 height (~297mm ≈ 1122px at 96dpi)
        const A4_HEIGHT_PX = 1122;
        const estimatedPages = Math.ceil(body.scrollHeight / A4_HEIGHT_PX) || 1;
        // Note: pageCount prop is more accurate, use that if provided
      }
    } catch (error) {
      console.error('Error calculating page count:', error);
    }
  };

  /**
   * Handle scroll to update current page display
   */
  const handleIframeScroll = () => {
    if (!iframeRef.current) return;

    try {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop;
      const A4_HEIGHT_PX = 1122;
      const page = Math.floor(scrollTop / A4_HEIGHT_PX) + 1;
      
      setCurrentPage(Math.max(1, Math.min(page, pageCount)));
    } catch (error) {
      console.error('Error handling scroll:', error);
    }
  };

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      // ESC to close
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
      // Ctrl+P to print
      else if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        handlePrint();
      }
      // +/- to zoom
      else if (event.ctrlKey || event.metaKey) {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          zoomIn();
        } else if (event.key === '-' || event.key === '_') {
          event.preventDefault();
          zoomOut();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, zoomLevel, onClose, pageCount]);

  /**
   * Print the report
   */
  const handlePrint = () => {
    if (iframeRef.current) {
      try {
        if (onPrint) {
          onPrint();
        }
        
        // Small delay to ensure iframe is ready
        setTimeout(() => {
          iframeRef.current.contentWindow.print();
        }, 100);
      } catch (error) {
        console.error('Print failed:', error);
        alert('Failed to open print dialog. Please try again.');
      }
    }
  };

  /**
   * Zoom in
   */
  const zoomIn = () => {
    setZoomLevel(prev => {
      const nextLevel = prev + ZOOM_STEP;
      return Math.min(nextLevel, 200); // Max 200%
    });
  };

  /**
   * Zoom out
   */
  const zoomOut = () => {
    setZoomLevel(prev => {
      const prevLevel = prev - ZOOM_STEP;
      return Math.max(prevLevel, 50); // Min 50%
    });
  };

  /**
   * Reset zoom to 100%
   */
  const resetZoom = () => {
    setZoomLevel(100);
  };

  /**
   * Set predefined zoom level
   */
  const setZoom = (level) => {
    setZoomLevel(level);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="print-preview-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Modal container */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'white',
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      >
        {/* Toolbar */}
        <div className="print-preview-toolbar">
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px' }}>{title}</h3>
          </div>

          <div className="zoom-controls">
            <button
              onClick={() => setZoom(75)}
              title="Zoom to 75% (or Ctrl+-)"
              className={zoomLevel === 75 ? 'active' : ''}
            >
              75%
            </button>
            <button
              onClick={() => setZoom(100)}
              title="Zoom to 100% (or Ctrl+0)"
              className={zoomLevel === 100 ? 'active' : ''}
            >
              100%
            </button>
            <button
              onClick={() => setZoom(125)}
              title="Zoom to 125%"
              className={zoomLevel === 125 ? 'active' : ''}
            >
              125%
            </button>
            <button
              onClick={() => setZoom(150)}
              title="Zoom to 150%"
              className={zoomLevel === 150 ? 'active' : ''}
            >
              150%
            </button>
            <div className="zoom-display">
              {zoomLevel}%
            </div>
            <button
              onClick={zoomOut}
              title="Zoom Out (Ctrl+-)"
            >
              −
            </button>
            <button
              onClick={zoomIn}
              title="Zoom In (Ctrl++)"
            >
              +
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <span 
              className="page-badge"
              style={{
                position: 'static',
                bottom: 'auto',
                right: 'auto',
                margin: 0
              }}
            >
              Page {currentPage} of {pageCount}
            </span>
            <button
              onClick={handlePrint}
              title="Print this report (Ctrl+P)"
              style={{ background: '#28a745' }}
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              className="danger"
              title="Close preview (ESC)"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Preview content */}
        <div className="print-preview-content">
          <iframe
            ref={iframeRef}
            className="print-preview-iframe"
            title={title}
            sandbox="allow-same-origin allow-popups"
            onLoad={updatePageCount}
            onScroll={handleIframeScroll}
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top left',
              width: `${100 / (zoomLevel / 100)}%`,
              height: `${100 / (zoomLevel / 100)}%`
            }}
          />
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          background: '#333',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '4px',
          fontSize: '11px',
          maxWidth: '200px',
          zIndex: 10000
        }}
      >
        <strong>Shortcuts:</strong><br/>
        ESC: Close | Ctrl+P: Print<br/>
        Ctrl++: Zoom in | Ctrl+−: Zoom out
      </div>
    </div>
  );
};

export default PrintPreviewModal;
