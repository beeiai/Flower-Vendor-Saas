import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  X, Layers, Calendar, RefreshCcw, AlertTriangle, 
  Coins, History, Landmark, Smartphone, List 
} from 'lucide-react';
import { api } from '../../utils/api';
import { DEFAULT_STATES } from '../../utils/stateManager';

/**
 * SilkSummaryView Component
 * * Purpose: Aggregates daily transaction data by Group Category.
 * Logic:
 * 1. Filters ledgerStore by selectedDate.
 * 2. Maps items to their groups via customerMap.
 * 3. Aggregates pieces (qty), weight (kg), and value (amount).
 * 4. Compares manual collection inputs against aggregated totals.
 */
export function SilkSummaryView({ ledgerStore = {}, customers = [], onCancel }) {
  const [state, setState] = useState(DEFAULT_STATES.silkSummary);
  
  const {
    silkPayments,
    selectedDate,
    groupAggregation,
    loading,
    saving,
    message
  } = state;
  
  // Functions to update individual state properties
  const setSilkPayments = useCallback((value) => {
    setState(prev => ({ ...prev, silkPayments: value }));
  }, []);
  
  const setSelectedDate = useCallback((value) => {
    setState(prev => ({ ...prev, selectedDate: value }));
  }, []);
  
  const setGroupAggregation = useCallback((value) => {
    setState(prev => ({ ...prev, groupAggregation: value }));
  }, []);
  
  const setLoading = useCallback((value) => {
    setState(prev => ({ ...prev, loading: value }));
  }, []);
  
  const setSaving = useCallback((value) => {
    setState(prev => ({ ...prev, saving: value }));
  }, []);
  
  const setMessage = useCallback((value) => {
    setState(prev => ({ ...prev, message: value }));
  }, []);
  


  // Fetch ledger data from API
  const fetchLedgerData = async (date) => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    console.log('[FETCHING LEDGER DATA]', date);
    try {
      const response = await api.getSilkLedger(date);
      console.log('[LEDGER RESPONSE]', response);
      setGroupAggregation(response.groups || []);
    } catch (error) {
      setMessage({ text: `Failed to load ledger: ${error.message}`, type: 'error' });
      setGroupAggregation([]);
    } finally {
      setLoading(false);
    }
  };

  // Removed automatic fetching on date change - now requires manual fetch

  // Manual fetch for selected date
  const handleFetch = async () => {
    if (!selectedDate) return;
    
    console.log('[HANDLE FETCH START] Starting fetch for date:', selectedDate);
    console.log('[HANDLE FETCH] Current state before fetch:', {
      cash: silkPayments.cash,
      upi: silkPayments.phonePe,
      credit: dailyCredit
    });
    
    fetchLedgerData(selectedDate);
    await fetchSavedCollection(selectedDate);
    // Calculate credit AFTER fetching ledger and saved collection data
    await calculateCreditAmount();
    
    console.log('[HANDLE FETCH END] Fetch completed for date:', selectedDate);
    console.log('[HANDLE FETCH] State after fetch:', {
      cash: silkPayments.cash,
      upi: silkPayments.phonePe,
      credit: dailyCredit
    });
  };
  
  // Fetch saved collection data for selected date
  const fetchSavedCollection = async (date) => {
    console.log('[FETCH SAVED COLLECTION START] Fetching data for date:', date);
    try {
      // Fetch daily cash and upi from the new silk_daily_collections table
      console.log('[FETCH SAVED COLLECTION] Calling API to get daily collection');
      const savedCollection = await api.getSilkDailyCollectionByDate(date);
      
      if (savedCollection) {
        console.log('[FETCHED DAILY COLLECTION] SUCCESS - Data found:', {
          date: savedCollection.date,
          cash: savedCollection.cash,
          upi: savedCollection.upi,
          id: savedCollection.id
        });
        
        // Sync fetched values into silkPayments state
        setSilkPayments(prev => {
          const newCash = Number(savedCollection.cash) || 0;
          const newUpi = Number(savedCollection.upi) || 0;
          console.log('[UPDATING SILK PAYMENTS] Updating state with fetched values:', { 
            prevCash: prev.cash, 
            prevUpi: prev.phonePe,
            newCash,
            newUpi,
            prevState: prev
          });
          
          return {
            ...prev,
            cash: newCash,
            phonePe: newUpi
            // credit comes from dailyCredit state, not saved collection
          };
        });
        
        // Update cashAmount and upiAmount states for UI and total calculation
        const { cash, upi } = savedCollection;
        
        setCashAmount(Number(cash) || 0);
        setUpiAmount(Number(upi) || 0);
      } else {
        console.log('[NO SAVED COLLECTION FOUND] No data for date:', date);
        // Reset to 0 if no saved collection found
        setSilkPayments(prev => {
          console.log('[RESET SILK PAYMENTS] Resetting to 0 because no data found:', { 
            prevCash: prev.cash, 
            prevUpi: prev.phonePe,
            prevState: prev
          });
          return {
            ...prev,
            cash: 0,
            phonePe: 0
          };
        });
      }
      
      // Log the updated state for verification
      console.log('[SYNCED PAYMENTS STATE] After fetch operation:', silkPayments);
      
    } catch (error) {
      console.error('[FETCH SAVED COLLECTION ERROR] Failed to fetch saved collection:', error);
      // Reset on error
      setSilkPayments(prev => {
        console.log('[RESET SILK PAYMENTS ON ERROR] Resetting to 0 due to error:', { 
          prevCash: prev.cash, 
          prevUpi: prev.phonePe,
          error: error.message,
          prevState: prev
        });
        return {
          ...prev,
          cash: 0,
          phonePe: 0
        };
      });
    }
    console.log('[FETCH SAVED COLLECTION END] Completed fetch for date:', date);
  };
  


  // Save collection entry
  const handleSaveCollection = async () => {
    console.log('[SAVE COLLECTION START] Saving data for date:', selectedDate);
    console.log('[SAVE COLLECTION] Current state values:', {
      cash: silkPayments.cash,
      upi: silkPayments.phonePe,
      credit: dailyCredit
    });
    
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      // Calculate the total manually for the message
      const totalToSave = dailyCredit + 
                          (Number(silkPayments.cash) || 0) + 
                          (Number(silkPayments.phonePe) || 0);
      
      console.log('[SAVE COLLECTION] Preparing to save:', {
        date: selectedDate,
        cash: Number(silkPayments.cash) || 0,
        upi: Number(silkPayments.phonePe) || 0,
        totalToSave
      });
      
      // Save only cash and upi to the new silk_daily_collections table
      const result = await api.saveSilkDailyCollection({
        date: selectedDate,
        cash: cashAmount,
        upi: upiAmount
      });
      
      console.log('[SAVE COLLECTION] API response:', result);
      
      // After successful save, re-fetch to sync backend data
      console.log('[SAVE COLLECTION] Re-fetching data to sync with backend');
      await fetchSavedCollection(selectedDate);
      
      setMessage({ text: `Successfully saved! Total: ₹${totalToSave.toLocaleString(undefined, {minimumFractionDigits: 2})}`, type: 'success' });
      console.log('[SAVE COLLECTION SUCCESS] Total saved:', totalToSave);
    } catch (error) {
      console.error('[SAVE COLLECTION ERROR] Failed to save:', error);
      setMessage({ text: `Save failed: ${error.message}`, type: 'error' });
    } finally {
      setSaving(false);
      console.log('[SAVE COLLECTION END] Save operation completed');
    }
  };
  


  // Dedicated state for Silk daily credit (separate from input state)
  const [dailyCredit, setDailyCredit] = useState(0);
  const [creditCalculationLoading, setCreditCalculationLoading] = useState(false);
  
  // Explicit state variables for credit, cash, and UPI
  const [creditAmount, setCreditAmount] = useState(0);
  const [cashAmount, setCashAmount] = useState(0);
  const [upiAmount, setUpiAmount] = useState(0);
  
  // Debug effect to log dailyCredit changes
  useEffect(() => {
    console.log('[DAILY CREDIT STATE CHANGED]', dailyCredit);
  }, [dailyCredit]);
  
  // Function to calculate credit amount
  const calculateCreditAmount = async () => {
    console.log('[CALCULATE CREDIT AMOUNT START] Calculating credit for date:', selectedDate);
    setCreditCalculationLoading(true);
    try {
      // Get the daily credit from the new Silk endpoint
      console.log('[CALCULATE CREDIT AMOUNT] Calling API to get daily credit');
      const response = await api.getSilkDailyCredit(selectedDate);
      console.log('[CREDIT RESPONSE] API response:', response);
      const totalCredit = response.total_credit || 0;
      
      // Store backend credit in dedicated state - DO NOT touch silkPayments
      console.log('[SETTING DAILY CREDIT] Setting credit value:', totalCredit);
      setDailyCredit(prev => {
        console.log('[DAILY CREDIT SET] Updating credit state:', { prev, new: Number(totalCredit) || 0 });
        return Number(totalCredit) || 0;
      });
      
      // Update creditAmount state for total calculation
      setCreditAmount(response.total_credit || 0);
      
      return totalCredit;
    } catch (error) {
      console.error('[CALCULATE CREDIT AMOUNT ERROR] Error calculating auto credit:', error);
      setDailyCredit(prev => {
        console.log('[DAILY CREDIT SET TO 0 ON ERROR] Resetting credit to 0 due to error:', { prev });
        return 0;
      });
      return 0;
    } finally {
      setCreditCalculationLoading(false);
      console.log('[CALCULATE CREDIT AMOUNT END] Credit calculation completed');
    }
  };

  // Grand Totals across all groups
  const grandTotals = useMemo(() => {
    return groupAggregation.reduce((acc, curr) => ({
      kg: acc.kg + curr.kg,
      amount: acc.amount + curr.amount
    }), { kg: 0, amount: 0 });
  }, [groupAggregation]);

  // Calculate total collected using useMemo
  const totalCollected = useMemo(() => {
    const credit = Number(creditAmount) || 0;
    const cash = Number(cashAmount) || 0;
    const upi = Number(upiAmount) || 0;

    return credit + cash + upi;
  }, [creditAmount, cashAmount, upiAmount]);
  
  // Temporary console log for debugging
  console.log('[TOTAL]', {
    creditAmount,
    cashAmount,
    upiAmount,
    totalCollected
  });
      
  // Verification log for daily collection UI
  console.log('[DAILY COLLECTION UI]', {
    cashAmount,
    upiAmount
  });
  
  const totalLedgerAmount = Number(grandTotals.amount || 0);
  
  // Calculate profit or loss
  const profitLoss = useMemo(() => {
    const result = totalCollected - totalLedgerAmount;
    
    // Debug logging
    console.log('=== Profit/Loss Calculation Debug ===');
    console.log('totalCollected:', totalCollected);
    console.log('grandTotalLedgerValue:', totalLedgerAmount);
    console.log('profitOrLoss:', result);
    console.log('====================================');
    
    return result;
  }, [totalCollected, totalLedgerAmount]);
  
  const isProfit = profitLoss > 0.01;
  const isLoss = profitLoss < -0.01;
  
  // Calculate saved total amount (if available from fetched collection)
  const savedTotalAmount = totalCollected > 0 ? totalCollected : null;

// Credit calculation is now triggered only in handleFetch, not on date change

  // Debug effect to log key values for verification
  useEffect(() => {
    console.log('=== Data Integrity Verification ===');
    console.log('dailyCredit (backend):', dailyCredit);
    console.log('cashCollection (from state):', silkPayments.cash);
    console.log('upiCollection (from state):', silkPayments.phonePe);
    console.log('totalCollected (computed):', totalCollected);
    console.log('grandTotalLedgerValue:', grandTotals.amount);
    console.log('profitOrLoss:', profitLoss);
    console.log('isProfit:', isProfit);
    console.log('isLoss:', isLoss);
    console.log('=================================');
  }, [dailyCredit, silkPayments, totalCollected, grandTotals, profitLoss, isProfit, isLoss]);

  // Log state changes for debugging
  useEffect(() => {
    console.log('[STATE CHANGE] silkPayments updated:', silkPayments);
  }, [silkPayments]);

  useEffect(() => {
    console.log('[STATE CHANGE] dailyCredit updated:', dailyCredit);
  }, [dailyCredit]);

  useEffect(() => {
    console.log('[STATE CHANGE] totalCollected updated:', totalCollected);
  }, [totalCollected]);



  const handleCancel = () => {
    // Reset state before cancelling
    setState(DEFAULT_STATES.silkSummary);
    onCancel && onCancel();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-300 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-2 flex justify-between items-center text-white shrink-0">
        <div className="flex flex-col">
          <h1 className="text-[14px] font-black uppercase flex items-center gap-2 tracking-widest">
            <Layers className="w-4 h-4 text-rose-500" /> Silk Daily Group Summary
          </h1>
          <p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest mt-0.5 italic">Automated Financial Reconciliation</p>
        </div>
        <button onClick={handleCancel} className="p-1 hover:bg-rose-600 transition-colors"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Controls: Date Picker and Fetch */}
        <section className="bg-white border-2 border-slate-200 p-4 shadow-sm flex items-center justify-between shrink-0 rounded-sm">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Select Report Date
              </label>
              <input 
                type="date" 
                className="border-2 border-slate-100 p-1.5 text-[12px] font-bold outline-none focus:border-rose-500 bg-slate-50 h-[32px]"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <button 
              onClick={handleFetch}
              className="mt-4 flex items-center gap-2 bg-slate-800 text-white px-4 py-2 text-[10px] font-black uppercase hover:bg-rose-600 transition-all shadow-md active:scale-95"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Fetch
            </button>
          </div>
          
          {/* Profit/Loss Warning */}
          {(isProfit || isLoss) && (
            <div className={`flex items-center gap-2 px-4 py-2 border rounded-sm ${isProfit ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[12px] font-black uppercase leading-tight">{isProfit ? 'PROFIT' : 'LOSS'}</span>
                <span className="text-[9px] font-bold">Amount: ₹{Math.abs(Number(profitLoss || 0)).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Status Message */}
          {message.text && (
            <div className={`flex items-center gap-2 px-4 py-2 border rounded-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
              {message.type === 'success' ? <Coins className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span className="text-[10px] font-black uppercase">{message.text}</span>
            </div>
          )}
        </section>

        {/* Manual Collection Entry */}
        <section className="bg-white border-2 border-slate-200 p-4 shadow-sm shrink-0 rounded-sm">
          <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-4">
            <Coins className="w-3.5 h-3.5" /> Manual Collection Entry
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400">Credit Amount</label>
              <div className="relative">
                <History className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="number" placeholder="0.00" className="w-full pl-8 pr-3 py-2 border-2 border-slate-100 font-black text-lg outline-none focus:border-rose-500 transition-all shadow-inner bg-slate-50 cursor-not-allowed" value={dailyCredit} readOnly />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400">Cash Collection</label>
              <div className="relative">
                <Landmark className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 border-2 border-slate-100 font-black text-lg outline-none focus:border-emerald-500 transition-all shadow-inner"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400">PhonePe / UPI</label>
              <div className="relative">
                <Smartphone className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 border-2 border-slate-100 font-black text-lg outline-none focus:border-blue-500 transition-all shadow-inner"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button 
              onClick={handleSaveCollection}
              disabled={saving || loading}
              className="bg-slate-800 text-white px-8 py-3 font-semibold uppercase text-sm flex items-center gap-2 shadow-md disabled:opacity-40 rounded-sm transition-all hover:bg-primary-600"
            >
              <Coins className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Collection'}
            </button>
          </div>
        </section>



        {/* Aggregated Group Table */}
        <section className="flex-1 bg-white border-2 border-slate-200 shadow-xl overflow-hidden flex flex-col rounded-sm">
          <div className="bg-slate-100 p-2 border-b font-black text-[9px] uppercase text-slate-500 tracking-widest flex items-center justify-between">
            <span className="flex items-center gap-2"><List className="w-3.5 h-3.5" /> Aggregated Summary for {selectedDate}</span>
            <span className="bg-white px-2 py-0.5 border text-slate-800">Groups Found: {groupAggregation.length}</span>
          </div>
          <div className="flex-1 overflow-auto custom-table-scroll" style={{ maxHeight: '400px' }}>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="sticky top-0 bg-slate-800 text-white z-20 font-black uppercase text-[9px] shadow-md">
                <tr>
                  <th className="p-3 border-r border-slate-700">Group Name</th>
                  <th className="p-3 border-r border-slate-700 text-right">Total KG</th>
                  <th className="p-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="p-20 text-center text-slate-400 italic font-black uppercase tracking-widest text-[10px]">Loading...</td></tr>
                ) : groupAggregation.length === 0 ? (
                  <tr><td colSpan="4" className="p-20 text-center text-slate-300 italic font-black uppercase tracking-widest text-[10px]">No Transactions Recorded for this date</td></tr>
                ) : groupAggregation.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors font-bold text-slate-700">
                    <td className="p-3 border-r border-slate-50 bg-slate-50/30 uppercase">{String(row.groupName)}</td>
                    <td className="p-3 border-r border-slate-50 text-right font-black text-blue-600">{Number(row.kg || 0).toFixed(2)} KG</td>
                    <td className="p-3 text-right font-black text-emerald-600">₹{Number(row.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer Grand Totals */}
          <div className="bg-slate-900 p-4 flex justify-between items-center text-white border-t-4 border-rose-600 shadow-inner shrink-0">
            <div className="text-center">
              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Total Weight</p>
              <p className="text-2xl font-black text-blue-400 tabular-nums">{Number(grandTotals.kg || 0).toFixed(2)} KG</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Total Collected</p>
              <p className="text-4xl font-black text-emerald-400 tabular-nums drop-shadow-lg">₹{totalCollected.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-rose-400 font-black uppercase tracking-widest">Grand Total Ledger Value</p>
              <p className="text-4xl font-black text-rose-500 tabular-nums drop-shadow-lg">₹{Number(grandTotals.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              <div className={`mt-2 text-sm font-bold ${isProfit ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'}`}>
                {isProfit ? 'PROFIT' : isLoss ? 'LOSS' : 'BREAK EVEN'}: ₹{Math.abs(profitLoss).toFixed(2)}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Wrapper component to satisfy the "default export named App" requirement for previewing
export default function App() {
  // Mock data for preview purposes
  const mockCustomers = [
    { name: 'TV Mall', group: 'Retail' },
    { name: 'Big Mart', group: 'Wholesale' }
  ];
  const mockLedger = {
    'TV Mall': [{ date: new Date().toISOString().split('T')[0], qty: 10, kg: 85, rate: 100 }],
    'Big Mart': [{ date: new Date().toISOString().split('T')[0], qty: 5, kg: 40, rate: 200 }]
  };

  return (
    <div className="h-screen w-full flex bg-slate-200">
      <SilkSummaryView 
        customers={mockCustomers} 
        ledgerStore={mockLedger} 
        onCancel={() => console.log('Cancel clicked')} 
      />
    </div>
  );
}