import { create } from 'zustand';
import {
  budgetsApi,
  budgetPeriodsApi,
  budgetAllocationsApi,
  type Budget,
  type BudgetDetail,
  type BudgetPeriod,
  type BudgetAllocation,
  type CreateBudgetRequest,
  type UpdateBudgetRequest,
  type ListBudgetsParams,
  type ListBudgetPeriodsParams,
  type CreateBudgetAllocationRequest,
  type UpdateBudgetAllocationRequest,
} from '../api/client';
import { executeOptimisticMutation, generateMutationId } from './optimistic';

// Helper to generate optimistic budget ID
function generateOptimisticBudgetId(): string {
  return `optimistic-budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to generate optimistic allocation ID
function generateOptimisticAllocationId(): string {
  return `optimistic-allocation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface BudgetsState {
  // State
  budgets: Budget[];
  currentBudget: BudgetDetail | null;
  periods: BudgetPeriod[];
  allocations: BudgetAllocation[];
  isLoading: boolean;
  error: string | null;
  total: number;

  // Actions
  setBudgets: (budgets: Budget[]) => void;
  setCurrentBudget: (budget: BudgetDetail | null) => void;
  fetchBudgets: (accountId: string, params?: ListBudgetsParams) => Promise<void>;
  fetchBudget: (accountId: string, id: string) => Promise<Budget>;
  fetchBudgetDetail: (accountId: string, id: string) => Promise<BudgetDetail>;
  createBudget: (accountId: string, data: CreateBudgetRequest) => Promise<Budget | null>;
  updateBudget: (accountId: string, id: string, data: UpdateBudgetRequest) => Promise<Budget | null>;
  deleteBudget: (accountId: string, id: string) => Promise<boolean>;
  setDefaultBudget: (accountId: string, id: string) => Promise<Budget | null>;
  activateBudget: (accountId: string, id: string) => Promise<Budget | null>;
  deactivateBudget: (accountId: string, id: string) => Promise<Budget | null>;

  // Period actions
  fetchPeriods: (accountId: string, budgetId: string, params?: ListBudgetPeriodsParams) => Promise<void>;
  generatePeriods: (accountId: string, budgetId: string, count?: number) => Promise<BudgetPeriod[]>;

  // Allocation actions
  fetchAllocations: (accountId: string, budgetId: string) => Promise<void>;
  createAllocation: (accountId: string, budgetId: string, data: CreateBudgetAllocationRequest) => Promise<BudgetAllocation | null>;
  updateAllocation: (accountId: string, budgetId: string, id: string, data: UpdateBudgetAllocationRequest) => Promise<BudgetAllocation | null>;
  deleteAllocation: (accountId: string, budgetId: string, id: string) => Promise<boolean>;
}

export const useBudgetsStore = create<BudgetsState>()((set, get) => ({
  // Initial state
  budgets: [],
  currentBudget: null,
  periods: [],
  allocations: [],
  isLoading: false,
  error: null,
  total: 0,

  // Setter for budgets list
  setBudgets: (budgets) => {
    set({ budgets });
  },

  // Setter for current budget
  setCurrentBudget: (budget) => {
    set({ currentBudget: budget });
  },

  // Fetch all budgets from API
  fetchBudgets: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await budgetsApi.list(accountId, params);
      set({ budgets: response.budgets, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single budget by ID
  fetchBudget: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const budget = await budgetsApi.get(accountId, id);
      set({ isLoading: false });
      return budget;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Fetch budget detail with allocations and goals
  fetchBudgetDetail: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const budgetDetail = await budgetsApi.getDetail(accountId, id);
      set({ currentBudget: budgetDetail, allocations: budgetDetail.allocations, isLoading: false });
      return budgetDetail;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Create a new budget with optimistic update
  createBudget: async (accountId, data) => {
    const { budgets } = get();

    // Create optimistic budget
    const optimisticId = generateOptimisticBudgetId();
    const optimisticBudget: Budget = {
      id: optimisticId,
      account_id: accountId,
      name: data.name,
      description: data.description,
      period_type: data.period_type,
      total_amount: data.total_amount,
      currency: data.currency || 'USD',
      status: 'active',
      is_default: data.is_default ?? false,
      start_date: data.start_date,
      end_date: data.end_date,
      rollover_enabled: data.rollover_enabled ?? false,
      alert_threshold: data.alert_threshold,
      metadata: data.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      budgets: [...budgets, optimisticBudget],
      total: budgets.length + 1,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('budget-create'),
      type: 'budget:create',
      optimisticData: optimisticBudget,
      previousData: budgets,
      mutationFn: () => budgetsApi.create(accountId, data),
      onSuccess: (newBudget) => {
        // Replace optimistic budget with real one from server
        set((state) => ({
          budgets: state.budgets.filter((b) => b.id !== optimisticId).concat(newBudget),
        }));
      },
      onRollback: () => {
        // Restore previous state
        set({ budgets, total: budgets.length });
      },
      errorMessage: 'Failed to create budget',
    });

    return result;
  },

  // Update a budget with optimistic update
  updateBudget: async (accountId, id, data) => {
    const { budgets, currentBudget } = get();
    const existingBudget = budgets.find((b) => b.id === id);

    if (!existingBudget) {
      return null;
    }

    // Create optimistic updated budget
    const optimisticBudget: Budget = {
      ...existingBudget,
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      budgets: budgets.map((b) => (b.id === id ? optimisticBudget : b)),
      currentBudget:
        currentBudget?.id === id
          ? { ...currentBudget, ...optimisticBudget }
          : currentBudget,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('budget-update'),
      type: 'budget:update',
      optimisticData: optimisticBudget,
      previousData: existingBudget,
      mutationFn: () => budgetsApi.update(accountId, id, data),
      onSuccess: (updatedBudget) => {
        // Apply server response
        set((state) => ({
          budgets: state.budgets.map((b) => (b.id === id ? updatedBudget : b)),
          currentBudget:
            state.currentBudget?.id === id
              ? { ...state.currentBudget, ...updatedBudget }
              : state.currentBudget,
        }));
      },
      onRollback: () => {
        // Restore previous state
        set((state) => ({
          budgets: state.budgets.map((b) => (b.id === id ? existingBudget : b)),
          currentBudget:
            state.currentBudget?.id === id
              ? { ...state.currentBudget, ...existingBudget }
              : state.currentBudget,
        }));
      },
      errorMessage: 'Failed to update budget',
    });

    return result;
  },

  // Delete a budget with optimistic update
  deleteBudget: async (accountId, id) => {
    const { budgets, currentBudget } = get();
    const existingBudget = budgets.find((b) => b.id === id);

    if (!existingBudget) {
      return false;
    }

    // Apply optimistic delete immediately
    set({
      budgets: budgets.filter((b) => b.id !== id),
      currentBudget: currentBudget?.id === id ? null : currentBudget,
      total: budgets.length - 1,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('budget-delete'),
      type: 'budget:delete',
      optimisticData: null,
      previousData: { budgets, currentBudget },
      mutationFn: () => budgetsApi.delete(accountId, id),
      onRollback: () => {
        // Restore previous state
        set({
          budgets,
          currentBudget,
          total: budgets.length,
        });
      },
      errorMessage: 'Failed to delete budget',
    });

    return result !== null;
  },

  // Set as default budget with optimistic update
  setDefaultBudget: async (accountId, id) => {
    const { budgets, currentBudget } = get();
    const existingBudget = budgets.find((b) => b.id === id);

    if (!existingBudget) {
      return null;
    }

    // Store previous default states for rollback
    const previousBudgets = [...budgets];

    // Apply optimistic update immediately
    set({
      budgets: budgets.map((b) => ({
        ...b,
        is_default: b.id === id,
      })),
      currentBudget:
        currentBudget?.id === id
          ? { ...currentBudget, is_default: true }
          : currentBudget,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('budget-set-default'),
      type: 'budget:set-default',
      optimisticData: { ...existingBudget, is_default: true },
      previousData: previousBudgets,
      mutationFn: () => budgetsApi.setDefault(accountId, id),
      onRollback: () => {
        // Restore previous state
        set({
          budgets: previousBudgets,
          currentBudget:
            currentBudget?.id === id
              ? { ...currentBudget, is_default: existingBudget.is_default }
              : currentBudget,
        });
      },
      successMessage: 'Budget set as default',
      errorMessage: 'Failed to set default budget',
    });

    return result;
  },

  // Activate budget with optimistic update
  activateBudget: async (accountId, id) => {
    const { budgets, currentBudget } = get();
    const existingBudget = budgets.find((b) => b.id === id);

    if (!existingBudget) {
      return null;
    }

    // Apply optimistic update immediately
    set({
      budgets: budgets.map((b) => (b.id === id ? { ...b, status: 'active' as const } : b)),
      currentBudget:
        currentBudget?.id === id
          ? { ...currentBudget, status: 'active' as const }
          : currentBudget,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('budget-activate'),
      type: 'budget:activate',
      optimisticData: { ...existingBudget, status: 'active' as const },
      previousData: existingBudget,
      mutationFn: () => budgetsApi.activate(accountId, id),
      onRollback: () => {
        // Restore previous state
        set((state) => ({
          budgets: state.budgets.map((b) => (b.id === id ? existingBudget : b)),
          currentBudget:
            state.currentBudget?.id === id
              ? { ...state.currentBudget, status: existingBudget.status }
              : state.currentBudget,
        }));
      },
      successMessage: 'Budget activated',
      errorMessage: 'Failed to activate budget',
    });

    return result;
  },

  // Deactivate budget with optimistic update
  deactivateBudget: async (accountId, id) => {
    const { budgets, currentBudget } = get();
    const existingBudget = budgets.find((b) => b.id === id);

    if (!existingBudget) {
      return null;
    }

    // Apply optimistic update immediately
    set({
      budgets: budgets.map((b) => (b.id === id ? { ...b, status: 'inactive' as const } : b)),
      currentBudget:
        currentBudget?.id === id
          ? { ...currentBudget, status: 'inactive' as const }
          : currentBudget,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('budget-deactivate'),
      type: 'budget:deactivate',
      optimisticData: { ...existingBudget, status: 'inactive' as const },
      previousData: existingBudget,
      mutationFn: () => budgetsApi.deactivate(accountId, id),
      onRollback: () => {
        // Restore previous state
        set((state) => ({
          budgets: state.budgets.map((b) => (b.id === id ? existingBudget : b)),
          currentBudget:
            state.currentBudget?.id === id
              ? { ...state.currentBudget, status: existingBudget.status }
              : state.currentBudget,
        }));
      },
      successMessage: 'Budget deactivated',
      errorMessage: 'Failed to deactivate budget',
    });

    return result;
  },

  // Fetch budget periods
  fetchPeriods: async (accountId, budgetId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await budgetPeriodsApi.list(accountId, budgetId, params);
      set({ periods: response.periods, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Generate budget periods
  generatePeriods: async (accountId, budgetId, count) => {
    set({ isLoading: true, error: null });
    try {
      const newPeriods = await budgetPeriodsApi.generate(accountId, budgetId, { count });
      set((state) => ({
        periods: [...state.periods, ...newPeriods],
        isLoading: false,
      }));
      return newPeriods;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Fetch allocations
  fetchAllocations: async (accountId, budgetId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await budgetAllocationsApi.list(accountId, budgetId);
      set({ allocations: response.allocations, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Create allocation with optimistic update
  createAllocation: async (accountId, budgetId, data) => {
    const { allocations } = get();

    // Create optimistic allocation
    const optimisticId = generateOptimisticAllocationId();
    const optimisticAllocation: BudgetAllocation = {
      id: optimisticId,
      budget_id: budgetId,
      category_id: data.category_id,
      store_id: data.store_id,
      name: data.name,
      description: data.description,
      amount: data.amount ?? 0,
      percentage: data.percentage,
      is_percentage: data.is_percentage ?? false,
      metadata: data.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      allocations: [...allocations, optimisticAllocation],
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('allocation-create'),
      type: 'allocation:create',
      optimisticData: optimisticAllocation,
      previousData: allocations,
      mutationFn: () => budgetAllocationsApi.create(accountId, budgetId, data),
      onSuccess: (newAllocation) => {
        // Replace optimistic allocation with real one from server
        set((state) => ({
          allocations: state.allocations.filter((a) => a.id !== optimisticId).concat(newAllocation),
        }));
      },
      onRollback: () => {
        // Restore previous state
        set({ allocations });
      },
      errorMessage: 'Failed to create allocation',
    });

    return result;
  },

  // Update allocation with optimistic update
  updateAllocation: async (accountId, budgetId, id, data) => {
    const { allocations } = get();
    const existingAllocation = allocations.find((a) => a.id === id);

    if (!existingAllocation) {
      return null;
    }

    // Create optimistic updated allocation
    const optimisticAllocation: BudgetAllocation = {
      ...existingAllocation,
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      allocations: allocations.map((a) => (a.id === id ? optimisticAllocation : a)),
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('allocation-update'),
      type: 'allocation:update',
      optimisticData: optimisticAllocation,
      previousData: existingAllocation,
      mutationFn: () => budgetAllocationsApi.update(accountId, budgetId, id, data),
      onSuccess: (updatedAllocation) => {
        // Apply server response
        set((state) => ({
          allocations: state.allocations.map((a) => (a.id === id ? updatedAllocation : a)),
        }));
      },
      onRollback: () => {
        // Restore previous state
        set((state) => ({
          allocations: state.allocations.map((a) => (a.id === id ? existingAllocation : a)),
        }));
      },
      errorMessage: 'Failed to update allocation',
    });

    return result;
  },

  // Delete allocation with optimistic update
  deleteAllocation: async (accountId, budgetId, id) => {
    const { allocations } = get();
    const existingAllocation = allocations.find((a) => a.id === id);

    if (!existingAllocation) {
      return false;
    }

    // Apply optimistic delete immediately
    set({
      allocations: allocations.filter((a) => a.id !== id),
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('allocation-delete'),
      type: 'allocation:delete',
      optimisticData: null,
      previousData: allocations,
      mutationFn: () => budgetAllocationsApi.delete(accountId, budgetId, id),
      onRollback: () => {
        // Restore previous state
        set({ allocations });
      },
      errorMessage: 'Failed to delete allocation',
    });

    return result !== null;
  },
}));

// Re-export types for convenience
export type {
  Budget,
  BudgetDetail,
  BudgetPeriod,
  BudgetAllocation,
  CreateBudgetRequest,
  UpdateBudgetRequest,
  ListBudgetsParams,
  CreateBudgetAllocationRequest,
  UpdateBudgetAllocationRequest,
};
export type { BudgetStatus, BudgetPeriodType, BudgetPeriodStatus } from '../api/client';
