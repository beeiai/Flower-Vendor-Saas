/**
 * Modal Focus Trap Hook
 * Provides accessible focus trapping for modal dialogs
 * Ensures keyboard users cannot escape modal boundaries
 */

import { useEffect, useRef, useCallback } from 'react';
import keyboardManager from '../services/keyboardManager';
import { KEY_CODES, MODAL_SETTINGS } from '../utils/keyboardConfig';

/**
 * Hook for implementing accessible modal focus trapping
 * @param {Object} options - Configuration options
 * @param {boolean} options.isOpen - Whether modal is currently open
 * @param {HTMLElement} options.modalElement - The modal DOM element
 * @param {Function} options.onClose - Callback when modal should close
 * @param {string} options.modalId - Unique identifier for the modal
 * @returns {Object} Modal focus trap utilities
 */
export function useModalFocusTrap(options = {}) {
  const {
    isOpen = false,
    modalElement = null,
    onClose = null,
    modalId = `modal-${Math.random().toString(36).substr(2, 9)}`
  } = options;

  const previousFocusedElement = useRef(null);
  const isMounted = useRef(false);

  /**
   * Get all focusable elements within modal
   */
  const getFocusableElements = useCallback(() => {
    if (!modalElement) return [];

    // Query for focusable elements
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    const elements = modalElement.querySelectorAll(focusableSelectors.join(', '));
    
    // Filter out elements that are visually hidden or have negative tabindex
    return Array.from(elements).filter(element => {
      // Skip elements with negative tabindex
      if (element.getAttribute('tabindex') === '-1') return false;
      
      // Skip hidden elements
      if (element.offsetParent === null) return false;
      
      // Skip elements with aria-hidden
      if (element.getAttribute('aria-hidden') === 'true') return false;
      
      return true;
    });
  }, [modalElement]);

  /**
   * Focus the first focusable element in modal
   */
  const focusFirstElement = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements]);

  /**
   * Focus the last focusable element in modal
   */
  const focusLastElement = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, [getFocusableElements]);

  /**
   * Handle Tab key navigation within modal
   */
  const handleTabKey = useCallback((e) => {
    if (!MODAL_SETTINGS.TRAP_FOCUS) return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const currentIndex = focusableElements.indexOf(document.activeElement);
    
    if (e.shiftKey) {
      // Shift + Tab - move to previous element
      if (currentIndex <= 0) {
        // Wrap to last element
        e.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
      }
    } else {
      // Tab - move to next element
      if (currentIndex === focusableElements.length - 1) {
        // Wrap to first element
        e.preventDefault();
        focusableElements[0].focus();
      }
    }
  }, [getFocusableElements]);

  /**
   * Handle Escape key to close modal
   */
  const handleEscapeKey = useCallback((e) => {
    if (MODAL_SETTINGS.CLOSE_ON_ESCAPE && onClose) {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  /**
   * Trap focus within modal boundaries
   */
  const trapFocus = useCallback(() => {
    if (!isOpen || !modalElement) return;

    // Store previously focused element
    previousFocusedElement.current = document.activeElement;

    // Focus first element in modal
    setTimeout(() => {
      focusFirstElement();
    }, 0);

    // Register with global keyboard manager
    keyboardManager.registerModal(modalId, modalElement, onClose);
  }, [isOpen, modalElement, focusFirstElement, modalId, onClose]);

  /**
   * Release focus trap and return focus
   */
  const releaseFocusTrap = useCallback(() => {
    // Unregister from global keyboard manager
    keyboardManager.unregisterModal(modalId);

    // Return focus to previous element if it still exists
    if (MODAL_SETTINGS.RETURN_FOCUS_ON_CLOSE && 
        previousFocusedElement.current && 
        document.contains(previousFocusedElement.current)) {
      setTimeout(() => {
        previousFocusedElement.current.focus();
      }, 0);
    }

    previousFocusedElement.current = null;
  }, [modalId]);

  /**
   * Handle modal open/close state changes
   */
  useEffect(() => {
    if (isOpen) {
      trapFocus();
    } else {
      releaseFocusTrap();
    }

    return () => {
      if (isOpen) {
        releaseFocusTrap();
      }
    };
  }, [isOpen, trapFocus, releaseFocusTrap]);

  /**
   * Setup modal-specific event listeners
   */
  useEffect(() => {
    if (!isOpen || !modalElement) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case KEY_CODES.TAB:
          handleTabKey(e);
          break;
        case KEY_CODES.ESCAPE:
          handleEscapeKey(e);
          break;
        default:
          break;
      }
    };

    // Add event listener to modal element
    modalElement.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      modalElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, modalElement, handleTabKey, handleEscapeKey]);

  /**
   * Handle clicks outside modal to close
   */
  useEffect(() => {
    if (!isOpen || !MODAL_SETTINGS.CLOSE_ON_OUTSIDE_CLICK || !onClose) return;

    const handleClickOutside = (e) => {
      if (modalElement && !modalElement.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, modalElement, onClose]);

  // Mark as mounted
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    /**
     * Focus utilities
     */
    focusFirstElement,
    focusLastElement,
    getFocusableElements,

    /**
     * State information
     */
    modalId,
    isTrapped: isOpen && !!modalElement,

    /**
     * Manual control methods
     */
    trapFocus,
    releaseFocusTrap
  };
}

/**
 * Higher-order component for modal focus trapping
 * @param {React.Component} WrappedComponent - Component to wrap
 * @param {Object} options - Focus trap options
 */
export function withModalFocusTrap(WrappedComponent, options = {}) {
  return function ModalFocusTrapWrapper(props) {
    const {
      isOpen,
      onClose,
      modalRef,
      ...restProps
    } = props;

    const focusTrap = useModalFocusTrap({
      isOpen,
      modalElement: modalRef?.current,
      onClose,
      ...options
    });

    return (
      <WrappedComponent
        {...restProps}
        isOpen={isOpen}
        onClose={onClose}
        modalRef={modalRef}
        focusTrap={focusTrap}
      />
    );
  };
}

export default useModalFocusTrap;