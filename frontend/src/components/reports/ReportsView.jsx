import React, { useEffect, useMemo, useState } from 'react';
import SearchableSelect from '../shared/SearchableSelect';
import { api } from '../../utils/api';

function toNum(value) {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

function todayISO() {
	return new Date().toISOString().split('T')[0];
}

export default function ReportsView({ groups, customers, vehicles, onCancel }) {
	const [fromDate, setFromDate] = useState(todayISO());
	const [toDate, setToDate] = useState(todayISO());
	const [groupName, setGroupName] = useState('');
	const [customerName, setCustomerName] = useState('');
	const [vehicle, setVehicle] = useState('');
	const [commissionPct, setCommissionPct] = useState(0);

	const [rows, setRows] = useState([]);

	const filteredCustomers = useMemo(() => {
		return customers.filter(c => !groupName || c.group === groupName);
	}, [customers, groupName]);

	const selectedCustomer = useMemo(() => {
		return customers.find(c => c.name === customerName) || null;
	}, [customers, customerName]);

	const customerIndex = useMemo(() => {
		if (!customerName) return -1;
		return filteredCustomers.findIndex(c => c.name === customerName);
	}, [filteredCustomers, customerName]);

	useEffect(() => {
		if (filteredCustomers.length === 0) {
			if (customerName) setCustomerName('');
			return;
		}
		const stillValid = filteredCustomers.some(c => c.name === customerName);
		if (!stillValid) setCustomerName(filteredCustomers[0].name);
	}, [filteredCustomers, customerName]);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			if (!selectedCustomer?.id) {
				setRows([]);
				return;
			}
			try {
				const data = await api.listTransactions(selectedCustomer.id);
				if (!cancelled) setRows(Array.isArray(data) ? data : []);
			} catch {
				if (!cancelled) setRows([]);
			}
		}

		load();
		return () => {
			cancelled = true;
		};
	}, [selectedCustomer?.id]);

	const filteredRows = useMemo(() => {
		const f = String(fromDate || '').trim();
		const t = String(toDate || '').trim();
		const hasFrom = Boolean(f);
		const hasTo = Boolean(t);
		return rows
			.filter(r => {
				const d = String(r.date || '').trim();
				if (hasFrom && d && d < f) return false;
				if (hasTo && d && d > t) return false;
				if (vehicle && String(r.vehicle || '') !== vehicle) return false;
				return true;
			})
			.map(r => ({
				...r,
				qty: toNum(r.qty),
				rate: toNum(r.rate),
				laguage: toNum(r.laguage),
				coolie: toNum(r.coolie),
				paidAmt: toNum(r.paidAmt),
			}));
	}, [rows, fromDate, toDate, vehicle]);

	const summary = useMemo(() => {
		const qty = filteredRows.reduce((acc, r) => acc + r.qty, 0);
		const total = filteredRows.reduce((acc, r) => acc + (r.qty * r.rate), 0);
		const luggageTotal = filteredRows.reduce((acc, r) => acc + (r.qty * r.laguage), 0);
		const coolie = filteredRows.reduce((acc, r) => acc + r.coolie, 0);
		const paid = filteredRows.reduce((acc, r) => acc + r.paidAmt, 0);
		const totalCommission = (total * toNum(commissionPct)) / 100;
		const netTotal = total - totalCommission - luggageTotal - coolie;
		return { qty, total, luggageTotal, coolie, paid, totalCommission, netTotal };
	}, [filteredRows, commissionPct]);

	const emptyRowCount = Math.max(0, 18 - filteredRows.length);
	const emptyRows = useMemo(() => Array.from({ length: emptyRowCount }, (_, i) => i), [emptyRowCount]);

	const goPrevCustomer = () => {
		if (filteredCustomers.length === 0) return;
		const idx = customerIndex >= 0 ? customerIndex : 0;
		const nextIdx = (idx - 1 + filteredCustomers.length) % filteredCustomers.length;
		setCustomerName(filteredCustomers[nextIdx].name);
	};

	const goNextCustomer = () => {
		if (filteredCustomers.length === 0) return;
		const idx = customerIndex >= 0 ? customerIndex : 0;
		const nextIdx = (idx + 1) % filteredCustomers.length;
		setCustomerName(filteredCustomers[nextIdx].name);
	};

	return (
		<div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
			<div className="bg-slate-800 px-4 py-2 text-white shrink-0">
				<h2 className="text-[12px] font-black uppercase tracking-widest">Reports</h2>
			</div>

			<div className="flex-1 flex overflow-hidden bg-[#f1f3f5]">
				<div className="flex-1 flex flex-col overflow-hidden border-r border-slate-300">
					<div className="bg-white border-b border-slate-300 shadow-sm shrink-0">
						<div className="bg-slate-100 px-4 py-1 border-b text-slate-700 font-black text-[9px] uppercase">Filters</div>
						<div className="p-3">
							<div className="grid grid-cols-12 gap-3 items-end">
								<div className="col-span-2">
									<label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">From Date</label>
									<input
										type="date"
										className="w-full border border-slate-400 h-[28px] px-2 text-[11px] font-bold bg-white"
										value={fromDate}
										onChange={e => setFromDate(e.target.value)}
									/>
								</div>

								<div className="col-span-2">
									<label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">To Date</label>
									<input
										type="date"
										className="w-full border border-slate-400 h-[28px] px-2 text-[11px] font-bold bg-white"
										value={toDate}
										onChange={e => setToDate(e.target.value)}
									/>
								</div>

								<div className="col-span-3">
									<SearchableSelect
										label="Group Name"
										options={groups.map(g => g.name)}
										value={groupName}
										onChange={setGroupName}
										placeholder="Select group"
									/>
								</div>

								<div className="col-span-3">
									<label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">Customer Name</label>
									<div className="flex items-end gap-1">
										<div className="flex-1">
											<SearchableSelect
												label={null}
												options={filteredCustomers.map(c => c.name)}
												value={customerName}
												onChange={setCustomerName}
												placeholder="Select customer"
											/>
										</div>
										<button type="button" className="w-7 h-[28px] border border-slate-400 bg-slate-100 font-black text-[12px]" onClick={goPrevCustomer} aria-label="Previous customer">{'<'}</button>
										<button type="button" className="w-7 h-[28px] border border-slate-400 bg-slate-100 font-black text-[12px]" onClick={goNextCustomer} aria-label="Next customer">{'>'}</button>
									</div>
								</div>

								<div className="col-span-2">
									<SearchableSelect
										label="Vehicle"
										options={vehicles.map(v => v.name)}
										value={vehicle}
										onChange={setVehicle}
										placeholder="(Opt)"
									/>
								</div>

								<div className="col-span-9">
									<label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">Address</label>
									<textarea
										className="w-full border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 h-[36px] resize-none"
										readOnly
										value={String(selectedCustomer?.address || '')}
									/>
								</div>

								<div className="col-span-3">
									<label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">Contact No</label>
									<input
										className="w-full border border-slate-300 bg-slate-50 h-[28px] px-2 text-[11px] font-bold text-slate-600"
										readOnly
										value={String(selectedCustomer?.contact || '')}
									/>
								</div>
							</div>
						</div>
					</div>

					<div className="flex-1 overflow-hidden p-2">
						<div className="h-full bg-white border border-slate-400 shadow-sm overflow-hidden flex flex-col">
							<div className="flex-1 overflow-auto bg-white custom-table-scroll">
								<table className="w-full text-[11px] border-collapse relative">
									<thead className="sticky top-0 bg-[#15803d] text-white z-20 border-b-2 font-black uppercase text-[8px] shadow-sm">
									<tr>
											<th className="p-2 border border-green-800 w-12 text-center">Sl.No</th>
											<th className="p-2 border border-green-800 w-24 text-center">Date</th>
											<th className="p-2 border border-green-800 w-28">Vehicle</th>
											<th className="p-2 border border-green-800 w-24">Item Code</th>
											<th className="p-2 border border-green-800">Item Name</th>
											<th className="p-2 border border-green-800 w-16 text-right">Qty</th>
											<th className="p-2 border border-green-800 w-16 text-right">Rate</th>
											<th className="p-2 border border-green-800 w-24 text-right">Total</th>
											<th className="p-2 border border-green-800 w-16 text-right">Luggage</th>
											<th className="p-2 border border-green-800 w-24 text-right">L. Amount</th>
											<th className="p-2 border border-green-800 w-16 text-right">Coolie</th>
											<th className="p-2 border border-green-800 w-24 text-right">Paid Amount</th>
											<th className="p-2 border border-green-800 w-36 text-left">Remarks</th>
									</tr>
								</thead>
								<tbody>
									{filteredRows.map((r, idx) => {
										const total = r.qty * r.rate;
										const lagAmt = r.qty * r.laguage;
										return (
											<tr key={r.id ?? `${r.date}-${idx}`} className="hover:bg-rose-50 border-b group transition-colors">
												<td className="p-2 border-r text-center text-slate-400 font-bold">{idx + 1}</td>
												<td className="p-2 border-r text-center text-slate-600">{String(r.date || '')}</td>
												<td className="p-2 border-r font-bold text-slate-700">{String(r.vehicle || '--')}</td>
												<td className="p-2 border-r text-slate-500">{String(r.itemCode || '--')}</td>
												<td className="p-2 border-r font-bold text-slate-800">{String(r.itemName || '')}</td>
												<td className="p-2 border-r text-right font-black">{r.qty}</td>
												<td className="p-2 border-r text-right font-mono">{String(r.rate)}</td>
												<td className="p-2 border-r text-right font-black text-rose-600">{total.toLocaleString()}</td>
												<td className="p-2 border-r text-right text-slate-500 italic">{String(r.laguage)}</td>
												<td className="p-2 border-r text-right font-bold text-blue-600">{lagAmt.toLocaleString()}</td>
												<td className="p-2 border-r text-right text-slate-500 italic">{r.coolie.toLocaleString()}</td>
												<td className="p-2 border-r text-right text-emerald-600 font-bold">{r.paidAmt.toLocaleString()}</td>
												<td className="p-2 italic text-slate-400">{String(r.remarks || '--')}</td>
											</tr>
										);
									})}

										{emptyRows.map(i => (
											<tr key={`empty-${i}`} className="border-b">
												<td className="p-2 border-r text-center text-slate-300">&nbsp;</td>
												<td className="p-2 border-r text-center text-slate-300">&nbsp;</td>
												<td className="p-2 border-r text-slate-300">&nbsp;</td>
												<td className="p-2 border-r text-slate-300">&nbsp;</td>
												<td className="p-2 border-r text-slate-300">&nbsp;</td>
												<td className="p-2 border-r text-right text-slate-300">&nbsp;</td>
												<td className="p-2 border-r text-right text-slate-300">&nbsp;</td>
												<td className="p-2 border-r text-right text-slate-300">&nbsp;</td>
												<td className="p-2 border-r text-right text-slate-300">&nbsp;</td>
												<td className="p-2 border-r text-right text-slate-300">&nbsp;</td>
												<td className="p-2 border-r text-right text-slate-300">&nbsp;</td>
												<td className="p-2 border-r text-right text-slate-300">&nbsp;</td>
												<td className="p-2 text-slate-300">&nbsp;</td>
											</tr>
										))}
								</tbody>
							</table>
							</div>
						</div>
					</div>
				</div>

				<aside className="w-[320px] bg-slate-800 flex flex-col p-4 shrink-0 shadow-2xl">
					<h3 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4">AGGREGATE SUMMARY</h3>
					<div className="space-y-3 flex-1 overflow-auto text-white scrollbar-thin">
						<div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Qty</label><input type="text" readOnly className="bg-slate-700/50 p-2 text-lg font-black text-right border-slate-600 outline-none" value={String(summary.qty)} /></div>
						<div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Coolie</label><input type="text" readOnly className="bg-slate-700/50 p-2 text-lg font-black text-right border-slate-600 outline-none" value={summary.coolie.toFixed(2)} /></div>
						<div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Luggage Total</label><input type="text" readOnly className="bg-slate-700/50 p-2 text-lg font-black text-right border-slate-600 outline-none" value={summary.luggageTotal.toFixed(2)} /></div>
						<div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/50 border border-slate-700">
							<div className="flex flex-col gap-1"><label className="text-[8px] text-rose-400 uppercase font-black">Commission %</label><input type="number" className="bg-slate-800 p-1 font-black text-right outline-none focus:border-rose-500" value={String(commissionPct)} onChange={e => setCommissionPct(e.target.value)} /></div>
							<div className="flex flex-col gap-1"><label className="text-[8px] text-slate-500 uppercase font-black">Total Commission</label><input type="text" readOnly className="bg-slate-700/20 p-1 text-right text-slate-300 outline-none" value={summary.totalCommission.toFixed(2)} /></div>
						</div>
						<div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Total</label><input type="text" readOnly className="bg-slate-700/50 p-2 text-lg font-black text-right text-emerald-400 border-slate-600 outline-none" value={summary.total.toFixed(2)} /></div>
						<div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Amount Paid</label><input type="text" readOnly className="bg-slate-700/50 p-2 text-lg font-black text-right border-slate-600 outline-none" value={summary.paid.toFixed(2)} /></div>
						<div className="pt-4 border-t border-white/10 text-center"><p className="text-[9px] text-rose-400 uppercase font-black tracking-widest">Net Total</p><p className="text-3xl font-black text-rose-500 tabular-nums drop-shadow-xl">₹ {summary.netTotal.toFixed(2)}</p></div>
					</div>
				</aside>
			</div>

			<div className="shrink-0 border-t border-slate-300 bg-white p-3 flex justify-end gap-3">
				<button
					type="button"
					className="px-6 h-9 border border-slate-400 bg-slate-800 text-white text-[11px] font-black uppercase"
					onClick={() => window.print()}
				>
					Print
				</button>
				<button
					type="button"
					className="px-6 h-9 border border-slate-400 bg-white text-slate-800 text-[11px] font-black uppercase"
					onClick={onCancel}
				>
					Cancel
				</button>
			</div>
		</div>
	);
}
