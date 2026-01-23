/**
 * Centralized State Manager for consistent UI state management
 * Ensures clean slate behavior when switching between tabs/routes
 */

// Default state constants for consistent UX patterns
export const DEFAULT_STATES = {
  // Common filter state (applies to most reports/components)
  commonFilters: {
    selectedGroup: '',
    selectedCustomer: '',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    selectedVehicle: '',
    commissionPct: 12,
  },
  
  // Daily transactions state
  dailyTransaction: {
    customerInfo: {
      groupName: '',
      customerName: '',
      address: '',
      contactNo: ''
    },
    currentEntry: {
      date: new Date().toISOString().split('T')[0],
      vehicle: '',
      itemCode: '',
      itemName: '',
      qty: '',
      rate: '',
      laguage: '',
      coolie: '',
      paidAmt: '',
      remarks: ''
    },
    items: [],
    commissionPct: 12,
  },

  // Reports state
  reports: {
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    groupName: '',
    customerName: '',
    vehicle: '',
    commissionPct: 0,
    autoLoad: false,
    rows: [],
  },

  // Daily sale report state
  dailySaleReport: {
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    selectedGroup: '',
    groups: [],
    customers: [],
    filteredData: [],
    loading: false,
    error: null,
  },

  // Silk summary state
  silkSummary: {
    silkPayments: { credit: '', cash: '', phonePe: '' },
    selectedDate: new Date().toISOString().split('T')[0],
    groupAggregation: [],
    loading: false,
    saving: false,
    message: { text: '', type: '' },

  },

  // Saala transaction state
  saalaTransaction: {
    selectedCustomerId: null,
    transactions: [],
    summary: { totalCredit: 0, totalPaid: 0, balance: 0 },
    currentEntry: {
      id: null,
      date: new Date().toISOString().split('T')[0],
      itemCode: '',
      itemName: '',
      qty: '',
      rate: '',
      totalAmount: '',
      paidAmount: '',
      remarks: ''
    }
  },

  // Party details state
  partyDetails: {
    selectedKeys: new Set(),
    smsByKey: {},
    selectedGroup: 'All Groups',
  },

  // Group patti form state
  groupPattiForm: {
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    groupName: '',
    commissionPct: 12,
  },

  // Group total form state
  groupTotalForm: {
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    groupName: '',
  },

  // Items daily sale rate state
  itemsDailySaleRateForm: {
    itemName: '',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
  },

  // SMS View state
  smsView: {
    selectedCustomer: '',
    messageTemplate: 'Dear Customer, your bill amount is {{amount}}. Thank you for your business.',
    phoneNumber: '',
    previewContent: '',
    sending: false,
  },
};

/**
 * Creates a reset function for a specific component type
 */
export function createResetFunction(componentType) {
  const defaultState = DEFAULT_STATES[componentType];
  
  if (!defaultState) {
    throw new Error(`Unknown component type: ${componentType}`);
  }

  return function resetState(setterFn) {
    if (typeof setterFn === 'function') {
      setterFn(defaultState);
    } else {
      console.warn(`Invalid setter function passed to resetState for ${componentType}`);
    }
  };
}

/**
 * Hook to handle component cleanup and reset on unmount or tab change
 */
export function useComponentCleanup(componentType, setState) {
  const resetState = createResetFunction(componentType);

  const cleanup = () => {
    resetState(setState);
  };

  return { cleanup, resetState };
}

/**
 * Generic state reset utility
 */
export function resetComponentState(componentType, setState) {
  const defaultState = DEFAULT_STATES[componentType];
  
  if (defaultState && typeof setState === 'function') {
    setState(defaultState);
    return true;
  }
  
  console.warn(`Could not reset state for component type: ${componentType}`);
  return false;
}

/**
 * Batch reset for multiple state pieces
 */
export function resetMultipleStates(resetConfig) {
  const results = {};
  
  for (const [key, { type, setter }] of Object.entries(resetConfig)) {
    results[key] = resetComponentState(type, setter);
  }
  
  return results;
}