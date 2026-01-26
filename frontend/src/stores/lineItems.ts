import { create } from 'zustand';
import {
  lineItemsApi,
  type LineItemWithTransaction,
  type ListAllLineItemsParams,
} from '../api/client';

interface LineItemsState {
  // State
  lineItems: LineItemWithTransaction[];
  isLoading: boolean;
  error: string | null;
  total: number;

  // Actions
  fetchAllLineItems: (accountId: string, params?: ListAllLineItemsParams) => Promise<void>;
  clearLineItems: () => void;
}

export const useLineItemsStore = create<LineItemsState>()((set) => ({
  // Initial state
  lineItems: [],
  isLoading: false,
  error: null,
  total: 0,

  // Fetch all line items from API
  fetchAllLineItems: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await lineItemsApi.listAll(accountId, params);
      set({ lineItems: response.line_items, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Clear line items
  clearLineItems: () => {
    set({ lineItems: [], total: 0, error: null });
  },
}));

// Re-export types for convenience
export type { LineItemWithTransaction, ListAllLineItemsParams };
