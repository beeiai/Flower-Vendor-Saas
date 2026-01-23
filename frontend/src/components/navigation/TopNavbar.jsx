import React from 'react';
import { Flower2, Receipt, FolderPlus, PackagePlus, Users, Truck, ChevronDown, Monitor, Send, Printer, Layers, WalletCards, Coins, Landmark, FileBarChart, Sparkles } from 'lucide-react';

export default function TopNavbar({ activeSection, setActiveSection, setShowTMenu, showTMenu, setShowUMenu, showUMenu, setShowMMenu, showMMenu, setModalMode, setIsModalOpen }) {
	return (
		<nav className="h-12 bg-slate-900 flex items-center px-5 shrink-0 z-[4000] border-b border-black/50 shadow-2xl">
			<div className="flex items-center gap-6 h-full">
				<div className="flex items-center gap-2 pr-6 border-r border-slate-700 cursor-pointer h-full" onClick={() => setActiveSection('daily')}><Flower2 className="w-5 h-5 text-primary-400" /><span className="text-sm font-bold text-white tracking-wide">SKFS ERP</span><span className="text-xs text-slate-400 font-medium">v5.0.4</span></div>
				<div className="relative h-full flex items-center"><button onClick={() => setShowTMenu(!showTMenu)} className={`flex items-center gap-2 px-4 h-full text-xs font-semibold transition-all ${showTMenu ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-300 hover:text-white'}`}>Transaction <ChevronDown className="w-3.5 h-3.5" /></button>
					{showTMenu && <div className="absolute top-12 left-0 w-56 bg-white border border-slate-200 shadow-dropdown py-1 animate-in slide-in-from-top-2 duration-150 rounded-sm overflow-hidden z-[5000]">
						{[ 
							{ id: 'daily', l: 'Daily Transaction', i: Receipt }, 
							{ id: 'group-reg', l: 'New Group', i: FolderPlus }, 
							{ id: 'item-reg', l: 'New Item', i: PackagePlus }, 
							{ id: 'party', l: 'Party Details', i: Users }, 
							{ id: 'vehicle', l: 'Extra Vehicle', i: Truck } 
						].map(item => (
							<button key={item.id} onClick={() => { setShowTMenu(false); if (['group-reg', 'item-reg', 'party'].includes(item.id)) { setModalMode(item.id === 'party' ? 'customer' : item.id === 'item-reg' ? 'item' : 'group'); setIsModalOpen(true); } else setActiveSection(item.id); }} className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === item.id ? 'bg-primary-600 text-white' : 'text-slate-700 hover:bg-primary-50 hover:text-primary-700'}`}><item.i className="w-4 h-4" /> {item.l}</button>
						))}
					</div>}
				</div>
				<button onClick={() => setActiveSection('reports')} className={`flex items-center gap-2 px-4 h-full text-xs font-semibold transition-all ${activeSection === 'reports' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'}`}>Reports</button>
				<div className="relative h-full flex items-center"><button onClick={() => setShowUMenu(!showUMenu)} className={`flex items-center gap-2 px-4 h-full text-xs font-semibold transition-all ${showUMenu ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-300 hover:text-white'}`}>Utility <ChevronDown className="w-3.5 h-3.5" /></button>
					{showUMenu && <div className="absolute top-12 left-0 w-64 bg-white border border-slate-200 shadow-dropdown py-1 animate-in slide-in-from-top-2 duration-150 rounded-sm overflow-hidden z-[5000]">
						{[ 
							{ id: 'daily-sale', l: 'Daily Sale', i: Monitor }, 
							{ id: 'sms', l: 'Daily SMS', i: Send },
							{ id: 'group-print', l: 'Group Printing', i: Printer }, 
							{ id: 'group-total', l: 'Group Total Report', i: Layers },
							{ id: 'group-adv', l: 'Group Wise Advance', i: WalletCards },
							{ id: 'group-pay', l: 'Group Wise Payment', i: Coins }
						].map(item => (
							<button key={item.id} onClick={() => { setShowUMenu(false); setActiveSection(item.id); }} className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === item.id ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'}`}><item.i className="w-4 h-4" /> {item.l}</button>
						))}
					</div>}
				</div>
				<div className="relative h-full flex items-center"><button onClick={() => setShowMMenu(!showMMenu)} className={`flex items-center gap-2 px-4 h-full text-xs font-semibold transition-all ${showMMenu ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-300 hover:text-white'}`}>More <ChevronDown className="w-3.5 h-3.5" /></button>
					{showMMenu && <div className="absolute top-12 left-0 w-52 bg-white border border-slate-200 shadow-dropdown py-1 animate-in slide-in-from-top-2 duration-150 rounded-sm overflow-hidden z-[5000]">
						{[ { id: 'advance', l: 'Advance Tracker', i: WalletCards }, { id: 'saala', l: 'Saala (Credit)', i: Landmark } ].map(item => (
							<button key={item.id} onClick={() => { setShowMMenu(false); setActiveSection(item.id); }} className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === item.id ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'}`}><item.i className="w-4 h-4" /> {item.l}</button>
						))}
					</div>}
				</div>
			</div>
		</nav>
	);
}
