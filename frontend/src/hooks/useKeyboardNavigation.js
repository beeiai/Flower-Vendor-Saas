import { useEffect, useRef } from 'react';

/**
 * Comprehensive keyboard navigation hook for Enter-key based form navigation
 * Supports dropdown selection, field traversal, and button activation
 * Navigation follows left-to-right, top-to-bottom order
 */
export function useKeyboardNavigation() {
  const navigationRefs = useRef(new Map());
  const currentFocusIndex = useRef(0);
  const isDropdownOpen = useRef(false);

  // Register a focusable element
  const registerElement = (key, element, options = {}) => {
    if (element) {
      navigationRefs.current.set(key, { element, ...options });
    }
  };

  // Unregister an element
  const unregisterElement = (key) => {
    navigationRefs.current.delete(key);
  };

  // Get sorted navigation order (left-to-right, top-to-bottom)
  const getNavigationOrder = () => {
    return Array.from(navigationRefs.current.entries())
      .sort(([, a], [, b]) => {
        // Sort by row first (top-to-bottom), then by column (left-to-right)
        if (a.row !== b.row) {
          return (a.row || 0) - (b.row || 0);
        }
        return (a.col || 0) - (b.col || 0);
      })
      .map(([key, item]) => ({ key, ...item }));
  };

  // Move to next focusable element
  const moveToNext = (currentIndex = currentFocusIndex.current) => {
    const order = getNavigationOrder();
    if (order.length === 0) return;

    const nextIndex = (currentIndex + 1) % order.length;
    const nextElement = order[nextIndex].element;
    
    if (nextElement) {
      nextElement.focus();
      currentFocusIndex.current = nextIndex;
    }
  };

  // Move to previous focusable element
  const moveToPrevious = (currentIndex = currentFocusIndex.current) => {
    const order = getNavigationOrder();
    if (order.length === 0) return;

    const prevIndex = (currentIndex - 1 + order.length) % order.length;
    const prevElement = order[prevIndex].element;
    
    if (prevElement) {
      prevElement.focus();
      currentFocusIndex.current = prevIndex;
    }
  };

  // Handle global Enter key navigation
  const handleGlobalEnter = (e) => {
    const target = e.target;
    const tagName = target?.tagName?.toUpperCase();
    const type = target?.type?.toLowerCase();
    
    // Don't interfere with dropdown selections or text editing
    if (isDropdownOpen.current) {
      return; // Let dropdown handle Enter for selection
    }

    // Handle Enter key for form navigation
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If focused on a button, click it (except excluded buttons)
      if (tagName === 'BUTTON' && !target.classList.contains('exclude-from-enter-nav')) {
        target.click();
        return;
      }

      // If focused on a submit button, click it
      if (target.classList.contains('submit-button') || 
          (tagName === 'BUTTON' && target.type === 'submit')) {
        target.click();
        return;
      }

      // For input fields, move to next field
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tagName)) {
        moveToNext();
      }
    }
  };

  // Handle dropdown state tracking
  const setDropdownState = (isOpen) => {
    isDropdownOpen.current = isOpen;
  };

  // Initialize global event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleGlobalEnter);
    return () => {
      document.removeEventListener('keydown', handleGlobalEnter);
    };
  }, []);

  return {
    registerElement,
    unregisterElement,
    moveToNext,
    moveToPrevious,
    setDropdownState,
    navigationRefs: navigationRefs.current
  };
}