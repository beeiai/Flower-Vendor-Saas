import React, { useState, useRef } from 'react';
import { EnhancedSearchableSelect } from '../shared/EnhancedSearchableSelect';
import { useKeyboardListNavigation } from '../../hooks/useKeyboardListNavigation';
import { api } from '../../utils/api';

/**
 * Group Patti Printing View Component
 * Implements unified keyboard navigation for group patti report generation
 * 
 * @param {Object} props - Component props
 * @param {Array} props.groups - Available groups
 * @param {Array} props.customers - Available customers
 * @param {Function} props.onCancel - Cancel callback
 * @param {Function} props.setActiveSection - Section navigation callback
 * @returns {JSX.Element} Group Patti view component
 */
export function GroupPattiView({ groups, customers, onCancel, setActiveSection }) {
  const [form, setForm] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    groupName: '',
    commissionPct: 12,
  });
  const [isPrinting, setIsPrinting] = useState(false);
  
  const containerRef = useRef(null);
  
  // Form element refs
  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);
  const groupRef = useRef(null);
  const commissionRef = useRef(null);
  const printBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);

  // Keyboard navigation for form elements
  const formNav = useKeyboardListNavigation({
    itemCount: 6,
    onEnter: (index) => {
      const actions = [
        () => toDateRef.current?.focus(),           // 0: From date -> To date
        () => groupRef.current?.focus(),            // 1: To date -> Group
        () => commissionRef.current?.focus(),       // 2: Group -> Commission
        () => printBtnRef.current?.focus(),         // 3: Commission -> Print button
        () => handlePrint(),                        // 4: Print button action
        () => setActiveSection('daily')             // 5: Cancel action
      ];
      actions[index]?.();
    },
    listRef: containerRef
  });

  /**
   * Handle print action
   */
  const handlePrint = async () => {
    if (!form.groupName) {
      alert('Please select a group first');
      groupRef.current?.focus();
      return;
    }
    
    setIsPrinting(true);
    try {
      const selectedGroup = groups.find(g => g.name === form.groupName);
      if (!selectedGroup) {
        throw new Error('Group not found');
      }
      
      const response = await api.getGroupPattiReport(
        selectedGroup.id,
        form.fromDate,
        form.toDate,
        form.commissionPct
      );
      
      // Open preview in new tab
      const previewWindow = window.open('about:blank', '_blank');
      if (previewWindow) {
        previewWindow.document.write(response.data);
        previewWindow.document.close();
        previewWindow.focus();
      }
    } catch (error) {
      console.error('Print error:', error);
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
      data-testid="group-patti-view"
    >
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
            <div className="relative">
              <EnhancedSearchableSelect 
                label="Group Name" 
                options={groups.length > 0 ? groups.map(g => g.name) : []} 
                value={form.groupName} 
                onChange={(val) => setForm({ ...form, groupName: val })} 
                placeholder="Select group" 
                inputRef={groupRef}
                onSelectionComplete={() => commissionRef.current?.focus()}
                className="focus:border-rose-500 focus:ring-rose-500/20 rounded-lg shadow-sm hover:shadow-md transition-all border-rose-200 w-full" 
              />
            </div>
          </div>

          {/* Commission Section */}
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

          {/* Action Buttons */}
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
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Preparing print document...
                </span>
              ) : form.groupName ? (
                <span className="text-emerald-600">
                  Ready to print patti for "{form.groupName}"
                </span>
              ) : (
                <span className="text-amber-600">
                  Please select a group to proceed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}