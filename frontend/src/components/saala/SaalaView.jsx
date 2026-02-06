import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Users, UserPlus, Edit2, Trash2, Database, PackagePlus, Save, Plus } from 'lucide-react';
import { SearchableSelect } from '../shared/SearchableSelect';
import { api } from '../../utils/api';
import { DEFAULT_STATES } from '../../utils/stateManager';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { useERPEnterNavigation } from '../../hooks/useERPEnterNavigation';

// ============================================================================
// TAB 1: SAALA CUSTOMER ADDITION
// ============================================================================
function CustomerAdditionTab({ customers, setCustomers, showNotify }) {
  const [form, setForm] = useState({ name: '', contact: '', address: '' });
  const [editingId, setEditingId] = useState(null);

  const handleSave = async () => {
    const name = String(form.name || '').trim();
    if (!name) return showNotify?.('Enter customer name', 'error');

    try {
      if (editingId) {
        await api.updateSaalaCustomer(editingId, form);
        setCustomers(customers.map(c => c.id === editingId ? { ...c, ...form } : c));
        showNotify?.('Customer updated successfully', 'success');
        setEditingId(null);
      } else {
        const created = await api.createSaalaCustomer(form);
        setCustomers([...customers, created]);
        showNotify?.('Customer added successfully', 'success');
      }
      setForm({ name: '', contact: '', address: '' });
    } catch (e) {
      showNotify?.(`Failed: ${e.message}`, 'error');
    }
  };

  const handleEdit = (customer) => {
    setEditingId(customer.id);
    setForm({ name: customer.name, contact: customer.contact || '', address: customer.address || '' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this SAALA customer? All their transactions will also be deleted.')) return;
    try {
      await api.deleteSaalaCustomer(id);
      setCustomers(customers.filter(c => c.id !== id));
      showNotify?.('Customer deleted', 'success');
    } catch (e) {
      showNotify?.(`Delete failed: ${e.message}`, 'error');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ name: '', contact: '', address: '' });
  };

  return (
    <div className="flex-1 flex gap-5 p-5 overflow-hidden">
      {/* Left: Add/Edit Form */}
      <div className="w-80 bg-white rounded-xl border-2 border-slate-200 p-5 shadow-lg h-fit shrink-0 backdrop-blur-sm">
        <h3 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2.5 tracking-wider">
          <UserPlus className="w-5 h-5 text-rose-500" /> {editingId ? 'EDIT CUSTOMER' : 'ADD CUSTOMER'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Customer Name *</label>
            <input 
              type="text" 
              className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" 
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })} 
              placeholder="Enter name"
              data-enter-index="1"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Contact Number</label>
            <input 
              type="text" 
              className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" 
              value={form.contact} 
              onChange={e => setForm({ ...form, contact: e.target.value })} 
              placeholder="Phone number"
              data-enter-index="2"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Address</label>
            <input 
              type="text" 
              className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" 
              value={form.address} 
              onChange={e => setForm({ ...form, address: e.target.value })} 
              placeholder="Address"
              data-enter-index="3"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              data-action="primary"
              onClick={handleSave} 
              className="flex-1 bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-[#4A44D0] hover:to-[#3A34C0] transition-all duration-200 tracking-wider"
              data-enter-index="4"
            >
              {editingId ? 'UPDATE' : 'ADD CUSTOMER'}
            </button>
            {editingId && (
              <button 
                onClick={handleCancel} 
                className="px-4 bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-slate-300 hover:to-slate-400 transition-all duration-200 border border-slate-300 tracking-wider"
                data-enter-index="5"
              >
                CANCEL
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Customer List */}
      <div className="flex-1 bg-white rounded-xl border-2 border-slate-200 shadow-lg overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-slate-100 to-slate-200 px-5 py-3 border-b-2 font-bold text-sm text-slate-700 flex items-center gap-2.5 uppercase tracking-wider">
          <Users className="w-5 h-5 text-rose-500" /> SAALA Customer Registry ({customers.length})
        </div>
        <div className="flex-1 overflow-auto custom-table-scroll">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] sticky top-0 text-white uppercase font-bold text-xs z-10 border-b-2 border-black/20 shadow-lg">
              <tr>
                <th className="px-4 py-3.5 border-r border-black/20">Customer Name</th>
                <th className="px-4 py-3.5 border-r border-black/20">Contact</th>
                <th className="px-4 py-3.5 border-r border-black/20">Address</th>
                <th className="px-4 py-3.5 text-right w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-16 text-center text-slate-500 text-sm font-bold">
                    No SAALA customers added yet
                  </td>
                </tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-all duration-150 group">
                    <td className="px-4 py-3.5 font-bold text-slate-800 border-r border-slate-100">{String(c.name)}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 border-r border-slate-100">{String(c.contact || '--')}</td>
                    <td className="px-4 py-3.5 text-slate-600 border-r border-slate-100">{String(c.address || '--')}</td>
                    <td className="px-4 py-3.5 text-right space-x-1">
                      <button onClick={() => handleEdit(c)} className="p-1.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-50 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 4: DATE RANGE REPORT
// ============================================================================
function DateRangeReportTab({ customers, showNotify }) {
  const [dateRange, setDateRange] = useState({
    fromDate: '',
    toDate: ''
  });
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateReport = async () => {
    // Validation
    if (!dateRange.fromDate || !dateRange.toDate) {
      showNotify?.('Please select both from and to dates', 'error');
      return;
    }

    if (new Date(dateRange.fromDate) > new Date(dateRange.toDate)) {
      showNotify?.('From date cannot be later than to date', 'error');
      return;
    }

    setLoading(true);
    setError('');
    setReportData([]);

    try {
      const token = localStorage.getItem('skfs_auth_token');
      const vendorId = localStorage.getItem('skfs_vendor_id');

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/silk/saala-transactions-by-date-range?from_date=${dateRange.fromDate}&to_date=${dateRange.toDate}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch report data');
      }

      const result = await response.json();
      setReportData(result.customers || []);
      
      if (result.customers && result.customers.length === 0) {
        showNotify?.('No transactions found for the selected date range', 'info');
      } else {
        showNotify?.(`Report generated successfully: ${result.total_customers} customers with transactions`, 'success');
      }
    } catch (e) {
      setError(e.message);
      showNotify?.(`Error: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString()}`;
  };

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
      {/* Date Range Selection */}
      <section className="bg-white border border-slate-200 p-4 shadow-card rounded-sm shrink-0">
        <div className="flex items-center gap-2 mb-4 text-primary-600 font-semibold text-xs border-b pb-2">
          <Database className="w-4 h-4" /> Date Range Selection
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-2xl">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">From Date *</label>
            <input 
              type="date" 
              className="w-full border border-slate-300 px-3 rounded-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" 
              style={{ height: '36px' }}
              value={dateRange.fromDate} 
              onChange={e => setDateRange({...dateRange, fromDate: e.target.value})} 
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">To Date *</label>
            <input 
              type="date" 
              className="w-full border border-slate-300 px-3 rounded-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" 
              style={{ height: '36px' }}
              value={dateRange.toDate} 
              onChange={e => setDateRange({...dateRange, toDate: e.target.value})} 
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button 
              onClick={handleGenerateReport}
              disabled={loading || !dateRange.fromDate || !dateRange.toDate}
              className="w-full bg-primary-600 text-white py-2 px-4 text-sm font-semibold rounded-sm hover:bg-primary-700 shadow-md transition-all active:translate-y-px disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ height: '36px' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-red-800 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Error:</span>
            {error}
          </div>
        </div>
      )}

      {/* Report Results */}
      <section className="flex-1 bg-white rounded-xl border-2 border-slate-200 shadow-lg overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-slate-100 to-slate-200 px-5 py-3 border-b-2 font-bold text-sm text-slate-700 flex items-center justify-between uppercase tracking-wider">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-rose-500" /> SAALA TRANSACTIONS REPORT
            {reportData.length > 0 && (
              <span className="bg-gradient-to-r from-rose-100 to-rose-200 text-rose-800 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                {reportData.length} Customer{reportData.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-600 font-bold">
            {dateRange.fromDate && dateRange.toDate && (
              `Period: ${new Date(dateRange.fromDate).toLocaleDateString()} - ${new Date(dateRange.toDate).toLocaleDateString()}`
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-auto custom-table-scroll">
          {reportData.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-sm font-bold">
              {loading ? 'Generating report...' : 'Select a date range and click Generate Report to view transactions'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reportData.map((customerData, customerIndex) => (
                <div key={customerData.customer_id} className="border-b border-slate-200 last:border-b-0">
                  {/* Customer Header */}
                  <div className="bg-slate-50 px-4 py-3 border-l-4 border-primary-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">
                          {customerData.customer_name}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
                          {customerData.customer_contact && (
                            <span>📞 {customerData.customer_contact}</span>
                          )}
                          {customerData.customer_address && (
                            <span>📍 {customerData.customer_address}</span>
                          )}
                          <span>{customerData.transaction_count} transaction{customerData.transaction_count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Total Amount</div>
                        <div className="font-semibold text-slate-800">
                          {formatCurrency(
                            customerData.transactions.reduce((sum, txn) => sum + (txn.total_amount || 0), 0)
                          )}
                        </div>
                        <div className="text-xs text-emerald-600">Paid: {
                          formatCurrency(
                            customerData.transactions.reduce((sum, txn) => sum + (txn.paid_amount || 0), 0)
                          )
                        }</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Customer Transactions */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 w-20">Date</th>
                          <th className="px-3 py-2 w-20">Item Code</th>
                          <th className="px-3 py-2 w-24">Item Name</th>
                          <th className="px-3 py-2 text-right w-12">Qty</th>
                          <th className="px-3 py-2 text-right w-12">Rate</th>
                          <th className="px-3 py-2 text-right w-20">Total</th>
                          <th className="px-3 py-2 text-right w-20">Paid</th>
                          <th className="px-3 py-2 text-right w-20">Balance</th>
                          <th className="px-3 py-2 w-24">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerData.transactions.map((txn, txnIndex) => (
                          <tr key={txn.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono text-slate-600">{formatDate(txn.date)}</td>
                            <td className="px-3 py-2 font-mono text-slate-600">{txn.item_code || '--'}</td>
                            <td className="px-3 py-2 text-slate-800">{txn.item_name || '--'}</td>
                            <td className="px-3 py-2 text-right font-medium">{txn.qty || '0'}</td>
                            <td className="px-3 py-2 text-right font-mono">₹{txn.rate || '0'}</td>
                            <td className="px-3 py-2 text-right font-semibold text-slate-700">
                              {formatCurrency(txn.total_amount)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                              {formatCurrency(txn.paid_amount)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-primary-600">
                              {formatCurrency(txn.balance)}
                            </td>
                            <td className="px-3 py-2 text-slate-600 truncate max-w-[100px]">{txn.description || '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// TAB 3: SAALA PAYMENTS
// ============================================================================
function SaalaPaymentTab({ customers, showNotify, setDropdownOpen }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [summary, setSummary] = useState({ totalCredit: 0, totalPaid: 0, balance: 0 });

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Load customer summary when customer changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setSummary({ totalCredit: 0, totalPaid: 0, balance: 0 });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const summ = await api.getSaalaCustomerSummary(selectedCustomerId);
        if (cancelled) return;
        // Map API response to expected frontend format
        setSummary({
          totalCredit: summ.total_amount,
          totalPaid: summ.total_paid,
          balance: summ.current_balance
        });
      } catch (e) {
        showNotify?.(`Failed to load summary: ${e.message}`, 'error');
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCustomerId]);

  const handleCustomerSelect = (name) => {
    const customer = customers.find(c => c.name === name);
    setSelectedCustomerId(customer?.id || null);
    // Reset payment form
    setPaymentForm({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handlePaymentSubmit = async () => {
    // Validation
    if (!selectedCustomerId) return showNotify?.('Select a customer first', 'error');
    
    const amount = Number(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) return showNotify?.('Enter valid payment amount (> 0)', 'error');

    const payload = {
      amount: amount,
      description: paymentForm.description.trim() || `Payment of ₹${amount}`,
      date: paymentForm.date
    };

    try {
      const result = await api.addSaalaPayment(selectedCustomerId, payload);
      showNotify?.('Payment recorded successfully', 'success');

      // Refresh summary
      const summ = await api.getSaalaCustomerSummary(selectedCustomerId);
      // Map API response to expected frontend format
      setSummary({
        totalCredit: summ.total_amount,
        totalPaid: summ.total_paid,
        balance: summ.current_balance
      });

      // Reset form
      setPaymentForm({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (e) {
      showNotify?.(`Failed to record payment: ${e.message}`, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-3 p-3 overflow-hidden">
      {/* Customer Selection & Summary */}
      <section className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-lg shrink-0 backdrop-blur-sm">
        <div className="bg-gradient-to-r from-slate-100 to-slate-200 px-5 py-3 border-b-2 font-bold text-sm text-slate-700 flex items-center gap-2.5 mb-4 uppercase tracking-wider">
          <Users className="w-5 h-5 text-rose-500" /> SAALA CUSTOMER SELECTION
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2">
            <SearchableSelect 
              label="SELECT SAALA CUSTOMER" 
              options={customers.map(c => c.name)} 
              value={selectedCustomer?.name || ''} 
              onChange={handleCustomerSelect} 
              placeholder="Search Customer" 
              data-enter-index="18"
              onDropdownStateChange={setDropdownOpen}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Contact</label>
            <input 
              type="text" 
              readOnly 
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-600 cursor-not-allowed" 
              value={String(selectedCustomer?.contact || '--')} 
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Address</label>
            <input 
              type="text" 
              readOnly 
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-600 cursor-not-allowed" 
              value={String(selectedCustomer?.address || '--')} 
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-rose-600 mb-1.5 block tracking-wider">Remaining Balance</label>
            <input 
              type="text" 
              readOnly 
              className="w-full bg-gradient-to-r from-rose-50 to-rose-100 border-2 border-rose-200 text-rose-700 rounded-lg p-2.5 text-sm font-black cursor-not-allowed" 
              value={`₹ ${Number(summary.balance || 0).toLocaleString()}`} 
            />
          </div>
        </div>
      </section>

      {/* Payment Entry Form */}
      <section className="bg-white rounded-xl border-2 border-slate-200 shadow-lg flex flex-col relative z-30 shrink-0 backdrop-blur-sm">
        <div className="bg-gradient-to-r from-slate-100 to-slate-200 px-5 py-3 border-b-2 font-bold text-sm text-slate-700 flex items-center gap-2.5 uppercase tracking-wider">
          <PackagePlus className="w-5 h-5 text-rose-500" /> RECORD CUSTOMER PAYMENT
        </div>
        <div className="p-5">
          <div className="grid grid-cols-4 gap-4 max-w-2xl">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Payment Date</label>
              <input 
                type="date" 
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" 
                value={paymentForm.date} 
                onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} 
                data-enter-index="19"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-emerald-600 mb-1.5 block tracking-wider">Payment Amount *</label>
              <input 
                type="number" 
                className="w-full bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-lg p-2.5 text-sm font-black text-emerald-700 outline-none transition-all duration-200 hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-right" 
                value={paymentForm.amount} 
                onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} 
                placeholder="0.00"
                min="0"
                step="any"
                data-enter-index="20"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-600 mb-1.5 block tracking-wider">Description</label>
              <input 
                type="text" 
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2.5 text-sm font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" 
                value={paymentForm.description} 
                onChange={e => setPaymentForm({...paymentForm, description: e.target.value})} 
                placeholder="Payment description (optional)"
                data-enter-index="21"
              />
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <button 
              onClick={handlePaymentSubmit} 
              disabled={!selectedCustomerId || !paymentForm.amount}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 tracking-wider flex items-center gap-2 disabled:opacity-40"
              data-enter-index="22"
            >
              <Save className="w-4 h-4" />
              RECORD PAYMENT
            </button>
          </div>
        </div>
      </section>

      <div className="text-xs text-slate-500 mt-3 font-bold tracking-wide">
        <p>Recording a payment will reduce the customer's outstanding balance.</p>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 2: SAALA TRANSACTION (CONTINUED)
// ============================================================================
function SaalaTransactionTab({ customers, catalog, showNotify, setDropdownOpen }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalCredit: 0, totalPaid: 0, balance: 0 });
  const [currentEntry, setCurrentEntry] = useState({
    id: null,
    date: new Date().toISOString().split('T')[0],
    itemCode: '',
    itemName: '',
    qty: '',
    rate: '',
    totalAmount: '',
    paidAmount: '',
    remarks: 'regular'
  });

  const qtyRef = useRef(null);
  const rateRef = useRef(null);
  const paidRef = useRef(null);
  const remarksRef = useRef(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Load transactions when customer changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setTransactions([]);
      setSummary({ totalCredit: 0, totalPaid: 0, balance: 0 });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [txns, summ] = await Promise.all([
          api.listSaalaTransactions(selectedCustomerId),
          api.getSaalaCustomerSummary(selectedCustomerId)
        ]);
        if (cancelled) return;
        console.log('Fetched transactions:', txns);
        setTransactions(txns);
        // Map API response to expected frontend format
        setSummary({
          totalCredit: summ.total_amount,
          totalPaid: summ.total_paid,
          balance: summ.current_balance
        });
      } catch (e) {
        showNotify?.(`Failed to load data: ${e.message}`, 'error');
      }
    })();
    return () => { cancelled = true; };
  }, [selectedCustomerId]);

  const handleCustomerSelect = (name) => {
    const customer = customers.find(c => c.name === name);
    setSelectedCustomerId(customer?.id || null);
    // Reset entry form
    setCurrentEntry({
      id: null,
      date: new Date().toISOString().split('T')[0],
      itemCode: '',
      itemName: '',
      qty: '',
      rate: '',
      totalAmount: '',
      paidAmount: '',
      remarks: 'regular'
    });
    
    // Focus on the item code field after customer selection
    setTimeout(() => {
      const itemCodeField = document.querySelector('[data-enter-index="12"]');
      if (itemCodeField) {
        itemCodeField.focus();
      }
    }, 100);
  };

  const handleItemCodeSelect = (itemCode) => {
    const item = catalog.find(i => i.itemCode === itemCode);
    if (item) {
      setCurrentEntry({
        ...currentEntry,
        itemCode: itemCode,
        itemName: item.itemName || '',
        rate: String(item.rate || '')
      });
    }
  };

  // Calculate total amount
  const computedTotal = useMemo(() => {
    const qty = currentEntry.qty ? Number(currentEntry.qty) : 0;
    const rate = currentEntry.rate ? Number(currentEntry.rate) : 0;
    const total = qty * rate;
    return isNaN(total) ? 0 : total;
  }, [currentEntry.qty, currentEntry.rate]);

  // Calculate remaining balance
  const computedRemaining = useMemo(() => {
    const total = computedTotal;
    const paid = currentEntry.paidAmount ? Number(currentEntry.paidAmount) : 0;
    const remaining = total - paid;
    return isNaN(remaining) || remaining < 0 ? 0 : remaining;
  }, [computedTotal, currentEntry.paidAmount]);

  const handleAddOrUpdate = async () => {
    // Validation
    if (!selectedCustomerId) return showNotify?.('Select a customer first', 'error');
    if (!currentEntry.itemName?.trim()) return showNotify?.('Enter item name', 'error');
    
    const qty = currentEntry.qty ? Number(currentEntry.qty) : 0;
    const rate = currentEntry.rate ? Number(currentEntry.rate) : 0;
    const paid = currentEntry.paidAmount ? Number(currentEntry.paidAmount) : 0;
    
    if (isNaN(qty) || qty <= 0) return showNotify?.('Enter valid quantity (> 0)', 'error');
    if (isNaN(rate) || rate <= 0) return showNotify?.('Enter valid rate (> 0)', 'error');
    if (isNaN(paid) || paid < 0) return showNotify?.('Enter valid paid amount (>= 0)', 'error');
    if (paid > computedTotal) return showNotify?.('Paid amount cannot exceed total amount', 'error');

    // Build payload with snake_case field names to match backend expectations
    const payload = {
      date: currentEntry.date,
      description: currentEntry.remarks?.trim() || 'regular',
      item_code: currentEntry.itemCode?.trim() || '',
      item_name: currentEntry.itemName?.trim() || '',
      qty: qty,
      rate: rate,
      total_amount: computedTotal,
      paid_amount: paid
    };

    // Debug logging
    console.log('SAALA API Payload:', payload);
    console.log('Current entry state:', currentEntry);
    console.log('Computed values - qty:', qty, 'rate:', rate, 'total:', computedTotal, 'paid:', paid);
    console.log('Form values - itemCode:', currentEntry.itemCode, 'itemName:', currentEntry.itemName, 'paidAmount:', currentEntry.paidAmount);

    try {
      if (currentEntry.id) {
        const updated = await api.updateSaalaTransaction(currentEntry.id, payload);
        console.log('Updated transaction response:', updated);
        // Merge API response with the original payload to ensure all fields are correctly updated
        const mergedData = { ...payload, ...updated };
        setTransactions(transactions.map(t => t.id === currentEntry.id ? { ...t, ...mergedData } : t));
        showNotify?.('Transaction updated', 'success');
      } else {
        const created = await api.createSaalaTransaction(selectedCustomerId, payload);
        console.log('Created transaction response:', created);
        setTransactions([created, ...transactions]);
        showNotify?.('Transaction added', 'success');
      }

      // Refresh summary
      const summ = await api.getSaalaCustomerSummary(selectedCustomerId);
      // Map API response to expected frontend format
      setSummary({
        totalCredit: summ.total_amount,
        totalPaid: summ.total_paid,
        balance: summ.current_balance
      });

      // Reset form
      setCurrentEntry({
        id: null,
        date: new Date().toISOString().split('T')[0],
        itemCode: '',
        itemName: '',
        qty: '',
        rate: '',
        totalAmount: '',
        paidAmount: '',
        remarks: 'regular'
      });
      
      // Focus back to customer selection for next entry
      setTimeout(() => {
        const customerSelect = document.querySelector('[data-enter-index="10"]');
        if (customerSelect) {
          customerSelect.focus();
        }
      }, 100);
    } catch (e) {
      showNotify?.(`Failed: ${e.message}`, 'error');
    }
  };

  const handleEdit = (txn) => {
    console.log('Editing transaction:', txn);
    const updatedEntry = {
      id: txn.id,
      date: txn.date,
      itemCode: txn.item_code || txn.itemCode || '',
      itemName: txn.item_name || txn.itemName || '',
      qty: txn.qty !== null && txn.qty !== undefined ? String(txn.qty) : '',
      rate: txn.rate !== null && txn.rate !== undefined ? String(txn.rate) : '',
      totalAmount: txn.total_amount !== null && txn.total_amount !== undefined ? String(txn.total_amount) : '',
      paidAmount: txn.paid_amount !== null && txn.paid_amount !== undefined ? String(txn.paid_amount) : '',
      remarks: txn.description || 'regular'
    };
    setCurrentEntry(updatedEntry);
    console.log('Set current entry to:', updatedEntry);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await api.deleteSaalaTransaction(id);
      setTransactions(transactions.filter(t => t.id !== id));
      const summ = await api.getSaalaCustomerSummary(selectedCustomerId);
      // Map API response to expected frontend format
      setSummary({
        totalCredit: summ.total_amount,
        totalPaid: summ.total_paid,
        balance: summ.current_balance
      });
      showNotify?.('Transaction deleted', 'success');
    } catch (e) {
      showNotify?.(`Delete failed: ${e.message}`, 'error');
    }
  };



  return (
    <div className="flex-1 flex flex-col gap-3 p-3 overflow-auto">
      {/* Customer Selection & Summary */}
      <section className="bg-white border border-slate-200 p-4 shadow-card rounded-sm shrink-0">
        <div className="flex items-center gap-2 mb-3 text-primary-600 font-semibold text-xs border-b pb-2">
          <Users className="w-4 h-4" /> SAALA Customer Selection
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2">
            <SearchableSelect 
              label="Select SAALA Customer" 
              options={customers.map(c => c.name)} 
              value={selectedCustomer?.name || ''} 
              onChange={handleCustomerSelect} 
              placeholder="Search Customer" 
              data-enter-index="10"
              onDropdownStateChange={setDropdownOpen}
              onSelectionComplete={() => {
                // Focus on item code field after customer selection is complete
                setTimeout(() => {
                  const itemCodeField = document.querySelector('[data-enter-index="12"]');
                  if (itemCodeField) {
                    itemCodeField.focus();
                  }
                }, 100);
              }}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Contact</label>
            <input 
              type="text" 
              readOnly 
              className="w-full bg-slate-50 border border-slate-200 px-3 text-sm text-slate-600 rounded-sm cursor-not-allowed" 
              style={{ height: '36px' }}
              value={String(selectedCustomer?.contact || '--')} 
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Address</label>
            <input 
              type="text" 
              readOnly 
              className="w-full bg-slate-50 border border-slate-200 px-3 text-sm text-slate-600 rounded-sm cursor-not-allowed" 
              style={{ height: '36px' }}
              value={String(selectedCustomer?.address || '--')} 
            />
          </div>
          <div>
            <label className="text-xs font-medium text-primary-600 block mb-1">Remaining Balance</label>
            <input 
              type="text" 
              readOnly 
              className="w-full bg-primary-50 border border-primary-200 text-primary-600 px-3 text-sm font-semibold rounded-sm cursor-not-allowed" 
              style={{ height: '36px' }}
              value={`₹ ${Number(summary.balance || 0).toLocaleString()}`} 
            />
          </div>
        </div>
      </section>

      {/* Data Entry Row */}
      <section className="bg-white border border-slate-200 shadow-card rounded-sm flex flex-col relative z-30 shrink-0 overflow-visible">
        <div className="bg-slate-100 px-4 py-2 border-b text-slate-600 font-semibold text-xs flex items-center gap-2">
          <Database className="w-4 h-4" /> SAALA Entry Row
        </div>
        <div className="p-3 border-b bg-slate-50 overflow-x-auto">
          <div className="flex items-end gap-2 min-w-[1000px]">
            <div className="w-[120px]">
              <label className="text-xs font-medium text-slate-600 block text-center mb-1">Date</label>
              <input 
                type="date" 
                className="w-full border border-slate-300 px-2 text-sm rounded-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" 
                style={{ height: '36px' }}
                value={currentEntry.date} 
                onChange={e => setCurrentEntry({ ...currentEntry, date: e.target.value })} 
                data-enter-index="10"
              />
            </div>
            <div className="w-[90px]">
              <SearchableSelect 
                label="Item Code" 
                options={catalog.map(i => i.itemCode)} 
                value={currentEntry.itemCode} 
                onChange={handleItemCodeSelect} 
                placeholder="Select Code" 
                data-enter-index="11"
                onDropdownStateChange={setDropdownOpen}
                onSelectionComplete={() => {
                  // Focus on qty field after item code selection
                  setTimeout(() => {
                    const qtyField = document.querySelector('[data-enter-index="12"]');
                    if (qtyField) {
                      qtyField.focus();
                    }
                  }, 100);
                }}
              />
            </div>
            <div className="w-[140px]">
              <label className="text-xs font-medium text-slate-600 block text-center mb-1">Item Name</label>
              <input 
                type="text" 
                className="w-full border border-slate-300 px-2 text-sm rounded-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" 
                style={{ height: '36px' }}
                value={currentEntry.itemName} 
                readOnly
                placeholder="Auto-filled"
              />
            </div>
            <div className="w-[70px]">
              <label className="text-xs font-medium text-slate-600 block text-center mb-1">Qty (Given)</label>
              <input 
                ref={qtyRef}
                type="number" 
                className="w-full border border-slate-300 px-2 text-right text-sm rounded-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" 
                style={{ height: '36px' }}
                value={currentEntry.qty} 
                onChange={e => setCurrentEntry({ ...currentEntry, qty: e.target.value })} 
                data-enter-index="12"
              />
            </div>
            <div className="w-[70px]">
              <label className="text-xs font-medium text-slate-600 block text-center mb-1">Rate</label>
              <input 
                ref={rateRef}
                type="number" 
                className="w-full border border-slate-300 px-2 text-right text-sm rounded-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" 
                style={{ height: '36px' }}
                value={currentEntry.rate} 
                onChange={e => setCurrentEntry({ ...currentEntry, rate: e.target.value })} 
                data-enter-index="13"
              />
            </div>
            <div className="w-[100px]">
              <label className="text-xs font-medium text-slate-600 block text-center mb-1">Total Amount</label>
              <input 
                type="text" 
                className="w-full border border-slate-200 px-2 text-right text-sm bg-slate-100 rounded-sm outline-none font-semibold" 
                style={{ height: '36px' }}
                value={computedTotal ? `₹${computedTotal.toLocaleString()}` : ''} 
                readOnly 
              />
            </div>
            <div className="w-[100px]">
              <label className="text-xs font-medium text-emerald-600 block text-center mb-1">Paid Amount</label>
              <input 
                ref={paidRef}
                type="number" 
                className="w-full border border-emerald-300 px-2 text-right text-sm rounded-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 bg-emerald-50 transition-all" 
                style={{ height: '36px' }}
                value={currentEntry.paidAmount} 
                onChange={e => setCurrentEntry({ ...currentEntry, paidAmount: e.target.value })} 
                data-enter-index="14"
              />
            </div>
            <div className="w-[100px]">
              <label className="text-xs font-medium text-primary-600 block text-center mb-1">Remaining</label>
              <input 
                type="text" 
                className="w-full border border-primary-200 px-2 text-right text-sm bg-primary-50 rounded-sm outline-none font-semibold text-primary-600" 
                style={{ height: '36px' }}
                value={computedRemaining ? `₹${computedRemaining.toLocaleString()}` : ''} 
                readOnly 
              />
            </div>
            <div className="w-[120px]">
              <label className="text-xs font-medium text-slate-600 block text-center mb-1">Remarks</label>
              <input 
                ref={remarksRef}
                type="text" 
                className="w-full border border-slate-300 px-2 text-sm rounded-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-all" 
                style={{ height: '36px' }}
                value={currentEntry.remarks} 
                onChange={e => setCurrentEntry({ ...currentEntry, remarks: e.target.value })} 
                data-enter-index="15"
              />
            </div>
            <div className="ml-auto pr-1">
              <button 
                data-action="primary"
                onClick={handleAddOrUpdate} 
                disabled={!selectedCustomerId}
                className="bg-primary-600 text-white px-8 text-sm font-semibold rounded-sm hover:bg-primary-700 shadow-md transition-all active:translate-y-px disabled:opacity-40"
                style={{ height: '36px' }}
                data-enter-index="16"
              >
                {currentEntry.id ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="flex-1 overflow-auto bg-white custom-table-scroll" style={{ minHeight: '300px', maxHeight: '500px' }}>
          <table className="w-full text-left text-sm border-collapse relative min-w-full">
            <thead className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] sticky top-0 text-white uppercase font-bold text-xs z-10 border-b-2 border-black/20 shadow-lg">
              <tr>
                <th className="px-3 py-3.5 w-14 text-center border-r border-black/20">Sl.No.</th>
                <th className="px-3 py-3.5 w-24 border-r border-black/20">Date</th>
                <th className="px-3 py-3.5 w-20 border-r border-black/20">Item Code</th>
                <th className="px-3 py-3.5 w-32 border-r border-black/20">Item Name</th>
                <th className="px-3 py-3.5 text-right w-16 border-r border-black/20">Qty</th>
                <th className="px-3 py-3.5 text-right w-16 border-r border-black/20">Rate</th>
                <th className="px-3 py-3.5 text-right w-24 border-r border-black/20">Total Amount</th>
                <th className="px-3 py-3.5 text-right w-24 border-r border-black/20">Paid Amount</th>
                <th className="px-3 py-3.5 text-right w-24 border-r border-black/20">Remaining</th>
                <th className="px-3 py-3.5 w-28 border-r border-black/20">Remarks</th>
                <th className="px-3 py-3.5 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody>
              {!selectedCustomerId ? (
                <tr>
                  <td colSpan="11" className="p-16 text-center text-slate-500 text-sm font-bold">
                    Select a SAALA customer to view transactions
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-12 text-center text-slate-400 italic font-medium text-sm">
                    No SAALA transactions for this customer
                  </td>
                </tr>
              ) : (
                transactions.map((txn, idx) => {
                  const total = Number(txn.total_amount || txn.totalAmount || 0);
                  const paid = Number(txn.paid_amount || txn.paidAmount || 0);
                  const remaining = total - paid;
                  return (
                    <tr key={txn.id} className="hover:bg-primary-50 border-b border-slate-100 group transition-colors">
                      <td className="px-3 py-2.5 text-center text-slate-400 font-semibold">{String(idx + 1)}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-600">{txn.date ? new Date(txn.date).toLocaleDateString('en-GB') : '--'}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-600">{String(txn.item_code || txn.itemCode || '--')}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{String(txn.item_name || txn.itemName || '')}</td>
                      <td className="px-3 py-2.5 text-right font-bold">{String(txn.qty)}</td>
                      <td className="px-3 py-2.5 text-right font-mono">₹{String(txn.rate)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-700">₹{total.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">₹{paid.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-primary-600 bg-primary-50/30">₹{remaining.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-slate-600">{String(txn.description || '')}</td>
                      <td className="px-3 py-2.5 text-center space-x-1">
                        <button onClick={() => handleEdit(txn)} className="p-1.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-50 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(txn.id)} className="p-1.5 text-red-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>


    </div>
  );
}

// ============================================================================
// MAIN SAALA VIEW COMPONENT
// ============================================================================
export default function SaalaView({ catalog, onCancel, showNotify }) {
  const [state, setState] = useState({
    tab: 'customers',
    customers: [],
    isLoading: true
  });
  
  // Keyboard navigation hooks
  const { registerElement } = useKeyboardNavigation();
  const saalaContainerRef = useRef(null);
  const { setDropdownOpen } = useERPEnterNavigation(saalaContainerRef, {
    enabled: true,
    autoFocusFirst: false
  });
  
  const {
    tab,
    customers,
    isLoading
  } = state;
  
  const setTab = useCallback((value) => {
    setState(prev => ({ ...prev, tab: value }));
  }, []);
  
  const setCustomers = useCallback((value) => {
    setState(prev => ({ ...prev, customers: value }));
  }, []);
  
  const setIsLoading = useCallback((value) => {
    setState(prev => ({ ...prev, isLoading: value }));
  }, []);

  // Calculate total credit amount for all customers
  const totalCreditAmount = useMemo(() => {
    // This will be calculated in the individual tabs
    return 0;
  }, [customers, tab]);

  // Load SAALA customers on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await api.listSaalaCustomers();
        if (cancelled) return;
        setCustomers(rows);
      } catch (e) {
        showNotify?.(`Failed to load SAALA customers: ${e.message}`, 'error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Reset state when component unmounts or is cancelled
  useEffect(() => {
    return () => {
      // Reset to initial state when component unmounts
      setState({
        tab: 'customers',
        customers: [],
        isLoading: true
      });
    };
  }, []);

  const handleCancel = () => {
    // Reset state before cancelling
    setState({
      tab: 'customers',
      customers: [],
      isLoading: true
    });
    onCancel && onCancel();
  };

  return (
    <div ref={saalaContainerRef} className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-xl rounded-b-xl">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wider">
          <Database className="w-5 h-5 text-white" /> SAALA MANAGEMENT
        </h1>
        <button onClick={handleCancel} className="p-1.5 rounded-lg hover:bg-white/20 transition-all" data-enter-index="6">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b-2 border-slate-200 px-5 py-3 flex gap-3 shrink-0 shadow-sm">
        <button 
          type="button" 
          onClick={() => setTab('customers')} 
          className={`px-5 py-2 text-sm font-black uppercase rounded-lg border-2 transition-all duration-200 tracking-wider ${tab === 'customers' ? 'bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white border-[#4A44D0] shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 shadow-sm'}`}
          data-enter-index="7"
        >
          Customer Addition
        </button>
        <button 
          type="button" 
          onClick={() => setTab('transactions')} 
          className={`px-5 py-2 text-sm font-black uppercase rounded-lg border-2 transition-all duration-200 tracking-wider ${tab === 'transactions' ? 'bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white border-[#4A44D0] shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 shadow-sm'}`}
          data-enter-index="8"
        >
          SAALA Transaction
        </button>
        <button 
          type="button" 
          onClick={() => setTab('payments')} 
          className={`px-5 py-2 text-sm font-black uppercase rounded-lg border-2 transition-all duration-200 tracking-wider ${tab === 'payments' ? 'bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white border-[#4A44D0] shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 shadow-sm'}`}
          data-enter-index="9"
        >
          Record Payment
        </button>
        <button 
          type="button" 
          onClick={() => setTab('dateRangeReport')} 
          className={`px-5 py-2 text-sm font-black uppercase rounded-lg border-2 transition-all duration-200 tracking-wider ${tab === 'dateRangeReport' ? 'bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white border-[#4A44D0] shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 shadow-sm'}`}
          data-enter-index="10"
        >
          Date Range Report
        </button>
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 font-medium text-sm">Loading...</p>
        </div>
      ) : (
        <>
          {tab === 'customers' && (
            <CustomerAdditionTab 
              customers={customers} 
              setCustomers={setCustomers} 
              showNotify={showNotify} 
            />
          )}
          {tab === 'transactions' && (
            <SaalaTransactionTab 
              customers={customers} 
              catalog={catalog || []} 
              showNotify={showNotify} 
              setDropdownOpen={setDropdownOpen}
            />
          )}
          {tab === 'payments' && (
            <SaalaPaymentTab 
              customers={customers} 
              showNotify={showNotify} 
              setDropdownOpen={setDropdownOpen}
            />
          )}
          {tab === 'dateRangeReport' && (
            <DateRangeReportTab 
              customers={customers} 
              showNotify={showNotify} 
            />
          )}
        </>
      )}
    </div>
  );
}