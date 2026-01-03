const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    let details = null;
    try { details = await res.json(); } catch { /* ignore */ }
    const message = details?.error || `Request failed: ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.details = details;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  health: () => request('/api/health'),

  listGroups: () => request('/api/groups'),
  createGroup: (name) => request('/api/groups', { method: 'POST', body: JSON.stringify({ name }) }),

  listCustomers: () => request('/api/customers'),
  createCustomer: (payload) => request('/api/customers', { method: 'POST', body: JSON.stringify(payload) }),
  deleteCustomer: (id) => request(`/api/customers/${id}`, { method: 'DELETE' }),

  listCatalog: () => request('/api/catalog'),
  createCatalogItem: (payload) => request('/api/catalog', { method: 'POST', body: JSON.stringify(payload) }),

  listVehicles: () => request('/api/vehicles'),
  createVehicle: (name) => request('/api/vehicles', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteVehicle: (id) => request(`/api/vehicles/${id}`, { method: 'DELETE' }),

  listTransactions: (customerId) => request(`/api/customers/${customerId}/transactions`),
  replaceTransactions: (customerId, rows) => request(`/api/customers/${customerId}/transactions/replace`, { method: 'PUT', body: JSON.stringify({ rows }) }),
};
