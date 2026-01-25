import { create } from 'zustand';
import {
  receiptsApi,
  type Receipt,
  type CreateReceiptRequest,
  type UpdateReceiptRequest,
  type ListReceiptsParams,
  type VLMAnalysisResult,
} from '../api/client';

interface ReceiptsState {
  // State
  receipts: Receipt[];
  currentReceipt: Receipt | null;
  isLoading: boolean;
  error: string | null;
  total: number;

  // Pagination
  page: number;
  pageSize: number;

  // Actions
  setReceipts: (receipts: Receipt[]) => void;
  setCurrentReceipt: (receipt: Receipt | null) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  fetchReceipts: (accountId: string, params?: ListReceiptsParams) => Promise<void>;
  fetchReceipt: (accountId: string, id: string) => Promise<Receipt>;
  createReceipt: (accountId: string, data: CreateReceiptRequest) => Promise<Receipt>;
  updateReceipt: (accountId: string, id: string, data: UpdateReceiptRequest) => Promise<Receipt>;
  deleteReceipt: (accountId: string, id: string) => Promise<void>;
  reprocessReceipt: (accountId: string, id: string) => Promise<Receipt>;
  linkTransaction: (accountId: string, receiptId: string, transactionId: string) => Promise<Receipt>;
  unlinkTransaction: (accountId: string, receiptId: string) => Promise<Receipt>;
}

export const useReceiptsStore = create<ReceiptsState>()((set) => ({
  // Initial state
  receipts: [],
  currentReceipt: null,
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,

  // Setter for receipts list
  setReceipts: (receipts) => {
    set({ receipts });
  },

  // Setter for current receipt
  setCurrentReceipt: (receipt) => {
    set({ currentReceipt: receipt });
  },

  // Setter for page
  setPage: (page) => {
    set({ page });
  },

  // Setter for page size
  setPageSize: (pageSize) => {
    set({ pageSize, page: 1 });
  },

  // Fetch all receipts from API
  fetchReceipts: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await receiptsApi.list(accountId, params);
      set({ receipts: response.receipts, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single receipt by ID
  fetchReceipt: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const receipt = await receiptsApi.get(accountId, id);
      set({ currentReceipt: receipt, isLoading: false });
      return receipt;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Create a new receipt
  createReceipt: async (accountId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newReceipt = await receiptsApi.create(accountId, data);
      set((state) => ({
        receipts: [...state.receipts, newReceipt],
        total: state.total + 1,
        isLoading: false,
      }));
      return newReceipt;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a receipt
  updateReceipt: async (accountId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedReceipt = await receiptsApi.update(accountId, id, data);
      set((state) => ({
        receipts: state.receipts.map((r) => (r.id === id ? updatedReceipt : r)),
        currentReceipt:
          state.currentReceipt?.id === id ? updatedReceipt : state.currentReceipt,
        isLoading: false,
      }));
      return updatedReceipt;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a receipt
  deleteReceipt: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      await receiptsApi.delete(accountId, id);
      set((state) => ({
        receipts: state.receipts.filter((r) => r.id !== id),
        currentReceipt: state.currentReceipt?.id === id ? null : state.currentReceipt,
        total: state.total - 1,
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Reprocess a receipt (retry VLM analysis)
  reprocessReceipt: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const updatedReceipt = await receiptsApi.reprocess(accountId, id);
      set((state) => ({
        receipts: state.receipts.map((r) => (r.id === id ? updatedReceipt : r)),
        currentReceipt:
          state.currentReceipt?.id === id ? updatedReceipt : state.currentReceipt,
        isLoading: false,
      }));
      return updatedReceipt;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Link a transaction to a receipt
  linkTransaction: async (accountId, receiptId, transactionId) => {
    set({ isLoading: true, error: null });
    try {
      const updatedReceipt = await receiptsApi.linkTransaction(accountId, receiptId, transactionId);
      set((state) => ({
        receipts: state.receipts.map((r) => (r.id === receiptId ? updatedReceipt : r)),
        currentReceipt:
          state.currentReceipt?.id === receiptId ? updatedReceipt : state.currentReceipt,
        isLoading: false,
      }));
      return updatedReceipt;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Unlink a transaction from a receipt
  unlinkTransaction: async (accountId, receiptId) => {
    set({ isLoading: true, error: null });
    try {
      const updatedReceipt = await receiptsApi.unlinkTransaction(accountId, receiptId);
      set((state) => ({
        receipts: state.receipts.map((r) => (r.id === receiptId ? updatedReceipt : r)),
        currentReceipt:
          state.currentReceipt?.id === receiptId ? updatedReceipt : state.currentReceipt,
        isLoading: false,
      }));
      return updatedReceipt;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },
}));

// Re-export types for convenience
export type {
  Receipt,
  CreateReceiptRequest,
  UpdateReceiptRequest,
  ListReceiptsParams,
  VLMAnalysisResult,
};
export type { ReceiptStatus, ReceiptSourceType } from '../api/client';
