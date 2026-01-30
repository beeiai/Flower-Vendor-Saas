import React, { useState, useMemo, useEffect, useRef } from 'react';
import useAuth from './hooks/useAuth';
import AuthTabs from './components/shared/AuthTabs';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useEnterController } from './hooks/useEnterController';
import { useERPEnterNavigation } from './hooks/useERPEnterNavigation';
import MasterAdminDashboard from './components/admin/MasterAdminDashboard';
import { Flower2, Receipt, FolderPlus, PackagePlus, Users, Plus, Trash2, Save, UserPlus, Check, X, ChevronDown, Calculator, Sparkles, Monitor, Database, Activity, ArrowRight, Truck, Clock, List, ChevronLeft, ChevronRight, Info, AlertCircle, CheckCircle2, XCircle, Printer, Search, Edit2, MessageSquare, FileText, LayoutPanelTop, BarChart3, Settings2, Play, MoreHorizontal, WalletCards, UserCheck, History, Landmark, ArrowDownToLine, ArrowUpFromLine, Coins, ArrowDownRight, ArrowUpRight, FileBarChart, Layers, Send, Smartphone } from 'lucide-react';
import SearchableSelect from './components/shared/SearchableSelect';
import DailyTransactionsView from './components/transactions/DailyTransactionsView';
import Toast from './components/shared/Toast';
import { api } from './utils/api';
import ReportsWindow from './components/reports/ReportsView';
import DailySaleView from './components/reports/DailySaleView';
import PartyDetailsView from './components/utility/PartyDetailsView';
import AdvanceTrackerView from './components/utility/AdvanceTrackerView';
import { SilkSummaryView } from './components/utility/SilkSummaryView';
import SaalaView from './components/saala/SaalaView';
import SmsView from './components/utility/SmsView';
import { DEFAULT_STATES, resetComponentState } from './utils/stateManager';

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
      
      // Return focus to group name input field
      setTimeout(() => {
        document.querySelector('input[placeholder="Enter group name"]')?.focus();
      }, 100);
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
      setCustForm({ groupName: custForm.groupName, name: '', contact: '', address: '' });
      showNotify?.('Customer added successfully', 'success');
      
      // Return focus to customer name input field (keep group selection)
      setTimeout(() => {
        document.querySelector('input[placeholder="Enter customer name"]')?.focus();
      }, 100);
    } catch (e) {
      showNotify?.(`Customer add failed: ${e.message}`, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      <div className="bg-slate-800 px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wide"><FolderPlus className="w-5 h-5 text-primary-400" /> {String(title)}</h1>
        <button data-action="secondary" onClick={onCancel} className="p-1.5 rounded hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        <div className="max-w-[760px] mx-auto bg-white border border-slate-200 shadow-card rounded-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex gap-3">
            <button type="button" onClick={() => setTab('group')} className={`px-5 h-10 text-sm font-semibold uppercase border rounded-sm transition-all ${tab === 'group' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100 hover:border-slate-400'}`} data-enter-index="0">Group Addition</button>
            <button type="button" onClick={() => setTab('customer')} className={`px-5 h-10 text-sm font-semibold uppercase border rounded-sm transition-all ${tab === 'customer' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100 hover:border-slate-400'}`} data-enter-index="0">Customer Addition</button>
          </div>

          <div className="p-5">
        {tab === 'group' && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-600 tracking-wide block mb-1.5">Group Name</label>
              <input type="text" className="w-full border border-slate-300 rounded-sm px-3 py-2.5 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" style={{height: '42px'}} value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Enter group name" data-enter-index="1" />
            </div>
            <button data-action="primary" onClick={addGroup} className="w-full bg-primary-600 text-white py-3 font-semibold uppercase text-sm shadow-md hover:bg-primary-700 rounded-sm transition-all" style={{height: '44px'}} data-enter-index="2">Add Group</button>
          </div>
        )}

        {tab === 'customer' && (
          <div className="space-y-5">
            <SearchableSelect label="Target Group" options={groups.map(g => g.name)} value={custForm.groupName} onChange={(val) => setCustForm({ ...custForm, groupName: val })} placeholder="Select group" data-enter-index="1" />
            <div>
              <label className="text-xs font-semibold uppercase text-slate-600 tracking-wide block mb-1.5">Customer Name</label>
              <input type="text" className="w-full border border-slate-300 rounded-sm px-3 py-2.5 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" style={{height: '42px'}} value={custForm.name} onChange={e => setCustForm({ ...custForm, name: e.target.value })} placeholder="Enter customer name" data-enter-index="2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-600 tracking-wide block mb-1.5">Phone</label>
                <input type="text" className="w-full border border-slate-300 rounded-sm px-3 py-2.5 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" style={{height: '42px'}} value={custForm.contact} onChange={e => setCustForm({ ...custForm, contact: e.target.value })} placeholder="Phone number" data-enter-index="3" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-600 tracking-wide block mb-1.5">Address</label>
                <input type="text" className="w-full border border-slate-300 rounded-sm px-3 py-2.5 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" style={{height: '42px'}} value={custForm.address} onChange={e => setCustForm({ ...custForm, address: e.target.value })} placeholder="Address" data-enter-index="4" />
              </div>
            </div>
            <button data-action="primary" onClick={addCustomer} className="w-full bg-primary-600 text-white py-3 font-semibold uppercase text-sm shadow-md hover:bg-primary-700 rounded-sm transition-all" style={{height: '44px'}} data-enter-index="5">Add Customer</button>
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
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      <div className="bg-slate-800 px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wide"><PackagePlus className="w-5 h-5 text-primary-400" /> NEW ITEM</h1>
        <button data-action="secondary" onClick={onCancel} className="p-1.5 rounded hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-6 flex-1 overflow-auto">
        <div className="max-w-[560px] mx-auto bg-white border border-slate-200 shadow-card rounded-sm p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-600 tracking-wide block mb-1.5">Code</label>
            <input type="text" className="w-full border border-slate-300 rounded-sm px-3 py-2.5 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" style={{height: '42px'}} value={form.itemCode} onChange={e => setForm({ ...form, itemCode: e.target.value })} placeholder="Enter item code" data-enter-index="1" />
          </div>
          <div><label className="text-xs font-semibold uppercase text-slate-600 tracking-wide block mb-1.5">Product Name</label><input type="text" className="w-full border border-slate-300 rounded-sm px-3 py-2.5 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" style={{height: '42px'}} value={form.itemName} onChange={e => setForm({...form, itemName: e.target.value})} placeholder="Enter product name" data-enter-index="2" /></div>
          <button data-action="primary" onClick={onSave} className="w-full bg-emerald-600 text-white py-3 font-semibold uppercase text-sm shadow-md hover:bg-emerald-700 rounded-sm transition-all" style={{height: '44px'}} data-enter-index="3">Add to Inventory</button>
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
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      <div className="bg-slate-800 px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wide"><WalletCards className="w-5 h-5 text-primary-400" /> GROUP WISE ADVANCE</h1>
        <button data-action="secondary" onClick={onCancel} className="p-1.5 rounded hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 flex-1 overflow-auto">
        <table className="w-full bg-white border border-slate-200 shadow-card text-sm text-left rounded-sm overflow-hidden">
          <thead className="bg-slate-50 sticky top-0 uppercase font-semibold text-xs z-10 border-b border-slate-200">
            <tr><th className="px-4 py-3.5 text-slate-600">Group Name</th><th className="px-4 py-3.5 text-center text-slate-600">Customers</th><th className="px-4 py-3.5 text-right text-slate-600">Advance Aggregate</th></tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3.5 font-semibold text-slate-800">{String(r.name)}</td>
                <td className="px-4 py-3.5 text-center text-slate-500">{String(r.count)}</td>
                <td className="px-4 py-3.5 text-right font-bold text-emerald-600">₹{r.balance.toLocaleString()}</td>
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
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      <div className="bg-slate-800 px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wide"><Coins className="w-5 h-5 text-primary-400" /> GROUP WISE PAYMENT</h1>
        <button data-action="secondary" onClick={onCancel} className="p-1.5 rounded hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 flex-1 overflow-auto">
        <table className="w-full bg-white border border-slate-200 shadow-card text-sm text-left rounded-sm overflow-hidden">
          <thead className="bg-slate-50 sticky top-0 uppercase font-semibold text-xs z-10 border-b border-slate-200">
            <tr><th className="px-4 py-3.5 text-slate-600">Group Name</th><th className="px-4 py-3.5 text-center text-slate-600">Customers</th><th className="px-4 py-3.5 text-right text-slate-600">Payment Aggregate</th></tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3.5 font-semibold text-slate-800">{String(r.name)}</td>
                <td className="px-4 py-3.5 text-center text-slate-500">{String(r.count)}</td>
                <td className="px-4 py-3.5 text-right font-bold text-primary-600">₹{r.paid.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



function UtilityPlaceholderView({ title, onCancel }) {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      <div className="bg-slate-800 px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wide"><Settings2 className="w-5 h-5 text-primary-400" /> {String(title)}</h1>
        <button data-action="secondary" onClick={onCancel} className="p-1.5 rounded hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-6 flex-1 overflow-auto">
        <div className="max-w-[720px] mx-auto bg-white border border-slate-200 shadow-card rounded-sm p-8">
          <div className="text-sm font-medium text-slate-600">This screen is not implemented yet.</div>
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
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      <div className="bg-slate-800 px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wide"><Activity className="w-5 h-5 text-primary-400" /> GROUP TOTAL REPORT</h1>
        <button data-action="secondary" onClick={onCancel} className="p-1.5 rounded hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 flex-1 overflow-auto">
        <table className="w-full bg-white border border-slate-200 shadow-card text-sm text-left rounded-sm overflow-hidden">
          <thead className="bg-slate-50 sticky top-0 uppercase text-xs font-semibold z-10 border-b border-slate-200">
            <tr><th className="px-4 py-3.5 text-slate-600">Group Name</th><th className="px-4 py-3.5 text-center text-slate-600">Customers</th><th className="px-4 py-3.5 text-right text-slate-600">Total Qty</th><th className="px-4 py-3.5 text-right text-slate-600">Gross Value</th><th className="px-4 py-3.5 text-right text-emerald-700">Total Paid</th><th className="px-4 py-3.5 text-right text-accent-600">Net Dues</th></tr>
          </thead>
          <tbody>
            {reportData.map((row, idx) => (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3.5 font-semibold text-slate-800">{String(row.groupName)}</td><td className="px-4 py-3.5 text-center text-slate-500">{String(row.custCount)}</td><td className="px-4 py-3.5 text-right font-bold">{String(row.qtyTotal)}</td><td className="px-4 py-3.5 text-right font-bold">₹{row.grossTotal.toLocaleString()}</td><td className="px-4 py-3.5 text-right font-bold text-emerald-600">₹{row.paidTotal.toLocaleString()}</td><td className="px-4 py-3.5 text-right font-bold text-accent-600 bg-accent-50/30">₹{row.balance.toLocaleString()}</td>
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
    if (!selGroup) return;
    
    setIsPrinting(true);
    try {
      // Get the selected group ID
      const selectedGroup = groups.find(g => g.name === selGroup);
      if (!selectedGroup) {
        throw new Error('Group not found');
      }
      
      // Generate the print report from backend
      const response = await api.getGroupPattiReport(
        selectedGroup.id,
        fromDate,
        toDate,
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
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      <div className="bg-slate-800 px-5 py-3 flex justify-between items-center text-white shadow-lg shrink-0">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wide"><Printer className="w-5 h-5 text-primary-400" /> GROUP PRINTING</h1>
        <button data-action="secondary" onClick={onCancel} className="p-1.5 rounded hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-5 overflow-hidden">
        <section className="bg-white border border-slate-200 p-5 shadow-card rounded-sm shrink-0">
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-4">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">From Date</label>
              <input type="date" className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm font-medium" style={{height: '36px'}} value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="col-span-4">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">To Date</label>
              <input type="date" className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm font-medium" style={{height: '36px'}} value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="col-span-4">
              <SearchableSelect label="Group Name" options={groups.map(g => g.name)} value={selGroup} onChange={setSelGroup} placeholder="Select group" />
            </div>

            <div className="col-span-4">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Commission (%)</label>
              <input type="number" className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm font-medium text-right" style={{height: '36px'}} value={commissionPct} onChange={e => setCommissionPct(e.target.value)} />
            </div>

            <div className="col-span-8 flex items-end gap-3">
              <button data-action="secondary" onClick={handlePrint} disabled={!selGroup || isPrinting} className="bg-slate-800 text-white px-8 font-semibold uppercase text-sm flex items-center gap-2 shadow-md disabled:opacity-40 rounded-sm transition-all hover:bg-slate-700" style={{height: '40px'}}><Printer className="w-4 h-4" /> Print</button>
              <button data-action="secondary" onClick={onCancel} className="bg-white text-slate-700 px-8 font-semibold uppercase text-sm border border-slate-300 shadow-sm rounded-sm transition-all hover:bg-slate-50" style={{height: '40px'}}>Cancel</button>
            </div>
          </div>

          <div className="mt-3 text-sm font-medium text-slate-500 min-h-[20px]">
            {isPrinting ? 'Printing...' : ''}
          </div>
        </section>

        <div className="flex-1 border border-slate-200 overflow-auto p-8 font-serif shadow-card bg-white rounded-sm">
          {(!selGroup || printData.length === 0) ? (
            <div className="text-center text-slate-400 mt-20 font-sans text-base">Select group and click Print to generate patti report</div>
          ) : (
            <div className="space-y-12 max-w-3xl mx-auto font-sans">
              {printData.map((p, i) => (
                <div key={i} className="border-b-2 border-dashed border-slate-200 pb-12 last:border-0">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold uppercase text-slate-800">{String(p.name)}</h2>
                      <p className="text-slate-500 text-sm mt-1">{String(p.address)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-sans font-semibold uppercase text-slate-400">Patti Report</p>
                      <p className="text-slate-600 text-sm mt-1">{String(fromDate)} to {String(toDate)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 border border-slate-300 rounded-sm overflow-hidden">
                    <div className="p-4 border-r border-slate-200 bg-slate-50"><p className="text-xs uppercase font-sans font-semibold text-slate-500">Gross</p><p className="text-xl font-bold mt-1">₹{Number(p.gross || 0).toLocaleString()}</p></div>
                    <div className="p-4 border-r border-slate-200 bg-slate-50"><p className="text-xs uppercase font-sans font-semibold text-slate-500">Commission</p><p className="text-xl font-bold mt-1">₹{Number(p.commission || 0).toLocaleString()}</p></div>
                    <div className="p-4 border-r border-slate-200 bg-slate-50"><p className="text-xs uppercase font-sans font-semibold text-slate-500">Net</p><p className="text-xl font-bold mt-1">₹{Number(p.net || 0).toLocaleString()}</p></div>
                    <div className="p-4 border-r border-slate-200 bg-slate-50"><p className="text-xs uppercase font-sans font-semibold text-slate-500">Paid</p><p className="text-xl font-bold mt-1 text-emerald-600">₹{Number(p.paid || 0).toLocaleString()}</p></div>
                    <div className="p-4 bg-accent-50"><p className="text-xs uppercase font-sans font-semibold text-accent-600">Balance</p><p className="text-xl font-bold mt-1 text-accent-600">₹{Number(p.balance || 0).toLocaleString()}</p></div>
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
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      <div className="bg-slate-800 px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-lg"><h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wide"><Truck className="w-5 h-5 text-primary-400" /> EXTRA VEHICLE MANAGEMENT</h1><button data-action="secondary" onClick={onCancel} className="p-1.5 rounded hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button></div>
      <div className="flex-1 flex p-5 gap-5 overflow-hidden">
        <div className="w-80 bg-white border border-slate-200 p-5 shadow-card rounded-sm h-fit">
          <h3 className="text-sm font-semibold uppercase text-slate-600 mb-5 tracking-wide flex items-center gap-2"><Truck className="w-4 h-4 text-slate-400" /> Add Vehicle</h3>
          <div className="space-y-5">
            <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wide block mb-1.5">Vehicle Name / Plate</label><input type="text" className="w-full border border-slate-300 rounded-sm px-3 py-2.5 text-sm font-medium outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" style={{height: '42px'}} value={newVehicle} onChange={e => setNewVehicle(e.target.value)} placeholder="Enter vehicle name or plate" data-enter-index="1" /></div>
            <button data-action="primary" onClick={handleAdd} className="w-full bg-slate-800 text-white py-3 font-semibold uppercase text-sm hover:bg-primary-600 transition-all rounded-sm shadow-sm" style={{height: '44px'}} data-enter-index="2">Register</button>
          </div>
        </div>
        <div className="flex-1 bg-white border border-slate-200 shadow-card rounded-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-semibold text-sm uppercase text-slate-600 tracking-wide">Registry List</div>
          <div className="flex-1 overflow-auto"><table className="w-full text-left text-sm">
              <thead className="bg-slate-50 sticky top-0 uppercase text-xs font-semibold border-b border-slate-200"><tr><th className="px-4 py-3.5 text-slate-600">Vehicle Description</th><th className="px-4 py-3.5 text-right text-slate-600">Action</th></tr></thead>
              <tbody>{vehicles.map(v => (
                <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{String(v.name)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <button onClick={async () => { await api.deleteVehicle(v.id); setVehicles(vehicles.filter(x => x.id !== v.id)); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1" data-enter-index={3 + v.id}><Trash2 className="w-4 h-4"/></button>
                  </td>
                </tr>
              ))}</tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}



// --- MAIN APPLICATION SHELL ---

export default function App() {
  const auth = useAuth();
  const { registerElement, unregisterElement } = useKeyboardNavigation();
  
  // Check if user is master admin
  const isMasterAdmin = localStorage.getItem('skfs_master_admin') === 'true';
  
  // NOTE: Global Enter key blocker has been removed to allow proper keyboard navigation
  
  if (!auth.authenticated) {
    return <AuthTabs />;
  }
  
  // Show master admin dashboard if master admin is logged in
  if (isMasterAdmin) {
    return <MasterAdminDashboard onLogout={() => {
      localStorage.removeItem('skfs_auth_token');
      localStorage.removeItem('skfs_master_admin');
      window.location.reload();
    }} />;
  }
  const [activeSection, setActiveSection] = useState('daily');
  const [notification, setNotification] = useState({ message: '', type: 'info' });
  const [itemForm, setItemForm] = useState({ itemCode: '', itemName: '' });
  
  // Track previous section to detect navigation changes
  const prevActiveSectionRef = useRef(activeSection);

  const [groupPattiForm, setGroupPattiForm] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    groupName: '',
    commissionPct: 12,
  });
  const [isGroupPattiPrinting, setIsGroupPattiPrinting] = useState(false);

  const [groupTotalForm, setGroupTotalForm] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    groupName: '',
  });
  const [isGroupTotalPrinting, setIsGroupTotalPrinting] = useState(false);

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
  const groupRef = useRef(null);
  const prevAuthenticatedRef = useRef(auth.authenticated);

  // Redirect to daily section after login
  useEffect(() => {
    // Only redirect if user just became authenticated (transition from false to true)
    if (auth.authenticated && !prevAuthenticatedRef.current) {
      setActiveSection('daily');
    }
    prevAuthenticatedRef.current = auth.authenticated;
  }, [auth.authenticated]);

  const showNotify = (m, t = 'info') => { setNotification({ message: m, type: t }); setTimeout(() => setNotification({ message: '', type: 'info' }), 3000); };

  useEffect(() => {
    const handleAfter = () => {
      setIsItemsDailySaleRatePrinting(false);
    };
    window.addEventListener('afterprint', handleAfter);
    return () => window.removeEventListener('afterprint', handleAfter);
  }, []);


  // Close all dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const navElement = document.querySelector('nav');
      if (navElement && !navElement.contains(event.target)) {
        setShowTMenu(false);
        setShowUMenu(false);
        setShowMMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update previous section ref
  useEffect(() => {
    prevActiveSectionRef.current = activeSection;
  }, [activeSection]);
  
  // Register navigation elements for keyboard navigation
  useEffect(() => {
    // Register main navigation buttons
    if (navRefs.logo.current) registerElement('nav-logo', navRefs.logo.current, { order: 0 });
    if (navRefs.transactionMenu.current) registerElement('nav-transaction', navRefs.transactionMenu.current, { order: 1 });
    if (navRefs.reportsButton.current) registerElement('nav-reports', navRefs.reportsButton.current, { order: 2 });
    if (navRefs.utilityMenu.current) registerElement('nav-utility', navRefs.utilityMenu.current, { order: 3 });
    if (navRefs.moreMenu.current) registerElement('nav-more', navRefs.moreMenu.current, { order: 4 });
    
    return () => {
      unregisterElement('nav-logo');
      unregisterElement('nav-transaction');
      unregisterElement('nav-reports');
      unregisterElement('nav-utility');
      unregisterElement('nav-more');
    };
  }, [registerElement, unregisterElement]);
  
  // Register DailyTransactionsView elements when active
  useEffect(() => {
    if (activeSection === 'daily') {
      // Give time for the component to render
      setTimeout(() => {
        // The DailyTransactionsView should register its own elements
        // through the useKeyboardNavigation hook in the component
      }, 100);
    }
  }, [activeSection]);
  
  // Reset component states when navigating to a new section
  useEffect(() => {
    const prevSection = prevActiveSectionRef.current;
    
    // Only reset if we're actually changing sections (not initial render)
    if (prevSection !== activeSection && prevSection) {
      // Reset various component states based on the section being left
      switch (prevSection) {
        case 'daily':
          // Reset daily transaction state
          setCustomerInfo(DEFAULT_STATES.dailyTransaction.customerInfo);
          setCurrentEntry(DEFAULT_STATES.dailyTransaction.currentEntry);
          setItems(DEFAULT_STATES.dailyTransaction.items);
          setCommissionPct(DEFAULT_STATES.dailyTransaction.commissionPct);
          break;
        case 'reports':
          // Reset reports state when leaving
          break;
        case 'daily-sale':
          // DailySaleView manages its own state reset
          break;
        case 'group-print':
          // Reset group patti form
          setGroupPattiForm(DEFAULT_STATES.groupPattiForm);
          break;
        case 'group-total':
          // Reset group total form
          setGroupTotalForm(DEFAULT_STATES.groupTotalForm);
          break;
        case 'daily-rate-sales':
          // Reset items daily sale rate form
          setItemsDailySaleRateForm(DEFAULT_STATES.itemsDailySaleRateForm);
          setItemsDailySaleRateRows([]);
          setIsItemsDailySaleRateOpen(false);
          break;
        case 'sms':
        case 'sms-single':
          // Reset SMS view state - the component handles its own state
          break;
        default:
          break;
      }
    }
  }, [activeSection, setCustomerInfo, setCurrentEntry, setItems, setCommissionPct, 
      setGroupPattiForm, setGroupTotalForm, setItemsDailySaleRateForm, 
      setItemsDailySaleRateRows, setIsItemsDailySaleRateOpen]);

  // Close dropdowns when navigating to a new section
  useEffect(() => {
    setShowTMenu(false);
    setShowUMenu(false);
    setShowMMenu(false);
  }, [activeSection]);

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
      // Handle error silently
    }
  };

  const handleGroupPattiPrint = async () => {
    const group = String(groupPattiForm.groupName || '').trim();
    if (!group) return;

    setIsGroupPattiPrinting(true);
    try {
      // Get the selected group ID
      const selectedGroup = groups.find(g => g.name === group);
      if (!selectedGroup) {
        throw new Error('Group not found');
      }
      
      // Generate the print report from backend
      const response = await api.getGroupPattiReport(
        selectedGroup.id,
        groupPattiForm.fromDate,
        groupPattiForm.toDate,
        groupPattiForm.commissionPct
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

  const handleGroupTotalPrint = async () => {
    const group = String(groupTotalForm.groupName || '').trim();
    if (!group) return;

    setIsGroupTotalPrinting(true);
    try {
      // Get the selected group ID
      const selectedGroup = groups.find(g => g.name === group);
      if (!selectedGroup) {
        throw new Error('Group not found');
      }
      
      // Generate the print report from backend
      const response = await api.getGroupTotalReport(
        selectedGroup.id,
        groupTotalForm.fromDate,
        groupTotalForm.toDate
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Only fetch data if authenticated
      if (!auth.authenticated) return;
        
      try {
        const [gRows, cRows, catRows, vRows] = await Promise.all([
          api.listGroups(),
          api.listCustomers(),
          api.listCatalog(),
          api.listVehicles(),
        ]);
  
        if (cancelled) return;
        const groupData = Array.isArray(gRows) ? gRows : (gRows?.items || []);
        const customerData = Array.isArray(cRows) ? cRows : (cRows?.items || []);
        const catalogData = Array.isArray(catRows) ? catRows : (catRows?.items || []);
        const vehicleData = Array.isArray(vRows) ? vRows : (vRows?.items || []);
                
        console.log('Fetched data:', { groups: groupData, customers: customerData, catalog: catalogData, vehicles: vehicleData });
        
        setGroups(groupData);
        const mappedCustomers = customerData.map(c => ({ id: c.id, group: c.groupName || '', name: c.name, contact: c.contact, address: c.address }));
        setCustomers(mappedCustomers);
        setCatalog(catalogData);
        setVehicles(vehicleData);
  
        // hydrate advanceStore from backend logs (used in Daily + Reports)
        const advancePairs = await Promise.all(
          mappedCustomers.map(async (cust) => {
            if (!cust?.id) return [cust?.name || '', { given: 0, deducted: 0, balance: 0 }];
            try {
              const summary = await api.getCustomerAdvances(cust.id);
              return [cust.name, { given: Number(summary?.given || 0), deducted: Number(summary?.deducted || 0), balance: Number(summary?.balance || 0) }];
            } catch {
              return [cust.name, { given: 0, deducted: 0, balance: 0 }];
            }
          })
        );
        if (cancelled) return;
        const nextAdvanceStore = {};
        for (const [name, val] of advancePairs) {
          if (!name) continue;
          nextAdvanceStore[name] = val;
        }
        setAdvanceStore(nextAdvanceStore);
      } catch (e) {
        console.error('Data fetch error:', e);
        showNotify(`Backend not reachable: ${e.message}`, 'error');
      }
    })();
    return () => { cancelled = true; };
  }, [auth.authenticated]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Only fetch data if authenticated
      if (!auth.authenticated || !customerInfo.customerName) {
        setItems([]);
        return;
      }

      const selected = customers.find(c => c.name === customerInfo.customerName);
      if (!selected?.id) {
        setItems([]);
        return;
      }

      try {
        // Only fetch today's transactions for the daily transaction view
        const today = new Date().toISOString().split('T')[0];
        const rows = await api.listTransactions(selected.id);
        // Filter to only include today's transactions
        const todayRows = rows.filter(r => r.date === today);
        if (cancelled) return;
        setItems(todayRows.map(r => ({
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
  }, [auth.authenticated, customerInfo.customerName, customers]);

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

  // Calculate total paid amount separately
  const totalPaidAmount = useMemo(() => {
    return items.reduce((total, item) => total + Number(item.paidAmt || 0), 0);
  }, [items]);

  const handleAddItem = async () => {
    if (!currentEntry.itemName || !currentEntry.qty || currentEntry.rate === '' || currentEntry.rate === null || currentEntry.rate === undefined) {
      return showNotify("Entry incomplete: Enter item, qty and rate", "error");
    }
    
    try {
      // Check if we're updating an existing item (has an id from the backend)
      let result;
      if (currentEntry.id && typeof currentEntry.id === 'number') {
        // Update existing transaction
        result = await api.updateCollectionItem(currentEntry.id, {
          date: currentEntry.date,
          vehicle: currentEntry.vehicle || '',
          itemCode: currentEntry.itemCode || '',
          itemName: currentEntry.itemName,
          qty: currentEntry.qty,
          rate: currentEntry.rate,
          labour_per_kg: currentEntry.laguage,
          coolie_cost: currentEntry.coolie,
          paid_amount: currentEntry.paidAmt,
          remarks: currentEntry.remarks || '',
        });
        setItems(items.map(i => i.id === currentEntry.id ? { ...result } : i));
        showNotify("Transaction Updated Successfully", "success");
      } else {
        // Create new transaction - need customer/farmer id
        const customerId = customers.find(c => c.name === customerInfo.customerName)?.id;
        if (!customerId) {
          return showNotify("Please select a customer first", "error");
        }
        
        // Create new transaction
        result = await api.createFarmerTransaction(customerId, {
          date: currentEntry.date,
          vehicle: currentEntry.vehicle || '',
          itemCode: currentEntry.itemCode || '',
          itemName: currentEntry.itemName,
          qty: currentEntry.qty,
          rate: currentEntry.rate,
          laguage: currentEntry.laguage,
          coolie: currentEntry.coolie,
          paidAmt: currentEntry.paidAmt,
          remarks: currentEntry.remarks || '',
        });
        setItems([...items, { ...result }]);
        showNotify("Transaction Added Successfully", "success");
      }
      
      // Reset form
      setCurrentEntry({ 
        date: new Date().toISOString().split('T')[0], 
        vehicle: '', 
        itemCode: '', 
        itemName: '', 
        qty: '', 
        rate: '', 
        laguage: '', 
        coolie: '', 
        paidAmt: '', 
        remarks: '' 
      });
      
      // Return focus to group selection field
      setTimeout(() => {
        groupRef.current?.focus();
      }, 100);
      
      return true;
    } catch (error) {
      showNotify(`Transaction save failed: ${error.message}`, "error");
      return false;
    }
  };

  const [showTMenu, setShowTMenu] = useState(false); const [showUMenu, setShowUMenu] = useState(false); const [showMMenu, setShowMMenu] = useState(false);
  
  // Navigation refs for keyboard navigation
  const navRefs = {
    logo: useRef(null),
    transactionMenu: useRef(null),
    reportsButton: useRef(null),
    utilityMenu: useRef(null),
    moreMenu: useRef(null)
  };

  const GroupPattiPrintingPage = () => (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="bg-slate-800 px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-base font-semibold flex items-center gap-2"><Printer className="w-5 h-5 text-primary-400" /> Group Patti Printing</h1>
        <button onClick={() => setActiveSection('daily')} className="p-1.5 hover:bg-slate-700 rounded transition-colors"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        <div className="max-w-[720px] mx-auto bg-white border border-slate-200 shadow-card rounded-sm p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">From Date</label>
              <input type="date" className="w-full border border-slate-300 px-3 text-sm font-medium rounded-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" style={{ height: '40px' }} value={groupPattiForm.fromDate} onChange={e => setGroupPattiForm({ ...groupPattiForm, fromDate: e.target.value })} data-enter-index="1" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">To Date</label>
              <input type="date" className="w-full border border-slate-300 px-3 text-sm font-medium rounded-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" style={{ height: '40px' }} value={groupPattiForm.toDate} onChange={e => setGroupPattiForm({ ...groupPattiForm, toDate: e.target.value })} data-enter-index="2" />
            </div>
          </div>

          <SearchableSelect label="Group Name" options={groups.map(g => g.name)} value={groupPattiForm.groupName} onChange={(val) => setGroupPattiForm({ ...groupPattiForm, groupName: val })} placeholder="Select group" data-enter-index="3" />

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Commission (%)</label>
            <input type="number" className="w-full border border-slate-300 px-3 text-sm font-medium rounded-sm outline-none text-right focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" style={{ height: '40px' }} value={groupPattiForm.commissionPct} onChange={e => setGroupPattiForm({ ...groupPattiForm, commissionPct: e.target.value })} data-enter-index="4" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleGroupPattiPrint} disabled={!groupPattiForm.groupName || isGroupPattiPrinting} className="flex-1 bg-primary-600 text-white py-3 font-semibold text-sm rounded-sm shadow-md disabled:opacity-40 hover:bg-primary-700 transition-colors" data-enter-index="5">Print</button>
            <button onClick={() => { setIsGroupPattiPrinting(false); setActiveSection('daily'); }} className="flex-1 bg-slate-100 text-slate-700 py-3 font-semibold text-sm border border-slate-300 rounded-sm shadow-sm hover:bg-slate-200 transition-colors" data-enter-index="6">Cancel</button>
          </div>

          <div className="text-sm font-medium text-slate-500 min-h-[20px]">
            {isGroupPattiPrinting ? 'Printing...' : ''}
          </div>
        </div>
      </div>
    </div>
  );

  const GroupTotalReportPage = () => (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="bg-slate-800 px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-base font-semibold flex items-center gap-2"><Layers className="w-5 h-5 text-primary-400" /> Group Total Report</h1>
        <button onClick={() => setActiveSection('daily')} className="p-1.5 hover:bg-slate-700 rounded transition-colors"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        <div className="max-w-[720px] mx-auto bg-white border border-slate-200 shadow-card rounded-sm p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">From Date</label>
              <input type="date" className="w-full border border-slate-300 px-3 text-sm font-medium rounded-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" style={{ height: '40px' }} value={groupTotalForm.fromDate} onChange={e => setGroupTotalForm({ ...groupTotalForm, fromDate: e.target.value })} data-enter-index="1" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">To Date</label>
              <input type="date" className="w-full border border-slate-300 px-3 text-sm font-medium rounded-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" style={{ height: '40px' }} value={groupTotalForm.toDate} onChange={e => setGroupTotalForm({ ...groupTotalForm, toDate: e.target.value })} data-enter-index="2" />
            </div>
          </div>

          <SearchableSelect label="Group Name" options={groups.map(g => g.name)} value={groupTotalForm.groupName} onChange={(val) => setGroupTotalForm({ ...groupTotalForm, groupName: val })} placeholder="Select group" data-enter-index="3" />

          <div className="flex gap-3 pt-2">
            <button onClick={handleGroupTotalPrint} disabled={!groupTotalForm.groupName || isGroupTotalPrinting} className="flex-1 bg-primary-600 text-white py-3 font-semibold text-sm rounded-sm shadow-md disabled:opacity-40 hover:bg-primary-700 transition-colors" data-enter-index="4">Print</button>
            <button onClick={() => { setIsGroupTotalPrinting(false); setActiveSection('daily'); }} className="flex-1 bg-slate-100 text-slate-700 py-3 font-semibold text-sm border border-slate-300 rounded-sm shadow-sm hover:bg-slate-200 transition-colors" data-enter-index="5">Cancel</button>
          </div>

          <div className="text-sm font-medium text-slate-500 min-h-[20px]">
            {isGroupTotalPrinting ? 'Printing...' : ''}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden text-slate-900 font-sans">
      <Toast message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: 'info' })} />
      <nav className="h-12 bg-slate-900 flex items-center px-5 shrink-0 z-[4000] border-b border-black/50 shadow-2xl navbar-element" data-navbar-element>
        <div className="flex items-center gap-6 h-full">
          <div ref={navRefs.logo} className="flex items-center gap-2 pr-6 border-r border-slate-700 cursor-pointer h-full navbar-element" onClick={() => setActiveSection('daily')} data-navbar-element><Flower2 className="w-5 h-5 text-primary-400" /><span className="text-sm font-bold text-white tracking-wide">SKFS ERP</span><span className="text-xs text-slate-400 font-medium">v5.0.4</span></div>
          
          <div className="relative h-full flex items-center"><button ref={navRefs.transactionMenu} onClick={() => setShowTMenu(!showTMenu)} className={`flex items-center gap-2 px-4 h-full text-xs font-semibold transition-all ${showTMenu ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-300 hover:text-white'} navbar-element`} data-navbar-element>Transaction <ChevronDown className="w-3.5 h-3.5" /></button>
            {showTMenu && <div className="absolute top-12 left-0 w-56 bg-white border border-slate-200 shadow-dropdown py-1 animate-in slide-in-from-top-2 duration-150 rounded-sm overflow-hidden z-[5000]">
              {[ 
                { id: 'daily', l: 'Daily Transaction', i: Receipt }, 
                { id: 'group-reg', l: 'New Group', i: FolderPlus }, 
                { id: 'item-reg', l: 'New Item', i: PackagePlus },
                { id: 'party', l: 'Party Details', i: Users },
                { id: 'vehicle', l: 'Extra Vehicle', i: Truck }
              ].map(item => (
                <button key={item.id} onClick={() => { setShowTMenu(false); setActiveSection(item.id); }} className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === item.id ? 'bg-primary-600 text-white' : 'text-slate-700 hover:bg-primary-50 hover:text-primary-700'} navbar-element`} data-navbar-element><item.i className="w-4 h-4" /> {item.l}</button>
              ))}
            </div>}
          </div>

          <button ref={navRefs.reportsButton} onClick={() => { setShowTMenu(false); setShowUMenu(false); setShowMMenu(false); setActiveSection('reports'); }} className={`flex items-center gap-2 px-4 h-full text-xs font-semibold transition-all ${activeSection === 'reports' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'} navbar-element`} data-navbar-element>Reports</button>

          <div className="relative h-full flex items-center"><button ref={navRefs.utilityMenu} onClick={() => setShowUMenu(!showUMenu)} className={`flex items-center gap-2 px-4 h-full text-xs font-semibold transition-all ${showUMenu ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-300 hover:text-white'} navbar-element`} data-navbar-element>Utility <ChevronDown className="w-3.5 h-3.5" /></button>
            {showUMenu && <div className="absolute top-12 left-0 w-64 bg-white border border-slate-200 shadow-dropdown py-1 animate-in slide-in-from-top-2 duration-150 rounded-sm overflow-hidden z-[5000]">
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
                    setActiveSection('daily-sale');
                    return;
                  }
                  setActiveSection(item.id);
                }} className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === item.id ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'} navbar-element`} data-navbar-element><item.i className="w-4 h-4" /> {item.l}</button>
              ))}
            </div>}
          </div>

          <div className="relative h-full flex items-center"><button ref={navRefs.moreMenu} onClick={() => setShowMMenu(!showMMenu)} className={`flex items-center gap-2 px-4 h-full text-xs font-semibold transition-all ${showMMenu ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-300 hover:text-white'} navbar-element`} data-navbar-element>More <ChevronDown className="w-3.5 h-3.5" /></button>
            {showMMenu && <div className="absolute top-12 left-0 w-52 bg-white border border-slate-200 shadow-dropdown py-1 animate-in slide-in-from-top-2 duration-150 rounded-sm overflow-hidden z-[5000]">
              {[ { id: 'advance', l: 'Advance', i: WalletCards }, { id: 'saala', l: 'Saala (Credit)', i: Landmark }, { id: 'silk', l: 'Silk', i: Layers } ].map(item => (
                <button key={item.id} onClick={() => { setShowMMenu(false); setActiveSection(item.id); }} className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-3 transition-colors ${activeSection === item.id ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'} navbar-element`} data-navbar-element><item.i className="w-4 h-4" /> {item.l}</button>
              ))}
            </div>}
          </div>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden flex flex-col bg-slate-100 relative">
        {activeSection === 'daily' && <DailyTransactionsView groupRef={groupRef} customerInfo={customerInfo} setCustomerInfo={setCustomerInfo} groups={groups} customers={customers} catalog={catalog} vehicles={vehicles} onOpenQuickAdd={(m) => { if (m === 'item') setActiveSection('item-reg'); else setActiveSection('party'); }} currentEntry={currentEntry} setCurrentEntry={setCurrentEntry} items={items} onAddItem={handleAddItem} onRemoveItem={async (id) => {
            try {
              await api.deleteCollectionItem(id);
              setItems(items.filter(i => i.id !== id));
              showNotify("Transaction deleted successfully", "success");
            } catch (error) {
              showNotify(`Delete failed: ${error.message}`, "error");
            }
          }} onEditItem={(item) => setCurrentEntry(item)} summary={summary} onSaveRecord={async () => {
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
            
            // Reload data from backend to ensure consistency
            const updatedItems = await api.listTransactions(selected.id);
            setItems(updatedItems.map(r => ({
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
            
            showNotify("Session data synchronized successfully", "success");
            
            // Clear customer selection and return focus to group field
            setCustomerInfo({ groupName: '', customerName: '', address: '', contactNo: '' });
            setCurrentEntry({ date: new Date().toISOString().split('T')[0], vehicle: '', itemCode: '', itemName: '', qty: '', rate: '', laguage: '', coolie: '', paidAmt: '', remarks: '' });
            setItems([]);
            
            // Return focus to group selection field
            setTimeout(() => {
              // Small delay to ensure state updates propagate to the UI
              setTimeout(() => {
                groupRef.current?.focus();
              }, 50);
            }, 100);
          } catch (e) {
            showNotify(`Save failed: ${e.message}`, 'error');
          }
        }} advanceStore={advanceStore} commissionPct={commissionPct} setCommissionPct={setCommissionPct} onViewReport={() => setActiveSection('reports')} totalPaidAmount={totalPaidAmount} activeSection={activeSection} />}
        {activeSection === 'group-reg' && <GroupCustomerRegistryForm title="NEW GROUP" initialTab="group" groups={groups} setGroups={setGroups} customers={customers} setCustomers={setCustomers} showNotify={showNotify} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'party' && <PartyDetailsView customers={customers} showNotify={showNotify} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'item-reg' && <ItemRegistryForm form={itemForm} setForm={setItemForm} onSave={async () => {
          try {
            const created = await api.createCatalogItem({
              itemCode: itemForm.itemCode,
              itemName: itemForm.itemName,
            });
            setCatalog([...catalog, created]);
            setItemForm({ itemCode: '', itemName: '' });
            showNotify("New product registered successfully", "success");
            
            // Return focus to item code input field
            setTimeout(() => {
              document.querySelector('input[placeholder="Enter item code"]')?.focus();
            }, 100);
          } catch (e) {
            showNotify(`Item add failed: ${e.message}`, 'error');
          }
        }} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'advance' && <AdvanceTrackerView groups={groups} customers={customers} advanceStore={advanceStore} setAdvanceStore={setAdvanceStore} showNotify={showNotify} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'daily-sale' && <DailySaleView onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'saala' && <SaalaView catalog={catalog} onCancel={() => setActiveSection('daily')} showNotify={showNotify} />}
        {activeSection === 'silk' && <SilkSummaryView ledgerStore={ledgerStore} customers={customers} onCancel={() => setActiveSection('daily')} />}
        {activeSection === 'reports' && <ReportsWindow groups={groups} customers={customers} vehicles={vehicles} advanceStore={advanceStore} onCancel={() => setActiveSection('daily')} />}
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
      <style dangerouslySetInnerHTML={{ __html: `input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } ::-webkit-scrollbar { width: 4px; height: 4px; } ::-webkit-scrollbar-thumb { background: #334155; } ::-webkit-scrollbar-thumb:hover { background: #e11d48; } .custom-table-scroll:focus { outline: none; } @media print { body * { visibility: hidden !important; } #items-daily-sale-rate-print-area, #items-daily-sale-rate-print-area * { visibility: visible !important; } #items-daily-sale-rate-print-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; } }` }} />
    </div>
  );
}