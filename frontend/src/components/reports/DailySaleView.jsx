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
    <div className="flex-1 flex flex-col h-full bg-[#f1f3f5] overflow-hidden">
      
      {/* Modal Header */}
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2">
          <Package className="w-4 h-4 text-rose-500" /> GROUP DAILY SALE
        </h1>
        {onCancel && (
          <button onClick={handleCancel} className="p-1 hover:bg-rose-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3 overflow-hidden">
        
        {/* Controls Section */}
        <div className="bg-white border border-slate-300 p-3 shadow-sm shrink-0">
          <div className="grid grid-cols-12 gap-3 items-end">
            
            {/* Group Filter */}
            <div className="col-span-4">
              <label className="text-[9px] font-black uppercase text-slate-500">Select Group</label>
              <select 
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full border p-2 text-[11px] font-bold outline-none bg-white"
              >
                <option value="">-- Select Group --</option>
                {groups.map(group => <option key={group.id} value={group.name}>{group.name}</option>)}
              </select>
            </div>

            {/* Date Selection */}
            <div className="col-span-3">
              <label className="text-[9px] font-black uppercase text-slate-500">From Date</label>
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border p-2 text-[11px] font-bold outline-none" 
              />
            </div>
            <div className="col-span-3">
              <label className="text-[9px] font-black uppercase text-slate-500">To Date</label>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border p-2 text-[11px] font-bold outline-none" 
              />
            </div>

            {/* Go Button */}
            <div className="col-span-2 flex justify-end">
              <button 
                onClick={handleFilter}
                disabled={loading || !selectedGroup}
                className="bg-slate-800 text-white px-6 h-9 font-black uppercase text-[10px] hover:bg-slate-700 shadow-lg disabled:opacity-40 flex items-center gap-2"
              >
                <Search size={14} /> {loading ? 'Loading...' : 'GO'}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-300 p-3 text-red-700 text-[11px] font-bold">
            {error}
          </div>
        )}

        {/* Table Area */}
        <div className="flex-1 bg-white border-2 border-slate-300 overflow-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-200 sticky top-0 uppercase font-black text-[9px] z-10 border-b-2 border-slate-400">
              <tr>
                <th className="p-3 w-14">Sl.No</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3 w-32 text-right">Total Qty</th>
                <th className="p-3 w-40 text-right">Total Amount</th>
                <th className="p-3 w-32 text-center">SMS Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500 text-[11px] font-bold">
                    Loading data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500 text-[11px] font-bold">
                    {selectedGroup ? 'No sales data found for the selected period' : 'Please select a group'}
                  </td>
                </tr>
              ) : (
                <>
                  {filteredData.map((row, idx) => (
                    <tr key={row.party} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-700">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-800">{row.party}</td>
                      <td className="p-3 text-right font-bold text-slate-800">{row.totalQty.toFixed(2)}</td>
                      <td className="p-3 text-right font-black text-slate-900">₹{row.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getSMSStatusIcon(row.smsStatus)}
                          <span className={`text-[9px] font-black uppercase ${
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
        <div className="bg-white border border-slate-300 p-3 shadow-sm shrink-0">
          <div className="grid grid-cols-12 gap-3 items-center">
            
            <div className="col-span-6 flex gap-2">
              <button 
                onClick={handleSendSMS}
                className="bg-emerald-600 text-white px-6 h-9 font-black uppercase text-[10px] hover:bg-emerald-700 shadow-lg flex items-center gap-2"
              >
                <Send size={14} /> SEND SMS
              </button>
              <button 
                onClick={handlePrint}
                className="bg-slate-800 text-white px-6 h-9 font-black uppercase text-[10px] hover:bg-slate-700 shadow-lg flex items-center gap-2"
              >
                <Printer size={14} /> PRINT
              </button>
              {onCancel && (
                <button 
                  onClick={onCancel}
                  className="bg-slate-300 text-slate-800 px-6 h-9 font-black uppercase text-[10px] hover:bg-slate-400 flex items-center gap-2"
                >
                  CANCEL
                </button>
              )}
            </div>

            {/* Totals Section */}
            <div className="col-span-6 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500">Total Quantity</label>
                <input 
                  type="text" 
                  readOnly 
                  className="w-full bg-slate-100 border p-2 text-[11px] font-black text-right outline-none" 
                  value={totals.qty.toFixed(2)}
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500">Amount Total</label>
                <input 
                  type="text" 
                  readOnly 
                  className="w-full bg-rose-600 text-white border border-rose-700 p-2 text-[11px] font-black text-right outline-none" 
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
