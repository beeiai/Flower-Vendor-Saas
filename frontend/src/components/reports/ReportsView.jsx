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
			
			// Handle DOCX file download
			const blob = response.data;
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `ledger_report_${selectedCustomer.name}_${new Date().toISOString().slice(0, 10)}.docx`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
			
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
					<div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 shadow-sm shrink-0 rounded-t-lg">
						<div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-4 py-3 border-b-0 text-white font-semibold text-sm flex items-center gap-2 rounded-t-lg">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
								<path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
							</svg>
							Filters
						</div>
						<div className="p-4">
							<div className="space-y-4">
								{/* First Line - Date and Group Filters */}
								<div className="grid grid-cols-12 gap-4 items-end">
									<div className="col-span-3">
										<label className="text-xs font-medium text-slate-600 block mb-1.5">From Date</label>
										<input
											type="date"
											className="w-full border border-rose-200 rounded-lg px-3 text-sm font-medium bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all shadow-sm hover:shadow-md"
											style={{ height: '40px' }}
											value={fromDate}
											onChange={e => setFromDate(e.target.value)}
											data-enter-index="1"
										/>
									</div>

									<div className="col-span-3">
										<label className="text-xs font-medium text-slate-600 block mb-1.5">To Date</label>
										<input
											type="date"
											className="w-full border border-rose-200 rounded-lg px-3 text-sm font-medium bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all shadow-sm hover:shadow-md"
											style={{ height: '36px' }}
											value={toDate}
											onChange={e => setToDate(e.target.value)}
											data-enter-index="2"
										/>
									</div>

									<div className="col-span-4">
										<div className="relative">
											<SearchableSelect
												label="Group Name"
												options={groups.map(g => g.name)}
												value={groupName}
												onChange={setGroupName}
												placeholder="Select group"
												data-enter-index="3"
												className="focus:border-rose-500 focus:ring-rose-500/20 rounded-lg shadow-sm hover:shadow-md transition-all border-rose-200"
											/>
											<div className="absolute right-3 top-8 text-rose-400">
												<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
												</svg>
											</div>
										</div>
									</div>

									<div className="col-span-2">
										<div className="relative">
											<SearchableSelect
												label="Vehicle"
												options={vehicles.map(v => v.name)}
												value={vehicle}
												onChange={setVehicle}
												placeholder="(Opt)"
												data-enter-index="7"
												className="focus:border-rose-500 focus:ring-rose-500/20 rounded-lg shadow-sm hover:shadow-md transition-all border-rose-200"
											/>
											<div className="absolute right-3 top-8 text-rose-400">
												<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
												</svg>
											</div>
										</div>
									</div>
								</div>

								{/* Second Line - Customer and Info Filters */}
								<div className="grid grid-cols-12 gap-4 items-end">
									<div className="col-span-4">
										<label className="text-xs font-medium text-slate-600 block mb-1">Customer Name</label>
										<div className="flex items-end gap-1.5">
											<div className="flex-1">
												<SearchableSelect
													label={null}
													options={filteredCustomers.map(c => c.name)}
													value={customerName}
													onChange={setCustomerName}
													placeholder="Select customer"
													data-enter-index="4"
													className="focus:border-rose-500 focus:ring-rose-500/20 rounded-lg shadow-sm hover:shadow-md transition-all border-rose-200"
												/>
											</div>
											<button type="button" className="w-8 border border-slate-300 bg-slate-100 font-semibold text-sm rounded-sm hover:bg-slate-200 transition-colors" style={{ height: '36px' }} onClick={goPrevCustomer} aria-label="Previous customer" data-enter-index="5">{'<'}</button>
											<button type="button" className="w-8 border border-slate-300 bg-slate-100 font-semibold text-sm rounded-sm hover:bg-slate-200 transition-colors" style={{ height: '36px' }} onClick={goNextCustomer} aria-label="Next customer" data-enter-index="6">{'>'}</button>
										</div>
									</div>

									<div className="col-span-3">
										<label className="text-xs font-medium text-slate-600 block mb-1">Address</label>
										<textarea
											className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 h-[40px] resize-none rounded-sm"
											readOnly
											value={String(selectedCustomer?.address || '')}
										/>
									</div>

									<div className="col-span-2">
										<label className="text-xs font-medium text-slate-600 block mb-1">Contact No</label>
										<input
											className="w-full border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600 rounded-sm"
											style={{ height: '36px' }}
											readOnly
											value={String(selectedCustomer?.contact || '')}
										/>
									</div>

									<div className="col-span-2">
										<label className="text-xs font-medium text-primary-600 block mb-1">Rem. Advance</label>
										<input
											className="w-full border border-primary-200 bg-primary-50 px-3 text-sm font-semibold text-primary-600 text-right rounded-sm"
											style={{ height: '36px' }}
											readOnly
											value={`₹ ${remAdvance.toFixed(2)}`}
										/>
									</div>

									<div className="col-span-1 flex items-end">
										<button
											type="button"
											className="w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white text-sm font-bold rounded-lg hover:from-rose-600 hover:to-rose-700 transition-all shadow-md hover:shadow-lg"
											style={{ height: '36px' }}
											onClick={handleSubmit}
											tabIndex="0"
											data-enter-index="8"
										>
											Submit
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="flex-1 overflow-hidden p-3">
						<div className="h-full bg-white border border-slate-200 shadow-card rounded-sm overflow-hidden flex flex-col">
							<div className="flex-1 overflow-auto bg-white custom-table-scroll">
								<table className="w-full text-sm border-collapse relative">
									<thead className="sticky top-0 bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white z-20 border-b-2 font-semibold uppercase text-xs shadow-lg rounded-t-lg">
									<tr>
											<th className="px-3 py-3.5 border-r border-l-0 border-t-0 border-b border-white/20 w-14 text-center font-bold tracking-wider">Sl.No</th>
											<th className="px-3 py-3.5 border-r border-l-0 border-t-0 border-b border-white/20 w-24 text-center font-bold tracking-wider">Date</th>
											<th className="px-3 py-3.5 border-r border-l-0 border-t-0 border-b border-white/20 w-28 font-bold tracking-wider">Vehicle</th>
											<th className="px-3 py-3.5 border-r border-l-0 border-t-0 border-b border-white/20 w-24 font-bold tracking-wider">Item Code</th>
											<th className="px-3 py-3.5 border-r border-l-0 border-t-0 border-b border-white/20 font-bold tracking-wider">Item Name</th>
											<th className="px-3 py-3.5 border-r border-l-0 border-t-0 border-b border-white/20 w-16 text-right font-bold tracking-wider">Qty</th>
											<th className="px-3 py-3.5 border-r border-l-0 border-t-0 border-b border-white/20 w-16 text-right font-bold tracking-wider">Rate</th>
											<th className="px-3 py-3.5 border-r border-l-0 border-t-0 border-b border-white/20 w-24 text-right font-bold tracking-wider">Total</th>
											<th className="px-3 py-3.5 border-r border-l-0 border-t-0 border-b border-white/20 w-20 text-right font-bold tracking-wider">Luggage</th>
											<th className="px-3 py-3.5 border-r border-l-0 border-t-0 border-b border-white/20 w-24 text-right font-bold tracking-wider">L. Amount</th>
											<th className="px-3 py-3.5 border-r border-l-0 border-t-0 border-b border-white/20 w-16 text-right font-bold tracking-wider">Coolie</th>
											<th className="px-3 py-3.5 border-r border-l-0 border-t-0 border-b border-white/20 w-24 text-right font-bold tracking-wider">Paid Amount</th>
											<th className="px-3 py-3.5 border-r-0 border-l-0 border-t-0 border-b border-white/20 w-36 text-left font-bold tracking-wider">Remarks</th>
									</tr>
								</thead>
								<tbody>
									{filteredRows.map((r, idx) => {
										const total = r.qty * r.rate;
										const lagAmt = r.qty * r.laguage;
										return (
											<tr key={r.id ?? `${r.date}-${idx}`} className="hover:bg-gradient-to-r hover:from-[#5B55E6]/5 hover:to-[#4A44D0]/5 border-b border-slate-200 group transition-all duration-200">
												<td className="px-3 py-3 border-r border-slate-200 text-center text-slate-500 font-semibold">{idx + 1}</td>
												<td className="px-3 py-3 border-r border-slate-200 text-center text-slate-700 font-medium">{String(r.date || '')}</td>
												<td className="px-3 py-3 border-r border-slate-200 font-semibold text-slate-800">{String(r.vehicle || '--')}</td>
												<td className="px-3 py-3 border-r border-slate-200 text-slate-600">{String(r.itemCode || '--')}</td>
												<td className="px-3 py-3 border-r border-slate-200 font-semibold text-slate-900">{String(r.itemName || '')}</td>
												<td className="px-3 py-3 border-r border-slate-200 text-right font-bold text-[#5B55E6]">{r.qty}</td>
												<td className="px-3 py-3 border-r border-slate-200 text-right font-mono text-slate-700">{String(r.rate)}</td>
												<td className="px-3 py-3 border-r border-slate-200 text-right font-bold text-green-600">{total.toLocaleString()}</td>
												<td className="px-3 py-3 border-r border-slate-200 text-right text-slate-500">{String(r.laguage)}</td>
												<td className="px-3 py-3 border-r border-slate-200 text-right font-semibold text-blue-600">{lagAmt.toLocaleString()}</td>
												<td className="px-3 py-3 border-r border-slate-200 text-right text-slate-500">{r.coolie.toLocaleString()}</td>
												<td className="px-3 py-3 border-r border-slate-200 text-right font-semibold text-emerald-600">{r.paidAmt.toLocaleString()}</td>
												<td className="px-3 py-3 text-slate-500">{String(r.remarks || '--')}</td>
											</tr>
										);
									})}

										{emptyRows.map(i => (
											<tr key={`empty-${i}`} className="border-b border-slate-100 bg-slate-50">
												<td className="px-3 py-3 border-r border-slate-100 text-center text-slate-300">&nbsp;</td>
												<td className="px-3 py-3 border-r border-slate-100 text-center text-slate-300">&nbsp;</td>
												<td className="px-3 py-3 border-r border-slate-100 text-slate-300">&nbsp;</td>
												<td className="px-3 py-3 border-r border-slate-100 text-slate-300">&nbsp;</td>
												<td className="px-3 py-3 border-r border-slate-100 text-slate-300">&nbsp;</td>
												<td className="px-3 py-3 border-r border-slate-100 text-right text-slate-300">&nbsp;</td>
												<td className="px-3 py-3 border-r border-slate-100 text-right text-slate-300">&nbsp;</td>
												<td className="px-3 py-3 border-r border-slate-100 text-right text-slate-300">&nbsp;</td>
												<td className="px-3 py-3 border-r border-slate-100 text-right text-slate-300">&nbsp;</td>
												<td className="px-3 py-3 border-r border-slate-100 text-right text-slate-300">&nbsp;</td>
												<td className="px-3 py-3 border-r border-slate-100 text-right text-slate-300">&nbsp;</td>
												<td className="px-3 py-3 border-r border-slate-100 text-right text-slate-300">&nbsp;</td>
												<td className="px-3 py-3 text-slate-300">&nbsp;</td>
											</tr>
										))}
								</tbody>
							</table>
							</div>
						</div>
					</div>
				</div>

				<aside className="w-[340px] bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col p-4 shrink-0 shadow-2xl rounded-r-lg border-l-2 border-[#5B55E6]/30">
					<div className="flex items-center gap-2 mb-6">
						<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B55E6] to-[#4A44D0] flex items-center justify-center shadow-lg">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</div>
						<h3 className="text-sm font-bold text-white uppercase tracking-wider">Financial Summary</h3>
					</div>
					<div className="space-y-2 flex-1 text-white pb-2">
						<div className="bg-slate-700/30 backdrop-blur-sm rounded-xl p-3 border border-slate-600/50 shadow-lg">
							<label className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 block">Total Quantity</label>
							<input type="text" readOnly className="w-full bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-2 text-xl font-black text-right rounded-lg border border-slate-600/50 outline-none text-cyan-400 shadow-inner" value={String(summary.qty)} style={{ colorScheme: 'dark' }} />
						</div>
						
						<div className="bg-slate-700/30 backdrop-blur-sm rounded-xl p-3 border border-slate-600/50 shadow-lg">
							<label className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 block">Handling Charges</label>
							<input type="text" readOnly className="w-full bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-2 text-lg font-bold text-right rounded-lg border border-slate-600/50 outline-none text-amber-400 shadow-inner" value={summary.coolie.toFixed(2)} style={{ colorScheme: 'dark' }} />
						</div>
						
						<div className="bg-slate-700/30 backdrop-blur-sm rounded-xl p-3 border border-slate-600/50 shadow-lg">
							<label className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 block">Luggage Costs</label>
							<input type="text" readOnly className="w-full bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-2 text-lg font-bold text-right rounded-lg border border-slate-600/50 outline-none text-rose-400 shadow-inner" value={summary.luggageTotal.toFixed(2)} style={{ colorScheme: 'dark' }} />
						</div>
						<div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl p-4 border border-[#5B55E6]/30 shadow-lg">
							<h4 className="text-xs font-bold text-[#5B55E6] uppercase tracking-widest mb-3 flex items-center gap-2">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Commission Details
							</h4>
							<div className="grid grid-cols-2 gap-3">
								<div className="flex flex-col gap-1.5">
									<label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Commission %</label>
									<input type="number" className="bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-2.5 font-bold text-right rounded-lg border border-slate-600/50 outline-none focus:border-[#5B55E6] focus:ring-2 focus:ring-[#5B55E6]/20 text-white shadow-inner" value={String(commissionPct)} onChange={e => setCommissionPct(e.target.value)} style={{ colorScheme: 'dark' }} />
								</div>
								<div className="flex flex-col gap-1.5">
									<label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Total Commission</label>
									<input type="text" readOnly className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 px-3 py-2.5 text-right rounded-lg border border-slate-600/30 outline-none text-rose-400 font-bold shadow-inner" value={summary.totalCommission.toFixed(2)} style={{ colorScheme: 'dark' }} />
								</div>
							</div>
						</div>
						<div className="bg-slate-700/30 backdrop-blur-sm rounded-xl p-3 border border-slate-600/50 shadow-lg">
							<label className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 block">Gross Total</label>
							<input type="text" readOnly className="w-full bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-2 text-xl font-black text-right rounded-lg border border-slate-600/50 outline-none text-emerald-400 shadow-inner" value={summary.total.toFixed(2)} style={{ colorScheme: 'dark' }} />
						</div>
						
						<div className="bg-slate-700/30 backdrop-blur-sm rounded-xl p-3 border border-slate-600/50 shadow-lg">
							<label className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 block">Amount Paid</label>
							<input type="text" readOnly className="w-full bg-gradient-to-r from-slate-800 to-slate-700 px-3 py-2 text-lg font-bold text-right rounded-lg border border-slate-600/50 outline-none text-green-400 shadow-inner" value={summary.paid.toFixed(2)} style={{ colorScheme: 'dark' }} />
						</div>
						<div className="mt-4 pt-4 border-t border-white/20 text-center">
							<div className="inline-flex items-center gap-2 mb-3 px-4 py-2 bg-gradient-to-r from-[#5B55E6]/20 to-[#4A44D0]/20 rounded-full border border-[#5B55E6]/30">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#5B55E6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<p className="text-xs font-bold text-[#5B55E6] uppercase tracking-widest">Final Amount</p>
							</div>
							<div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] p-5 rounded-2xl shadow-2xl border border-white/10">
								<p className="text-4xl font-black text-white tabular-nums drop-shadow-2xl">₹ {summary.netTotal.toFixed(2)}</p>
							</div>
						</div>
					</div>
				</aside>
			</div>

			<div className="shrink-0 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 flex justify-end gap-4">
				<button
					type="button"
					className="px-6 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-bold rounded-lg hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
					style={{ height: '44px' }}
					onClick={handlePrint}
					data-enter-index="9"
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
					</svg>
					Print Report
				</button>
				<button
					type="button"
					className="px-6 border-2 border-rose-300 bg-white text-rose-700 text-sm font-bold rounded-lg hover:bg-rose-50 hover:border-rose-400 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
					style={{ height: '44px' }}
					onClick={onCancel}
					data-enter-index="10"
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
					Cancel
				</button>
			</div>
		</div>
	);
}
