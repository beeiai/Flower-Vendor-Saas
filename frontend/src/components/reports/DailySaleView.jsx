import React, { useState, useMemo, useCallback } from 'react';
import { X, Send, Filter, Calendar, Users, ChevronRight, Printer } from 'lucide-react';

/** * Mock API for SMS integration 
 * Replace this with your actual API utility
 */
const api = {
  sendSms: async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: true };
  }
};

const SmsView = ({ customers = [], onCancel, showNotify }) => {
  const [state, setState] = useState({
    selectedGroup: '',
    selectedCustomer: '',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    sending: false,
    phoneNumber: ''
  });

  const { selectedGroup, selectedCustomer, fromDate, toDate, sending } = state;

  const groups = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    return [...new Set(customers.map(c => c.group).filter(Boolean))];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    if (!selectedGroup) return customers;
    return customers.filter(c => c.group === selectedGroup);
  }, [customers, selectedGroup]);

  const handleCustomerChange = (name) => {
    const customer = customers.find(c => c.name === name);
    setState(prev => ({ 
      ...prev, 
      selectedCustomer: name,
      phoneNumber: customer?.contact || ''
    }));
  };

  const handleSendSms = async () => {
    if (!selectedCustomer) return;
    setState(prev => ({ ...prev, sending: true }));
    try {
      await api.sendSms();
      showNotify?.('SMS Task triggered successfully', 'success');
    } catch (e) {
      showNotify?.('Operation failed', 'error');
    } finally {
      setState(prev => ({ ...prev, sending: false }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans text-slate-800 overflow-hidden rounded-2xl shadow-2xl border border-slate-200">
      
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase">Items Daily Sale Rate</h1>
            <p className="text-[10px] text-indigo-100 font-medium opacity-80 uppercase tracking-widest">Management System</p>
          </div>
        </div>
        <button 
          onClick={onCancel} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors group"
        >
          <X size={20} className="group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 overflow-hidden">
        
        {/* Single Row Filter Bar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 flex-wrap">
          
          <div className="flex items-center gap-2 border-r border-slate-100 pr-4">
            <div className="relative">
              <select 
                className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer"
                value={selectedGroup}
                onChange={(e) => setState(prev => ({ ...prev, selectedGroup: e.target.value }))}
              >
                <option value="">All Groups</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <select 
                className="pl-8 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer w-48"
                value={selectedCustomer}
                onChange={(e) => handleCustomerChange(e.target.value)}
              >
                <option value="">Select Customer</option>
                {filteredCustomers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <Users className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-2 border-r border-slate-100 pr-4">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input 
                type="date" 
                className="bg-transparent py-1.5 text-xs font-semibold outline-none w-28" 
                value={fromDate}
                onChange={(e) => setState(prev => ({ ...prev, fromDate: e.target.value }))}
              />
              <span className="text-[10px] font-bold text-slate-400">TO</span>
              <input 
                type="date" 
                className="bg-transparent py-1.5 text-xs font-semibold outline-none w-28" 
                value={toDate}
                onChange={(e) => setState(prev => ({ ...prev, toDate: e.target.value }))}
              />
            </div>
          </div>

          <button className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-lg font-bold text-xs transition-colors group uppercase">
            GO <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Data Grid with 10-row visibility logic */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[450px]">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="sticky top-0 z-10">
                <tr className="bg-emerald-600 text-white">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-emerald-500/30 w-16 text-center">Sl.No</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-emerald-500/30 w-32">Date</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-emerald-500/30">Party Name</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-emerald-500/30">Item Details</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-emerald-500/30 w-20 text-center">Qty</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r border-emerald-500/30 w-24 text-center">Rate</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest w-24 text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c, i) => (
                  <tr key={c.id || i} className="hover:bg-indigo-50/50 transition-colors group h-[45px]">
                    <td className="px-4 py-2 text-xs font-bold text-slate-400 text-center">{i + 1}</td>
                    <td className="px-4 py-2 text-xs font-medium text-slate-500">{fromDate}</td>
                    <td className="px-4 py-2 text-xs font-bold text-slate-800 uppercase tracking-tight truncate">{c.name}</td>
                    <td className="px-4 py-2 text-xs text-slate-400 italic truncate">Daily Entry</td>
                    <td className="px-4 py-2 text-xs text-right font-medium text-slate-600">0</td>
                    <td className="px-4 py-2 text-xs text-right font-medium text-slate-600">0.00</td>
                    <td className="px-4 py-2 text-xs text-right font-black text-indigo-700">0.00</td>
                  </tr>
                ))}
                {/* Padding with empty rows if less than 10 */}
                {filteredCustomers.length < 10 && [...Array(10 - filteredCustomers.length)].map((_, i) => (
                  <tr key={`empty-${i}`} className="h-[45px]">
                    <td className="px-4 py-2 border-r border-slate-50"></td>
                    <td className="px-4 py-2 border-r border-slate-50"></td>
                    <td className="px-4 py-2 border-r border-slate-50"></td>
                    <td className="px-4 py-2 border-r border-slate-50"></td>
                    <td className="px-4 py-2 border-r border-slate-50"></td>
                    <td className="px-4 py-2 border-r border-slate-50"></td>
                    <td className="px-4 py-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Footer Area */}
        <div className="flex justify-end items-end shrink-0 pt-2">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Quantity</span>
              <span className="text-sm font-black text-slate-700 w-24 text-right tabular-nums">0</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Total</span>
              <span className="text-lg font-black text-emerald-600 w-24 text-right tabular-nums">0.00</span>
            </div>
            
            <div className="flex gap-3 mt-3">
              <button className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 px-6 py-2 rounded-lg font-bold text-[11px] uppercase transition-all shadow-sm">
                <Printer size={14} /> Print Report
              </button>
              
              <button 
                onClick={handleSendSms}
                disabled={sending || !selectedCustomer}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-bold text-[11px] uppercase shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {sending ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {sending ? 'Wait...' : 'Send SMS'}
              </button>

              <button 
                onClick={onCancel}
                className="bg-slate-800 text-white hover:bg-slate-900 px-8 py-2 rounded-lg font-bold text-[11px] uppercase transition-all shadow-lg active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmsView;