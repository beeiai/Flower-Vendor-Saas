// SearchableSelect component
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export default function SearchableSelect({ label, options, value, onChange, placeholder, disabled, className = "", style = {}, inputRef, onEnterNext, error }) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState(value || "");
	const [highlightedIndex, setHighlightedIndex] = useState(-1);
	const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
	const containerRef = useRef(null);
	const inputWrapperRef = useRef(null);

	useEffect(() => { setSearchTerm(String(value || "")); }, [value]);

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
			if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
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
		}
	};

	const dropdownList = isOpen && !disabled && createPortal(
		<div className="fixed bg-white border border-slate-400 shadow-2xl z-[10000] max-h-48 overflow-y-auto mt-0.5 rounded-none" style={{ top: `${coords.top}px`, left: `${coords.left}px`, width: `${coords.width}px` }}>
			{filteredOptions.length > 0 ? filteredOptions.map((opt, idx) => (
				<button key={idx} type="button" className={`w-full text-left px-3 py-1.5 text-[10px] font-bold border-b border-slate-100 last:border-0 ${highlightedIndex === idx ? 'bg-rose-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`} onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}>{String(opt)}</button>
			)) : <div className="px-3 py-2 text-[10px] text-slate-400 italic bg-slate-50">No matches found</div>}
		</div>, document.body
	);

	return (
		<div className={`flex flex-col gap-0 w-full relative ${className}`} ref={containerRef} style={style}>
			{label && <label className="text-[9px] font-black text-slate-600 uppercase tracking-tighter mb-0.5 ml-0.5 whitespace-nowrap">{String(label)}</label>}
			<div className="relative group" ref={inputWrapperRef}>
				<input ref={inputRef} type="text" disabled={disabled} placeholder={placeholder} className={`w-full bg-white border ${error ? 'border-red-500 ring-1 ring-red-50' : 'border-slate-400'} rounded-none px-1.5 py-0.5 text-[11px] font-bold outline-none focus:border-rose-600 transition-all`} style={{ height: '28px' }} value={searchTerm} onFocus={() => !disabled && setIsOpen(true)} onKeyDown={handleKeyDown} onChange={(e) => { setSearchTerm(e.target.value); onChange(e.target.value); setIsOpen(true); }} />
				<button type="button" className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400" onClick={() => !disabled && setIsOpen(!isOpen)}><ChevronDown className="w-3 h-3" /></button>
			</div>
			{dropdownList}
		</div>
	);
}
