import { create } from 'zustand';
import {
  transactionsApi,
  lineItemsApi,
  type Transaction,
  type CreateTransactionRequest,
  type UpdateTransactionRequest,
  type ListTransactionsParams,
  type TransactionSummary,
  type LineItem,
  type CreateLineItemRequest,
  type UpdateLineItemRequest,
} from '../api/client';

interface TransactionsState {
  // State
  transactions: Transaction[];
  currentTransaction: Transaction | null;
  lineItems: LineItem[];
  summary: TransactionSummary | null;
  isLoading: boolean;
  error: string | null;
  total: number;

  // Actions
  setTransactions: (transactions: Transaction[]) => void;
  setCurrentTransaction: (transaction: Transaction | null) => void;
  fetchTransactions: (accountId: string, params?: ListTransactionsParams) => Promise<void>;
  fetchTransaction: (accountId: string, id: string) => Promise<Transaction>;
  createTransaction: (accountId: string, data: CreateTransactionRequest) => Promise<Transaction>;
  updateTransaction: (accountId: string, id: string, data: UpdateTransactionRequest) => Promise<Transaction>;
  deleteTransaction: (accountId: string, id: string) => Promise<void>;
  fetchSummary: (accountId: string, params?: { start_date?: string; end_date?: string }) => Promise<void>;

  // Line items actions
  fetchLineItems: (accountId: string, transactionId: string) => Promise<void>;
  addLineItem: (accountId: string, transactionId: string, data: Omit<CreateLineItemRequest, 'receipt_id'>) => Promise<LineItem>;
  updateLineItem: (accountId: string, transactionId: string, id: string, data: UpdateLineItemRequest) => Promise<LineItem>;
  deleteLineItem: (accountId: string, transactionId: string, id: string) => Promise<void>;
}

export const useTransactionsStore = create<TransactionsState>()((set) => ({
  // Initial state
  transactions: [],
  currentTransaction: null,
  lineItems: [],
  summary: null,
  isLoading: false,
  error: null,
  total: 0,

  // Setter for transactions list
  setTransactions: (transactions) => {
    set({ transactions });
  },

  // Setter for current transaction
  setCurrentTransaction: (transaction) => {
    set({ currentTransaction: transaction });
  },

  // Fetch all transactions from API
  fetchTransactions: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await transactionsApi.list(accountId, params);
      set({ transactions: response.transactions, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single transaction by ID
  fetchTransaction: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const transaction = await transactionsApi.get(accountId, id);
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

  // Create a new transaction
  createTransaction: async (accountId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newTransaction = await transactionsApi.create(accountId, data);
      set((state) => ({
        transactions: [...state.transactions, newTransaction],
        total: state.total + 1,
        isLoading: false,
      }));
      return newTransaction;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a transaction
  updateTransaction: async (accountId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTransaction = await transactionsApi.update(accountId, id, data);
      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === id ? updatedTransaction : t)),
        currentTransaction:
          state.currentTransaction?.id === id ? updatedTransaction : state.currentTransaction,
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

  // Delete a transaction
  deleteTransaction: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      await transactionsApi.delete(accountId, id);
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
        currentTransaction: state.currentTransaction?.id === id ? null : state.currentTransaction,
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

  // Fetch transaction summary
  fetchSummary: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const summary = await transactionsApi.getSummary(accountId, params);
      set({ summary, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch line items for a transaction
  fetchLineItems: async (accountId, transactionId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await lineItemsApi.list(accountId, transactionId);
      set({ lineItems: response.line_items, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Add a line item to a transaction
  addLineItem: async (accountId, transactionId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newLineItem = await lineItemsApi.add(accountId, transactionId, data);
      set((state) => ({
        lineItems: [...state.lineItems, newLineItem],
        isLoading: false,
      }));
      return newLineItem;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a line item
  updateLineItem: async (accountId, transactionId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedLineItem = await lineItemsApi.update(accountId, transactionId, id, data);
      set((state) => ({
        lineItems: state.lineItems.map((item) => (item.id === id ? updatedLineItem : item)),
        isLoading: false,
      }));
      return updatedLineItem;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a line item
  deleteLineItem: async (accountId, transactionId, id) => {
    set({ isLoading: true, error: null });
    try {
      await lineItemsApi.delete(accountId, transactionId, id);
      set((state) => ({
        lineItems: state.lineItems.filter((item) => item.id !== id),
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
}));

// Re-export types for convenience
export type {
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  ListTransactionsParams,
  TransactionSummary,
  LineItem,
  CreateLineItemRequest,
  UpdateLineItemRequest,
};
export type { TransactionType, TransactionStatus } from '../api/client';
