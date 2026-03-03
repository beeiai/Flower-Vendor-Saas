<<<<<<< HEAD
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Printer, X, Send, Package, ChevronDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { api } from '../../utils/api';
import { DEFAULT_STATES, resetComponentState } from '../../utils/stateManager';

/**
 * COMPONENT: DailySaleReport
 * Handles the logic for filtering, data display, and totals.
 * Fetches real data from backend API grouped by customer.
 */
const DailySaleReport = ({ onCancel }) => {
  // Initialize with default state
  const [state, setState] = useState(DEFAULT_STATES.dailySaleReport);
  
  // Destructure state for easier access
  const {
    fromDate,
    toDate,
    selectedGroup,
    groups,
    customers,
    filteredData,
    loading,
    error
  } = state;
  
  // Functions to update individual state properties
  const setFromDate = useCallback((value) => {
    setState(prev => ({ ...prev, fromDate: value }));
  }, []);
  
  const setToDate = useCallback((value) => {
    setState(prev => ({ ...prev, toDate: value }));
  }, []);
  
  const setSelectedGroup = useCallback((value) => {
    setState(prev => ({ ...prev, selectedGroup: value }));
  }, []);
  
  const setGroups = useCallback((value) => {
    setState(prev => ({ ...prev, groups: value }));
  }, []);
  
  const setCustomers = useCallback((value) => {
    setState(prev => ({ ...prev, customers: value }));
  }, []);
  
  const setFilteredData = useCallback((value) => {
    setState(prev => ({ ...prev, filteredData: value }));
  }, []);
  
  const setLoading = useCallback((value) => {
    setState(prev => ({ ...prev, loading: value }));
  }, []);
  
  const setError = useCallback((value) => {
    setState(prev => ({ ...prev, error: value }));
  }, []);

  // Fetch groups and customers on mount with better error handling
=======
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { X, Send, Filter, Calendar, Users, Printer, Search, ChevronDown } from 'lucide-react';
import { api } from '../../utils/api';
import { DEFAULT_STATES } from '../../utils/stateManager';

const DailySaleView = ({ onCancel }) => {
  const [state, setState] = useState(DEFAULT_STATES.dailySaleReport);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  
  const customersRef = useRef([]);
  const selectedGroupRef = useRef('');

  const { selectedGroup, selectedCustomer, fromDate, toDate, sending, selectedItem } = state;

  const setFromDate = useCallback((value) => setState(prev => ({ ...prev, fromDate: value })), []);
  const setToDate = useCallback((value) => setState(prev => ({ ...prev, toDate: value })), []);
  const setSelectedItem = useCallback((value) => setState(prev => ({ ...prev, selectedItem: value })), []);

  const filteredCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    if (!selectedGroup) return customers;
    return customers.filter(c => c.group === selectedGroup);
  }, [customers, selectedGroup]);

  const handleFilter = useCallback(async (customerData = null) => {
    const dataToUse = customerData || customers;
    if (!dataToUse || dataToUse.length === 0) return;

    setLoading(true);
    try {
      const response = await api.getDailySales({
        fromDate,
        toDate,
        group: selectedGroup
      });
      setFilteredData(response.data || []);
    } catch (error) {
      console.error('Filter error:', error);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedGroup, customers]);

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
      // showNotify?.('SMS Task triggered successfully', 'success');
    } catch (e) {
      // showNotify?.('Operation failed', 'error');
    } finally {
      setState(prev => ({ ...prev, sending: false }));
    }
  };

>>>>>>> b3f7a25483bc73acf052a4a96638557ba90dabab
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [groupsData, customersData] = await Promise.all([
          api.listGroups(),
          api.listCustomers()
        ]);
        
        const safeGroups = groupsData || [];
        const safeCustomers = customersData || [];
        
        setGroups(safeGroups);
        setCustomers(safeCustomers);
<<<<<<< HEAD
        
        // Auto-select first group if only one exists for better UX
        if (safeGroups.length === 1) {
          setSelectedGroup(safeGroups[0].name);
=======
        setItems(safeItems);
        customersRef.current = safeCustomers;

        if (selectedGroupRef.current) {
          handleFilter(safeCustomers);
>>>>>>> b3f7a25483bc73acf052a4a96638557ba90dabab
        }
        
      } catch (err) {
        console.error('Failed to load master data:', err);
        setError('Failed to load groups and customers. Please refresh the page.');
        setGroups([]);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMasterData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

<<<<<<< HEAD
  // Auto-fetch when group changes or dates change
=======
>>>>>>> b3f7a25483bc73acf052a4a96638557ba90dabab
  useEffect(() => {
    if (selectedGroup) {
      handleFilter();
    }
  }, [selectedGroup, fromDate, toDate, handleFilter]);

  const handleFilter = async (retryCount = 0) => {
    if (!selectedGroup) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDailySales(fromDate, toDate, null);
      
      // Validate response data
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid data received from server');
      }
      
      // Filter customers by selected group
      const groupCustomers = customers.filter(c => c.group === selectedGroup);
      
      // Group sales data by customer (party)
      const customerSalesMap = {};
      data.forEach(sale => {
        // Validate required fields
        if (!sale.party || !sale.qty || !sale.total) {
          console.warn('Skipping invalid sale record:', sale);
          return;
        }
        
        if (!customerSalesMap[sale.party]) {
          customerSalesMap[sale.party] = {
            party: sale.party,
            items: [],
            totalQty: 0,
            totalAmount: 0,
            smsStatus: sale.smsStatus || 'pending'
          };
        }
        customerSalesMap[sale.party].items.push(sale);
        customerSalesMap[sale.party].totalQty += parseFloat(sale.qty) || 0;
        customerSalesMap[sale.party].totalAmount += parseFloat(sale.total) || 0;
      });
      
      // Filter to only show customers in the selected group
      const groupCustomerNames = groupCustomers.map(c => c.name);
      const filteredSales = Object.values(customerSalesMap)
        .filter(cs => groupCustomerNames.includes(cs.party));
      
      setFilteredData(filteredSales);
      
      // Show success message
      if (filteredSales.length === 0) {
        setError('No sales data found for the selected period and group');
      }
      
    } catch (err) {
      console.error('Failed to fetch daily sales:', err);
      
      // Retry logic for network errors
      if (retryCount < 2 && (err.code === 'NETWORK_ERROR' || err.message.includes('fetch'))) {
        console.log(`Retrying... (${retryCount + 1}/2)`);
        setTimeout(() => {
          handleFilter(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      const errorMessage = err?.message || 'Failed to load sales data';
      setError(errorMessage);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      qty: acc.qty + (curr.totalQty || 0),
      amount: acc.amount + (curr.totalAmount || 0)
    }), { qty: 0, amount: 0 });
  }, [filteredData]);

  const handlePrint = async () => {
    if (!selectedGroup) {
      alert('Please select a group first');
      return;
    }
    
    if (filteredData.length === 0) {
      alert('No data to print. Please load data first.');
      return;
    }
    
    try {
      // Show loading state
      setLoading(true);
      setError(null);
      
      // Generate the print report from backend
      const response = await api.getDailySalesReport(fromDate, toDate);
      
      // Handle different response types
      let blob;
      if (response?.data instanceof Blob) {
        blob = response.data;
      } else if (response instanceof Blob) {
        blob = response;
      } else {
        throw new Error('Invalid response format from server');
      }
      
      // Handle PDF preview (open in new tab for print preview)
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab for preview and print
      const previewWindow = window.open(url, '_blank');
      if (!previewWindow) {
        // Fallback to download if popup blocked
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily_sales_report_${selectedGroup}_${fromDate}_to_${toDate}_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Print error:', error);
      const errorMessage = error?.message || 'Print failed. Please try again.';
      setError(errorMessage);
      alert(`Print failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  const handleSendSMS = () => {
    alert('SMS feature coming soon!');
  };

  const getSMSStatusIcon = (status) => {
    if (status === 'sent') {
      return <CheckCircle size={16} className="text-green-600" />;
    }
    return <Clock size={16} className="text-orange-500" />;
  };

  const getSMSStatusText = (status) => {
    return status === 'sent' ? 'Sent' : 'Pending';
  };

  // Reset state when component unmounts or is cancelled
=======
>>>>>>> b3f7a25483bc73acf052a4a96638557ba90dabab
  useEffect(() => {
    return () => {
      // Reset to default state when component unmounts
      setState(DEFAULT_STATES.dailySaleReport);
    };
  }, []);

  const handleCancel = () => {
    // Reset state before cancelling
    setState(DEFAULT_STATES.dailySaleReport);
    onCancel && onCancel();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
      
      {/* Modal Header */}
      <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-xl rounded-b-xl">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wider">
          <Package className="w-5 h-5 text-white" /> GROUP DAILY SALE
        </h1>
        {onCancel && (
          <button onClick={handleCancel} className="p-1.5 rounded-lg hover:bg-white/20 transition-all">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4 overflow-hidden">
        
<<<<<<< HEAD
        {/* Controls Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg shrink-0 backdrop-blur-sm">
          <div className="grid grid-cols-12 gap-4 items-end">
            
            {/* Group Filter */}
            <div className="col-span-4">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Select Group</label>
              <div className="relative">
                <select 
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 appearance-none"
                  data-enter-index="1"
=======
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

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input 
                type="date" 
                className="bg-transparent py-1.5 text-xs font-semibold outline-none w-28" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span className="text-[10px] font-bold text-slate-400">TO</span>
              <input 
                type="date" 
                className="bg-transparent py-1.5 text-xs font-semibold outline-none w-28" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {/* Item Filter */}
            <div className="">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Item Filter</label>
              <div className="relative">
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full bg-amber-50 border-2 border-amber-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 appearance-none min-w-[200px]"
>>>>>>> b3f7a25483bc73acf052a4a96638557ba90dabab
                >
                  <option value="">-- Select Group --</option>
                  {groups.map(group => <option key={group.id} value={group.name}>{group.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400 pointer-events-none" />
              </div>
            </div>

            {/* Date Selection */}
            <div className="col-span-3">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">From Date</label>
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" 
                data-enter-index="2"
              />
            </div>
            <div className="col-span-3">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">To Date</label>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" 
                data-enter-index="3"
              />
            </div>

            {/* Go Button */}
<<<<<<< HEAD
            <div className="col-span-2 flex justify-end gap-2">
              <button 
                onClick={handleFilter}
                disabled={loading || !selectedGroup}
                className="bg-gradient-to-r from-rose-500 to-rose-600 text-white px-6 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 tracking-wider"
                data-enter-index="4"
=======
            <div className="flex items-end">
              <button
                onClick={() => handleFilter()}
                disabled={loading || !selectedGroup}
                className="bg-gradient-to-r from-rose-500 to-rose-600 text-white px-6 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 tracking-wider h-[42px]"
>>>>>>> b3f7a25483bc73acf052a4a96638557ba90dabab
              >
                <Search size={16} /> {loading ? 'Loading...' : 'GO'}
              </button>
              <button 
                onClick={() => {
                  setState(DEFAULT_STATES.dailySaleReport);
                  setSelectedGroup('');
                }}
                disabled={loading}
                className="bg-gradient-to-r from-slate-500 to-slate-600 text-white px-4 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-slate-600 hover:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 tracking-wider"
                title="Reset all filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-700 text-sm font-bold shadow-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            {error}
          </div>
        )}

        {/* Table Area */}
        <div className="flex-1 bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-lg">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] sticky top-0 text-white uppercase font-bold text-xs z-10 border-b-2 border-black/20 shadow-lg">
              <tr>
                <th className="p-3.5 w-16 border-r border-black/20">Sl.No</th>
                <th className="p-3.5 border-r border-black/20">Customer Name</th>
                <th className="p-3.5 w-36 text-right border-r border-black/20">Total Qty</th>
                <th className="p-3.5 w-44 text-right border-r border-black/20">Total Amount</th>
                <th className="p-3.5 w-36 text-center">SMS Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-slate-500 text-sm font-bold">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                      Loading data...
                    </div>
                  </td>
                </tr>
<<<<<<< HEAD
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-slate-500 text-sm font-bold">
                    {selectedGroup ? 'No sales data found for the selected period' : 'Please select a group'}
                  </td>
                </tr>
              ) : (
                <>
                  {filteredData.map((row, idx) => (
                    <tr key={row.party} className="border-b border-slate-100 hover:bg-slate-50 transition-all duration-150">
                      <td className="p-3.5 font-bold text-slate-700 border-r border-slate-100">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-slate-800 border-r border-slate-100">{row.party}</td>
                      <td className="p-3.5 text-right font-bold text-slate-800 border-r border-slate-100">{row.totalQty.toFixed(2)}</td>
                      <td className="p-3.5 text-right font-black text-slate-900 border-r border-slate-100">₹{row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getSMSStatusIcon(row.smsStatus)}
                          <span className={`text-xs font-black uppercase ${
                            row.smsStatus === 'sent' ? 'text-green-600' : 'text-orange-500'
                          }`}>
                            {getSMSStatusText(row.smsStatus)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions & Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg shrink-0 backdrop-blur-sm">
          <div className="grid grid-cols-12 gap-4 items-center">
            
            <div className="col-span-6 flex gap-3">
=======
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-sm text-slate-500">
                      {loading ? 'Loading...' : 'No data available. Please select a group and click GO.'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, i) => (
                    <tr key={row.id || i} className="hover:bg-indigo-50/50 transition-colors group h-[45px]">
                      <td className="px-4 py-2 text-xs font-bold text-slate-400 text-center">{i + 1}</td>
                      <td className="px-4 py-2 text-xs font-medium text-slate-500">{row.date}</td>
                      <td className="px-4 py-2 text-xs font-bold text-slate-800 uppercase tracking-tight truncate">{row.partyName}</td>
                      <td className="px-4 py-2 text-xs text-slate-400 italic truncate">{row.itemDetails}</td>
                      <td className="px-4 py-2 text-xs text-right font-medium text-slate-600">{row.qty}</td>
                      <td className="px-4 py-2 text-xs text-right font-medium text-slate-600">{row.rate?.toFixed(2)}</td>
                      <td className="px-4 py-2 text-xs text-right font-black text-indigo-700">{row.totalAmount?.toFixed(2)}</td>
                    </tr>
                  ))
                )}
                {/* Padding with empty rows if less than 10 */}
                {filteredData.length > 0 && filteredData.length < 10 && [...Array(10 - filteredData.length)].map((_, i) => (
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
              <span className="text-sm font-black text-slate-700 w-24 text-right tabular-nums">{totals.qty}</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Total</span>
              <span className="text-lg font-black text-emerald-600 w-24 text-right tabular-nums">{totals.amount.toFixed(2)}</span>
            </div>
            
            <div className="flex gap-3 mt-3">
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 px-6 py-2 rounded-lg font-bold text-[11px] uppercase transition-all shadow-sm"
              >
                <Printer size={14} /> Print Report
              </button>
              
>>>>>>> b3f7a25483bc73acf052a4a96638557ba90dabab
              <button 
                onClick={handleSendSMS}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 tracking-wider"
                data-enter-index="5"
              >
                <Send size={16} /> SEND SMS
              </button>
              <button 
                onClick={handlePrint}
                className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-5 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-slate-800 hover:to-slate-900 transition-all duration-200 flex items-center gap-2 tracking-wider"
                data-enter-index="6"
              >
                <Printer size={16} /> PRINT
              </button>
              {onCancel && (
                <button 
                  onClick={onCancel}
                  className="bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 px-5 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-slate-300 hover:to-slate-400 transition-all duration-200 flex items-center gap-2 tracking-wider border border-slate-300"
                  data-enter-index="7"
                >
                  CANCEL
                </button>
              )}
            </div>

<<<<<<< HEAD
            {/* Totals Section */}
            <div className="col-span-6 grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 border border-slate-200 shadow-sm">
                <label className="text-[10px] font-black uppercase text-slate-600 mb-2 block tracking-wider">Total Quantity</label>
                <input 
                  type="text" 
                  readOnly 
                  className="w-full bg-white border-2 border-slate-200 rounded-lg p-2.5 text-sm font-black text-right text-slate-800 outline-none shadow-inner" 
                  value={totals.qty.toFixed(2)}
                />
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg p-3 border-2 border-rose-200 shadow-sm">
                <label className="text-[10px] font-black uppercase text-rose-700 mb-2 block tracking-wider">Amount Total</label>
                <input 
                  type="text" 
                  readOnly 
                  className="w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white border-2 border-rose-600 rounded-lg p-2.5 text-sm font-black text-right outline-none shadow-lg" 
                  value={`₹ ${totals.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
              </div>
=======
              <button 
                onClick={handleCancel}
                className="bg-slate-800 text-white hover:bg-slate-900 px-8 py-2 rounded-lg font-bold text-[11px] uppercase transition-all shadow-lg active:scale-95"
              >
                Cancel
              </button>
>>>>>>> b3f7a25483bc73acf052a4a96638557ba90dabab
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * APP ENTRY POINT
 */
export default DailySaleReport;