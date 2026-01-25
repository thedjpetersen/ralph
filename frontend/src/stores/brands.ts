import { create } from 'zustand';
import {
  brandsApi,
  type Brand,
  type CreateBrandRequest,
  type UpdateBrandRequest,
  type ListBrandsParams,
} from '../api/client';

interface BrandsState {
  // State
  brands: Brand[];
  currentBrand: Brand | null;
  isLoading: boolean;
  error: string | null;
  total: number;

  // Actions
  setBrands: (brands: Brand[]) => void;
  setCurrentBrand: (brand: Brand | null) => void;
  fetchBrands: (params?: ListBrandsParams) => Promise<void>;
  fetchBrand: (id: string) => Promise<Brand>;
  createBrand: (data: CreateBrandRequest) => Promise<Brand>;
  updateBrand: (id: string, data: UpdateBrandRequest) => Promise<Brand>;
  deleteBrand: (id: string) => Promise<void>;
}

export const useBrandsStore = create<BrandsState>()((set) => ({
  // Initial state
  brands: [],
  currentBrand: null,
  isLoading: false,
  error: null,
  total: 0,

  // Setter for brands list
  setBrands: (brands) => {
    set({ brands });
  },

  // Setter for current brand
  setCurrentBrand: (brand) => {
    set({ currentBrand: brand });
  },

  // Fetch all brands from API
  fetchBrands: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await brandsApi.list(params);
      set({ brands: response.brands, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single brand by ID
  fetchBrand: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const brand = await brandsApi.get(id);
      set({ currentBrand: brand, isLoading: false });
      return brand;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Create a new brand
  createBrand: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newBrand = await brandsApi.create(data);
      set((state) => ({
        brands: [...state.brands, newBrand],
        total: state.total + 1,
        isLoading: false,
      }));
      return newBrand;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a brand
  updateBrand: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedBrand = await brandsApi.update(id, data);
      set((state) => ({
        brands: state.brands.map((b) => (b.id === id ? updatedBrand : b)),
        currentBrand:
          state.currentBrand?.id === id ? updatedBrand : state.currentBrand,
        isLoading: false,
      }));
      return updatedBrand;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a brand
  deleteBrand: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await brandsApi.delete(id);
      set((state) => ({
        brands: state.brands.filter((b) => b.id !== id),
        currentBrand: state.currentBrand?.id === id ? null : state.currentBrand,
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
}));

// Re-export types for convenience
export type { Brand, CreateBrandRequest, UpdateBrandRequest };
export type { BrandStatus, ListBrandsParams } from '../api/client';
