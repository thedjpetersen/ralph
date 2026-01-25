import { create } from 'zustand';
import {
  bankTransactionsApi,
  type BankTransaction,
  type ListBankTransactionsParams,
  type UpdateBankTransactionRequest,
  type BankTransactionsSummary,
} from '../api/client';

interface BankTransactionsState {
  // State
  transactions: BankTransaction[];
  currentTransaction: BankTransaction | null;
  uncategorizedTransactions: BankTransaction[];
  recurringTransactions: BankTransaction[];
  summary: BankTransactionsSummary | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  uncategorizedTotal: number;
  recurringTotal: number;

  // Actions
  setTransactions: (transactions: BankTransaction[]) => void;
  setCurrentTransaction: (transaction: BankTransaction | null) => void;
  fetchTransactions: (accountId: string, params?: ListBankTransactionsParams) => Promise<void>;
  fetchTransaction: (accountId: string, id: string) => Promise<BankTransaction>;
  updateTransaction: (accountId: string, id: string, data: UpdateBankTransactionRequest) => Promise<BankTransaction>;
  fetchSummary: (accountId: string, params?: { start_date?: string; end_date?: string; financial_account_id?: string }) => Promise<void>;
  fetchUncategorized: (accountId: string, params?: { limit?: number; offset?: number }) => Promise<void>;
  fetchRecurring: (accountId: string, params?: { limit?: number; offset?: number }) => Promise<void>;
}

export const useBankTransactionsStore = create<BankTransactionsState>()((set) => ({
  // Initial state
  transactions: [],
  currentTransaction: null,
  uncategorizedTransactions: [],
  recurringTransactions: [],
  summary: null,
  isLoading: false,
  error: null,
  total: 0,
  uncategorizedTotal: 0,
  recurringTotal: 0,

  // Setter for transactions list
  setTransactions: (transactions) => {
    set({ transactions });
  },

  // Setter for current transaction
  setCurrentTransaction: (transaction) => {
    set({ currentTransaction: transaction });
  },

  // Fetch all bank transactions from API
  fetchTransactions: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await bankTransactionsApi.list(accountId, params);
      set({ transactions: response.transactions, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single bank transaction by ID
  fetchTransaction: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const transaction = await bankTransactionsApi.get(accountId, id);
      set({ currentTransaction: transaction, isLoading: false });
      return transaction;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a bank transaction
  updateTransaction: async (accountId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTransaction = await bankTransactionsApi.update(accountId, id, data);
      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === id ? updatedTransaction : t)),
        currentTransaction:
          state.currentTransaction?.id === id ? updatedTransaction : state.currentTransaction,
        uncategorizedTransactions: state.uncategorizedTransactions.filter((t) => t.id !== id),
        isLoading: false,
      }));
      return updatedTransaction;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Fetch bank transactions summary
  fetchSummary: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const summary = await bankTransactionsApi.getSummary(accountId, params);
      set({ summary, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch uncategorized transactions
  fetchUncategorized: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await bankTransactionsApi.listUncategorized(accountId, params);
      set({ uncategorizedTransactions: response.transactions, uncategorizedTotal: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch recurring transactions
  fetchRecurring: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await bankTransactionsApi.listRecurring(accountId, params);
      set({ recurringTransactions: response.transactions, recurringTotal: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },
}));

// Re-export types for convenience
export type {
  BankTransaction,
  ListBankTransactionsParams,
  UpdateBankTransactionRequest,
  BankTransactionsSummary,
};
export type { BankTransactionType, BankTransactionStatus } from '../api/client';
