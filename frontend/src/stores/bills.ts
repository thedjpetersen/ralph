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
import { executeOptimisticMutation, generateMutationId } from './optimistic';

// Helper to generate optimistic bill ID
function generateOptimisticBillId(): string {
  return `optimistic-bill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

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
  createBill: (accountId: string, data: CreateBillRequest) => Promise<Bill | null>;
  updateBill: (accountId: string, id: string, data: UpdateBillRequest) => Promise<Bill | null>;
  deleteBill: (accountId: string, id: string) => Promise<boolean>;
  markAsPaid: (accountId: string, id: string, paidDate?: string) => Promise<Bill | null>;
  markAsUnpaid: (accountId: string, id: string) => Promise<Bill | null>;
}

export const useBillsStore = create<BillsState>()((set, get) => ({
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

  // Create a new bill with optimistic update
  createBill: async (accountId, data) => {
    const { bills } = get();

    // Create optimistic bill
    const optimisticId = generateOptimisticBillId();
    const optimisticBill: Bill = {
      id: optimisticId,
      account_id: accountId,
      payee_name: data.payee_name,
      description: data.description,
      amount: data.amount,
      currency: data.currency || 'USD',
      due_date: data.due_date,
      status: 'upcoming',
      is_recurring: data.is_recurring,
      frequency: data.frequency,
      reminder_days_before: data.reminder_days_before,
      reminder_enabled: data.reminder_enabled ?? false,
      category: data.category,
      notes: data.notes,
      auto_pay: data.auto_pay ?? false,
      payment_method: data.payment_method,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      bills: [...bills, optimisticBill],
      total: bills.length + 1,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('bill-create'),
      type: 'bill:create',
      optimisticData: optimisticBill,
      previousData: bills,
      mutationFn: () => billsApi.create(accountId, data),
      onSuccess: (newBill) => {
        // Replace optimistic bill with real one from server
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== optimisticId).concat(newBill),
        }));
      },
      onRollback: () => {
        // Restore previous state
        set({ bills, total: bills.length });
      },
      errorMessage: 'Failed to create bill',
    });

    return result;
  },

  // Update a bill with optimistic update
  updateBill: async (accountId, id, data) => {
    const { bills, currentBill } = get();
    const existingBill = bills.find((b) => b.id === id);

    if (!existingBill) {
      return null;
    }

    // Create optimistic updated bill
    const optimisticBill: Bill = {
      ...existingBill,
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      bills: bills.map((b) => (b.id === id ? optimisticBill : b)),
      currentBill: currentBill?.id === id ? optimisticBill : currentBill,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('bill-update'),
      type: 'bill:update',
      optimisticData: optimisticBill,
      previousData: existingBill,
      mutationFn: () => billsApi.update(accountId, id, data),
      onSuccess: (updatedBill) => {
        // Apply server response
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? updatedBill : b)),
          currentBill: state.currentBill?.id === id ? updatedBill : state.currentBill,
        }));
      },
      onRollback: () => {
        // Restore previous state
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? existingBill : b)),
          currentBill: state.currentBill?.id === id ? existingBill : state.currentBill,
        }));
      },
      errorMessage: 'Failed to update bill',
    });

    return result;
  },

  // Delete a bill with optimistic update
  deleteBill: async (accountId, id) => {
    const { bills, currentBill } = get();
    const existingBill = bills.find((b) => b.id === id);

    if (!existingBill) {
      return false;
    }

    // Apply optimistic delete immediately
    set({
      bills: bills.filter((b) => b.id !== id),
      currentBill: currentBill?.id === id ? null : currentBill,
      total: bills.length - 1,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('bill-delete'),
      type: 'bill:delete',
      optimisticData: null,
      previousData: { bills, currentBill },
      mutationFn: () => billsApi.delete(accountId, id),
      onRollback: () => {
        // Restore previous state
        set({
          bills,
          currentBill,
          total: bills.length,
        });
      },
      errorMessage: 'Failed to delete bill',
    });

    return result !== null;
  },

  // Mark bill as paid with optimistic update
  markAsPaid: async (accountId, id, paidDate) => {
    const { bills, currentBill } = get();
    const existingBill = bills.find((b) => b.id === id);

    if (!existingBill) {
      return null;
    }

    // Create optimistic paid bill
    const paidDateValue = paidDate || new Date().toISOString().split('T')[0];
    const optimisticBill: Bill = {
      ...existingBill,
      status: 'paid',
      last_paid_date: paidDateValue,
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      bills: bills.map((b) => (b.id === id ? optimisticBill : b)),
      currentBill: currentBill?.id === id ? optimisticBill : currentBill,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('bill-mark-paid'),
      type: 'bill:mark-paid',
      optimisticData: optimisticBill,
      previousData: existingBill,
      mutationFn: () => billsApi.markAsPaid(accountId, id, paidDate),
      onSuccess: (updatedBill) => {
        // Apply server response
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? updatedBill : b)),
          currentBill: state.currentBill?.id === id ? updatedBill : state.currentBill,
        }));
      },
      onRollback: () => {
        // Restore previous state
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? existingBill : b)),
          currentBill: state.currentBill?.id === id ? existingBill : state.currentBill,
        }));
      },
      successMessage: 'Bill marked as paid',
      errorMessage: 'Failed to mark bill as paid',
    });

    return result;
  },

  // Mark bill as unpaid with optimistic update
  markAsUnpaid: async (accountId, id) => {
    const { bills, currentBill } = get();
    const existingBill = bills.find((b) => b.id === id);

    if (!existingBill) {
      return null;
    }

    // Create optimistic unpaid bill
    const optimisticBill: Bill = {
      ...existingBill,
      status: 'upcoming',
      last_paid_date: undefined,
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      bills: bills.map((b) => (b.id === id ? optimisticBill : b)),
      currentBill: currentBill?.id === id ? optimisticBill : currentBill,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('bill-mark-unpaid'),
      type: 'bill:mark-unpaid',
      optimisticData: optimisticBill,
      previousData: existingBill,
      mutationFn: () => billsApi.markAsUnpaid(accountId, id),
      onSuccess: (updatedBill) => {
        // Apply server response
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? updatedBill : b)),
          currentBill: state.currentBill?.id === id ? updatedBill : state.currentBill,
        }));
      },
      onRollback: () => {
        // Restore previous state
        set((state) => ({
          bills: state.bills.map((b) => (b.id === id ? existingBill : b)),
          currentBill: state.currentBill?.id === id ? existingBill : state.currentBill,
        }));
      },
      successMessage: 'Bill marked as unpaid',
      errorMessage: 'Failed to mark bill as unpaid',
    });

    return result;
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
