import React, { useEffect, useMemo, useState } from 'react';
import { WalletCards, X, Save } from 'lucide-react';
import { api } from '../../utils/api';

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function AdvanceTrackerView({ groups = [], customers = [], advanceStore = {}, setAdvanceStore, onCancel, showNotify }) {
  const [groupName, setGroupName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [givenInput, setGivenInput] = useState('');
  const [deductedInput, setDeductedInput] = useState('');
  const [saving, setSaving] = useState(false);

  const groupOptions = useMemo(() => {
    const fromGroups = (groups || []).map(g => String(g.name || '')).filter(Boolean);
    if (fromGroups.length) return fromGroups;
    const fromCustomers = Array.from(new Set((customers || []).map(c => String(c.group || '')).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    return fromCustomers;
  }, [groups, customers]);

  const filteredCustomers = useMemo(() => {
    if (!groupName) return [];
    return (customers || []).filter(c => String(c.group || '') === String(groupName));
  }, [customers, groupName]);

  useEffect(() => {
    if (groupName) return;
    if (groupOptions.length) setGroupName(groupOptions[0]);
  }, [groupName, groupOptions]);

  useEffect(() => {
    if (!groupName) {
      if (customerName) setCustomerName('');
      return;
    }
    const stillValid = filteredCustomers.some(c => c.name === customerName);
    if (!stillValid) setCustomerName(filteredCustomers[0]?.name || '');
  }, [groupName, filteredCustomers, customerName]);

  const selectedCustomer = useMemo(() => {
    if (!customerName) return null;
    return (customers || []).find(c => c.name === customerName) || null;
  }, [customers, customerName]);

  const current = advanceStore?.[customerName] || { given: 0, deducted: 0, balance: 0 };

  const previewGiven = toNum(current.given) + toNum(givenInput);
  const previewDeducted = toNum(current.deducted) + toNum(deductedInput);
  const previewRemaining = previewGiven - previewDeducted;

  const handleSave = async () => {
    if (!selectedCustomer?.id) {
      showNotify?.('Advance save failed: Select customer', 'error');
      return;
    }

    const give = toNum(givenInput);
    const deduct = toNum(deductedInput);

    if (give <= 0 && deduct <= 0) {
      showNotify?.('Advance save failed: Enter given or deducted', 'error');
      return;
    }

    setSaving(true);
    try {
      const date = todayISO();
      if (give > 0) await api.addCustomerAdvance(selectedCustomer.id, { type: 'give', val: give, date, remarks: '' });
      if (deduct > 0) await api.addCustomerAdvance(selectedCustomer.id, { type: 'deduct', val: deduct, date, remarks: '' });

      const summary = await api.getCustomerAdvances(selectedCustomer.id);
      setAdvanceStore?.(prev => ({
        ...prev,
        [selectedCustomer.name]: {
          given: toNum(summary?.given),
          deducted: toNum(summary?.deducted),
          balance: toNum(summary?.balance),
        },
      }));

      setGivenInput('');
      setDeductedInput('');
      showNotify?.('Advance saved', 'success');
    } catch (e) {
      showNotify?.(`Advance save failed: ${e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const tableRows = useMemo(() => {
    if (!selectedCustomer?.name) return [];
    const c = selectedCustomer;
    const a = advanceStore?.[c.name] || { given: 0, deducted: 0, balance: 0 };
    return [
      {
        group: String(c.group || ''),
        name: String(c.name || ''),
        given: toNum(a.given),
        deducted: toNum(a.deducted),
        remaining: toNum(a.balance),
      },
    ];
  }, [selectedCustomer, advanceStore]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f1f3f5] overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2"><WalletCards className="w-4 h-4 text-rose-500" /> ADVANCE</h1>
        <button onClick={onCancel} className="p-1 hover:bg-rose-600" data-enter-index="6"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3 overflow-hidden">
        {/* TOP SELECTION SECTION */}
        <div className="bg-white border border-slate-300 p-3 shadow-sm shrink-0">
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-4">
              <label className="text-[9px] font-black uppercase text-slate-500">Group Selection</label>
              <select
                className="w-full border p-2 text-[11px] font-bold outline-none bg-white"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                data-enter-index="1"
              >
                <option value="">Select group</option>
                {groupOptions.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="col-span-4">
              <label className="text-[9px] font-black uppercase text-slate-500">Customer Selection</label>
              <select
                className="w-full border p-2 text-[11px] font-bold outline-none bg-white"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                disabled={!groupName}
                data-enter-index="2"
              >
                <option value="">Select customer</option>
                {filteredCustomers.map(c => (
                  <option key={String(c.id ?? c.name)} value={String(c.name || '')}>{String(c.name || '')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ADVANCE INPUT SECTION */}
        <div className="bg-white border border-slate-300 p-3 shadow-sm shrink-0">
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-3">
              <label className="text-[9px] font-black uppercase text-slate-500">Advance Given</label>
              <input
                type="number"
                className="w-full border p-2 text-[11px] font-bold outline-none text-right"
                value={givenInput}
                onChange={e => setGivenInput(e.target.value)}
                disabled={!selectedCustomer?.id}
                data-enter-index="3"
              />
            </div>

            <div className="col-span-3">
              <label className="text-[9px] font-black uppercase text-slate-500">Advance Deducted</label>
              <input
                type="number"
                className="w-full border p-2 text-[11px] font-bold outline-none text-right"
                value={deductedInput}
                onChange={e => setDeductedInput(e.target.value)}
                disabled={!selectedCustomer?.id}
                data-enter-index="4"
              />
            </div>

            <div className="col-span-3">
              <label className="text-[9px] font-black uppercase text-slate-500">Remaining Advance</label>
              <input
                type="text"
                readOnly
                className="w-full bg-slate-50 border p-2 text-[11px] font-black text-right text-rose-600 cursor-not-allowed"
                value={`₹ ${previewRemaining.toFixed(2)}`}
              />
            </div>

            <div className="col-span-3 flex justify-end">
              <button
                onClick={handleSave}
                disabled={!selectedCustomer?.id || saving}
                className="bg-emerald-600 text-white px-10 h-9 rounded-none font-black uppercase text-[10px] flex items-center gap-2 hover:bg-emerald-700 shadow-lg disabled:opacity-40"
                data-enter-index="5"
              >
                <Save className="w-3.5 h-3.5" /> SAVE
              </button>
            </div>
          </div>
        </div>

        {/* ADVANCE TABLE */}
        <div className="flex-1 bg-white border-2 border-slate-300 overflow-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-200 sticky top-0 uppercase font-black text-[9px] z-10 border-b-2 border-slate-400">
              <tr>
                <th className="p-3 w-14">Sl No</th>
                <th className="p-3">Group Name</th>
                <th className="p-3">Party Name</th>
                <th className="p-3 w-32 text-right">Given</th>
                <th className="p-3 w-32 text-right">Deducted</th>
                <th className="p-3 w-32 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, idx) => (
                <tr key={`${r.group}-${r.name}-${idx}`} className="border-b hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-700">{idx + 1}</td>
                  <td className="p-3 font-bold text-slate-800">{r.group}</td>
                  <td className="p-3 font-bold text-slate-800">{r.name}</td>
                  <td className="p-3 text-right font-black text-slate-700">₹{r.given.toFixed(2)}</td>
                  <td className="p-3 text-right font-black text-slate-700">₹{r.deducted.toFixed(2)}</td>
                  <td className="p-3 text-right font-black text-rose-600">₹{r.remaining.toFixed(2)}</td>
                </tr>
              ))}

              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">Select customer to view advance</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
