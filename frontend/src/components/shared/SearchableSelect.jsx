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
		// Show all options from database regardless of search term
		return options || [];
	}, [options]);

	const handleFocus = () => {
		// Open dropdown when input gains focus
		if (!open && !disabled) {
			setOpen(true);
			setHighlight(0);
		}
	};

	const handleKeyDown = (e) => {
		// Open dropdown on any key press (except Tab, Escape, Enter)
		if (open === false && !["Tab", "Escape", "Enter"].includes(e.key)) {
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
				// Second Enter: Select highlighted option and move to next field
				e.preventDefault();
				if (highlight >= 0 && filteredOptions[highlight]) {
					handleSelect(filteredOptions[highlight]);
					setOpen(false);
					setHighlight(0);
					// Notify parent component that selection is complete
					setTimeout(() => {
						if (onSelectionComplete) {
							onSelectionComplete();
						}
					}, 0);
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
			} else if (e.key === "Tab") {
				setOpen(false);
				setHighlight(0);
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
				<input ref={actualInputRef} type="text" disabled={disabled} placeholder={placeholder} className={`w-full bg-white border ${error ? 'border-red-400 ring-2 ring-red-50' : 'border-slate-300'} rounded-sm px-3 py-2 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all`} style={{ height: '36px' }} value={searchTerm} onFocus={handleFocus} onKeyDown={handleKeyDown} onBlur={() => setTimeout(() => {!document.activeElement?.closest('[data-searchable-select]') && setOpen(false);}, 150)}  onChange={(e) => { setSearchTerm(e.target.value); onChange(e.target.value); }} />
				<button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors" onClick={() => !disabled && setOpen(!open)}><ChevronDown className="w-4 h-4" /></button>
			</div>
			{dropdownList}
		</div>
	);
}

// Default export for backward compatibility
export default SearchableSelect;
