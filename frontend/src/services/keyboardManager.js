/**
 * Global Keyboard Manager Service
 * Centralized keyboard event handling and coordination
 * Manages all keyboard navigation behavior across the application
 */

import { 
  KEYBOARD_CONFIG, 
  NAVIGATION_RULES, 
  BUTTON_CLASSIFICATIONS, 
  KEY_CODES,
  MODAL_SETTINGS,
  ACCESSIBILITY_SETTINGS
} from '../utils/keyboardConfig';

class KeyboardManager {
  constructor() {
    this.isInitialized = false;
    this.activeHandlers = new Set();
    this.modalStack = [];
    this.dropdownStates = new Map();
    this.formScopes = new Map();
    this.globalListeners = [];
  }

  /**
   * Initialize the keyboard manager
   */
  initialize() {
    if (this.isInitialized) return;
    
    this.setupGlobalEventListeners();
    this.isInitialized = true;
    
    console.log('Keyboard Manager initialized');
  }

  /**
   * Setup global keyboard event listeners
   */
  setupGlobalEventListeners() {
    const handleKeyDown = (e) => {
      this.handleGlobalKeyDown(e);
    };

    const handleKeyUp = (e) => {
      this.handleGlobalKeyUp(e);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    
    this.globalListeners.push(
      { event: 'keydown', handler: handleKeyDown },
      { event: 'keyup', handler: handleKeyUp }
    );
  }

  /**
   * Handle global keydown events
   */
  handleGlobalKeyDown(e) {
    const target = e.target;
    
    // Skip if target is content editable or has special handling
    if (this.shouldSkipElement(target)) {
      return;
    }

    // Handle Escape key for modals
    if (e.key === KEY_CODES.ESCAPE) {
      this.handleEscapeKey(e);
      return;
    }

    // Handle Enter key navigation
    if (e.key === KEY_CODES.ENTER) {
      this.handleEnterKey(e);
      return;
    }

    // Handle Tab key for modal trapping
    if (e.key === KEY_CODES.TAB) {
      this.handleTabKey(e);
      return;
    }

    // Handle arrow keys for grid navigation
    if ([KEY_CODES.ARROW_UP, KEY_CODES.ARROW_DOWN, KEY_CODES.ARROW_LEFT, KEY_CODES.ARROW_RIGHT].includes(e.key)) {
      this.handleArrowKeys(e);
      return;
    }
  }

  /**
   * Handle global keyup events
   */
  handleGlobalKeyUp(e) {
    // Handle keyup events if needed
  }

  /**
   * Determine if element should be skipped for keyboard navigation
   */
  shouldSkipElement(element) {
    if (!element) return true;

    // Skip content editable elements
    if (element.contentEditable === 'true') return true;

    // Skip elements in dropdowns when open
    if (this.isElementInOpenDropdown(element)) return true;

    // Skip elements matching excluded selectors
    for (const selector of KEYBOARD_CONFIG.excludedSelectors) {
      if (element.matches && element.matches(selector)) return true;
    }

    return false;
  }

  /**
   * Check if element is inside an open dropdown
   */
  isElementInOpenDropdown(element) {
    let parent = element;
    while (parent) {
      if (this.dropdownStates.get(parent) === true) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  /**
   * Handle Escape key press
   */
  handleEscapeKey(e) {
    // Close topmost modal if exists
    if (this.modalStack.length > 0) {
      const topModal = this.modalStack[this.modalStack.length - 1];
      if (MODAL_SETTINGS.CLOSE_ON_ESCAPE && topModal.onClose) {
        e.preventDefault();
        topModal.onClose();
      }
    }
  }

  /**
   * Handle Enter key press with enterprise navigation rules
   */
  handleEnterKey(e) {
    const target = e.target;
    const tagName = target?.tagName?.toUpperCase();

    // Don't interfere with dropdown selections
    if (this.isElementInOpenDropdown(target)) {
      return;
    }

    // Prevent Enter key from activating navbar elements
    if (this.isNavbarElement(target)) {
      // Allow standard browser behavior for form submissions
      if (NAVIGATION_RULES.ENTER_BEHAVIOR.ALLOW_FORM_SUBMISSION) {
        return;
      }
      e.preventDefault();
      return;
    }

    // Handle modal focus trapping
    if (this.modalStack.length > 0) {
      this.handleModalEnterKey(e, target);
      return;
    }

    // Apply navigation rules
    if (NAVIGATION_RULES.ENTER_BEHAVIOR.HIJACK_ENTER_KEY) {
      e.preventDefault();
      
      // Handle primary action buttons
      if (this.isPrimaryActionButton(target)) {
        target.click();
        return;
      }

      // Skip secondary/danger buttons
      if (this.isSecondaryActionButton(target)) {
        return;
      }

      // Handle form fields
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tagName)) {
        this.moveToNextField(target);
        return;
      }

      // Handle generic buttons
      if (tagName === 'BUTTON') {
        target.click();
        return;
      }
    }
  }

  /**
   * Handle Tab key for modal focus trapping
   */
  handleTabKey(e) {
    if (this.modalStack.length === 0) return;

    const currentModal = this.modalStack[this.modalStack.length - 1];
    if (!currentModal.element) return;

    const focusableElements = this.getFocusableElements(currentModal.element);
    if (focusableElements.length === 0) return;

    const currentIndex = focusableElements.indexOf(document.activeElement);
    let nextIndex;

    if (e.shiftKey) {
      // Shift + Tab - move backward
      nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    } else {
      // Tab - move forward
      nextIndex = (currentIndex + 1) % focusableElements.length;
    }

    e.preventDefault();
    focusableElements[nextIndex]?.focus();
  }

  /**
   * Handle arrow keys for grid/table navigation
   */
  handleArrowKeys(e) {
    // Implementation for grid navigation
    // This would handle navigation within tables/grids
  }

  /**
   * Handle Enter key within modal context
   */
  handleModalEnterKey(e, target) {
    const currentModal = this.modalStack[this.modalStack.length - 1];
    const focusableElements = this.getFocusableElements(currentModal.element);
    
    const currentIndex = focusableElements.indexOf(target);
    if (currentIndex >= 0) {
      const nextIndex = (currentIndex + 1) % focusableElements.length;
      focusableElements[nextIndex]?.focus();
      e.preventDefault();
    }
  }

  /**
   * Move to next logical field in form
   */
  moveToNextField(currentElement) {
    const form = currentElement.closest('form') || currentElement.closest('.form-container');
    if (!form) return;

    const focusableElements = this.getFocusableElements(form);
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
    }
  }

  /**
   * Get all focusable elements within a container
   */
  getFocusableElements(container) {
    if (!container) return [];

    const elements = container.querySelectorAll(KEYBOARD_CONFIG.focusableSelectors.join(', '));
    
    return Array.from(elements).filter(element => 
      this.isValidFocusableElement(element)
    );
  }

  /**
   * Check if element is valid for focus
   */
  isValidFocusableElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    
    // Skip disabled or hidden elements
    if (element.disabled || element.hidden) return false;
    
    // Skip elements with negative tabindex
    const tabIndex = element.getAttribute('tabindex');
    if (tabIndex === '-1') return false;
    
    // Skip elements matching excluded selectors
    for (const selector of KEYBOARD_CONFIG.excludedSelectors) {
      if (element.matches && element.matches(selector)) return false;
    }
    
    return true;
  }

  /**
   * Check if element is navbar element
   */
  isNavbarElement(element) {
    if (!element) return false;
    
    // Check parent chain for nav elements
    let parent = element.parentElement;
    while (parent) {
      if (parent.tagName === 'NAV' || parent.classList.contains('navbar-element')) {
        return true;
      }
      parent = parent.parentElement;
    }
    
    // Check element itself
    return element.classList.contains('navbar-element') || 
           element.hasAttribute('data-navbar-element') ||
           (element.matches && element.matches('nav *'));
  }

  /**
   * Check if element is primary action button
   */
  isPrimaryActionButton(element) {
    if (element.tagName !== 'BUTTON') return false;
    
    const dataAction = element.getAttribute('data-action');
    if (dataAction === BUTTON_CLASSIFICATIONS.PRIMARY) return true;
    
    for (const selector of KEYBOARD_CONFIG.primaryButtonSelectors) {
      if (element.matches && element.matches(selector)) return true;
    }
    
    return false;
  }

  /**
   * Check if element is secondary action button
   */
  isSecondaryActionButton(element) {
    if (element.tagName !== 'BUTTON') return false;
    
    const dataAction = element.getAttribute('data-action');
    if (dataAction === BUTTON_CLASSIFICATIONS.SECONDARY || 
        dataAction === BUTTON_CLASSIFICATIONS.DANGER) return true;
    
    for (const selector of KEYBOARD_CONFIG.ignoredButtonSelectors) {
      if (element.matches && element.matches(selector)) return true;
    }
    
    return false;
  }

  /**
   * Register a modal for focus trapping
   */
  registerModal(modalId, element, onClose) {
    this.modalStack.push({
      id: modalId,
      element,
      onClose,
      previousFocus: document.activeElement
    });

    // Focus first focusable element in modal
    const focusableElements = this.getFocusableElements(element);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  /**
   * Unregister a modal
   */
  unregisterModal(modalId) {
    const modalIndex = this.modalStack.findIndex(modal => modal.id === modalId);
    if (modalIndex === -1) return;

    const modal = this.modalStack[modalIndex];
    
    // Remove from stack
    this.modalStack.splice(modalIndex, 1);

    // Return focus to previous element if it still exists
    if (modal.previousFocus && document.contains(modal.previousFocus)) {
      modal.previousFocus.focus();
    }
  }

  /**
   * Set dropdown state
   */
  setDropdownState(dropdownElement, isOpen) {
    this.dropdownStates.set(dropdownElement, isOpen);
  }

  /**
   * Register form scope
   */
  registerFormScope(formId, element) {
    this.formScopes.set(formId, element);
  }

  /**
   * Unregister form scope
   */
  unregisterFormScope(formId) {
    this.formScopes.delete(formId);
  }

  /**
   * Cleanup and destroy the keyboard manager
   */
  destroy() {
    // Remove global event listeners
    this.globalListeners.forEach(({ event, handler }) => {
      document.removeEventListener(event, handler, true);
    });

    this.globalListeners = [];
    this.activeHandlers.clear();
    this.modalStack = [];
    this.dropdownStates.clear();
    this.formScopes.clear();
    this.isInitialized = false;

    console.log('Keyboard Manager destroyed');
  }

  /**
   * Get current state for debugging
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      modalCount: this.modalStack.length,
      dropdownCount: this.dropdownStates.size,
      formScopeCount: this.formScopes.size,
      activeHandlers: this.activeHandlers.size
    };
  }
}

// Create singleton instance
const keyboardManager = new KeyboardManager();

// Auto-initialize
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      keyboardManager.initialize();
    });
  } else {
    keyboardManager.initialize();
  }
}

export default keyboardManager;