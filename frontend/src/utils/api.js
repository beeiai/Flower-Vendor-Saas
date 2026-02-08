import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_URL) {
  throw new Error("VITE_API_BASE_URL is not defined");
}
// Optional legacy Node API (used for SAALA module)
const LEGACY_API_URL = import.meta.env.VITE_LEGACY_API_URL;
// LEGACY_API_URL is optional - only used for SAALA module compatibility

// Compute backend API base with /api prefix (no trailing slash)
const API_BASE = (function () {
  try {
    const u = String(API_URL || '').replace(/\/+$/,'');
    return u.endsWith('/api') ? u : `${u}/api`;
  } catch {
    return `${API_URL}/api`;
  }
})();

const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Request interceptor: attach token, but don't block unauthenticated calls
axiosInstance.interceptors.request.use((config) => {
  try {
    const token = (typeof window !== 'undefined' && window.localStorage)
      ? window.localStorage.getItem('skfs_auth_token')
      : null;
    // attach token if available
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore storage issues but do not attach token
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor: log errors but don't automatically clear token
axiosInstance.interceptors.response.use((res) => res, (error) => {
  const status = error?.response?.status;
  if (status === 401) {
    console.log('Received 401 error:', error?.response?.data);
  }
  return Promise.reject(error);
});

function normalizePath(path) {
  let p = String(path || '');
  // strip leading slashes so axios baseURL `/api` is preserved
  while (p.startsWith('/')) p = p.slice(1);
  // ensure trailing slash to avoid FastAPI redirect on collection endpoints
  // but exclude silk ledger endpoint which expects no trailing slash
  // and exclude paths ending with a date (YYYY-MM-DD)
  if (p && !p.endsWith('/') && p !== 'silk/ledger' && !p.match(/\/\d{4}-\d{2}-\d{2}$/)) p = `${p}/`;
  return p || '/';
}

async function request(path, options = {}) {
  const method = (options.method || 'GET').toLowerCase();
  const url = normalizePath(path);

  console.log('[API CALL] Making request:', { method, url, options });
  
  try {
    const axiosOptions = { url, method };
    
    // Handle response type for DOCX files - default to blob for download
    if (path.includes('print-docx')) {
      axiosOptions.responseType = 'blob';
    }
    
    if (options.body) {
      // if body is a string (old usage), try parse, otherwise pass through
      axiosOptions.data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    }
    if (options.params) axiosOptions.params = options.params;

    const res = await axiosInstance.request(axiosOptions);
    console.log('[API CALL] Response received:', { status: res.status, data: res.data });
    
    // Return response object for DOCX files to access both data and headers
    if (path.includes('print-docx')) {
      return res;
    }
    
    if (res.status === 204) return null;
    return res.data;
  } catch (err) {
    console.error('[API CALL] Request error:', err);
    if (err?.response) {
      const e = new Error(err.response.data?.error || `Request failed: ${err.response.status}`);
      e.status = err.response.status;
      e.details = err.response.data;
      throw e;
    }
    if (err?.status) throw err; // thrown earlier for unauthenticated
    throw err;
  }
}

function normalizeLegacyPath(path) {
  let p = String(path || '');
  if (!p.startsWith('/')) p = `/${p}`;
  return p || '/';
}

// Normalizers ensure frontend only consumes canonical shapes
function normalizeCatalogItem(raw) {
  if (!raw) return null;
  const itemCode = raw.itemCode ?? raw.code ?? '';
  const itemName = raw.itemName ?? raw.name ?? '';
  const rate = Number(raw.rate ?? 0) || 0;
  if (!itemCode && !itemName) return null;
  return {
      id: raw.id,
      itemCode,
      itemName,
      rate,
    };
  }

  async function legacyRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const url = `${LEGACY_API_URL}${normalizeLegacyPath(path)}`;

  const init = { method, headers: {} };
  if (options.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const details = await res.json();
      if (details && (details.error || details.message || details.detail)) {
        message = details.error || details.message || details.detail;
      }
    } catch {
      // ignore JSON parse errors
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export const api = {
  health: () => request('/health'),

  // Farmer groups endpoint (backend uses /farmer-groups)
  listGroups: () => request('/farmer-groups/'),
  createGroup: (name) => request('/farmer-groups/', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteGroup: (id) => request(`/farmer-groups/${id}/`, { method: 'DELETE' }),

  // Customers: backed by FastAPI /farmers endpoints (per-vendor scoped)
  listCustomers: () => request('/farmers/'),
  // Customer creation/deletion still target legacy-shaped /customers endpoints; FastAPI or
  // a compatibility shim can implement those without changing the React UI.
  createCustomer: (payload) => request('/customers/', { method: 'POST', body: JSON.stringify(payload) }),
  deleteCustomer: (id) => request(`/customers/${id}/`, { method: 'DELETE' }),

  // Catalog items: backed by FastAPI /catalog endpoints, always normalized
  listCatalog: async () => {
    const rows = await request('/catalog/');
    if (!Array.isArray(rows)) return [];
    return rows.map(normalizeCatalogItem).filter(Boolean);
  },
  createCatalogItem: async ({ itemCode, itemName, rate }) => {
    const payload = {
      code: String(itemCode || '').trim(),
      name: String(itemName || '').trim(),
    };
    if (rate !== undefined && rate !== null && String(rate).trim() !== '') {
      const n = Number(rate);
      if (!Number.isNaN(n) && n >= 0) payload.rate = n;
    }
    const created = await request('/catalog/', { method: 'POST', body: payload });
    const normalized = normalizeCatalogItem(created);
    if (!normalized) {
      return {
        id: created?.id ?? null,
        itemCode: payload.code,
        itemName: payload.name,
        rate: payload.rate ?? 0,
      };
    }
    return normalized;
  },

  listVehicles: () => request('/vehicles/'),
  // Backend expects vehicle_number / vehicleNumber and optional vehicle_name
  createVehicle: (name) => request('/vehicles/', {
    method: 'POST',
    body: JSON.stringify({ vehicleNumber: name, vehicleName: name }),
  }),
  deleteVehicle: (id) => request(`/vehicles/${id}/`, { method: 'DELETE' }),

  // Daily transactions: backed by /farmers/{id}/transactions/ on FastAPI
  listTransactions: (customerId) => request(`/farmers/${customerId}/transactions/`),
  replaceTransactions: (customerId, rows) => request(`/farmers/${customerId}/transactions/`, { method: 'PUT', body: JSON.stringify(rows) }),
  
  // Individual transaction item APIs for immediate save
  createFarmerTransaction: (farmerId, payload) => {
    return request(`/farmers/${farmerId}/transactions/`, { method: 'POST', body: JSON.stringify(payload) });
  },
  updateCollectionItem: (itemId, payload) => {
    return request(`/collections/${itemId}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteCollectionItem: (itemId) => {
    return request(`/collections/${itemId}`, { method: 'DELETE' });
  },

  // Advances: implemented via FastAPI advances router on /customers/{id}/advances/
  getCustomerAdvances: (customerId) => request(`/customers/${customerId}/advances/`),
  addCustomerAdvance: (customerId, payload) => request(`/customers/${customerId}/advances/`, { method: 'POST', body: JSON.stringify(payload) }),

  // SAALA Module APIs (moved to FastAPI backend)
  listSaalaCustomers: () => {
    console.log('[API CALL] listSaalaCustomers - Fetching all customers');
    return request('/saala/customers/');
  },
  createSaalaCustomer: (payload) => request('/saala/customers/', { method: 'POST', body: JSON.stringify(payload) }),
  updateSaalaCustomer: (id, payload) => request(`/saala/customers/${id}/`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSaalaCustomer: (id) => request(`/saala/customers/${id}/`, { method: 'DELETE' }),

  // Admin APIs
  createVendorUser: (payload) => request('/admin/create-user-for-vendor', { method: 'POST', body: JSON.stringify(payload) }),
  changeVendorPassword: (payload) => request('/admin/change-vendor-password', { method: 'POST', body: JSON.stringify(payload) }),
  getVendors: () => request('/admin/vendors', { method: 'GET' }),

  listSaalaTransactions: (customerId) => request(`/saala/customers/${customerId}/transactions/`),
  createSaalaTransaction: (customerId, payload) => request(`/saala/customers/${customerId}/transactions/`, { method: 'POST', body: JSON.stringify(payload) }),
  updateSaalaTransaction: (id, payload) => request(`/saala/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSaalaTransaction: (id) => request(`/saala/transactions/${id}`, { method: 'DELETE' }),

  getSaalaCustomerSummary: (customerId, options = {}) => {
    console.log('[API CALL] getSaalaCustomerSummary - Customer ID:', customerId);
    return request(`/saala/customers/${customerId}/summary/`, options);
  },
  addSaalaPayment: (customerId, payload) => request(`/saala/customers/${customerId}/payments/`, { method: 'POST', body: JSON.stringify(payload) }),

  // Silk Module APIs
  getSilkLedger: async (date) => {
    const rows = await request('/silk/ledger', { params: { date } });
    return rows;
  },
  saveSilkCollection: async (payload) => {
    const result = await request('/silk/collections/', { method: 'POST', body: payload });
    return result;
  },
  getSilkCollections: async (fromDate, toDate) => {
    const params = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    const rows = await request('/silk/collections/', { params });
    return rows;
  },
  getSilkCollectionByDate: async (date) => {
    const collections = await request('/silk/collections/', { params: { from_date: date, to_date: date } });
    return collections && collections.length > 0 ? collections[0] : null;
  },
  
  // Daily Cash & UPI Collection APIs (new)
  saveSilkDailyCollection: async (payload) => {
    console.log('[API CALL] saveSilkDailyCollection - Input data:', payload);
    const result = await request('/silk/daily-collections', { method: 'POST', body: payload });
    console.log('[API CALL] saveSilkDailyCollection response:', result);
    return result;
  },
  getSilkDailyCollections: async (fromDate, toDate) => {
    const params = { from_date: fromDate, to_date: toDate };
    console.log('[API CALL] getSilkDailyCollections - Params:', params);
    const response = await request('/silk/daily-collections', { params });
    console.log('[API CALL] getSilkDailyCollections response:', response);
    return response.collections || [];
  },
  getSilkDailyCollectionByDate: async (date) => {
    console.log('[API CALL] getSilkDailyCollectionByDate - Input date:', date);
    try {
      const response = await request(`/silk/daily-collections/${date}`);
      console.log('[API CALL] getSilkDailyCollectionByDate response:', response);
      return response;
    } catch (error) {
      console.log('[API CALL] getSilkDailyCollectionByDate error:', error);
      // Return null if not found (404)
      if (error.message && error.message.includes('404')) {
        console.log('[API CALL] No collection found for date:', date);
        return null;
      }
      throw error;
    }
  },
    
  
  // Reports Module APIs
  getDailySales: async (fromDate, toDate, itemName = null) => {
    const params = {
      from_date: fromDate,
      to_date: toDate
    };
    if (itemName) params.item_name = itemName;
    const rows = await request('/reports/daily-sales', { params });
    return rows;
  },
  getDailySalesItems: async () => {
    const items = await request('/reports/daily-sales/items', {});
    return items;
  },

  // SMS Module APIs
  sendSms: async (payload) => {
    const result = await request('/sms/send', { 
      method: 'POST', 
      body: JSON.stringify({
        phone: payload.phoneNumber,
        message: payload.message
      })
    });
    return result;
  },
  
  // Additional APIs
  getSaalaCustomerTotalOutstanding: (customerId) => request(`/saala/customers/${customerId}/total-outstanding/`),
  getSilkDailyCredit: async (date) => {
    console.log('[API CALL] getSilkDailyCredit - Input date:', date);
    const response = await request(`/silk/credit`, { params: { date } });
    console.log('[API CALL] getSilkDailyCredit response:', response);
    return response;
  },
  
  // Print Template APIs (DOCX-based)
  getLedgerReport: async (farmerId, fromDate, toDate, commissionPct = 12.0) => {
    const params = { farmer_id: farmerId, from_date: fromDate, to_date: toDate, commission_pct: commissionPct };
    return request('/print-docx/ledger-report', { params });
  },
  
  getGroupPattiReport: async (groupId, fromDate, toDate, commissionPct = 12.0) => {
    const params = { 
      group_id: groupId, 
      from_date: fromDate, 
      to_date: toDate, 
      commission_pct: commissionPct 
    };
    return request('/print-docx/group-patti-report', { params });
  },
  
  getGroupTotalReport: async (groupId, fromDate, toDate) => {
    const params = { 
      group_id: groupId, 
      from_date: fromDate, 
      to_date: toDate 
    };
    return request('/print-docx/group-total-report', { params });
  },
  
  getDailySalesReport: async (fromDate, toDate, itemName = null) => {
    const params = { from_date: fromDate, to_date: toDate };
    if (itemName) params.item_name = itemName;
    return request('/print-docx/daily-sales-report', { params });
  },
  
  // Preview APIs (for direct browser viewing)
  getLedgerReportPreview: async (farmerId, fromDate, toDate, commissionPct = 12.0) => {
    const params = { farmer_id: farmerId, from_date: fromDate, to_date: toDate, commission_pct: commissionPct };
    return request('/print-docx/ledger-report-preview', { params });
  },
};
