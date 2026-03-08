import React, { useState, useRef, useMemo } from 'react';
import { EnhancedSearchableSelect } from '../shared/EnhancedSearchableSelect';
import { useKeyboardListNavigation } from '../../hooks/useKeyboardListNavigation';
import { api } from '../../utils/api';

/**
 * Group Total Report View Component
 * Implements unified keyboard navigation for group total report generation
 * 
 * @param {Object} props - Component props
 * @param {Array} props.groups - Available groups
 * @param {Array} props.customers - Available customers
 * @param {Object} props.ledgerStore - Ledger data store
 * @param {Function} props.onCancel - Cancel callback
 * @param {Function} props.setActiveSection - Section navigation callback
 * @returns {JSX.Element} Group Total view component
 */
export function GroupTotalView({ groups, customers, ledgerStore, onCancel, setActiveSection }) {
  const [form, setForm] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    groupName: '',
  });
  const [isPrinting, setIsPrinting] = useState(false);
  
  const containerRef = useRef(null);
  
  // Form element refs
  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);
  const groupRef = useRef(null);
  const printBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);

  // Keyboard navigation for form elements
  const formNav = useKeyboardListNavigation({
    itemCount: 5,
    onEnter: (index) => {
      const actions = [
        () => toDateRef.current?.focus(),           // 0: From date -> To date
        () => groupRef.current?.focus(),            // 1: To date -> Group
        () => printBtnRef.current?.focus(),         // 2: Group -> Print button
        () => handlePrint(),                        // 3: Print button action
        () => setActiveSection('daily')             // 4: Cancel action
      ];
      actions[index]?.();
    },
    listRef: containerRef
  });

  // Calculate report data
  const reportData = useMemo(() => {
    const filteredGroups = form.groupName 
      ? groups.filter(group => group.name === form.groupName)
      : groups;

    return filteredGroups.map(group => {
      const groupCustomers = customers.filter(c => c.group === group.name);
      let qtyTotal = 0; 
      let grossTotal = 0; 
      let paidTotal = 0;
      
      groupCustomers.forEach(cust => {
        const entries = ledgerStore[cust.name] || [];
        entries.forEach(e => {
          const entryDate = String(e.date || '');
          const from = String(form.fromDate || '');
          const to = String(form.toDate || '');
          
          // Filter by date range
          if (from && entryDate < from) return;
          if (to && entryDate > to) return;
          
          qtyTotal += Number(e.qty || 0);
          grossTotal += (Number(e.qty || 0) * Number(e.rate || 0));
          paidTotal += Number(e.paidAmt || 0);
        });
      });
      
      return { 
        groupName: group.name, 
        custCount: groupCustomers.length, 
        qtyTotal, 
        grossTotal, 
        paidTotal, 
        balance: grossTotal - paidTotal 
      };
    });
  }, [groups, customers, ledgerStore, form.groupName, form.fromDate, form.toDate]);

  /**
   * Handle print action
   */
  const handlePrint = async () => {
    if (form.groupName && groups.length === 0) {
      alert('No groups available. Please create a group first.');
      return;
    }
    
    setIsPrinting(true);
    try {
      let response;
      if (form.groupName) {
        // If a specific group is selected, use the new endpoint for group-specific report
        response = await api.getGroupTotalReportByGroup(
          form.groupName,
          form.fromDate,
          form.toDate
        );
      } else {
        // If no group is selected, use the existing endpoint for all groups
        response = await api.getGroupTotalReport(
          form.fromDate,
          form.toDate
        );
      }
      
      console.log('[Group Total Print] Response received:', response);
      
      // Handle response - the response is already an HTML string
      const htmlContent = typeof response === 'string' ? response : (response?.data || '');
      
      if (!htmlContent) {
        throw new Error('Received empty response from server');
      }
      
      // Create a temporary window for printing
      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      if (!printWindow) {
        throw new Error('Unable to open print window. Please check your browser popup settings.');
      }
      
      // Write complete HTML document with explicit DOCTYPE
      printWindow.document.write('<!DOCTYPE html><html><head><title>Group Total Report</title></head><body>');
      printWindow.document.write(htmlContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      
      // Wait for the window to fully load
      printWindow.onload = () => {
        // Focus the window first
        printWindow.focus();
        // Small delay to ensure styles are applied
        setTimeout(() => {
          // Call print - guard with __printed to avoid duplicates
          if (!printWindow.__printed) { printWindow.__printed = true; printWindow.print(); }
          // Close the window after print dialog opens
          setTimeout(() => {
            if (!printWindow.closed) {
              printWindow.close();
            }
          }, 1000);
        }, 300);
      };

      // Fallback: trigger print if onload doesn't fire
      setTimeout(() => {
        if (printWindow && !printWindow.closed && !printWindow.__printed) {
          printWindow.focus();
          printWindow.__printed = true;
          printWindow.print();
          setTimeout(() => {
            if (!printWindow.closed) {
              printWindow.close();
            }
          }, 1000);
        }
      }, 2000);
    } catch (error) {
      console.error('[Group Total Print] Error:', error);
      
      // Handle 401 unauthorized - redirect to login
      if (error?.response?.status === 401 || error?.message?.includes('401')) {
        alert('Your session has expired. Please login again.');
        // Clear invalid token
        localStorage.removeItem('skfs_auth_token');
        // Redirect to login page
        window.location.href = '/login';
        return;
      }
      
      alert(`Print failed: ${error.message}`);
      // Return focus to group selection on error
      setTimeout(() => groupRef.current?.focus(), 100);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden" 
      ref={containerRef}
      onKeyDown={formNav.handleKeyDown}
      tabIndex={0}
      data-testid="group-total-view"
    >
      <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-xl rounded-b-xl">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wider">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          GROUP TOTAL REPORT
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
          {/* Date Range Section */}
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

          {/* Group Selection Section */}
          <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100">
            <h2 className="text-sm font-bold uppercase text-slate-600 tracking-widest mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Group Selection
            </h2>
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-widest block mb-2">Group Name (Optional)</label>
              <div className="relative">
                <EnhancedSearchableSelect
                  placeholder={groups.length > 0 ? "Select Group (Leave empty for all groups)" : "No Groups Available"}
                  options={groups.length > 0 ? groups.map(g => g.name) : []}
                  value={form.groupName}
                  onChange={(value) => setForm({ ...form, groupName: value })}
                  inputRef={groupRef}
                  onSelectionComplete={() => printBtnRef.current?.focus()}
                  disabled={groups.length === 0}
                  className="w-full focus:border-rose-500 focus:ring-rose-500/20 rounded-lg shadow-sm hover:shadow-md transition-all border-rose-200"
                />

                {form.groupName && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({ ...form, groupName: "" });
                        // Focus back on the input after clearing
                        setTimeout(() => {
                          groupRef.current?.focus();
                        }, 50);
                      }}
                      className="absolute right-10 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition-colors"
                      title="Clear selection"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-700 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </>
                )}
              </div>
              {groups.length === 0 && (
                <p className="text-xs text-red-500 mt-1">No groups available. Please create a group first.</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100">
            <div className="flex gap-4">
              <button 
                ref={printBtnRef}
                onClick={handlePrint} 
                disabled={isPrinting} 
                className="flex-1 bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] text-white py-3.5 font-bold uppercase text-sm rounded-xl shadow-lg disabled:opacity-50 hover:from-[#4A44D0] hover:to-[#3A34C0] transition-all hover:shadow-xl active:translate-y-0.5" 
              >
                {isPrinting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Printing...
                  </span>
                ) : form.groupName ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Selected Group
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    Print All Groups
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
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Preparing report...
                </span>
              ) : form.groupName ? (
                <span className="text-emerald-600">
                  Report will include only "{form.groupName}" group
                </span>
              ) : (
                <span className="text-blue-600">
                  Report will include all groups in the selected date range
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}