import React, { useRef, useEffect } from 'react';
import { Users, UserPlus, PackagePlus, Database } from 'lucide-react';
import SearchableSelect from '../shared/SearchableSelect';

export default function DailyTransactionsView({ 
  customerInfo, 
  setCustomerInfo, 
  groups, 
  customers, 
  catalog, 
  vehicles, 
  onOpenQuickAdd, 
  currentEntry, 
  setCurrentEntry, 
  items, 
  onAddItem, 
  onRemoveItem, 
  onEditItem, 
  summary, 
  onSaveRecord, 
  onViewReport, 
  advanceStore, 
  commissionPct, 
  setCommissionPct, 
  groupRef, 
  totalPaidAmount 
}) {
  const vRef = useRef(null); 
  const cRef = useRef(null); // Customer ref
  const icRef = useRef(null); // Item Code ref
  const nRef = useRef(null); 
  const qRef = useRef(null); 
  const rRef = useRef(null); 
  const lRef = useRef(null); 
  const coRef = useRef(null); 
  const pRef = useRef(null); 
  const remRef = useRef(null);
  
  const filteredCustomers = customers.filter(c => !customerInfo.groupName || c.group === customerInfo.groupName);
  const remAdvance = advanceStore[customerInfo.customerName]?.balance || 0;
  
  // Debug logging
  useEffect(() => {
    console.log('DailyTransactionsView data:', {
      groups: groups.length,
      customers: customers.length,
      catalog: catalog.length,
      vehicles: vehicles.length,
      filteredCustomers: filteredCustomers.length
    });
  }, [groups, customers, catalog, vehicles, filteredCustomers]);
  
  const handleCustomerSelect = (name) => { 
    const c = customers.find(x => x.name === name); 
    if (c) setCustomerInfo({ customerName: name, groupName: c.group, contactNo: c.contact, address: c.address }); 
    else setCustomerInfo({ ...customerInfo, customerName: name }); 
  };
  
  // Enter key handling is managed by SearchableSelect components
  
  // Keyboard navigation is handled directly in SearchableSelect components

  return (
    <div className="flex-1 flex flex-row gap-3 h-full p-3 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        <section className="bg-white border border-slate-200 p-4 shadow-lg rounded-xl shrink-0">
          <div className="flex items-center gap-2 mb-3 text-[#5B55E6] font-bold text-xs uppercase border-b border-slate-100 pb-2">
            <Users className="w-4 h-4" /> Trading Client Data
          </div>
          <div className="grid grid-cols-5 gap-4">
            <div className="relative">
              <SearchableSelect 
                inputRef={groupRef} 
                label="Group Category" 
                options={groups.map(g => g.name)} 
                value={customerInfo.groupName} 
                onChange={(val) => setCustomerInfo({...customerInfo, groupName: val, customerName: ''})} 
                onSelectionComplete={() => setTimeout(() => cRef.current?.focus(), 0)}
                placeholder="Filter Group" 
                className="focus:border-rose-500 focus:ring-rose-500/20 rounded-lg shadow-sm hover:shadow-md transition-all border-rose-200 w-full"
              />
              <div className="absolute right-3 top-8 text-rose-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="flex gap-1.5 items-end overflow-visible">
              <div className="relative flex-1">
                <SearchableSelect 
                  inputRef={cRef}
                  label="Party/Customer" 
                  options={filteredCustomers.map(c => c.name)} 
                  value={customerInfo.customerName} 
                  onChange={handleCustomerSelect} 
                  onSelectionComplete={() => setTimeout(() => vRef.current?.focus(), 0)}
                  placeholder="Search Party" 
                  className="focus:border-rose-500 focus:ring-rose-500/20 rounded-lg shadow-sm hover:shadow-md transition-all border-rose-200 w-full"
                />
                <div className="absolute right-3 top-8 text-rose-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <button 
                onClick={() => onOpenQuickAdd('customer')} 
                className="p-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg hover:from-rose-600 hover:to-rose-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center" 
                style={{height: '36px', width: '36px'}}
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Address</label>
              <input 
                type="text" 
                readOnly 
                className="w-full bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 cursor-not-allowed shadow-sm" 
                style={{height: '36px'}} 
                value={String(customerInfo.address || '--')} 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Phone</label>
              <input 
                type="text" 
                readOnly 
                className="w-full bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 cursor-not-allowed shadow-sm" 
                style={{height: '36px'}} 
                value={String(customerInfo.contactNo || '--')} 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-accent-600 uppercase tracking-wide block mb-1">Rem. Advance</label>
              <input 
                type="text" 
                readOnly 
                className="w-full bg-gradient-to-r from-rose-50 to-rose-100 border border-rose-200 text-rose-600 px-3 py-2 text-sm font-bold rounded-lg cursor-not-allowed shadow-sm" 
                style={{height: '36px'}} 
                value={`₹ ${remAdvance.toFixed(2)}`} 
              />
            </div>
          </div>
        </section>
        
        <section className="bg-white border border-slate-200 shadow-lg rounded-xl flex flex-col relative z-30 shrink-0 overflow-visible">
          <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-4 py-2.5 border-b border-[#4A44D0] text-white font-bold text-xs uppercase flex items-center gap-2 tracking-wider rounded-t-xl">
            <Database className="w-4 h-4 text-slate-400" /> Data Entry Row
          </div>
          <div className="p-3 border-b border-slate-100 bg-white overflow-x-auto rounded-b-xl">
            <form>
              <div className="flex items-end gap-3 min-w-[1100px] p-2 bg-slate-50 rounded-lg">
                <div className="w-[95px]">
                  <label className="text-xs font-semibold text-slate-600 uppercase text-center block mb-1">Date</label>
                  <input 
                    type="date" 
                    className="w-full text-sm border border-rose-200 rounded-lg px-3 py-2 font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all" 
                    style={{height: '36px'}} 
                    value={currentEntry.date} 
                    onChange={e => setCurrentEntry({...currentEntry, date: e.target.value})} 
                  />
                </div>
                <div className="w-[120px]">
                  <div className="relative">
                    <SearchableSelect 
                      inputRef={vRef} 
                      label="Vehicle" 
                      options={vehicles.map(v => v.name)} 
                      value={currentEntry.vehicle} 
                      onChange={(v) => setCurrentEntry({...currentEntry, vehicle: v})} 
                      onSelectionComplete={() => setTimeout(() => icRef.current?.focus(), 0)}
                      className="focus:border-rose-500 focus:ring-rose-500/20 rounded-lg shadow-sm hover:shadow-md transition-all border-rose-200 w-full"
                    />
                    <div className="absolute right-3 top-8 text-rose-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="w-[110px] flex items-end gap-1">
                  <div className="relative">
                    <SearchableSelect 
                      inputRef={icRef} 
                      label="Item Code" 
                      options={catalog.map(i => i.itemCode)} 
                      value={currentEntry.itemCode} 
                      onChange={(c) => { 
                        const item = catalog.find(x => x.itemCode === c); 
                        setCurrentEntry({
                          ...currentEntry, 
                          itemCode: c, 
                          itemName: item?.itemName || currentEntry.itemName
                        }); 
                      }} 
                      onSelectionComplete={() => setTimeout(() => nRef.current?.focus(), 0)}
                      className="focus:border-rose-500 focus:ring-rose-500/20 rounded-lg shadow-sm hover:shadow-md transition-all border-rose-200 w-full"
                    />
                    <div className="absolute right-3 top-8 text-rose-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <button 
                    onClick={() => onOpenQuickAdd('item')} 
                    className="bg-slate-100 border border-rose-300 rounded-lg p-1.5 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all shadow-md hover:shadow-lg" 
                    style={{height: '36px'}}
                  >
                    <PackagePlus className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-[130px]">
                  <div className="relative">
                    <SearchableSelect 
                      inputRef={nRef} 
                      label="Product" 
                      options={catalog.map(i => i.itemName)} 
                      value={currentEntry.itemName} 
                      onChange={(n) => { 
                        const item = catalog.find(x => x.itemName === n); 
                        setCurrentEntry({...currentEntry, itemName: n, itemCode: item?.itemCode || currentEntry.itemCode}); 
                      }} 
                      onSelectionComplete={() => setTimeout(() => qRef.current?.focus(), 0)}
                      className="focus:border-rose-500 focus:ring-rose-500/20 rounded-lg shadow-sm hover:shadow-md transition-all border-rose-200 w-full"
                    />
                    <div className="absolute right-3 top-8 text-rose-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="w-[70px]">
                  <label className="text-xs font-semibold uppercase text-slate-600 block text-center mb-1">Qty</label>
                  <input 
                    ref={qRef} 
                    type="number" 
                    className="w-full border border-rose-200 rounded-lg px-3 text-right text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all" 
                    style={{height: '36px'}} 
                    value={currentEntry.qty} 
                    onChange={e => setCurrentEntry({...currentEntry, qty: e.target.value})} 
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); rRef.current?.focus(); } }}
                  />
                </div>
                <div className="w-[80px]">
                  <label className="text-xs font-semibold uppercase text-slate-600 block text-center mb-1">Rate</label>
                  <input 
                    ref={rRef} 
                    type="number" 
                    className="w-full border border-rose-200 rounded-lg px-3 text-right text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all" 
                    style={{height: '36px'}} 
                    value={currentEntry.rate} 
                    onChange={e => setCurrentEntry({...currentEntry, rate: e.target.value})} 
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lRef.current?.focus(); } }}
                  />
                </div>
                <div className="w-[70px]">
                  <label className="text-xs font-semibold uppercase text-slate-600 block text-center mb-1">Lag.</label>
                  <input 
                    ref={lRef} 
                    type="number" 
                    className="w-full border border-rose-200 rounded-lg px-3 text-right text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all" 
                    style={{height: '36px'}} 
                    value={currentEntry.laguage} 
                    onChange={e => setCurrentEntry({...currentEntry, laguage: e.target.value})} 
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); coRef.current?.focus(); } }}
                  />
                </div>
                <div className="w-[70px]">
                  <label className="text-xs font-semibold uppercase text-slate-600 block text-center mb-1">Coolie</label>
                  <input 
                    ref={coRef} 
                    type="number" 
                    className="w-full border border-rose-200 rounded-lg px-3 text-right text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all" 
                    style={{height: '36px'}} 
                    value={currentEntry.coolie} 
                    onChange={e => setCurrentEntry({...currentEntry, coolie: e.target.value})} 
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); pRef.current?.focus(); } }}
                  />
                </div>
                <div className="w-[90px]">
                  <label className="text-xs font-semibold uppercase text-slate-600 block text-center mb-1">Paid</label>
                  <input 
                    ref={pRef} 
                    type="number" 
                    className="w-full border border-rose-200 rounded-lg px-3 text-right text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all" 
                    style={{height: '36px'}} 
                    value={currentEntry.paidAmt} 
                    onChange={e => setCurrentEntry({...currentEntry, paidAmt: e.target.value})} 
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); remRef.current?.focus(); } }}
                  />
                </div>
                <div className="w-[130px]">
                  <div className="relative">
                    <SearchableSelect 
                      inputRef={remRef} 
                      label="Remarks" 
                      options={['Regular', 'Urgent', 'Special']} 
                      value={currentEntry.remarks} 
                      onChange={(rem) => setCurrentEntry({...currentEntry, remarks: rem})} 
                      onSelectionComplete={() => setTimeout(() => {
                        // Focus the ADD/UPDATE button
                        const addButton = document.querySelector('.submit-button');
                        if (addButton) addButton.focus();
                      }, 0)}
                      className="focus:border-rose-500 focus:ring-rose-500/20 rounded-lg shadow-sm hover:shadow-md transition-all border-rose-200 w-full"
                    />
                    <div className="absolute right-3 top-8 text-rose-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="ml-auto pr-1">
                  <button 
                    type="button" 
                    onClick={onAddItem} 
                    className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white px-6 text-sm font-bold uppercase hover:from-[#4A44D0] hover:to-[#3A34C0] shadow-md rounded-lg transition-all active:translate-y-px hover:shadow-lg submit-button" 
                    style={{height: '36px'}}
                  >
                    {currentEntry.id ? 'UPDATE' : 'ADD'}
                  </button>
                </div>
              </div>
            </form>
          </div>
          
          <div className="flex-1 overflow-auto bg-white custom-table-scroll rounded-b-xl" style={{ maxHeight: '400px' }}>
            <table className="w-full text-left text-sm border-collapse relative min-w-full">
              <thead className="sticky top-0 bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white z-20 border-b-2 border-black/20 font-bold uppercase text-xs shadow-lg rounded-t-lg">
                <tr>
                  <th className="px-3 py-3 border-r border-black/10 w-14 text-center">Sl.No.</th>
                  <th className="px-3 py-3 border-r border-black/10 w-24">Vehicle</th>
                  <th className="px-3 py-3 border-r border-black/10 w-24">Date</th>
                  <th className="px-3 py-3 border-r border-black/10 w-24">Item Code</th>
                  <th className="px-3 py-3 border-r border-black/10">Item Name</th>
                  <th className="px-3 py-3 border-r border-black/10 w-16 text-right">Qty</th>
                  <th className="px-3 py-3 border-r border-black/10 w-16 text-right">Rate</th>
                  <th className="px-3 py-3 border-r border-black/10 w-24 text-right">Total</th>
                  <th className="px-3 py-3 border-r border-black/10 w-20 text-right">Luggage</th>
                  <th className="px-3 py-3 border-r border-black/10 w-24 text-right">L. Amount</th>
                  <th className="px-3 py-3 border-r border-black/10 w-16 text-right">Coolie</th>
                  <th className="px-3 py-3 border-r border-black/10 w-24 text-right">Paid Amount</th>
                  <th className="px-3 py-3 border-r border-black/10 w-28 text-left">Remarks</th>
                  <th className="px-3 py-3 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="14" className="p-12 text-center text-slate-400 italic font-medium text-sm tracking-wide">
                      No transactions recorded for this session
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const grossVal = Number(item.qty) * Number(item.rate);
                    const lagVal = Number(item.laguage || 0) * Number(item.qty);
                    const coolieVal = Number(item.coolie || 0);
                    return (
                      <tr key={item.id} className="hover:bg-primary-50 border-b border-black/10 group transition-colors">
                        <td className="px-3 py-2.5 border-r border-black/5 text-center text-slate-400 font-semibold">{String(idx+1)}</td>
                        <td className="px-3 py-2.5 border-r border-black/5 font-semibold text-slate-700">{String(item.vehicle || '--')}</td>
                        <td className="px-3 py-2.5 border-r border-black/5 font-mono text-slate-500">{String(item.date)}</td>
                        <td className="px-3 py-2.5 border-r border-black/5 font-mono text-slate-500">{String(item.itemCode)}</td>
                        <td className="px-3 py-2.5 border-r border-black/5 font-semibold text-slate-800">{String(item.itemName)}</td>
                        <td className="px-3 py-2.5 border-r border-black/5 text-right font-bold">{String(item.qty)}</td>
                        <td className="px-3 py-2.5 border-r border-black/5 text-right font-mono">₹{String(item.rate)}</td>
                        <td className="px-3 py-2.5 border-r border-black/5 text-right font-bold text-rose-600 bg-rose-50/20">₹{grossVal.toLocaleString()}</td>
                        <td className="px-3 py-2.5 border-r border-black/5 text-right text-slate-500 italic">{String(item.laguage || 0)}</td>
                        <td className="px-3 py-2.5 border-r border-black/5 text-right text-slate-500 italic">₹{lagVal.toLocaleString()}</td>
                        <td className="px-3 py-2.5 border-r border-black/5 text-right text-slate-500 italic">₹{String(coolieVal)}</td>
                        <td className="px-3 py-2.5 border-r border-black/5 text-right text-emerald-600 font-bold">₹{String(item.paidAmt||0)}</td>
                        <td className="px-3 py-2.5 border-r border-black/5">{String(item.remarks || '')}</td>
                        <td className="px-3 py-2.5 text-right space-x-2">
                          <button 
                            onClick={() => onEditItem(item)} 
                            className="p-1.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => onRemoveItem(item.id)} 
                            className="p-1.5 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div className="w-[340px] bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col p-5 shrink-0 shadow-2xl rounded-r-lg border-l-2 border-[#5B55E6]/30">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B55E6] to-[#4A44D0] flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Financial Summary</h3>
        </div>
        <div className="space-y-2 flex-1 text-white pb-4">
          <div className="bg-slate-700/30 backdrop-blur-sm rounded-xl p-2 border border-slate-600/50 shadow-lg">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 block">Total Quantity</label>
            <input type="text" readOnly className="w-full bg-gradient-to-r from-slate-800 to-slate-700 px-2 py-1.5 text-lg font-black text-right rounded-lg border border-slate-600/50 outline-none text-cyan-400 shadow-inner" value={String(summary.qty || 0)} style={{ colorScheme: 'dark' }} />
          </div>
          <div className="bg-slate-700/30 backdrop-blur-sm rounded-xl p-2 border border-slate-600/50 shadow-lg">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 block">Handling Charges</label>
            <input type="text" readOnly className="w-full bg-gradient-to-r from-slate-800 to-slate-700 px-2 py-1.5 text-base font-bold text-right rounded-lg border border-slate-600/50 outline-none text-amber-400 shadow-inner" value={Number(summary.coolieTotal || 0).toFixed(2)} style={{ colorScheme: 'dark' }} />
          </div>
          <div className="bg-slate-700/30 backdrop-blur-sm rounded-xl p-2 border border-slate-600/50 shadow-lg">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 block">Luggage Costs</label>
            <input type="text" readOnly className="w-full bg-gradient-to-r from-slate-800 to-slate-700 px-2 py-1.5 text-base font-bold text-right rounded-lg border border-slate-600/50 outline-none text-rose-400 shadow-inner" value={Number(summary.laguageTotal || 0).toFixed(2)} style={{ colorScheme: 'dark' }} />
          </div>
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl p-3 border border-[#5B55E6]/30 shadow-lg">
            <h4 className="text-xs font-bold text-[#5B55E6] uppercase tracking-widest mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Commission Details
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Commission %</label>
                <input type="number" className="bg-gradient-to-r from-slate-800 to-slate-700 px-2 py-1.5 font-bold text-right rounded-lg border border-slate-600/50 outline-none focus:border-[#5B55E6] focus:ring-2 focus:ring-[#5B55E6]/20 text-white shadow-inner" value={String(commissionPct)} onChange={e => setCommissionPct(e.target.value)} style={{ colorScheme: 'dark' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Total Commission</label>
                <input type="text" readOnly className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 px-2 py-1.5 text-right rounded-lg border border-slate-600/30 outline-none text-rose-400 font-bold shadow-inner" value={Number(summary.totalCommission || 0).toFixed(2)} style={{ colorScheme: 'dark' }} />
              </div>
            </div>
          </div>
          <div className="bg-slate-700/30 backdrop-blur-sm rounded-xl p-2 border border-slate-600/50 shadow-lg">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 block">Gross Total</label>
            <input type="text" readOnly className="w-full bg-gradient-to-r from-slate-800 to-slate-700 px-2 py-1.5 text-lg font-black text-right rounded-lg border border-slate-600/50 outline-none text-emerald-400 shadow-inner" value={Number(summary.itemTotal || 0).toFixed(2)} style={{ colorScheme: 'dark' }} />
          </div>
          <div className="bg-slate-700/30 backdrop-blur-sm rounded-xl p-2 border border-slate-600/50 shadow-lg">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 block">Amount Paid</label>
            <input type="text" readOnly className="w-full bg-gradient-to-r from-slate-800 to-slate-700 px-2 py-1.5 text-base font-bold text-right rounded-lg border border-slate-600/50 outline-none text-green-400 shadow-inner" value={Number(totalPaidAmount || 0).toFixed(2)} style={{ colorScheme: 'dark' }} />
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 text-center">
            <div className="inline-flex items-center gap-2 mb-3 px-4 py-2 bg-gradient-to-r from-[#5B55E6]/20 to-[#4A44D0]/20 rounded-full border border-[#5B55E6]/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#5B55E6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-bold text-[#5B55E6] uppercase tracking-wider">Net Total</span>
            </div>
            <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] p-5 rounded-2xl shadow-2xl border border-white/10">
              <p className="text-4xl font-black text-white tabular-nums drop-shadow-2xl">₹ {Number((summary.itemTotal || 0) - (summary.totalCommission || 0) - (summary.laguageTotal || 0) - (summary.coolieTotal || 0)).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
