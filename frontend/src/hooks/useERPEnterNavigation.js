/**
 * Deterministic Enter Navigation Hook for ERP Data Entry
 * High-speed keyboard navigation for transaction entry workflows
 * 
 * Implements strict sequence: Group → Customer → Vehicle → Item Code → Qty → Rate → 
 * Luggage → Coolie → Paid → Remarks → Add Button → Group (loop)
 * 
 * @param {React.RefObject} containerRef - Container element reference
 * @param {Object} options - Configuration options
 * @returns {Object} Navigation controls and state
 */

import { useEffect, useRef, useCallback } from 'react';

export function useERPEnterNavigation(containerRef, options = {}) {
  const {
    enabled = true,
    validateField = null, // Optional field validation function
    onValidationError = null, // Called when validation fails
    autoFocusFirst = true
  } = options;

  // Store indexed elements
  const indexedElements = useRef(new Map());
  const isDropdownOpen = useRef(false);

  /**
   * Collect and index all elements with data-enter-index attribute
   */
  const collectIndexedElements = useCallback(() => {
    if (!containerRef.current) return;

    const elements = containerRef.current.querySelectorAll('[data-enter-index]');
    const indexMap = new Map();

    elements.forEach(element => {
      const index = parseInt(element.getAttribute('data-enter-index'), 10);
      if (!isNaN(index) && index > 0) {
        indexMap.set(index, element);
      }
    });

    indexedElements.current = indexMap;
    return indexMap;
  }, [containerRef]);

  /**
   * Get sorted elements by index
   */
  const getSortedElements = useCallback(() => {
    const elements = Array.from(indexedElements.current.entries());
    return elements.sort(([a], [b]) => a - b);
  }, []);

  /**
   * Focus element by index
   */
  const focusElementByIndex = useCallback((index) => {
    const element = indexedElements.current.get(index);
    if (element && typeof element.focus === 'function') {
      element.focus();
      return true;
    }
    return false;
  }, []);

  /**
   * Get current element index
   */
  const getCurrentIndex = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement || !containerRef.current?.contains(activeElement)) {
      return null;
    }

    for (const [index, element] of indexedElements.current.entries()) {
      if (element === activeElement) {
        return index;
      }
    }
    return null;
  }, [containerRef]);

  /**
   * Validate current field before navigation
   */
  const validateCurrentField = useCallback(() => {
    if (!validateField) return true;

    const activeElement = document.activeElement;
    if (!activeElement) return true;

    try {
      return validateField(activeElement);
    } catch (error) {
      console.warn('Field validation error:', error);
      return false;
    }
  }, [validateField]);

  /**
   * Handle Enter key navigation
   */
  const handleEnterKey = useCallback((e) => {
    if (!enabled) return;
    
    const currentIndex = getCurrentIndex();
    if (currentIndex === null) return;

    // Prevent default browser behavior
    e.preventDefault();

    // Handle dropdown state
    if (isDropdownOpen.current) {
      // Let dropdown handle Enter for selection
      return;
    }

    // Validate current field
    if (!validateCurrentField()) {
      if (onValidationError) {
        onValidationError(document.activeElement);
      }
      return; // Stay on current field
    }

    const sortedElements = getSortedElements();
    const maxIndex = sortedElements.length > 0 ? sortedElements[sortedElements.length - 1][0] : 0;

    if (currentIndex === maxIndex) {
      // Last element - click Add button and loop to first
      const addButton = indexedElements.current.get(maxIndex);
      if (addButton && typeof addButton.click === 'function') {
        addButton.click();
      }
      // Focus first element (Group)
      setTimeout(() => {
        focusElementByIndex(1);
      }, 50);
    } else {
      // Move to next element
      const nextIndex = currentIndex + 1;
      focusElementByIndex(nextIndex);
    }
  }, [enabled, getCurrentIndex, validateCurrentField, onValidationError, getSortedElements, focusElementByIndex]);

  /**
   * Handle Shift+Enter for backward navigation
   */
  const handleShiftEnterKey = useCallback((e) => {
    if (!enabled) return;
    
    const currentIndex = getCurrentIndex();
    if (currentIndex === null) return;

    e.preventDefault();

    // Handle dropdown state
    if (isDropdownOpen.current) {
      return;
    }

    const sortedElements = getSortedElements();
    const minIndex = sortedElements.length > 0 ? sortedElements[0][0] : 1;

    if (currentIndex === minIndex) {
      // First element - wrap to last
      const lastIndex = sortedElements[sortedElements.length - 1][0];
      focusElementByIndex(lastIndex);
    } else {
      // Move to previous element
      const prevIndex = currentIndex - 1;
      focusElementByIndex(prevIndex);
    }
  }, [enabled, getCurrentIndex, getSortedElements, focusElementByIndex]);

  /**
   * Handle keydown events
   */
  const handleKeyDown = useCallback((e) => {
    // Only handle Enter key events
    if (e.key !== 'Enter') return;

    if (e.shiftKey) {
      handleShiftEnterKey(e);
    } else {
      handleEnterKey(e);
    }
  }, [handleEnterKey, handleShiftEnterKey]);

  /**
   * Set dropdown open state (for SearchableSelect integration)
   */
  const setDropdownOpen = useCallback((isOpen) => {
    isDropdownOpen.current = isOpen;
  }, []);

  /**
   * Initialize navigation
   */
  const initialize = useCallback(() => {
    if (!containerRef.current) return;

    // Collect indexed elements
    collectIndexedElements();

    // Auto-focus first element if requested
    if (autoFocusFirst && indexedElements.current.size > 0) {
      setTimeout(() => {
        focusElementByIndex(1);
      }, 100);
    }
  }, [containerRef, collectIndexedElements, autoFocusFirst, focusElementByIndex]);

  // Setup event listeners
  useEffect(() => {
    if (!containerRef.current || !enabled) return;

    // Initialize elements
    initialize();

    // Add event listener to container
    const container = containerRef.current;
    container.addEventListener('keydown', handleKeyDown, true);

    // Mutation observer for dynamic content
    const observer = new MutationObserver(() => {
      collectIndexedElements();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-enter-index']
    });

    return () => {
      container.removeEventListener('keydown', handleKeyDown, true);
      observer.disconnect();
      indexedElements.current.clear();
    };
  }, [containerRef, enabled, handleKeyDown, collectIndexedElements, initialize]);

  // Expose public API
  return {
    // Methods
    collectIndexedElements,
    focusElementByIndex,
    setDropdownOpen,
    
    // State
    elementCount: indexedElements.current.size,
    isInitialized: indexedElements.current.size > 0,
    
    // Utilities
    getCurrentIndex,
    getSortedElements: () => getSortedElements().map(([index, element]) => ({ index, element }))
  };
}

export default useERPEnterNavigation;