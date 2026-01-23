
import React, { useRef } from 'react';
import { SearchableSelect } from '../shared/SearchableSelect';
import { Users, UserPlus, PackagePlus, Edit2, Trash2, Database } from 'lucide-react';

export default function DailyTransactionsView({ customerInfo, setCustomerInfo, groups, customers, catalog, vehicles, onOpenQuickAdd, currentEntry, setCurrentEntry, items, onAddItem, onRemoveItem, onEditItem, summary, onSaveRecord, onViewReport, advanceStore, commissionPct, setCommissionPct }) {
	const gRef = useRef(null); const cuRef = useRef(null); const vRef = useRef(null); const cRef = useRef(null); const nRef = useRef(null); const qRef = useRef(null); const rRef = useRef(null); const lRef = useRef(null); const coRef = useRef(null); const pRef = useRef(null); const remRef = useRef(null);
	const filteredCustomers = customers.filter(c => !customerInfo.groupName || c.group === customerInfo.groupName);
	const remAdvance = advanceStore?.[customerInfo.customerName]?.balance || 0;
	const handleCustomerSelect = (name) => {
		const c = customers.find(x => x.name === name);
		if (c) setCustomerInfo({ customerName: name, groupName: c.group, contactNo: c.contact, address: c.address });
		else setCustomerInfo({ ...customerInfo, customerName: name });
	};
	const handleKey = (e, next) => { if (e.key === 'Enter') { e.preventDefault(); next?.current?.focus(); } };

	return (
		<div className="flex-1 flex flex-row gap-2 h-full p-2 bg-[#f1f3f5] overflow-hidden">
			<div className="flex-1 flex flex-col gap-2 overflow-hidden">
				<section className="bg-white border border-slate-300 p-3 shadow-sm shrink-0">
					<div className="flex items-center gap-2 mb-2 text-rose-600 font-black text-[9px] uppercase border-b pb-1"><Users className="w-3 h-3" /> Trading Client Data</div>
					<div className="grid grid-cols-5 gap-4">
						<SearchableSelect inputRef={gRef} label="Group Category" options={groups.map(g => g.name)} value={customerInfo.groupName} onChange={(val) => setCustomerInfo({...customerInfo, groupName: val, customerName: ''})} placeholder="Filter Group" onEnterNext={() => cuRef.current?.focus()} />
						<div className="flex gap-1 items-end overflow-visible"><SearchableSelect inputRef={cuRef} label="Party/Customer" options={filteredCustomers.map(c => c.name)} value={customerInfo.customerName} onChange={handleCustomerSelect} placeholder="Search Party" className="flex-1" onEnterNext={() => vRef.current?.focus()} /><button onClick={() => onOpenQuickAdd('customer')} className="p-1.5 bg-slate-100 border border-slate-400 hover:bg-rose-600 hover:text-white transition-all mb-0.5 shadow-sm"><UserPlus className="w-3 h-3" /></button></div>
						<div><label className="text-[9px] font-bold text-slate-500 uppercase">Address</label><input type="text" readOnly className="w-full bg-slate-50 border p-1 text-[11px] text-slate-600 cursor-not-allowed" value={String(customerInfo.address || '--')} /></div>
						<div><label className="text-[9px] font-bold text-slate-500 uppercase">Phone</label><input type="text" readOnly className="w-full bg-slate-50 border p-1 text-[11px] text-slate-600 cursor-not-allowed" value={String(customerInfo.contactNo || '--')} /></div>
						<div><label className="text-[9px] font-bold text-rose-600 uppercase">Rem. Advance</label><input type="text" readOnly className="w-full bg-rose-50 border border-rose-200 text-rose-600 p-1 text-[11px] font-black cursor-not-allowed" value={`₹ ${remAdvance.toLocaleString()}`} /></div>
					</div>
				</section>
				<section className="bg-white border border-slate-400 shadow-sm flex flex-col relative z-30 shrink-0 overflow-visible">
					<div className="bg-slate-100 px-3 py-1 border-b text-slate-700 font-black text-[9px] uppercase flex items-center gap-2"><Database className="w-3 h-3" /> Data Entry Row</div>
					<div className="p-2 border-b bg-slate-50 overflow-x-auto">
						<div className="flex items-end gap-1 min-w-[1200px]">
							<div className="w-[50px]"><label className="text-[8px] font-black text-slate-500 uppercase text-center block">Date</label><input type="date" className="w-full text-[11px] border border-slate-400 px-1 py-0.5 font-bold h-[28px] outline-none" value={currentEntry.date} onChange={e => setCurrentEntry({...currentEntry, date: e.target.value})} /></div>
							<div className="w-[90px]"><SearchableSelect inputRef={vRef} label="Vehicle" options={vehicles.map(v => v.name)} value={currentEntry.vehicle} onChange={(v) => setCurrentEntry({...currentEntry, vehicle: v})} onEnterNext={() => cRef.current?.focus()} /></div>
							<div className="w-[90px] flex items-end gap-1"><SearchableSelect inputRef={cRef} label="Item Code" options={catalog.map(i => i.itemCode)} value={currentEntry.itemCode} onChange={(c) => { const item = catalog.find(x => x.itemCode === c); setCurrentEntry({...currentEntry, itemCode: c, itemName: item?.itemName || currentEntry.itemName, rate: item?.rate || currentEntry.rate}); }} onEnterNext={() => nRef.current?.focus()} /><button onClick={() => onOpenQuickAdd('item')} className="bg-slate-200 border border-slate-400 p-1.5 hover:bg-rose-600 hover:text-white h-[28px]"><PackagePlus className="w-3 h-3" /></button></div>
							<div className="w-[120px]"><SearchableSelect inputRef={nRef} label="Item Name" options={catalog.map(i => i.itemName)} value={currentEntry.itemName} onChange={(n) => { const item = catalog.find(x => x.itemName === n); setCurrentEntry({...currentEntry, itemName: n, itemCode: item?.itemCode || currentEntry.itemCode, rate: item?.rate || currentEntry.rate}); }} onEnterNext={() => qRef.current?.focus()} /></div>
							<div className="w-[60px]"><label className="text-[8px] font-black uppercase text-slate-500 block text-center">Qty</label><input ref={qRef} type="number" className="w-full border px-1.5 h-[28px] text-right text-[11px] outline-none focus:border-rose-600" value={currentEntry.qty} onChange={e => setCurrentEntry({...currentEntry, qty: e.target.value})} onKeyDown={e => handleKey(e, rRef)} /></div>
							<div className="w-[70px]"><label className="text-[8px] font-black uppercase text-slate-500 block text-center">Rate</label><input ref={rRef} type="number" className="w-full border px-1.5 h-[28px] text-right text-[11px] outline-none focus:border-rose-600" value={currentEntry.rate} onChange={e => setCurrentEntry({...currentEntry, rate: e.target.value})} onKeyDown={e => handleKey(e, lRef)} /></div>
							<div className="w-[80px]"><label className="text-[8px] font-black uppercase text-slate-500 block text-center">Total</label><input type="text" className="w-full border px-1.5 h-[28px] text-right text-[11px] bg-slate-100 outline-none" value={currentEntry.qty && currentEntry.rate ? Number(currentEntry.qty) * Number(currentEntry.rate) : ''} readOnly /></div>
							<div className="w-[60px]"><label className="text-[8px] font-black uppercase text-slate-500 block text-center">Laguage</label><input ref={lRef} type="number" className="w-full border px-1.5 h-[28px] text-right text-[11px] outline-none focus:border-rose-600" value={currentEntry.laguage} onChange={e => setCurrentEntry({...currentEntry, laguage: e.target.value})} onKeyDown={e => handleKey(e, coRef)} /></div>
							<div className="w-[80px]"><label className="text-[8px] font-black uppercase text-slate-500 block text-center">L. Amount</label><input type="text" className="w-full border px-1.5 h-[28px] text-right text-[11px] bg-slate-100 outline-none" value={currentEntry.laguage && currentEntry.qty ? Number(currentEntry.laguage) * Number(currentEntry.qty) : ''} readOnly /></div>
							<div className="w-[60px]"><label className="text-[8px] font-black uppercase text-slate-500 block text-center">Coolie</label><input ref={coRef} type="number" className="w-full border px-1.5 h-[28px] text-right text-[11px] outline-none focus:border-rose-600" value={currentEntry.coolie} onChange={e => setCurrentEntry({...currentEntry, coolie: e.target.value})} onKeyDown={e => handleKey(e, pRef)} /></div>
							<div className="w-[80px]"><label className="text-[8px] font-black uppercase text-slate-500 block text-center">Paid Amount</label><input ref={pRef} type="number" className="w-full border px-1.5 h-[28px] text-right text-[11px] outline-none focus:border-rose-600" value={currentEntry.paidAmt} onChange={e => setCurrentEntry({...currentEntry, paidAmt: e.target.value})} onKeyDown={e => handleKey(e, remRef)} /></div>
							<div className="w-[120px]"><SearchableSelect inputRef={remRef} label="Remarks" options={['Regular', 'Urgent', 'Special']} value={currentEntry.remarks} onChange={(rem) => setCurrentEntry({...currentEntry, remarks: rem})} onEnterNext={() => onAddItem()} /></div>
							<div className="ml-auto pr-1"><button onClick={onAddItem} className="bg-slate-900 text-white px-8 h-[28px] text-[9px] font-black uppercase hover:bg-rose-600 shadow-md transition-all active:translate-y-px">{currentEntry.id ? 'UPDATE' : 'ADD'}</button></div>
						</div>
					</div>
					<div className="flex-1 overflow-auto bg-white custom-table-scroll" style={{ maxHeight: '400px' }}>
						<table className="w-full text-left text-[11px] border-collapse relative">
							<thead className="sticky top-0 bg-slate-200 z-20 border-b-2 font-black uppercase text-[8px] text-slate-800 shadow-sm">
								<tr>
									<th className="p-2 w-10 text-center">Sl.No.</th>
									<th className="p-2 w-24">Vehicle</th>
									<th className="p-2 w-24">Date</th>
									<th className="p-2 w-20">Item Code</th>
									<th className="p-2 w-28">Item Name</th>
									<th className="p-2 text-right w-12">Qty</th>
									<th className="p-2 text-right w-14">Rate</th>
									<th className="p-2 text-right w-16">Total</th>
									<th className="p-2 text-right w-14">Laguage</th>
									<th className="p-2 text-right w-16">L. Amount</th>
									<th className="p-2 text-right w-14">Coolie</th>
									<th className="p-2 text-right w-20">Paid Amount</th>
									<th className="p-2 w-28">Remarks</th>
									<th className="p-2 text-right w-16">Action</th>
								</tr>
							</thead>
							<tbody>
								{items.length === 0 ? <tr><td colSpan="14" className="p-12 text-center text-slate-300 italic font-black text-[10px] tracking-widest uppercase">No transactions recorded for this session</td></tr> : items.map((item, idx) => {
									const grossVal = Number(item.qty) * Number(item.rate);
									const lagVal = Number(item.laguage || 0) * Number(item.qty);
									return (
									<tr key={item.id} className="hover:bg-rose-50 border-b group">
										<td className="p-2 text-center text-slate-400 font-bold">{String(idx+1)}</td>
										<td className="p-2 font-bold text-slate-700">{String(item.vehicle || '--')}</td>
										<td className="p-2 font-mono text-slate-500">{String(item.date)}</td>
										<td className="p-2 font-mono text-slate-500">{String(item.itemCode)}</td>
										<td className="p-2 font-bold text-slate-800">{String(item.itemName)}</td>
										<td className="p-2 text-right font-black">{String(item.qty)}</td>
										<td className="p-2 text-right font-mono">₹{String(item.rate)}</td>
										<td className="p-2 text-right font-black text-rose-600 bg-rose-50/20">₹{grossVal.toLocaleString()}</td>
										<td className="p-2 text-right text-slate-500 italic">{String(item.laguage || 0)}</td>
										<td className="p-2 text-right text-slate-500 italic">₹{lagVal.toLocaleString()}</td>
										<td className="p-2 text-right text-slate-500 italic">₹{String(item.coolie || 0)}</td>
										<td className="p-2 text-right text-emerald-600 font-bold">₹{String(item.paidAmt||0)}</td>
										<td className="p-2">{String(item.remarks || '')}</td>
										<td className="p-2 text-right space-x-1"><button onClick={()=>onEditItem(item)} className="p-1 text-blue-600 opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-3.5 h-3.5"/></button><button onClick={()=>onRemoveItem(item.id)} className="p-1 text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5"/></button></td>
									</tr>
								)})}
							</tbody>
						</table>
					</div>
				</section>
			</div>
			{/* The right-side summary and actions can be implemented as needed */}
		</div>
	);
}
