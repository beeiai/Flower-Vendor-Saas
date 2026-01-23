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
    <div className="flex-1 flex flex-col h-full bg-[#f1f3f5] overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-2 flex justify-between items-center text-white shrink-0 shadow-lg">
        <h1 className="text-[14px] font-black uppercase flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-rose-500" /> CUSTOMER SMS BROADCAST
        </h1>
        <button onClick={onCancel} className="p-1 hover:bg-rose-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3 overflow-hidden">
        
        {/* Controls Section */}
        <div className="bg-white border border-slate-300 p-3 shadow-sm shrink-0">
          <div className="grid grid-cols-12 gap-3 items-end">
            
            {/* Date Range */}
            <div className="col-span-3">
              <label className="text-[9px] font-black uppercase text-slate-500">From Date</label>
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border p-2 text-[11px] font-bold outline-none" 
              />
            </div>

            <div className="col-span-3">
              <label className="text-[9px] font-black uppercase text-slate-500">To Date</label>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border p-2 text-[11px] font-bold outline-none" 
              />
            </div>

            {/* Group Selection */}
            <div className="col-span-3">
              <label className="text-[9px] font-black uppercase text-slate-500">Select Group</label>
              <select 
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full border p-2 text-[11px] font-bold outline-none bg-white"
              >
                <option value="">All Groups</option>
                {groups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            {/* Customer Selection */}
            <div className="col-span-3">
              <label className="text-[9px] font-black uppercase text-slate-500">Select Customer</label>
              <select 
                value={selectedCustomer}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                className="w-full border p-2 text-[11px] font-bold outline-none bg-white"
              >
                <option value="">-- Select Customer --</option>
                {filteredCustomers.map(customer => (
                  <option key={customer.id} value={customer.name}>
                    {customer.name} - {customer.contact || 'No Phone'}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone Number */}
            <div className="col-span-3">
              <label className="text-[9px] font-black uppercase text-slate-500">Phone Number</label>
              <input 
                type="tel" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full border p-2 text-[11px] font-bold outline-none" 
                placeholder="Enter phone number"
              />
            </div>

            {/* SMS Status */}
            <div className="col-span-3">
              <label className="text-[9px] font-black uppercase text-slate-500">SMS Status</label>
              <input 
                type="text" 
                readOnly 
                value={getSmsStatus(selectedCustomer)}
                className="w-full bg-slate-100 border p-2 text-[11px] font-bold text-center outline-none" 
              />
            </div>
          </div>

          {/* Template Selection */}
          <div className="mt-3">
            <label className="text-[9px] font-black uppercase text-slate-500">Message Template</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {templates.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateSelect(template.content)}
                  className={`px-2 py-1 text-[9px] font-bold rounded-sm border ${
                    messageTemplate === template.content 
                      ? 'bg-slate-800 text-white border-slate-800' 
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>



          {/* Live Preview */}
          <div className="mt-3 bg-slate-50 border border-slate-200 p-3 rounded">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[9px] font-black uppercase text-slate-600">Message Preview</label>
              <span className="text-[8px] text-slate-500">Live preview updates automatically</span>
            </div>
            <div className="bg-white border border-slate-300 p-3 rounded min-h-[60px]">
              <p className="text-[11px] text-slate-800 whitespace-pre-wrap">{previewContent || 'Select a customer and enter a message to see preview'}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <button 
              onClick={handleSend}
              disabled={sending}
              className="bg-emerald-600 text-white px-4 h-8 font-black uppercase text-[10px] hover:bg-emerald-700 shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Send size={12} /> {sending ? 'SENDING...' : 'SEND SMS'}
            </button>
          </div>
        </div>



        {/* Customer List */}
        <div className="flex-1 bg-white border-2 border-slate-300 overflow-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-200 sticky top-0 uppercase font-black text-[9px] z-10 border-b-2 border-slate-400">
              <tr>
                <th className="p-3 w-10">Sl.No</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3 w-32 text-center">SMS Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-500 text-[11px] font-bold">
                    No customers available
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, idx) => {
                  const status = getSmsStatus(customer.name);
                  
                  return (
                    <tr 
                      key={customer.id} 
                      className={`border-b hover:bg-slate-50 transition-colors cursor-pointer ${
                        selectedCustomer === customer.name ? 'bg-slate-100' : ''
                      }`}
                      onClick={() => handleCustomerSelect(customer.name)}
                    >
                      <td className="p-3 font-bold text-slate-700">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-800">{customer.name}</td>
                      <td className="p-3 font-mono text-slate-500">{customer.contact || '--'}</td>
                      <td className="p-3 text-center">
                        <span className={`text-[8px] font-semibold uppercase px-2 py-1 rounded ${
                          status === 'Sent' ? 'bg-emerald-100 text-emerald-700' : 
                          status === 'Failed' ? 'bg-red-100 text-red-700' : 
                          'bg-amber-100 text-amber-700'
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

        {/* Footer Actions */}
        <div className="bg-white border border-slate-300 p-3 shadow-sm shrink-0">
          <div className="flex justify-end gap-3">
            <button 
              onClick={onCancel}
              className="bg-slate-300 text-slate-800 px-6 h-9 font-black uppercase text-[10px] hover:bg-slate-400"
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