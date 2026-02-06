import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Send, 
  Smartphone,
  Calendar,
  Filter
} from 'lucide-react';
import { api } from '../../utils/api';
import { DEFAULT_STATES, resetComponentState } from '../../utils/stateManager';

const SmsView = ({ customers, ledgerStore, onCancel, showNotify }) => {
  const [state, setState] = useState(() => ({
    // Initialize with default SMS state
    ...DEFAULT_STATES.smsView,
    // Add new properties for date range and group selection
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    selectedGroup: '',
    smsStatus: {}
  }));
  
  const { 
    selectedCustomer, 
    messageTemplate, 
    phoneNumber, 
    previewContent, 
    sending,
    fromDate,
    toDate,
    selectedGroup,
    smsStatus
  } = state;
  
  // Destructure setters
  const setSelectedCustomer = (value) => setState(prev => ({ ...prev, selectedCustomer: value }));
  const setMessageTemplate = (value) => setState(prev => ({ ...prev, messageTemplate: value }));
  const setPhoneNumber = (value) => setState(prev => ({ ...prev, phoneNumber: value }));
  const setPreviewContent = (value) => setState(prev => ({ ...prev, previewContent: value }));
  const setSending = (value) => setState(prev => ({ ...prev, sending: value }));
  const setFromDate = (value) => setState(prev => ({ ...prev, fromDate: value }));
  const setToDate = (value) => setState(prev => ({ ...prev, toDate: value }));
  const setSelectedGroup = (value) => setState(prev => ({ ...prev, selectedGroup: value }));
  const setSmsStatus = (value) => setState(prev => ({ ...prev, smsStatus: value }));

  // Reset state when component unmounts or is cancelled
  useEffect(() => {
    return () => {
      // Reset to default SMS state but preserve date range and group selection if available
      setState(prev => ({
        ...DEFAULT_STATES.smsView,
        fromDate: prev?.fromDate || new Date().toISOString().split('T')[0],
        toDate: prev?.toDate || new Date().toISOString().split('T')[0],
        selectedGroup: prev?.selectedGroup || '',
        smsStatus: prev?.smsStatus || {},
        previewContent: '',
        messageTemplate: ''
      }));
    };
  }, []);

  // Get unique groups from customers
  const groups = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    const uniqueGroups = [...new Set(customers.map(c => c.group).filter(Boolean))];
    return uniqueGroups;
  }, [customers]);

  // Filter customers by selected group
  const filteredCustomers = useMemo(() => {
    if (!customers || !Array.isArray(customers)) return [];
    if (!selectedGroup || selectedGroup === 'All Groups') {
      return customers;
    }
    return customers.filter(c => c.group === selectedGroup);
  }, [customers, selectedGroup]);



  // Get SMS status for a customer
  const getSmsStatus = (customerName) => {
    return smsStatus[customerName] || 'Pending';
  };

  // Handle customer selection
  const handleCustomerSelect = (customerName) => {
    setSelectedCustomer(customerName);
    if (customers && Array.isArray(customers)) {
      const customer = customers.find(c => c.name === customerName);
      if (customer) {
        setPhoneNumber(customer.contact || '');
      }
    }
  };

  // Generate preview message automatically
  const generatePreview = () => {
    let previewMsg = messageTemplate;
    if (selectedCustomer && messageTemplate) {
      previewMsg = messageTemplate.replace('{{customer}}', selectedCustomer);
      previewMsg = previewMsg.replace('{{fromDate}}', fromDate);
      previewMsg = previewMsg.replace('{{toDate}}', toDate);
    }
    return previewMsg;
  };
  
  // Auto-update preview when relevant fields change
  useEffect(() => {
    const previewMsg = generatePreview();
    setPreviewContent(previewMsg);
  }, [selectedCustomer, messageTemplate, fromDate, toDate]);

  // Send SMS
  const handleSend = async () => {
    if (!selectedCustomer) {
      showNotify && showNotify('Please select a customer', 'error');
      return;
    }
    
    if (!phoneNumber.trim()) {
      showNotify && showNotify('Please enter a phone number', 'error');
      return;
    }
    
    const messageToSend = generatePreview();

    setSending(true);
    try {
      // Call backend API to send SMS
      await api.sendSms({
        phoneNumber: phoneNumber,
        message: messageToSend
      });
      
      // Update SMS status to 'Sent'
      setSmsStatus(prev => ({
        ...prev,
        [selectedCustomer]: 'Sent'
      }));
      
      showNotify && showNotify('SMS sent successfully', 'success');
      // Reset form after sending but preserve date range and group selection
      setState(prev => ({
        ...DEFAULT_STATES.smsView,
        fromDate: prev.fromDate,
        toDate: prev.toDate,
        selectedGroup: prev.selectedGroup,
        smsStatus: prev.smsStatus,
        previewContent: '',
        messageTemplate: ''
      }));
    } catch (error) {
      // Update SMS status to 'Failed'
      setSmsStatus(prev => ({
        ...prev,
        [selectedCustomer]: 'Failed'
      }));
      showNotify && showNotify(`Failed to send SMS: ${error.message}`, 'error');
    } finally {
      setSending(false);
    }
  };

  // Predefined templates
  const templates = [
    { id: 1, name: 'General Reminder', content: 'Dear {{customer}}, this is a reminder from {{fromDate}} to {{toDate}}. Please contact us for any queries.' },
    { id: 2, name: 'Thank You', content: 'Thank you {{customer}} for your business from {{fromDate}} to {{toDate}}.' },
    { id: 3, name: 'Information', content: '{{customer}}, we hope you are doing well. This message is from {{fromDate}} to {{toDate}}.' },
  ];

  const handleTemplateSelect = (templateContent) => {
    setMessageTemplate(templateContent);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] px-5 py-3 flex justify-between items-center text-white shrink-0 shadow-xl rounded-b-xl">
        <h1 className="text-base font-bold uppercase flex items-center gap-2.5 tracking-wider">
          <Smartphone className="w-5 h-5 text-white" /> CUSTOMER SMS BROADCAST
        </h1>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/20 transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4 overflow-hidden">
        
        {/* Controls Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg shrink-0 backdrop-blur-sm">
          <div className="grid grid-cols-12 gap-3 items-end">
            
            {/* Date Range - Combined in one section */}
            <div className="col-span-2">
              <label className="text-[9px] font-black uppercase text-slate-600 mb-1 block tracking-wider">From Date</label>
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" 
                data-enter-index="1"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[9px] font-black uppercase text-slate-600 mb-1 block tracking-wider">To Date</label>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" 
                data-enter-index="2"
              />
            </div>

            {/* Group Selection */}
            <div className="col-span-2">
              <label className="text-[9px] font-black uppercase text-slate-600 mb-1 block tracking-wider">Group</label>
              <div className="relative">
                <select 
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 appearance-none"
                  data-enter-index="3"
                >
                  <option value="">All Groups</option>
                  {groups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-400 pointer-events-none" />
              </div>
            </div>

            {/* Customer Selection */}
            <div className="col-span-3">
              <label className="text-[9px] font-black uppercase text-slate-600 mb-1 block tracking-wider">Customer</label>
              <div className="relative">
                <select 
                  value={selectedCustomer}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 appearance-none"
                  data-enter-index="4"
                >
                  <option value="">-- Select Customer --</option>
                  {filteredCustomers.map(customer => (
                    <option key={customer.id} value={customer.name}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-400 pointer-events-none" />
              </div>
            </div>

            {/* Phone Number */}
            <div className="col-span-2">
              <label className="text-[9px] font-black uppercase text-slate-600 mb-1 block tracking-wider">Phone</label>
              <input 
                type="tel" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-rose-50 border-2 border-rose-200 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none transition-all duration-200 hover:border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100" 
                placeholder="Phone number"
                data-enter-index="5"
              />
            </div>

            {/* SMS Status */}
            <div className="col-span-1">
              <label className="text-[9px] font-black uppercase text-slate-600 mb-1 block tracking-wider">Status</label>
              <input 
                type="text" 
                readOnly 
                value={getSmsStatus(selectedCustomer)}
                className="w-full bg-gradient-to-r from-slate-100 to-slate-200 border-2 border-slate-200 rounded-lg p-2 text-xs font-black text-center text-slate-700 outline-none shadow-inner" 
              />
            </div>
          </div>
        </div>

        {/* Customer List - Moved above controls */}
        <div className="flex-1 bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-lg">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gradient-to-r from-[#5B55E6] to-[#4A44D0] sticky top-0 text-white uppercase font-bold text-xs z-10 border-b-2 border-black/20 shadow-lg">
              <tr>
                <th className="p-3.5 w-14 border-r border-black/20">Sl.No</th>
                <th className="p-3.5 border-r border-black/20">Customer Name</th>
                <th className="p-3.5 border-r border-black/20">Phone</th>
                <th className="p-3.5 w-36 text-center">SMS Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-16 text-center text-slate-500 text-sm font-bold">
                    No customers available
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, idx) => {
                  const status = getSmsStatus(customer.name);
                  
                  return (
                    <tr 
                      key={customer.id} 
                      className={`border-b border-black/10 hover:bg-slate-50 transition-all duration-150 cursor-pointer ${
                        selectedCustomer === customer.name ? 'bg-slate-100' : ''
                      }`}
                      onClick={() => handleCustomerSelect(customer.name)}
                    >
                      <td className="p-3.5 font-bold text-slate-700 border-r border-black/10">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-slate-800 border-r border-black/10">{customer.name}</td>
                      <td className="p-3.5 font-mono text-slate-500 border-r border-black/10">{customer.contact || '--'}</td>
                      <td className="p-3.5 text-center">
                        <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg ${
                          status === 'Sent' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                          status === 'Failed' ? 'bg-red-100 text-red-700 border border-red-200' : 
                          'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Action Buttons - Send SMS and Cancel side by side */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-lg shrink-0 backdrop-blur-sm">
          <div className="flex gap-3 justify-between">
            <button 
              onClick={handleSend}
              disabled={sending}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 tracking-wider"
              data-enter-index="7"
            >
              <Send size={16} /> {sending ? 'SENDING...' : 'SEND SMS'}
            </button>
            <button 
              onClick={onCancel}
              className="bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 px-5 py-2.5 font-black uppercase text-xs rounded-lg shadow-lg hover:from-slate-300 hover:to-slate-400 transition-all duration-200 flex items-center gap-2 tracking-wider border border-slate-300"
              data-enter-index="8"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmsView;