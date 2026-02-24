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
	const [isEditing, setIsEditing] = useState(false);
	const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
	const containerRef = useRef(null);
	const inputWrapperRef = useRef(null);
	const inputRefInternal = useRef(null);
	const internalSelectRef = useRef(null);
	const actualInputRef = inputRef || inputRefInternal;
	const actualSelectRef = selectRef || internalSelectRef;
	
	// ✅ FIX: Only sync value → searchTerm when NOT editing.
	// Removed `searchTerm` from deps to prevent the effect from re-running
	// every keystroke and fighting with user input.
	useEffect(() => {
		if (!isEditing) {
			setSearchTerm(String(value || ""));
		}
	}, [value, isEditing]); // ← searchTerm intentionally removed from deps

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
		if (!searchTerm) return options || [];
		const lowerSearchTerm = String(searchTerm).toLowerCase();
		return (options || []).filter(option => 
			String(option).toLowerCase().startsWith(lowerSearchTerm) ||
			String(option).toLowerCase().includes(lowerSearchTerm)
		);
	}, [options, searchTerm]);

	const handleFocus = () => {
		if (!open && !disabled) {
			setOpen(true);
			setHighlight(0);
		}
	};

	const handleKeyDown = (e) => {
		if (e.key === "Backspace") {
			// ✅ FIX: Don't call onChange mid-delete via setTimeout hack.
			// Let the onChange on the input element handle it naturally.
			return;
		}
		
		if (open === false && !["Tab", "Escape", "Enter", "Backspace", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
			setOpen(true);
			setHighlight(0);
			return;
		}
		
		if (e.key === "Enter") {
			if (open === false) {
				e.preventDefault();
				setOpen(true);
				setHighlight(0);
				return;
			} else {
				e.preventDefault();
				if (highlight >= 0 && filteredOptions[highlight]) {
					handleSelect(filteredOptions[highlight]);
				} else if (filteredOptions.length > 0 && searchTerm) {
					handleSelect(filteredOptions[0]);
				} else {
					setOpen(false);
					setHighlight(0);
				}
				return;
			}
		}
		
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
				actualInputRef.current?.focus();
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
		// Notify parent that selection is complete (e.g. move to next field)
		setTimeout(() => {
			onSelectionComplete?.();
		}, 0);
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
				<input
					ref={actualInputRef}
					type="text"
					disabled={disabled}
					placeholder={placeholder}
					className={`w-full bg-white border ${error ? 'border-red-400 ring-2 ring-red-50' : 'border-slate-300'} rounded-sm px-3 py-2 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all`}
					style={{ height: '36px' }}
					value={searchTerm}
					onFocus={() => { setIsEditing(true); handleFocus(); }}
					onBlur={() => {
						setIsEditing(false);
						setTimeout(() => {
							if (!document.activeElement?.closest('[data-searchable-select]')) {
								setOpen(false);
							}
						}, 150);
					}}
					onChange={(e) => {
						// ✅ FIX: Update local searchTerm freely while typing.
						// Do NOT call onChange with partial text — only call onChange
						// when a real option is selected via handleSelect.
						// This stops the parent value from updating mid-type and
						// causing the useEffect to reset searchTerm on each keystroke.
						const typed = e.target.value;
						setSearchTerm(typed);
						setHighlight(0);
						if (!open) setOpen(true);
					}}
					onKeyDown={handleKeyDown}
				/>
				<button
					type="button"
					className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-700 hover:text-slate-900 transition-colors"
					onClick={() => !disabled && setOpen(!open)}
				>
					<ChevronDown className="w-4 h-4" />
				</button>
			</div>
			{dropdownList}
		</div>
	);
}

// Default export for backward compatibility
export default SearchableSelect;
