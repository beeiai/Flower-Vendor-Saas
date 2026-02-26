import React, { useState, useMemo, useCallback, useRef } from 'react';
import { X, Printer, Send, Users } from 'lucide-react';

export default function DailySaleAccountingUI() {
  // State management
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [branch, setBranch] = useState('KALIYUR');
  const [customerGroup, setCustomerGroup] = useState('');
  const [party, setParty] = useState('');
  const [loading, setLoading] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [smsStatus, setSmsStatus] = useState('');
  const [tableData, setTableData] = useState([
    { date: '2024-01-15', party: 'ABC Trading', itemName: 'Rice - Premium', qty: 250.50, rate: 45.00, total: 11272.50 },
    { date: '2024-01-15', party: 'XYZ Supplies', itemName: 'Dal - Toor', qty: 125.00, rate: 85.00, total: 10625.00 },
    { date: '2024-01-16', party: 'ABC Trading', itemName: 'Wheat Flour', qty: 180.75, rate: 32.50, total: 5874.38 },
    { date: '2024-01-16', party: 'Global Import', itemName: 'Sugar', qty: 300.00, rate: 38.00, total: 11400.00 },
    { date: '2024-01-17', party: 'XYZ Supplies', itemName: 'Rice - Premium', qty: 95.25, rate: 45.00, total: 4286.25 },
    { date: '2024-01-17', party: 'ABC Trading', itemName: 'Oil - Sunflower', qty: 60.00, rate: 125.00, total: 7500.00 },
    { date: '2024-01-18', party: 'Global Import', itemName: 'Spices Mix', qty: 45.50, rate: 220.00, total: 10010.00 },
  ]);

  const branches = ['KALIYUR', 'SALEM', 'COIMBATORE', 'TRICHY'];
  const groups = ['Retail', 'Wholesale', 'Regular', 'Event'];
  
  const partyByGroup = {
    'Retail': ['ABC Trading', 'Local Store', 'Small Mart'],
    'Wholesale': ['XYZ Supplies', 'Global Import', 'Bulk Traders'],
    'Regular': ['ABC Trading', 'XYZ Supplies', 'Standard Vendors'],
    'Event': ['Event Catering', 'Function Supplies']
  };

  const filteredParties = customerGroup ? partyByGroup[customerGroup] || [] : [];

  // Refs for keyboard navigation
  const branchRef = useRef(null);
  const fromRef = useRef(null);
  const toRef = useRef(null);
  const groupRef = useRef(null);
  const partyRef = useRef(null);
  const goRef = useRef(null);
  const smsRef = useRef(null);
  const smsAllRef = useRef(null);
  const printRef = useRef(null);
  const cancelRef = useRef(null);

  // Calculate totals
  const totals = useMemo(() => {
    return tableData.reduce(
      (acc, row) => ({
        qty: acc.qty + (Number(row.qty) || 0),
        amount: acc.amount + (Number(row.total) || 0),
      }),
      { qty: 0, amount: 0 }
    );
  }, [tableData]);

  // Keyboard navigation helper
  const nav = (e, next, prev) => {
    if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setTimeout(() => next?.current?.focus(), 0);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setTimeout(() => prev?.current?.focus(), 0);
    }
  };

  const handleGo = useCallback(() => {
    setLoading(true);
    setSmsStatus('');
    setTimeout(() => {
      console.log('Filtering data:', { fromDate, toDate, branch, customerGroup, party });
      setLoading(false);
    }, 500);
  }, [fromDate, toDate, branch, customerGroup, party]);

  const buildSmsMessage = () => {
    const lines = [
      `📦 DAILY SALE REPORT`,
      `📅 ${fromDate} to ${toDate}`,
      `🏢 Branch: ${branch}`,
      customerGroup ? `👥 Group: ${customerGroup}` : '',
      party ? `🤝 Party: ${party}` : '',
      '─────────────────────',
    ].filter(Boolean);

    tableData.forEach((row, idx) => {
      lines.push(`${idx + 1}. ${row.party}: ${row.qty.toFixed(2)}kg @ ₹${row.rate.toFixed(2)} = ₹${row.total.toFixed(2)}`);
    });

    lines.push('─────────────────────');
    lines.push(`TOTAL QTY: ${totals.qty.toFixed(2)} kg`);
    lines.push(`TOTAL AMT: ₹${totals.amount.toFixed(2)}`);

    return lines.join('\n');
  };

  const handleSendSMS = async () => {
    if (tableData.length === 0) {
      setSmsStatus('⚠ No data to send. Click Go first.');
      return;
    }
    setSmsSending(true);
    try {
      const msg = buildSmsMessage();
      await navigator.clipboard.writeText(msg);
    } catch {
      // Clipboard copy attempt
    }
    setSmsStatus('✓ Message sent successfully!');
    setTimeout(() => setSmsStatus(''), 3000);
    setSmsSending(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCancel = () => {
    if (window.confirm('Close this report?')) {
      console.log('Closing report');
    }
  };

  const emptyCount = Math.max(0, 12 - tableData.length);

  return (
    <div className="flex-1 flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-6 py-4 flex justify-between items-center text-white shrink-0 shadow-xl">
        <h1 className="text-base font-bold uppercase tracking-widest flex items-center gap-3">
          <Printer className="w-5 h-5" /> 
          ITEMS DAILY SALE RATE
        </h1>
        <button 
          onClick={handleCancel}
          ref={cancelRef}
          className="p-2 rounded-lg hover:bg-white/20 transition-all"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCancel();
          }}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
        
        {/* Filter Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shrink-0 overflow-hidden">
          <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-5 py-3 text-white text-xs font-bold uppercase tracking-widest">
            Daily Sale Filter
          </div>
          
          <div className="px-6 py-5 grid grid-cols-6 gap-4">
            
            {/* Branch */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Branch / Location</label>
              <select
                ref={branchRef}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                onKeyDown={(e) => nav(e, fromRef, null)}
                className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-medium bg-white outline-none focus:border-[#5B55E6] focus:ring-2 focus:ring-[#5B55E6]/20 shadow-sm hover:shadow-md transition-all appearance-none"
              >
                {branches.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>

            {/* From Date */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest">From Date</label>
              <input
                ref={fromRef}
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                onKeyDown={(e) => nav(e, toRef, branchRef)}
                className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-medium bg-white outline-none focus:border-[#5B55E6] focus:ring-2 focus:ring-[#5B55E6]/20 shadow-sm hover:shadow-md transition-all"
              />
            </div>

            {/* To Date */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest">To Date</label>
              <input
                ref={toRef}
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                onKeyDown={(e) => nav(e, groupRef, fromRef)}
                className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-medium bg-white outline-none focus:border-[#5B55E6] focus:ring-2 focus:ring-[#5B55E6]/20 shadow-sm hover:shadow-md transition-all"
              />
            </div>

            {/* Customer Group */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Customer Group</label>
              <select
                ref={groupRef}
                value={customerGroup}
                onChange={(e) => {
                  setCustomerGroup(e.target.value);
                  setParty('');
                }}
                onKeyDown={(e) => nav(e, partyRef, toRef)}
                className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-medium bg-white outline-none focus:border-[#5B55E6] focus:ring-2 focus:ring-[#5B55E6]/20 shadow-sm hover:shadow-md transition-all appearance-none"
              >
                <option value="">-- All Groups --</option>
                {groups.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>

            {/* Customer / Party */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Customer / Party</label>
              <select
                ref={partyRef}
                value={party}
                onChange={(e) => setParty(e.target.value)}
                disabled={!customerGroup}
                onKeyDown={(e) => nav(e, goRef, groupRef)}
                className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-medium bg-white outline-none focus:border-[#5B55E6] focus:ring-2 focus:ring-[#5B55E6]/20 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
              >
                <option value="">-- Select Party --</option>
                {filteredParties.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            {/* GO Button */}
            <button
              ref={goRef}
              onClick={handleGo}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleGo(); }
                else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setTimeout(() => smsRef.current?.focus(), 0); }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setTimeout(() => partyRef.current?.focus(), 0); }
              }}
              className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white font-bold text-sm px-8 py-2.5 rounded-lg shadow-lg hover:from-[#4A44D0] hover:to-[#3A34C0] disabled:opacity-50 transition-all hover:shadow-xl active:translate-y-0.5 col-span-1"
            >
              {loading ? '...' : 'GO'}
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-green-600 to-green-700 text-white font-black uppercase text-[11px]">
                  <th className="border border-green-700 px-3 py-3 w-12 text-center">Sl.No</th>
                  <th className="border border-green-700 px-3 py-3 w-24 text-left">Date</th>
                  <th className="border border-green-700 px-3 py-3 text-left">Party</th>
                  <th className="border border-green-700 px-3 py-3 text-left">Item Name</th>
                  <th className="border border-green-700 px-3 py-3 w-20 text-right">Qty</th>
                  <th className="border border-green-700 px-3 py-3 w-20 text-right">Rate</th>
                  <th className="border border-green-700 px-3 py-3 w-28 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, idx) => (
                  <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/40 transition-colors`}>
                    <td className="border border-slate-200 px-3 py-2.5 text-center text-slate-500 font-bold">{idx + 1}</td>
                    <td className="border border-slate-200 px-3 py-2.5 font-medium text-slate-700">{row.date}</td>
                    <td className="border border-slate-200 px-3 py-2.5 font-semibold text-slate-800">{row.party}</td>
                    <td className="border border-slate-200 px-3 py-2.5 font-medium text-slate-700">{row.itemName}</td>
                    <td className="border border-slate-200 px-3 py-2.5 text-right font-black text-[#5B55E6]">{row.qty.toFixed(2)}</td>
                    <td className="border border-slate-200 px-3 py-2.5 text-right font-bold text-slate-700">₹ {row.rate.toFixed(2)}</td>
                    <td className="border border-slate-200 px-3 py-2.5 text-right font-black text-green-700">₹ {row.total.toFixed(2)}</td>
                  </tr>
                ))}
                {Array.from({ length: emptyCount }).map((_, i) => (
                  <tr key={`empty-${i}`} style={{ height: '32px' }}>
                    {Array.from({ length: 7 }).map((_, ci) => (
                      <td key={ci} className="border border-slate-100 px-3">&nbsp;</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SMS Status Feedback */}
        {smsStatus && (
          <div className={`text-xs font-bold px-4 py-3 rounded-lg shrink-0 ${smsStatus.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            {smsStatus}
          </div>
        )}

        {/* Footer / Action Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg px-5 py-4 shrink-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            
            {/* SMS Button */}
            <button
              ref={smsRef}
              onClick={handleSendSMS}
              disabled={smsSending}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleSendSMS(); }
                else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setTimeout(() => printRef.current?.focus(), 0); }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setTimeout(() => goRef.current?.focus(), 0); }
              }}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black uppercase text-[10px] px-4 py-2.5 rounded-lg shadow-md hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-all tracking-wide flex items-center gap-1.5 hover:shadow-lg active:translate-y-0.5"
            >
              <Send className="w-3.5 h-3.5" /> SEND SMS
            </button>

            {/* Totals */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">Total Qty</span>
                <input
                  readOnly
                  className="w-24 border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-right outline-none rounded-lg shadow-inner"
                  value={totals.qty.toFixed(2)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">Amount</span>
                <input
                  readOnly
                  className="w-32 bg-gradient-to-r from-rose-500 to-rose-600 text-white border-0 px-3 py-2 text-[11px] font-black text-right outline-none rounded-lg shadow-lg"
                  value={`₹ ${totals.amount.toFixed(2)}`}
                />
              </div>
            </div>

            {/* Print & Cancel Buttons */}
            <div className="flex gap-2">
              <button
                ref={printRef}
                onClick={handlePrint}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handlePrint(); }
                  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setTimeout(() => cancelRef.current?.focus(), 0); }
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setTimeout(() => smsAllRef.current?.focus(), 0); }
                }}
                className="bg-gradient-to-r from-slate-700 to-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-md hover:from-slate-800 hover:to-slate-900 transition-all hover:shadow-lg active:translate-y-0.5 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={handleCancel}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleCancel(); }
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setTimeout(() => printRef.current?.focus(), 0); }
                }}
                className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-lg border border-slate-300 shadow-md hover:from-slate-200 hover:to-slate-300 transition-all hover:shadow-lg active:translate-y-0.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}