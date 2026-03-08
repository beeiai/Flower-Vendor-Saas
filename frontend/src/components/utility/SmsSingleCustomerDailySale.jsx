import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Send, 
  Search, 
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { EnhancedSearchableSelect } from '../shared/EnhancedSearchableSelect';
import { api } from '../../utils/api';

const SmsSingleCustomerDailySale = ({ onCancel, showNotify }) => {
  const [state, setState] = useState({
    // Form fields
    selectedGroup: '',
    selectedCustomer: '',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    
    // Data
    groups: [],
    customers: [],
    filteredCustomers: [],
    salesData: [],
    
    // Calculations
    totalQty: 0,
    totalAmount: 0,
    
    // UI state
    loading: false,
    sending: false,
    error: null
  });

  const {
    selectedGroup,
    selectedCustomer,
    fromDate,
    toDate,
    groups,
    filteredCustomers,
    salesData,
    totalQty,
    totalAmount,
    loading,
    sending,
    error
  } = state;

  // Fetch available groups on component mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groupData = await api.getSmsAvailableGroups();
        setState(prev => ({ ...prev, groups: groupData || [] }));
      } catch (err) {
        console.error('Failed to load groups:', err);
        showNotify?.('Failed to load groups', 'error');
      }
    };
    fetchGroups();
  }, [showNotify]);

  // Fetch customers when group is selected
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!selectedGroup) {
        setState(prev => ({ 
          ...prev, 
          filteredCustomers: [], 
          selectedCustomer: '',
          salesData: [],
          totalQty: 0,
          totalAmount: 0
        }));
        return;
      }
      
      setState(prev => ({ ...prev, loading: true }));
      try {
        const customerData = await api.getSmsCustomersByGroup(selectedGroup);
        setState(prev => ({ 
          ...prev, 
          filteredCustomers: customerData || [],
          loading: false
        }));
      } catch (err) {
        console.error('Failed to load customers:', err);
        setState(prev => ({ ...prev, loading: false }));
        showNotify?.('Failed to load customers', 'error');
      }
    };
    fetchCustomers();
  }, [selectedGroup, showNotify]);

  // Reset form
  const resetFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedGroup: '',
      selectedCustomer: '',
      salesData: [],
      totalQty: 0,
      totalAmount: 0,
      error: null
    }));
  }, []);

  // Fetch daily sales data
  const fetchDailySales = useCallback(async () => {
    if (!selectedGroup || !selectedCustomer || !fromDate || !toDate) {
      showNotify?.('Please fill all required fields', 'error');
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      showNotify?.('From date cannot be after to date', 'error');
      return;
    }

    console.log('[SMS Single Customer] Fetching data:', { selectedGroup, selectedCustomer, fromDate, toDate });
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await api.getSmsSingleCustomerDailySale(
        selectedGroup,
        selectedCustomer,
        fromDate,
        toDate
      );
      
      console.log('[SMS Single Customer] Response received:', response);
      console.log('[SMS Single Customer] Sales data count:', response?.sales_data?.length || 0);
      
      // Validate response structure
      if (!response || !response.sales_data || !Array.isArray(response.sales_data)) {
        console.warn('[SMS Single Customer] Invalid response structure:', response);
        throw new Error('Invalid response format from server');
      }
      
      setState(prev => ({
        ...prev,
        salesData: response.sales_data || [],
        totalQty: response.totals?.total_quantity || 0,
        totalAmount: response.totals?.amount_total || 0,
        loading: false
      }));
      
      const recordCount = response.record_count || response.sales_data?.length || 0;
      if (recordCount > 0) {
        showNotify?.(`Loaded ${recordCount} records`, 'success');
      } else {
        showNotify?.('No sales data found for this customer', 'info');
      }
    } catch (err) {
      console.error('[SMS Single Customer] Failed to load sales data:', err);
      const errorMessage = err?.message || err?.details || 'Failed to load data';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        loading: false 
      }));
      showNotify?.(errorMessage || 'Failed to load sales data', 'error');
    }
  }, [selectedGroup, selectedCustomer, fromDate, toDate, showNotify]);

  // Send SMS
  const handleSendSms = useCallback(async () => {
    if (!selectedCustomer || salesData.length === 0) {
      showNotify?.('No data to send SMS', 'error');
      return;
    }
    
    // Get customer phone number (you'll need to implement this based on your data structure)
    const phoneNumber = getCustomerPhoneNumber();
    if (!phoneNumber) {
      showNotify?.('Customer phone number not found', 'error');
      return;
    }
    
    setState(prev => ({ ...prev, sending: true }));
    try {
      await api.sendSms({
        phoneNumber: phoneNumber,
        message: generateSmsMessage()
      });
      
      showNotify?.('SMS sent successfully', 'success');
      setState(prev => ({ ...prev, sending: false }));
    } catch (err) {
      console.error('Failed to send SMS:', err);
      setState(prev => ({ ...prev, sending: false, error: err.message || 'Failed to send SMS' }));
      showNotify?.('Failed to send SMS', 'error');
    }
  }, [selectedCustomer, salesData, showNotify]);

  // Helper functions
  const getCustomerPhoneNumber = () => {
    // You'll need to implement this based on how phone numbers are stored
    // This is a placeholder - you might need to fetch customer details separately
    const customer = filteredCustomers.find(c => c.name === selectedCustomer);
    return customer?.phone || customer?.contact || ''; // Adjust based on your data structure
  };

  const generateSmsMessage = () => {
    return `Dear ${selectedCustomer},

Your daily sales summary (${fromDate} to ${toDate}):
Total Quantity: ${totalQty.toFixed(2)} KG
Amount Total: ₹${totalAmount.toFixed(2)}

Thank you for your business!`;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#F1F5F9] font-sans text-sm overflow-hidden">
      {/* Header */}
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
              <EnhancedSearchableSelect
                label={null}
                options={groups}
                value={selectedGroup}
                onChange={(value) => setState(prev => ({ ...prev, selectedGroup: value }))}
                placeholder="Select a group"
                className="w-full border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">Customer Name</label>
              <EnhancedSearchableSelect
                label={null}
                options={filteredCustomers.map(c => c.name)}
                value={selectedCustomer}
                onChange={(value) => setState(prev => ({ ...prev, selectedCustomer: value }))}
                placeholder={!selectedGroup ? "Select a group first" : "Select a customer"}
                disabled={!selectedGroup}
                className="w-full border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">From Date</label>
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setState(prev => ({ ...prev, fromDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 outline-none"
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">To Date</label>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setState(prev => ({ ...prev, toDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 outline-none"
              />
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
          {/* Sales Data Table */}
          <div className="flex-[2] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[#6366F1] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold uppercase text-[11px] tracking-widest border-r border-white/10">SL.NO</th>
                    <th className="px-4 py-3 text-left font-bold uppercase text-[11px] tracking-widest border-r border-white/10">DATE</th>
                    <th className="px-4 py-3 text-left font-bold uppercase text-[11px] tracking-widest border-r border-white/10">ITEM NAME</th>
                    <th className="px-4 py-3 text-right font-bold uppercase text-[11px] tracking-widest border-r border-white/10">QTY (KG)</th>
                    <th className="px-4 py-3 text-right font-bold uppercase text-[11px] tracking-widest border-r border-white/10">RATE</th>
                    <th className="px-4 py-3 text-right font-bold uppercase text-[11px] tracking-widest">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesData.length > 0 ? (
                    salesData.map((item) => (
                      <tr key={`${item.date}-${item.item_name}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 font-medium">{item.sl_no}</td>
                        <td className="px-4 py-3 text-slate-700">{item.date}</td>
                        <td className="px-4 py-3 text-slate-900 font-semibold">{item.item_name}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{item.qty.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{item.rate.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-600">{item.total.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-20 text-center text-slate-400 font-medium italic">
                        {loading ? 'Loading...' : 'Please select a group and customer to view daily sale data'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SMS Message Preview */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={18} className="text-indigo-500" />
              <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider">SMS Content Preview</h3>
            </div>
            <textarea
              value={generateSmsMessage()}
              readOnly
              className="flex-1 w-full border border-slate-100 rounded-xl p-4 bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 resize-none font-medium leading-relaxed"
            />
          </div>
        </div>

        {/* Action Buttons & Summary */}
        <div className="flex items-end justify-between shrink-0 gap-6">
          <div className="flex gap-4 pb-2">
            <button 
              onClick={handleSendSms}
              disabled={sending || !selectedCustomer || salesData.length === 0}
              className="bg-[#10B981] hover:bg-[#059669] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              <Send size={20} /> {sending ? 'SENDING...' : 'SEND SMS'}
            </button>
            <button 
              onClick={onCancel}
              className="bg-[#E2E8F0] hover:bg-slate-300 text-slate-600 px-8 py-3 rounded-xl font-bold transition-all"
            >
              CANCEL
            </button>
          </div>

          {/* Summary Widgets */}
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

export default SmsSingleCustomerDailySale;
