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
import { executeOptimisticMutation, generateMutationId } from './optimistic';

// Helper to generate optimistic transaction ID
function generateOptimisticTransactionId(): string {
  return `optimistic-transaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to generate optimistic line item ID
function generateOptimisticLineItemId(): string {
  return `optimistic-lineitem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

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
  createTransaction: (accountId: string, data: CreateTransactionRequest) => Promise<Transaction | null>;
  updateTransaction: (accountId: string, id: string, data: UpdateTransactionRequest) => Promise<Transaction | null>;
  deleteTransaction: (accountId: string, id: string) => Promise<boolean>;
  fetchSummary: (accountId: string, params?: { start_date?: string; end_date?: string }) => Promise<void>;

  // Line items actions
  fetchLineItems: (accountId: string, transactionId: string) => Promise<void>;
  addLineItem: (accountId: string, transactionId: string, data: Omit<CreateLineItemRequest, 'receipt_id'>) => Promise<LineItem | null>;
  updateLineItem: (accountId: string, transactionId: string, id: string, data: UpdateLineItemRequest) => Promise<LineItem | null>;
  deleteLineItem: (accountId: string, transactionId: string, id: string) => Promise<boolean>;
  reorderLineItems: (accountId: string, transactionId: string, reorderedItems: LineItem[]) => Promise<void>;
}

export const useTransactionsStore = create<TransactionsState>()((set, get) => ({
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

  // Create a new transaction with optimistic update
  createTransaction: async (accountId, data) => {
    const { transactions } = get();

    // Create optimistic transaction
    const optimisticId = generateOptimisticTransactionId();
    const optimisticTransaction: Transaction = {
      id: optimisticId,
      receipt_id: data.receipt_id,
      user_id: '',
      type: data.type ?? 'purchase',
      amount: data.amount,
      currency: data.currency || 'USD',
      transaction_date: data.transaction_date,
      description: data.description,
      merchant_name: data.merchant_name,
      merchant_category: data.merchant_category,
      payment_method: data.payment_method,
      card_last_four: data.card_last_four,
      reference_number: data.reference_number,
      authorization_code: data.authorization_code,
      status: data.status || 'pending',
      is_recurring: data.is_recurring ?? false,
      recurrence_pattern: data.recurrence_pattern,
      category_tags: data.category_tags,
      metadata: data.metadata,
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      transactions: [...transactions, optimisticTransaction],
      total: transactions.length + 1,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('transaction-create'),
      type: 'transaction:create',
      optimisticData: optimisticTransaction,
      previousData: transactions,
      mutationFn: () => transactionsApi.create(accountId, data),
      onSuccess: (newTransaction) => {
        // Replace optimistic transaction with real one from server
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== optimisticId).concat(newTransaction),
        }));
      },
      onRollback: () => {
        // Restore previous state
        set({ transactions, total: transactions.length });
      },
      errorMessage: 'Failed to create transaction',
    });

    return result;
  },

  // Update a transaction with optimistic update
  updateTransaction: async (accountId, id, data) => {
    const { transactions, currentTransaction } = get();
    const existingTransaction = transactions.find((t) => t.id === id);

    if (!existingTransaction) {
      return null;
    }

    // Create optimistic updated transaction
    const optimisticTransaction: Transaction = {
      ...existingTransaction,
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      transactions: transactions.map((t) => (t.id === id ? optimisticTransaction : t)),
      currentTransaction: currentTransaction?.id === id ? optimisticTransaction : currentTransaction,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('transaction-update'),
      type: 'transaction:update',
      optimisticData: optimisticTransaction,
      previousData: existingTransaction,
      mutationFn: () => transactionsApi.update(accountId, id, data),
      onSuccess: (updatedTransaction) => {
        // Apply server response
        set((state) => ({
          transactions: state.transactions.map((t) => (t.id === id ? updatedTransaction : t)),
          currentTransaction:
            state.currentTransaction?.id === id ? updatedTransaction : state.currentTransaction,
        }));
      },
      onRollback: () => {
        // Restore previous state
        set((state) => ({
          transactions: state.transactions.map((t) => (t.id === id ? existingTransaction : t)),
          currentTransaction:
            state.currentTransaction?.id === id ? existingTransaction : state.currentTransaction,
        }));
      },
      errorMessage: 'Failed to update transaction',
    });

    return result;
  },

  // Delete a transaction with optimistic update
  deleteTransaction: async (accountId, id) => {
    const { transactions, currentTransaction } = get();
    const existingTransaction = transactions.find((t) => t.id === id);

    if (!existingTransaction) {
      return false;
    }

    // Apply optimistic delete immediately
    set({
      transactions: transactions.filter((t) => t.id !== id),
      currentTransaction: currentTransaction?.id === id ? null : currentTransaction,
      total: transactions.length - 1,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('transaction-delete'),
      type: 'transaction:delete',
      optimisticData: null,
      previousData: { transactions, currentTransaction },
      mutationFn: () => transactionsApi.delete(accountId, id),
      onRollback: () => {
        // Restore previous state
        set({
          transactions,
          currentTransaction,
          total: transactions.length,
        });
      },
      errorMessage: 'Failed to delete transaction',
    });

    return result !== null;
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

  // Add a line item to a transaction with optimistic update
  addLineItem: async (accountId, transactionId, data) => {
    const { lineItems } = get();

    // Create optimistic line item
    const optimisticId = generateOptimisticLineItemId();
    const optimisticLineItem: LineItem = {
      id: optimisticId,
      receipt_id: transactionId,
      line_number: data.line_number ?? lineItems.length + 1,
      description: data.description,
      sku: data.sku,
      product_code: data.product_code,
      quantity: data.quantity ?? 1,
      unit: data.unit,
      unit_price: data.unit_price,
      total_price: data.total_price ?? data.unit_price * (data.quantity ?? 1),
      discount_amount: data.discount_amount ?? 0,
      discount_description: data.discount_description,
      tax_amount: data.tax_amount ?? 0,
      tax_rate: data.tax_rate,
      is_taxable: data.is_taxable ?? false,
      category: data.category,
      tags: data.tags,
      metadata: data.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      lineItems: [...lineItems, optimisticLineItem],
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('lineitem-add'),
      type: 'lineitem:add',
      optimisticData: optimisticLineItem,
      previousData: lineItems,
      mutationFn: () => lineItemsApi.add(accountId, transactionId, data),
      onSuccess: (newLineItem) => {
        // Replace optimistic line item with real one from server
        set((state) => ({
          lineItems: state.lineItems.filter((item) => item.id !== optimisticId).concat(newLineItem),
        }));
      },
      onRollback: () => {
        // Restore previous state
        set({ lineItems });
      },
      errorMessage: 'Failed to add line item',
    });

    return result;
  },

  // Update a line item with optimistic update
  updateLineItem: async (accountId, transactionId, id, data) => {
    const { lineItems } = get();
    const existingLineItem = lineItems.find((item) => item.id === id);

    if (!existingLineItem) {
      return null;
    }

    // Create optimistic updated line item
    const optimisticLineItem: LineItem = {
      ...existingLineItem,
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      lineItems: lineItems.map((item) => (item.id === id ? optimisticLineItem : item)),
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('lineitem-update'),
      type: 'lineitem:update',
      optimisticData: optimisticLineItem,
      previousData: existingLineItem,
      mutationFn: () => lineItemsApi.update(accountId, transactionId, id, data),
      onSuccess: (updatedLineItem) => {
        // Apply server response
        set((state) => ({
          lineItems: state.lineItems.map((item) => (item.id === id ? updatedLineItem : item)),
        }));
      },
      onRollback: () => {
        // Restore previous state
        set((state) => ({
          lineItems: state.lineItems.map((item) => (item.id === id ? existingLineItem : item)),
        }));
      },
      errorMessage: 'Failed to update line item',
    });

    return result;
  },

  // Delete a line item with optimistic update
  deleteLineItem: async (accountId, transactionId, id) => {
    const { lineItems } = get();
    const existingLineItem = lineItems.find((item) => item.id === id);

    if (!existingLineItem) {
      return false;
    }

    // Apply optimistic delete immediately
    set({
      lineItems: lineItems.filter((item) => item.id !== id),
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('lineitem-delete'),
      type: 'lineitem:delete',
      optimisticData: null,
      previousData: lineItems,
      mutationFn: () => lineItemsApi.delete(accountId, transactionId, id),
      onRollback: () => {
        // Restore previous state
        set({ lineItems });
      },
      errorMessage: 'Failed to delete line item',
    });

    return result !== null;
  },

  // Reorder line items with optimistic update and backend persistence
  reorderLineItems: async (accountId, transactionId, reorderedItems) => {
    const { lineItems } = get();

    // Apply optimistic update immediately
    // Update line_number to reflect new order
    const updatedLineItems = reorderedItems.map((item, index) => ({
      ...item,
      line_number: index + 1,
      updated_at: new Date().toISOString(),
    }));

    set({
      lineItems: updatedLineItems,
      error: null,
    });

    // Persist to backend with optimistic mutation
    await executeOptimisticMutation({
      mutationId: generateMutationId('lineitem-reorder'),
      type: 'lineitem:reorder',
      optimisticData: updatedLineItems,
      previousData: lineItems,
      mutationFn: () => lineItemsApi.reorder(accountId, transactionId, reorderedItems.map(item => item.id)),
      onSuccess: (serverLineItems) => {
        // Apply server response to ensure consistency
        set({ lineItems: serverLineItems });
      },
      onRollback: () => {
        // Restore previous order on failure
        set({ lineItems });
      },
      errorMessage: 'Failed to reorder line items',
    });
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
