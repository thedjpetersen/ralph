import { create } from 'zustand';
import {
  billsApi,
  type Bill,
  type BillStatus,
  type BillFrequency,
  type CreateBillRequest,
  type UpdateBillRequest,
  type ListBillsParams,
} from '../api/bills';

interface BillsState {
  // Bills state
  bills: Bill[];
  currentBill: Bill | null;
  isLoading: boolean;
  error: string | null;
  total: number;

  // Bill actions
  setBills: (bills: Bill[]) => void;
  setCurrentBill: (bill: Bill | null) => void;
  fetchBills: (accountId: string, params?: ListBillsParams) => Promise<void>;
  fetchBill: (accountId: string, id: string) => Promise<Bill>;
  createBill: (accountId: string, data: CreateBillRequest) => Promise<Bill>;
  updateBill: (accountId: string, id: string, data: UpdateBillRequest) => Promise<Bill>;
  deleteBill: (accountId: string, id: string) => Promise<void>;
  markAsPaid: (accountId: string, id: string, paidDate?: string) => Promise<Bill>;
  markAsUnpaid: (accountId: string, id: string) => Promise<Bill>;
}

export const useBillsStore = create<BillsState>()((set) => ({
  // Initial state
  bills: [],
  currentBill: null,
  isLoading: false,
  error: null,
  total: 0,

  // Bill setters
  setBills: (bills) => set({ bills }),
  setCurrentBill: (bill) => set({ currentBill: bill }),

  // Fetch all bills
  fetchBills: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await billsApi.list(accountId, params);
      set({ bills: response.bills, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single bill
  fetchBill: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const bill = await billsApi.get(accountId, id);
      set({ currentBill: bill, isLoading: false });
      return bill;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Create a new bill
  createBill: async (accountId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newBill = await billsApi.create(accountId, data);
      set((state) => ({
        bills: [...state.bills, newBill],
        total: state.total + 1,
        isLoading: false,
      }));
      return newBill;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a bill
  updateBill: async (accountId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedBill = await billsApi.update(accountId, id, data);
      set((state) => ({
        bills: state.bills.map((b) => (b.id === id ? updatedBill : b)),
        currentBill: state.currentBill?.id === id ? updatedBill : state.currentBill,
        isLoading: false,
      }));
      return updatedBill;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a bill
  deleteBill: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      await billsApi.delete(accountId, id);
      set((state) => ({
        bills: state.bills.filter((b) => b.id !== id),
        currentBill: state.currentBill?.id === id ? null : state.currentBill,
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

  // Mark bill as paid
  markAsPaid: async (accountId, id, paidDate) => {
    set({ isLoading: true, error: null });
    try {
      const updatedBill = await billsApi.markAsPaid(accountId, id, paidDate);
      set((state) => ({
        bills: state.bills.map((b) => (b.id === id ? updatedBill : b)),
        currentBill: state.currentBill?.id === id ? updatedBill : state.currentBill,
        isLoading: false,
      }));
      return updatedBill;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Mark bill as unpaid
  markAsUnpaid: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const updatedBill = await billsApi.markAsUnpaid(accountId, id);
      set((state) => ({
        bills: state.bills.map((b) => (b.id === id ? updatedBill : b)),
        currentBill: state.currentBill?.id === id ? updatedBill : state.currentBill,
        isLoading: false,
      }));
      return updatedBill;
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
  Bill,
  BillStatus,
  BillFrequency,
  CreateBillRequest,
  UpdateBillRequest,
  ListBillsParams,
};
