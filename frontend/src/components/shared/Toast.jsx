import React from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type, onClose }) {
	if (!message) return null;
	const colors = { success: "bg-emerald-600", error: "bg-red-600", info: "bg-slate-800" };
	const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? XCircle : Info;
	return (
		<div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-2 rounded-full shadow-2xl text-white animate-in slide-in-from-top-4 duration-300 ${colors[type]}`}>
			<Icon className="w-4 h-4" />
			<span className="text-[10px] font-black uppercase tracking-widest">{String(message)}</span>
			<button onClick={onClose} className="ml-2 hover:opacity-50"><X className="w-3.5 h-3.5" /></button>
		</div>
	);
}
