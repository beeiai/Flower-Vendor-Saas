import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Users, X, Save } from 'lucide-react';
import { DEFAULT_STATES, resetComponentState } from '../../utils/stateManager';

function customerKey(c) {
  return c?.id != null ? String(c.id) : String(c?.name || '');
}

export default function PartyDetailsView({ customers = [], onCancel, showNotify }) {
  const [state, setState] = useState(DEFAULT_STATES.partyDetails);
  
  const {
    selectedKeys,
    smsByKey,
    selectedGroup
  } = state;
  
  // Functions to update individual state properties
  const setSelectedKeys = useCallback((value) => {
    setState(prev => ({ ...prev, selectedKeys: value }));
  }, []);
  
  const setSmsByKey = useCallback((value) => {
    setState(prev => ({ ...prev, smsByKey: value }));
  }, []);
  
  const setSelectedGroup = useCallback((value) => {
    setState(prev => ({ ...prev, selectedGroup: value }));
  }, []);

  // Initialize state with defaults, ignoring any stored values
  useEffect(() => {
    // Always start with clean state, no localStorage persistence
    const nextSelected = new Set();
    const nextSms = {};
    
    // Initialize SMS settings to default (true) for all customers
    for (const c of customers) {
      const key = customerKey(c);
      nextSms[key] = true; // default to YES for all customers
    }

    setSelectedKeys(nextSelected);
    setSmsByKey(nextSms);
  }, [customers]);

  const groupOptions = useMemo(() => {
    const set = new Set((customers || []).map(c => String(c?.group || '')).filter(Boolean));
    return ['All Groups', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [customers]);

  const visibleCustomers = useMemo(() => {
    if (selectedGroup === 'All Groups') return customers;
    return (customers || []).filter(c => String(c?.group || '') === String(selectedGroup));
  }, [customers, selectedGroup]);

  const allSelected = useMemo(() => {
    if (!visibleCustomers.length) return false;
    return visibleCustomers.every(c => selectedKeys.has(customerKey(c)));
  }, [visibleCustomers, selectedKeys]);

  const toggleSelectAll = () => {
    const visibleKeys = visibleCustomers.map(customerKey).filter(Boolean);
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (allSelected) {
        for (const k of visibleKeys) next.delete(k);
      } else {
        for (const k of visibleKeys) next.add(k);
      }
      return next;
    });
  };

  const toggleRowSelected = (key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSms = (key) => {
    setSmsByKey(prev => ({
      ...prev,
      [key]: !Boolean(prev[key]),
    }));
  };

  const handleSave = () => {
    // Show notification but don't save to localStorage
    showNotify?.('Party selection saved temporarily', 'success');
  };

  // Reset state when component unmounts or is cancelled
  useEffect(() => {
    return () => {
      // Reset to default state when component unmounts
      setState(DEFAULT_STATES.partyDetails);
    };
  }, []);

  const handleCancel = () => {
    // Reset state before cancelling
    setState(DEFAULT_STATES.partyDetails);
    onCancel && onCancel();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-xl rounded-b-xl">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wider"><Users className="w-5 h-5 text-white" /> PARTY DETAILS</h1>
        <button onClick={handleCancel} className="p-1.5 rounded-lg hover:bg-white/20 transition-all"><X className="w-5 h-5" /></button>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="bg-white border border-slate-200 shadow-lg rounded-2xl p-4 shrink-0 max-w-md">
          <div>
            <label className="text-xs font-bold uppercase text-slate-600 tracking-widest block mb-2">Group</label>
            <div className="relative">
              <select
                className="w-full border border-rose-200 rounded-lg px-4 py-3 text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all appearance-none"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                data-enter-index="1"
              >
                {groupOptions.map(g => (
                  <option key={String(g)} value={String(g)}>{String(g)}</option>
                ))}
              </select>
              <div className="absolute right-3 top-4 text-rose-400 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-slate-200 shadow-lg rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] sticky top-0 text-white uppercase font-bold text-xs z-10 border-b-2 shadow-lg">
              <tr>
                <th className="px-4 py-3 w-12 text-center">✓</th>
                <th className="px-4 py-3 w-16">Sl No</th>
                <th className="px-4 py-3">Party Name</th>
                <th className="px-4 py-3 w-48">Phone No</th>
                <th className="px-4 py-3 w-28 text-center">SMS</th>
                <th className="px-4 py-3 w-28 text-center">Ledger</th>
              </tr>
            </thead>
            <tbody>
              {visibleCustomers.map((c, idx) => {
                const key = customerKey(c);
                const checked = selectedKeys.has(key);
                const smsEnabled = Boolean(smsByKey[key] ?? true);

                return (
                  <tr key={key || idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group" data-enter-index={4 + idx}>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRowSelected(key)}
                        className="h-4 w-4 rounded border-slate-300 text-[#5B55E6] focus:ring-[#5B55E6]/20"
                        data-enter-index={4 + idx}
                      />
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{String(c?.name || '')}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{String(c?.contact || '')}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSms(key)}
                        className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-all ${smsEnabled ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-600 shadow-md hover:from-emerald-600 hover:to-emerald-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 hover:shadow-sm'}`}
                      >
                        {smsEnabled ? 'YES' : 'NO'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">YES</span>
                    </td>
                  </tr>
                );
              })}

              {!visibleCustomers.length && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 text-sm font-medium italic tracking-wide">No parties found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between bg-white border border-slate-200 shadow-lg rounded-2xl p-4">
          <label className="flex items-center gap-3 text-xs font-bold uppercase text-slate-600 tracking-wider">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-slate-300 text-[#5B55E6] focus:ring-[#5B55E6]/20" data-enter-index="2" />
            Select All
          </label>

          <button onClick={handleSave} className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-sm flex items-center gap-2 shadow-lg hover:from-[#4A44D0] hover:to-[#3A34C0] transition-all hover:shadow-xl active:translate-y-0.5" data-enter-index="3">
            <Save className="w-4 h-4" /> SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
