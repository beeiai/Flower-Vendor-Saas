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
    <div className="flex-1 flex flex-col h-full bg-[#f1f3f5] overflow-hidden">
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2"><Users className="w-4 h-4 text-rose-500" /> PARTY DETAILS</h1>
        <button onClick={handleCancel} className="p-1 hover:bg-rose-600"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="bg-white border border-slate-300 p-3 shrink-0">
          <div className="max-w-[360px]">
            <label className="text-[9px] font-black uppercase text-slate-500">Group</label>
            <select
              className="w-full border p-2 text-[11px] font-bold outline-none bg-white"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              {groupOptions.map(g => (
                <option key={String(g)} value={String(g)}>{String(g)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 bg-white border-2 border-slate-300 overflow-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-200 sticky top-0 uppercase font-black text-[9px] z-10 border-b-2 border-slate-400">
              <tr>
                <th className="p-3 w-10 text-center">✓</th>
                <th className="p-3 w-14">Sl No</th>
                <th className="p-3">Party Name</th>
                <th className="p-3 w-44">Phone No</th>
                <th className="p-3 w-24 text-center">SMS</th>
                <th className="p-3 w-24 text-center">Ledger</th>
              </tr>
            </thead>
            <tbody>
              {visibleCustomers.map((c, idx) => {
                const key = customerKey(c);
                const checked = selectedKeys.has(key);
                const smsEnabled = Boolean(smsByKey[key] ?? true);

                return (
                  <tr key={key || idx} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRowSelected(key)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="p-3 font-bold text-slate-700">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-800">{String(c?.name || '')}</td>
                    <td className="p-3 font-mono text-slate-600">{String(c?.contact || '')}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSms(key)}
                        className={`px-3 py-1 text-[9px] font-black uppercase border ${smsEnabled ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}
                      >
                        {smsEnabled ? 'YES' : 'NO'}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-[9px] font-black uppercase text-slate-600">YES</span>
                    </td>
                  </tr>
                );
              })}

              {!visibleCustomers.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500 text-[11px] font-bold">No parties found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between bg-white border border-slate-300 p-3">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4" />
            Select All
          </label>

          <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-2 rounded-none font-black uppercase text-[10px] flex items-center gap-2 hover:bg-emerald-700 shadow-lg">
            <Save className="w-3.5 h-3.5" /> SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
