import React from 'react';
import { Flower2, Receipt, FolderPlus, PackagePlus, Users, Truck, ChevronDown, Monitor, Send, Printer, Layers, WalletCards, Coins, Landmark, FileBarChart, Sparkles } from 'lucide-react';

export default function TopNavbar({ activeSection, setActiveSection, setShowTMenu, showTMenu, setShowUMenu, showUMenu, setShowMMenu, showMMenu, setModalMode, setIsModalOpen }) {
	return (
		<nav className="h-10 bg-slate-900 flex items-center px-4 shrink-0 z-[4000] border-b border-black/50 shadow-2xl">
			<div className="flex items-center gap-6 h-full">
				<div className="flex items-center gap-2 pr-6 border-r border-slate-700 cursor-pointer h-full" onClick={() => setActiveSection('daily')}><Flower2 className="w-4 h-4 text-rose-50" /><span className="text-[11px] font-black text-white italic tracking-widest">SKFS ERP v5.0.4</span></div>
				<div className="relative h-full flex items-center"><button onClick={() => setShowTMenu(!showTMenu)} className={`flex items-center gap-2 px-4 h-full text-[10px] font-black uppercase transition-all ${showTMenu ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-300 hover:text-white'}`}>Transaction <ChevronDown className="w-3 h-3" /></button>
					{showTMenu && <div className="absolute top-10 left-0 w-56 bg-white border border-slate-300 shadow-2xl py-1 animate-in slide-in-from-top-2 duration-150 rounded-none overflow-hidden z-[5000]">
						{[ 
							{ id: 'daily', l: 'Daily Transaction', i: Receipt }, 
							{ id: 'group-reg', l: 'New Group', i: FolderPlus }, 
							{ id: 'item-reg', l: 'New Item', i: PackagePlus }, 
							{ id: 'party', l: 'Party Details', i: Users }, 
							{ id: 'vehicle', l: 'Extra Vehicle', i: Truck } 
						].map(item => (
							<button key={item.id} onClick={() => { setShowTMenu(false); if (['group-reg', 'item-reg', 'party'].includes(item.id)) { setModalMode(item.id === 'party' ? 'customer' : item.id === 'item-reg' ? 'item' : 'group'); setIsModalOpen(true); } else setActiveSection(item.id); }} className={`w-full text-left px-5 py-2.5 text-[11px] font-bold flex items-center gap-3 transition-colors ${activeSection === item.id ? 'bg-rose-600 text-white' : 'hover:bg-rose-600 hover:text-white'}`}><item.i className="w-3.5 h-3.5" /> {item.l}</button>
						))}
					</div>}
				</div>
				<button onClick={() => setActiveSection('reports')} className={`flex items-center gap-2 px-4 h-full text-[10px] font-black uppercase transition-all ${activeSection === 'reports' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'}`}>Reports</button>
				<div className="relative h-full flex items-center"><button onClick={() => setShowUMenu(!showUMenu)} className={`flex items-center gap-2 px-4 h-full text-[10px] font-black uppercase transition-all ${showUMenu ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-300 hover:text-white'}`}>Utility <ChevronDown className="w-3 h-3" /></button>
					{showUMenu && <div className="absolute top-10 left-0 w-64 bg-white border border-slate-300 shadow-2xl py-1 animate-in slide-in-from-top-2 duration-150 rounded-none overflow-hidden z-[5000]">
						{[ 
							{ id: 'daily-sale', l: 'Daily Sale', i: Monitor }, 
							{ id: 'sms', l: 'Daily SMS', i: Send },
							{ id: 'group-print', l: 'Group Printing', i: Printer }, 
							{ id: 'group-total', l: 'Group Total Report', i: Layers },
							{ id: 'group-adv', l: 'Group Wise Advance', i: WalletCards },
							{ id: 'group-pay', l: 'Group Wise Payment', i: Coins }
						].map(item => (
							<button key={item.id} onClick={() => { setShowUMenu(false); setActiveSection(item.id); }} className={`w-full text-left px-5 py-2.5 text-[11px] font-bold flex items-center gap-3 transition-colors ${activeSection === item.id ? 'bg-slate-100 text-slate-900 font-black' : 'hover:bg-slate-100 text-slate-700'}`}><item.i className="w-3.5 h-3.5" /> {item.l}</button>
						))}
					</div>}
				</div>
				<div className="relative h-full flex items-center"><button onClick={() => setShowMMenu(!showMMenu)} className={`flex items-center gap-2 px-4 h-full text-[10px] font-black uppercase transition-all ${showMMenu ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-300 hover:text-white'}`}>More <ChevronDown className="w-3 h-3" /></button>
					{showMMenu && <div className="absolute top-10 left-0 w-48 bg-white border border-slate-300 shadow-2xl py-1 animate-in slide-in-from-top-2 duration-150 rounded-none overflow-hidden z-[5000]">
						{[ { id: 'advance', l: 'Advance Tracker', i: WalletCards }, { id: 'saala', l: 'SAALA (Credit)', i: Landmark } ].map(item => (
							<button key={item.id} onClick={() => { setShowMMenu(false); setActiveSection(item.id); }} className={`w-full text-left px-5 py-2.5 text-[11px] font-bold flex items-center gap-3 transition-colors ${activeSection === item.id ? 'bg-slate-100 text-slate-900 font-black' : 'hover:bg-slate-100 text-slate-600'}`}><item.i className="w-3.5 h-3.5" /> {item.l}</button>
						))}
					</div>}
				</div>
			</div>
		</nav>
	);
}
