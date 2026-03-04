import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Enhanced searchable dropdown component with proper keyboard navigation
 * Implements industry-standard behavior with full dataset caching and client-side filtering
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Label for the dropdown
 * @param {Array} props.options - Array of options to display
 * @param {string} props.value - Current selected value
 * @param {Function} props.onChange - Callback when selection changes
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Whether dropdown is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onSelectionComplete - Callback after selection is complete
 * @param {boolean} props.error - Whether to show error state
 * @returns {JSX.Element} Dropdown component
 */
export function EnhancedSearchableSelect({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder, 
  disabled, 
  className = "", 
  onSelectionComplete,
  error,
  showAllOnEnter = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState(value || "");
  const [isEditing, setIsEditing] = useState(false);
  const [forceShowAll, setForceShowAll] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Show all options when forceShowAll is true (triggered by Enter key)
  // Otherwise filter based on search term
  const filteredOptions = useMemo(() => {
    if (forceShowAll || !searchTerm) return options || [];
    const lower = String(searchTerm).toLowerCase();
    return (options || []).filter(option =>
      String(option).toLowerCase().includes(lower)
    );
  }, [options, searchTerm, forceShowAll]);

  // Sync value to search term when not editing
  useEffect(() => {
    if (!isEditing) {
      setSearchTerm(String(value || ""));
    }
  }, [value, isEditing]);

  // Handle dropdown positioning
  const updatePosition = useCallback(() => {
    if (inputRef.current && dropdownRef.current) {
      const inputRect = inputRef.current.getBoundingClientRect();
      dropdownRef.current.style.top = `${inputRect.bottom + window.scrollY}px`;
      dropdownRef.current.style.left = `${inputRect.left + window.scrollX}px`;
      dropdownRef.current.style.width = `${inputRect.width}px`;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightIndex(0);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Handle option selection
   * @param {string} option - Selected option
   */
  const handleSelect = useCallback((option) => {
    const stringOpt = String(option);
    setSearchTerm(stringOpt);
    onChange(stringOpt);
    setIsOpen(false);
    setHighlightIndex(0);
    setTimeout(() => {
      onSelectionComplete?.();
    }, 0);
  }, [onChange, onSelectionComplete]);

  /**
   * Handle keyboard events in the dropdown
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleKeyDown = useCallback((e) => {
    if (isOpen) {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (filteredOptions[highlightIndex]) {
            handleSelect(filteredOptions[highlightIndex]);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setForceShowAll(false);
          setHighlightIndex(0);
          break;
        default:
          setForceShowAll(false);
          return; // Let other keys go to input for typing
      }
    } else {
      // Dropdown is closed
      if (e.key === 'Enter') {
        e.preventDefault();
        // Always open dropdown and show all options when Enter is pressed
        setIsOpen(true);
        setForceShowAll(true);
        setHighlightIndex(0);
      } else if (!["Tab", "Escape", "ArrowLeft", "ArrowRight", "Shift", "Control", "Alt", "Meta"].includes(e.key)) {
        // Any printable key opens dropdown
        setIsOpen(true);
        setForceShowAll(false);
        setHighlightIndex(0);
      }
    }
  }, [isOpen, filteredOptions, highlightIndex, handleSelect, value, onSelectionComplete]);

  return (
    <div 
      className={`flex flex-col gap-0 w-full relative ${className}`} 
      ref={containerRef}
      data-searchable-select
    >
      {label && (
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 ml-0.5 whitespace-nowrap">
          {String(label)}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full bg-white border ${
            error ? 'border-red-400 ring-2 ring-red-50' : 'border-slate-300'
          } rounded-sm px-3 py-2 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all`}
          style={{ height: '36px' }}
          value={searchTerm}
          onFocus={() => {
            setIsEditing(true);
            setIsOpen(true);
            setHighlightIndex(0);
          }}
          onBlur={() => {
            setIsEditing(false);
            setTimeout(() => {
              if (!document.activeElement?.closest('[data-searchable-select]')) {
                setIsOpen(false);
              }
            }, 150);
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setHighlightIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-700 hover:text-slate-900 transition-colors"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          aria-label="Toggle dropdown"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {isOpen && !disabled && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white border border-slate-300 shadow-lg z-[10000] max-h-80 overflow-y-auto rounded-sm"
        >
          {filteredOptions.length > 0
            ? filteredOptions.map((option, idx) => (
              <button
                key={idx}
                type="button"
                className={`w-full text-left px-3 py-2.5 text-sm font-medium border-b border-slate-100 last:border-0 transition-colors ${
                  highlightIndex === idx ? 'bg-primary-600 text-white' : 'hover:bg-slate-50 text-slate-700'
                }`}
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  handleSelect(option); 
                }}
                aria-selected={highlightIndex === idx}
              >
                {String(option)}
              </button>
            ))
            : <div className="px-3 py-3 text-sm text-slate-400 italic bg-slate-50">No matches found</div>
          }
        </div>,
        document.body
      )}
    </div>
  );
}

export default EnhancedSearchableSelect;