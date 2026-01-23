// SearchableSelect component
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export function SearchableSelect({ label, options, value, onChange, placeholder, disabled, className = "", style = {}, inputRef, onEnterNext, error }) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState(value || "");
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
	const containerRef = useRef(null);
	const inputWrapperRef = useRef(null);

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
		if (isOpen) {
			updateCoords();
			window.addEventListener('scroll', updateCoords, true);
			window.addEventListener('resize', updateCoords);
		}
		return () => {
			window.removeEventListener('scroll', updateCoords, true);
			window.removeEventListener('resize', updateCoords);
		};
	}, [isOpen]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (containerRef.current && !containerRef.current.contains(event.target)) {
				setIsOpen(false);
				setHighlightedIndex(-1);
			}
		};
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Close dropdown when window loses focus
	useEffect(() => {
		const handleWindowBlur = () => {
			setIsOpen(false);
			setHighlightedIndex(-1);
		};
		window.addEventListener('blur', handleWindowBlur);
		return () => window.removeEventListener('blur', handleWindowBlur);
	}, []);

	const filteredOptions = useMemo(() => {
		return (options || []).filter(opt => (String(opt) || "").toLowerCase().includes((String(searchTerm) || "").toLowerCase()));
	}, [options, searchTerm]);

	const handleSelect = (opt) => {
		const stringOpt = String(opt);
		setSearchTerm(stringOpt);
		onChange(stringOpt);
		setIsOpen(false); 
		setHighlightedIndex(-1);
		if (onEnterNext) onEnterNext();
	};

	const handleKeyDown = (e) => {
		if (disabled) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (!isOpen) setIsOpen(true);
			setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
				handleSelect(filteredOptions[highlightedIndex]);
			} else if (onEnterNext) {
				onEnterNext();
			}
		} else if (e.key === "Escape") {
			setIsOpen(false);
		} else if (e.key === "Tab") {
			setIsOpen(false);
			setHighlightedIndex(-1);
		}
	};

	const dropdownList = isOpen && !disabled && createPortal(
		<div className="fixed bg-white border border-slate-300 shadow-dropdown z-[10000] max-h-56 overflow-y-auto mt-1 rounded-sm" style={{ top: `${coords.top}px`, left: `${coords.left}px`, width: `${coords.width}px` }}>
			{filteredOptions.length > 0 ? filteredOptions.map((opt, idx) => (
				<button key={idx} type="button" className={`w-full text-left px-3 py-2.5 text-sm font-medium border-b border-slate-100 last:border-0 transition-colors ${highlightedIndex === idx ? 'bg-primary-600 text-white' : 'hover:bg-slate-50 text-slate-700'}`} onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}>{String(opt)}</button>
			)) : <div className="px-3 py-3 text-sm text-slate-400 italic bg-slate-50">No matches found</div>}
		</div>, document.body
	);

	return (
		<div className={`flex flex-col gap-0 w-full relative ${className}`} ref={containerRef} style={style} data-searchable-select>
			{label && <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 ml-0.5 whitespace-nowrap">{String(label)}</label>}
			<div className="relative group" ref={inputWrapperRef}>
				<input ref={inputRef} type="text" disabled={disabled} placeholder={placeholder} className={`w-full bg-white border ${error ? 'border-red-400 ring-2 ring-red-50' : 'border-slate-300'} rounded-sm px-3 py-2 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all`} style={{ height: '36px' }} value={searchTerm} onFocus={() => !disabled && setIsOpen(true)} onBlur={() => setTimeout(() => {!document.activeElement?.closest('[data-searchable-select]') && setIsOpen(false);}, 150)} onKeyDown={handleKeyDown} onChange={(e) => { setSearchTerm(e.target.value); onChange(e.target.value); setIsOpen(true); }} />
				<button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors" onClick={() => !disabled && setIsOpen(!isOpen)}><ChevronDown className="w-4 h-4" /></button>
			</div>
			{dropdownList}
		</div>
	);
}

// Default export for backward compatibility
export default SearchableSelect;
