/**
 * Single Enter Navigation Controller
 * Hard-block first approach - eliminates all Enter handling except this controller
 */

import { useEffect, useCallback } from 'react';

export function useEnterController(containerRef) {
  // Remove global blocker and attach container-specific listener
  useEffect(() => {
    if (!containerRef.current) return;

    // First, remove any existing global blockers
    const removeGlobalBlocker = () => {
      const existingBlockers = window._enterBlockers || [];
      existingBlockers.forEach(removeListener => {
        removeListener();
      });
      window._enterBlockers = [];
    };

    // Remove global blocker
    removeGlobalBlocker();

    // Attach container-specific Enter controller
    const handleContainerEnter = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        console.log("Enter captured by controller");
        
        const activeElement = document.activeElement;
        
        // Only handle if active element is within our container
        if (containerRef.current.contains(activeElement)) {
          handleNavigation(activeElement);
        }
      }
    };

    const handleNavigation = (currentElement) => {
      const currentEnter = currentElement.getAttribute('data-enter');
      const type = currentElement.dataset.enterType;
      
      // Handle submit buttons
      if (type === "submit") {
        currentElement.click();
        setTimeout(() => {
          const firstElement = containerRef.current.querySelector('[data-enter="1"]');
          if (firstElement) {
            firstElement.focus();
          }
        }, 50);
        return;
      }
      
      // Handle dropdowns
      if (type === "dropdown") {
        const isOpen = currentElement.dataset.open === "true";
        
        if (!isOpen) {
          // Open dropdown using controlled state
          openDropdownControlled(currentElement);
          return;
        } else {
          // Dropdown is already open, let component handle selection
          // Component will call focusNext after selection
          return;
        }
      }
      
      // Handle regular inputs
      if (type === "input") {
        focusNext(currentElement);
        return;
      }
      
      // Fallback for elements without type
      if (currentEnter) {
        focusNext(currentElement);
      }
    };
    
    const openDropdownControlled = (element) => {
      // Find the corresponding state setter by looking at the parent container
      const container = element.closest('[data-searchable-select]');
      if (!container) return;
      
      // Simulate Enter key press to open dropdown through component's own handler
      const enterEvent = new KeyboardEvent("keydown", { 
        key: "Enter", 
        bubbles: true 
      });
      element.dispatchEvent(enterEvent);
      
      // Focus the input element
      setTimeout(() => {
        element.focus();
      }, 0);
    };
    
    const focusNext = (currentElement) => {
      const currentEnter = currentElement.getAttribute('data-enter');
      if (!currentEnter) return;
      
      const currentNum = parseInt(currentEnter);
      const nextNum = currentNum + 1;
      
      // Find next element by data-enter attribute
      const nextElement = containerRef.current.querySelector(`[data-enter="${nextNum}"]`);
      
      if (nextElement) {
        nextElement.focus();
        // PHASE 5: Auto open next dropdown
        if (nextElement.dataset.enterType === "dropdown") {
          setTimeout(() => {
            const openEvent = new KeyboardEvent("keydown", { 
              key: "Enter", 
              bubbles: true 
            });
            nextElement.dispatchEvent(openEvent);
          }, 50);
        }
      } else {
        // Loop back to first element
        const firstElement = containerRef.current.querySelector('[data-enter="1"]');
        if (firstElement) {
          firstElement.focus();
        }
      }
    };

    // Attach listener to container in capture phase
    containerRef.current.addEventListener('keydown', handleContainerEnter, true);
    
    // Store cleanup function
    const cleanup = () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('keydown', handleContainerEnter, true);
      }
    };

    // Store for potential cleanup
    if (!window._enterBlockers) window._enterBlockers = [];
    window._enterBlockers.push(cleanup);

    return cleanup;
  }, [containerRef]);

  // Return nothing - this is a side-effect hook
  return {};
}