import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { X, Printer, Send } from 'lucide-react';
import { api } from '../../utils/api';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function DailySaleView({ onCancel }) {
  const [fromDate, setFromDate]         = useState(todayISO());
  const [toDate, setToDate]             = useState(todayISO());
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groups, setGroups]             = useState([]);
  const [customers, setCustomers]       = useState([]);
  const [rows, setRows]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [smsSending, setSmsSending]     = useState(false);
  const [feedback, setFeedback]         = useState({ message: '', type: '' }); // 'success', 'error', 'info'

  const groupRef  = useRef(null);
  const fromRef   = useRef(null);
  const toRef     = useRef(null);
  const goRef     = useRef(null);
  const smsRef    = useRef(null);
  const printRef  = useRef(null);
  const cancelRef = useRef(null);

  // Load groups + customers on mount
  useEffect(() => {
    Promise.all([api.listGroups(), api.listCustomers()])
      .then(([g, c]) => {
        setGroups(Array.isArray(g) ? g : []);
        setCustomers(Array.isArray(c) ? c : []);
      })
      .catch(() => {});
  }, []);

  const handleGo = useCallback(async () => {
    if (!selectedGroup) {
      setFeedback({ message: 'Select a group to proceed', type: 'info' });
      return;
    }

    setLoading(true);
    setFeedback({ message: '', type: '' });
    try {
      const data = await api.getDailySales(fromDate, toDate, null);
      const allRows = Array.isArray(data) ? data : [];

      const groupCustomerNames = customers
        .filter(c => c.group === selectedGroup)
        .map(c => c.name);
      
      const filteredRows = allRows.filter(r => groupCustomerNames.includes(r.party));
      setRows(filteredRows);

      if (filteredRows.length === 0) {
        setFeedback({ message: 'No data found for this selection', type: 'info' });
      }
    } catch (e) {
      console.error(e);
      setFeedback({ message: 'Failed to fetch data', type: 'error' });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedGroup, customers]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    qty:    acc.qty    + Number(r.qty   || 0),
    amount: acc.amount + Number(r.total || 0),
  }), { qty: 0, amount: 0 }), [rows]);

  // Get all customers in selected group that have sales in the date range
  const getGroupCustomers = useCallback(async () => {
    if (!selectedGroup) return [];
    
    try {
      // Fetch sales data for the date range
      const data = await api.getDailySales(fromDate, toDate, null);
      const allRows = Array.isArray(data) ? data : [];
      
      // Get customer names that have sales in this date range
      const customersWithSales = new Set(allRows.map(r => r.party));
      
      // Filter group customers to only those with sales in date range
      return customers.filter(c => 
        c.group === selectedGroup && customersWithSales.has(c.name)
      );
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [selectedGroup, customers, fromDate, toDate]);

  // Get customer phone number
  const getCustomerPhone = (customerName) => {
    const customer = customers.find(c => c.name === customerName);
    return customer?.phone || null;
  };

  // Build SMS message for a customer
  const buildSmsForCustomer = (customerName, customerRows) => {
    if (customerRows.length === 0) return null;
    
    const lines = [
      'DAILY SALE REPORT',
      `Date: ${fromDate} to ${toDate}`,
      `Customer: ${customerName}`,
      '',
    ];
    customerRows.forEach(r => {
      lines.push(`${r.itemName}: ${Number(r.qty||0).toFixed(2)} kg @ ₹${Number(r.rate||0).toFixed(2)} = ₹${Number(r.total||0).toFixed(2)}`);
    });
    lines.push('');
    const custQty = customerRows.reduce((s, r) => s + Number(r.qty||0), 0);
    const custAmt = customerRows.reduce((s, r) => s + Number(r.total||0), 0);
    lines.push(`Total Qty: ${custQty.toFixed(2)} kg`);
    lines.push(`Total Amount: ₹${custAmt.toFixed(2)}`);
    return lines.join('\n');
  };

  // Send SMS to all customers in group
  const handleSendSMS = async () => {
    if (!selectedGroup) {
      setFeedback({ message: 'Select a group first', type: 'info' });
      return;
    }

    setSmsSending(true);
    setFeedback({ message: '', type: '' });

    try {
      // Get customers in this group with sales in date range
      const groupCustomers = await getGroupCustomers();
      
      if (groupCustomers.length === 0) {
        setFeedback({ message: 'No customers with sales data in this group for selected dates', type: 'info' });
        setSmsSending(false);
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      // Fetch fresh data for the date range
      const data = await api.getDailySales(fromDate, toDate, null);
      const allRows = Array.isArray(data) ? data : [];

      // Send SMS to each customer in the group
      for (const customer of groupCustomers) {
        const phone = customer.phone;
        
        if (!phone) {
          failureCount++;
          continue;
        }

        // Get this customer's sales for the date range
        const customerRows = allRows.filter(r => r.party === customer.name);
        
        // Build message only if customer has sales data
        const message = buildSmsForCustomer(customer.name, customerRows);
        
        if (!message) {
          continue;
        }

        try {
          // Send via DLT + FastSMS
          await api.sendSMS({
            phone: phone,
            message: message,
            gateway: 'dlt-fastsms'
          });
          successCount++;
        } catch (err) {
          failureCount++;
        }
      }

      if (successCount > 0 && failureCount === 0) {
        setFeedback({ 
          message: `Successfully sent to ${successCount} customer${successCount !== 1 ? 's' : ''}`, 
          type: 'success' 
        });
      } else if (successCount > 0 && failureCount > 0) {
        setFeedback({ 
          message: `Sent to ${successCount}, failed for ${failureCount}`, 
          type: 'error' 
        });
      } else if (failureCount > 0) {
        setFeedback({ 
          message: `Failed to send. Check phone numbers.`, 
          type: 'error' 
        });
      } else {
        setFeedback({ 
          message: `No data to send for any customer in this group`, 
          type: 'info' 
        });
      }
    } catch (e) {
      console.error(e);
      setFeedback({ 
        message: 'Error sending messages', 
        type: 'error' 
      });
    } finally {
      setSmsSending(false);
    }
  };

  const handlePrint = async () => {
    try {
      const response = await api.getDailySalesReport(fromDate, toDate);
      const url = window.URL.createObjectURL(response.data);
      const w = window.open(url, '_blank');
      if (!w) {
        const a = document.createElement('a');
        a.href = url; 
        a.download = `daily_sale_${fromDate}_${toDate}.pdf`;
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a);
      }
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setFeedback({ 
        message: 'Failed to generate report. Please try again.', 
        type: 'error' 
      });
    }
  };

  const nav = (e, next, prev) => {
    if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault(); 
      setTimeout(() => next?.current?.focus(), 0);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault(); 
      setTimeout(() => prev?.current?.focus(), 0);
    }
  };

  const emptyCount = Math.max(0, 18 - rows.length);

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-xl rounded-b-xl">
        <h1 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2.5">
          <Printer className="w-4 h-4" /> ITEMS DAILY SALE RATE
        </h1>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/20 transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">

        {/* Filter Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shrink-0 overflow-hidden">
          <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-4 py-2 text-white text-xs font-bold uppercase tracking-widest">
            Daily Sale Details
          </div>
          <div className="px-5 py-4 flex items-end gap-4 flex-wrap">

            {/* Group dropdown - automatic selection */}
            <div className="flex flex-col gap-1 w-56">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Select Group</label>
              <select
                ref={groupRef}
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                onKeyDown={e => nav(e, fromRef, null)}
                className="w-full border border-rose-200 rounded-lg px-3 text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all appearance-none"
                style={{ height: '42px' }}
              >
                <option value="">-- Select Group --</option>
                {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </div>

            {/* From Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">From Date</label>
              <input
                ref={fromRef}
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                onKeyDown={e => nav(e, toRef, groupRef)}
                className="border border-rose-200 rounded-lg px-3 text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all"
                style={{ height: '42px' }}
              />
            </div>

            <span className="text-sm font-bold text-slate-400 pb-3">To</span>

            {/* To Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">To Date</label>
              <input
                ref={toRef}
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                onKeyDown={e => nav(e, goRef, fromRef)}
                className="border border-rose-200 rounded-lg px-3 text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all"
                style={{ height: '42px' }}
              />
            </div>

            {/* Go */}
            <button
              ref={goRef}
              onClick={handleGo}
              disabled={loading}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleGo(); }
                else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setTimeout(() => smsRef.current?.focus(), 0); }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setTimeout(() => toRef.current?.focus(), 0); }
              }}
              className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white font-bold text-sm px-7 rounded-xl shadow-lg hover:from-[#4A44D0] hover:to-[#3A34C0] disabled:opacity-50 transition-all hover:shadow-xl active:translate-y-0.5"
              style={{ height: '42px' }}
            >
              {loading ? '...' : 'Go'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-green-600 text-white font-black uppercase text-[11px]">
                  <th className="border border-green-700 px-3 py-2.5 w-14 text-center">Sl.No</th>
                  <th className="border border-green-700 px-3 py-2.5 w-28 text-left">Date</th>
                  <th className="border border-green-700 px-3 py-2.5 text-left">Party</th>
                  <th className="border border-green-700 px-3 py-2.5 text-left">Item Name</th>
                  <th className="border border-green-700 px-3 py-2.5 w-24 text-right">Qty</th>
                  <th className="border border-green-700 px-3 py-2.5 w-24 text-right">Rate</th>
                  <th className="border border-green-700 px-3 py-2.5 w-32 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/40 transition-colors`}>
                    <td className="border border-slate-200 px-3 py-2 text-center text-slate-500 font-bold">{idx + 1}</td>
                    <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">{String(r.date || '')}</td>
                    <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-800">{String(r.party || '')}</td>
                    <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700">{String(r.itemName || '')}</td>
                    <td className="border border-slate-200 px-3 py-2 text-right font-black text-[#5B55E6]">{Number(r.qty || 0).toFixed(2)}</td>
                    <td className="border border-slate-200 px-3 py-2 text-right font-bold text-slate-700">{Number(r.rate || 0).toFixed(2)}</td>
                    <td className="border border-slate-200 px-3 py-2 text-right font-black text-green-700">{Number(r.total || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {Array.from({ length: emptyCount }).map((_, i) => (
                  <tr key={`e-${i}`} style={{ height: '30px' }}>
                    {Array.from({ length: 7 }).map((_, ci) => (
                      <td key={ci} className="border border-slate-100 px-3">&nbsp;</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feedback message */}
        {feedback.message && (
          <div className={`text-sm font-semibold px-4 py-3 rounded-lg shrink-0 animate-in fade-in ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {feedback.message}
          </div>
        )}

        {/* Footer */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg px-4 py-3 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">

            {/* Send SMS button */}
            <button
              ref={smsRef}
              onClick={handleSendSMS}
              disabled={smsSending || !selectedGroup}
              title="Send messages to all customers in group"
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleSendSMS(); }
                else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setTimeout(() => printRef.current?.focus(), 0); }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setTimeout(() => goRef.current?.focus(), 0); }
              }}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black uppercase text-[10px] px-4 rounded-lg shadow-md hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all tracking-wider flex items-center gap-1.5 hover:shadow-lg active:translate-y-0.5"
              style={{ height: '36px' }}
            >
              <Send className="w-3.5 h-3.5" /> Send Messages
            </button>

            {/* Totals */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Total Qty</span>
                <input
                  readOnly
                  className="w-24 border border-slate-200 bg-slate-50 px-2 text-[11px] font-black text-right outline-none rounded-lg shadow-inner"
                  style={{ height: '32px' }}
                  value={totals.qty.toFixed(2)}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Amount</span>
                <input
                  readOnly
                  className="w-32 bg-gradient-to-r from-rose-500 to-rose-600 text-white border-0 px-2 text-[11px] font-black text-right outline-none rounded-lg shadow-lg"
                  style={{ height: '32px' }}
                  value={`₹ ${totals.amount.toFixed(2)}`}
                />
              </div>
            </div>

            {/* Print + Cancel */}
            <div className="flex gap-1.5">
              <button
                ref={printRef}
                onClick={handlePrint}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handlePrint(); }
                  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setTimeout(() => cancelRef.current?.focus(), 0); }
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setTimeout(() => smsRef.current?.focus(), 0); }
                }}
                className="bg-gradient-to-r from-slate-700 to-slate-800 text-white font-bold text-xs px-4 rounded-lg shadow-md hover:from-slate-800 hover:to-slate-900 transition-all hover:shadow-lg active:translate-y-0.5 flex items-center gap-1"
                style={{ height: '36px' }}
              >
                <Printer className="w-3 h-3" /> Print
              </button>
              <button
                ref={cancelRef}
                onClick={onCancel}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); onCancel?.(); }
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setTimeout(() => printRef.current?.focus(), 0); }
                }}
                className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 font-bold text-xs px-4 rounded-lg border border-slate-300 shadow-md hover:from-slate-200 hover:to-slate-300 transition-all hover:shadow-lg active:translate-y-0.5"
                style={{ height: '36px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}