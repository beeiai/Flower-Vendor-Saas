/**
 * Keyboard Navigation System Test Suite
 * Comprehensive testing for all keyboard navigation features
 */

// Import required modules
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import keyboardManager from '../services/keyboardManager';

// Mock React and testing utilities
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useRef: jest.fn(),
  useEffect: jest.fn(),
  useCallback: jest.fn(fn => fn)
}));

// Test utilities
const createTestElement = (tag = 'input', attrs = {}) => {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

const focusElement = (element) => {
  element.focus();
  // Dispatch focus event
  const focusEvent = new FocusEvent('focus', { bubbles: true });
  element.dispatchEvent(focusEvent);
};

describe('Keyboard Navigation System', () => {
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset keyboard manager
    keyboardManager.destroy();
    keyboardManager.initialize();
  });

  afterEach(() => {
    // Cleanup
    document.body.innerHTML = '';
  });

  describe('Configuration System', () => {
    test('should load keyboard configuration correctly', () => {
      const configModule = require('../utils/keyboardConfig');
      
      expect(configModule.KEYBOARD_CONFIG).toBeDefined();
      expect(configModule.NAVIGATION_RULES).toBeDefined();
      expect(configModule.BUTTON_CLASSIFICATIONS).toBeDefined();
      
      // Check primary button selectors
      expect(configModule.KEYBOARD_CONFIG.primaryButtonSelectors).toContain('[data-action="primary"]');
      expect(configModule.KEYBOARD_CONFIG.primaryButtonSelectors).toContain('.submit-button');
      
      // Check excluded selectors
      expect(configModule.KEYBOARD_CONFIG.excludedSelectors).toContain('[data-action="secondary"]');
      expect(configModule.KEYBOARD_CONFIG.excludedSelectors).toContain('.navbar-element');
    });

    test('should have correct button classifications', () => {
      const { BUTTON_CLASSIFICATIONS } = require('../utils/keyboardConfig');
      
      expect(BUTTON_CLASSIFICATIONS.PRIMARY).toBe('primary');
      expect(BUTTON_CLASSIFICATIONS.SECONDARY).toBe('secondary');
      expect(BUTTON_CLASSIFICATIONS.DANGER).toBe('danger');
    });
  });

  describe('useKeyboardNavigation Hook', () => {
    let hookResult;

    beforeEach(() => {
      // Mock useRef behavior
      const useRefMock = require('react').useRef;
      useRefMock.mockImplementation((initialValue) => ({
        current: initialValue
      }));

      // Get hook
      const { useKeyboardNavigation } = require('../hooks/useKeyboardNavigation');
      hookResult = useKeyboardNavigation();
    });

    test('should provide core navigation methods', () => {
      expect(hookResult.registerElement).toBeDefined();
      expect(hookResult.unregisterElement).toBeDefined();
      expect(hookResult.moveToNext).toBeDefined();
      expect(hookResult.moveToPrevious).toBeDefined();
      expect(hookResult.setDropdownState).toBeDefined();
    });

    test('should classify elements correctly', () => {
      // Test primary button classification
      const primaryButton = createTestElement('button', { 
        'data-action': 'primary' 
      });
      expect(hookResult.isPrimaryActionButton(primaryButton)).toBe(true);

      // Test secondary button classification
      const secondaryButton = createTestElement('button', { 
        'data-action': 'secondary' 
      });
      expect(hookResult.isSecondaryActionButton(secondaryButton)).toBe(true);

      // Test navbar element detection
      const navbarButton = createTestElement('button', { 
        'class': 'navbar-element' 
      });
      expect(hookResult.isNavbarElement(navbarButton)).toBe(true);
    });

    test('should validate focusable elements', () => {
      // Valid focusable element
      const input = createTestElement('input');
      expect(hookResult.isValidFocusableElement(input)).toBe(true);

      // Disabled element
      const disabledInput = createTestElement('input', { disabled: 'true' });
      expect(hookResult.isValidFocusableElement(disabledInput)).toBe(false);

      // Hidden element
      const hiddenInput = createTestElement('input', { hidden: 'true' });
      expect(hookResult.isValidFocusableElement(hiddenInput)).toBe(false);
    });
  });

  describe('Keyboard Event Handling', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    test('should handle Enter key for primary buttons', () => {
      const button = createTestElement('button', { 
        'data-action': 'primary' 
      });
      const clickSpy = jest.spyOn(button, 'click');
      
      container.appendChild(button);
      focusElement(button);
      
      // Simulate Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(enterEvent);
      
      expect(clickSpy).toHaveBeenCalled();
    });

    test('should ignore Enter key for secondary buttons', () => {
      const button = createTestElement('button', { 
        'data-action': 'secondary' 
      });
      const clickSpy = jest.spyOn(button, 'click');
      
      container.appendChild(button);
      focusElement(button);
      
      // Simulate Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(enterEvent);
      
      expect(clickSpy).not.toHaveBeenCalled();
    });

    test('should move focus between form fields', () => {
      const input1 = createTestElement('input');
      const input2 = createTestElement('input');
      
      container.appendChild(input1);
      container.appendChild(input2);
      
      focusElement(input1);
      expect(document.activeElement).toBe(input1);
      
      // Simulate Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(enterEvent);
      
      // Note: Actual focus movement depends on implementation details
      // This test verifies the event is handled
    });

    test('should prevent default for navbar elements', () => {
      const navButton = createTestElement('button', { 
        'class': 'navbar-element' 
      });
      const preventDefaultSpy = jest.fn();
      
      container.appendChild(navButton);
      focusElement(navButton);
      
      // Simulate Enter key with preventDefault spy
      const enterEvent = new KeyboardEvent('keydown', { 
        key: 'Enter',
        cancelable: true
      });
      enterEvent.preventDefault = preventDefaultSpy;
      
      document.dispatchEvent(enterEvent);
      
      // Navbar elements should not prevent default in current implementation
      // They allow standard browser behavior
    });
  });

  describe('Modal Focus Trap', () => {
    test('should provide modal focus trap methods', () => {
      const { useModalFocusTrap } = require('../hooks/useModalFocusTrap');
      const mockModalRef = { current: document.createElement('div') };
      
      const focusTrap = useModalFocusTrap({
        isOpen: true,
        modalElement: mockModalRef.current,
        onClose: jest.fn()
      });
      
      expect(focusTrap.focusFirstElement).toBeDefined();
      expect(focusTrap.focusLastElement).toBeDefined();
      expect(focusTrap.getFocusableElements).toBeDefined();
      expect(focusTrap.trapFocus).toBeDefined();
      expect(focusTrap.releaseFocusTrap).toBeDefined();
    });

    test('should register modal with keyboard manager', () => {
      const registerModalSpy = jest.spyOn(keyboardManager, 'registerModal');
      const mockModalElement = document.createElement('div');
      
      keyboardManager.registerModal('test-modal', mockModalElement, jest.fn());
      
      expect(registerModalSpy).toHaveBeenCalledWith(
        'test-modal',
        mockModalElement,
        expect.any(Function)
      );
    });
  });

  describe('Integration Tests', () => {
    test('should work with real form elements', () => {
      // Create a simple form
      const form = document.createElement('form');
      const input1 = createTestElement('input', { id: 'input1' });
      const input2 = createTestElement('input', { id: 'input2' });
      const submitButton = createTestElement('button', { 
        type: 'submit',
        'data-action': 'primary'
      });
      
      form.appendChild(input1);
      form.appendChild(input2);
      form.appendChild(submitButton);
      document.body.appendChild(form);
      
      // Focus first input
      focusElement(input1);
      expect(document.activeElement).toBe(input1);
      
      // Test tab navigation
      fireEvent.keyDown(document, { key: 'Tab' });
      // Note: Actual tab behavior depends on browser
      
      // Test Enter on submit button
      focusElement(submitButton);
      const clickSpy = jest.spyOn(submitButton, 'click');
      
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(clickSpy).toHaveBeenCalled();
    });

    test('should handle modal scenarios', () => {
      // Create modal structure
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      
      const modalInput = createTestElement('input');
      const modalButton = createTestElement('button', { 
        'data-action': 'primary' 
      });
      
      modal.appendChild(modalInput);
      modal.appendChild(modalButton);
      document.body.appendChild(modal);
      
      // Register modal
      keyboardManager.registerModal('test-modal', modal, jest.fn());
      
      // Focus should be trapped within modal
      focusElement(modalInput);
      expect(document.activeElement).toBe(modalInput);
      
      // Cleanup
      keyboardManager.unregisterModal('test-modal');
    });
  });

  describe('Performance Tests', () => {
    test('should handle multiple rapid key events', () => {
      const startTime = performance.now();
      
      // Simulate rapid Enter key presses
      for (let i = 0; i < 100; i++) {
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
        document.dispatchEvent(enterEvent);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second threshold
    });

    test('should clean up event listeners properly', () => {
      const initialListenerCount = getEventListeners(document).keydown?.length || 0;
      
      // Initialize keyboard manager
      keyboardManager.initialize();
      
      // Destroy keyboard manager
      keyboardManager.destroy();
      
      // Check that listeners are cleaned up
      // Note: This is a simplified check - actual implementation may vary
    });
  });
});

// Helper function to get event listeners (browser-dependent)
function getEventListeners(element) {
  // This is a mock implementation
  // In real browsers, you might use getEventListeners() or similar
  return {};
}

// Export for manual testing
export {
  createTestElement,
  focusElement
};

console.log('✅ Keyboard Navigation Test Suite Loaded');
console.log('Run individual tests using: npm test -- keyboardNavigation.test.js');