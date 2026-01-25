import { create } from 'zustand';
import {
  categoriesApi,
  type Category,
  type CreateCategoryRequest,
  type UpdateCategoryRequest,
  type ListCategoriesParams,
} from '../api/client';

interface CategoriesState {
  // State
  categories: Category[];
  currentCategory: Category | null;
  isLoading: boolean;
  error: string | null;
  total: number;

  // Actions
  setCategories: (categories: Category[]) => void;
  setCurrentCategory: (category: Category | null) => void;
  fetchCategories: (params?: ListCategoriesParams) => Promise<void>;
  fetchCategory: (id: string) => Promise<Category>;
  createCategory: (data: CreateCategoryRequest) => Promise<Category>;
  updateCategory: (id: string, data: UpdateCategoryRequest) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
}

export const useCategoriesStore = create<CategoriesState>()((set) => ({
  // Initial state
  categories: [],
  currentCategory: null,
  isLoading: false,
  error: null,
  total: 0,

  // Setter for categories list
  setCategories: (categories) => {
    set({ categories });
  },

  // Setter for current category
  setCurrentCategory: (category) => {
    set({ currentCategory: category });
  },

  // Fetch all categories from API
  fetchCategories: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await categoriesApi.list(params);
      set({ categories: response.categories, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single category by ID
  fetchCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const category = await categoriesApi.get(id);
      set({ currentCategory: category, isLoading: false });
      return category;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Create a new category
  createCategory: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newCategory = await categoriesApi.create(data);
      set((state) => ({
        categories: [...state.categories, newCategory],
        total: state.total + 1,
        isLoading: false,
      }));
      return newCategory;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a category
  updateCategory: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedCategory = await categoriesApi.update(id, data);
      set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? updatedCategory : c)),
        currentCategory:
          state.currentCategory?.id === id ? updatedCategory : state.currentCategory,
        isLoading: false,
      }));
      return updatedCategory;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a category
  deleteCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await categoriesApi.delete(id);
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
        currentCategory: state.currentCategory?.id === id ? null : state.currentCategory,
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
export type { Category, CreateCategoryRequest, UpdateCategoryRequest };
export type { CategoryStatus, ListCategoriesParams } from '../api/client';
