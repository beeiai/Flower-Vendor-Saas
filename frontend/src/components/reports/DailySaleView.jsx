import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { X, Send, Filter, Calendar, Users, ChevronRight, Printer, Search, CheckCircle, Clock } from 'lucide-react';
import { api } from '../../utils/api';
import { DEFAULT_STATES } from '../../utils/stateManager';

const DailySaleReport = ({ onCancel }) => {
  const [state, setState] = useState(DEFAULT_STATES.dailySaleReport);
  
  const {
    fromDate,
    toDate,
    selectedGroup,
    selectedItem,
    groups,
    items,
    customers,
    filteredData,
    loading,
    error
  } = state;

  const setFromDate = useCallback((value) => setState(prev => ({ ...prev, fromDate: value })), []);
  const setToDate = useCallback((value) => setState(prev => ({ ...prev, toDate: value })), []);
  const setSelectedGroup = useCallback((value) => setState(prev => ({ ...prev, selectedGroup: value })), []);
  const setSelectedItem = useCallback((value) => setState(prev => ({ ...prev, selectedItem: value })), []);
  const setGroups = useCallback((value) => setState(prev => ({ ...prev, groups: value })), []);
  const setItems = useCallback((value) => setState(prev => ({ ...prev, items: value })), []);
  const setCustomers = useCallback((value) => setState(prev => ({ ...prev, customers: value })), []);
  const setFilteredData = useCallback((value) => setState(prev => ({ ...prev, filteredData: value })), []);
  const setLoading = useCallback((value) => setState(prev => ({ ...prev, loading: value })), []);
  const setError = useCallback((value) => setState(prev => ({ ...prev, error: value })), []);

  // ✅ FIX: Use a ref to always have latest customers without stale closure
  const customersRef = useRef([]);
  const selectedGroupRef = useRef('');
  const selectedItemRef = useRef('');

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  useEffect(() => {
    selectedItemRef.current = selectedItem;
  }, [selectedItem]);

  // ✅ FIX: handleFilter accepts optional fresh customers to avoid stale state
  const handleFilter = useCallback(async (customersOverride) => {
    const currentGroup = selectedGroupRef.current;
    const currentItem = selectedItemRef.current;
    if (!currentGroup) return;

    const currentCustomers = customersOverride || customersRef.current;

    setLoading(true);
    setError(null);
    try {
      const data = await api.getDailySales(fromDate, toDate, currentItem);

      const groupCustomers = currentCustomers.filter(c => c.group === currentGroup);
      const groupCustomerNames = groupCustomers.map(c => c.name);

      const customerSalesMap = {};
      data.forEach(sale => {
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
        customerSalesMap[sale.party].totalQty += sale.qty;
        customerSalesMap[sale.party].totalAmount += sale.total;
      });

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
  }, [fromDate, toDate, setLoading, setError, setFilteredData]);

  // ✅ FIX: Fetch master data first, then trigger filter with fresh customers
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [groupsData, customersData, itemsData] = await Promise.all([
          api.listGroups(),
          api.listCustomers(),
          api.getDailySalesItems()
        ]);
        const safeGroups = groupsData || [];
        const safeCustomers = customersData || [];
        const safeItems = itemsData || [];

        setGroups(safeGroups);
        setCustomers(safeCustomers);
        setItems(safeItems);
        customersRef.current = safeCustomers; // ✅ update ref immediately

        // If group already selected, re-run filter with fresh customers
        if (selectedGroupRef.current) {
          handleFilter(safeCustomers);
        }
      } catch (err) {
        console.error('Failed to load master data:', err);
      }
    };
    fetchMasterData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Re-fetch when group or dates change (customers already loaded by now)
  useEffect(() => {
    if (selectedGroup) {
      handleFilter();
    }
  }, [selectedGroup, fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      qty: acc.qty + curr.totalQty,
      amount: acc.amount + curr.totalAmount
    }), { qty: 0, amount: 0 });
  }, [filteredData]);

  const handlePrint = async () => {
    try {
      const response = await api.getDailySalesReport(fromDate, toDate);
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const previewWindow = window.open(url, '_blank');
      if (!previewWindow) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily_sales_report_${fromDate}_to_${toDate}_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Print error:', error);
      alert(`Print failed: ${error.message}`);
    }
  };

  const handleSendSMS = () => {
    alert('SMS feature coming soon!');
  };

  const getSMSStatusIcon = (status) => {
    if (status === 'sent') return <CheckCircle size={16} className="text-green-600" />;
    return <Clock size={16} className="text-orange-500" />;
  };

  const getSMSStatusText = (status) => {
    return status === 'sent' ? 'Sent' : 'Pending';
  };

  useEffect(() => {
    return () => { setState(DEFAULT_STATES.dailySaleReport); };
  }, []);

  const handleCancel = () => {
    setState(DEFAULT_STATES.dailySaleReport);
    onCancel && onCancel();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-xl">
        <h1 className="text-lg font-bold uppercase flex items-center gap-2 tracking-wider">
          <Users className="w-5 h-5" /> DAILY SALES REPORT
        </h1>
        <button onClick={handleCancel} className="p-2 rounded-lg hover:bg-white/20 transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 overflow-hidden">
        
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg">
          <div className="grid grid-cols-12 gap-4">
            
            {/* Group Selection */}
            <div className="col-span-3">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Group</label>
              <div className="relative">
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 appearance-none"
                >
                  <option value="">Select Group</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.name}>{group.name}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
              </div>
            </div>

            {/* Date Range */}
            <div className="col-span-4">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Date Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
                <span className="text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>
            </div>

            {/* Item Filter */}
            <div className="col-span-3">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Item Filter</label>
              <div className="relative">
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full bg-amber-50 border-2 border-amber-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 appearance-none"
                >
                  <option value="">All Items</option>
                  {items.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
              </div>
            </div>
            
            {/* Go Button */}
            <div className="col-span-2 flex items-end">
              <button
                onClick={() => handleFilter()}
                disabled={loading || !selectedGroup}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 tracking-wider w-full justify-center"
              >
                <Search size={16} /> {loading ? 'Loading...' : 'GO'}
              </button>
            </div>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 bg-white rounded-xl border-2 border-slate-200 overflow-auto shadow-lg">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gradient-to-r from-emerald-600 to-emerald-700 sticky top-0 text-white uppercase font-bold text-xs z-10 border-b-2 border-black/20 shadow-lg">
              <tr>
                <th className="p-3.5 w-14 border-r border-black/20">Sl.No</th>
                <th className="p-3.5 border-r border-black/20">Customer Name</th>
                <th className="p-3.5 border-r border-black/20">Items</th>
                <th className="p-3.5 w-24 text-center border-r border-black/20">Total Qty</th>
                <th className="p-3.5 w-28 text-center border-r border-black/20">Total Amount</th>
                <th className="p-3.5 w-24 text-center">SMS Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-16 text-center text-slate-500 text-sm font-bold">
                    {loading ? 'Loading data...' : 'No data available'}
                  </td>
                </tr>
              ) : (
                filteredData.map((customer, idx) => (
                  <tr
                    key={customer.party}
                    className="border-b border-black/10 hover:bg-slate-50 transition-all duration-150"
                  >
                    <td className="p-3.5 font-bold text-slate-700 border-r border-black/10">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-slate-800 border-r border-black/10">{customer.party}</td>
                    <td className="p-3.5 text-slate-600 border-r border-black/10">
                      <div className="flex flex-wrap gap-1">
                        {customer.items.slice(0, 3).map((item, i) => (
                          <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs">
                            {item.itemName}
                          </span>
                        ))}
                        {customer.items.length > 3 && (
                          <span className="text-slate-400 text-xs">+{customer.items.length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-700 border-r border-black/10">
                      {customer.totalQty.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center font-bold text-emerald-600 border-r border-black/10">
                      ₹{customer.totalAmount.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="flex items-center justify-center gap-1">
                        {getSMSStatusIcon(customer.smsStatus)}
                        <span className="text-xs font-black uppercase text-slate-600">
                          {getSMSStatusText(customer.smsStatus)}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals and Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Total Quantity</span>
                <span className="text-xl font-black text-slate-800 tabular-nums">
                  {totals.qty.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Amount Total</span>
                <span className="text-2xl font-black text-emerald-600 tabular-nums">
                  ₹{totals.amount.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-5 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-slate-800 hover:to-slate-900 transition-all duration-200 flex items-center gap-2 tracking-wider"
              >
                <Printer size={16} /> PRINT REPORT
              </button>
              <button
                onClick={handleSendSMS}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 tracking-wider"
              >
                <Send size={16} /> SEND SMS
              </button>
              <button
                onClick={handleCancel}
                className="bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 px-5 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-slate-300 hover:to-slate-400 transition-all duration-200 flex items-center gap-2 tracking-wider border border-slate-300"
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

export default DailySaleReport;