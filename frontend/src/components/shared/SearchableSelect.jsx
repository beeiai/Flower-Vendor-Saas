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

	// Only sync value → searchTerm when NOT editing
	useEffect(() => {
		if (!isEditing) {
			setSearchTerm(String(value || ""));
		}
	}, [value, isEditing]);

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

	useEffect(() => {
		const handleWindowBlur = () => {
			setOpen(false);
			setHighlight(0);
		};
		window.addEventListener('blur', handleWindowBlur);
		return () => window.removeEventListener('blur', handleWindowBlur);
	}, []);

	const highlightMatch = (text, searchTerm) => {
		if (!searchTerm) return text;
		const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		const parts = text.split(regex);
		return parts.map((part, index) => 
			regex.test(part) ? 
				<span key={index} className="font-bold text-primary-600 bg-primary-100">{part}</span> : 
				part
		);
	};

	const filteredOptions = useMemo(() => {
		// Always show all options - industry standard dropdown behavior
		return options || [];
	}, [options]);

	const handleFocus = () => {
		if (!open && !disabled) {
			setOpen(true);
			setHighlight(0);
			// Scroll to top when opening dropdown
			setTimeout(() => {
				const dropdown = document.querySelector('[data-searchable-select] .fixed');
				if (dropdown) {
					dropdown.scrollTop = 0;
				}
			}, 0);
		}
	};

	// Called on both keyboard Enter selection and mouse click
	const handleSelect = (opt) => {
		const stringOpt = String(opt);
		setSearchTerm(stringOpt);
		onChange(stringOpt);
		setOpen(false);
		setHighlight(0);
		// After selecting, move focus to next field
		setTimeout(() => {
			onSelectionComplete?.();
		}, 0);
	};

	const handleKeyDown = (e) => {
		if (open) {
			// --- Dropdown is OPEN: handle navigation and selection ---
			if (e.key === 'Enter') {
				e.preventDefault();
				if (filteredOptions[highlight]) {
					// Select highlighted option → closes dropdown → onSelectionComplete fires → moves to next field
					handleSelect(filteredOptions[highlight]);
				} else if (filteredOptions.length > 0) {
					handleSelect(filteredOptions[0]);
				} else {
					setOpen(false);
					setHighlight(0);
				}
				return;
			}
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setHighlight(prev => Math.min(prev + 1, filteredOptions.length - 1));
				return;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				setHighlight(prev => Math.max(prev - 1, 0));
				return;
			}
			if (e.key === 'Escape') {
				e.preventDefault();
				setOpen(false);
				setHighlight(0);
				return;
			}
			if (e.key === 'Tab') {
				setOpen(false);
				setHighlight(0);
				return;
			}
			// Any other key: let it type into the search input naturally
			return;
		}

		// --- Dropdown is CLOSED ---
		if (e.key === 'Enter') {
			e.preventDefault();
			if (value) {
				// Already has a value selected → move to next field
				onSelectionComplete?.();
			} else {
				// No value yet → open dropdown
				setOpen(true);
				setHighlight(0);
			}
			return;
		}

		if (e.key === 'Backspace') {
			// Let input onChange handle it naturally
			return;
		}

		// Any printable key → open dropdown and let the keystroke go into the input
		if (!["Tab", "Escape", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Shift", "Control", "Alt", "Meta"].includes(e.key)) {
			setOpen(true);
			setHighlight(0);
		}
	};

	const dropdownList = open && !disabled && createPortal(
		<div
			className="fixed bg-white border border-slate-300 shadow-dropdown z-[10000] max-h-80 overflow-y-auto mt-1 rounded-sm"
			style={{ top: `${coords.top}px`, left: `${coords.left}px`, width: `${coords.width}px` }}
		>
			{filteredOptions.length > 0
				? filteredOptions.map((opt, idx) => (
					<button
						key={idx}
						type="button"
						className={`w-full text-left px-3 py-2.5 text-sm font-medium border-b border-slate-100 last:border-0 transition-colors ${
							highlight === idx ? 'bg-primary-600 text-white' : 'hover:bg-slate-50 text-slate-700'
						}`}
						onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
					>
						{highlightMatch(String(opt), searchTerm)}
					</button>
				))
				: <div className="px-3 py-3 text-sm text-slate-400 italic bg-slate-50">No matches found</div>
			}
		</div>,
		document.body
	);

	return (
		<div
			className={`flex flex-col gap-0 w-full relative ${className}`}
			ref={containerRef}
			style={style}
			data-searchable-select
			data-enter-type="dropdown"
		>
			{label && (
				<label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 ml-0.5 whitespace-nowrap">
					{String(label)}
				</label>
			)}
			<div className="relative group" ref={inputWrapperRef} data-open={open ? "true" : "false"}>
				<input
					ref={actualInputRef}
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
						handleFocus();
					}}
					onBlur={() => {
						setIsEditing(false);
						setTimeout(() => {
							if (!document.activeElement?.closest('[data-searchable-select]')) {
								setOpen(false);
							}
						}, 150);
					}}
					onChange={(e) => {
						// Only update local search term — do NOT call onChange with partial text
						// onChange is only called from handleSelect when a real option is picked
						setSearchTerm(e.target.value);
						setHighlight(0);
						if (!open) setOpen(true);
					}}
					onKeyDown={handleKeyDown}
				/>
				<button
					type="button"
					tabIndex={-1}
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

export default SearchableSelect;