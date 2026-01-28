import React, { useEffect, useMemo, useState, useCallback } from 'react';
import SearchableSelect from '../shared/SearchableSelect';
import { api } from '../../utils/api';
import { DEFAULT_STATES } from '../../utils/stateManager';

function toNum(value) {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

function todayISO() {
	return new Date().toISOString().split('T')[0];
}

export default function ReportsView({ groups, customers, vehicles, advanceStore = {}, onCancel }) {
	const [state, setState] = useState(DEFAULT_STATES.reports);
	
	const {
		fromDate,
		toDate,
		groupName,
		customerName,
		vehicle,
		commissionPct,
		rows
	} = state;
	
	// Functions to update individual state properties
	const setFromDate = useCallback((value) => {
		setState(prev => ({ ...prev, fromDate: value }));
	}, []);
	
	const setToDate = useCallback((value) => {
		setState(prev => ({ ...prev, toDate: value }));
	}, []);
	
	const setGroupName = useCallback((value) => {
		setState(prev => ({ ...prev, groupName: value }));
	}, []);
	
	const setCustomerName = useCallback((value) => {
		setState(prev => ({ ...prev, customerName: value }));
	}, []);
	
	const setVehicle = useCallback((value) => {
		setState(prev => ({ ...prev, vehicle: value }));
	}, []);
	
	const setCommissionPct = useCallback((value) => {
		setState(prev => ({ ...prev, commissionPct: value }));
	}, []);
	
	const setRows = useCallback((value) => {
		setState(prev => ({ ...prev, rows: value }));
	}, []);
	
	const setAutoLoad = useCallback((value) => {
		setState(prev => ({ ...prev, autoLoad: value }));
	}, []);

	const filteredCustomers = useMemo(() => {
		return customers.filter(c => !groupName || c.group === groupName);
	}, [customers, groupName]);

	const selectedCustomer = useMemo(() => {
		return customers.find(c => c.name === customerName) || null;
	}, [customers, customerName]);

	const remAdvance = useMemo(() => {
		const key = String(selectedCustomer?.name || '');
		return Number(advanceStore?.[key]?.balance || 0);
	}, [advanceStore, selectedCustomer?.name]);

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
		if (!stillValid) setCustomerName('');
	}, [filteredCustomers, customerName]);

	// autoLoad is now managed in our state system
	const autoLoad = state.autoLoad;

	// Note: autoLoad is now managed in state, but we need to maintain the original useEffect structure
	// We'll update the state version of autoLoad separately
	const [autoLoadLocal, setAutoLoadLocal] = useState(false);
	
	useEffect(() => {
		let cancelled = false;

		async function load() {
			if (!selectedCustomer?.id || !autoLoadLocal) {
				if (!autoLoadLocal) setRows([]);
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
	}, [selectedCustomer?.id, autoLoadLocal]);

	const handleSubmit = async () => {
		if (!selectedCustomer?.id) return;
		setAutoLoad(true);
		// Explicitly load data when submit is clicked
		try {
			const data = await api.listTransactions(selectedCustomer.id);
			setRows(Array.isArray(data) ? data : []);
		} catch {
			setRows([]);
		}
	};

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

	// Reset state when component unmounts or is cancelled
	useEffect(() => {
		return () => {
			// Reset to default state when component unmounts
			setState(DEFAULT_STATES.reports);
		};
	}, []);

	const handleCancel = () => {
		// Reset state before cancelling
		setState(DEFAULT_STATES.reports);
		onCancel && onCancel();
	};

	const handlePrint = async () => {
		if (!selectedCustomer?.id) {
			alert('Please select a customer first');
			return;
		}
		
		try {
			// Generate the ledger report from backend
			const response = await api.getLedgerReport(
				selectedCustomer.id,
				fromDate || todayISO(),
				toDate || todayISO(),
				commissionPct
			);
			
			// Create a new window/tab for printing
			const printWindow = window.open('', '_blank');
			printWindow.document.write(response);
			printWindow.document.close();
			
			// Trigger print after content loads
			printWindow.onload = () => {
				printWindow.print();
			};
			
		} catch (error) {
			console.error('Print error:', error);
			alert(`Print failed: ${error.message}`);
		}
	};

	return (
		<div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
			<div className="bg-slate-800 px-5 py-3 text-white shrink-0">
				<h2 className="text-base font-semibold tracking-wide">Reports</h2>
			</div>

			<div className="flex-1 flex overflow-hidden bg-slate-50">
				<div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
					<div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
						<div className="bg-slate-100 px-4 py-2 border-b text-slate-600 font-semibold text-xs">Filters</div>
						<div className="p-4">
							<div className="grid grid-cols-12 gap-4 items-end">
								<div className="col-span-2">
									<label className="text-xs font-medium text-slate-600 block mb-1.5">From Date</label>
									<input
										type="date"
										className="w-full border border-slate-300 rounded-sm px-3 text-sm font-medium bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-50 outline-none transition-colors"
										style={{ height: '36px' }}
										value={fromDate}
										onChange={e => setFromDate(e.target.value)}
									/>
								</div>

								<div className="col-span-2">
									<label className="text-xs font-medium text-slate-600 block mb-1.5">To Date</label>
									<input
										type="date"
										className="w-full border border-slate-300 rounded-sm px-3 text-sm font-medium bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-50 outline-none transition-colors"
										style={{ height: '36px' }}
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
									<label className="text-xs font-medium text-slate-600 block mb-1">Customer Name</label>
									<div className="flex items-end gap-1.5">
										<div className="flex-1">
											<SearchableSelect
												label={null}
												options={filteredCustomers.map(c => c.name)}
												value={customerName}
												onChange={setCustomerName}
												placeholder="Select customer"
											/>
										</div>
										<button type="button" className="w-8 border border-slate-300 bg-slate-100 font-semibold text-sm rounded-sm hover:bg-slate-200 transition-colors" style={{ height: '36px' }} onClick={goPrevCustomer} aria-label="Previous customer">{'<'}</button>
										<button type="button" className="w-8 border border-slate-300 bg-slate-100 font-semibold text-sm rounded-sm hover:bg-slate-200 transition-colors" style={{ height: '36px' }} onClick={goNextCustomer} aria-label="Next customer">{'>'}</button>
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
									<label className="text-xs font-medium text-slate-600 block mb-1">Address</label>
									<textarea
										className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 h-[40px] resize-none rounded-sm"
										readOnly
										value={String(selectedCustomer?.address || '')}
									/>
								</div>

								<div className="col-span-3">
									<label className="text-xs font-medium text-slate-600 block mb-1">Contact No</label>
									<input
										className="w-full border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600 rounded-sm"
										style={{ height: '36px' }}
										readOnly
										value={String(selectedCustomer?.contact || '')}
									/>
								</div>

								<div className="col-span-3">
									<label className="text-xs font-medium text-primary-600 block mb-1">Rem. Advance</label>
									<input
										className="w-full border border-primary-200 bg-primary-50 px-3 text-sm font-semibold text-primary-600 text-right rounded-sm"
										style={{ height: '36px' }}
										readOnly
										value={`₹ ${remAdvance.toFixed(2)}`}
									/>
								</div>
							</div>
						</div>
						<div className="flex justify-end p-4 bg-slate-50 border-t border-slate-200">
							<button
								type="button"
								className="px-6 bg-primary-600 text-white text-sm font-semibold rounded-sm hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
								style={{ height: '40px' }}
								onClick={handleSubmit}
								tabIndex="0"
							>
								Submit
							</button>
						</div>
					</div>

					<div className="flex-1 overflow-hidden p-3">
						<div className="h-full bg-white border border-slate-200 shadow-card rounded-sm overflow-hidden flex flex-col">
							<div className="flex-1 overflow-auto bg-white custom-table-scroll">
								<table className="w-full text-sm border-collapse relative">
									<thead className="sticky top-0 bg-emerald-700 text-white z-20 border-b-2 font-semibold uppercase text-xs shadow-md">
									<tr>
											<th className="px-3 py-3 border border-emerald-800 w-14 text-center">Sl.No</th>
											<th className="px-3 py-3 border border-emerald-800 w-24 text-center">Date</th>
											<th className="px-3 py-3 border border-emerald-800 w-28">Vehicle</th>
											<th className="px-3 py-3 border border-emerald-800 w-24">Item Code</th>
											<th className="px-3 py-3 border border-emerald-800">Item Name</th>
											<th className="px-3 py-3 border border-emerald-800 w-16 text-right">Qty</th>
											<th className="px-3 py-3 border border-emerald-800 w-16 text-right">Rate</th>
											<th className="px-3 py-3 border border-emerald-800 w-24 text-right">Total</th>
											<th className="px-3 py-3 border border-emerald-800 w-20 text-right">Luggage</th>
											<th className="px-3 py-3 border border-emerald-800 w-24 text-right">L. Amount</th>
											<th className="px-3 py-3 border border-emerald-800 w-16 text-right">Coolie</th>
											<th className="px-3 py-3 border border-emerald-800 w-24 text-right">Paid Amount</th>
											<th className="px-3 py-3 border border-emerald-800 w-36 text-left">Remarks</th>
									</tr>
								</thead>
								<tbody>
									{filteredRows.map((r, idx) => {
										const total = r.qty * r.rate;
										const lagAmt = r.qty * r.laguage;
										return (
											<tr key={r.id ?? `${r.date}-${idx}`} className="hover:bg-primary-50 border-b border-slate-100 group transition-colors">
												<td className="px-3 py-2.5 border-r border-slate-100 text-center text-slate-400 font-semibold">{idx + 1}</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-center text-slate-600">{String(r.date || '')}</td>
												<td className="px-3 py-2.5 border-r border-slate-100 font-semibold text-slate-700">{String(r.vehicle || '--')}</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-slate-600">{String(r.itemCode || '--')}</td>
												<td className="px-3 py-2.5 border-r border-slate-100 font-semibold text-slate-800">{String(r.itemName || '')}</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right font-bold">{r.qty}</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right font-mono">{String(r.rate)}</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right font-bold text-primary-600">{total.toLocaleString()}</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-500">{String(r.laguage)}</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right font-semibold text-blue-600">{lagAmt.toLocaleString()}</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-500">{r.coolie.toLocaleString()}</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right text-emerald-600 font-semibold">{r.paidAmt.toLocaleString()}</td>
												<td className="px-3 py-2.5 text-slate-500">{String(r.remarks || '--')}</td>
											</tr>
										);
									})}

										{emptyRows.map(i => (
											<tr key={`empty-${i}`} className="border-b border-slate-100">
												<td className="px-3 py-2.5 border-r border-slate-100 text-center text-slate-200">&nbsp;</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-center text-slate-200">&nbsp;</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-slate-200">&nbsp;</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-slate-200">&nbsp;</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-slate-200">&nbsp;</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-200">&nbsp;</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-200">&nbsp;</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-200">&nbsp;</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-200">&nbsp;</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-200">&nbsp;</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-200">&nbsp;</td>
												<td className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-200">&nbsp;</td>
												<td className="px-3 py-2.5 text-slate-200">&nbsp;</td>
											</tr>
										))}
								</tbody>
							</table>
							</div>
						</div>
					</div>
				</div>

				<aside className="w-[340px] bg-slate-800 flex flex-col p-5 shrink-0 shadow-2xl">
					<h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-5">Aggregate Summary</h3>
					<div className="space-y-4 flex-1 overflow-auto text-white scrollbar-thin">
						<div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-slate-400">Qty</label><input type="text" readOnly className="bg-slate-700/50 px-3 py-2.5 text-lg font-bold text-right rounded-sm border border-slate-600 outline-none" value={String(summary.qty)} /></div>
						<div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-slate-400">Coolie</label><input type="text" readOnly className="bg-slate-700/50 px-3 py-2.5 text-lg font-bold text-right rounded-sm border border-slate-600 outline-none" value={summary.coolie.toFixed(2)} /></div>
						<div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-slate-400">Luggage Total</label><input type="text" readOnly className="bg-slate-700/50 px-3 py-2.5 text-lg font-bold text-right rounded-sm border border-slate-600 outline-none" value={summary.luggageTotal.toFixed(2)} /></div>
						<div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/50 rounded border border-slate-700">
							<div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-primary-400">Commission %</label><input type="number" className="bg-slate-800 px-2 py-2 font-semibold text-right rounded-sm border border-slate-600 outline-none focus:border-primary-500" value={String(commissionPct)} onChange={e => setCommissionPct(e.target.value)} /></div>
							<div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-slate-500">Total Commission</label><input type="text" readOnly className="bg-slate-700/20 px-2 py-2 text-right text-slate-300 rounded-sm border border-slate-600 outline-none" value={summary.totalCommission.toFixed(2)} /></div>
						</div>
						<div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-slate-400">Total</label><input type="text" readOnly className="bg-slate-700/50 px-3 py-2.5 text-lg font-bold text-right text-emerald-400 rounded-sm border border-slate-600 outline-none" value={summary.total.toFixed(2)} /></div>
						<div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-slate-400">Amount Paid</label><input type="text" readOnly className="bg-slate-700/50 px-3 py-2.5 text-lg font-bold text-right rounded-sm border border-slate-600 outline-none" value={summary.paid.toFixed(2)} /></div>
						<div className="pt-5 border-t border-white/10 text-center"><p className="text-xs text-primary-400 font-semibold tracking-wider mb-2">Net Total</p><p className="text-3xl font-bold text-primary-500 tabular-nums drop-shadow-xl">₹ {summary.netTotal.toFixed(2)}</p></div>
					</div>
				</aside>
			</div>

			<div className="shrink-0 border-t border-slate-200 bg-white p-4 flex justify-end gap-3">
				<button
					type="button"
					className="px-6 bg-slate-800 text-white text-sm font-semibold rounded-sm hover:bg-slate-700 transition-colors"
					style={{ height: '40px' }}
					onClick={handlePrint}
				>
					Print
				</button>
				<button
					type="button"
					className="px-6 border border-slate-300 bg-white text-slate-700 text-sm font-semibold rounded-sm hover:bg-slate-50 transition-colors"
					style={{ height: '40px' }}
					onClick={onCancel}
				>
					Cancel
				</button>
			</div>
		</div>
	);
}
