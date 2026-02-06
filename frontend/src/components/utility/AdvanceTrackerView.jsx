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
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-xl rounded-b-xl">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wider"><WalletCards className="w-5 h-5 text-white" /> ADVANCE TRACKER</h1>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/20 transition-all" data-enter-index="6"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4 overflow-hidden">
        {/* ALL FILTERS IN ONE LINE */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg shrink-0 backdrop-blur-sm">
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-2">
              <label className="text-[9px] font-black uppercase text-slate-600 mb-1 block tracking-wider">Group</label>
              <div className="relative">
                <select
                  className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 appearance-none"
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
            </div>

            <div className="col-span-2">
              <label className="text-[9px] font-black uppercase text-slate-600 mb-1 block tracking-wider">Customer</label>
              <div className="relative">
                <select
                  className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 appearance-none disabled:bg-slate-100 disabled:text-slate-400"
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

            <div className="col-span-2">
              <label className="text-[9px] font-black uppercase text-slate-600 mb-1 block tracking-wider">Given</label>
              <input
                type="number"
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none text-right transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-slate-100 disabled:text-slate-400"
                value={givenInput}
                onChange={e => setGivenInput(e.target.value)}
                disabled={!selectedCustomer?.id}
                data-enter-index="3"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[9px] font-black uppercase text-slate-600 mb-1 block tracking-wider">Deducted</label>
              <input
                type="number"
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none text-right transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-slate-100 disabled:text-slate-400"
                value={deductedInput}
                onChange={e => setDeductedInput(e.target.value)}
                disabled={!selectedCustomer?.id}
                data-enter-index="4"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[9px] font-black uppercase text-slate-600 mb-1 block tracking-wider">Remaining</label>
              <input
                type="text"
                readOnly
                className="w-full bg-gradient-to-r from-rose-50 to-rose-100 border-2 border-rose-200 rounded-lg p-2 text-xs font-black text-right text-rose-700 cursor-not-allowed shadow-inner"
                value={`₹ ${previewRemaining.toFixed(2)}`}
              />
            </div>

            <div className="col-span-2 flex justify-end items-end">
              <button
                onClick={handleSave}
                disabled={!selectedCustomer?.id || saving}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-2 font-black uppercase text-[9px] rounded-lg shadow-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 tracking-wider"
                data-enter-index="5"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? 'SAVING' : 'SAVE'}
              </button>
            </div>
          </div>
        </div>

        {/* ADVANCE TABLE */}
        <div className="flex-1 bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-lg">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] sticky top-0 text-white uppercase font-bold text-xs z-10 border-b-2 border-black/20 shadow-lg">
              <tr>
                <th className="p-3.5 w-16 border-r border-black/20">Sl No</th>
                <th className="p-3.5 border-r border-black/20">Group Name</th>
                <th className="p-3.5 border-r border-black/20">Party Name</th>
                <th className="p-3.5 w-36 text-right border-r border-black/20">Given</th>
                <th className="p-3.5 w-36 text-right border-r border-black/20">Deducted</th>
                <th className="p-3.5 w-36 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, idx) => (
                <tr key={`${r.group}-${r.name}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50 transition-all duration-150">
                  <td className="p-3.5 font-bold text-slate-700 border-r border-slate-100">{idx + 1}</td>
                  <td className="p-3.5 font-bold text-slate-800 border-r border-slate-100">{r.group}</td>
                  <td className="p-3.5 font-bold text-slate-800 border-r border-slate-100">{r.name}</td>
                  <td className="p-3.5 text-right font-black text-slate-700 border-r border-slate-100">₹{r.given.toFixed(2)}</td>
                  <td className="p-3.5 text-right font-black text-slate-700 border-r border-slate-100">₹{r.deducted.toFixed(2)}</td>
                  <td className="p-3.5 text-right font-black text-rose-600">₹{r.remaining.toFixed(2)}</td>
                </tr>
              ))}

              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-slate-500 text-sm font-bold">
                    Select customer to view advance
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
