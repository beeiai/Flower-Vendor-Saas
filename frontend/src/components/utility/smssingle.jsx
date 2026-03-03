import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  X, 
  Send, 
  Filter, 
  Calendar, 
  Users, 
  Phone, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Printer
} from 'lucide-react';

/**
 * Internal API definition to ensure the component is runnable within the preview environment.
 */
const api = {
  getDailySales: async (fromDate, toDate) => {
    // Simulated API response based on the Item Daily Sale Rate structure
    await new Promise(resolve => setTimeout(resolve, 800));
    return [
      { id: 1, date: '19/12/2025', party: 'John Doe', item_name: 'Rose (Red)', qty: 15.5, rate: 45 },
      { id: 2, date: '19/12/2025', party: 'Jane Smith', item_name: 'Lily (White)', qty: 10.0, rate: 50 },
      { id: 3, date: '20/12/2025', party: 'John Doe', item_name: 'Jasmine', qty: 5.2, rate: 42 },
    ];
  },
  sendSms: async ({ phoneNumber, message }) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true };
  }
};

const SmsSingle = ({ customers = [], onCancel, showNotify }) => {
  const [state, setState] = useState({
    selectedGroup: '',
    selectedCustomer: '',
    phoneNumber: '',
    messageTemplate: 'Dear {{customer}}, your daily sales from {{fromDate}} to {{toDate}}:\nTotal Quantity: {{qty}} kg\nTotal Amount: ₹{{amount}}\nThank you!',
    customMessage: '',
    sending: false,
    loading: false,
    fromDate: '2025-12-19',
    toDate: '2025-12-19',
    salesData: [],
    totalQty: 0,
    totalAmount: 0,
    error: null
  });

  const { 
    selectedGroup, 
    selectedCustomer, 
    phoneNumber, 
    messageTemplate, 
    customMessage,
    sending, 
    loading,
    fromDate,
    toDate,
    salesData,
    totalQty,
    totalAmount,
    error
  } = state;

  const setSelectedGroup = useCallback((value) => {
    setState(prev => ({ ...prev, selectedGroup: value, selectedCustomer: '', phoneNumber: '' }));
  }, []);

  const setSelectedCustomer = useCallback((value) => {
    const customer = customers.find(c => c.name === value);
    setState(prev => ({ 
      ...prev, 
      selectedCustomer: value,
      phoneNumber: customer?.contact || ''
    }));
  }, [customers]);

  const setPhoneNumber = useCallback((value) => {
    setState(prev => ({ ...prev, phoneNumber: value }));
  }, []);

  const setCustomMessage = useCallback((value) => {
    setState(prev => ({ ...prev, customMessage: value }));
  }, []);

  const setMessageTemplate = useCallback((value) => {
    setState(prev => ({ ...prev, messageTemplate: value }));
  }, []);

  const setFromDate = useCallback((value) => {
    setState(prev => ({ ...prev, fromDate: value }));
  }, []);

  const setToDate = useCallback((value) => {
    setState(prev => ({ ...prev, toDate: value }));
  }, []);

  const groups = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    return [...new Set(customers.map(c => c.group).filter(Boolean))];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    if (!selectedGroup) return customers;
    return customers.filter(c => c.group === selectedGroup);
  }, [customers, selectedGroup]);

  const generateSmsMessage = useCallback(() => {
    if (!selectedCustomer) return '';
    return messageTemplate
      .replace('{{customer}}', selectedCustomer)
      .replace('{{fromDate}}', fromDate)
      .replace('{{toDate}}', toDate)
      .replace('{{qty}}', totalQty.toFixed(2))
      .replace('{{amount}}', totalAmount.toFixed(2));
  }, [messageTemplate, selectedCustomer, fromDate, toDate, totalQty, totalAmount]);

  const fetchDailySales = useCallback(async () => {
    if (!selectedCustomer || !fromDate || !toDate) {
      showNotify?.('Please select customer and date range', 'error');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await api.getDailySales(fromDate, toDate);
      const customerData = data.filter(item => 
        item.party === selectedCustomer || 
        item.farmer_name === selectedCustomer
      );

      const totals = customerData.reduce((acc, item) => {
        const qty = parseFloat(item.qty) || 0;
        const rate = parseFloat(item.rate) || 0;
        return {
          qty: acc.qty + qty,
          amount: acc.amount + (qty * rate)
        };
      }, { qty: 0, amount: 0 });

      setState(prev => ({
        ...prev,
        salesData: customerData,
        totalQty: totals.qty,
        totalAmount: totals.amount,
        loading: false
      }));
      showNotify?.(`Loaded ${customerData.length} records`, 'success');
    } catch (err) {
      setState(prev => ({ ...prev, error: err.message || 'Failed to load data', loading: false }));
      showNotify?.('Failed to load sales data', 'error');
    }
  }, [selectedCustomer, fromDate, toDate, showNotify]);

  const handleSendSms = async () => {
    if (!selectedCustomer || !phoneNumber) return;
    const msg = customMessage || generateSmsMessage();
    setState(prev => ({ ...prev, sending: true }));
    try {
      await api.sendSms({ phoneNumber, message: msg });
      showNotify?.('SMS sent successfully', 'success');
      setState(prev => ({ ...prev, sending: false }));
    } catch (err) {
      setState(prev => ({ ...prev, sending: false, error: err.message || 'Failed to send' }));
      showNotify?.('Failed to send SMS', 'error');
    }
  };

  useEffect(() => {
    if (selectedCustomer && totalQty > 0 && !customMessage) {
      setCustomMessage(generateSmsMessage());
    }
  }, [selectedCustomer, totalQty, totalAmount, generateSmsMessage, customMessage, setCustomMessage]);

  return (
    <div className="flex flex-col h-[90vh] w-full max-w-4xl mx-auto bg-[#E5E7EB] border border-gray-400 shadow-xl font-sans text-xs select-none">
      
      {/* Title Bar */}
      <div className="bg-white px-3 py-1.5 flex justify-between items-center border-b border-gray-300 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-gray-600 rounded-sm"></div>
          <span className="font-semibold text-gray-700 uppercase">Items Daily Sale Rate</span>
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:text-black transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3 overflow-hidden h-full">
        
        {/* Daily Sale Details Group Box */}
        <div className="border border-green-600 rounded p-4 relative pt-6 bg-[#F3F4F6] shrink-0">
          <span className="absolute -top-3 left-4 bg-[#F3F4F6] px-1 text-green-700 font-bold italic">Daily Sale Details</span>
          
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-24 text-right"></div>
                <select 
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full border border-gray-400 p-1 bg-white outline-none focus:border-blue-500"
                >
                  <option value="">-- Select Group --</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="w-24 text-right font-semibold">C Name</label>
                <select 
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full border border-gray-400 p-1 bg-white outline-none focus:border-blue-500"
                  disabled={!selectedGroup}
                >
                  <option value="">-- Select Customer --</option>
                  {filteredCustomers.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                </select>
                <button 
                  onClick={fetchDailySales}
                  disabled={loading}
                  className="px-4 py-0.5 bg-gray-100 border border-gray-400 shadow-sm active:bg-gray-300 disabled:opacity-50 font-bold"
                >
                  Go
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="w-24 text-right font-semibold">From Date</label>
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-400 p-1 bg-white"
                />
                <label className="px-2 font-semibold">To</label>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-400 p-1 bg-white"
                />
              </div>
            </div>

            <div className="w-32 flex flex-col items-center">
              <button 
                onClick={handleSendSms}
                disabled={sending || !selectedCustomer}
                className="w-full py-2 bg-gray-100 border border-gray-400 text-black font-bold uppercase shadow hover:bg-white active:bg-gray-200 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send SMS'}
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 bg-white border border-gray-400 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-green-700 text-white text-left">
              <tr>
                <th className="border border-gray-300 px-2 py-1 font-normal w-12 text-center">Sl.No.</th>
                <th className="border border-gray-300 px-2 py-1 font-normal">Date</th>
                <th className="border border-gray-300 px-2 py-1 font-normal">Party</th>
                <th className="border border-gray-300 px-2 py-1 font-normal">Item Name</th>
                <th className="border border-gray-300 px-2 py-1 font-normal text-right">Qty</th>
                <th className="border border-gray-300 px-2 py-1 font-normal text-right">Rate</th>
                <th className="border border-gray-300 px-2 py-1 font-normal text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {salesData.length > 0 ? (
                salesData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-blue-50 text-gray-700">
                    <td className="border border-gray-200 px-2 py-1 text-center">{idx + 1}</td>
                    <td className="border border-gray-200 px-2 py-1">{item.date}</td>
                    <td className="border border-gray-200 px-2 py-1">{item.party}</td>
                    <td className="border border-gray-200 px-2 py-1">{item.item_name}</td>
                    <td className="border border-gray-200 px-2 py-1 text-right">{parseFloat(item.qty).toFixed(2)}</td>
                    <td className="border border-gray-200 px-2 py-1 text-right">{parseFloat(item.rate).toFixed(2)}</td>
                    <td className="border border-gray-200 px-2 py-1 text-right font-bold">{(item.qty * item.rate).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                Array.from({ length: 15 }).map((_, i) => (
                  <tr key={i}><td colSpan="7" className="border border-gray-100 h-6"></td></tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* SMS Preview Area */}
        <div className="h-28 bg-white border border-gray-400 p-2 shrink-0">
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full h-full resize-none outline-none text-sm text-gray-700 font-mono"
            placeholder="SMS content preview..."
          />
        </div>

        {/* Totals and Bottom Actions */}
        <div className="flex flex-col items-end gap-1 shrink-0 bg-[#F3F4F6] p-2 border-t border-gray-300">
          <div className="flex items-center gap-10">
            <span className="font-bold uppercase text-gray-600 text-[10px]">Total Quantity</span>
            <span className="font-bold text-base w-24 text-right tabular-nums">{totalQty.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-10">
            <span className="font-bold uppercase text-gray-600 text-[10px]">Amount Total</span>
            <span className="font-bold text-base w-24 text-right tabular-nums">{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-2 shrink-0">
          <button 
            disabled 
            className="px-8 py-1 bg-gray-100 border border-gray-400 text-gray-400 cursor-not-allowed font-bold"
          >
            Print
          </button>
          <button 
            onClick={onCancel}
            className="px-8 py-1 bg-gray-100 border border-gray-400 hover:bg-white active:bg-gray-200 transition-colors font-bold"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

/**
 * DEFAULT EXPORT WRAPPER FOR PREVIEW
 */
export default function App() {
  const [notification, setNotification] = useState(null);

  const sampleCustomers = [
    { id: 1, name: 'John Doe', group: 'Farmers', contact: '9876543210' },
    { id: 2, name: 'Jane Smith', group: 'Farmers', contact: '9123456789' },
    { id: 3, name: 'Alex Green', group: 'Retailers', contact: '9988776655' },
  ];

  const showNotify = (msg, type) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#64748B] flex items-center justify-center p-4">
      <SmsSingle 
        customers={sampleCustomers} 
        onCancel={() => console.log('Window closed')}
        showNotify={showNotify}
      />

      {notification && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded text-white text-xs font-bold shadow-lg z-50 animate-fade-in ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.msg}
        </div>
      )}
    </div>
  );
}