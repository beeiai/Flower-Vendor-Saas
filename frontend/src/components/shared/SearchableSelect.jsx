// SearchableSelect component
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export function SearchableSelect({ label, options, value, onChange, placeholder, disabled, className = "", style = {}, inputRef, onSelectionComplete, error, isOpen: externalIsOpen, onMenuOpen, onMenuClose, selectRef }) {
	const [internalOpen, setInternalOpen] = useState(false);
	const [highlight, setHighlight] = useState(0);
	const open = externalIsOpen !== undefined ? externalIsOpen : internalOpen;
	const setOpen = externalIsOpen !== undefined ? (newState) => {
		if (newState && onMenuOpen) onMenuOpen();
		if (!newState && onMenuClose) onMenuClose();
	} : setInternalOpen;
	
	const [searchTerm, setSearchTerm] = useState(value || "");
	const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
	const containerRef = useRef(null);
	const inputWrapperRef = useRef(null);
	const inputRefInternal = useRef(null);
	const internalSelectRef = useRef(null);
	const actualInputRef = inputRef || inputRefInternal;
	const actualSelectRef = selectRef || internalSelectRef;
	
	// Dropdown state management

	useEffect(() => {
		// Only update searchTerm from value prop if the value is different from current searchTerm
		// This prevents overriding user input with the same value
		const stringValue = String(value || "");
		if (searchTerm !== stringValue) {
			setSearchTerm(stringValue);
		}
	}, [value]);

	const updateCoords = () => {
		if (inputWrapperRef.current) {
			const rect = inputWrapperRef.current.getBoundingClientRect();
			setCoords({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
		}
	};

	useEffect(() => {
		if (open) {
			updateCoords();
			window.addEventListener('scroll', updateCoords, true);
			window.addEventListener('resize', updateCoords);
		}
		return () => {
			window.removeEventListener('scroll', updateCoords, true);
			window.removeEventListener('resize', updateCoords);
		};
	}, [open]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (containerRef.current && !containerRef.current.contains(event.target)) {
				setOpen(false);
				setHighlight(0);
			}
		};
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Dropdown state management

	// Close dropdown when window loses focus
	useEffect(() => {
		const handleWindowBlur = () => {
			setOpen(false);
			setHighlight(0);
		};
		window.addEventListener('blur', handleWindowBlur);
		return () => window.removeEventListener('blur', handleWindowBlur);
	}, []);

	const filteredOptions = useMemo(() => {
		// Filter options based on search term (case-insensitive, starts with or contains)
		if (!searchTerm) return options || [];
		const lowerSearchTerm = String(searchTerm).toLowerCase();
		return (options || []).filter(option => 
			String(option).toLowerCase().startsWith(lowerSearchTerm) ||
			String(option).toLowerCase().includes(lowerSearchTerm)
		);
	}, [options, searchTerm]);

	const handleFocus = () => {
		// Open dropdown when input gains focus
		if (!open && !disabled) {
			setOpen(true);
			setHighlight(0);
		}
	};

	const handleKeyDown = (e) => {
		// Handle special keys first
		if (e.key === "Backspace") {
			// Allow backspace to work normally for editing
			if (searchTerm.length === 0) {
				// If the field is empty, prevent any special behavior
				return;
			}
			// If we're at the beginning of the input with a selected value, 
			// allow backspace to clear the selection
			setTimeout(() => {
				if (actualInputRef.current) {
					onChange(actualInputRef.current.value);
					setSearchTerm(actualInputRef.current.value);
				}
			}, 0);
			return; // Don't prevent default for backspace
		}
		
		// Open dropdown on any key press (except Tab, Escape, Enter, Backspace, Arrows)
		if (open === false && !["Tab", "Escape", "Enter", "Backspace", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
			setOpen(true);
			setHighlight(0);
			// Don't prevent default to allow the key to be processed normally
			return;
		}
		
		// Handle Enter key behavior
		if (e.key === "Enter") {
			if (open === false) {
				// First Enter: Open dropdown
				e.preventDefault();
				setOpen(true);
				setHighlight(0);
				return;
			} else {
				// Enter with open dropdown: Select highlighted option and close dropdown
				e.preventDefault();
				if (highlight >= 0 && filteredOptions[highlight]) {
					handleSelect(filteredOptions[highlight]);
					setOpen(false);
					setHighlight(0);
					// Keep focus on the input after selection
					setTimeout(() => {
						actualInputRef.current?.focus();
					}, 0);
				} else if (filteredOptions.length > 0 && searchTerm) {
					// If there's a search term but no highlighted option, select the first match
					handleSelect(filteredOptions[0]);
					setOpen(false);
					setHighlight(0);
					// Keep focus on the input after selection
					setTimeout(() => {
						actualInputRef.current?.focus();
					}, 0);
				} else {
					// If no options match, just close dropdown and keep focus on input
					setOpen(false);
					setHighlight(0);
				}
				return;
			}
		}
		
		// Handle dropdown navigation when open
		if (open === true) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setHighlight(prev => Math.min(prev + 1, filteredOptions.length - 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setHighlight(prev => Math.max(prev - 1, 0));
			} else if (e.key === "Escape") {
				setOpen(false);
				setHighlight(0);
				// Move focus back to the input
				actualInputRef.current?.focus();
			} else if (e.key === "Tab") {
				setOpen(false);
				setHighlight(0);
			}
		} else {
			// When dropdown is closed, handle arrow keys for navigation
			if (e.key === "ArrowRight" || e.key === "ArrowDown") {
				// Allow parent to handle navigation
				return;
			} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
				// Allow parent to handle navigation
				return;
			}
		}
	};

	const handleSelect = (opt) => {
		const stringOpt = String(opt);
		setSearchTerm(stringOpt);
		onChange(stringOpt);
		setOpen(false); 
		setHighlight(0);
	};

	const dropdownList = open && !disabled && createPortal(
		<div className="fixed bg-white border border-slate-300 shadow-dropdown z-[10000] max-h-56 overflow-y-auto mt-1 rounded-sm" style={{ top: `${coords.top}px`, left: `${coords.left}px`, width: `${coords.width}px` }}>
			{filteredOptions.length > 0 ? filteredOptions.map((opt, idx) => (
				<button 
					key={idx} 
					type="button" 
					className={`w-full text-left px-3 py-2.5 text-sm font-medium border-b border-slate-100 last:border-0 transition-colors ${
						highlight === idx ? 'bg-primary-600 text-white' : 'hover:bg-slate-50 text-slate-700'
					}`} 
					onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
				>
					{String(opt)}
				</button>
			)) : <div className="px-3 py-3 text-sm text-slate-400 italic bg-slate-50">No matches found</div>}
		</div>, document.body
	);

	return (
		<div className={`flex flex-col gap-0 w-full relative ${className}`} ref={containerRef} style={style} data-searchable-select data-enter-type="dropdown">
			{label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 ml-0.5 whitespace-nowrap">{String(label)}</label>}
			<div className="relative group" ref={inputWrapperRef} data-open={open ? "true" : "false"}>
				<input ref={actualInputRef} type="text" disabled={disabled} placeholder={placeholder} className={`w-full bg-white border ${error ? 'border-red-400 ring-2 ring-red-50' : 'border-slate-300'} rounded-sm px-3 py-2 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all`} style={{ height: '36px' }} value={searchTerm} onFocus={handleFocus} onKeyDown={handleKeyDown} onBlur={() => setTimeout(() => {!document.activeElement?.closest('[data-searchable-select]') && setOpen(false);}, 150)}  onChange={(e) => { 
				  setSearchTerm(e.target.value); 
				  onChange(e.target.value); 
				  // Update the highlight when typing to reset selection
				  setHighlight(0);
				}} />
				<button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-700 hover:text-slate-900 transition-colors" onClick={() => !disabled && setOpen(!open)}><ChevronDown className="w-4 h-4" /></button>
			</div>
			{dropdownList}
		</div>
	);
}

// Default export for backward compatibility
export default SearchableSelect;
