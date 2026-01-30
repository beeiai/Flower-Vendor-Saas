import { useEffect, useRef, useCallback } from 'react';
import { 
  KEYBOARD_CONFIG, 
  NAVIGATION_RULES, 
  BUTTON_CLASSIFICATIONS, 
  KEY_CODES 
} from '../utils/keyboardConfig';

/**
 * Enterprise-grade keyboard navigation hook
 * Provides comprehensive Enter-key based form navigation with semantic button classification
 * Supports dropdown selection, field traversal, modal focus trapping, and grid navigation
 * Navigation follows left-to-right, top-to-bottom order with configurable exclusions
 */
export function useKeyboardNavigation(options = {}) {
  const navigationRefs = useRef(new Map());
  const currentFocusIndex = useRef(0);
  const isDropdownOpen = useRef(false);
  const isModalOpen = useRef(false);
  const modalFocusableElements = useRef([]);
  const lastFocusedElement = useRef(null);
  
  // Merge with default options
  const config = {
    enableEnterNavigation: true,
    enableModalTrap: true,
    enableGridNavigation: true,
    ...options
  };

  // Enhanced element registration with semantic metadata
  const registerElement = useCallback((key, element, options = {}) => {
    if (element && isValidFocusableElement(element)) {
      navigationRefs.current.set(key, { 
        element, 
        row: options.row || 0,
        col: options.col || 0,
        order: options.order || 0,
        formScope: options.formScope || null,
        isPrimaryButton: isPrimaryActionButton(element),
        isSecondaryButton: isSecondaryActionButton(element),
        ...options 
      });
    }
  }, []);

  // Enhanced unregistration
  const unregisterElement = useCallback((key) => {
    navigationRefs.current.delete(key);
  }, []);

  // Check if element is valid for keyboard navigation
  const isValidFocusableElement = (element) => {
    if (!element || !element.nodeType === Node.ELEMENT_NODE) return false;
    
    // Skip disabled or hidden elements
    if (element.disabled || element.hidden) return false;
    
    // Skip elements with negative tabindex (explicitly non-focusable)
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex === '-1') return false;
    
    // Skip elements matching excluded selectors
    for (const selector of KEYBOARD_CONFIG.excludedSelectors) {
      if (element.matches(selector)) return false;
    }
    
    return true;
  };

  // Enhanced navbar detection
  const isNavbarElement = useCallback((element) => {
    if (!element) return false;
    
    // Check if element has a parent with nav class or role
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName === 'NAV' || parent.classList.contains('navbar-element')) {
        return true;
      }
      parent = parent.parentElement;
    }
    
    // Check if element itself is marked as navbar
    return element.classList.contains('navbar-element') || 
           element.hasAttribute('data-navbar-element') ||
           element.closest('nav') !== null;
  }, []);

  // Button classification helpers
  const isPrimaryActionButton = (element) => {
    if (element.tagName !== 'BUTTON') return false;
    
    // Check explicit data-action attribute
    const dataAction = element.getAttribute('data-action');
    if (dataAction === BUTTON_CLASSIFICATIONS.PRIMARY) return true;
    
    // Check implicit selectors
    for (const selector of KEYBOARD_CONFIG.primaryButtonSelectors) {
      if (element.matches(selector)) return true;
    }
    
    return false;
  };

  const isSecondaryActionButton = (element) => {
    if (element.tagName !== 'BUTTON') return false;
    
    // Check explicit data-action attribute
    const dataAction = element.getAttribute('data-action');
    if (dataAction === BUTTON_CLASSIFICATIONS.SECONDARY || 
        dataAction === BUTTON_CLASSIFICATIONS.DANGER) return true;
    
    // Check implicit selectors
    for (const selector of KEYBOARD_CONFIG.ignoredButtonSelectors) {
      if (element.matches(selector)) return true;
    }
    
    return false;
  };

  // Enhanced navigation order sorting
  const getNavigationOrder = useCallback((formScope = null) => {
    const entries = Array.from(navigationRefs.current.entries());
    
    // Filter by form scope if specified
    let filteredEntries = entries;
    if (formScope) {
      filteredEntries = entries.filter(([, item]) => 
        item.formScope === formScope || item.formScope === null
      );
    }
    
    return filteredEntries
      .sort(([, a], [, b]) => {
        // Sort by row first (top-to-bottom), then by column (left-to-right)
        if (a.row !== b.row) {
          return (a.row || 0) - (b.row || 0);
        }
        if (a.col !== b.col) {
          return (a.col || 0) - (b.col || 0);
        }
        // Finally sort by explicit order
        return (a.order || 0) - (b.order || 0);
      })
      .map(([key, item]) => ({ key, ...item }));
  }, []);

  // Enhanced movement functions
  const moveToNext = useCallback((currentIndex = currentFocusIndex.current, formScope = null) => {
    const order = getNavigationOrder(formScope);
    if (order.length === 0) return;

    const nextIndex = (currentIndex + 1) % order.length;
    const nextElement = order[nextIndex].element;
    
    if (nextElement && isValidFocusableElement(nextElement)) {
      nextElement.focus();
      currentFocusIndex.current = nextIndex;
      return true;
    }
    return false;
  }, [getNavigationOrder]);

  const moveToPrevious = useCallback((currentIndex = currentFocusIndex.current, formScope = null) => {
    const order = getNavigationOrder(formScope);
    if (order.length === 0) return;

    const prevIndex = (currentIndex - 1 + order.length) % order.length;
    const prevElement = order[prevIndex].element;
    
    if (prevElement && isValidFocusableElement(prevElement)) {
      prevElement.focus();
      currentFocusIndex.current = prevIndex;
      return true;
    }
    return false;
  }, [getNavigationOrder]);

  // Grid navigation support
  const moveInGrid = useCallback((direction, currentElement) => {
    if (!config.enableGridNavigation) return false;
    
    // Implementation for grid/table navigation
    // This would handle horizontal movement across table cells
    // and vertical movement between rows
    return false; // Placeholder for grid implementation
  }, [config.enableGridNavigation]);

  // Modal focus trap
  const trapFocusInModal = useCallback((modalElement) => {
    if (!config.enableModalTrap || !modalElement) return;
    
    isModalOpen.current = true;
    lastFocusedElement.current = document.activeElement;
    
    // Get all focusable elements within modal
    const focusableElements = modalElement.querySelectorAll(
      KEYBOARD_CONFIG.focusableSelectors.join(', ')
    );
    
    modalFocusableElements.current = Array.from(focusableElements)
      .filter(isValidFocusableElement);
    
    // Focus first element
    if (modalFocusableElements.current.length > 0) {
      modalFocusableElements.current[0].focus();
    }
  }, [config.enableModalTrap]);

  const releaseModalFocusTrap = useCallback(() => {
    isModalOpen.current = false;
    modalFocusableElements.current = [];
    
    // Return focus to previously focused element
    if (lastFocusedElement.current && document.contains(lastFocusedElement.current)) {
      lastFocusedElement.current.focus();
    }
  }, []);

  // Enhanced global Enter key handler
  const handleGlobalEnter = useCallback((e) => {
    if (!config.enableEnterNavigation) return;
    
    const target = e.target;
    const tagName = target?.tagName?.toUpperCase();
    
    // Don't interfere with dropdown selections
    if (isDropdownOpen.current) {
      return;
    }

    // Handle Enter key
    if (e.key === KEY_CODES.ENTER) {
      // Prevent Enter key from activating navigation bar elements
      if (isNavbarElement(target)) {
        return; // Allow standard browser behavior
      }
      
      e.preventDefault();
      
      // Handle modal focus trapping
      if (isModalOpen.current) {
        // Stay within modal boundaries
        const currentIndex = modalFocusableElements.current.indexOf(target);
        if (currentIndex >= 0) {
          const nextIndex = (currentIndex + 1) % modalFocusableElements.current.length;
          modalFocusableElements.current[nextIndex]?.focus();
          return;
        }
      }

      // Handle primary action buttons
      if (isPrimaryActionButton(target)) {
        target.click();
        return;
      }

      // Skip secondary/danger buttons
      if (isSecondaryActionButton(target)) {
        return;
      }

      // Handle form fields
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tagName)) {
        // Determine form scope
        const form = target.closest('form') || target.closest('.form-container');
        const formScope = form ? form.id || form.className : null;
        moveToNext(currentFocusIndex.current, formScope);
        return;
      }

      // Handle generic buttons
      if (tagName === 'BUTTON') {
        target.click();
        return;
      }
    }
  }, [config.enableEnterNavigation, isNavbarElement, moveToNext]);

  // Tab key handler for consistency
  const handleTabKey = useCallback((e) => {
    if (!config.enableModalTrap || !isModalOpen.current) return;
    
    const focusable = modalFocusableElements.current;
    if (focusable.length === 0) return;
    
    const currentIndex = focusable.indexOf(document.activeElement);
    let nextIndex;
    
    if (e.shiftKey) {
      // Shift + Tab - move backward
      nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
    } else {
      // Tab - move forward
      nextIndex = (currentIndex + 1) % focusable.length;
    }
    
    e.preventDefault();
    focusable[nextIndex]?.focus();
  }, [config.enableModalTrap]);

  // Dropdown state management
  const setDropdownState = useCallback((isOpen) => {
    isDropdownOpen.current = isOpen;
  }, []);

  // Modal state management
  const setModalState = useCallback((isOpen, modalElement = null) => {
    if (isOpen) {
      trapFocusInModal(modalElement);
    } else {
      releaseModalFocusTrap();
    }
  }, [trapFocusInModal, releaseModalFocusTrap]);

  // Initialize global event listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === KEY_CODES.ENTER) {
        handleGlobalEnter(e);
      } else if (e.key === KEY_CODES.TAB) {
        handleTabKey(e);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleGlobalEnter, handleTabKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      navigationRefs.current.clear();
    };
  }, []);

  return {
    // Registration methods
    registerElement,
    unregisterElement,
    
    // Navigation methods
    moveToNext,
    moveToPrevious,
    moveInGrid,
    
    // State management
    setDropdownState,
    setModalState,
    
    // Modal helpers
    trapFocusInModal,
    releaseModalFocusTrap,
    
    // Utilities
    isNavbarElement,
    isPrimaryActionButton,
    isSecondaryActionButton,
    isValidFocusableElement,
    
    // State accessors
    navigationRefs: navigationRefs.current,
    isModalOpen: isModalOpen.current,
    isDropdownOpen: isDropdownOpen.current
  };
}