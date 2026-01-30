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
    <div className="flex-1 flex flex-row gap-3 h-full p-3 bg-slate-100 overflow-hidden">
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        <section className="bg-white border border-slate-200 p-4 shadow-card rounded-sm shrink-0">
          <div className="flex items-center gap-2 mb-3 text-primary-600 font-semibold text-xs uppercase border-b border-slate-100 pb-2">
            <Users className="w-4 h-4" /> Trading Client Data
          </div>
          <div className="grid grid-cols-5 gap-4">
            <SearchableSelect 
              inputRef={groupRef} 
              label="Group Category" 
              options={groups.map(g => g.name)} 
              value={customerInfo.groupName} 
              onChange={(val) => setCustomerInfo({...customerInfo, groupName: val, customerName: ''})} 
              onSelectionComplete={() => setTimeout(() => cRef.current?.focus(), 0)}
              placeholder="Filter Group" 
            />
            <div className="flex gap-1.5 items-end overflow-visible">
              <SearchableSelect 
                inputRef={cRef}
                label="Party/Customer" 
                options={filteredCustomers.map(c => c.name)} 
                value={customerInfo.customerName} 
                onChange={handleCustomerSelect} 
                onSelectionComplete={() => setTimeout(() => vRef.current?.focus(), 0)}
                placeholder="Search Party" 
                className="flex-1" 
              />
              <button 
                onClick={() => onOpenQuickAdd('customer')} 
                className="p-2 bg-slate-100 border border-slate-300 rounded-sm hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all shadow-sm" 
                style={{height: '36px'}}
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Address</label>
              <input 
                type="text" 
                readOnly 
                className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-sm text-slate-600 cursor-not-allowed" 
                style={{height: '36px'}} 
                value={String(customerInfo.address || '--')} 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1">Phone</label>
              <input 
                type="text" 
                readOnly 
                className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-sm text-slate-600 cursor-not-allowed" 
                style={{height: '36px'}} 
                value={String(customerInfo.contactNo || '--')} 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-accent-600 uppercase tracking-wide block mb-1">Rem. Advance</label>
              <input 
                type="text" 
                readOnly 
                className="w-full bg-accent-50 border border-accent-200 rounded-sm text-accent-600 px-3 py-2 text-sm font-bold cursor-not-allowed" 
                style={{height: '36px'}} 
                value={`₹ ${remAdvance.toFixed(2)}`} 
              />
            </div>
          </div>
        </section>
        
        <section className="bg-white border border-slate-200 shadow-card rounded-sm flex flex-col relative z-30 shrink-0 overflow-visible">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-slate-700 font-semibold text-xs uppercase flex items-center gap-2 tracking-wide">
            <Database className="w-4 h-4 text-slate-400" /> Data Entry Row
          </div>
          <div className="p-3 border-b border-slate-100 bg-white overflow-x-auto">
            <form>
              <div className="flex items-end gap-2 min-w-[1100px]">
                <div className="w-[95px]">
                  <label className="text-xs font-semibold text-slate-600 uppercase text-center block mb-1">Date</label>
                  <input 
                    type="date" 
                    className="w-full text-sm border border-slate-300 rounded-sm px-2 py-1.5 font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50" 
                    style={{height: '36px'}} 
                    value={currentEntry.date} 
                    onChange={e => setCurrentEntry({...currentEntry, date: e.target.value})} 
                  />
                </div>
                <div className="w-[120px]">
                  <SearchableSelect 
                    inputRef={vRef} 
                    label="Vehicle" 
                    options={vehicles.map(v => v.name)} 
                    value={currentEntry.vehicle} 
                    onChange={(v) => setCurrentEntry({...currentEntry, vehicle: v})} 
                    onSelectionComplete={() => setTimeout(() => icRef.current?.focus(), 0)}
                  />
                </div>
                <div className="w-[110px] flex items-end gap-1">
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
                  />
                  <button 
                    onClick={() => onOpenQuickAdd('item')} 
                    className="bg-slate-100 border border-slate-300 rounded-sm p-1.5 hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all" 
                    style={{height: '36px'}}
                  >
                    <PackagePlus className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-[130px]">
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
                  />
                </div>
                <div className="w-[70px]">
                  <label className="text-xs font-semibold uppercase text-slate-600 block text-center mb-1">Qty</label>
                  <input 
                    ref={qRef} 
                    type="number" 
                    className="w-full border border-slate-300 rounded-sm px-2 text-right text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50" 
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
                    className="w-full border border-slate-300 rounded-sm px-2 text-right text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50" 
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
                    className="w-full border border-slate-300 rounded-sm px-2 text-right text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50" 
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
                    className="w-full border border-slate-300 rounded-sm px-2 text-right text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50" 
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
                    className="w-full border border-slate-300 rounded-sm px-2 text-right text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50" 
                    style={{height: '36px'}} 
                    value={currentEntry.paidAmt} 
                    onChange={e => setCurrentEntry({...currentEntry, paidAmt: e.target.value})} 
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); remRef.current?.focus(); } }}
                  />
                </div>
                <div className="w-[130px]">
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
                  />
                </div>
                <div className="ml-auto pr-1">
                  <button 
                    type="button" 
                    onClick={onAddItem} 
                    className="bg-slate-800 text-white px-6 text-sm font-semibold uppercase hover:bg-primary-600 shadow-md rounded-sm transition-all active:translate-y-px submit-button" 
                    style={{height: '36px'}}
                  >
                    {currentEntry.id ? 'UPDATE' : 'ADD'}
                  </button>
                </div>
              </div>
            </form>
          </div>
          
          <div className="flex-1 overflow-auto bg-white custom-table-scroll" style={{ maxHeight: '400px' }}>
            <table className="w-full text-left text-sm border-collapse relative">
              <thead className="sticky top-0 bg-emerald-700 text-white z-20 border-b-2 font-semibold uppercase text-xs shadow-md">
                <tr>
                  <th className="px-3 py-3 border border-emerald-800 w-14 text-center">Sl.No.</th>
                  <th className="px-3 py-3 border border-emerald-800 w-24">Vehicle</th>
                  <th className="px-3 py-3 border border-emerald-800 w-24">Date</th>
                  <th className="px-3 py-3 border border-emerald-800 w-24">Item Code</th>
                  <th className="px-3 py-3 border border-emerald-800">Item Name</th>
                  <th className="px-3 py-3 border border-emerald-800 w-16 text-right">Qty</th>
                  <th className="px-3 py-3 border border-emerald-800 w-16 text-right">Rate</th>
                  <th className="px-3 py-3 border border-emerald-800 w-24 text-right">Total</th>
                  <th className="px-3 py-3 border border-emerald-800 w-20 text-right">Luggage</th>
                  <th className="px-3 py-3 border border-emerald-800 w-24 text-right">L. Amount</th>
                  <th className="px-3 py-3 border border-emerald-800 w-16 text-right">Coolie</th>
                  <th className="px-3 py-3 border border-emerald-800 w-24 text-right">Paid Amount</th>
                  <th className="px-3 py-3 border border-emerald-800 w-28 text-left">Remarks</th>
                  <th className="px-3 py-3 border border-emerald-800 w-20 text-center">Action</th>
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
                      <tr key={item.id} className="hover:bg-primary-50 border-b border-slate-100 group transition-colors">
                        <td className="px-3 py-2.5 border-r border-slate-100 text-center text-slate-400 font-semibold">{String(idx+1)}</td>
                        <td className="px-3 py-2.5 border-r border-slate-100 font-semibold text-slate-700">{String(item.vehicle || '--')}</td>
                        <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-slate-500">{String(item.date)}</td>
                        <td className="px-3 py-2.5 border-r border-slate-100 font-mono text-slate-500">{String(item.itemCode)}</td>
                        <td className="px-3 py-2.5 border-r border-slate-100 font-semibold text-slate-800">{String(item.itemName)}</td>
                        <td className="px-3 py-2.5 border-r border-slate-100 text-right font-bold">{String(item.qty)}</td>
                        <td className="px-3 py-2.5 border-r border-slate-100 text-right font-mono">₹{String(item.rate)}</td>
                        <td className="px-3 py-2.5 border-r border-slate-100 text-right font-bold text-rose-600 bg-rose-50/20">₹{grossVal.toLocaleString()}</td>
                        <td className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-500 italic">{String(item.laguage || 0)}</td>
                        <td className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-500 italic">₹{lagVal.toLocaleString()}</td>
                        <td className="px-3 py-2.5 border-r border-slate-100 text-right text-slate-500 italic">₹{String(coolieVal)}</td>
                        <td className="px-3 py-2.5 border-r border-slate-100 text-right text-emerald-600 font-bold">₹{String(item.paidAmt||0)}</td>
                        <td className="px-3 py-2.5 border-r border-slate-100">{String(item.remarks || '')}</td>
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
      
      {/* RIGHT SUMMARY COLUMN - REPORT STYLE */}
      <div className="w-[340px] bg-slate-800 flex flex-col p-5 shrink-0 shadow-2xl">
        <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-5">Aggregate Summary</h3>
        <div className="space-y-4 flex-1 overflow-auto text-white scrollbar-thin">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Qty</label>
            <input type="text" readOnly className="bg-slate-700/50 px-3 py-2.5 text-lg font-bold text-right rounded-sm border border-slate-600 outline-none" value={String(summary.qty || 0)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Coolie</label>
            <input type="text" readOnly className="bg-slate-700/50 px-3 py-2.5 text-lg font-bold text-right rounded-sm border border-slate-600 outline-none" value={Number(summary.coolieTotal || 0).toFixed(2)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Luggage Total</label>
            <input type="text" readOnly className="bg-slate-700/50 px-3 py-2.5 text-lg font-bold text-right rounded-sm border border-slate-600 outline-none" value={Number(summary.laguageTotal || 0).toFixed(2)} />
          </div>
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/50 rounded border border-slate-700">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-primary-400">Commission %</label>
              <input type="number" className="bg-slate-800 px-2 py-2 font-semibold text-right rounded-sm border border-slate-600 outline-none focus:border-primary-500" value={String(commissionPct)} onChange={e => setCommissionPct(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">Total Commission</label>
              <input type="text" readOnly className="bg-slate-700/20 px-2 py-2 text-right text-slate-300 rounded-sm border border-slate-600 outline-none" value={Number(summary.totalCommission || 0).toFixed(2)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Total</label>
            <input type="text" readOnly className="bg-slate-700/50 px-3 py-2.5 text-lg font-bold text-right text-emerald-400 rounded-sm border border-slate-600 outline-none" value={Number(summary.itemTotal || 0).toFixed(2)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Amount Paid</label>
            <input type="text" readOnly className="bg-slate-700/50 px-3 py-2.5 text-lg font-bold text-right rounded-sm border border-slate-600 outline-none" value={Number(totalPaidAmount || 0).toFixed(2)} />
          </div>
          <div className="pt-5 border-t border-white/10 text-center">
            <p className="text-xs text-primary-400 font-semibold tracking-wider mb-2">Net Total</p>
            <p className="text-3xl font-bold text-primary-500 tabular-nums drop-shadow-xl">₹ {Number((summary.itemTotal || 0) - (summary.totalCommission || 0) - (summary.laguageTotal || 0) - (summary.coolieTotal || 0)).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}