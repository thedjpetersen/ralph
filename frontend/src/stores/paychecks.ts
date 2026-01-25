import { create } from 'zustand';
import {
  paychecksApi,
  paycheckEarningsApi,
  paycheckDeductionsApi,
  employersApi,
  type Paycheck,
  type PaycheckDetail,
  type PaycheckEarning,
  type PaycheckDeduction,
  type Employer,
  type CreatePaycheckRequest,
  type UpdatePaycheckRequest,
  type ListPaychecksParams,
  type AddEarningRequest,
  type UpdateEarningRequest,
  type AddDeductionRequest,
  type UpdateDeductionRequest,
  type CreateEmployerRequest,
  type UpdateEmployerRequest,
  type ListEmployersParams,
} from '../api/client';

interface PaychecksState {
  // Paychecks state
  paychecks: Paycheck[];
  currentPaycheck: PaycheckDetail | null;
  isLoading: boolean;
  error: string | null;
  total: number;

  // Employers state
  employers: Employer[];
  currentEmployer: Employer | null;
  employersTotal: number;

  // Paycheck actions
  setPaychecks: (paychecks: Paycheck[]) => void;
  setCurrentPaycheck: (paycheck: PaycheckDetail | null) => void;
  fetchPaychecks: (accountId: string, params?: ListPaychecksParams) => Promise<void>;
  fetchPaycheck: (accountId: string, id: string) => Promise<Paycheck>;
  fetchPaycheckDetails: (accountId: string, id: string) => Promise<PaycheckDetail>;
  createPaycheck: (accountId: string, data: CreatePaycheckRequest) => Promise<Paycheck>;
  updatePaycheck: (accountId: string, id: string, data: UpdatePaycheckRequest) => Promise<Paycheck>;
  deletePaycheck: (accountId: string, id: string) => Promise<void>;
  markPaycheckReviewed: (accountId: string, id: string) => Promise<Paycheck>;
  fetchPaychecksNeedingReview: (accountId: string, params?: { limit?: number; offset?: number }) => Promise<void>;

  // Earnings actions
  addEarning: (accountId: string, paycheckId: string, data: AddEarningRequest) => Promise<PaycheckEarning>;
  updateEarning: (accountId: string, paycheckId: string, id: string, data: UpdateEarningRequest) => Promise<PaycheckEarning>;
  deleteEarning: (accountId: string, paycheckId: string, id: string) => Promise<void>;

  // Deductions actions
  addDeduction: (accountId: string, paycheckId: string, data: AddDeductionRequest) => Promise<PaycheckDeduction>;
  updateDeduction: (accountId: string, paycheckId: string, id: string, data: UpdateDeductionRequest) => Promise<PaycheckDeduction>;
  deleteDeduction: (accountId: string, paycheckId: string, id: string) => Promise<void>;

  // Employer actions
  setEmployers: (employers: Employer[]) => void;
  setCurrentEmployer: (employer: Employer | null) => void;
  fetchEmployers: (accountId: string, params?: ListEmployersParams) => Promise<void>;
  fetchEmployer: (accountId: string, id: string) => Promise<Employer>;
  createEmployer: (accountId: string, data: CreateEmployerRequest) => Promise<Employer>;
  updateEmployer: (accountId: string, id: string, data: UpdateEmployerRequest) => Promise<Employer>;
  deleteEmployer: (accountId: string, id: string) => Promise<void>;
}

export const usePaychecksStore = create<PaychecksState>()((set) => ({
  // Initial state
  paychecks: [],
  currentPaycheck: null,
  isLoading: false,
  error: null,
  total: 0,
  employers: [],
  currentEmployer: null,
  employersTotal: 0,

  // Paycheck setters
  setPaychecks: (paychecks) => set({ paychecks }),
  setCurrentPaycheck: (paycheck) => set({ currentPaycheck: paycheck }),

  // Fetch all paychecks
  fetchPaychecks: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await paychecksApi.list(accountId, params);
      set({ paychecks: response.paychecks, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single paycheck
  fetchPaycheck: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const paycheck = await paychecksApi.get(accountId, id);
      set({ isLoading: false });
      return paycheck;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Fetch paycheck with details (earnings and deductions)
  fetchPaycheckDetails: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const paycheck = await paychecksApi.getDetails(accountId, id);
      set({ currentPaycheck: paycheck, isLoading: false });
      return paycheck;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Create a new paycheck
  createPaycheck: async (accountId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newPaycheck = await paychecksApi.create(accountId, data);
      set((state) => ({
        paychecks: [...state.paychecks, newPaycheck],
        total: state.total + 1,
        isLoading: false,
      }));
      return newPaycheck;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a paycheck
  updatePaycheck: async (accountId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedPaycheck = await paychecksApi.update(accountId, id, data);
      set((state) => ({
        paychecks: state.paychecks.map((p) => (p.id === id ? updatedPaycheck : p)),
        currentPaycheck:
          state.currentPaycheck?.id === id
            ? { ...state.currentPaycheck, ...updatedPaycheck }
            : state.currentPaycheck,
        isLoading: false,
      }));
      return updatedPaycheck;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a paycheck
  deletePaycheck: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      await paychecksApi.delete(accountId, id);
      set((state) => ({
        paychecks: state.paychecks.filter((p) => p.id !== id),
        currentPaycheck: state.currentPaycheck?.id === id ? null : state.currentPaycheck,
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

  // Mark paycheck as reviewed
  markPaycheckReviewed: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const updatedPaycheck = await paychecksApi.markReviewed(accountId, id);
      set((state) => ({
        paychecks: state.paychecks.map((p) => (p.id === id ? updatedPaycheck : p)),
        currentPaycheck:
          state.currentPaycheck?.id === id
            ? { ...state.currentPaycheck, ...updatedPaycheck }
            : state.currentPaycheck,
        isLoading: false,
      }));
      return updatedPaycheck;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Fetch paychecks needing review
  fetchPaychecksNeedingReview: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await paychecksApi.listNeedingReview(accountId, params);
      set({ paychecks: response.paychecks, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Earnings actions
  addEarning: async (accountId, paycheckId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newEarning = await paycheckEarningsApi.add(accountId, paycheckId, data);
      set((state) => ({
        currentPaycheck: state.currentPaycheck?.id === paycheckId
          ? {
              ...state.currentPaycheck,
              earnings: [...state.currentPaycheck.earnings, newEarning],
            }
          : state.currentPaycheck,
        isLoading: false,
      }));
      return newEarning;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  updateEarning: async (accountId, paycheckId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedEarning = await paycheckEarningsApi.update(accountId, paycheckId, id, data);
      set((state) => ({
        currentPaycheck: state.currentPaycheck?.id === paycheckId
          ? {
              ...state.currentPaycheck,
              earnings: state.currentPaycheck.earnings.map((e) =>
                e.id === id ? updatedEarning : e
              ),
            }
          : state.currentPaycheck,
        isLoading: false,
      }));
      return updatedEarning;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  deleteEarning: async (accountId, paycheckId, id) => {
    set({ isLoading: true, error: null });
    try {
      await paycheckEarningsApi.delete(accountId, paycheckId, id);
      set((state) => ({
        currentPaycheck: state.currentPaycheck?.id === paycheckId
          ? {
              ...state.currentPaycheck,
              earnings: state.currentPaycheck.earnings.filter((e) => e.id !== id),
            }
          : state.currentPaycheck,
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

  // Deductions actions
  addDeduction: async (accountId, paycheckId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newDeduction = await paycheckDeductionsApi.add(accountId, paycheckId, data);
      set((state) => ({
        currentPaycheck: state.currentPaycheck?.id === paycheckId
          ? {
              ...state.currentPaycheck,
              deductions: [...state.currentPaycheck.deductions, newDeduction],
            }
          : state.currentPaycheck,
        isLoading: false,
      }));
      return newDeduction;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  updateDeduction: async (accountId, paycheckId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedDeduction = await paycheckDeductionsApi.update(accountId, paycheckId, id, data);
      set((state) => ({
        currentPaycheck: state.currentPaycheck?.id === paycheckId
          ? {
              ...state.currentPaycheck,
              deductions: state.currentPaycheck.deductions.map((d) =>
                d.id === id ? updatedDeduction : d
              ),
            }
          : state.currentPaycheck,
        isLoading: false,
      }));
      return updatedDeduction;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  deleteDeduction: async (accountId, paycheckId, id) => {
    set({ isLoading: true, error: null });
    try {
      await paycheckDeductionsApi.delete(accountId, paycheckId, id);
      set((state) => ({
        currentPaycheck: state.currentPaycheck?.id === paycheckId
          ? {
              ...state.currentPaycheck,
              deductions: state.currentPaycheck.deductions.filter((d) => d.id !== id),
            }
          : state.currentPaycheck,
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

  // Employer setters
  setEmployers: (employers) => set({ employers }),
  setCurrentEmployer: (employer) => set({ currentEmployer: employer }),

  // Fetch all employers
  fetchEmployers: async (accountId, params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await employersApi.list(accountId, params);
      set({ employers: response.employers, employersTotal: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single employer
  fetchEmployer: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      const employer = await employersApi.get(accountId, id);
      set({ currentEmployer: employer, isLoading: false });
      return employer;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Create a new employer
  createEmployer: async (accountId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newEmployer = await employersApi.create(accountId, data);
      set((state) => ({
        employers: [...state.employers, newEmployer],
        employersTotal: state.employersTotal + 1,
        isLoading: false,
      }));
      return newEmployer;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update an employer
  updateEmployer: async (accountId, id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedEmployer = await employersApi.update(accountId, id, data);
      set((state) => ({
        employers: state.employers.map((e) => (e.id === id ? updatedEmployer : e)),
        currentEmployer:
          state.currentEmployer?.id === id ? updatedEmployer : state.currentEmployer,
        isLoading: false,
      }));
      return updatedEmployer;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete an employer
  deleteEmployer: async (accountId, id) => {
    set({ isLoading: true, error: null });
    try {
      await employersApi.delete(accountId, id);
      set((state) => ({
        employers: state.employers.filter((e) => e.id !== id),
        currentEmployer: state.currentEmployer?.id === id ? null : state.currentEmployer,
        employersTotal: state.employersTotal - 1,
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
  Paycheck,
  PaycheckDetail,
  PaycheckEarning,
  PaycheckDeduction,
  Employer,
  CreatePaycheckRequest,
  UpdatePaycheckRequest,
  ListPaychecksParams,
  AddEarningRequest,
  UpdateEarningRequest,
  AddDeductionRequest,
  UpdateDeductionRequest,
  CreateEmployerRequest,
  UpdateEmployerRequest,
  ListEmployersParams,
};
export type { PaycheckStatus, PayFrequency, EmployerStatus } from '../api/client';
