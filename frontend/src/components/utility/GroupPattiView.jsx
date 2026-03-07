import React, { useState, useRef } from 'react';
import { EnhancedSearchableSelect } from '../shared/EnhancedSearchableSelect';
import { useKeyboardListNavigation } from '../../hooks/useKeyboardListNavigation';
import { api } from '../../utils/api';

/**
 * Group Patti Printing View Component
 * Fetches report data from API, injects into the SKFS HTML print template,
 * and opens the browser print dialog.
 *
 * API Contract — api.getGroupPattiReportHtml() must return:
 * {
 *   data: {
 *     name:         string,   // Customer / group ledger name
 *     address:      string,   // Address (e.g. "TN")
 *     date:         string,   // Leave empty string "" as required
 *     group:        string,   // Group name (e.g. "KALIYUR")
 *     remAdvance:   string,   // Remaining advance amount
 *     advDeduction: string,   // Advance deduction amount
 *     commission:   string,   // Commission amount (calculated from %)
 *     coolie:       string,   // Coolie charge
 *     rows: [
 *       {
 *         date:     string,   // "17/02/2026"
 *         vehicle:  string,   // Vehicle number
 *         itemName: string,   // Item / flower name
 *         qty:      number,   // Quantity
 *         rate:     number,   // Rate per 1000
 *         luggage:  number,   // Luggage charge
 *         paid:     number,   // Amount paid
 *       }
 *     ]
 *   }
 * }
 */
export function GroupPattiView({ groups, customers, onCancel, setActiveSection }) {
  const [form, setForm] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate:   new Date().toISOString().split('T')[0],
    groupName: '',
    commissionPct: 12,
  });
  const [isPrinting, setIsPrinting] = useState(false);

  const containerRef   = useRef(null);
  const fromDateRef    = useRef(null);
  const toDateRef      = useRef(null);
  const groupRef       = useRef(null);
  const commissionRef  = useRef(null);
  const printBtnRef    = useRef(null);
  const cancelBtnRef   = useRef(null);

  const formNav = useKeyboardListNavigation({
    itemCount: 6,
    onEnter: (index) => {
      const actions = [
        () => toDateRef.current?.focus(),
        () => groupRef.current?.focus(),
        () => commissionRef.current?.focus(),
        () => printBtnRef.current?.focus(),
        () => handlePrint(),
        () => setActiveSection('daily'),
      ];
      actions[index]?.();
    },
    listRef: containerRef,
  });

  // ─────────────────────────────────────────────
  //  PRINT HANDLER
  // ─────────────────────────────────────────────
  const handlePrint = async () => {
    if (!form.groupName) {
      alert('Please select a group first');
      groupRef.current?.focus();
      return;
    }

    setIsPrinting(true);

    try {
      const selectedGroup = groups.find(g => g.name === form.groupName);
      if (!selectedGroup) throw new Error('Group not found');

      // Fetch report data from backend
      const response = await api.getGroupPattiReportHtml(
        selectedGroup.id,
        form.fromDate,
        form.toDate,
        form.commissionPct
      );

      // API returns structured report data (not raw HTML)
      const reportData = response?.data;
      if (!reportData) throw new Error('Empty response from server');

      // Open print window
      const printWindow = window.open('', '_blank', 'width=1200,height=900');
      if (!printWindow) {
        throw new Error(
          'Unable to open print window. Please allow popups for this site.'
        );
      }

      // Build complete print document:
      // 1. Inject reportData as window variable BEFORE the template script runs
      // 2. Write the SKFS print template HTML
      const templateHtml = getPrintTemplate(reportData);
      printWindow.document.open();
      printWindow.document.write(templateHtml);
      printWindow.document.close();

      // Trigger print after page loads
      printWindow.onload = () => {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            if (!printWindow.closed) printWindow.close();
          }, 1000);
        }, 300);
      };

      // Fallback trigger if onload doesn't fire
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => {
            if (!printWindow.closed) printWindow.close();
          }, 1000);
        }
      }, 2000);

    } catch (error) {
      console.error('Print error:', error);
      let msg = error.message;
      if (error.response?.status === 401) msg = 'Authentication failed. Please log in again.';
      if (error.response?.status === 500) msg = 'Server error. Please try again later.';
      alert(`Print failed: ${msg}`);
      setTimeout(() => groupRef.current?.focus(), 100);
    } finally {
      setIsPrinting(false);
    }
  };

  // ─────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────
  return (
    <div
      className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden"
      ref={containerRef}
      onKeyDown={formNav.handleKeyDown}
      tabIndex={0}
      data-testid="group-patti-view"
    >
      {/* ── Top Bar ── */}
      <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-xl rounded-b-xl">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wider">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          GROUP PATTI PRINTING
        </h1>
        <button
          onClick={() => setActiveSection('daily')}
          className="p-1.5 rounded-lg hover:bg-white/20 transition-all"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        <div className="max-w-[720px] mx-auto bg-white border border-slate-200 shadow-lg rounded-2xl p-6 space-y-6">

          {/* ── Date Range ── */}
          <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100">
            <h2 className="text-sm font-bold uppercase text-slate-600 tracking-widest mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Date Range
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest block mb-2">From Date</label>
                <input
                  ref={fromDateRef}
                  type="date"
                  className="w-full border border-rose-200 rounded-lg px-4 py-3 text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all"
                  style={{ height: '46px' }}
                  value={form.fromDate}
                  onChange={e => setForm({ ...form, fromDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest block mb-2">To Date</label>
                <input
                  ref={toDateRef}
                  type="date"
                  className="w-full border border-rose-200 rounded-lg px-4 py-3 text-sm font-medium bg-white outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all"
                  style={{ height: '46px' }}
                  value={form.toDate}
                  onChange={e => setForm({ ...form, toDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* ── Group Selection ── */}
          <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100">
            <h2 className="text-sm font-bold uppercase text-slate-600 tracking-widest mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Group Selection
            </h2>
            <EnhancedSearchableSelect
              label="Group Name"
              options={groups.length > 0 ? groups.map(g => g.name) : []}
              value={form.groupName}
              onChange={val => setForm({ ...form, groupName: val })}
              placeholder="Select group"
              inputRef={groupRef}
              onSelectionComplete={() => commissionRef.current?.focus()}
              className="focus:border-rose-500 focus:ring-rose-500/20 rounded-lg shadow-sm hover:shadow-md transition-all border-rose-200 w-full"
            />
          </div>

          {/* ── Commission ── */}
          <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100">
            <h2 className="text-sm font-bold uppercase text-slate-600 tracking-widest mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Commission Settings
            </h2>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest block mb-2">Commission (%)</label>
              <input
                ref={commissionRef}
                type="number"
                className="w-full border border-rose-200 rounded-lg px-4 py-3 text-sm font-medium bg-white outline-none text-right focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm hover:shadow-md transition-all"
                style={{ height: '46px' }}
                value={form.commissionPct}
                onChange={e => setForm({ ...form, commissionPct: e.target.value })}
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100">
            <div className="flex gap-4">
              <button
                ref={printBtnRef}
                onClick={handlePrint}
                disabled={!form.groupName || isPrinting}
                className="flex-1 bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white py-3.5 font-bold uppercase text-sm rounded-xl shadow-lg disabled:opacity-50 hover:from-[#4A44D0] hover:to-[#3A34C0] transition-all hover:shadow-xl active:translate-y-0.5"
              >
                {isPrinting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Printing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Group Patti
                  </span>
                )}
              </button>

              <button
                ref={cancelBtnRef}
                onClick={() => { setIsPrinting(false); setActiveSection('daily'); }}
                className="flex-1 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 py-3.5 font-bold uppercase text-sm border border-slate-300 rounded-xl shadow-md hover:from-slate-200 hover:to-slate-300 transition-all hover:shadow-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </span>
              </button>
            </div>

            <div className="text-center text-sm font-medium text-slate-500 min-h-[24px] mt-3">
              {isPrinting ? (
                <span className="flex items-center justify-center gap-2 text-rose-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Preparing print document...
                </span>
              ) : form.groupName ? (
                <span className="text-emerald-600">Ready to print patti for "{form.groupName}"</span>
              ) : (
                <span className="text-amber-600">Please select a group to proceed</span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  PRINT TEMPLATE GENERATOR
//  Takes reportData from API and returns a complete HTML string
//  that renders the SKFS Group Patti layout and auto-populates.
// ─────────────────────────────────────────────────────────────
function getPrintTemplate(reportData) {
  // Safely serialize data for injection into the window scope
  const safeData = JSON.stringify(reportData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SKFS Group Patti Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; background: white; display: flex; flex-direction: column; align-items: center; padding: 10mm; }
  #invoice { width: 240mm; min-height: 297mm; background: white; padding: 6mm 8mm; }
  .outer-box { border: 2px solid #000; padding: 6px; }
  .header { display: flex; align-items: flex-start; gap: 8px; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
  .logo-box { width: 75px; height: 75px; border: 1px solid #999; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #666; flex-shrink: 0; background: #f5f5f0; }
  .shop-info { flex: 1; text-align: center; }
  .shop-name { font-size: 30px; font-weight: 900; letter-spacing: 2px; line-height: 1.1; }
  .shop-sub { font-size: 14px; letter-spacing: 1px; }
  .shop-address { font-size: 13px; margin-top: 3px; font-weight: bold; }
  .contact-box { text-align: right; font-size: 13px; line-height: 1.8; }
  .info-row { display: grid; grid-template-columns: 1fr 1fr 1fr; font-size: 14px; border: 1px solid #000; padding: 6px 10px; }
  .info-row + .info-row { border-top: none; margin-bottom: 10px; }
  .info-label { font-weight: normal; color: #444; }
  .info-value { font-weight: bold; font-size: 15px; }
  .info-value-lg { font-weight: 900; font-size: 19px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  thead tr { background: #ddd; }
  th, td { border: 1px solid #555; padding: 5px 8px; text-align: right; }
  th { font-weight: bold; text-align: center !important; font-size: 13px; }
  td:nth-child(1) { text-align: center; width: 110px; }
  td:nth-child(2) { text-align: center; width: 80px; }
  td:nth-child(3) { text-align: left; }
  tfoot tr { background: #eee; font-weight: bold; }
  tfoot td { border: 1px solid #555; padding: 5px 8px; }
  .summary-box { margin-top: 10px; border: 1px solid #555; font-size: 14px; }
  .summary-row { display: flex; border-bottom: 1px solid #555; }
  .summary-row:last-child { border-bottom: none; }
  .summary-cell { flex: 1; padding: 6px 12px; border-right: 1px solid #555; }
  .summary-cell:last-child { border-right: none; }
  .s-label { font-size: 13px; color: #444; display: block; }
  .s-value { font-weight: 900; font-size: 17px; display: block; margin-top: 1px; }
  @media print { body { padding: 0; } #invoice { width: 100%; padding: 4mm; } }
</style>
</head>
<body>
<div id="invoice"><div class="outer-box">

  <div class="header">
    <div class="logo-box">LOGO</div>
    <div class="shop-info">
      <div class="shop-name">SREE KRISHNA FLOWER STALL</div>
      <div class="shop-sub">Prop. K.C.N.S &nbsp; <span style="font-size:17px;font-weight:900;">S.K.F.S</span></div>
      <div class="shop-sub"><strong>FLOWER MERCHANTS</strong></div>
      <div class="shop-address">Shop No: B-32, S.K.R Market, Bangalore-560002</div>
    </div>
    <div class="contact-box">
      <div>PH: 81478487760</div>
      <div>Mob: 9972878307</div><br>
      <div style="font-size:20px;font-weight:900;letter-spacing:1px;">S.K.F.S</div>
    </div>
  </div>

  <div class="info-row">
    <div><span class="info-label">Trade Mark: </span><span style="font-size:17px;font-weight:900;">S.K.F.S</span></div>
    <div><span class="info-label">Name: </span><span class="info-value-lg" id="el-name"></span></div>
    <div><span class="info-label">Address: </span><span class="info-value" id="el-address"></span></div>
  </div>
  <div class="info-row">
    <div><span class="info-label">Date: </span><span class="info-value" id="el-date"></span></div>
    <div><span class="info-label">Group: </span><span class="info-value" id="el-group"></span></div>
    <div>
      <div><span class="info-label">Rem Advance: </span><span class="info-value" id="el-rem-advance"></span></div>
      <div><span class="info-label">Adv Deduction: </span><span class="info-value" id="el-adv-deduction"></span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th><th>Vehicle</th><th>Item Name</th>
        <th>Qty</th><th>Rate</th><th>Luggage</th><th>Total</th><th>Paid</th>
      </tr>
    </thead>
    <tbody id="tableBody"></tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align:right;">Total</td>
        <td id="totalQty" style="text-align:right;">—</td>
        <td></td>
        <td id="totalLag" style="text-align:right;">—</td>
        <td id="totalAmt" style="text-align:right;">—</td>
        <td id="totalPaid" style="text-align:right;">—</td>
      </tr>
    </tfoot>
  </table>

  <div class="summary-box">
    <div class="summary-row">
      <div class="summary-cell"><span class="s-label">Commission</span><span class="s-value" id="el-commission">—</span></div>
      <div class="summary-cell"><span class="s-label">Luggage</span><span class="s-value" id="el-luggage-sum">—</span></div>
      <div class="summary-cell"><span class="s-label">Coolie</span><span class="s-value" id="el-coolie">—</span></div>
    </div>
    <div class="summary-row">
      <div class="summary-cell"><span class="s-label">Total</span><span class="s-value" id="el-grand-total">—</span></div>
      <div class="summary-cell"><span class="s-label">Net Amount</span><span class="s-value" id="el-net-amount">—</span></div>
      <div class="summary-cell"><span class="s-label">Paid</span><span class="s-value" id="el-paid-total">—</span></div>
    </div>
  </div>

</div></div>

<script>
  (function() {
    var data = ${safeData};

    function fmt(n) { return parseFloat(n || 0).toFixed(2); }
    function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

    setText('el-name',          data.name          || '');
    setText('el-address',       data.address        || '');
    setText('el-date',          data.date           || '');
    setText('el-group',         data.group          || '');
    setText('el-rem-advance',   data.remAdvance     || '');
    setText('el-adv-deduction', data.advDeduction   || '');

    var tbody = document.getElementById('tableBody');
    var totalQty = 0, totalAmt = 0, totalLag = 0, totalPaid = 0;

    (data.rows || []).forEach(function(r) {
      var qty     = parseFloat(r.qty)     || 0;
      var rate    = parseFloat(r.rate)    || 0;
      var luggage = parseFloat(r.luggage) || 0;
      var paid    = parseFloat(r.paid)    || 0;
      var rowTotal = qty * rate / 1000;

      totalQty  += qty;
      totalAmt  += rowTotal;
      totalLag  += luggage;
      totalPaid += paid;

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td style="text-align:center;">'  + (r.date     || '') + '</td>' +
        '<td style="text-align:center;">'  + (r.vehicle  || '') + '</td>' +
        '<td style="text-align:left;">'    + (r.itemName || '') + '</td>' +
        '<td style="text-align:right;">'   + qty                + '</td>' +
        '<td style="text-align:right;">'   + fmt(rate)          + '</td>' +
        '<td style="text-align:right;">'   + fmt(luggage)       + '</td>' +
        '<td style="text-align:right;">'   + fmt(rowTotal)      + '</td>' +
        '<td style="text-align:right;">'   + fmt(paid)          + '</td>';
      tbody.appendChild(tr);
    });

    setText('totalQty',  totalQty);
    setText('totalAmt',  fmt(totalAmt));
    setText('totalLag',  fmt(totalLag));
    setText('totalPaid', fmt(totalPaid));

    var commission = parseFloat(data.commission) || 0;
    var coolie     = parseFloat(data.coolie)     || 0;
    var grandTotal = commission + coolie + totalLag;
    var netAmount  = totalAmt - grandTotal;

    setText('el-commission',  fmt(commission));
    setText('el-luggage-sum', fmt(totalLag));
    setText('el-coolie',      fmt(coolie));
    setText('el-grand-total', fmt(grandTotal));
    setText('el-net-amount',  fmt(netAmount));
    setText('el-paid-total',  fmt(totalPaid));
  })();
</script>
</body></html>`;
}