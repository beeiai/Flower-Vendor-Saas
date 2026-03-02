import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Shared keyboard navigation hook for list-based interfaces
 * Implements roving tabindex pattern for consistent keyboard navigation
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.itemCount - Total number of items in the list
 * @param {Function} options.onEnter - Callback when Enter is pressed on an item
 * @param {Function} options.onArrowUp - Callback when ArrowUp is pressed
 * @param {Function} options.onArrowDown - Callback when ArrowDown is pressed
 * @param {React.RefObject} options.listRef - Reference to the list container
 * @param {boolean} options.enableRovingTabindex - Whether to use roving tabindex pattern
 * @returns {Object} Navigation utilities
 */
export function useKeyboardListNavigation({
  itemCount,
  onEnter,
  onArrowUp,
  onArrowDown,
  listRef,
  enableRovingTabindex = true
}) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const focusedIndexRef = useRef(0);

  // Update ref when state changes
  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

  /**
   * Move focus to a specific index
   * @param {number} newIndex - Target index to focus
   * @returns {boolean} Whether the move was successful
   */
  const moveFocus = useCallback((newIndex) => {
    if (newIndex < 0 || newIndex >= itemCount) return false;
    
    setFocusedIndex(newIndex);
    
    // Scroll into view if listRef provided
    if (listRef?.current) {
      const item = listRef.current.children[newIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
    
    return true;
  }, [itemCount, listRef]);

  /**
   * Handle keyboard events for navigation
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (onArrowDown) {
          onArrowDown(focusedIndexRef.current);
        } else {
          moveFocus(focusedIndexRef.current + 1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (onArrowUp) {
          onArrowUp(focusedIndexRef.current);
        } else {
          moveFocus(focusedIndexRef.current - 1);
        }
        break;
      case 'Enter':
        e.preventDefault();
        onEnter?.(focusedIndexRef.current);
        break;
      case 'Home':
        e.preventDefault();
        moveFocus(0);
        break;
      case 'End':
        e.preventDefault();
        moveFocus(itemCount - 1);
        break;
    }
  }, [moveFocus, onEnter, onArrowUp, onArrowDown, itemCount]);

  /**
   * Reset focus to first item
   */
  const resetFocus = useCallback(() => {
    setFocusedIndex(0);
  }, []);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    resetFocus,
    moveFocus
  };
}