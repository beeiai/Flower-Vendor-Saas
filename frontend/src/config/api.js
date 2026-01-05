import axios from "axios";

// Base URL for the FastAPI backend. In production, configure VITE_API_URL and
// avoid hard-coding any environment-specific URLs here.
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const client = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token from localStorage on every request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized error normalization so all callers see friendly Error messages.
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.response?.data?.message;

    let message = detail || "Request failed";

    if (status === 401) message = "Your session has expired. Please login again.";
    else if (status === 403) message = "You do not have permission to perform this action.";
    else if (status === 404) message = "Requested resource was not found.";
    else if (status === 422) message = "Some fields are invalid. Please check your input.";
    else if (status === 429) message = "Too many requests. Please try again later.";
    else if (status >= 500) message = "Server error. Please try again later.";

    return Promise.reject(new Error(message));
  }
);

async function jsonPost(path, body) {
  return client.post(path, body);
}
// ---------- Normalizers (canonical frontend shapes) ----------
function normalizeCatalogItem(raw) {
  if (!raw) return null;
  const item = {
    id: raw.id,
    itemCode: raw.item_code ?? raw.itemCode ?? raw.code ?? "",
    itemName: raw.item_name ?? raw.itemName ?? raw.name ?? "",
  };
  if (!item.itemCode || !item.itemName) {
    console.warn("Malformed catalog item payload", raw);
  }
  return item;
}

function normalizeCustomer(raw) {
  if (!raw) return null;
  const groupName =
    raw.group?.name ??
    raw.group_name ??
    raw.groupName ??
    raw.group ??
    "";
  const customer = {
    id: raw.id,
    name: raw.name ?? "",
    group: groupName,
    contact: raw.contact ?? raw.phone ?? raw.phone_number ?? "",
    address: raw.address ?? "",
  };
  if (!customer.name) {
    console.warn("Malformed customer payload", raw);
  }
  return customer;
}

function normalizeVehicle(raw) {
  if (!raw) return null;
  const vehicle = {
    id: raw.id,
    name:
      raw.name ??
      raw.vehicle_name ??
      raw.vehicle_number ??
      raw.description ??
      "",
  };
  if (!vehicle.name) {
    console.warn("Malformed vehicle payload", raw);
  }
  return vehicle;
}
function normalizeGroup(raw) {
  if (!raw) return null;
  const group = { id: raw.id, name: raw.name ?? raw.group_name ?? "" };
  if (!group.name) console.warn("Malformed group payload", raw);
  return group;
}

const api = {
  /**
   * Low-level client (axios instance) exposed for rare advanced use-cases.
   * Prefer using the explicit helpers below.
   */
  client,

  // AUTH ------------------------------------------------------------
  /**
   * Login using OAuth2 password flow.
   * The backend expects `application/x-www-form-urlencoded` with `username` + `password`.
   */
  async login(email, password) {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    const data = await client.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return data;
  },

  me: () => client.get("/auth/me"),

  // GROUPS ----------------------------------------------------------
  listGroups: async () => {
    const data = await client.get("/farmer-groups/");
    return Array.isArray(data) ? data.map(normalizeGroup).filter(Boolean) : [];
  },
  createGroup: async (name) => {
    const created = await client.post("/farmer-groups/", { name });
    return normalizeGroup(created);
  },

  // FARMERS / CUSTOMERS ---------------------------------------------
  // Use dropdown-safe endpoint; normalize before state
  listCustomers: async (groupName = "") => {
    const params = {};
    if (groupName) params.group_name = groupName;
    const data = await client.get("/farmers/by-group/", { params });
    return Array.isArray(data) ? data.map(normalizeCustomer).filter(Boolean) : [];
  },
  /**
   * Create a customer/farmer.
   *
   * The backend expects: { name, group_name, phone, address }.
   * The UI usually passes: { name, groupId, contact, address }.
   *
   * To keep the backend strict and secure, we translate groupId → group_name
   * on the client by looking up the group list.
   */
  createCustomer: async ({ name, groupId, contact, address }) => {
    const groups = await client.get("/farmer-groups/");
    const group = Array.isArray(groups)
      ? groups.find((g) => g.id === groupId)
      : null;

    if (!group) {
      throw new Error("Invalid group");
    }

    const created = await client.post("/farmers/", {
      name,
      group_name: group.name,
      phone: contact,
      address,
    });
    return normalizeCustomer(created);
  },

  // VEHICLES --------------------------------------------------------
  listVehicles: async () => {
    const data = await client.get("/vehicles/");
    return Array.isArray(data) ? data.map(normalizeVehicle).filter(Boolean) : [];
  },
  createVehicle: async (name) => {
    const created = await client.post("/vehicles/", {
      vehicle_name: name,
      vehicle_number: name,
    });
    return normalizeVehicle(created);
  },
  deleteVehicle: (vehicleId) => client.delete(`/vehicles/${vehicleId}`),

  // CATALOG (ITEMS) -------------------------------------------------
  listCatalog: async () => {
    const data = await client.get("/catalog/");
    return Array.isArray(data) ? data.map(normalizeCatalogItem).filter(Boolean) : [];
  },
  /**
   * Create a catalog item.
   * Accepts either itemCode/itemName (UI shape) and sends to backend.
   */
  createCatalogItem: async ({ itemCode, itemName, rate = 0 }) => {
    const created = await client.post("/catalog/", {
      item_code: itemCode,
      item_name: itemName,
      rate,
    });
    return normalizeCatalogItem(created);
  },

  // TRANSACTIONS ----------------------------------------------------
  listTransactions: (farmerId) =>
    client.get(`/farmers/${farmerId}/transactions/`),

  replaceTransactions: (farmerId, items) =>
    client.put(`/farmers/${farmerId}/transactions/`, items),
};

export default api;
