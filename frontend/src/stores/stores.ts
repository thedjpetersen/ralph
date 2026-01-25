import { create } from 'zustand';
import {
  storesApi,
  type Store,
  type CreateStoreRequest,
  type UpdateStoreRequest,
  type ListStoresParams,
  type StoreSearchRequest,
} from '../api/client';

interface StoresState {
  // State
  stores: Store[];
  currentStore: Store | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  // Actions
  setStores: (stores: Store[]) => void;
  setCurrentStore: (store: Store | null) => void;
  setSearchQuery: (query: string) => void;
  fetchStores: (params?: ListStoresParams) => Promise<void>;
  fetchStore: (id: string) => Promise<Store>;
  createStore: (data: CreateStoreRequest) => Promise<Store>;
  updateStore: (id: string, data: UpdateStoreRequest) => Promise<Store>;
  deleteStore: (id: string) => Promise<void>;
  searchStores: (params: StoreSearchRequest) => Promise<void>;
  matchStores: (query: string) => Promise<Store[]>;
}

export const useStoresStore = create<StoresState>()((set) => ({
  // Initial state
  stores: [],
  currentStore: null,
  isLoading: false,
  error: null,
  searchQuery: '',

  // Setter for stores list
  setStores: (stores) => {
    set({ stores });
  },

  // Setter for current store
  setCurrentStore: (store) => {
    set({ currentStore: store });
  },

  // Setter for search query
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  // Fetch all stores from API
  fetchStores: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await storesApi.list(params);
      set({ stores: response.stores, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single store by ID
  fetchStore: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const store = await storesApi.get(id);
      set({ currentStore: store, isLoading: false });
      return store;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Create a new store
  createStore: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newStore = await storesApi.create(data);
      set((state) => ({
        stores: [...state.stores, newStore],
        isLoading: false,
      }));
      return newStore;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a store
  updateStore: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedStore = await storesApi.update(id, data);
      set((state) => ({
        stores: state.stores.map((s) => (s.id === id ? updatedStore : s)),
        currentStore:
          state.currentStore?.id === id ? updatedStore : state.currentStore,
        isLoading: false,
      }));
      return updatedStore;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a store
  deleteStore: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await storesApi.delete(id);
      set((state) => ({
        stores: state.stores.filter((s) => s.id !== id),
        currentStore: state.currentStore?.id === id ? null : state.currentStore,
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

  // Search stores
  searchStores: async (params) => {
    set({ isLoading: true, error: null, searchQuery: params.query });
    try {
      const response = await storesApi.search(params);
      set({ stores: response.stores, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Match stores (for autocomplete)
  matchStores: async (query) => {
    try {
      const response = await storesApi.match(query);
      return response.stores;
    } catch {
      // Don't set error state for match - it's used for autocomplete
      return [];
    }
  },
}));

// Re-export types for convenience
export type { Store, CreateStoreRequest, UpdateStoreRequest, StoreSearchRequest };
export type { StoreStatus, StoreType, StoreAddress, ListStoresParams } from '../api/client';
