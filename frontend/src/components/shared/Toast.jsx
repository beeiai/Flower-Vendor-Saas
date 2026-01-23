import React from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type, onClose }) {
	if (!message) return null;
	const colors = { 
		success: "bg-emerald-600 shadow-emerald-200", 
		error: "bg-red-600 shadow-red-200", 
		info: "bg-slate-700 shadow-slate-200" 
	};
	const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? XCircle : Info;
	return (
		<div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-white animate-slideDown ${colors[type]}`}>
			<Icon className="w-5 h-5 flex-shrink-0" />
			<span className="text-sm font-semibold tracking-wide">{String(message)}</span>
			<button onClick={onClose} className="ml-2 p-1 rounded hover:bg-white/20 transition-colors"><X className="w-4 h-4" /></button>
		</div>
	);
}
