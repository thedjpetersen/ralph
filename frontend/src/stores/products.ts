import { create } from 'zustand';
import {
  productsApi,
  type Product,
  type CreateProductRequest,
  type UpdateProductRequest,
  type ListProductsParams,
  type ProductSearchRequest,
} from '../api/client';

interface ProductsState {
  // State
  products: Product[];
  currentProduct: Product | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  total: number;

  // Actions
  setProducts: (products: Product[]) => void;
  setCurrentProduct: (product: Product | null) => void;
  setSearchQuery: (query: string) => void;
  fetchProducts: (params?: ListProductsParams) => Promise<void>;
  fetchProduct: (id: string) => Promise<Product>;
  fetchProductByUPC: (upc: string) => Promise<Product>;
  createProduct: (data: CreateProductRequest) => Promise<Product>;
  updateProduct: (id: string, data: UpdateProductRequest) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  searchProducts: (params: ProductSearchRequest) => Promise<void>;
}

export const useProductsStore = create<ProductsState>()((set) => ({
  // Initial state
  products: [],
  currentProduct: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  total: 0,

  // Setter for products list
  setProducts: (products) => {
    set({ products });
  },

  // Setter for current product
  setCurrentProduct: (product) => {
    set({ currentProduct: product });
  },

  // Setter for search query
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  // Fetch all products from API
  fetchProducts: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const response = await productsApi.list(params);
      set({ products: response.products, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Fetch a single product by ID
  fetchProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const product = await productsApi.get(id);
      set({ currentProduct: product, isLoading: false });
      return product;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Fetch a product by UPC
  fetchProductByUPC: async (upc) => {
    set({ isLoading: true, error: null });
    try {
      const product = await productsApi.getByUPC(upc);
      set({ currentProduct: product, isLoading: false });
      return product;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Create a new product
  createProduct: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newProduct = await productsApi.create(data);
      set((state) => ({
        products: [...state.products, newProduct],
        total: state.total + 1,
        isLoading: false,
      }));
      return newProduct;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a product
  updateProduct: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedProduct = await productsApi.update(id, data);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
        currentProduct:
          state.currentProduct?.id === id ? updatedProduct : state.currentProduct,
        isLoading: false,
      }));
      return updatedProduct;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a product
  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await productsApi.delete(id);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        currentProduct: state.currentProduct?.id === id ? null : state.currentProduct,
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

  // Search products
  searchProducts: async (params) => {
    set({ isLoading: true, error: null, searchQuery: params.query });
    try {
      const response = await productsApi.search(params);
      set({ products: response.products, total: response.total, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },
}));

// Re-export types for convenience
export type { Product, CreateProductRequest, UpdateProductRequest, ProductSearchRequest };
export type { ProductStatus, NutritionInfo, ListProductsParams } from '../api/client';
