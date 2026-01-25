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
  createBudget: (accountId: string, data: CreateBudgetRequest) => Promise<Budget>;
  updateBudget: (accountId: string, id: string, data: UpdateBudgetRequest) => Promise<Budget>;
  deleteBudget: (accountId: string, id: string) => Promise<void>;
  setDefaultBudget: (accountId: string, id: string) => Promise<Budget>;
  activateBudget: (accountId: string, id: string) => Promise<Budget>;
  deactivateBudget: (accountId: string, id: string) => Promise<Budget>;

  // Period actions
  fetchPeriods: (accountId: string, budgetId: string, params?: ListBudgetPeriodsParams) => Promise<void>;
  generatePeriods: (accountId: string, budgetId: string, count?: number) => Promise<BudgetPeriod[]>;

  // Allocation actions
  fetchAllocations: (accountId: string, budgetId: string) => Promise<void>;
  createAllocation: (accountId: string, budgetId: string, data: CreateBudgetAllocationRequest) => Promise<BudgetAllocation>;
  updateAllocation: (accountId: string, budgetId: string, id: string, data: UpdateBudgetAllocationRequest) => Promise<BudgetAllocation>;
  deleteAllocation: (accountId: string, budgetId: string, id: string) => Promise<void>;
}

export const useBudgetsStore = create<BudgetsState>()((set) => ({
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

  // Create a new budget
  createBudget: async (accountId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newBudget = await budgetsApi.create(accountId, data);
      set((state) => ({
        budgets: [...state.budgets, newBudget],
        total: state.total + 1,
        isLoading: false,
      }));
      return newBudget;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a budget
  updateBudget: async (accountId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedBudget = await budgetsApi.update(accountId, id, data);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === id ? updatedBudget : b)),
        currentBudget:
          state.currentBudget?.id === id
            ? { ...state.currentBudget, ...updatedBudget }
            : state.currentBudget,
        isLoading: false,
      }));
      return updatedBudget;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a budget
  deleteBudget: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      await budgetsApi.delete(accountId, id);
      set((state) => ({
        budgets: state.budgets.filter((b) => b.id !== id),
        currentBudget: state.currentBudget?.id === id ? null : state.currentBudget,
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

  // Set as default budget
  setDefaultBudget: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const updatedBudget = await budgetsApi.setDefault(accountId, id);
      set((state) => ({
        budgets: state.budgets.map((b) => ({
          ...b,
          is_default: b.id === id,
        })),
        currentBudget:
          state.currentBudget?.id === id
            ? { ...state.currentBudget, is_default: true }
            : state.currentBudget,
        isLoading: false,
      }));
      return updatedBudget;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Activate budget
  activateBudget: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const updatedBudget = await budgetsApi.activate(accountId, id);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === id ? { ...b, status: 'active' as const } : b)),
        currentBudget:
          state.currentBudget?.id === id
            ? { ...state.currentBudget, status: 'active' as const }
            : state.currentBudget,
        isLoading: false,
      }));
      return updatedBudget;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Deactivate budget
  deactivateBudget: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const updatedBudget = await budgetsApi.deactivate(accountId, id);
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === id ? { ...b, status: 'inactive' as const } : b)),
        currentBudget:
          state.currentBudget?.id === id
            ? { ...state.currentBudget, status: 'inactive' as const }
            : state.currentBudget,
        isLoading: false,
      }));
      return updatedBudget;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
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

  // Create allocation
  createAllocation: async (accountId, budgetId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newAllocation = await budgetAllocationsApi.create(accountId, budgetId, data);
      set((state) => ({
        allocations: [...state.allocations, newAllocation],
        isLoading: false,
      }));
      return newAllocation;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update allocation
  updateAllocation: async (accountId, budgetId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAllocation = await budgetAllocationsApi.update(accountId, budgetId, id, data);
      set((state) => ({
        allocations: state.allocations.map((a) => (a.id === id ? updatedAllocation : a)),
        isLoading: false,
      }));
      return updatedAllocation;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete allocation
  deleteAllocation: async (accountId, budgetId, id) => {
    set({ isLoading: true, error: null });
    try {
      await budgetAllocationsApi.delete(accountId, budgetId, id);
      set((state) => ({
        allocations: state.allocations.filter((a) => a.id !== id),
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
