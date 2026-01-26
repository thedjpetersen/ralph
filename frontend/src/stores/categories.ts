import { create } from 'zustand';
import {
  categoriesApi,
  type Category,
  type CreateCategoryRequest,
  type UpdateCategoryRequest,
  type ListCategoriesParams,
} from '../api/client';
import { executeOptimisticMutation, generateMutationId } from './optimistic';

// Helper to generate optimistic category ID
function generateOptimisticCategoryId(): string {
  return `optimistic-category-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

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
  createCategory: (data: CreateCategoryRequest) => Promise<Category | null>;
  updateCategory: (id: string, data: UpdateCategoryRequest) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<boolean>;
}

export const useCategoriesStore = create<CategoriesState>()((set, get) => ({
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

  // Create a new category with optimistic update
  createCategory: async (data) => {
    const { categories } = get();

    // Create optimistic category
    const optimisticId = generateOptimisticCategoryId();
    const normalizedName = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const optimisticCategory: Category = {
      id: optimisticId,
      name: data.name,
      normalized_name: normalizedName,
      display_name: data.display_name,
      description: data.description,
      parent_id: data.parent_id,
      level: data.parent_id ? 1 : 0,
      path: `/${normalizedName}`,
      status: 'active',
      product_count: 0,
      metadata: data.metadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      categories: [...categories, optimisticCategory],
      total: categories.length + 1,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('category-create'),
      type: 'category:create',
      optimisticData: optimisticCategory,
      previousData: categories,
      mutationFn: () => categoriesApi.create(data),
      onSuccess: (newCategory) => {
        // Replace optimistic category with real one from server
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== optimisticId).concat(newCategory),
        }));
      },
      onRollback: () => {
        // Restore previous state
        set({ categories, total: categories.length });
      },
      errorMessage: 'Failed to create category',
    });

    return result;
  },

  // Update a category with optimistic update
  updateCategory: async (id, data) => {
    const { categories, currentCategory } = get();
    const existingCategory = categories.find((c) => c.id === id);

    if (!existingCategory) {
      return null;
    }

    // Create optimistic updated category
    const optimisticCategory: Category = {
      ...existingCategory,
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    set({
      categories: categories.map((c) => (c.id === id ? optimisticCategory : c)),
      currentCategory: currentCategory?.id === id ? optimisticCategory : currentCategory,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('category-update'),
      type: 'category:update',
      optimisticData: optimisticCategory,
      previousData: existingCategory,
      mutationFn: () => categoriesApi.update(id, data),
      onSuccess: (updatedCategory) => {
        // Apply server response
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? updatedCategory : c)),
          currentCategory:
            state.currentCategory?.id === id ? updatedCategory : state.currentCategory,
        }));
      },
      onRollback: () => {
        // Restore previous state
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? existingCategory : c)),
          currentCategory:
            state.currentCategory?.id === id ? existingCategory : state.currentCategory,
        }));
      },
      errorMessage: 'Failed to update category',
    });

    return result;
  },

  // Delete a category with optimistic update
  deleteCategory: async (id) => {
    const { categories, currentCategory } = get();
    const existingCategory = categories.find((c) => c.id === id);

    if (!existingCategory) {
      return false;
    }

    // Apply optimistic delete immediately
    set({
      categories: categories.filter((c) => c.id !== id),
      currentCategory: currentCategory?.id === id ? null : currentCategory,
      total: categories.length - 1,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('category-delete'),
      type: 'category:delete',
      optimisticData: null,
      previousData: { categories, currentCategory },
      mutationFn: () => categoriesApi.delete(id),
      onRollback: () => {
        // Restore previous state
        set({
          categories,
          currentCategory,
          total: categories.length,
        });
      },
      errorMessage: 'Failed to delete category',
    });

    return result !== null;
  },
}));

// Re-export types for convenience
export type { Category, CreateCategoryRequest, UpdateCategoryRequest };
export type { CategoryStatus, ListCategoriesParams } from '../api/client';
