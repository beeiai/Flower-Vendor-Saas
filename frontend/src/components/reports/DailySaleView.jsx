import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { X, Printer, Send } from 'lucide-react';
import { api } from '../../utils/api';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function DailySaleView({ onCancel }) {
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate]     = useState(todayISO());
  const [itemName, setItemName] = useState('');
  const [useItem, setUseItem]   = useState(false); // checkbox
  const [catalog, setCatalog]   = useState([]);
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(false);

  const itemRef   = useRef(null);
  const fromRef   = useRef(null);
  const toRef     = useRef(null);
  const goRef     = useRef(null);
  const smsRef    = useRef(null);
  const printRef  = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    api.listCatalog()
      .then(data => setCatalog(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleGo = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDailySales(fromDate, toDate, null);
      const filtered = (Array.isArray(data) ? data : []).filter(r => {
        if (useItem && itemName && String(r.itemName || '') !== itemName) return false;
        return true;
      });
      setRows(filtered);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, itemName, useItem]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    qty:    acc.qty    + Number(r.qty   || 0),
    amount: acc.amount + Number(r.total || 0),
  }), { qty: 0, amount: 0 }), [rows]);

  const handleSendSMS = async () => {
    try {
      const msg = [
        'ITEMS DAILY SALE RATE',
        `FROM: ${fromDate}  TO: ${toDate}`,
        useItem && itemName ? `ITEM: ${itemName}` : 'ITEM: ALL',
        `TOTAL QTY: ${totals.qty.toFixed(2)}`,
        `AMOUNT: ₹${totals.amount.toFixed(2)}`,
      ].join('\n');
      await navigator.clipboard.writeText(msg);
      alert('SMS summary copied to clipboard!');
    } catch { alert('SMS prepared'); }
  };

  const handlePrint = async () => {
    try {
      const response = await api.getDailySalesReport(fromDate, toDate);
      const url = window.URL.createObjectURL(response.data);
      const w = window.open(url, '_blank');
      if (!w) {
        const a = document.createElement('a');
        a.href = url; a.download = `daily_sale_${fromDate}_${toDate}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
      window.URL.revokeObjectURL(url);
    } catch (e) { alert(`Print failed: ${e.message}`); }
  };

  const nav = (e, next, prev) => {
    if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault(); next?.current?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault(); prev?.current?.focus();
    }
  };

  const itemOptions = useMemo(() =>
    [...new Set(catalog.map(i => i.itemName).filter(Boolean))], [catalog]);

  const emptyCount = Math.max(0, 18 - rows.length);

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">

      {/* ── Header (same purple gradient as rest of app) ── */}
      <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-xl rounded-b-xl">
        <h1 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2.5">
          <Printer className="w-4 h-4" /> ITEMS DAILY SALE RATE
        </h1>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/20 transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">

        {/* ── Filter Panel ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shrink-0 overflow-hidden">
          {/* panel title bar */}
          <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-4 py-2 text-white text-xs font-bold uppercase tracking-widest">
            Daily Sale Details
          </div>
          <div className="px-5 py-4 flex items-end gap-4 flex-wrap">

            {/* Checkbox + Item dropdown (matches screenshot: checkbox on left) */}
            <div className="flex items-end gap-2">
              <div className="flex flex-col items-center gap-1 pb-1">
                <input
                  type="checkbox"
                  checked={useItem}
                  onChange={e => setUseItem(e.target.checked)}
                  className="w-4 h-4 accent-[#5B55E6] cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-1 w-56">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Item Name</label>
                <select
                  ref={itemRef}
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  disabled={!useItem}
                  onKeyDown={e => nav(e, fromRef, null)}
                  className="w-full border border-rose-200 rounded-lg px-3 text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed appearance-none"
                  style={{ height: '42px' }}
                >
                  <option value="">All Items</option>
                  {itemOptions.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* From Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">From Date</label>
              <input
                ref={fromRef}
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                onKeyDown={e => nav(e, toRef, itemRef)}
                className="border border-rose-200 rounded-lg px-3 text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all"
                style={{ height: '42px' }}
              />
            </div>

            {/* To label */}
            <span className="text-sm font-bold text-slate-500 pb-2.5">To</span>

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

            {/* Go button */}
            <button
              ref={goRef}
              onClick={handleGo}
              disabled={loading}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleGo(); }
                else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); smsRef.current?.focus(); }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); toRef.current?.focus(); }
              }}
              className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white font-bold text-sm px-6 rounded-xl shadow-lg hover:from-[#4A44D0] hover:to-[#3A34C0] disabled:opacity-50 transition-all hover:shadow-xl active:translate-y-0.5"
              style={{ height: '42px' }}
            >
              {loading ? '...' : 'Go'}
            </button>
          </div>
        </div>

        {/* ── Table (green header, grid lines — matches screenshot) ── */}
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
                    <td className="border border-slate-100 px-3">&nbsp;</td>
                    <td className="border border-slate-100 px-3">&nbsp;</td>
                    <td className="border border-slate-100 px-3">&nbsp;</td>
                    <td className="border border-slate-100 px-3">&nbsp;</td>
                    <td className="border border-slate-100 px-3">&nbsp;</td>
                    <td className="border border-slate-100 px-3">&nbsp;</td>
                    <td className="border border-slate-100 px-3">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Footer (Send SMS | totals | Print | Cancel) ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg px-5 py-3.5 shrink-0 flex items-center justify-between gap-4">

          {/* Send SMS */}
          <button
            ref={smsRef}
            onClick={handleSendSMS}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleSendSMS(); }
              else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); printRef.current?.focus(); }
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goRef.current?.focus(); }
            }}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black uppercase text-[11px] px-6 rounded-xl shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-all tracking-wider flex items-center gap-2 hover:shadow-xl active:translate-y-0.5"
            style={{ height: '40px' }}
          >
            <Send className="w-3.5 h-3.5" /> SEND SMS
          </button>

          {/* Totals */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Total Quantity</span>
              <input
                readOnly
                className="w-28 border border-slate-200 bg-slate-50 px-2 text-[13px] font-black text-right outline-none rounded-lg shadow-inner"
                style={{ height: '36px' }}
                value={totals.qty.toFixed(2)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Amount Total</span>
              <input
                readOnly
                className="w-40 bg-gradient-to-r from-rose-500 to-rose-600 text-white border-0 px-2 text-[14px] font-black text-right outline-none rounded-lg shadow-lg"
                style={{ height: '36px' }}
                value={`₹ ${totals.amount.toFixed(2)}`}
              />
            </div>
          </div>

          {/* Print + Cancel */}
          <div className="flex gap-2">
            <button
              ref={printRef}
              onClick={handlePrint}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handlePrint(); }
                else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); cancelRef.current?.focus(); }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); smsRef.current?.focus(); }
              }}
              className="bg-gradient-to-r from-slate-700 to-slate-800 text-white font-bold text-sm px-5 rounded-xl shadow-lg hover:from-slate-800 hover:to-slate-900 transition-all hover:shadow-xl active:translate-y-0.5 flex items-center gap-1.5"
              style={{ height: '40px' }}
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              ref={cancelRef}
              onClick={onCancel}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); onCancel?.(); }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); printRef.current?.focus(); }
              }}
              className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 font-bold text-sm px-5 rounded-xl border border-slate-300 shadow-md hover:from-slate-200 hover:to-slate-300 transition-all hover:shadow-lg active:translate-y-0.5"
              style={{ height: '40px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}