/**
 * PrintProgressDialog Component
 * 
 * Modal dialog that displays progress while report is being generated/loaded.
 * Features:
 * - Centered modal layout
 * - Animated spinner
 * - Progress text showing current page
 * - Auto-close on completion
 * - Simulated progress rendering for responsiveness
 * 
 * Usage:
 * ```jsx
 * <PrintProgressDialog
 *   isOpen={true}
 *   message="Generating report..."
 *   progress={45}
 *   totalPages={10}
 *   currentPage={4}
 * />
 * ```
 */

import React, { useEffect, useState } from 'react';

const PrintProgressDialog = ({
  isOpen = false,
  message = 'Generating report...',
  progress = 0,
  totalPages = 0,
  currentPage = 0,
  onClose = null,
  autoCloseDelay = 2000
}) => {
  const [displayProgress, setDisplayProgress] = useState(progress);
  const [isClosing, setIsClosing] = useState(false);

  /**
   * Animate progress bar
   */
  useEffect(() => {
    if (!isOpen) {
      setDisplayProgress(0);
      return;
    }

    // Simulate smooth progress if actual progress is provided
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        if (progress > prev) {
          // Progress was updated externally, move toward it
          return Math.min(prev + 10, progress);
        } else if (prev < 95) {
          // Still waiting, slowly increment
          return prev + Math.random() * 5;
        }
        return prev;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [isOpen, progress]);

  /**
   * Auto-close when progress reaches 100%
   */
  useEffect(() => {
    if (displayProgress >= 100 && isOpen) {
      setIsClosing(true);
      
      const timer = setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [displayProgress, isOpen, autoCloseDelay, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="print-progress-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(2px)'
      }}
    >
      {/* Dialog content */}
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '40px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}
      >
        {/* Spinner */}
        <div
          style={{
            marginBottom: '20px',
            height: '60px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              display: 'inline-block',
              width: '50px',
              height: '50px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              opacity: isClosing ? 0.5 : 1,
              transition: 'opacity 0.3s ease'
            }}
          />
        </div>

        {/* Message */}
        <h3
          style={{
            fontSize: '18px',
            margin: '0 0 10px 0',
            color: '#333',
            fontWeight: 600
          }}
        >
          {message}
        </h3>

        {/* Progress text */}
        {currentPage > 0 && totalPages > 0 && (
          <p
            style={{
              fontSize: '14px',
              color: '#666',
              margin: '5px 0 15px 0'
            }}
          >
            Page {currentPage} of {totalPages}
          </p>
        )}

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#e9ecef',
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '15px'
          }}
        >
          <div
            style={{
              height: '100%',
              backgroundColor: '#007bff',
              width: `${Math.min(displayProgress, 100)}%`,
              transition: 'width 0.3s ease',
              borderRadius: '3px'
            }}
          />
        </div>

        {/* Progress percentage */}
        <p
          style={{
            fontSize: '12px',
            color: '#999',
            margin: 0
          }}
        >
          {Math.round(displayProgress)}%
        </p>

        {/* Closing message */}
        {isClosing && (
          <p
            style={{
              fontSize: '13px',
              color: '#28a745',
              margin: '15px 0 0 0',
              fontWeight: 500,
              animation: 'fadeIn 0.5s ease'
            }}
          >
            ✓ Complete! Opening preview...
          </p>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintProgressDialog;
