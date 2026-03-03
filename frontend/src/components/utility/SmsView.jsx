import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Send, Filter, Calendar, Users, ChevronRight, Printer, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';

const SmsView = ({ customers = [], onCancel, showNotify }) => {
  const [state, setState] = useState({
    selectedGroup: '',
    selectedCustomer: '',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    sending: false,
    phoneNumber: '',
    loading: false,
    salesData: [],
    totalQty: 0,
    totalAmount: 0,
    messageTemplate: 'Dear {{customer}}, your daily sales report from {{fromDate}} to {{toDate}}:\nTotal Quantity: {{qty}} kg\nTotal Amount: ₹{{amount}}\nThank you!'
  });

  const { selectedGroup, selectedCustomer, fromDate, toDate, sending, loading, salesData, totalQty, totalAmount, messageTemplate } = state;

  const groups = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    return [...new Set(customers.map(c => c.group).filter(Boolean))];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    if (!selectedGroup) return customers;
    return customers.filter(c => c.group === selectedGroup);
  }, [customers, selectedGroup]);

  // Filter sales data by selected customer
  const filteredSalesData = useMemo(() => {
    if (!salesData || salesData.length === 0) return [];
    if (!selectedCustomer) return salesData;
    return salesData.filter(item => item.party === selectedCustomer);
  }, [salesData, selectedCustomer]);

  // Calculate totals for filtered data
  const calculatedTotals = useMemo(() => {
    if (filteredSalesData.length === 0) return { qty: 0, amount: 0 };
    
    const totals = filteredSalesData.reduce((acc, item) => {
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.rate) || 0;
      const amount = qty * rate;
      
      return {
        qty: acc.qty + qty,
        amount: acc.amount + amount
      };
    }, { qty: 0, amount: 0 });
    
    return totals;
  }, [filteredSalesData]);

  const handleCustomerChange = (name) => {
    const customer = customers.find(c => c.name === name);
    setState(prev => ({ 
      ...prev, 
      selectedCustomer: name,
      phoneNumber: customer?.contact || ''
    }));
  };

  // Generate SMS message with template
  const generateSmsMessage = useCallback(() => {
    if (!selectedCustomer || calculatedTotals.qty === 0) return '';
    
    return messageTemplate
      .replace('{{customer}}', selectedCustomer)
      .replace('{{fromDate}}', fromDate)
      .replace('{{toDate}}', toDate)
      .replace('{{qty}}', calculatedTotals.qty.toFixed(2))
      .replace('{{amount}}', calculatedTotals.amount.toFixed(2));
  }, [messageTemplate, selectedCustomer, fromDate, toDate, calculatedTotals]);

  // Fetch daily sales data
  const fetchDailySales = useCallback(async () => {
    if (!fromDate || !toDate) {
      showNotify?.('Please select valid date range', 'error');
      return;
    }
    
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.getDailySales(fromDate, toDate);
      
      // Transform data to match component expectations
      const transformedData = data.map(item => ({
        date: item.date,
        party: item.party || item.farmer_name || 'Unknown',
        itemName: item.itemName || item.item_name || 'N/A',
        qty: item.qty || '0',
        rate: item.rate || item.rate_per_kg || '0.00',
        vehicle: item.vehicle || item.vehicle_name || 'N/A',
        group: item.group || 'Unknown'
      }));
      
      // Calculate overall totals
      const totals = transformedData.reduce((acc, item) => {
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
        salesData: transformedData,
        totalQty: totals.qty,
        totalAmount: totals.amount,
        loading: false
      }));
      
      showNotify?.(`Loaded ${transformedData.length} records`, 'success');
    } catch (error) {
      console.error('Failed to fetch daily sales:', error);
      showNotify?.('Failed to load daily sales data: ' + (error.message || 'Unknown error'), 'error');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [fromDate, toDate, showNotify]);

  // Handle GO button click
  const handleGo = useCallback(() => {
    fetchDailySales();
  }, [fetchDailySales]);

  const handleSendSms = async () => {
    if (!selectedCustomer) {
      showNotify?.('Please select a customer first', 'error');
      return;
    }
    
    if (filteredSalesData.length === 0) {
      showNotify?.('No sales data available for selected customer', 'error');
      return;
    }
    
    if (!phoneNumber || phoneNumber.length < 10) {
      showNotify?.('Valid phone number required for SMS', 'error');
      return;
    }
    
    const message = generateSmsMessage();
    if (!message) {
      showNotify?.('Unable to generate SMS message', 'error');
      return;
    }
    
    setState(prev => ({ ...prev, sending: true }));
    try {
      await api.sendSms({ phoneNumber, message });
      showNotify?.('SMS sent successfully', 'success');
      
      // Reset form after successful send
      setState(prev => ({
        ...prev,
        selectedCustomer: '',
        phoneNumber: '',
        messageTemplate: 'Dear {{customer}}, your daily sales report from {{fromDate}} to {{toDate}}:\nTotal Quantity: {{qty}} kg\nTotal Amount: ₹{{amount}}\nThank you!'
      }));
    } catch (error) {
      console.error('Failed to send SMS:', error);
      showNotify?.('Failed to send SMS: ' + (error.message || 'Unknown error'), 'error');
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

          <button 
            onClick={handleGo}
            disabled={loading}
            className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-lg font-bold text-xs transition-colors group uppercase disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                GO <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
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
                {filteredSalesData.length > 0 ? (
                  filteredSalesData.map((item, i) => (
                    <tr key={i} className="hover:bg-indigo-50/50 transition-colors group h-[45px]">
                      <td className="px-4 py-2 text-xs font-bold text-slate-400 text-center">{i + 1}</td>
                      <td className="px-4 py-2 text-xs font-medium text-slate-500">{item.date || fromDate}</td>
                      <td className="px-4 py-2 text-xs font-bold text-slate-800 uppercase tracking-tight truncate">{item.party}</td>
                      <td className="px-4 py-2 text-xs text-slate-400 italic truncate">{item.itemName}</td>
                      <td className="px-4 py-2 text-xs text-right font-medium text-slate-600">{item.qty}</td>
                      <td className="px-4 py-2 text-xs text-right font-medium text-slate-600">{item.rate}</td>
                      <td className="px-4 py-2 text-xs text-right font-black text-indigo-700">
                        {(parseFloat(item.qty) * parseFloat(item.rate)).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500 text-sm font-medium">
                      {loading ? 'Loading data...' : 'No sales data available. Click GO to load data.'}
                    </td>
                  </tr>
                )}
                {/* Padding with empty rows if less than 10 */}
                {filteredSalesData.length > 0 && filteredSalesData.length < 10 && [...Array(10 - filteredSalesData.length)].map((_, i) => (
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
              <span className="text-sm font-black text-slate-700 w-24 text-right tabular-nums">{calculatedTotals.qty.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Total</span>
              <span className="text-lg font-black text-emerald-600 w-24 text-right tabular-nums">₹{calculatedTotals.amount.toFixed(2)}</span>
            </div>
            
            <div className="flex gap-3 mt-3">
              <button className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 px-6 py-2 rounded-lg font-bold text-[11px] uppercase transition-all shadow-sm">
                <Printer size={14} /> Print Report
              </button>
              
              <button 
                onClick={handleSendSms}
                disabled={sending || !selectedCustomer || calculatedTotals.qty === 0 || !phoneNumber}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-bold text-[11px] uppercase shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send SMS
                  </>
                )}
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