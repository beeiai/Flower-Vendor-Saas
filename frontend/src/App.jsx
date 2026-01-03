import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Flower2, Receipt, FolderPlus, PackagePlus, Users, Plus, Trash2, Save, UserPlus, Check, X, ChevronDown, Calculator, Sparkles, Monitor, Database, Activity, ArrowRight, Truck, Clock, List, ChevronLeft, ChevronRight, Info, AlertCircle, CheckCircle2, XCircle, Printer, Search, Edit2, MessageSquare, FileText, LayoutPanelTop, BarChart3, Settings2, Play, MoreHorizontal, WalletCards, UserCheck, History, Landmark, ArrowDownToLine, ArrowUpFromLine, Coins, ArrowDownRight, ArrowUpRight, FileBarChart, Layers, Send, Smartphone } from 'lucide-react';
import SearchableSelect from './components/shared/SearchableSelect';
import Toast from './components/shared/Toast';
import { api } from './utils/api';
import ReportsWindow from './components/reports/ReportsView';

// --- SHARED UI COMPONENTS ---

// ...existing code...

// --- CORE FUNCTIONAL MODULES ---

function GroupCustomerRegistryForm({ title = 'ADD GROUP', initialTab = 'group', groups, setGroups, customers, setCustomers, onCancel, showNotify }) {
  const [tab, setTab] = useState(initialTab);
  const [groupName, setGroupName] = useState('');
  const [custForm, setCustForm] = useState({ groupName: '', name: '', contact: '', address: '' });

  const addGroup = async () => {
    const name = String(groupName || '').trim();
    if (!name) return showNotify?.('Group add failed: Enter group name', 'error');
    try {
      const created = await api.createGroup(name);
      setGroups(prev => [...prev, created]);
      setGroupName('');
      showNotify?.('Group added successfully', 'success');
    } catch (e) {
      showNotify?.(`Group add failed: ${e.message}`, 'error');
    }
  };

  const addCustomer = async () => {
    const groupName = String(custForm.groupName || '').trim();
    const name = String(custForm.name || '').trim();
    if (!groupName) return showNotify?.('Customer add failed: Select group', 'error');
    if (!name) return showNotify?.('Customer add failed: Enter customer name', 'error');

    const groupId = groups.find(g => g.name === groupName)?.id;

    try {
      const created = await api.createCustomer({
        name,
        groupId,
        contact: custForm.contact,
        address: custForm.address,
      });

      setCustomers(prev => [...prev, { id: created.id, group: groupName, name: created.name, contact: created.contact, address: created.address }]);
      setCustForm({ groupName: '', name: '', contact: '', address: '' });
      showNotify?.('Customer added successfully', 'success');
    } catch (e) {
      showNotify?.(`Customer add failed: ${e.message}`, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f1f3f5] overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2"><FolderPlus className="w-4 h-4 text-rose-500" /> {String(title)}</h1>
        <button onClick={onCancel} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        <div className="max-w-[760px] mx-auto bg-white border-2 border-slate-300 shadow-sm overflow-hidden">
          <div className="bg-white border-b border-slate-200 px-4 py-2 flex gap-2">
            <button type="button" onClick={() => setTab('group')} className={`px-4 h-8 text-[10px] font-black uppercase border ${tab === 'group' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}`}>Group Addition</button>
            <button type="button" onClick={() => setTab('customer')} className={`px-4 h-8 text-[10px] font-black uppercase border ${tab === 'customer' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}`}>Customer Addition</button>
          </div>

          <div className="p-4">
        {tab === 'group' && (
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-500">Group Name</label>
              <input type="text" className="w-full border p-2 text-[11px] font-bold outline-none" value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
            <button onClick={addGroup} className="w-full bg-rose-600 text-white py-3 font-black uppercase text-[10px] shadow-lg hover:bg-rose-700 transition-all">Add Group</button>
          </div>
        )}

        {tab === 'customer' && (
          <div className="space-y-4">
            <SearchableSelect label="Target Group" options={groups.map(g => g.name)} value={custForm.groupName} onChange={(val) => setCustForm({ ...custForm, groupName: val })} placeholder="Select group" />
            <div>
              <label className="text-[9px] font-black uppercase text-slate-500">Customer Name</label>
              <input type="text" className="w-full border p-2 text-[11px] font-bold outline-none" value={custForm.name} onChange={e => setCustForm({ ...custForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500">Phone</label>
                <input type="text" className="w-full border p-2 text-[11px] font-bold outline-none" value={custForm.contact} onChange={e => setCustForm({ ...custForm, contact: e.target.value })} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500">Address</label>
                <input type="text" className="w-full border p-2 text-[11px] font-bold outline-none" value={custForm.address} onChange={e => setCustForm({ ...custForm, address: e.target.value })} />
              </div>
            </div>
            <button onClick={addCustomer} className="w-full bg-rose-600 text-white py-3 font-black uppercase text-[10px] shadow-lg hover:bg-rose-700 transition-all">Add Customer</button>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemRegistryForm({ form, setForm, onSave, onCancel }) {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#f1f3f5] overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2"><PackagePlus className="w-4 h-4 text-rose-500" /> NEW ITEM</h1>
        <button onClick={onCancel} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 flex-1 overflow-auto">
        <div className="max-w-[560px] mx-auto bg-white border-2 border-slate-300 shadow-sm p-4 space-y-4">
          <div>
            <label className="text-[9px] font-black uppercase text-slate-500">Code</label>
            <input type="text" className="w-full border p-2 text-[11px] font-bold outline-none" value={form.itemCode} onChange={e => setForm({ ...form, itemCode: e.target.value })} />
          </div>
          <div><label className="text-[9px] font-black uppercase text-slate-500">Product Name</label><input type="text" className="w-full border p-2 text-[11px] font-bold outline-none" value={form.itemName} onChange={e => setForm({...form, itemName: e.target.value})} /></div>
          <button onClick={onSave} className="w-full bg-emerald-600 text-white py-3 font-black uppercase text-[10px] shadow-lg hover:bg-emerald-700 transition-all">Add to Inventory</button>
        </div>
      </div>
    </div>
  );
}

function GroupAdvanceView({ groups, customers, advanceStore, onCancel }) {
  const data = useMemo(() => {
    return groups.map(g => {
      const groupCustomers = customers.filter(c => c.group === g.name);
      const totalBalance = groupCustomers.reduce((acc, c) => acc + (advanceStore[c.name]?.balance || 0), 0);
      return { name: g.name, count: groupCustomers.length, balance: totalBalance };
    });
  }, [groups, customers, advanceStore]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2"><WalletCards className="w-4 h-4 text-rose-500" /> GROUP WISE ADVANCE</h1>
        <button onClick={onCancel} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 flex-1 overflow-auto">
        <table className="w-full bg-white border-2 border-slate-300 text-[11px] text-left">
          <thead className="bg-slate-200 sticky top-0 uppercase font-black text-[9px] z-10 border-b-2 border-slate-400">
            <tr><th className="p-3">Group Name</th><th className="p-3 text-center">Customers</th><th className="p-3 text-right">Advance Aggregate</th></tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b hover:bg-slate-50 transition-colors">
                <td className="p-3 font-bold text-slate-800">{String(r.name)}</td>
                <td className="p-3 text-center text-slate-500">{String(r.count)}</td>
                <td className="p-3 text-right font-black text-emerald-600">₹{r.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupPaymentView({ groups, customers, ledgerStore, onCancel }) {
  const data = useMemo(() => {
    return groups.map(g => {
      const groupCustomers = customers.filter(c => c.group === g.name);
      const totalPaid = groupCustomers.reduce((acc, c) => {
        const entries = ledgerStore[c.name] || [];
        return acc + entries.reduce((sum, e) => sum + Number(e.paidAmt || 0), 0);
      }, 0);
      return { name: g.name, count: groupCustomers.length, paid: totalPaid };
    });
  }, [groups, customers, ledgerStore]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2"><Coins className="w-4 h-4 text-rose-500" /> GROUP WISE PAYMENT</h1>
        <button onClick={onCancel} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 flex-1 overflow-auto">
        <table className="w-full bg-white border-2 border-slate-300 text-[11px] text-left">
          <thead className="bg-slate-200 sticky top-0 uppercase font-black text-[9px] z-10 border-b-2 border-slate-400">
            <tr><th className="p-3">Group Name</th><th className="p-3 text-center">Customers</th><th className="p-3 text-right">Payment Aggregate</th></tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b hover:bg-slate-50 transition-colors">
                <td className="p-3 font-bold text-slate-800">{String(r.name)}</td>
                <td className="p-3 text-center text-slate-500">{String(r.count)}</td>
                <td className="p-3 text-right font-black text-blue-600">₹{r.paid.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SmsView({ customers, ledgerStore, onCancel, showNotify }) {
  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const pendingSms = useMemo(() => {
    const list = customers.filter(c => selectedGroup === 'All Groups' || c.group === selectedGroup);
    return list.map(c => {
      const ledger = ledgerStore[c.name] || [];
      const gross = ledger.reduce((acc, e) => acc + (Number(e.qty)*Number(e.rate)), 0);
      const paid = ledger.reduce((acc, e) => acc + Number(e.paidAmt || 0), 0);
      return { ...c, gross, paid, balance: gross - paid };
    });
  }, [customers, ledgerStore, selectedGroup]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f9] overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2"><Smartphone className="w-4 h-4 text-rose-500" /> DAILY SMS BROADCAST</h1>
        <button onClick={onCancel} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="bg-white border p-4 shadow-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-48"><SearchableSelect label="Group Filter" options={['All Groups', ...new Set(customers.map(c => c.group))]} value={selectedGroup} onChange={setSelectedGroup} /></div>
            <div className="mt-4"><p className="text-[10px] font-black uppercase text-slate-400">Total Recipients: {pendingSms.length}</p></div>
          </div>
          <button onClick={() => showNotify("SMS Broadcast Initiated", "success")} className="bg-emerald-600 text-white px-6 py-2 rounded-none font-black uppercase text-[10px] flex items-center gap-2 hover:bg-emerald-700 shadow-lg"><Send className="w-3.5 h-3.5" /> Send Summaries</button>
        </div>
        <div className="flex-1 bg-white border-2 border-slate-300 overflow-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 sticky top-0 uppercase font-black text-[8px] z-10 border-b">
              <tr><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Daily Balance</th><th className="p-3 text-right">Status</th></tr>
            </thead>
            <tbody>
              {pendingSms.map((p, i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-800">{String(p.name)}</td>
                  <td className="p-3 font-mono text-slate-500">{String(p.contact)}</td>
                  <td className="p-3 font-black text-rose-600">₹{String(p.balance)}</td>
                  <td className="p-3 text-right"><span className="bg-amber-50 text-amber-600 text-[8px] font-black uppercase px-2 py-1">Pending</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UtilityPlaceholderView({ title, onCancel }) {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#f1f3f5] overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2"><Settings2 className="w-4 h-4 text-rose-500" /> {String(title)}</h1>
        <button onClick={onCancel} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-6 flex-1 overflow-auto">
        <div className="max-w-[720px] mx-auto bg-white border-2 border-slate-300 shadow-sm p-6">
          <div className="text-[11px] font-bold text-slate-700">This screen is not implemented yet.</div>
        </div>
      </div>
    </div>
  );
}

function GroupTotalView({ groups, customers, ledgerStore, onCancel }) {
  const reportData = useMemo(() => {
    return groups.map(group => {
      const groupCustomers = customers.filter(c => c.group === group.name);
      let qtyTotal = 0; let grossTotal = 0; let paidTotal = 0;
      groupCustomers.forEach(cust => {
        const entries = ledgerStore[cust.name] || [];
        entries.forEach(e => {
          qtyTotal += Number(e.qty || 0);
          grossTotal += (Number(e.qty || 0) * Number(e.rate || 0));
          paidTotal += Number(e.paidAmt || 0);
        });
      });
      return { groupName: group.name, custCount: groupCustomers.length, qtyTotal, grossTotal, paidTotal, balance: grossTotal - paidTotal };
    });
  }, [groups, customers, ledgerStore]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2"><Activity className="w-4 h-4 text-rose-500" /> GROUP TOTAL REPORT</h1>
        <button onClick={onCancel} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 flex-1 overflow-auto">
        <table className="w-full bg-white border-2 border-slate-300 text-[11px] text-left">
          <thead className="bg-slate-200 sticky top-0 uppercase text-[9px] font-black z-10 border-b-2">
            <tr><th className="p-3">Group Name</th><th className="p-3 text-center">Customers</th><th className="p-3 text-right">Total Qty</th><th className="p-3 text-right">Gross Value</th><th className="p-3 text-right text-emerald-700">Total Paid</th><th className="p-3 text-right text-rose-700">Net Dues</th></tr>
          </thead>
          <tbody>
            {reportData.map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-slate-50 transition-colors">
                <td className="p-3 font-bold text-slate-800">{String(row.groupName)}</td><td className="p-3 text-center text-slate-500">{String(row.custCount)}</td><td className="p-3 text-right font-black">{String(row.qtyTotal)}</td><td className="p-3 text-right font-black">₹{row.grossTotal.toLocaleString()}</td><td className="p-3 text-right font-black text-emerald-600">₹{row.paidTotal.toLocaleString()}</td><td className="p-3 text-right font-black text-rose-600 bg-rose-50/20">₹{row.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupPrintingView({ groups, customers, ledgerStore, onCancel }) {
  const [selGroup, setSelGroup] = useState('');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [commissionPct, setCommissionPct] = useState(12);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState([]);

  const groupCustomers = useMemo(() => {
    if (!selGroup) return [];
    return customers.filter(c => c.group === selGroup);
  }, [customers, selGroup]);

  useEffect(() => {
    const handleAfter = () => setIsPrinting(false);
    window.addEventListener('afterprint', handleAfter);
    return () => window.removeEventListener('afterprint', handleAfter);
  }, []);

  const buildReport = async () => {
    if (!selGroup) return [];
    const from = String(fromDate || '');
    const to = String(toDate || '');
    const pct = Number(commissionPct || 0);

    const results = await Promise.all(groupCustomers.map(async (cust) => {
      try {
        if (!cust?.id) return { name: cust.name, address: cust.address, gross: 0, commission: 0, net: 0, paid: 0, balance: 0 };
        const txns = await api.listTransactions(cust.id);
        const filtered = txns.filter(t => {
          const d = String(t.date || '');
          if (!d) return false;
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        });
        const gross = filtered.reduce((acc, t) => acc + (Number(t.qty || 0) * Number(t.rate || 0)), 0);
        const paid = filtered.reduce((acc, t) => acc + Number(t.paidAmt || 0), 0);
        const commission = (gross * pct) / 100;
        const net = gross - commission;
        return { name: cust.name, address: cust.address, gross, commission, net, paid, balance: net - paid };
      } catch {
        // fallback to empty values (keeps printing flow simple)
        return { name: cust.name, address: cust.address, gross: 0, commission: 0, net: 0, paid: 0, balance: 0 };
      }
    }));

    return results;
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const data = await buildReport();
      setPrintData(data);
      // allow React to flush render before printing
      setTimeout(() => window.print(), 50);
    } catch {
      setIsPrinting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f9] overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shadow-lg shrink-0">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2"><Printer className="w-4 h-4 text-rose-500" /> GROUP PRINTING</h1>
        <button onClick={onCancel} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 overflow-hidden">
        <section className="bg-white border p-4 shadow-sm shrink-0">
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-4">
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">From Date</label>
              <input type="date" className="w-full border p-1 text-[11px] font-bold h-[28px]" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="col-span-4">
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">To Date</label>
              <input type="date" className="w-full border p-1 text-[11px] font-bold h-[28px]" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="col-span-4">
              <SearchableSelect label="Group Name" options={groups.map(g => g.name)} value={selGroup} onChange={setSelGroup} placeholder="Select group" />
            </div>

            <div className="col-span-4">
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">Commission (%)</label>
              <input type="number" className="w-full border p-1 text-[11px] font-bold h-[28px] text-right" value={commissionPct} onChange={e => setCommissionPct(e.target.value)} />
            </div>

            <div className="col-span-8 flex items-end gap-2">
              <button onClick={handlePrint} disabled={!selGroup || isPrinting} className="bg-slate-800 text-white px-8 h-8 font-black uppercase text-[10px] flex items-center gap-2 shadow-md disabled:opacity-40"><Printer className="w-3.5 h-3.5" /> Print</button>
              <button onClick={onCancel} className="bg-slate-200 text-slate-800 px-8 h-8 font-black uppercase text-[10px] border border-slate-300 shadow-md">Cancel</button>
            </div>
          </div>

          <div className="mt-2 text-[10px] font-bold text-slate-500 min-h-[14px]">
            {isPrinting ? 'Printing...' : ''}
          </div>
        </section>

        <div className="flex-1 border-2 border-slate-300 overflow-auto p-8 font-serif shadow-inner bg-stone-50">
          {(!selGroup || printData.length === 0) ? (
            <div className="text-center text-slate-300 mt-20 font-sans italic">Select group and click Print to generate patti report</div>
          ) : (
            <div className="space-y-12 max-w-3xl mx-auto font-sans">
              {printData.map((p, i) => (
                <div key={i} className="border-b-2 border-dashed border-stone-300 pb-12 last:border-0">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-black uppercase text-stone-800">{String(p.name)}</h2>
                      <p className="text-stone-500 text-sm">{String(p.address)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-sans font-black uppercase text-stone-400">Patti Report</p>
                      <p className="text-stone-600 text-xs">{String(fromDate)} to {String(toDate)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 border border-stone-800">
                    <div className="p-3 border-r border-stone-800"><p className="text-[8px] uppercase font-sans font-black">Gross</p><p className="text-lg">₹{Number(p.gross || 0).toLocaleString()}</p></div>
                    <div className="p-3 border-r border-stone-800"><p className="text-[8px] uppercase font-sans font-black">Commission</p><p className="text-lg">₹{Number(p.commission || 0).toLocaleString()}</p></div>
                    <div className="p-3 border-r border-stone-800"><p className="text-[8px] uppercase font-sans font-black">Net</p><p className="text-lg">₹{Number(p.net || 0).toLocaleString()}</p></div>
                    <div className="p-3 border-r border-stone-800"><p className="text-[8px] uppercase font-sans font-black">Paid</p><p className="text-lg">₹{Number(p.paid || 0).toLocaleString()}</p></div>
                    <div className="p-3 bg-stone-200"><p className="text-[8px] uppercase font-sans font-black text-rose-600">Balance</p><p className="text-lg font-bold">₹{Number(p.balance || 0).toLocaleString()}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VehicleView({ vehicles, setVehicles, onCancel }) {
  const [newVehicle, setNewVehicle] = useState('');
  const handleAdd = async () => {
    const name = String(newVehicle || '').trim();
    if (!name) return;
    try {
      const created = await api.createVehicle(name);
      setVehicles([...vehicles, created]);
      setNewVehicle('');
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message);
    }
  };
  return (
    <div className="flex-1 flex flex-col h-full bg-[#f1f3f5] overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0"><h1 className="text-[14px] font-black uppercase flex items-center gap-2"><Truck className="w-4 h-4 text-rose-500" /> EXTRA VEHICLE MANAGEMENT</h1><button onClick={onCancel} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button></div>
      <div className="flex-1 flex p-4 gap-4 overflow-hidden">
        <div className="w-80 bg-white border-2 border-slate-300 p-4 shadow-sm h-fit">
          <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-widest">Add Vehicle</h3>
          <div className="space-y-4">
            <div><label className="text-[9px] font-black uppercase text-slate-400">Vehicle Name / Plate</label><input type="text" className="w-full border p-2 h-10 font-bold outline-none" value={newVehicle} onChange={e => setNewVehicle(e.target.value)} /></div>
            <button onClick={handleAdd} className="w-full bg-slate-800 text-white py-3 font-black uppercase text-[10px] hover:bg-rose-600 transition-all">Register</button>
          </div>
        </div>
        <div className="flex-1 bg-white border-2 border-slate-300 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-100 p-2 border-b font-black text-[9px] uppercase text-slate-500">Registry List</div>
          <div className="flex-1 overflow-auto"><table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 sticky top-0 uppercase text-[9px] font-black"><tr><th className="p-3">Vehicle Description</th><th className="p-3 text-right">Action</th></tr></thead>
              <tbody>{vehicles.map(v => (
                <tr key={v.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-800">{String(v.name)}</td>
                  <td className="p-3 text-right">
                    <button onClick={async () => { await api.deleteVehicle(v.id); setVehicles(vehicles.filter(x => x.id !== v.id)); }} className="text-slate-300 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}</tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}

function DailySaleView({ customers, catalog, onCancel }) {
  const [formData, setFormData] = useState({ target: '', fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0] });
  const [data, setData] = useState([]); 
  const summary = useMemo(() => data.reduce((acc, item) => ({ qty: acc.qty + Number(item.qty || 0), total: acc.total + (Number(item.qty || 0) * Number(item.rate || 0)) }), { qty: 0, total: 0 }), [data]);
  const handleGo = () => { setData([ { sl: 1, party: 'Global Traders', item: 'White Lilies', qty: 30, rate: 250 }, { sl: 2, party: 'City Fresh', item: 'Red Rose', qty: 100, rate: 45 } ]); };
  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f9] overflow-hidden relative">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg"><h1 className="text-[14px] font-black uppercase flex items-center gap-2"><Monitor className="w-3.5 h-3.5 text-rose-500" /> DAILY SALE ANALYSIS</h1><button onClick={onCancel} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button></div>
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">
        <section className="bg-white border border-slate-400 p-3 shadow-md flex flex-col gap-2 shrink-0">
          <div className="flex items-end gap-3"><div className="w-[350px]"><SearchableSelect label="Party/Item filter" options={[...customers.map(c => c.name), ...catalog.map(i => i.itemName)]} value={formData.target} onChange={val => setFormData({...formData, target: val})} /></div><button onClick={handleGo} className="bg-slate-800 text-white px-8 h-[28px] text-[10px] font-black uppercase hover:bg-rose-600 shadow-md transition-all">Apply</button></div>
          <div className="flex gap-4">
            <div className="w-48"><label className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">Start Date</label><input type="date" className="w-full border p-1 text-[11px] font-bold h-[28px]" value={formData.fromDate} onChange={e => setFormData({...formData, fromDate: e.target.value})} /></div>
            <div className="w-48"><label className="text-[9px] font-black text-slate-500 uppercase block mb-0.5">End Date</label><input type="date" className="w-full border p-1 text-[11px] font-bold h-[28px]" value={formData.toDate} onChange={e => setFormData({...formData, toDate: e.target.value})} /></div>
          </div>
        </section>
        <section className="flex-1 bg-white border-2 border-slate-400 shadow-xl overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1 bg-slate-50"><table className="w-full border-collapse text-[11px] table-fixed text-left">
              <thead className="sticky top-0 bg-slate-200 border-b-2 font-black uppercase text-[9px] z-10"><tr><th className="p-2 w-12 text-center">Sl</th><th className="p-2">Party Name</th><th className="p-2">Product</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Total</th></tr></thead>
              <tbody>{data.map((item, idx) => (<tr key={idx} className="hover:bg-rose-50 border-b bg-white"><td className="p-2 text-center text-slate-400 font-bold">{String(idx + 1)}</td><td className="p-2 font-bold text-slate-800">{String(item.party)}</td><td className="p-2 font-bold">{String(item.item)}</td><td className="p-2 text-right font-black">{String(item.qty)}</td><td className="p-2 text-right font-black text-rose-600">₹{(item.qty * item.rate).toLocaleString()}</td></tr>))}</tbody>
          </table></div>
        </section>
        <section className="flex justify-end items-center gap-6 bg-white p-3 border border-slate-400 shadow-md">
          <div className="flex items-center gap-3"><span className="text-[10px] font-black text-slate-600">AGGREGATE QTY</span><input type="text" readOnly className="w-24 bg-slate-100 p-1 text-[12px] font-black text-right outline-none" value={String(summary.qty)} /></div>
          <div className="flex items-center gap-3"><span className="text-[10px] font-black text-slate-600">SALE VALUE</span><input type="text" readOnly className="w-48 bg-rose-600 text-white p-1 text-[14px] font-black text-right outline-none" value={`₹ ${summary.total.toLocaleString()}`} /></div>
        </section>
      </div>
    </div>
  );
}

function DailyTransactionsView({ customerInfo, setCustomerInfo, groups, customers, catalog, vehicles, onOpenQuickAdd, currentEntry, setCurrentEntry, items, onAddItem, onRemoveItem, onEditItem, summary, onSaveRecord, onViewReport, advanceStore, commissionPct, setCommissionPct }) {
  const vRef = useRef(null); const cRef = useRef(null); const nRef = useRef(null); const qRef = useRef(null); const rRef = useRef(null); const lRef = useRef(null); const coRef = useRef(null); const pRef = useRef(null); const remRef = useRef(null);
  const filteredCustomers = customers.filter(c => !customerInfo.groupName || c.group === customerInfo.groupName);
  const remAdvance = advanceStore[customerInfo.customerName]?.balance || 0;
  const handleCustomerSelect = (name) => { const c = customers.find(x => x.name === name); if (c) setCustomerInfo({ customerName: name, groupName: c.group, contactNo: c.contact, address: c.address }); else setCustomerInfo({ ...customerInfo, customerName: name }); };
  const handleKey = (e, next) => { if (e.key === 'Enter') { e.preventDefault(); next?.current?.focus(); } };

  return (
    <div className="flex-1 flex flex-row gap-2 h-full p-2 bg-[#f1f3f5] overflow-hidden">
      <div className="flex-1 flex flex-col gap-2 overflow-hidden">
        <section className="bg-white border border-slate-300 p-3 shadow-sm shrink-0">
          <div className="flex items-center gap-2 mb-2 text-rose-600 font-black text-[9px] uppercase border-b pb-1"><Users className="w-3 h-3" /> Trading Client Data</div>
          <div className="grid grid-cols-5 gap-4">
            <SearchableSelect label="Group Category" options={groups.map(g => g.name)} value={customerInfo.groupName} onChange={(val) => setCustomerInfo({...customerInfo, groupName: val, customerName: ''})} placeholder="Filter Group" />
            <div className="flex gap-1 items-end overflow-visible"><SearchableSelect label="Party/Customer" options={filteredCustomers.map(c => c.name)} value={customerInfo.customerName} onChange={handleCustomerSelect} placeholder="Search Party" className="flex-1" /><button onClick={() => onOpenQuickAdd('customer')} className="p-1.5 bg-slate-100 border border-slate-400 hover:bg-rose-600 hover:text-white transition-all mb-0.5 shadow-sm"><UserPlus className="w-3 h-3" /></button></div>
            <div><label className="text-[9px] font-bold text-slate-500 uppercase">Address</label><input type="text" readOnly className="w-full bg-slate-50 border p-1 text-[11px] text-slate-600 cursor-not-allowed" value={String(customerInfo.address || '--')} /></div>
            <div><label className="text-[9px] font-bold text-slate-500 uppercase">Phone</label><input type="text" readOnly className="w-full bg-slate-50 border p-1 text-[11px] text-slate-600 cursor-not-allowed" value={String(customerInfo.contactNo || '--')} /></div>
            <div><label className="text-[9px] font-bold text-rose-600 uppercase">Rem. Advance</label><input type="text" readOnly className="w-full bg-rose-50 border border-rose-200 text-rose-600 p-1 text-[11px] font-black cursor-not-allowed" value={`₹ ${remAdvance.toFixed(2)}`} /></div>
          </div>
        </section>
        <section className="bg-white border border-slate-400 shadow-sm flex flex-col relative z-30 shrink-0 overflow-visible">
          <div className="bg-slate-100 px-3 py-1 border-b text-slate-700 font-black text-[9px] uppercase flex items-center gap-2"><Database className="w-3 h-3" /> Data Entry Row</div>
          <div className="p-2 border-b bg-slate-50 overflow-x-auto">
            <div className="flex items-end gap-1 min-w-[1050px]">
              <div className="w-[85px]"><label className="text-[8px] font-black text-slate-500 uppercase text-center block">Date</label><input type="date" className="w-full text-[11px] border border-slate-400 px-1 py-0.5 font-bold h-[28px] outline-none" value={currentEntry.date} onChange={e => setCurrentEntry({...currentEntry, date: e.target.value})} /></div>
              <div className="w-[110px]"><SearchableSelect inputRef={vRef} label="Vehicle" options={vehicles.map(v => v.name)} value={currentEntry.vehicle} onChange={(v) => setCurrentEntry({...currentEntry, vehicle: v})} onEnterNext={() => cRef.current?.focus()} /></div>
              <div className="w-[100px] flex items-end gap-1"><SearchableSelect inputRef={cRef} label="Item Code" options={catalog.map(i => i.itemCode)} value={currentEntry.itemCode} onChange={(c) => { const item = catalog.find(x => x.itemCode === c); setCurrentEntry({...currentEntry, itemCode: c, itemName: item?.itemName || currentEntry.itemName}); }} onEnterNext={() => nRef.current?.focus()} /><button onClick={() => onOpenQuickAdd('item')} className="bg-slate-200 border border-slate-400 p-1.5 hover:bg-rose-600 hover:text-white h-[28px]"><PackagePlus className="w-3 h-3" /></button></div>
              <div className="w-[120px]"><SearchableSelect inputRef={nRef} label="Product" options={catalog.map(i => i.itemName)} value={currentEntry.itemName} onChange={(n) => { const item = catalog.find(x => x.itemName === n); setCurrentEntry({...currentEntry, itemName: n, itemCode: item?.itemCode || currentEntry.itemCode}); }} onEnterNext={() => qRef.current?.focus()} /></div>
              <div className="w-[60px]"><label className="text-[8px] font-black uppercase text-slate-500 block text-center">Qty</label><input ref={qRef} type="number" className="w-full border px-1.5 h-[28px] text-right text-[11px] outline-none focus:border-rose-600" value={currentEntry.qty} onChange={e => setCurrentEntry({...currentEntry, qty: e.target.value})} onKeyDown={e => handleKey(e, rRef)} /></div>
              <div className="w-[70px]"><label className="text-[8px] font-black uppercase text-slate-500 block text-center">Rate</label><input ref={rRef} type="number" className="w-full border px-1.5 h-[28px] text-right text-[11px] outline-none focus:border-rose-600" value={currentEntry.rate} onChange={e => setCurrentEntry({...currentEntry, rate: e.target.value})} onKeyDown={e => handleKey(e, lRef)} /></div>
              <div className="w-[60px]"><label className="text-[8px] font-black uppercase text-slate-500 block text-center">Lag.</label><input ref={lRef} type="number" className="w-full border px-1.5 h-[28px] text-right text-[11px] outline-none focus:border-rose-600" value={currentEntry.laguage} onChange={e => setCurrentEntry({...currentEntry, laguage: e.target.value})} onKeyDown={e => handleKey(e, coRef)} /></div>
              <div className="w-[60px]"><label className="text-[8px] font-black uppercase text-slate-500 block text-center">Coolie</label><input ref={coRef} type="number" className="w-full border px-1.5 h-[28px] text-right text-[11px] outline-none focus:border-rose-600" value={currentEntry.coolie} onChange={e => setCurrentEntry({...currentEntry, coolie: e.target.value})} onKeyDown={e => handleKey(e, pRef)} /></div>
              <div className="w-[80px]"><label className="text-[8px] font-black uppercase text-slate-500 block text-center">Paid</label><input ref={pRef} type="number" className="w-full border px-1.5 h-[28px] text-right text-[11px] outline-none focus:border-rose-600" value={currentEntry.paidAmt} onChange={e => setCurrentEntry({...currentEntry, paidAmt: e.target.value})} onKeyDown={e => handleKey(e, remRef)} /></div>
              <div className="w-[120px]"><SearchableSelect inputRef={remRef} label="Remarks" options={['Regular', 'Urgent', 'Special']} value={currentEntry.remarks} onChange={(rem) => setCurrentEntry({...currentEntry, remarks: rem})} onEnterNext={() => onAddItem()} /></div>
              <div className="ml-auto pr-1"><button onClick={onAddItem} className="bg-slate-900 text-white px-8 h-[28px] text-[9px] font-black uppercase hover:bg-rose-600 shadow-md transition-all active:translate-y-px">{currentEntry.id ? 'UPDATE' : 'ADD'}</button></div>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-white custom-table-scroll" style={{ maxHeight: '400px' }}>
            <table className="w-full text-left text-[11px] border-collapse relative">
              <thead className="sticky top-0 bg-[#15803d] text-white z-20 border-b-2 font-black uppercase text-[8px] shadow-sm">
                <tr>
                  <th className="p-2 border border-green-800 w-12 text-center">Sl.No.</th>
                  <th className="p-2 border border-green-800 w-24">vehicle</th>
                  <th className="p-2 border border-green-800 w-24">Date</th>
                  <th className="p-2 border border-green-800 w-24">Item Code</th>
                  <th className="p-2 border border-green-800">Item Name</th>
                  <th className="p-2 border border-green-800 w-16 text-right">Qty</th>
                  <th className="p-2 border border-green-800 w-16 text-right">Rate</th>
                  <th className="p-2 border border-green-800 w-24 text-right">Total</th>
                  <th className="p-2 border border-green-800 w-16 text-right">Laguage</th>
                  <th className="p-2 border border-green-800 w-24 text-right">L. Amount</th>
                  <th className="p-2 border border-green-800 w-16 text-right">Coolie</th>
                  <th className="p-2 border border-green-800 w-24 text-right">Paid Amount</th>
                  <th className="p-2 border border-green-800 w-28 text-left">Remarks</th>
                  <th className="p-2 border border-green-800 w-16 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? <tr><td colSpan="14" className="p-12 text-center text-slate-300 italic font-black text-[10px] tracking-widest uppercase">No transactions recorded for this session</td></tr> : items.map((item, idx) => {
                  const grossVal = Number(item.qty) * Number(item.rate);
                  const lagVal = Number(item.laguage || 0) * Number(item.qty);
                  const coolieVal = Number(item.coolie || 0);
                  return (
                  <tr key={item.id} className="hover:bg-rose-50 border-b group transition-colors">
                    <td className="p-2 border-r text-center text-slate-400 font-bold">{String(idx+1)}</td>
                    <td className="p-2 border-r font-bold text-slate-700">{String(item.vehicle || '--')}</td>
                    <td className="p-2 border-r text-slate-500">{String(item.date)}</td>
                    <td className="p-2 border-r text-slate-500">{String(item.itemCode || '--')}</td>
                    <td className="p-2 border-r font-bold text-slate-800">{String(item.itemName)}</td>
                    <td className="p-2 border-r text-right font-black">{String(item.qty)}</td>
                    <td className="p-2 border-r text-right font-mono">₹{String(item.rate)}</td>
                    <td className="p-2 border-r text-right font-black text-rose-600">₹{grossVal.toLocaleString()}</td>
                    <td className="p-2 border-r text-right text-slate-500 italic">{String(item.laguage || 0)}</td>
                    <td className="p-2 border-r text-right font-bold text-blue-600">₹{lagVal.toLocaleString()}</td>
                    <td className="p-2 border-r text-right text-slate-500 italic">₹{String(item.coolie || 0)}</td>
                    <td className="p-2 border-r text-right text-emerald-600 font-bold">₹{String(item.paidAmt||0)}</td>
                    <td className="p-2 border-r italic text-slate-400">{String(item.remarks || '--')}</td>
                    <td className="p-2 text-right space-x-1"><button onClick={()=>onEditItem(item)} className="p-1 text-blue-600 opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-3.5 h-3.5"/></button><button onClick={()=>onRemoveItem(item.id)} className="p-1 text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5"/></button></td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <aside className="w-[320px] bg-slate-800 flex flex-col p-4 shrink-0 shadow-2xl">
        <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Sparkles className="w-3.5 h-3.5" /> AGGREGATE SUMMARY</h3>
        <div className="space-y-3 flex-1 overflow-auto text-white scrollbar-thin">
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Item Qty Total</label><input type="text" readOnly className="bg-slate-700/50 p-2 text-lg font-black text-right border-slate-600 outline-none" value={String(summary.qty)} /></div>
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Total Gross Amount</label><input type="text" readOnly className="bg-slate-700/50 p-2 text-lg font-black text-right text-emerald-400 border-slate-600 outline-none" value={`₹ ${summary.itemTotal.toFixed(2)}`} /></div>
          <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/50 border border-slate-700"><div className="flex flex-col gap-1"><label className="text-[8px] text-rose-400 uppercase font-black">Commission %</label><input type="number" className="bg-slate-800 p-1 font-black text-right outline-none focus:border-rose-500" value={commissionPct} onChange={e => setCommissionPct(e.target.value)} /></div><div className="flex flex-col gap-1"><label className="text-[8px] text-slate-500 uppercase font-black">Commission Val</label><input type="text" readOnly className="bg-slate-700/20 p-1 text-right text-slate-400 outline-none" value={summary.totalCommission.toFixed(2)} /></div></div>
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Coolie Aggregate</label><input type="text" readOnly className="bg-slate-700/50 p-2 text-lg font-black text-right border-slate-600 outline-none" value={`₹ ${summary.coolieTotal.toFixed(2)}`} /></div>
          <div className="flex flex-col gap-1"><label className="text-[9px] font-black text-slate-500 uppercase">Laggage Aggregate</label><input type="text" readOnly className="bg-slate-700/50 p-2 text-lg font-black text-right border-slate-600 outline-none" value={`₹ ${summary.laguageTotal.toFixed(2)}`} /></div>
          <div className="pt-4 border-t border-white/10 text-center"><p className="text-[9px] text-rose-400 uppercase font-black tracking-widest">Net Final Amount</p><p className="text-3xl font-black text-rose-500 tabular-nums drop-shadow-xl">₹ {summary.netTotal.toFixed(2)}</p></div>
        </div>
        <div className="mt-4 space-y-2"><button onClick={onSaveRecord} className="w-full bg-rose-600 py-3 font-black uppercase text-[11px] text-white flex items-center justify-center gap-2 hover:bg-rose-700 shadow-lg transition-all"><Save className="w-4 h-4" /> Save Master Journal</button><button onClick={onViewReport} disabled={!customerInfo.customerName} className="w-full bg-slate-700 py-3 font-black uppercase text-[11px] text-white border border-slate-600 disabled:opacity-30 hover:bg-slate-600 transition-all">Client Account Statement</button></div>
      </aside>
    </div>
  );
}

// --- MAIN APPLICATION SHELL ---

export default function App() {
  const [activeSection, setActiveSection] = useState('daily');
  const [notification, setNotification] = useState({ message: '', type: 'info' });
  const [itemForm, setItemForm] = useState({ itemCode: '', itemName: '' });

  const [groupPattiForm, setGroupPattiForm] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    groupName: '',
    commissionPct: 12,
  });
  const [isGroupPattiPrinting, setIsGroupPattiPrinting] = useState(false);
  const [groupPattiPrintData, setGroupPattiPrintData] = useState(null);

  const [groupTotalForm, setGroupTotalForm] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    groupName: '',
  });
  const [isGroupTotalPrinting, setIsGroupTotalPrinting] = useState(false);
  const [groupTotalPrintData, setGroupTotalPrintData] = useState(null);

  const [isItemsDailySaleRateOpen, setIsItemsDailySaleRateOpen] = useState(false);
  const [itemsDailySaleRateForm, setItemsDailySaleRateForm] = useState({
    itemName: '',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  });
  const [itemsDailySaleRateRows, setItemsDailySaleRateRows] = useState([]);
  const [isItemsDailySaleRateLoading, setIsItemsDailySaleRateLoading] = useState(false);
  const [isItemsDailySaleRatePrinting, setIsItemsDailySaleRatePrinting] = useState(false);
  const [itemsDailySaleRatePrintData, setItemsDailySaleRatePrintData] = useState(null);
  
  const [groups, setGroups] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  const [ledgerStore, setLedgerStore] = useState({});
  const [advanceStore, setAdvanceStore] = useState({});
  const [saalaPeople, setSaalaPeople] = useState([]);
  const [saalaPayments, setSaalaPayments] = useState([]);

  const [customerInfo, setCustomerInfo] = useState({ groupName: '', customerName: '', address: '', contactNo: '' });
  const [currentEntry, setCurrentEntry] = useState({ date: new Date().toISOString().split('T')[0], vehicle: '', itemCode: '', itemName: '', qty: '', rate: '', laguage: '', coolie: '', paidAmt: '', remarks: '' });
  const [items, setItems] = useState([]);
  const [commissionPct, setCommissionPct] = useState(12);

  const showNotify = (m, t = 'info') => { setNotification({ message: m, type: t }); setTimeout(() => setNotification({ message: '', type: 'info' }), 3000); };

  useEffect(() => {
    const handleAfter = () => {
      setIsGroupPattiPrinting(false);
      setIsGroupTotalPrinting(false);
      setIsItemsDailySaleRatePrinting(false);
    };
    window.addEventListener('afterprint', handleAfter);
    return () => window.removeEventListener('afterprint', handleAfter);
  }, []);

  const loadItemsDailySaleRate = async () => {
    const from = String(itemsDailySaleRateForm.fromDate || '');
    const to = String(itemsDailySaleRateForm.toDate || '');
    const selectedItem = String(itemsDailySaleRateForm.itemName || '').trim();

    setIsItemsDailySaleRateLoading(true);
    try {
      const txnsByCustomer = await Promise.all(customers.map(async (cust) => {
        if (!cust?.id) return [];
        try {
          const txns = await api.listTransactions(cust.id);
          return (txns || []).map(t => ({ ...t, __party: cust.name || '' }));
        } catch {
          return [];
        }
      }));

      const flat = txnsByCustomer.flat();
      const rows = flat
        .filter(t => {
          const d = String(t.date || '');
          if (!d) return false;
          if (from && d < from) return false;
          if (to && d > to) return false;
          if (selectedItem && String(t.itemName || '') !== selectedItem) return false;
          return true;
        })
        .map(t => {
          const qty = Number(t.qty || 0);
          const rate = Number(t.rate || 0);
          return {
            date: String(t.date || ''),
            party: String(t.__party || ''),
            itemName: String(t.itemName || ''),
            qty,
            rate,
            total: qty * rate,
          };
        })
        .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

      setItemsDailySaleRateRows(rows);
    } finally {
      setIsItemsDailySaleRateLoading(false);
    }
  };

  const itemsDailySaleRateSummary = useMemo(() => {
    return (itemsDailySaleRateRows || []).reduce((acc, r) => ({
      qty: acc.qty + Number(r.qty || 0),
      total: acc.total + Number(r.total || 0),
    }), { qty: 0, total: 0 });
  }, [itemsDailySaleRateRows]);

  const handleItemsDailySaleRateSendSms = async () => {
    const item = String(itemsDailySaleRateForm.itemName || '').trim();
    const from = String(itemsDailySaleRateForm.fromDate || '');
    const to = String(itemsDailySaleRateForm.toDate || '');
    const msg = [
      'ITEMS DAILY SALE RATE',
      `FROM: ${from}  TO: ${to}`,
      item ? `ITEM: ${item}` : 'ITEM: ALL',
      `TOTAL QTY: ${Number(itemsDailySaleRateSummary.qty || 0).toFixed(2)}`,
      `AMOUNT: ₹${Number(itemsDailySaleRateSummary.total || 0).toFixed(2)}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(msg);
      showNotify('SMS summary copied to clipboard', 'success');
    } catch {
      showNotify('SMS summary prepared', 'success');
    }
  };

  const handleItemsDailySaleRatePrint = async () => {
    setIsItemsDailySaleRatePrinting(true);
    try {
      setGroupPattiPrintData(null);
      setGroupTotalPrintData(null);

      const item = String(itemsDailySaleRateForm.itemName || '').trim();
      const from = String(itemsDailySaleRateForm.fromDate || '');
      const to = String(itemsDailySaleRateForm.toDate || '');
      setItemsDailySaleRatePrintData({
        meta: { from, to, item: item || '' },
        rows: itemsDailySaleRateRows,
        totals: itemsDailySaleRateSummary,
      });
      setTimeout(() => window.print(), 50);
    } catch {
      setIsItemsDailySaleRatePrinting(false);
    }
  };

  const buildGroupPattiReport = async ({ fromDate, toDate, groupName, commissionPct }) => {
    const from = String(fromDate || '');
    const to = String(toDate || '');
    const group = String(groupName || '').trim();
    const pct = Number(commissionPct || 0);

    const groupCustomers = customers.filter(c => c.group === group);
    const rows = await Promise.all(groupCustomers.map(async (cust) => {
      if (!cust?.id) {
        return { customer: cust?.name || '', gross: 0, commission: 0, net: 0, paid: 0, balance: 0 };
      }
      const txns = await api.listTransactions(cust.id);
      const filtered = txns.filter(t => {
        const d = String(t.date || '');
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
      const gross = filtered.reduce((acc, t) => acc + (Number(t.qty || 0) * Number(t.rate || 0)), 0);
      const paid = filtered.reduce((acc, t) => acc + Number(t.paidAmt || 0), 0);
      const commission = (gross * pct) / 100;
      const net = gross - commission;
      return { customer: cust.name, gross, commission, net, paid, balance: net - paid };
    }));

    const totals = rows.reduce((acc, r) => ({
      gross: acc.gross + Number(r.gross || 0),
      commission: acc.commission + Number(r.commission || 0),
      net: acc.net + Number(r.net || 0),
      paid: acc.paid + Number(r.paid || 0),
      balance: acc.balance + Number(r.balance || 0),
    }), { gross: 0, commission: 0, net: 0, paid: 0, balance: 0 });

    return { meta: { from, to, group, pct }, rows, totals };
  };

  const handleGroupPattiPrint = async () => {
    const group = String(groupPattiForm.groupName || '').trim();
    if (!group) return;

    setIsGroupPattiPrinting(true);
    try {
      setGroupTotalPrintData(null);
      const data = await buildGroupPattiReport(groupPattiForm);
      setGroupPattiPrintData(data);
      setTimeout(() => window.print(), 50);
    } catch {
      setIsGroupPattiPrinting(false);
    }
  };

  const buildGroupTotalReport = async ({ fromDate, toDate, groupName }) => {
    const from = String(fromDate || '');
    const to = String(toDate || '');
    const group = String(groupName || '').trim();
    const groupCustomers = customers.filter(c => c.group === group);

    const rows = await Promise.all(groupCustomers.map(async (cust) => {
      if (!cust?.id) {
        return { customer: cust?.name || '', qty: 0, gross: 0, paid: 0, balance: 0 };
      }
      const txns = await api.listTransactions(cust.id);
      const filtered = txns.filter(t => {
        const d = String(t.date || '');
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
      const qty = filtered.reduce((acc, t) => acc + Number(t.qty || 0), 0);
      const gross = filtered.reduce((acc, t) => acc + (Number(t.qty || 0) * Number(t.rate || 0)), 0);
      const paid = filtered.reduce((acc, t) => acc + Number(t.paidAmt || 0), 0);
      return { customer: cust.name, qty, gross, paid, balance: gross - paid };
    }));

    const totals = rows.reduce((acc, r) => ({
      qty: acc.qty + Number(r.qty || 0),
      gross: acc.gross + Number(r.gross || 0),
      paid: acc.paid + Number(r.paid || 0),
      balance: acc.balance + Number(r.balance || 0),
    }), { qty: 0, gross: 0, paid: 0, balance: 0 });

    return { meta: { from, to, group }, rows, totals };
  };

  const handleGroupTotalPrint = async () => {
    const group = String(groupTotalForm.groupName || '').trim();
    if (!group) return;

    setIsGroupTotalPrinting(true);
    try {
      setGroupPattiPrintData(null);
      const data = await buildGroupTotalReport(groupTotalForm);
      setGroupTotalPrintData(data);
      setTimeout(() => window.print(), 50);
    } catch {
      setIsGroupTotalPrinting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [gRows, cRows, catRows, vRows] = await Promise.all([
          api.listGroups(),
          api.listCustomers(),
          api.listCatalog(),
          api.listVehicles(),
        ]);

        if (cancelled) return;
        setGroups(gRows);
        setCustomers(cRows.map(c => ({ id: c.id, group: c.groupName || '', name: c.name, contact: c.contact, address: c.address })));
        setCatalog(catRows);
        setVehicles(vRows);
      } catch (e) {
        showNotify(`Backend not reachable: ${e.message}`, 'error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!customerInfo.customerName) {
        setItems([]);
        return;
      }

      const selected = customers.find(c => c.name === customerInfo.customerName);
      if (!selected?.id) {
        setItems([]);
        return;
      }

      try {
        const rows = await api.listTransactions(selected.id);
        if (cancelled) return;
        setItems(rows.map(r => ({
          id: r.id,
          date: r.date,
          vehicle: r.vehicle,
          itemCode: r.itemCode,
          itemName: r.itemName,
          qty: String(r.qty ?? ''),
          rate: String(r.rate ?? ''),
          laguage: String(r.laguage ?? ''),
          coolie: String(r.coolie ?? ''),
          paidAmt: String(r.paidAmt ?? ''),
          remarks: r.remarks ?? '',
        })));
      } catch (e) {
        showNotify(`Failed to load transactions: ${e.message}`, 'error');
      }
    })();
    return () => { cancelled = true; };
  }, [customerInfo.customerName, customers]);

  const summary = useMemo(() => {
    const totals = items.reduce((acc, item) => {
      const gross = Number(item.qty || 0) * Number(item.rate || 0);
      return { 
        qty: acc.qty + Number(item.qty || 0), 
        itemTotal: acc.itemTotal + gross, 
        paid: acc.paid + Number(item.paidAmt || 0), 
        coolieTotal: acc.coolieTotal + Number(item.coolie || 0), 
        laguageTotal: acc.laguageTotal + (Number(item.laguage || 0) * Number(item.qty || 0)) 
      };
    }, { qty: 0, itemTotal: 0, paid: 0, coolieTotal: 0, laguageTotal: 0 });
    const totalCommission = (totals.itemTotal * Number(commissionPct || 0)) / 100;
    const netTotal = totals.itemTotal - totalCommission - totals.coolieTotal - totals.laguageTotal;
    return { ...totals, totalCommission, netTotal };
  }, [items, commissionPct]);

  const handleAddItem = () => {
    if (!currentEntry.itemName || !currentEntry.qty || currentEntry.rate === '' || currentEntry.rate === null || currentEntry.rate === undefined) {
      return showNotify("Entry incomplete: Enter item, qty and rate", "error");
    }
    const id = currentEntry.id || Date.now();
    if (currentEntry.id) setItems(items.map(i => i.id === id ? { ...currentEntry } : i));
    else setItems([...items, { ...currentEntry, id }]);
    setCurrentEntry({ ...currentEntry, id: null, vehicle: '', itemCode: '', itemName: '', qty: '', rate: '', laguage: '', coolie: '', paidAmt: '', remarks: '' });
    showNotify("Transaction Row Saved", "success");
    return true;
  };

  const [showTMenu, setShowTMenu] = useState(false); const [showUMenu, setShowUMenu] = useState(false); const [showMMenu, setShowMMenu] = useState(false);

  const GroupPattiPrintingPage = () => (
    <div className="flex-1 flex flex-col h-full bg-[#f1f3f5] overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2"><Printer className="w-4 h-4 text-rose-500" /> GROUP PATTI PRINTING</h1>
        <button onClick={() => setActiveSection('daily')} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        <div className="max-w-[720px] mx-auto bg-white border-2 border-slate-300 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-500">From Date</label>
              <input type="date" className="w-full border p-2 text-[11px] font-bold outline-none" value={groupPattiForm.fromDate} onChange={e => setGroupPattiForm({ ...groupPattiForm, fromDate: e.target.value })} />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-500">To Date</label>
              <input type="date" className="w-full border p-2 text-[11px] font-bold outline-none" value={groupPattiForm.toDate} onChange={e => setGroupPattiForm({ ...groupPattiForm, toDate: e.target.value })} />
            </div>
          </div>

          <SearchableSelect label="Group Name" options={groups.map(g => g.name)} value={groupPattiForm.groupName} onChange={(val) => setGroupPattiForm({ ...groupPattiForm, groupName: val })} placeholder="Select group" />

          <div>
            <label className="text-[9px] font-black uppercase text-slate-500">Commission (%)</label>
            <input type="number" className="w-full border p-2 text-[11px] font-bold outline-none text-right" value={groupPattiForm.commissionPct} onChange={e => setGroupPattiForm({ ...groupPattiForm, commissionPct: e.target.value })} />
          </div>

          <div className="flex gap-2">
            <button onClick={handleGroupPattiPrint} disabled={!groupPattiForm.groupName || isGroupPattiPrinting} className="flex-1 bg-slate-800 text-white py-3 font-black uppercase text-[10px] shadow-md disabled:opacity-40">Print</button>
            <button onClick={() => { setIsGroupPattiPrinting(false); setActiveSection('daily'); }} className="flex-1 bg-slate-200 text-slate-800 py-3 font-black uppercase text-[10px] border border-slate-300 shadow-md">Cancel</button>
          </div>

          <div className="text-[10px] font-bold text-slate-500 min-h-[14px]">
            {isGroupPattiPrinting ? 'Printing...' : ''}
          </div>
        </div>
      </div>
    </div>
  );

  const GroupTotalReportPage = () => (
    <div className="flex-1 flex flex-col h-full bg-[#f1f3f5] overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2"><Layers className="w-4 h-4 text-rose-500" /> GROUP TOTAL REPORT</h1>
        <button onClick={() => setActiveSection('daily')} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        <div className="max-w-[720px] mx-auto bg-white border-2 border-slate-300 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-500">From Date</label>
              <input type="date" className="w-full border p-2 text-[11px] font-bold outline-none" value={groupTotalForm.fromDate} onChange={e => setGroupTotalForm({ ...groupTotalForm, fromDate: e.target.value })} />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-slate-500">To Date</label>
              <input type="date" className="w-full border p-2 text-[11px] font-bold outline-none" value={groupTotalForm.toDate} onChange={e => setGroupTotalForm({ ...groupTotalForm, toDate: e.target.value })} />
            </div>
          </div>

          <SearchableSelect label="Group Name" options={groups.map(g => g.name)} value={groupTotalForm.groupName} onChange={(val) => setGroupTotalForm({ ...groupTotalForm, groupName: val })} placeholder="Select group" />

          <div className="flex gap-2">
            <button onClick={handleGroupTotalPrint} disabled={!groupTotalForm.groupName || isGroupTotalPrinting} className="flex-1 bg-slate-800 text-white py-3 font-black uppercase text-[10px] shadow-md disabled:opacity-40">Print</button>
            <button onClick={() => { setIsGroupTotalPrinting(false); setActiveSection('daily'); }} className="flex-1 bg-slate-200 text-slate-800 py-3 font-black uppercase text-[10px] border border-slate-300 shadow-md">Cancel</button>
          </div>

          <div className="text-[10px] font-bold text-slate-500 min-h-[14px]">
            {isGroupTotalPrinting ? 'Printing...' : ''}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden text-slate-900 font-sans">
      <Toast message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: 'info' })} />
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
                <button key={item.id} onClick={() => { setShowTMenu(false); setActiveSection(item.id); }} className={`w-full text-left px-5 py-2.5 text-[11px] font-bold flex items-center gap-3 transition-colors ${activeSection === item.id ? 'bg-rose-600 text-white' : 'hover:bg-rose-600 hover:text-white'}`}><item.i className="w-3.5 h-3.5" /> {item.l}</button>
              ))}
            </div>}
          </div>

          <button onClick={() => { setShowTMenu(false); setShowUMenu(false); setShowMMenu(false); setActiveSection('reports'); }} className={`flex items-center gap-2 px-4 h-full text-[10px] font-black uppercase transition-all ${activeSection === 'reports' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'}`}>Reports</button>

          <div className="relative h-full flex items-center"><button onClick={() => setShowUMenu(!showUMenu)} className={`flex items-center gap-2 px-4 h-full text-[10px] font-black uppercase transition-all ${showUMenu ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-300 hover:text-white'}`}>Utility <ChevronDown className="w-3 h-3" /></button>
            {showUMenu && <div className="absolute top-10 left-0 w-64 bg-white border border-slate-300 shadow-2xl py-1 animate-in slide-in-from-top-2 duration-150 rounded-none overflow-hidden z-[5000]">
              {[ 
                { id: 'group-print', l: 'Group Printing', i: Printer },
                { id: 'group-total', l: 'Group Total Report', i: Layers },
                { id: 'daily-rate-sales', l: 'Daily Rate Wise Sales', i: FileBarChart },
                { id: 'new-supplier', l: 'New Supplier', i: UserCheck },
                { id: 'daily-sale', l: 'Daily Sale', i: Monitor },
                { id: 'sms-single', l: 'SMS Single', i: Send },
                { id: 'supply-details', l: 'Supply Details', i: List },
                { id: 'payment-list', l: 'Payment List', i: WalletCards },
                { id: 'payment-report', l: 'Payment Report', i: BarChart3 },
                { id: 'move-data', l: 'Move Data', i: ArrowRight },
                { id: 'view-data', l: 'View Data', i: Search }
              ].map(item => (
                <button key={item.id} onClick={() => {
                  setShowUMenu(false);
                  if (item.id === 'group-print') {
                    setGroupPattiForm(prev => ({
                      ...prev,
                      groupName: prev.groupName || (groups[0]?.name || ''),
                    }));
                    setActiveSection('group-print');
                    return;
                  }
                  if (item.id === 'group-total') {
                    setGroupTotalForm(prev => ({
                      ...prev,
                      groupName: prev.groupName || (groups[0]?.name || ''),
                    }));
                    setActiveSection('group-total');
                    return;
                  }
                  if (item.id === 'daily-rate-sales') {
                    setItemsDailySaleRateForm(prev => ({
                      ...prev,
                      itemName: '',
                    }));
                    setItemsDailySaleRateRows([]);
                    setIsItemsDailySaleRateOpen(true);
                    return;
                  }
                  if (item.id === 'daily-sale') {
                    setItemsDailySaleRateForm(prev => ({
                      ...prev,
                      itemName: '',
                    }));
                    setItemsDailySaleRateRows([]);
                    setIsItemsDailySaleRateOpen(true);
                    return;
                  }
                  setActiveSection(item.id);
                }} className={`w-full text-left px-5 py-2.5 text-[11px] font-bold flex items-center gap-3 transition-colors ${activeSection === item.id ? 'bg-slate-100 text-slate-900 font-black' : 'hover:bg-slate-100 text-slate-700'}`}><item.i className="w-3.5 h-3.5" /> {item.l}</button>
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

      <div className="flex-1 overflow-hidden flex flex-col bg-slate-100 relative">
        {activeSection === 'daily' && <DailyTransactionsView customerInfo={customerInfo} setCustomerInfo={setCustomerInfo} groups={groups} customers={customers} catalog={catalog} vehicles={vehicles} onOpenQuickAdd={(m) => { if (m === 'item') setActiveSection('item-reg'); else setActiveSection('party'); }} currentEntry={currentEntry} setCurrentEntry={setCurrentEntry} items={items} onAddItem={handleAddItem} onRemoveItem={(id) => setItems(items.filter(i => i.id !== id))} onEditItem={(item) => setCurrentEntry(item)} summary={summary} onSaveRecord={async () => {
          if(!customerInfo.customerName) return showNotify("Transaction save failed: Select client", "error");
          const selected = customers.find(c => c.name === customerInfo.customerName);
          if (!selected?.id) return showNotify("Transaction save failed: Unknown customer", "error");
          try {
            await api.replaceTransactions(selected.id, items.map(i => ({
              date: i.date,
              vehicle: i.vehicle || '',
              itemCode: i.itemCode || '',
              itemName: i.itemName,
              qty: i.qty,
              rate: i.rate,
              laguage: i.laguage,
              coolie: i.coolie,
              paidAmt: i.paidAmt,
              remarks: i.remarks || '',
            })));
            showNotify("Session data synchronized successfully", "success");
          } catch (e) {
            showNotify(`Save failed: ${e.message}`, 'error');
          }
        }} advanceStore={advanceStore} commissionPct={commissionPct} setCommissionPct={setCommissionPct} onViewReport={() => setActiveSection('reports')} />}
        {activeSection === 'group-reg' && <GroupCustomerRegistryForm title="NEW GROUP" initialTab="group" groups={groups} setGroups={setGroups} customers={customers} setCustomers={setCustomers} showNotify={showNotify} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'party' && <GroupCustomerRegistryForm title="PARTY DETAILS" initialTab="customer" groups={groups} setGroups={setGroups} customers={customers} setCustomers={setCustomers} showNotify={showNotify} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'item-reg' && <ItemRegistryForm form={itemForm} setForm={setItemForm} onSave={async () => {
          try {
            const created = await api.createCatalogItem({
              itemCode: itemForm.itemCode,
              itemName: itemForm.itemName,
            });
            setCatalog([...catalog, created]);
            setItemForm({ itemCode: '', itemName: '' });
            showNotify("New product registered successfully", "success");
          } catch (e) {
            showNotify(`Item add failed: ${e.message}`, 'error');
          }
        }} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'advance' && <AdvanceView groups={groups} customers={customers} advanceStore={advanceStore} onSaveAdvance={(n, g, t, d, r) => {
           setAdvanceStore(prev => {
             const ex = prev[n] || { given: 0, deducted: 0, balance: 0, logs: [] };
             const logs = [...ex.logs];
             if (g > 0) logs.push({ type: 'give', val: g, date: d, remarks: r });
             if (t > 0) logs.push({ type: 'deduct', val: t, date: d, remarks: r });
             const newG = ex.given + g; const newT = ex.deducted + t;
             return { ...prev, [n]: { given: newG, deducted: newT, balance: newG - newT, logs } };
           });
           showNotify("Advance Ledger Adjusted", "success");
        }} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'daily-sale' && <DailySaleView customers={customers} catalog={catalog} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'saala' && <SaalaView saalaPeople={saalaPeople} setSaalaPeople={setSaalaPeople} saalaPayments={saalaPayments} setSaalaPayments={setSaalaPayments} onCancel={() => setActiveSection('daily')} showNotify={showNotify} />}
        {activeSection === 'reports' && <ReportsWindow groups={groups} customers={customers} vehicles={vehicles} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'group-total' && <GroupTotalReportPage />}
        {activeSection === 'group-print' && <GroupPattiPrintingPage />}
        {activeSection === 'group-adv' && <GroupAdvanceView groups={groups} customers={customers} advanceStore={advanceStore} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'group-pay' && <GroupPaymentView groups={groups} customers={customers} ledgerStore={ledgerStore} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'sms' && <SmsView customers={customers} ledgerStore={ledgerStore} onCancel={() => setActiveSection('daily')} showNotify={showNotify} />}
        {activeSection === 'sms-single' && <SmsView customers={customers} ledgerStore={ledgerStore} onCancel={() => setActiveSection('daily')} showNotify={showNotify} />}
        {activeSection === 'vehicle' && <VehicleView vehicles={vehicles} setVehicles={setVehicles} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'daily-rate-sales' && <UtilityPlaceholderView title="Daily Rate Wise Sales" onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'new-supplier' && <UtilityPlaceholderView title="New Supplier" onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'supply-details' && <UtilityPlaceholderView title="Supply Details" onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'payment-list' && <UtilityPlaceholderView title="Payment List" onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'payment-report' && <UtilityPlaceholderView title="Payment Report" onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'move-data' && <UtilityPlaceholderView title="Move Data" onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'view-data' && <UtilityPlaceholderView title="View Data" onCancel={() => setActiveSection('daily')} />}
      </div>

      {isItemsDailySaleRateOpen && (
        <div className="fixed inset-0 z-[6500] flex items-center justify-center bg-slate-900/60 p-6">
          <div className="bg-white w-[1100px] h-[650px] border border-slate-400 shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-800 px-3 py-2 text-white flex items-center justify-between shrink-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest">ITEMS DAILY SALE RATE</h3>
              <button onClick={() => { setIsItemsDailySaleRateOpen(false); setIsItemsDailySaleRatePrinting(false); setIsItemsDailySaleRateLoading(false); }} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 border-b border-slate-200 shrink-0">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-5">
                  <label className="text-[9px] font-black uppercase text-slate-500">Item Name</label>
                  <select className="w-full border p-2 text-[11px] font-bold outline-none bg-white" value={itemsDailySaleRateForm.itemName} onChange={e => setItemsDailySaleRateForm({ ...itemsDailySaleRateForm, itemName: e.target.value })}>
                    <option value="">All Items</option>
                    {[...new Set((catalog || []).map(i => i.itemName).filter(Boolean))].map((n) => (
                      <option key={String(n)} value={String(n)}>{String(n)}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[9px] font-black uppercase text-slate-500">From Date</label>
                  <input type="date" className="w-full border p-2 text-[11px] font-bold outline-none" value={itemsDailySaleRateForm.fromDate} onChange={e => setItemsDailySaleRateForm({ ...itemsDailySaleRateForm, fromDate: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-black uppercase text-slate-500">To Date</label>
                  <input type="date" className="w-full border p-2 text-[11px] font-bold outline-none" value={itemsDailySaleRateForm.toDate} onChange={e => setItemsDailySaleRateForm({ ...itemsDailySaleRateForm, toDate: e.target.value })} />
                </div>

                <div className="col-span-3 flex gap-2">
                  <button onClick={loadItemsDailySaleRate} disabled={isItemsDailySaleRateLoading} className="flex-1 bg-slate-800 text-white py-3 font-black uppercase text-[10px] shadow-md disabled:opacity-40">Go</button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-4 bg-slate-50">
              <div className="h-full bg-white border border-slate-300 overflow-auto">
                <table className="w-full border-collapse text-[11px]">
                  <thead className="bg-slate-200 sticky top-0 z-10 uppercase text-[9px] font-black">
                    <tr>
                      <th className="border border-slate-300 p-2 w-14 text-center">Sl.No</th>
                      <th className="border border-slate-300 p-2 w-28 text-center">Date</th>
                      <th className="border border-slate-300 p-2">Party</th>
                      <th className="border border-slate-300 p-2">Item Name</th>
                      <th className="border border-slate-300 p-2 w-24 text-right">Qty</th>
                      <th className="border border-slate-300 p-2 w-24 text-right">Rate</th>
                      <th className="border border-slate-300 p-2 w-28 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(itemsDailySaleRateRows || []).map((r, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="border border-slate-200 p-2 text-center text-slate-500 font-bold">{idx + 1}</td>
                        <td className="border border-slate-200 p-2 text-center font-bold">{String(r.date)}</td>
                        <td className="border border-slate-200 p-2 font-bold text-slate-800">{String(r.party)}</td>
                        <td className="border border-slate-200 p-2 font-bold">{String(r.itemName)}</td>
                        <td className="border border-slate-200 p-2 text-right font-black">{Number(r.qty || 0).toFixed(2)}</td>
                        <td className="border border-slate-200 p-2 text-right font-black">{Number(r.rate || 0).toFixed(2)}</td>
                        <td className="border border-slate-200 p-2 text-right font-black">{Number(r.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 18 - (itemsDailySaleRateRows || []).length) }).map((_, i) => (
                      <tr key={`empty-${i}`} className="h-[32px]">
                        <td className="border border-slate-200 p-2">&nbsp;</td>
                        <td className="border border-slate-200 p-2">&nbsp;</td>
                        <td className="border border-slate-200 p-2">&nbsp;</td>
                        <td className="border border-slate-200 p-2">&nbsp;</td>
                        <td className="border border-slate-200 p-2">&nbsp;</td>
                        <td className="border border-slate-200 p-2">&nbsp;</td>
                        <td className="border border-slate-200 p-2">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-200 bg-white shrink-0">
              <div className="flex items-center justify-between gap-4">
                <button onClick={handleItemsDailySaleRateSendSms} className="bg-slate-800 text-white px-5 py-2 font-black uppercase text-[10px] shadow-md">Send SMS</button>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-600 uppercase">TOTAL QUANTITY</span>
                    <input readOnly className="w-28 bg-slate-100 p-1 text-[12px] font-black text-right outline-none" value={Number(itemsDailySaleRateSummary.qty || 0).toFixed(2)} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-600 uppercase">AMOUNT TOTAL</span>
                    <input readOnly className="w-40 bg-rose-600 text-white p-1 text-[14px] font-black text-right outline-none" value={`₹ ${Number(itemsDailySaleRateSummary.total || 0).toFixed(2)}`} />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={handleItemsDailySaleRatePrint} disabled={isItemsDailySaleRatePrinting || isItemsDailySaleRateLoading} className="bg-slate-800 text-white px-6 py-2 font-black uppercase text-[10px] shadow-md disabled:opacity-40">Print</button>
                    <button onClick={() => { setIsItemsDailySaleRateOpen(false); setIsItemsDailySaleRatePrinting(false); }} className="bg-slate-200 text-slate-800 px-6 py-2 font-black uppercase text-[10px] border border-slate-300 shadow-md">Cancel</button>
                  </div>
                </div>
              </div>

              <div className="mt-1 text-[10px] font-bold text-slate-500 min-h-[14px]">
                {isItemsDailySaleRateLoading ? 'Loading...' : (isItemsDailySaleRatePrinting ? 'Printing...' : '')}
              </div>
            </div>
          </div>
        </div>
      )}

      <div id="group-patti-print-area" className="hidden">
        {groupPattiPrintData && (
          <div className="p-8 font-sans">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[16px] font-black uppercase">Group Patti Report</div>
                <div className="text-[12px] font-bold">Group: {String(groupPattiPrintData.meta.group)}</div>
                <div className="text-[12px] font-bold">From: {String(groupPattiPrintData.meta.from)}  To: {String(groupPattiPrintData.meta.to)}</div>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-bold">Commission: {String(groupPattiPrintData.meta.pct)}%</div>
                <div className="text-[11px]">{new Date().toLocaleDateString()}</div>
              </div>
            </div>

            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="border border-black p-2 text-left">Customer</th>
                  <th className="border border-black p-2 text-right">Gross</th>
                  <th className="border border-black p-2 text-right">Commission</th>
                  <th className="border border-black p-2 text-right">Net</th>
                  <th className="border border-black p-2 text-right">Paid</th>
                  <th className="border border-black p-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {groupPattiPrintData.rows.map((r, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-2">{String(r.customer)}</td>
                    <td className="border border-black p-2 text-right">₹{Number(r.gross || 0).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">₹{Number(r.commission || 0).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">₹{Number(r.net || 0).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">₹{Number(r.paid || 0).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">₹{Number(r.balance || 0).toFixed(2)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-black p-2 font-black text-right">TOTAL</td>
                  <td className="border border-black p-2 text-right font-black">₹{Number(groupPattiPrintData.totals.gross || 0).toFixed(2)}</td>
                  <td className="border border-black p-2 text-right font-black">₹{Number(groupPattiPrintData.totals.commission || 0).toFixed(2)}</td>
                  <td className="border border-black p-2 text-right font-black">₹{Number(groupPattiPrintData.totals.net || 0).toFixed(2)}</td>
                  <td className="border border-black p-2 text-right font-black">₹{Number(groupPattiPrintData.totals.paid || 0).toFixed(2)}</td>
                  <td className="border border-black p-2 text-right font-black">₹{Number(groupPattiPrintData.totals.balance || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div id="group-total-print-area" className="hidden">
        {groupTotalPrintData && (
          <div className="p-8 font-sans">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[16px] font-black uppercase">Group Total Report</div>
                <div className="text-[12px] font-bold">Group: {String(groupTotalPrintData.meta.group)}</div>
                <div className="text-[12px] font-bold">From: {String(groupTotalPrintData.meta.from)}  To: {String(groupTotalPrintData.meta.to)}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px]">{new Date().toLocaleDateString()}</div>
              </div>
            </div>

            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="border border-black p-2 text-left">Customer</th>
                  <th className="border border-black p-2 text-right">Qty</th>
                  <th className="border border-black p-2 text-right">Gross</th>
                  <th className="border border-black p-2 text-right">Paid</th>
                  <th className="border border-black p-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {groupTotalPrintData.rows.map((r, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-2">{String(r.customer)}</td>
                    <td className="border border-black p-2 text-right">{Number(r.qty || 0).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">₹{Number(r.gross || 0).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">₹{Number(r.paid || 0).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">₹{Number(r.balance || 0).toFixed(2)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-black p-2 font-black text-right">TOTAL</td>
                  <td className="border border-black p-2 text-right font-black">{Number(groupTotalPrintData.totals.qty || 0).toFixed(2)}</td>
                  <td className="border border-black p-2 text-right font-black">₹{Number(groupTotalPrintData.totals.gross || 0).toFixed(2)}</td>
                  <td className="border border-black p-2 text-right font-black">₹{Number(groupTotalPrintData.totals.paid || 0).toFixed(2)}</td>
                  <td className="border border-black p-2 text-right font-black">₹{Number(groupTotalPrintData.totals.balance || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div id="items-daily-sale-rate-print-area" className="hidden">
        {itemsDailySaleRatePrintData && (
          <div className="p-8 font-sans">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[16px] font-black uppercase">ITEMS DAILY SALE RATE</div>
                <div className="text-[12px] font-bold">From: {String(itemsDailySaleRatePrintData.meta.from)}  To: {String(itemsDailySaleRatePrintData.meta.to)}</div>
                <div className="text-[12px] font-bold">Item: {itemsDailySaleRatePrintData.meta.item ? String(itemsDailySaleRatePrintData.meta.item) : 'ALL'}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px]">{new Date().toLocaleDateString()}</div>
              </div>
            </div>

            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="border border-black p-2 text-center">Sl.No</th>
                  <th className="border border-black p-2 text-center">Date</th>
                  <th className="border border-black p-2 text-left">Party</th>
                  <th className="border border-black p-2 text-left">Item Name</th>
                  <th className="border border-black p-2 text-right">Qty</th>
                  <th className="border border-black p-2 text-right">Rate</th>
                  <th className="border border-black p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {itemsDailySaleRatePrintData.rows.map((r, idx) => (
                  <tr key={idx}>
                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                    <td className="border border-black p-2 text-center">{String(r.date)}</td>
                    <td className="border border-black p-2">{String(r.party)}</td>
                    <td className="border border-black p-2">{String(r.itemName)}</td>
                    <td className="border border-black p-2 text-right">{Number(r.qty || 0).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">{Number(r.rate || 0).toFixed(2)}</td>
                    <td className="border border-black p-2 text-right">{Number(r.total || 0).toFixed(2)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="border border-black p-2 font-black text-right" colSpan={4}>TOTAL</td>
                  <td className="border border-black p-2 text-right font-black">{Number(itemsDailySaleRatePrintData.totals.qty || 0).toFixed(2)}</td>
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2 text-right font-black">{Number(itemsDailySaleRatePrintData.totals.total || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className="h-7 bg-slate-900 border-t border-black/50 text-slate-500 font-mono text-[9px] px-4 flex items-center justify-between uppercase tracking-tighter shrink-0 shadow-2xl"><span>SECURE ERP CLOUD — <span className="text-emerald-500 font-black">CORE_SERVICE_OK</span> — v5.0.4</span><span>{new Date().toLocaleTimeString()}</span></footer>
      <style dangerouslySetInnerHTML={{ __html: `input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } ::-webkit-scrollbar { width: 4px; height: 4px; } ::-webkit-scrollbar-thumb { background: #334155; } ::-webkit-scrollbar-thumb:hover { background: #e11d48; } .custom-table-scroll:focus { outline: none; } @media print { body * { visibility: hidden !important; } #group-patti-print-area, #group-patti-print-area * { visibility: visible !important; } #group-total-print-area, #group-total-print-area * { visibility: visible !important; } #items-daily-sale-rate-print-area, #items-daily-sale-rate-print-area * { visibility: visible !important; } #group-patti-print-area, #group-total-print-area, #items-daily-sale-rate-print-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; } }` }} />
    </div>
  );
}