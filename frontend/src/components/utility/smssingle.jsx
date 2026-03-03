import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  X, 
  Send, 
  Filter, 
  Calendar, 
  Users, 
  Phone, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Printer,
  Search
} from 'lucide-react';
import { api } from '../../utils/api';

const SmsSingle = ({ customers = [], onCancel, showNotify }) => {
  const [state, setState] = useState({
    selectedGroup: '',
    selectedCustomer: '',
    phoneNumber: '',
    messageTemplate: 'Dear {{customer}}, your daily sales from {{fromDate}} to {{toDate}}:\nTotal Quantity: {{qty}} kg\nTotal Amount: ₹{{amount}}\nThank you!',
    customMessage: '',
    sending: false,
    loading: false,
    fromDate: '2026-03-03',
    toDate: '2026-03-03',
    salesData: [],
    totalQty: 0,
    totalAmount: 0,
    error: null
  });

  const { 
    selectedGroup, 
    selectedCustomer, 
    phoneNumber, 
    messageTemplate, 
    customMessage,
    sending, 
    loading,
    fromDate,
    toDate,
    salesData,
    totalQty,
    totalAmount,
    error
  } = state;

  const setSelectedGroup = useCallback((value) => {
    setState(prev => ({ ...prev, selectedGroup: value, selectedCustomer: '', phoneNumber: '' }));
  }, []);

  const setSelectedCustomer = useCallback((value) => {
    const customer = customers.find(c => c.name === value);
    setState(prev => ({ 
      ...prev, 
      selectedCustomer: value,
      phoneNumber: customer?.contact || ''
    }));
  }, [customers]);

  const setPhoneNumber = useCallback((value) => {
    setState(prev => ({ ...prev, phoneNumber: value }));
  }, []);

  const setCustomMessage = useCallback((value) => {
    setState(prev => ({ ...prev, customMessage: value }));
  }, []);

  const setMessageTemplate = useCallback((value) => {
    setState(prev => ({ ...prev, messageTemplate: value }));
  }, []);

  const setFromDate = useCallback((value) => {
    setState(prev => ({ ...prev, fromDate: value }));
  }, []);

  const setToDate = useCallback((value) => {
    setState(prev => ({ ...prev, toDate: value }));
  }, []);

  const groups = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    return [...new Set(customers.map(c => c.group).filter(Boolean))];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    if (!selectedGroup) return customers;
    return customers.filter(c => c.group === selectedGroup);
  }, [customers, selectedGroup]);

  const generateSmsMessage = useCallback(() => {
    if (!selectedCustomer) return '';
    return messageTemplate
      .replace('{{customer}}', selectedCustomer)
      .replace('{{fromDate}}', fromDate)
      .replace('{{toDate}}', toDate)
      .replace('{{qty}}', totalQty.toFixed(2))
      .replace('{{amount}}', totalAmount.toFixed(2));
  }, [messageTemplate, selectedCustomer, fromDate, toDate, totalQty, totalAmount]);

  const fetchDailySales = useCallback(async () => {
    if (!selectedCustomer || !fromDate || !toDate) {
      showNotify?.('Please select customer and date range', 'error');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Get all daily sales data for the date range
      const data = await api.getDailySales(fromDate, toDate);
      
      // Filter data for the selected customer
      // First try to match by party name, then by farmer_name
      let customerData = [];
      if (Array.isArray(data)) {
        customerData = data.filter(item => 
          (item.party && item.party.toLowerCase().includes(selectedCustomer.toLowerCase())) || 
          (item.farmer_name && item.farmer_name.toLowerCase().includes(selectedCustomer.toLowerCase()))
        );
      }

      const totals = customerData.reduce((acc, item) => {
        const qty = parseFloat(item.qty) || 0;
        const rate = parseFloat(item.rate) || 0;
        return {
          qty: acc.qty + qty,
          amount: acc.amount + (qty * rate)
        };
      }, { qty: 0, amount: 0 });

      setState(prev => ({
        ...prev,
        salesData: customerData,
        totalQty: totals.qty,
        totalAmount: totals.amount,
        loading: false
      }));
      showNotify?.(`Loaded ${customerData.length} records`, 'success');
    } catch (err) {
      setState(prev => ({ ...prev, error: err.message || 'Failed to load data', loading: false }));
      showNotify?.('Failed to load sales data', 'error');
    }
  }, [selectedCustomer, fromDate, toDate, showNotify]);

  const handleSendSms = async () => {
    if (!selectedCustomer || !phoneNumber || !customMessage) return;
    const msg = customMessage || generateSmsMessage();
    setState(prev => ({ ...prev, sending: true }));
    try {
      await api.sendSms({ phoneNumber, message: msg });
      showNotify?.('SMS sent successfully', 'success');
      setState(prev => ({ ...prev, sending: false }));
    } catch (err) {
      setState(prev => ({ ...prev, sending: false, error: err.message || 'Failed to send' }));
      showNotify?.('Failed to send SMS', 'error');
    }
  };

  const resetFilters = () => {
    setState(prev => ({
      ...prev,
      selectedGroup: '',
      selectedCustomer: '',
      phoneNumber: '',
      salesData: [],
      totalQty: 0,
      totalAmount: 0,
      customMessage: ''
    }));
  };

  useEffect(() => {
    if (selectedCustomer && totalQty > 0 && !customMessage) {
      setCustomMessage(generateSmsMessage());
    }
  }, [selectedCustomer, totalQty, totalAmount, generateSmsMessage, customMessage, setCustomMessage]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#F1F5F9] font-sans text-sm overflow-hidden">
      
      {/* Modern Purple Header */}
      <div className="bg-[#6366F1] px-6 py-3 flex justify-between items-center shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-wide uppercase">SMS Single Customer Daily Sale</h1>
        </div>
        <button onClick={onCancel} className="text-white/80 hover:text-white transition-all hover:scale-110">
          <X size={24} />
        </button>
      </div>

      <div className="p-6 flex flex-col gap-6 flex-1 overflow-hidden">
        
        {/* Filters Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 shrink-0">
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">Select Group</label>
              <select 
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none"
              >
                <option value="">-- Select Group --</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">Customer Name</label>
              <select 
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none"
                disabled={!selectedGroup}
              >
                <option value="">-- Select Customer --</option>
                {filteredCustomers.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">From Date</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">To Date</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={fetchDailySales}
                disabled={loading || !selectedCustomer}
                className="bg-[#FF4F81] hover:bg-[#E03E6B] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-pink-100 disabled:opacity-50"
              >
                <Search size={18} /> GO
              </button>
              <button 
                onClick={resetFilters}
                className="bg-[#475569] hover:bg-[#334155] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-slate-100"
              >
                <RefreshCw size={18} /> RESET
              </button>
            </div>
          </div>
        </div>

        {/* Table & Message Preview Section */}
        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Table Container */}
          <div className="flex-[2] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[#6366F1] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold uppercase text-[11px] tracking-widest border-r border-white/10">Sl.No.</th>
                    <th className="px-4 py-3 text-left font-bold uppercase text-[11px] tracking-widest border-r border-white/10">Date</th>
                    <th className="px-4 py-3 text-left font-bold uppercase text-[11px] tracking-widest border-r border-white/10">Item Name</th>
                    <th className="px-4 py-3 text-right font-bold uppercase text-[11px] tracking-widest border-r border-white/10">Qty</th>
                    <th className="px-4 py-3 text-right font-bold uppercase text-[11px] tracking-widest border-r border-white/10">Rate</th>
                    <th className="px-4 py-3 text-right font-bold uppercase text-[11px] tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesData.length > 0 ? (
                    salesData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 text-slate-700">{item.date}</td>
                        <td className="px-4 py-3 text-slate-900 font-semibold">{item.item_name}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{parseFloat(item.qty).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{parseFloat(item.rate).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-600">{(item.qty * item.rate).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-20 text-center text-slate-400 font-medium italic">
                        Please select a group and customer to view daily sale data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SMS Message Card */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={18} className="text-indigo-500" />
              <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider">SMS Content Preview</h3>
            </div>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="flex-1 w-full border border-slate-100 rounded-xl p-4 bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 resize-none font-medium leading-relaxed"
              placeholder="Your SMS content will be generated here..."
            />
          </div>
        </div>

        {/* Bottom Bar: Actions & Summary Widgets */}
        <div className="flex items-end justify-between shrink-0 gap-6">
          {/* Action Buttons */}
          <div className="flex gap-4 pb-2">
            <button 
              onClick={handleSendSms}
              disabled={sending || !selectedCustomer || !customMessage}
              className="bg-[#10B981] hover:bg-[#059669] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              <Send size={20} /> SEND SMS
            </button>
            <button className="bg-[#1E293B] hover:bg-[#0F172A] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-slate-200">
              <Printer size={20} /> PRINT
            </button>
            <button 
              onClick={onCancel}
              className="bg-[#E2E8F0] hover:bg-slate-300 text-slate-600 px-8 py-3 rounded-xl font-bold transition-all"
            >
              CANCEL
            </button>
          </div>

          {/* Summary Widgets - Styled exactly as per second image */}
          <div className="flex gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 w-64 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Quantity</h4>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-2xl font-black text-slate-800 tabular-nums">
                  {totalQty.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-400">KG</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#FF4F81] to-[#E11D48] rounded-2xl p-5 w-72 shadow-xl shadow-rose-100 border border-rose-500/20">
              <h4 className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-2">Amount Total</h4>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-xs font-bold text-white/80">₹</span>
                <span className="text-3xl font-black text-white tabular-nums">
                  {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SmsSingle;