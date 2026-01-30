/**
 * Enterprise Keyboard Navigation Configuration
 * Centralized configuration for keyboard navigation behavior
 */

export const KEYBOARD_CONFIG = {
  // Selectors for elements that should be excluded from Enter navigation
  excludedSelectors: [
    '[data-action="secondary"]',
    '[data-action="danger"]',
    '.exclude-from-enter-nav',
    '[role="menuitem"]',
    '[role="tab"]',
    '.navbar-element',
    '[data-navbar-element]',
    'nav *'
  ],

  // Selectors for primary action buttons (allowed Enter activation)
  primaryButtonSelectors: [
    '[data-action="primary"]',
    '.submit-button',
    '[type="submit"]:not([data-action="secondary"])',
    '.btn-primary',
    '.btn-submit'
  ],

  // Selectors for secondary/danger buttons (never activated by Enter)
  ignoredButtonSelectors: [
    '[data-action="secondary"]',
    '[data-action="danger"]',
    '.btn-secondary',
    '.btn-danger',
    '.btn-cancel',
    '.btn-close',
    '[aria-label="close"]'
  ],

  // Navbar selectors for exclusion
  navbarSelectors: [
    'nav',
    '.navbar',
    '.navbar-element',
    '[data-navbar-element]',
    '.navigation-bar'
  ],

  // Form-related selectors
  formSelectors: [
    'form',
    '.form-container',
    '[role="form"]'
  ],

  // Focusable element selectors
  focusableSelectors: [
    'input:not([disabled]):not([readonly])',
    'select:not([disabled])',
    'textarea:not([disabled]):not([readonly])',
    'button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ],

  // Grid/table navigation selectors
  gridSelectors: [
    '[role="grid"]',
    '[role="row"]',
    '[role="cell"]',
    'table',
    '.data-grid'
  ]
};

// Keyboard navigation behavior constants
export const NAVIGATION_RULES = {
  // Enter key behavior
  ENTER_BEHAVIOR: {
    MOVE_TO_NEXT_FIELD: true,
    ACTIVATE_PRIMARY_BUTTONS: true,
    SKIP_SECONDARY_BUTTONS: true,
    PREVENT_NAVBAR_ACTIVATION: true,
    ALLOW_FORM_SUBMISSION: true
  },

  // Tab key behavior
  TAB_BEHAVIOR: {
    FOLLOW_STANDARD_ORDER: true,
    SHIFT_REVERSE: true,
    TRAP_IN_MODAL: true
  },

  // Focus management
  FOCUS_MANAGEMENT: {
    SKIP_DISABLED_FIELDS: true,
    SKIP_HIDDEN_FIELDS: true,
    SKIP_READONLY_FIELDS: false, // Read-only can receive focus but not navigate
    PRESERVE_ARIA_ROLES: true
  },

  // Data entry mode
  DATA_ENTRY_MODE: {
    HIJACK_ENTER_KEY: true,
    PREVENT_DEFAULT_SUBMIT: true,
    SCOPE_TO_FORM: true
  }
};

// Button classification mapping
export const BUTTON_CLASSIFICATIONS = {
  PRIMARY: 'primary',      // Add, Save, Submit, Update - Enter activates
  SECONDARY: 'secondary',  // Cancel, Close, Print, SMS, Export - Enter ignores
  DANGER: 'danger'         // Delete, Remove - Enter ignores
};

// Key codes for easy reference
export const KEY_CODES = {
  ENTER: 'Enter',
  TAB: 'Tab',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight'
};

// Modal focus trap settings
export const MODAL_SETTINGS = {
  TRAP_FOCUS: true,
  RETURN_FOCUS_ON_CLOSE: true,
  CLOSE_ON_ESCAPE: true,
  CLOSE_ON_OUTSIDE_CLICK: false
};

// Grid navigation settings
export const GRID_SETTINGS = {
  MOVE_HORIZONTALLY_FIRST: true,
  WRAP_TO_NEXT_ROW: true,
  FOCUS_ADD_ROW_BUTTON: true
};

// Accessibility compliance settings
export const ACCESSIBILITY_SETTINGS = {
  PRESERVE_SCREEN_READER_COMPATIBILITY: true,
  MAINTAIN_NATIVE_BEHAVIORS: true,
  RESPECT_USER_PREFERENCES: true
};

export default {
  KEYBOARD_CONFIG,
  NAVIGATION_RULES,
  BUTTON_CLASSIFICATIONS,
  KEY_CODES,
  MODAL_SETTINGS,
  GRID_SETTINGS,
  ACCESSIBILITY_SETTINGS
};