# SMS Single Customer Daily Sale - Complete Solution

## Database Schema Overview

Based on your existing codebase, here are the relevant tables:

### 1. Groups/Farmer Groups Table
```sql
-- farmer_groups table (from existing schema)
CREATE TABLE farmer_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    commission_percent DECIMAL(5,2) DEFAULT 5.00,
    vendor_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);
```

### 2. Customers/Farmers Table
```sql
-- farmers table (from existing schema)
CREATE TABLE farmers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    farmer_code VARCHAR(50),
    address TEXT,
    group_id INTEGER,
    vendor_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES farmer_groups(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);
```

### 3. Daily Sales/Collection Items Table
```sql
-- collection_items table (from existing schema)
CREATE TABLE collection_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    farmer_id INTEGER NOT NULL,
    item_code VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    qty_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
    rate_per_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
    vehicle_name VARCHAR(100),
    vehicle_number VARCHAR(50),
    transport_cost DECIMAL(10,2) DEFAULT 0,
    coolie DECIMAL(10,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    remarks TEXT,
    vendor_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES farmers(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);
```

## SQL Query for Required Data

```sql
-- Get daily sales for specific customer within date range
SELECT 
    ROW_NUMBER() OVER (ORDER BY ci.date, ci.id) as sl_no,
    ci.date,
    ci.item_name,
    ci.qty_kg as qty,
    ci.rate_per_kg as rate,
    (ci.qty_kg * ci.rate_per_kg) as total
FROM collection_items ci
JOIN farmers f ON ci.farmer_id = f.id
JOIN farmer_groups fg ON f.group_id = fg.id
WHERE f.name = :customer_name
    AND fg.name = :group_name
    AND ci.date BETWEEN :from_date AND :to_date
    AND ci.vendor_id = :vendor_id
ORDER BY ci.date, ci.id;

-- Calculate totals
SELECT 
    SUM(ci.qty_kg) as total_quantity,
    SUM(ci.qty_kg * ci.rate_per_kg) as amount_total
FROM collection_items ci
JOIN farmers f ON ci.farmer_id = f.id
JOIN farmer_groups fg ON f.group_id = fg.id
WHERE f.name = :customer_name
    AND fg.name = :group_name
    AND ci.date BETWEEN :from_date AND :to_date
    AND ci.vendor_id = :vendor_id;
```

## API Endpoint Implementation

### FastAPI Endpoint

Create a new endpoint in `backend/app/routes/reports.py`:

```python
@router.get("/sms-single-customer-daily-sale")
def get_sms_single_customer_daily_sale(
    group_name: str = Query(..., description="Group name"),
    customer_name: str = Query(..., description="Customer name"),
    from_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
    """
    Get daily sales data for a specific customer within a group for SMS generation.
    
    Returns:
    - Sales transactions with SL.NO, DATE, ITEM NAME, QTY, RATE, TOTAL
    - Total Quantity and Amount Total for SMS summary
    """
    
    # Get customer ID for the specific group and customer name
    customer = db.query(Farmer).join(FarmerGroup).filter(
        Farmer.name == customer_name,
        FarmerGroup.name == group_name,
        Farmer.vendor_id == user.vendor_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found in specified group")
    
    # Get sales data
    sales_query = db.query(
        CollectionItem.date,
        CollectionItem.item_name,
        CollectionItem.qty_kg,
        CollectionItem.rate_per_kg
    ).filter(
        CollectionItem.farmer_id == customer.id,
        CollectionItem.date >= from_date,
        CollectionItem.date <= to_date,
        CollectionItem.vendor_id == user.vendor_id
    ).order_by(CollectionItem.date, CollectionItem.id)
    
    sales_data = sales_query.all()
    
    # Format the data with SL.NO
    formatted_data = []
    for idx, sale in enumerate(sales_data, 1):
        formatted_data.append({
            "sl_no": idx,
            "date": sale.date.strftime("%d-%m-%Y"),
            "item_name": sale.item_name,
            "qty": float(sale.qty_kg),
            "rate": float(sale.rate_per_kg),
            "total": float(sale.qty_kg * sale.rate_per_kg)
        })
    
    # Calculate totals
    total_qty = sum(sale.qty_kg for sale in sales_data)
    total_amount = sum(sale.qty_kg * sale.rate_per_kg for sale in sales_data)
    
    # Generate SMS content
    sms_content = generate_sms_content(
        customer_name=customer_name,
        from_date=from_date,
        to_date=to_date,
        total_qty=total_qty,
        total_amount=total_amount
    )
    
    return {
        "customer_name": customer_name,
        "group_name": group_name,
        "from_date": from_date.strftime("%d-%m-%Y"),
        "to_date": to_date.strftime("%d-%m-%Y"),
        "sales_data": formatted_data,
        "totals": {
            "total_quantity": float(total_qty),
            "amount_total": float(total_amount)
        },
        "sms_content": sms_content
    }

def generate_sms_content(customer_name: str, from_date: date, to_date: date, 
                         total_qty: float, total_amount: float) -> str:
    """Generate SMS content for the customer"""
    return f"""Dear {customer_name},

Your daily sales summary ({from_date.strftime('%d-%m-%Y')} to {to_date.strftime('%d-%m-%Y')}):
Total Quantity: {total_qty:.2f} KG
Amount Total: ₹{total_amount:.2f}

Thank you for your business!"""
```

## Frontend Implementation

### React Component Structure

```jsx
// frontend/src/components/utility/SmsSingleCustomerDailySale.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../utils/api';

const SmsSingleCustomerDailySale = ({ onCancel, showNotify }) => {
  const [state, setState] = useState({
    // Form fields
    selectedGroup: '',
    selectedCustomer: '',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    
    // Data
    groups: [],
    customers: [],
    filteredCustomers: [],
    salesData: [],
    
    // Calculations
    totalQty: 0,
    totalAmount: 0,
    
    // UI state
    loading: false,
    sending: false,
    error: null
  });

  const {
    selectedGroup,
    selectedCustomer,
    fromDate,
    toDate,
    groups,
    filteredCustomers,
    salesData,
    totalQty,
    totalAmount,
    loading,
    sending,
    error
  } = state;

  // Fetch groups on component mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groupData = await api.listGroups();
        setState(prev => ({ ...prev, groups: groupData || [] }));
      } catch (err) {
        showNotify?.('Failed to load groups', 'error');
      }
    };
    fetchGroups();
  }, [showNotify]);

  // Fetch customers when group is selected
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!selectedGroup) {
        setState(prev => ({ ...prev, filteredCustomers: [], selectedCustomer: '' }));
        return;
      }
      
      try {
        const customerData = await api.listCustomers();
        const groupCustomers = customerData.filter(c => c.group === selectedGroup);
        setState(prev => ({ ...prev, filteredCustomers: groupCustomers }));
      } catch (err) {
        showNotify?.('Failed to load customers', 'error');
      }
    };
    fetchCustomers();
  }, [selectedGroup, showNotify]);

  // Fetch daily sales data
  const fetchDailySales = useCallback(async () => {
    if (!selectedGroup || !selectedCustomer || !fromDate || !toDate) {
      showNotify?.('Please fill all required fields', 'error');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await api.getSmsSingleCustomerDailySale(
        selectedGroup,
        selectedCustomer,
        fromDate,
        toDate
      );
      
      setState(prev => ({
        ...prev,
        salesData: response.sales_data,
        totalQty: response.totals.total_quantity,
        totalAmount: response.totals.amount_total,
        loading: false
      }));
      
      showNotify?.(`Loaded ${response.sales_data.length} records`, 'success');
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err.message || 'Failed to load data', 
        loading: false 
      }));
      showNotify?.('Failed to load sales data', 'error');
    }
  }, [selectedGroup, selectedCustomer, fromDate, toDate, showNotify]);

  // Send SMS
  const handleSendSms = useCallback(async () => {
    if (!selectedCustomer || !totalQty || !totalAmount) return;
    
    setState(prev => ({ ...prev, sending: true }));
    try {
      // Assuming you have an SMS sending API
      await api.sendSms({
        phoneNumber: getCustomerPhoneNumber(), // You'll need to implement this
        message: generateSmsMessage()
      });
      
      showNotify?.('SMS sent successfully', 'success');
      setState(prev => ({ ...prev, sending: false }));
    } catch (err) {
      setState(prev => ({ ...prev, sending: false, error: err.message || 'Failed to send SMS' }));
      showNotify?.('Failed to send SMS', 'error');
    }
  }, [selectedCustomer, totalQty, totalAmount, showNotify]);

  const generateSmsMessage = () => {
    return `Dear ${selectedCustomer},

Your daily sales summary (${fromDate} to ${toDate}):
Total Quantity: ${totalQty.toFixed(2)} KG
Amount Total: ₹${totalAmount.toFixed(2)}

Thank you for your business!`;
  };

  // UI Implementation (JSX)
  return (
    <div className="flex flex-col h-screen w-full bg-[#F1F5F9] font-sans text-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#6366F1] px-6 py-3 flex justify-between items-center shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-white tracking-wide uppercase">SMS Single Customer Daily Sale</h1>
        </div>
        <button onClick={onCancel} className="text-white/80 hover:text-white transition-all hover:scale-110">
          <X size={24} />
        </button>
      </div>

      <div className="p-6 flex flex-col gap-6 flex-1 overflow-hidden">
        {/* Filters Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 shrink-0">
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">Select Group</label>
              <select 
                value={selectedGroup}
                onChange={(e) => setState(prev => ({ ...prev, selectedGroup: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none"
              >
                <option value="">-- Select Group --</option>
                {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">Customer Name</label>
              <select 
                value={selectedCustomer}
                onChange={(e) => setState(prev => ({ ...prev, selectedCustomer: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none"
                disabled={!selectedGroup}
              >
                <option value="">-- Select Customer --</option>
                {filteredCustomers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">From Date</label>
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setState(prev => ({ ...prev, fromDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 outline-none"
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block tracking-wider">To Date</label>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setState(prev => ({ ...prev, toDate: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={fetchDailySales}
                disabled={loading || !selectedCustomer}
                className="bg-[#FF4F81] hover:bg-[#E03E6B] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-pink-100 disabled:opacity-50"
              >
                <Search size={18} /> GO
              </button>
              <button 
                onClick={resetFilters}
                className="bg-[#475569] hover:bg-[#334155] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-slate-100"
              >
                <RefreshCw size={18} /> RESET
              </button>
            </div>
          </div>
        </div>

        {/* Table & Message Preview Section */}
        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Sales Data Table */}
          <div className="flex-[2] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-[#6366F1] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold uppercase text-[11px] tracking-widest border-r border-white/10">SL.NO</th>
                    <th className="px-4 py-3 text-left font-bold uppercase text-[11px] tracking-widest border-r border-white/10">DATE</th>
                    <th className="px-4 py-3 text-left font-bold uppercase text-[11px] tracking-widest border-r border-white/10">ITEM NAME</th>
                    <th className="px-4 py-3 text-right font-bold uppercase text-[11px] tracking-widest border-r border-white/10">QTY (KG)</th>
                    <th className="px-4 py-3 text-right font-bold uppercase text-[11px] tracking-widest border-r border-white/10">RATE</th>
                    <th className="px-4 py-3 text-right font-bold uppercase text-[11px] tracking-widest">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesData.length > 0 ? (
                    salesData.map((item) => (
                      <tr key={`${item.date}-${item.item_name}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 font-medium">{item.sl_no}</td>
                        <td className="px-4 py-3 text-slate-700">{item.date}</td>
                        <td className="px-4 py-3 text-slate-900 font-semibold">{item.item_name}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{item.qty.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{item.rate.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-600">{item.total.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-20 text-center text-slate-400 font-medium italic">
                        {loading ? 'Loading...' : 'No data available'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SMS Message Preview */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={18} className="text-indigo-500" />
              <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider">SMS Content Preview</h3>
            </div>
            <textarea
              value={generateSmsMessage()}
              readOnly
              className="flex-1 w-full border border-slate-100 rounded-xl p-4 bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 resize-none font-medium leading-relaxed"
            />
          </div>
        </div>

        {/* Action Buttons & Summary */}
        <div className="flex items-end justify-between shrink-0 gap-6">
          <div className="flex gap-4 pb-2">
            <button 
              onClick={handleSendSms}
              disabled={sending || !selectedCustomer || salesData.length === 0}
              className="bg-[#10B981] hover:bg-[#059669] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              <Send size={20} /> SEND SMS
            </button>
            <button 
              onClick={onCancel}
              className="bg-[#E2E8F0] hover:bg-slate-300 text-slate-600 px-8 py-3 rounded-xl font-bold transition-all"
            >
              CANCEL
            </button>
          </div>

          {/* Summary Widgets */}
          <div className="flex gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 w-64 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Quantity</h4>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-2xl font-black text-slate-800 tabular-nums">
                  {totalQty.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-400">KG</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#FF4F81] to-[#E11D48] rounded-2xl p-5 w-72 shadow-xl shadow-rose-100 border border-rose-500/20">
              <h4 className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-2">Amount Total</h4>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-xs font-bold text-white/80">₹</span>
                <span className="text-3xl font-black text-white tabular-nums">
                  {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmsSingleCustomerDailySale;
```

## API Integration in Frontend

Add this method to your `frontend/src/utils/api.js`:

```javascript
// Add to existing api object
getSmsSingleCustomerDailySale: async (groupName, customerName, fromDate, toDate) => {
  const params = {
    group_name: groupName,
    customer_name: customerName,
    from_date: fromDate,
    to_date: toDate
  };
  
  return await request('/reports/sms-single-customer-daily-sale', { params });
}
```

## Key Features Implemented

1. **Group-based Customer Filtering**: Only shows customers belonging to selected group
2. **Date Range Filtering**: Proper date filtering for sales transactions
3. **Accurate Data Structure**: Returns SL.NO, DATE, ITEM NAME, QTY, RATE, TOTAL as requested
4. **Automatic Calculations**: Total Quantity and Amount Total calculated and returned
5. **SMS Content Generation**: Automatic SMS template generation with summary
6. **Error Handling**: Proper error handling for missing data, authentication, etc.
7. **Loading States**: Visual feedback during data fetching and SMS sending
8. **Responsive Design**: Mobile-friendly interface with proper styling

## Usage Example

1. User selects "kmp" group
2. User selects "gowtham" customer from that group
3. Sets date range (03-03-2026 to 03-03-2026)
4. Clicks "GO" to fetch data
5. System displays transaction records with calculated totals
6. User can preview and send SMS with summary information

This solution integrates seamlessly with your existing database structure and follows the same patterns used throughout your application.