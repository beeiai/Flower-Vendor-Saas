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

  // Fetch groups and customers on mount
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [groupsData, customersData] = await Promise.all([
          api.listGroups(),
          api.listCustomers()
        ]);
        setGroups(groupsData || []);
        setCustomers(customersData || []);
        
        // Do NOT auto-select first group - maintain clean slate behavior
        // if (groupsData && groupsData.length > 0) {
        //   setSelectedGroup(groupsData[0].name);
        // }
      } catch (err) {
        console.error('Failed to load master data:', err);
      }
    };
    fetchMasterData();
  }, []);

  // Auto-fetch when group changes or dates change
  useEffect(() => {
    if (selectedGroup) {
      handleFilter();
    }
  }, [selectedGroup, fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilter = async () => {
    if (!selectedGroup) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDailySales(fromDate, toDate, null);
      
      // Filter customers by selected group
      const groupCustomers = customers.filter(c => c.group === selectedGroup);
      
      // Group sales data by customer (party)
      const customerSalesMap = {};
      data.forEach(sale => {
        if (!customerSalesMap[sale.party]) {
          customerSalesMap[sale.party] = {
            party: sale.party,
            items: [],
            totalQty: 0,
            totalAmount: 0,
            smsStatus: sale.smsStatus || 'pending' // Will be enhanced when backend provides SMS status
          };
        }
        customerSalesMap[sale.party].items.push(sale);
        customerSalesMap[sale.party].totalQty += sale.qty;
        customerSalesMap[sale.party].totalAmount += sale.total;
      });
      
      // Filter to only show customers in the selected group
      const groupCustomerNames = groupCustomers.map(c => c.name);
      const filteredSales = Object.values(customerSalesMap)
        .filter(cs => groupCustomerNames.includes(cs.party));
      
      setFilteredData(filteredSales);
    } catch (err) {
      console.error('Failed to fetch daily sales:', err);
      setError(err?.message || 'Failed to load sales data');
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      qty: acc.qty + curr.totalQty,
      amount: acc.amount + curr.totalAmount
    }), { qty: 0, amount: 0 });
  }, [filteredData]);

  const handlePrint = async () => {
    try {
      // Generate the print report from backend
      const response = await api.getDailySalesReport(fromDate, toDate);
      
      // Create a new window/tab for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(response);
      printWindow.document.close();
      
      // Trigger print after content loads
      printWindow.onload = () => {
        printWindow.print();
      };
      
    } catch (error) {
      console.error('Print error:', error);
      alert(`Print failed: ${error.message}`);
    }
  };

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
            <div className="col-span-2 flex justify-end">
              <button 
                onClick={handleFilter}
                disabled={loading || !selectedGroup}
                className="bg-gradient-to-r from-rose-500 to-rose-600 text-white px-6 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 tracking-wider"
                data-enter-index="4"
              >
                <Search size={16} /> {loading ? 'Loading...' : 'GO'}
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
