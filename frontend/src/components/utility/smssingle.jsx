import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Send, Filter, Calendar, Users, Phone, MessageSquare, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
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
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
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

  // Update state functions
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

  const setLoading = useCallback((value) => {
    setState(prev => ({ ...prev, loading: value, error: null }));
  }, []);

  const setSending = useCallback((value) => {
    setState(prev => ({ ...prev, sending: value, error: null }));
  }, []);

  const setError = useCallback((value) => {
    setState(prev => ({ ...prev, error: value }));
  }, []);

  // Groups and filtered customers
  const groups = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    return [...new Set(customers.map(c => c.group).filter(Boolean))];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    if (!selectedGroup) return customers;
    return customers.filter(c => c.group === selectedGroup);
  }, [customers, selectedGroup]);

  // Generate SMS message with template
  const generateSmsMessage = useCallback(() => {
    if (!selectedCustomer) return '';
    
    return messageTemplate
      .replace('{{customer}}', selectedCustomer)
      .replace('{{fromDate}}', fromDate)
      .replace('{{toDate}}', toDate)
      .replace('{{qty}}', totalQty.toFixed(2))
      .replace('{{amount}}', totalAmount.toFixed(2));
  }, [messageTemplate, selectedCustomer, fromDate, toDate, totalQty, totalAmount]);

  // Fetch daily sales data for selected customer
  const fetchDailySales = useCallback(async () => {
    if (!selectedCustomer || !fromDate || !toDate) {
      showNotify?.('Please select customer and date range', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await api.getDailySales(fromDate, toDate);
      
      // Filter data for selected customer
      const customerData = data.filter(item => 
        item.party === selectedCustomer || 
        item.farmer_name === selectedCustomer
      );

      // Calculate totals
      const totals = customerData.reduce((acc, item) => {
        const qty = parseFloat(item.qty) || 0;
        const rate = parseFloat(item.rate) || 0;
        const amount = qty * rate;
        
        return {
          qty: acc.qty + qty,
          amount: acc.amount + amount
        };
      }, { qty: 0, amount: 0 });

      setState(prev => ({
        ...prev,
        salesData: customerData,
        totalQty: totals.qty,
        totalAmount: totals.amount,
        loading: false
      }));

      showNotify?.(`Loaded ${customerData.length} records for ${selectedCustomer}`, 'success');
    } catch (error) {
      console.error('Failed to fetch daily sales:', error);
      setError(error?.message || 'Failed to load sales data');
      showNotify?.('Failed to load sales data', 'error');
      setLoading(false);
    }
  }, [selectedCustomer, fromDate, toDate, showNotify]);

  // Send SMS
  const handleSendSms = async () => {
    if (!selectedCustomer) {
      showNotify?.('Please select a customer', 'error');
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      showNotify?.('Valid phone number required', 'error');
      return;
    }

    const messageToSend = customMessage || generateSmsMessage();
    if (!messageToSend.trim()) {
      showNotify?.('Please enter a message', 'error');
      return;
    }

    setSending(true);
    try {
      await api.sendSms({ phoneNumber, message: messageToSend });
      showNotify?.('SMS sent successfully', 'success');
      
      // Reset form
      setState(prev => ({
        ...prev,
        customMessage: '',
        sending: false
      }));
    } catch (error) {
      console.error('Failed to send SMS:', error);
      setError(error?.message || 'Failed to send SMS');
      showNotify?.('Failed to send SMS', 'error');
      setSending(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setState(prev => ({
      ...prev,
      selectedCustomer: '',
      phoneNumber: '',
      customMessage: '',
      salesData: [],
      totalQty: 0,
      totalAmount: 0,
      error: null
    }));
  };

  // Auto-generate message when data changes
  useEffect(() => {
    if (selectedCustomer && totalQty > 0) {
      const autoMessage = generateSmsMessage();
      if (!customMessage) {
        setCustomMessage(autoMessage);
      }
    }
  }, [selectedCustomer, totalQty, totalAmount, generateSmsMessage, customMessage, setCustomMessage]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 font-sans text-slate-800 overflow-hidden rounded-2xl shadow-2xl border border-slate-200">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase">SMS Single Customer</h1>
            <p className="text-[10px] text-emerald-100 font-medium opacity-80 uppercase tracking-widest">Direct Messaging System</p>
          </div>
        </div>
        <button 
          onClick={onCancel} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors group"
        >
          <X size={20} className="group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4 overflow-hidden">
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-700 text-sm font-bold shadow-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            {error}
          </div>
        )}

        {/* Customer Selection */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg">
          <h2 className="text-sm font-black uppercase text-slate-600 mb-3 tracking-wider">Customer Selection</h2>
          
          <div className="grid grid-cols-12 gap-4">
            {/* Group Selection */}
            <div className="col-span-4">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Select Group</label>
              <div className="relative">
                <select 
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 appearance-none"
                >
                  <option value="">-- Select Group --</option>
                  {groups.map(group => <option key={group} value={group}>{group}</option>)}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
              </div>
            </div>

            {/* Customer Selection */}
            <div className="col-span-4">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Select Customer</label>
              <div className="relative">
                <select 
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 appearance-none"
                  disabled={!selectedGroup}
                >
                  <option value="">-- Select Customer --</option>
                  {filteredCustomers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
              </div>
            </div>

            {/* Phone Number */}
            <div className="col-span-4">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Phone Number</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter 10-digit number"
                  className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg">
          <h2 className="text-sm font-black uppercase text-slate-600 mb-3 tracking-wider">Date Range</h2>
          
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-5">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">From Date</label>
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" 
              />
            </div>
            
            <div className="col-span-5">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">To Date</label>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" 
              />
            </div>
            
            <div className="col-span-2">
              <button 
                onClick={fetchDailySales}
                disabled={loading || !selectedCustomer}
                className="w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white px-4 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 tracking-wider h-[42px]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} /> LOAD DATA
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Message Composition */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg flex-1">
          <h2 className="text-sm font-black uppercase text-slate-600 mb-3 tracking-wider">Message Composition</h2>
          
          <div className="flex flex-col gap-4 h-full">
            {/* Message Template */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Message Template</label>
              <textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg p-3 text-sm font-medium text-slate-700 outline-none transition-all duration-200 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 h-24 resize-none"
                placeholder="Enter your message template with {{placeholders}}"
              />
              <div className="text-[10px] text-slate-500 mt-1">
                Available placeholders: {{customer}}, {{fromDate}}, {{toDate}}, {{qty}}, {{amount}}
              </div>
            </div>

            {/* Generated Message Preview */}
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Message Preview</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-lg p-3 text-sm font-medium text-slate-800 outline-none transition-all duration-200 hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 h-full resize-none"
                placeholder="Your message will appear here..."
              />
              <div className="text-right text-[10px] text-slate-500 mt-1">
                Characters: {customMessage.length}/160
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg">
          <div className="flex justify-between items-center">
            {/* Totals */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Qty</span>
                <span className="text-sm font-black text-slate-700 w-20 text-right tabular-nums">
                  {totalQty.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</span>
                <span className="text-lg font-black text-emerald-600 w-28 text-right tabular-nums">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={handleReset}
                disabled={sending}
                className="bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 px-5 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-slate-300 hover:to-slate-400 transition-all duration-200 flex items-center gap-2 tracking-wider border border-slate-300 disabled:opacity-50"
              >
                <RefreshCw size={14} /> RESET
              </button>
              
              <button 
                onClick={handleSendSms}
                disabled={sending || !selectedCustomer || !phoneNumber || !customMessage.trim()}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-8 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 flex items-center gap-2 tracking-wider"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    SENDING...
                  </>
                ) : (
                  <>
                    <Send size={14} /> SEND SMS
                  </>
                )}
              </button>

              <button 
                onClick={onCancel}
                className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-6 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-slate-800 hover:to-slate-900 transition-all duration-200 flex items-center gap-2 tracking-wider"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmsSingle;