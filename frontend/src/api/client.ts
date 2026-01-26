const API_BASE = '/api';

// Store types
export type StoreStatus = 'active' | 'inactive' | 'pending' | 'rejected';
export type StoreType = 'retail' | 'online' | 'restaurant' | 'grocery' | 'gas' | 'service' | 'other';

export interface StoreAddress {
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface Store {
  id: string;
  name: string;
  normalized_name: string;
  display_name?: string;
  type: StoreType;
  status: StoreStatus;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: StoreAddress;
  logo?: string;
  category_id?: string;
  tags?: string[];
  aliases?: string[];
  metadata?: Record<string, string>;
  receipt_patterns?: string[];
  match_count: number;
  merge_count: number;
  transaction_count?: number;
  total_spent?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ListStoresResponse {
  stores: Store[];
  total: number;
}

export interface CreateStoreRequest {
  name: string;
  display_name?: string;
  type: StoreType;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: StoreAddress;
  logo?: string;
  category_id?: string;
  tags?: string[];
  aliases?: string[];
  metadata?: Record<string, string>;
  receipt_patterns?: string[];
}

export interface UpdateStoreRequest {
  name?: string;
  display_name?: string;
  type?: StoreType;
  status?: StoreStatus;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: StoreAddress;
  logo?: string;
  category_id?: string;
  tags?: string[];
  aliases?: string[];
  metadata?: Record<string, string>;
  receipt_patterns?: string[];
}

export interface StoreSearchRequest {
  query: string;
  type?: StoreType;
  category_id?: string;
  status?: StoreStatus;
  limit?: number;
}

export interface ListStoresParams {
  status?: StoreStatus;
  type?: StoreType;
  category_id?: string;
}

// Store API methods
export const storesApi = {
  async list(params?: ListStoresParams): Promise<ListStoresResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.category_id) searchParams.set('category_id', params.category_id);

    const query = searchParams.toString();
    const url = `${API_BASE}/admin/stores${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch stores');
    }
    return response.json();
  },

  async get(id: string): Promise<Store> {
    const response = await fetch(`${API_BASE}/admin/stores/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch store');
    }
    return response.json();
  },

  async create(data: CreateStoreRequest): Promise<Store> {
    const response = await fetch(`${API_BASE}/admin/stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create store');
    }
    return response.json();
  },

  async update(id: string, data: UpdateStoreRequest): Promise<Store> {
    const response = await fetch(`${API_BASE}/admin/stores/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update store');
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/admin/stores/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete store');
    }
  },

  async search(params: StoreSearchRequest): Promise<ListStoresResponse> {
    const response = await fetch(`${API_BASE}/admin/stores/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error('Failed to search stores');
    }
    return response.json();
  },

  async match(query: string): Promise<ListStoresResponse> {
    return this.search({ query, limit: 10 });
  },
};

// Product types
export type ProductStatus = 'active' | 'inactive' | 'discontinued';

export interface NutritionInfo {
  serving_size?: string;
  servings_per_container?: number;
  calories?: number;
  total_fat?: number;
  saturated_fat?: number;
  trans_fat?: number;
  cholesterol?: number;
  sodium?: number;
  total_carbohydrates?: number;
  dietary_fiber?: number;
  sugars?: number;
  protein?: number;
  vitamin_a?: number;
  vitamin_c?: number;
  calcium?: number;
  iron?: number;
}

export interface Product {
  id: string;
  name: string;
  normalized_name: string;
  display_name?: string;
  description?: string;
  brand_id?: string;
  brand_name?: string;
  category_id?: string;
  category_name?: string;
  upc?: string;
  sku?: string;
  status: ProductStatus;
  price?: number;
  unit?: string;
  unit_quantity?: number;
  image_url?: string;
  nutrition?: NutritionInfo;
  ingredients?: string;
  allergens?: string[];
  tags?: string[];
  metadata?: Record<string, string>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ListProductsResponse {
  products: Product[];
  total: number;
}

export interface ListProductsParams {
  status?: ProductStatus;
  brand_id?: string;
  category_id?: string;
  limit?: number;
  offset?: number;
}

export interface CreateProductRequest {
  name: string;
  display_name?: string;
  description?: string;
  brand_id?: string;
  category_id?: string;
  upc?: string;
  sku?: string;
  price?: number;
  unit?: string;
  unit_quantity?: number;
  image_url?: string;
  nutrition?: NutritionInfo;
  ingredients?: string;
  allergens?: string[];
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface UpdateProductRequest {
  name?: string;
  display_name?: string;
  description?: string;
  brand_id?: string;
  category_id?: string;
  upc?: string;
  sku?: string;
  status?: ProductStatus;
  price?: number;
  unit?: string;
  unit_quantity?: number;
  image_url?: string;
  nutrition?: NutritionInfo;
  ingredients?: string;
  allergens?: string[];
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface ProductSearchRequest {
  query: string;
  brand_id?: string;
  category_id?: string;
  status?: ProductStatus;
  limit?: number;
}

// Product API methods
export const productsApi = {
  async list(params?: ListProductsParams): Promise<ListProductsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.brand_id) searchParams.set('brand_id', params.brand_id);
    if (params?.category_id) searchParams.set('category_id', params.category_id);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/admin/products${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }
    return response.json();
  },

  async get(id: string): Promise<Product> {
    const response = await fetch(`${API_BASE}/admin/products/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch product');
    }
    return response.json();
  },

  async getByUPC(upc: string): Promise<Product> {
    const response = await fetch(`${API_BASE}/admin/products/upc/${upc}`);
    if (!response.ok) {
      throw new Error('Failed to fetch product by UPC');
    }
    return response.json();
  },

  async create(data: CreateProductRequest): Promise<Product> {
    const response = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create product');
    }
    return response.json();
  },

  async update(id: string, data: UpdateProductRequest): Promise<Product> {
    const response = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update product');
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete product');
    }
  },

  async search(params: ProductSearchRequest): Promise<ListProductsResponse> {
    const response = await fetch(`${API_BASE}/admin/products/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error('Failed to search products');
    }
    return response.json();
  },
};

// Brand types
export type BrandStatus = 'active' | 'inactive';

export interface Brand {
  id: string;
  name: string;
  normalized_name: string;
  display_name?: string;
  description?: string;
  website?: string;
  logo_url?: string;
  status: BrandStatus;
  product_count: number;
  metadata?: Record<string, string>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ListBrandsResponse {
  brands: Brand[];
  total: number;
}

export interface ListBrandsParams {
  status?: BrandStatus;
  limit?: number;
  offset?: number;
}

export interface CreateBrandRequest {
  name: string;
  display_name?: string;
  description?: string;
  website?: string;
  logo_url?: string;
  metadata?: Record<string, string>;
}

export interface UpdateBrandRequest {
  name?: string;
  display_name?: string;
  description?: string;
  website?: string;
  logo_url?: string;
  status?: BrandStatus;
  metadata?: Record<string, string>;
}

// Brand API methods
export const brandsApi = {
  async list(params?: ListBrandsParams): Promise<ListBrandsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/admin/brands${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch brands');
    }
    return response.json();
  },

  async get(id: string): Promise<Brand> {
    const response = await fetch(`${API_BASE}/admin/brands/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch brand');
    }
    return response.json();
  },

  async create(data: CreateBrandRequest): Promise<Brand> {
    const response = await fetch(`${API_BASE}/admin/brands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create brand');
    }
    return response.json();
  },

  async update(id: string, data: UpdateBrandRequest): Promise<Brand> {
    const response = await fetch(`${API_BASE}/admin/brands/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update brand');
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/admin/brands/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete brand');
    }
  },
};

// Category types
export type CategoryStatus = 'active' | 'inactive';

export interface Category {
  id: string;
  name: string;
  normalized_name: string;
  display_name?: string;
  description?: string;
  parent_id?: string;
  parent_name?: string;
  level: number;
  path: string;
  status: CategoryStatus;
  product_count: number;
  children?: Category[];
  metadata?: Record<string, string>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ListCategoriesResponse {
  categories: Category[];
  total: number;
}

export interface ListCategoriesParams {
  status?: CategoryStatus;
  parent_id?: string;
  tree?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateCategoryRequest {
  name: string;
  display_name?: string;
  description?: string;
  parent_id?: string;
  metadata?: Record<string, string>;
}

export interface UpdateCategoryRequest {
  name?: string;
  display_name?: string;
  description?: string;
  parent_id?: string;
  status?: CategoryStatus;
  metadata?: Record<string, string>;
}

// Category API methods
export const categoriesApi = {
  async list(params?: ListCategoriesParams): Promise<ListCategoriesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.parent_id) searchParams.set('parent_id', params.parent_id);
    if (params?.tree) searchParams.set('tree', 'true');
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/admin/categories${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    return response.json();
  },

  async get(id: string): Promise<Category> {
    const response = await fetch(`${API_BASE}/admin/categories/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch category');
    }
    return response.json();
  },

  async create(data: CreateCategoryRequest): Promise<Category> {
    const response = await fetch(`${API_BASE}/admin/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create category');
    }
    return response.json();
  },

  async update(id: string, data: UpdateCategoryRequest): Promise<Category> {
    const response = await fetch(`${API_BASE}/admin/categories/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update category');
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/admin/categories/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete category');
    }
  },
};

// Transaction types
export type TransactionType = 'purchase' | 'refund' | 'payment' | 'withdrawal' | 'deposit' | 'transfer' | 'other';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'disputed' | 'cancelled';

export interface Transaction {
  id: string;
  receipt_id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  transaction_date: string;
  description?: string;
  merchant_name?: string;
  merchant_category?: string;
  payment_method?: string;
  card_last_four?: string;
  reference_number?: string;
  authorization_code?: string;
  status: TransactionStatus;
  is_recurring: boolean;
  recurrence_pattern?: string;
  category_tags?: string[];
  metadata?: Record<string, unknown>;
  notes?: string;
  legacy_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ListTransactionsResponse {
  transactions: Transaction[];
  total: number;
}

export interface ListTransactionsParams {
  status?: TransactionStatus;
  type?: TransactionType;
  receipt_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTransactionRequest {
  receipt_id: string;
  type?: TransactionType;
  amount: number;
  currency?: string;
  transaction_date: string;
  description?: string;
  merchant_name?: string;
  merchant_category?: string;
  payment_method?: string;
  card_last_four?: string;
  reference_number?: string;
  authorization_code?: string;
  status?: TransactionStatus;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  category_tags?: string[];
  metadata?: Record<string, unknown>;
  notes?: string;
}

export interface UpdateTransactionRequest {
  type?: TransactionType;
  amount?: number;
  currency?: string;
  transaction_date?: string;
  description?: string;
  merchant_name?: string;
  merchant_category?: string;
  payment_method?: string;
  card_last_four?: string;
  reference_number?: string;
  authorization_code?: string;
  status?: TransactionStatus;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  category_tags?: string[];
  metadata?: Record<string, unknown>;
  notes?: string;
}

export interface TransactionSummary {
  total_count: number;
  total_amount: number;
  currency: string;
  by_type: Record<TransactionType, { count: number; amount: number }>;
  by_status: Record<TransactionStatus, { count: number; amount: number }>;
  by_category: Record<string, { count: number; amount: number }>;
  date_range: {
    start: string;
    end: string;
  };
}

// Transaction API methods (account-scoped)
export const transactionsApi = {
  async list(accountId: string, params?: ListTransactionsParams): Promise<ListTransactionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.receipt_id) searchParams.set('receipt_id', params.receipt_id);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/transactions${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<Transaction> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch transaction');
    }
    return response.json();
  },

  async create(accountId: string, data: CreateTransactionRequest): Promise<Transaction> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create transaction');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdateTransactionRequest): Promise<Transaction> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update transaction');
    }
    return response.json();
  },

  async delete(accountId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete transaction');
    }
  },

  async getSummary(accountId: string, params?: { start_date?: string; end_date?: string }): Promise<TransactionSummary> {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/transactions/summary${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch transaction summary');
    }
    return response.json();
  },

  async linkReceipt(accountId: string, transactionId: string, receiptId: string): Promise<Transaction> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions/${transactionId}/receipt`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ receipt_id: receiptId }),
    });
    if (!response.ok) {
      throw new Error('Failed to link receipt to transaction');
    }
    return response.json();
  },

  async unlinkReceipt(accountId: string, transactionId: string): Promise<Transaction> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions/${transactionId}/receipt`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to unlink receipt from transaction');
    }
    return response.json();
  },
};

// Line Item types
export interface LineItem {
  id: string;
  receipt_id: string;
  line_number: number;
  description: string;
  sku?: string;
  product_code?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total_price: number;
  discount_amount: number;
  discount_description?: string;
  tax_amount: number;
  tax_rate?: number;
  is_taxable: boolean;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  legacy_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ListLineItemsResponse {
  line_items: LineItem[];
  total: number;
}

export interface CreateLineItemRequest {
  receipt_id: string;
  line_number?: number;
  description: string;
  sku?: string;
  product_code?: string;
  quantity?: number;
  unit?: string;
  unit_price: number;
  total_price?: number;
  discount_amount?: number;
  discount_description?: string;
  tax_amount?: number;
  tax_rate?: number;
  is_taxable?: boolean;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateLineItemRequest {
  line_number?: number;
  description?: string;
  sku?: string;
  product_code?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total_price?: number;
  discount_amount?: number;
  discount_description?: string;
  tax_amount?: number;
  tax_rate?: number;
  is_taxable?: boolean;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ListAllLineItemsParams {
  category?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LineItemWithTransaction extends LineItem {
  transaction_id: string;
  transaction_date: string;
  merchant_name?: string;
}

export interface ListAllLineItemsResponse {
  line_items: LineItemWithTransaction[];
  total: number;
}

// Line Items API methods (account-scoped, nested under transactions)
export const lineItemsApi = {
  async listAll(accountId: string, params?: ListAllLineItemsParams): Promise<ListAllLineItemsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/line-items${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch line items');
    }
    return response.json();
  },

  async list(accountId: string, transactionId: string): Promise<ListLineItemsResponse> {
    const url = `${API_BASE}/accounts/${accountId}/transactions/${transactionId}/line-items`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch line items');
    }
    return response.json();
  },

  async get(accountId: string, transactionId: string, id: string): Promise<LineItem> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions/${transactionId}/line-items/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch line item');
    }
    return response.json();
  },

  async add(accountId: string, transactionId: string, data: Omit<CreateLineItemRequest, 'receipt_id'>): Promise<LineItem> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions/${transactionId}/line-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to add line item');
    }
    return response.json();
  },

  async update(accountId: string, transactionId: string, id: string, data: UpdateLineItemRequest): Promise<LineItem> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions/${transactionId}/line-items/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update line item');
    }
    return response.json();
  },

  async delete(accountId: string, transactionId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions/${transactionId}/line-items/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete line item');
    }
  },

  async reorder(accountId: string, transactionId: string, itemIds: string[]): Promise<LineItem[]> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions/${transactionId}/line-items/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ item_ids: itemIds }),
    });
    if (!response.ok) {
      throw new Error('Failed to reorder line items');
    }
    return response.json();
  },
};

// Discount types
export type DiscountType = 'percentage' | 'fixed' | 'coupon' | 'loyalty' | 'promotion' | 'other';

export interface Discount {
  id: string;
  transaction_id: string;
  line_item_id?: string;
  type: DiscountType;
  description: string;
  code?: string;
  amount: number;
  percentage?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListDiscountsResponse {
  discounts: Discount[];
  total: number;
}

export interface AddDiscountRequest {
  line_item_id?: string;
  type: DiscountType;
  description: string;
  code?: string;
  amount: number;
  percentage?: number;
  metadata?: Record<string, unknown>;
}

// Discounts API methods (account-scoped, nested under transactions)
export const discountsApi = {
  async list(accountId: string, transactionId: string): Promise<ListDiscountsResponse> {
    const url = `${API_BASE}/accounts/${accountId}/transactions/${transactionId}/discounts`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch discounts');
    }
    return response.json();
  },

  async add(accountId: string, transactionId: string, data: AddDiscountRequest): Promise<Discount> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions/${transactionId}/discounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to add discount');
    }
    return response.json();
  },

  async delete(accountId: string, transactionId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions/${transactionId}/discounts/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete discount');
    }
  },
};

// Receipt types
export type ReceiptStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'archived';
export type ReceiptSourceType = 'email' | 'drive' | 'upload' | 'scan';

export interface VLMAnalysisResult {
  model?: string;
  processed_at?: string;
  confidence?: number;
  extracted_fields?: {
    merchant_name?: string;
    merchant_address?: string;
    receipt_date?: string;
    total_amount?: number;
    tax_amount?: number;
    subtotal_amount?: number;
    payment_method?: string;
    receipt_number?: string;
    line_items?: Array<{
      description: string;
      quantity?: number;
      unit_price?: number;
      total_price?: number;
    }>;
  };
  raw_text?: string;
  errors?: string[];
}

export interface Receipt {
  id: string;
  user_id: string;
  source_type: ReceiptSourceType;
  source_id?: string;
  source_connection_id?: string;
  file_name: string;
  file_path?: string;
  mime_type: string;
  file_size: number;
  storage_bucket?: string;
  storage_key?: string;
  thumbnail_path?: string;
  status: ReceiptStatus;
  ocr_completed: boolean;
  ocr_text?: string;
  ocr_confidence?: number;
  merchant_name?: string;
  merchant_address?: string;
  receipt_date?: string;
  total_amount?: number;
  tax_amount?: number;
  subtotal_amount?: number;
  currency: string;
  payment_method?: string;
  receipt_number?: string;
  category_tags?: string[];
  extracted_data?: VLMAnalysisResult;
  metadata?: Record<string, unknown>;
  notes?: string;
  legacy_id?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  // Linked transaction info
  transaction_id?: string;
  store_id?: string;
  store_name?: string;
}

export interface ListReceiptsResponse {
  receipts: Receipt[];
  total: number;
}

export interface ListReceiptsParams {
  status?: ReceiptStatus;
  source_type?: ReceiptSourceType;
  store_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface CreateReceiptRequest {
  source_type: ReceiptSourceType;
  source_id?: string;
  file_name: string;
  mime_type: string;
  file_size?: number;
  merchant_name?: string;
  merchant_address?: string;
  receipt_date?: string;
  total_amount?: number;
  tax_amount?: number;
  subtotal_amount?: number;
  currency?: string;
  payment_method?: string;
  receipt_number?: string;
  category_tags?: string[];
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateReceiptRequest {
  merchant_name?: string;
  merchant_address?: string;
  receipt_date?: string;
  total_amount?: number;
  tax_amount?: number;
  subtotal_amount?: number;
  currency?: string;
  payment_method?: string;
  receipt_number?: string;
  category_tags?: string[];
  notes?: string;
  status?: ReceiptStatus;
  metadata?: Record<string, unknown>;
}

// Receipt API methods (account-scoped)
export const receiptsApi = {
  async list(accountId: string, params?: ListReceiptsParams): Promise<ListReceiptsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.source_type) searchParams.set('source_type', params.source_type);
    if (params?.store_id) searchParams.set('store_id', params.store_id);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/receipts${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch receipts');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<Receipt> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/receipts/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch receipt');
    }
    return response.json();
  },

  async create(accountId: string, data: CreateReceiptRequest): Promise<Receipt> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create receipt');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdateReceiptRequest): Promise<Receipt> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/receipts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update receipt');
    }
    return response.json();
  },

  async delete(accountId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/receipts/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete receipt');
    }
  },

  async reprocess(accountId: string, id: string): Promise<Receipt> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/receipts/${id}/reprocess`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to reprocess receipt');
    }
    return response.json();
  },

  async linkTransaction(accountId: string, receiptId: string, transactionId: string): Promise<Receipt> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/receipts/${receiptId}/transaction`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transaction_id: transactionId }),
    });
    if (!response.ok) {
      throw new Error('Failed to link transaction to receipt');
    }
    return response.json();
  },

  async unlinkTransaction(accountId: string, receiptId: string): Promise<Receipt> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/receipts/${receiptId}/transaction`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to unlink transaction from receipt');
    }
    return response.json();
  },

  async getImageUrl(accountId: string, id: string): Promise<string> {
    return `${API_BASE}/accounts/${accountId}/receipts/${id}/image`;
  },

  async getThumbnailUrl(accountId: string, id: string): Promise<string> {
    return `${API_BASE}/accounts/${accountId}/receipts/${id}/thumbnail`;
  },
};

// Budget types
export type BudgetStatus = 'active' | 'inactive' | 'archived';
export type BudgetPeriodType = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type BudgetPeriodStatus = 'upcoming' | 'active' | 'closed';
export type BudgetGoalType = 'spending_limit' | 'savings_target' | 'category_limit' | 'merchant_limit';
export type BudgetGoalStatus = 'active' | 'completed' | 'failed' | 'cancelled';

export interface Budget {
  id: string;
  account_id: string;
  name: string;
  description?: string;
  period_type: BudgetPeriodType;
  total_amount: number;
  currency: string;
  status: BudgetStatus;
  is_default: boolean;
  start_date?: string;
  end_date?: string;
  rollover_enabled: boolean;
  rollover_amount?: number;
  alert_threshold?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface BudgetDetail extends Budget {
  current_period?: BudgetPeriod;
  allocations: BudgetAllocation[];
  goals: BudgetGoal[];
  total_spent: number;
  total_remaining: number;
  percentage_used: number;
}

export interface BudgetPeriod {
  id: string;
  budget_id: string;
  period_number: number;
  start_date: string;
  end_date: string;
  total_amount: number;
  spent_amount: number;
  remaining_amount: number;
  rollover_amount: number;
  status: BudgetPeriodStatus;
  closed_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BudgetPeriodDetail extends BudgetPeriod {
  allocations: BudgetAllocationPeriodSummary[];
  transactions_count: number;
  daily_average_spend: number;
  projected_spend: number;
}

export interface BudgetAllocation {
  id: string;
  budget_id: string;
  category_id?: string;
  category_name?: string;
  store_id?: string;
  store_name?: string;
  name: string;
  description?: string;
  amount: number;
  percentage?: number;
  is_percentage: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BudgetAllocationPeriodSummary {
  allocation_id: string;
  allocation_name: string;
  budgeted_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
}

export interface BudgetGoal {
  id: string;
  budget_id: string;
  name: string;
  description?: string;
  type: BudgetGoalType;
  target_amount: number;
  current_amount: number;
  progress_percentage: number;
  category_id?: string;
  category_name?: string;
  store_id?: string;
  store_name?: string;
  start_date?: string;
  end_date?: string;
  status: BudgetGoalStatus;
  completed_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListBudgetsResponse {
  budgets: Budget[];
  total: number;
}

export interface ListBudgetsParams {
  status?: BudgetStatus;
  is_default?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateBudgetRequest {
  name: string;
  description?: string;
  period_type: BudgetPeriodType;
  total_amount: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  rollover_enabled?: boolean;
  alert_threshold?: number;
  is_default?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateBudgetRequest {
  name?: string;
  description?: string;
  period_type?: BudgetPeriodType;
  total_amount?: number;
  currency?: string;
  start_date?: string;
  end_date?: string;
  rollover_enabled?: boolean;
  alert_threshold?: number;
  status?: BudgetStatus;
  metadata?: Record<string, unknown>;
}

export interface ListBudgetPeriodsResponse {
  periods: BudgetPeriod[];
  total: number;
}

export interface ListBudgetPeriodsParams {
  status?: BudgetPeriodStatus;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface GenerateBudgetPeriodsRequest {
  count?: number;
  start_date?: string;
}

export interface ListBudgetAllocationsResponse {
  allocations: BudgetAllocation[];
  total: number;
}

export interface CreateBudgetAllocationRequest {
  category_id?: string;
  store_id?: string;
  name: string;
  description?: string;
  amount?: number;
  percentage?: number;
  is_percentage?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateBudgetAllocationRequest {
  name?: string;
  description?: string;
  amount?: number;
  percentage?: number;
  is_percentage?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ListBudgetGoalsResponse {
  goals: BudgetGoal[];
  total: number;
}

export interface ListBudgetGoalsParams {
  status?: BudgetGoalStatus;
  type?: BudgetGoalType;
  limit?: number;
  offset?: number;
}

export interface CreateBudgetGoalRequest {
  name: string;
  description?: string;
  type: BudgetGoalType;
  target_amount: number;
  category_id?: string;
  store_id?: string;
  start_date?: string;
  end_date?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateBudgetGoalRequest {
  name?: string;
  description?: string;
  target_amount?: number;
  status?: BudgetGoalStatus;
  metadata?: Record<string, unknown>;
}

// Budget API methods (account-scoped)
export const budgetsApi = {
  async list(accountId: string, params?: ListBudgetsParams): Promise<ListBudgetsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.is_default !== undefined) searchParams.set('is_default', params.is_default.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/budgets${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch budgets');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<Budget> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch budget');
    }
    return response.json();
  },

  async create(accountId: string, data: CreateBudgetRequest): Promise<Budget> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create budget');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdateBudgetRequest): Promise<Budget> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update budget');
    }
    return response.json();
  },

  async delete(accountId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete budget');
    }
  },

  async getDetail(accountId: string, id: string): Promise<BudgetDetail> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${id}/detail`);
    if (!response.ok) {
      throw new Error('Failed to fetch budget detail');
    }
    return response.json();
  },

  async setDefault(accountId: string, id: string): Promise<Budget> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${id}/default`, {
      method: 'PUT',
    });
    if (!response.ok) {
      throw new Error('Failed to set budget as default');
    }
    return response.json();
  },

  async activate(accountId: string, id: string): Promise<Budget> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${id}/activate`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to activate budget');
    }
    return response.json();
  },

  async deactivate(accountId: string, id: string): Promise<Budget> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${id}/deactivate`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to deactivate budget');
    }
    return response.json();
  },
};

// Budget Periods API methods (account-scoped, nested under budgets)
export const budgetPeriodsApi = {
  async list(accountId: string, budgetId: string, params?: ListBudgetPeriodsParams): Promise<ListBudgetPeriodsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/budgets/${budgetId}/periods${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch budget periods');
    }
    return response.json();
  },

  async getCurrent(accountId: string, budgetId: string): Promise<BudgetPeriod> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${budgetId}/periods/current`);
    if (!response.ok) {
      throw new Error('Failed to fetch current budget period');
    }
    return response.json();
  },

  async get(accountId: string, budgetId: string, periodId: string): Promise<BudgetPeriod> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${budgetId}/periods/${periodId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch budget period');
    }
    return response.json();
  },

  async getDetail(accountId: string, budgetId: string, periodId: string): Promise<BudgetPeriodDetail> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${budgetId}/periods/${periodId}/detail`);
    if (!response.ok) {
      throw new Error('Failed to fetch budget period detail');
    }
    return response.json();
  },

  async generate(accountId: string, budgetId: string, data?: GenerateBudgetPeriodsRequest): Promise<BudgetPeriod[]> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${budgetId}/periods/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data || {}),
    });
    if (!response.ok) {
      throw new Error('Failed to generate budget periods');
    }
    return response.json();
  },

  async activate(accountId: string, budgetId: string, periodId: string): Promise<BudgetPeriod> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${budgetId}/periods/${periodId}/activate`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to activate budget period');
    }
    return response.json();
  },

  async close(accountId: string, budgetId: string, periodId: string): Promise<BudgetPeriod> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${budgetId}/periods/${periodId}/close`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to close budget period');
    }
    return response.json();
  },
};

// Budget Allocations API methods (account-scoped, nested under budgets)
export const budgetAllocationsApi = {
  async list(accountId: string, budgetId: string): Promise<ListBudgetAllocationsResponse> {
    const url = `${API_BASE}/accounts/${accountId}/budgets/${budgetId}/allocations`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch budget allocations');
    }
    return response.json();
  },

  async create(accountId: string, budgetId: string, data: CreateBudgetAllocationRequest): Promise<BudgetAllocation> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${budgetId}/allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create budget allocation');
    }
    return response.json();
  },

  async update(accountId: string, budgetId: string, id: string, data: UpdateBudgetAllocationRequest): Promise<BudgetAllocation> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${budgetId}/allocations/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update budget allocation');
    }
    return response.json();
  },

  async delete(accountId: string, budgetId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${budgetId}/allocations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete budget allocation');
    }
  },
};

// Budget Goals API methods (account-scoped, nested under budgets)
export const budgetGoalsApi = {
  async list(accountId: string, budgetId: string, params?: ListBudgetGoalsParams): Promise<ListBudgetGoalsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/budgets/${budgetId}/goals${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch budget goals');
    }
    return response.json();
  },

  async create(accountId: string, budgetId: string, data: CreateBudgetGoalRequest): Promise<BudgetGoal> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${budgetId}/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create budget goal');
    }
    return response.json();
  },

  async update(accountId: string, budgetId: string, id: string, data: UpdateBudgetGoalRequest): Promise<BudgetGoal> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${budgetId}/goals/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update budget goal');
    }
    return response.json();
  },

  async delete(accountId: string, budgetId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/budgets/${budgetId}/goals/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete budget goal');
    }
  },
};

// Financial Connection types
export type FinancialConnectionStatus = 'pending' | 'active' | 'error' | 'disconnected' | 'expired';
export type FinancialConnectionProvider = 'plaid' | 'mx' | 'finicity' | 'yodlee' | 'manual';

export interface FinancialConnection {
  id: string;
  account_id: string;
  provider: FinancialConnectionProvider;
  provider_connection_id?: string;
  institution_id?: string;
  institution_name?: string;
  institution_logo?: string;
  status: FinancialConnectionStatus;
  error_code?: string;
  error_message?: string;
  last_sync_at?: string;
  next_sync_at?: string;
  consent_expires_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListFinancialConnectionsResponse {
  connections: FinancialConnection[];
  total: number;
}

export interface ListFinancialConnectionsParams {
  status?: FinancialConnectionStatus;
  provider?: FinancialConnectionProvider;
  limit?: number;
  offset?: number;
}

export interface CreateLinkTokenRequest {
  provider?: FinancialConnectionProvider;
  redirect_uri?: string;
  products?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateLinkTokenResponse {
  link_token: string;
  expiration: string;
}

export interface ConnectFinancialConnectionRequest {
  provider: FinancialConnectionProvider;
  public_token: string;
  institution_id?: string;
  metadata?: Record<string, unknown>;
}

// Financial Connections API methods (account-scoped)
export const financialConnectionsApi = {
  async list(accountId: string, params?: ListFinancialConnectionsParams): Promise<ListFinancialConnectionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.provider) searchParams.set('provider', params.provider);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/connections${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch financial connections');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<FinancialConnection> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/connections/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch financial connection');
    }
    return response.json();
  },

  async createLinkToken(accountId: string, data?: CreateLinkTokenRequest): Promise<CreateLinkTokenResponse> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/connections/link-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data || {}),
    });
    if (!response.ok) {
      throw new Error('Failed to create link token');
    }
    return response.json();
  },

  async connect(accountId: string, data: ConnectFinancialConnectionRequest): Promise<FinancialConnection> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to connect financial connection');
    }
    return response.json();
  },

  async disconnect(accountId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/connections/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to disconnect financial connection');
    }
  },

  async refresh(accountId: string, id: string): Promise<FinancialConnection> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/connections/${id}/refresh`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to refresh financial connection');
    }
    return response.json();
  },
};

// Financial Account types
export type FinancialAccountType = 'checking' | 'savings' | 'credit' | 'loan' | 'investment' | 'mortgage' | 'other';
export type FinancialAccountSubtype = 'personal' | 'business' | 'joint' | 'trust' | 'ira' | '401k' | 'brokerage' | 'other';
export type FinancialAccountStatus = 'active' | 'inactive' | 'closed' | 'pending';

export interface FinancialAccount {
  id: string;
  account_id: string;
  connection_id: string;
  provider_account_id?: string;
  name: string;
  official_name?: string;
  type: FinancialAccountType;
  subtype?: FinancialAccountSubtype;
  status: FinancialAccountStatus;
  mask?: string;
  currency: string;
  current_balance?: number;
  available_balance?: number;
  limit_balance?: number;
  is_active: boolean;
  is_hidden: boolean;
  last_balance_update?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListFinancialAccountsResponse {
  accounts: FinancialAccount[];
  total: number;
}

export interface ListFinancialAccountsParams {
  connection_id?: string;
  type?: FinancialAccountType;
  status?: FinancialAccountStatus;
  is_active?: boolean;
  is_hidden?: boolean;
  limit?: number;
  offset?: number;
}

export interface UpdateFinancialAccountRequest {
  name?: string;
  is_active?: boolean;
  is_hidden?: boolean;
  metadata?: Record<string, unknown>;
}

export interface FinancialAccountsSummary {
  total_accounts: number;
  total_current_balance: number;
  total_available_balance: number;
  by_type: Record<FinancialAccountType, { count: number; balance: number }>;
  currency: string;
}

export interface FinancialAccountBalance {
  account_id: string;
  current_balance?: number;
  available_balance?: number;
  limit_balance?: number;
  currency: string;
  last_updated: string;
}

// Financial Accounts API methods (account-scoped)
export const financialAccountsApi = {
  async list(accountId: string, params?: ListFinancialAccountsParams): Promise<ListFinancialAccountsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.connection_id) searchParams.set('connection_id', params.connection_id);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.is_active !== undefined) searchParams.set('is_active', params.is_active.toString());
    if (params?.is_hidden !== undefined) searchParams.set('is_hidden', params.is_hidden.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/financial-accounts${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch financial accounts');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<FinancialAccount> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/financial-accounts/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch financial account');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdateFinancialAccountRequest): Promise<FinancialAccount> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/financial-accounts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update financial account');
    }
    return response.json();
  },

  async getSummary(accountId: string): Promise<FinancialAccountsSummary> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/financial-accounts/summary`);
    if (!response.ok) {
      throw new Error('Failed to fetch financial accounts summary');
    }
    return response.json();
  },

  async setActive(accountId: string, id: string, isActive: boolean): Promise<FinancialAccount> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/financial-accounts/${id}/active`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!response.ok) {
      throw new Error('Failed to set financial account active status');
    }
    return response.json();
  },

  async setHidden(accountId: string, id: string, isHidden: boolean): Promise<FinancialAccount> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/financial-accounts/${id}/hidden`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_hidden: isHidden }),
    });
    if (!response.ok) {
      throw new Error('Failed to set financial account hidden status');
    }
    return response.json();
  },

  async getBalance(accountId: string, id: string): Promise<FinancialAccountBalance> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/financial-accounts/${id}/balance`);
    if (!response.ok) {
      throw new Error('Failed to fetch financial account balance');
    }
    return response.json();
  },
};

// Bank Transaction types
export type BankTransactionType = 'debit' | 'credit' | 'transfer' | 'fee' | 'interest' | 'adjustment' | 'other';
export type BankTransactionStatus = 'pending' | 'posted' | 'cancelled';

export interface BankTransaction {
  id: string;
  account_id: string;
  financial_account_id: string;
  provider_transaction_id?: string;
  type: BankTransactionType;
  status: BankTransactionStatus;
  amount: number;
  currency: string;
  date: string;
  posted_date?: string;
  description: string;
  original_description?: string;
  merchant_name?: string;
  merchant_category?: string;
  category_id?: string;
  category_name?: string;
  is_pending: boolean;
  is_recurring: boolean;
  recurrence_pattern?: string;
  linked_receipt_id?: string;
  tags?: string[];
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListBankTransactionsResponse {
  transactions: BankTransaction[];
  total: number;
}

export interface ListBankTransactionsParams {
  financial_account_id?: string;
  type?: BankTransactionType;
  status?: BankTransactionStatus;
  category_id?: string;
  is_pending?: boolean;
  is_recurring?: boolean;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  limit?: number;
  offset?: number;
}

export interface UpdateBankTransactionRequest {
  description?: string;
  category_id?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  tags?: string[];
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface BankTransactionsSummary {
  total_count: number;
  total_income: number;
  total_expenses: number;
  net_change: number;
  currency: string;
  by_type: Record<BankTransactionType, { count: number; amount: number }>;
  by_category: Record<string, { count: number; amount: number }>;
  date_range: {
    start: string;
    end: string;
  };
}

// Bank Transactions API methods (account-scoped)
export const bankTransactionsApi = {
  async list(accountId: string, params?: ListBankTransactionsParams): Promise<ListBankTransactionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.financial_account_id) searchParams.set('financial_account_id', params.financial_account_id);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category_id) searchParams.set('category_id', params.category_id);
    if (params?.is_pending !== undefined) searchParams.set('is_pending', params.is_pending.toString());
    if (params?.is_recurring !== undefined) searchParams.set('is_recurring', params.is_recurring.toString());
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.min_amount !== undefined) searchParams.set('min_amount', params.min_amount.toString());
    if (params?.max_amount !== undefined) searchParams.set('max_amount', params.max_amount.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/bank-transactions${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch bank transactions');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<BankTransaction> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/bank-transactions/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch bank transaction');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdateBankTransactionRequest): Promise<BankTransaction> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/bank-transactions/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update bank transaction');
    }
    return response.json();
  },

  async getSummary(accountId: string, params?: { start_date?: string; end_date?: string; financial_account_id?: string }): Promise<BankTransactionsSummary> {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.financial_account_id) searchParams.set('financial_account_id', params.financial_account_id);

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/bank-transactions/summary${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch bank transactions summary');
    }
    return response.json();
  },

  async listUncategorized(accountId: string, params?: { limit?: number; offset?: number }): Promise<ListBankTransactionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/bank-transactions/uncategorized${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch uncategorized bank transactions');
    }
    return response.json();
  },

  async listRecurring(accountId: string, params?: { limit?: number; offset?: number }): Promise<ListBankTransactionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/bank-transactions/recurring${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch recurring bank transactions');
    }
    return response.json();
  },
};

// Persona types
export type PersonaStatus = 'active' | 'inactive';

export interface Persona {
  id: string;
  account_id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  status: PersonaStatus;
  is_default: boolean;
  spending_profile?: string;
  preferences?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  cloned_from?: string;
  cloned_from_name?: string;
  is_public?: boolean;
  // Creator attribution for community personas
  creator_name?: string;
  creator_avatar_url?: string;
  // Usage statistics
  clone_count?: number;
  use_count?: number;
}

export interface ListPersonasResponse {
  personas: Persona[];
  total: number;
}

export interface ListPersonasParams {
  status?: PersonaStatus;
  is_default?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreatePersonaRequest {
  name: string;
  description?: string;
  avatar_url?: string;
  is_default?: boolean;
  spending_profile?: string;
  preferences?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  cloned_from?: string;
  cloned_from_name?: string;
  is_public?: boolean;
}

export interface UpdatePersonaRequest {
  name?: string;
  description?: string;
  avatar_url?: string;
  status?: PersonaStatus;
  is_default?: boolean;
  spending_profile?: string;
  preferences?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  is_public?: boolean;
}

// Persona API methods (account-scoped)
export const personasApi = {
  async list(accountId: string, params?: ListPersonasParams): Promise<ListPersonasResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.is_default !== undefined) searchParams.set('is_default', params.is_default.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/personas${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch personas');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<Persona> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/personas/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch persona');
    }
    return response.json();
  },

  async create(accountId: string, data: CreatePersonaRequest): Promise<Persona> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/personas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create persona');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdatePersonaRequest): Promise<Persona> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/personas/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update persona');
    }
    return response.json();
  },

  async delete(accountId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/personas/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete persona');
    }
  },

  async setDefault(accountId: string, id: string): Promise<Persona> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/personas/${id}/default`, {
      method: 'PUT',
    });
    if (!response.ok) {
      throw new Error('Failed to set persona as default');
    }
    return response.json();
  },
};

// Community Personas API (public personas from all users)
export interface ListCommunityPersonasParams {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface ListCommunityPersonasResponse {
  personas: Persona[];
  total: number;
}

export const communityPersonasApi = {
  async list(params?: ListCommunityPersonasParams): Promise<ListCommunityPersonasResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    const url = `${API_BASE}/community/personas${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch community personas');
    }
    return response.json();
  },

  async get(id: string): Promise<Persona> {
    const response = await fetch(`${API_BASE}/community/personas/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch community persona');
    }
    return response.json();
  },

  async clone(accountId: string, personaId: string, name: string, isPublic: boolean = false): Promise<Persona> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/personas/clone-from-community`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_persona_id: personaId,
        name,
        is_public: isPublic,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to clone community persona');
    }
    return response.json();
  },

  async trackUsage(personaId: string): Promise<void> {
    await fetch(`${API_BASE}/community/personas/${personaId}/usage`, {
      method: 'POST',
    });
  },
};

// Employer types
export type EmployerStatus = 'active' | 'inactive';

export interface Employer {
  id: string;
  account_id: string;
  name: string;
  display_name?: string;
  ein?: string;
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  status: EmployerStatus;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ListEmployersResponse {
  employers: Employer[];
  total: number;
}

export interface ListEmployersParams {
  status?: EmployerStatus;
  limit?: number;
  offset?: number;
}

export interface CreateEmployerRequest {
  name: string;
  display_name?: string;
  ein?: string;
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateEmployerRequest {
  name?: string;
  display_name?: string;
  ein?: string;
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  status?: EmployerStatus;
  metadata?: Record<string, unknown>;
}

// Employers API methods (account-scoped)
export const employersApi = {
  async list(accountId: string, params?: ListEmployersParams): Promise<ListEmployersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/employers${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch employers');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<Employer> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/employers/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch employer');
    }
    return response.json();
  },

  async create(accountId: string, data: CreateEmployerRequest): Promise<Employer> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/employers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create employer');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdateEmployerRequest): Promise<Employer> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/employers/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update employer');
    }
    return response.json();
  },

  async delete(accountId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/employers/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete employer');
    }
  },
};

// Paycheck types
export type PaycheckStatus = 'pending' | 'processed' | 'reviewed' | 'archived';
export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'quarterly' | 'annual' | 'other';

export interface PaycheckEarning {
  id: string;
  paycheck_id: string;
  type: string;
  description?: string;
  hours?: number;
  rate?: number;
  amount: number;
  ytd_amount?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PaycheckDeduction {
  id: string;
  paycheck_id: string;
  type: string;
  description?: string;
  amount: number;
  ytd_amount?: number;
  is_pretax: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Paycheck {
  id: string;
  account_id: string;
  employer_id: string;
  employer_name?: string;
  pay_date: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_frequency?: PayFrequency;
  gross_pay: number;
  net_pay: number;
  total_taxes: number;
  total_deductions: number;
  total_earnings: number;
  currency: string;
  check_number?: string;
  direct_deposit_account?: string;
  status: PaycheckStatus;
  needs_review: boolean;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
  receipt_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface PaycheckDetail extends Paycheck {
  earnings: PaycheckEarning[];
  deductions: PaycheckDeduction[];
}

export interface ListPaychecksResponse {
  paychecks: Paycheck[];
  total: number;
}

export interface ListPaychecksParams {
  employer_id?: string;
  status?: PaycheckStatus;
  needs_review?: boolean;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface CreatePaycheckRequest {
  employer_id: string;
  pay_date: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_frequency?: PayFrequency;
  gross_pay: number;
  net_pay: number;
  total_taxes?: number;
  total_deductions?: number;
  total_earnings?: number;
  currency?: string;
  check_number?: string;
  direct_deposit_account?: string;
  notes?: string;
  receipt_id?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdatePaycheckRequest {
  employer_id?: string;
  pay_date?: string;
  pay_period_start?: string;
  pay_period_end?: string;
  pay_frequency?: PayFrequency;
  gross_pay?: number;
  net_pay?: number;
  total_taxes?: number;
  total_deductions?: number;
  total_earnings?: number;
  currency?: string;
  check_number?: string;
  direct_deposit_account?: string;
  status?: PaycheckStatus;
  notes?: string;
  receipt_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AddEarningRequest {
  type: string;
  description?: string;
  hours?: number;
  rate?: number;
  amount: number;
  ytd_amount?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateEarningRequest {
  type?: string;
  description?: string;
  hours?: number;
  rate?: number;
  amount?: number;
  ytd_amount?: number;
  metadata?: Record<string, unknown>;
}

export interface AddDeductionRequest {
  type: string;
  description?: string;
  amount: number;
  ytd_amount?: number;
  is_pretax?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateDeductionRequest {
  type?: string;
  description?: string;
  amount?: number;
  ytd_amount?: number;
  is_pretax?: boolean;
  metadata?: Record<string, unknown>;
}

// Paychecks API methods (account-scoped)
export const paychecksApi = {
  async list(accountId: string, params?: ListPaychecksParams): Promise<ListPaychecksResponse> {
    const searchParams = new URLSearchParams();
    if (params?.employer_id) searchParams.set('employer_id', params.employer_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.needs_review !== undefined) searchParams.set('needs_review', params.needs_review.toString());
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/paychecks${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch paychecks');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<Paycheck> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/paychecks/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch paycheck');
    }
    return response.json();
  },

  async create(accountId: string, data: CreatePaycheckRequest): Promise<Paycheck> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/paychecks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create paycheck');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdatePaycheckRequest): Promise<Paycheck> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/paychecks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update paycheck');
    }
    return response.json();
  },

  async delete(accountId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/paychecks/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete paycheck');
    }
  },

  async getDetails(accountId: string, id: string): Promise<PaycheckDetail> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/paychecks/${id}/details`);
    if (!response.ok) {
      throw new Error('Failed to fetch paycheck details');
    }
    return response.json();
  },

  async markReviewed(accountId: string, id: string): Promise<Paycheck> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/paychecks/${id}/reviewed`, {
      method: 'PUT',
    });
    if (!response.ok) {
      throw new Error('Failed to mark paycheck as reviewed');
    }
    return response.json();
  },

  async listNeedingReview(accountId: string, params?: { limit?: number; offset?: number }): Promise<ListPaychecksResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/paychecks/needing-review${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch paychecks needing review');
    }
    return response.json();
  },
};

// Paycheck Earnings API methods (account-scoped, nested under paychecks)
export const paycheckEarningsApi = {
  async add(accountId: string, paycheckId: string, data: AddEarningRequest): Promise<PaycheckEarning> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/paychecks/${paycheckId}/earnings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to add earning');
    }
    return response.json();
  },

  async update(accountId: string, paycheckId: string, id: string, data: UpdateEarningRequest): Promise<PaycheckEarning> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/paychecks/${paycheckId}/earnings/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update earning');
    }
    return response.json();
  },

  async delete(accountId: string, paycheckId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/paychecks/${paycheckId}/earnings/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete earning');
    }
  },
};

// Paycheck Deductions API methods (account-scoped, nested under paychecks)
export const paycheckDeductionsApi = {
  async add(accountId: string, paycheckId: string, data: AddDeductionRequest): Promise<PaycheckDeduction> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/paychecks/${paycheckId}/deductions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to add deduction');
    }
    return response.json();
  },

  async update(accountId: string, paycheckId: string, id: string, data: UpdateDeductionRequest): Promise<PaycheckDeduction> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/paychecks/${paycheckId}/deductions/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update deduction');
    }
    return response.json();
  },

  async delete(accountId: string, paycheckId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/paychecks/${paycheckId}/deductions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete deduction');
    }
  },
};

// Sync types
export interface SyncResult {
  connection_id?: string;
  financial_account_id?: string;
  accounts_synced: number;
  transactions_synced: number;
  new_transactions: number;
  updated_transactions: number;
  started_at: string;
  completed_at: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

export interface SyncAllResult {
  results: SyncResult[];
  total_connections: number;
  total_accounts: number;
  total_transactions_synced: number;
}

// Sync API methods (account-scoped)
export const syncApi = {
  async syncAll(accountId: string): Promise<SyncAllResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/sync`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to sync all connections');
    }
    return response.json();
  },

  async syncConnection(accountId: string, connectionId: string): Promise<SyncResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/connections/${connectionId}/sync`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to sync connection');
    }
    return response.json();
  },

  async syncAccount(accountId: string, financialAccountId: string): Promise<SyncResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/financial-accounts/${financialAccountId}/sync`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to sync financial account');
    }
    return response.json();
  },
};

// ============================================================================
// Retirement Planning API Types and Methods
// ============================================================================

// Retirement Plan types
export type RetirementPlanStatus = 'active' | 'inactive' | 'archived' | 'draft';
export type RetirementStrategy = 'traditional' | 'fire' | 'coast_fire' | 'barista_fire' | 'lean_fire' | 'fat_fire';

export interface RetirementPlan {
  id: string;
  account_id: string;
  name: string;
  description?: string;
  status: RetirementPlanStatus;
  is_default: boolean;
  strategy: RetirementStrategy;
  target_retirement_age: number;
  current_age: number;
  life_expectancy: number;
  target_annual_spending: number;
  inflation_rate: number;
  safe_withdrawal_rate: number;
  expected_return_rate: number;
  social_security_age?: number;
  social_security_benefit?: number;
  pension_benefit?: number;
  pension_start_age?: number;
  healthcare_cost_estimate?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RetirementPlanDetail extends RetirementPlan {
  retirement_accounts: RetirementAccount[];
  income_sources: RetirementIncomeSource[];
  expenses: RetirementExpense[];
  fire_number?: number;
  years_to_retirement?: number;
  projected_portfolio_at_retirement?: number;
  success_probability?: number;
}

export interface ListRetirementPlansResponse {
  plans: RetirementPlan[];
  total: number;
}

export interface ListRetirementPlansParams {
  status?: RetirementPlanStatus;
  strategy?: RetirementStrategy;
  limit?: number;
  offset?: number;
}

export interface CreateRetirementPlanRequest {
  name: string;
  description?: string;
  strategy?: RetirementStrategy;
  target_retirement_age: number;
  current_age: number;
  life_expectancy?: number;
  target_annual_spending: number;
  inflation_rate?: number;
  safe_withdrawal_rate?: number;
  expected_return_rate?: number;
  social_security_age?: number;
  social_security_benefit?: number;
  pension_benefit?: number;
  pension_start_age?: number;
  healthcare_cost_estimate?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateRetirementPlanRequest {
  name?: string;
  description?: string;
  status?: RetirementPlanStatus;
  strategy?: RetirementStrategy;
  target_retirement_age?: number;
  current_age?: number;
  life_expectancy?: number;
  target_annual_spending?: number;
  inflation_rate?: number;
  safe_withdrawal_rate?: number;
  expected_return_rate?: number;
  social_security_age?: number;
  social_security_benefit?: number;
  pension_benefit?: number;
  pension_start_age?: number;
  healthcare_cost_estimate?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// Retirement Plans API methods (account-scoped)
export const retirementPlansApi = {
  async list(accountId: string, params?: ListRetirementPlansParams): Promise<ListRetirementPlansResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.strategy) searchParams.set('strategy', params.strategy);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/retirement/plans${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch retirement plans');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<RetirementPlan> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/plans/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch retirement plan');
    }
    return response.json();
  },

  async create(accountId: string, data: CreateRetirementPlanRequest): Promise<RetirementPlan> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create retirement plan');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdateRetirementPlanRequest): Promise<RetirementPlan> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/plans/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update retirement plan');
    }
    return response.json();
  },

  async delete(accountId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/plans/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete retirement plan');
    }
  },

  async getDetail(accountId: string, id: string): Promise<RetirementPlanDetail> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/plans/${id}/detail`);
    if (!response.ok) {
      throw new Error('Failed to fetch retirement plan detail');
    }
    return response.json();
  },

  async setDefault(accountId: string, id: string): Promise<RetirementPlan> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/plans/${id}/default`, {
      method: 'PUT',
    });
    if (!response.ok) {
      throw new Error('Failed to set retirement plan as default');
    }
    return response.json();
  },

  async activate(accountId: string, id: string): Promise<RetirementPlan> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/plans/${id}/activate`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to activate retirement plan');
    }
    return response.json();
  },

  async archive(accountId: string, id: string): Promise<RetirementPlan> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/plans/${id}/archive`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to archive retirement plan');
    }
    return response.json();
  },
};

// Retirement Account types
export type RetirementAccountType = '401k' | '403b' | 'ira' | 'roth_ira' | 'sep_ira' | 'simple_ira' | 'pension' | 'brokerage' | 'hsa' | 'other';
export type RetirementAccountStatus = 'active' | 'inactive' | 'closed';

export interface RetirementAccount {
  id: string;
  account_id: string;
  plan_id: string;
  financial_account_id?: string;
  name: string;
  type: RetirementAccountType;
  status: RetirementAccountStatus;
  current_balance: number;
  contribution_limit?: number;
  annual_contribution?: number;
  employer_match_percent?: number;
  employer_match_limit?: number;
  expected_return_rate?: number;
  is_tax_deferred: boolean;
  is_roth: boolean;
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListRetirementAccountsResponse {
  accounts: RetirementAccount[];
  total: number;
}

export interface ListRetirementAccountsParams {
  plan_id?: string;
  type?: RetirementAccountType;
  status?: RetirementAccountStatus;
  limit?: number;
  offset?: number;
}

export interface CreateRetirementAccountRequest {
  plan_id: string;
  financial_account_id?: string;
  name: string;
  type: RetirementAccountType;
  current_balance: number;
  contribution_limit?: number;
  annual_contribution?: number;
  employer_match_percent?: number;
  employer_match_limit?: number;
  expected_return_rate?: number;
  is_tax_deferred?: boolean;
  is_roth?: boolean;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateRetirementAccountRequest {
  financial_account_id?: string;
  name?: string;
  type?: RetirementAccountType;
  status?: RetirementAccountStatus;
  current_balance?: number;
  contribution_limit?: number;
  annual_contribution?: number;
  employer_match_percent?: number;
  employer_match_limit?: number;
  expected_return_rate?: number;
  is_tax_deferred?: boolean;
  is_roth?: boolean;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateRetirementAccountBalanceRequest {
  balance: number;
  as_of_date?: string;
}

// Retirement Accounts API methods (account-scoped)
export const retirementAccountsApi = {
  async list(accountId: string, params?: ListRetirementAccountsParams): Promise<ListRetirementAccountsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.plan_id) searchParams.set('plan_id', params.plan_id);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/retirement/accounts${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch retirement accounts');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<RetirementAccount> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/accounts/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch retirement account');
    }
    return response.json();
  },

  async create(accountId: string, data: CreateRetirementAccountRequest): Promise<RetirementAccount> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create retirement account');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdateRetirementAccountRequest): Promise<RetirementAccount> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/accounts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update retirement account');
    }
    return response.json();
  },

  async delete(accountId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/accounts/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete retirement account');
    }
  },

  async updateBalance(accountId: string, id: string, data: UpdateRetirementAccountBalanceRequest): Promise<RetirementAccount> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/accounts/${id}/balance`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update retirement account balance');
    }
    return response.json();
  },
};

// Retirement Income Source types
export type IncomeSourceType = 'social_security' | 'pension' | 'annuity' | 'rental' | 'part_time' | 'dividend' | 'other';
export type IncomeSourceStatus = 'active' | 'inactive' | 'future';

export interface RetirementIncomeSource {
  id: string;
  account_id: string;
  plan_id: string;
  name: string;
  type: IncomeSourceType;
  status: IncomeSourceStatus;
  annual_amount: number;
  start_age: number;
  end_age?: number;
  inflation_adjusted: boolean;
  cola_rate?: number;
  is_taxable: boolean;
  tax_rate?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListRetirementIncomeSourcesResponse {
  income_sources: RetirementIncomeSource[];
  total: number;
}

export interface ListRetirementIncomeSourcesParams {
  plan_id?: string;
  type?: IncomeSourceType;
  status?: IncomeSourceStatus;
  limit?: number;
  offset?: number;
}

export interface CreateRetirementIncomeSourceRequest {
  plan_id: string;
  name: string;
  type: IncomeSourceType;
  annual_amount: number;
  start_age: number;
  end_age?: number;
  inflation_adjusted?: boolean;
  cola_rate?: number;
  is_taxable?: boolean;
  tax_rate?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateRetirementIncomeSourceRequest {
  name?: string;
  type?: IncomeSourceType;
  status?: IncomeSourceStatus;
  annual_amount?: number;
  start_age?: number;
  end_age?: number;
  inflation_adjusted?: boolean;
  cola_rate?: number;
  is_taxable?: boolean;
  tax_rate?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// Retirement Income Sources API methods (account-scoped)
export const retirementIncomeSourcesApi = {
  async list(accountId: string, params?: ListRetirementIncomeSourcesParams): Promise<ListRetirementIncomeSourcesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.plan_id) searchParams.set('plan_id', params.plan_id);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/retirement/income-sources${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch retirement income sources');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<RetirementIncomeSource> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/income-sources/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch retirement income source');
    }
    return response.json();
  },

  async create(accountId: string, data: CreateRetirementIncomeSourceRequest): Promise<RetirementIncomeSource> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/income-sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create retirement income source');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdateRetirementIncomeSourceRequest): Promise<RetirementIncomeSource> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/income-sources/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update retirement income source');
    }
    return response.json();
  },

  async delete(accountId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/income-sources/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete retirement income source');
    }
  },
};

// Retirement Expense types
export type RetirementExpenseType = 'housing' | 'healthcare' | 'transportation' | 'food' | 'utilities' | 'insurance' | 'entertainment' | 'travel' | 'other';
export type RetirementExpenseStatus = 'active' | 'inactive' | 'future';
export type ExpenseFrequency = 'one_time' | 'monthly' | 'quarterly' | 'annual';

export interface RetirementExpense {
  id: string;
  account_id: string;
  plan_id: string;
  name: string;
  type: RetirementExpenseType;
  status: RetirementExpenseStatus;
  amount: number;
  frequency: ExpenseFrequency;
  start_age: number;
  end_age?: number;
  inflation_adjusted: boolean;
  inflation_rate?: number;
  is_essential: boolean;
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListRetirementExpensesResponse {
  expenses: RetirementExpense[];
  total: number;
}

export interface ListRetirementExpensesParams {
  plan_id?: string;
  type?: RetirementExpenseType;
  status?: RetirementExpenseStatus;
  is_essential?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateRetirementExpenseRequest {
  plan_id: string;
  name: string;
  type: RetirementExpenseType;
  amount: number;
  frequency?: ExpenseFrequency;
  start_age: number;
  end_age?: number;
  inflation_adjusted?: boolean;
  inflation_rate?: number;
  is_essential?: boolean;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateRetirementExpenseRequest {
  name?: string;
  type?: RetirementExpenseType;
  status?: RetirementExpenseStatus;
  amount?: number;
  frequency?: ExpenseFrequency;
  start_age?: number;
  end_age?: number;
  inflation_adjusted?: boolean;
  inflation_rate?: number;
  is_essential?: boolean;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// Retirement Expenses API methods (account-scoped)
export const retirementExpensesApi = {
  async list(accountId: string, params?: ListRetirementExpensesParams): Promise<ListRetirementExpensesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.plan_id) searchParams.set('plan_id', params.plan_id);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.is_essential !== undefined) searchParams.set('is_essential', params.is_essential.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/retirement/expenses${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch retirement expenses');
    }
    return response.json();
  },

  async get(accountId: string, id: string): Promise<RetirementExpense> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/expenses/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch retirement expense');
    }
    return response.json();
  },

  async create(accountId: string, data: CreateRetirementExpenseRequest): Promise<RetirementExpense> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/expenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create retirement expense');
    }
    return response.json();
  },

  async update(accountId: string, id: string, data: UpdateRetirementExpenseRequest): Promise<RetirementExpense> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/expenses/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update retirement expense');
    }
    return response.json();
  },

  async delete(accountId: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/expenses/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete retirement expense');
    }
  },
};

// FIRE Calculation types
export interface FIRECalculationRequest {
  plan_id: string;
  annual_spending: number;
  safe_withdrawal_rate?: number;
  inflation_rate?: number;
}

export interface FIRECalculationResult {
  fire_number: number;
  current_portfolio: number;
  remaining_needed: number;
  percentage_complete: number;
  safe_withdrawal_rate: number;
  annual_spending_adjusted: number;
}

export interface FIRENumberRequest {
  annual_spending: number;
  safe_withdrawal_rate?: number;
  include_social_security?: boolean;
  social_security_benefit?: number;
}

export interface FIRENumberResult {
  fire_number: number;
  safe_withdrawal_rate: number;
  annual_spending: number;
  social_security_offset?: number;
}

export interface CoastFIRERequest {
  plan_id: string;
  target_retirement_age: number;
  current_age: number;
  expected_return_rate?: number;
}

export interface CoastFIREResult {
  coast_fire_number: number;
  current_portfolio: number;
  is_coast_fire_achieved: boolean;
  years_until_coast_fire?: number;
  projected_value_at_retirement: number;
}

export interface BaristaFIRERequest {
  plan_id: string;
  part_time_income: number;
  years_of_part_time: number;
}

export interface BaristaFIREResult {
  barista_fire_number: number;
  current_portfolio: number;
  part_time_income_total: number;
  remaining_needed: number;
  is_barista_fire_achieved: boolean;
}

export interface TimeToFIRERequest {
  plan_id: string;
  monthly_contribution?: number;
  expected_return_rate?: number;
}

export interface TimeToFIREResult {
  years_to_fire: number;
  months_to_fire: number;
  fire_date: string;
  fire_age: number;
  fire_number: number;
  projected_portfolio_at_fire: number;
}

export interface MonteCarloRequest {
  plan_id: string;
  simulations?: number;
  years_in_retirement?: number;
  return_mean?: number;
  return_std_dev?: number;
  inflation_mean?: number;
  inflation_std_dev?: number;
}

export interface MonteCarloResult {
  success_rate: number;
  simulations_run: number;
  median_ending_balance: number;
  percentile_10_balance: number;
  percentile_25_balance: number;
  percentile_75_balance: number;
  percentile_90_balance: number;
  years_simulated: number;
  scenarios: MonteCarloScenario[];
}

export interface MonteCarloScenario {
  year: number;
  median_balance: number;
  percentile_10: number;
  percentile_90: number;
}

// FIRE Calculations API methods (account-scoped)
export const fireCalculationsApi = {
  async calculate(accountId: string, data: FIRECalculationRequest): Promise<FIRECalculationResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/fire/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to calculate FIRE');
    }
    return response.json();
  },

  async calculateNumber(accountId: string, data: FIRENumberRequest): Promise<FIRENumberResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/fire/number`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to calculate FIRE number');
    }
    return response.json();
  },

  async calculateCoast(accountId: string, data: CoastFIRERequest): Promise<CoastFIREResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/fire/coast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to calculate Coast FIRE');
    }
    return response.json();
  },

  async calculateBarista(accountId: string, data: BaristaFIRERequest): Promise<BaristaFIREResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/fire/barista`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to calculate Barista FIRE');
    }
    return response.json();
  },

  async timeToFIRE(accountId: string, data: TimeToFIRERequest): Promise<TimeToFIREResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/fire/time-to-fire`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to calculate time to FIRE');
    }
    return response.json();
  },

  async monteCarlo(accountId: string, data: MonteCarloRequest): Promise<MonteCarloResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/fire/monte-carlo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to run Monte Carlo simulation');
    }
    return response.json();
  },
};

// Projections types
export interface ProjectionRequest {
  plan_id: string;
  years?: number;
  scenario?: 'optimistic' | 'baseline' | 'pessimistic';
}

export interface ProjectionResult {
  plan_id: string;
  years_projected: number;
  scenario: string;
  projections: YearlyProjection[];
  summary: ProjectionSummary;
}

export interface YearlyProjection {
  year: number;
  age: number;
  portfolio_value: number;
  contributions: number;
  withdrawals: number;
  investment_returns: number;
  income_sources: number;
  expenses: number;
  net_cash_flow: number;
  cumulative_contributions: number;
  cumulative_withdrawals: number;
}

export interface ProjectionSummary {
  starting_portfolio: number;
  ending_portfolio: number;
  total_contributions: number;
  total_withdrawals: number;
  total_investment_returns: number;
  portfolio_survives: boolean;
  depletion_age?: number;
  depletion_year?: number;
}

export interface WithdrawalStrategyRequest {
  plan_id: string;
  strategy: 'fixed' | 'variable' | 'guardrails' | 'bucket';
  initial_withdrawal_rate?: number;
  floor_rate?: number;
  ceiling_rate?: number;
}

export interface WithdrawalStrategyResult {
  strategy: string;
  recommended_withdrawal: number;
  first_year_withdrawal: number;
  withdrawal_schedule: WithdrawalYear[];
  success_probability: number;
}

export interface WithdrawalYear {
  year: number;
  age: number;
  withdrawal_amount: number;
  withdrawal_rate: number;
  portfolio_before: number;
  portfolio_after: number;
}

export interface RothConversionRequest {
  plan_id: string;
  conversion_amount: number;
  current_tax_bracket: number;
  expected_retirement_tax_bracket: number;
  years_until_retirement: number;
}

export interface RothConversionResult {
  should_convert: boolean;
  tax_cost_now: number;
  tax_savings_later: number;
  net_benefit: number;
  break_even_years: number;
  optimal_conversion_amount?: number;
  conversion_schedule?: ConversionYear[];
}

export interface ConversionYear {
  year: number;
  conversion_amount: number;
  tax_cost: number;
  remaining_traditional: number;
  new_roth_balance: number;
}

export interface SEPPRequest {
  plan_id: string;
  account_id: string;
  start_age: number;
  calculation_method: '72t_amortization' | '72t_annuitization' | '72t_rmd';
}

export interface SEPPResult {
  annual_distribution: number;
  monthly_distribution: number;
  calculation_method: string;
  start_age: number;
  end_age: number;
  total_years: number;
  total_distributions: number;
  interest_rate_used: number;
  life_expectancy_factor: number;
}

// Projections API methods (account-scoped)
export const retirementProjectionsApi = {
  async generate(accountId: string, data: ProjectionRequest): Promise<ProjectionResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/projections/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to generate retirement projections');
    }
    return response.json();
  },

  async withdrawalStrategy(accountId: string, data: WithdrawalStrategyRequest): Promise<WithdrawalStrategyResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/projections/withdrawal-strategy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to calculate withdrawal strategy');
    }
    return response.json();
  },

  async rothConversion(accountId: string, data: RothConversionRequest): Promise<RothConversionResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/projections/roth-conversion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to analyze Roth conversion');
    }
    return response.json();
  },

  async sepp(accountId: string, data: SEPPRequest): Promise<SEPPResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/projections/sepp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to calculate SEPP');
    }
    return response.json();
  },
};

// Cashflow types
export interface SankeyRequest {
  plan_id: string;
  year?: number;
  age?: number;
}

export interface SankeyResult {
  nodes: SankeyNode[];
  links: SankeyLink[];
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
}

export interface SankeyNode {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer' | 'savings';
  value: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface IncomeExpenseFlowRequest {
  plan_id: string;
  start_age?: number;
  end_age?: number;
}

export interface IncomeExpenseFlowResult {
  years: IncomeExpenseYear[];
  total_income: number;
  total_expenses: number;
  average_annual_surplus: number;
}

export interface IncomeExpenseYear {
  year: number;
  age: number;
  income_sources: IncomeBreakdown[];
  expense_categories: ExpenseBreakdown[];
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
}

export interface IncomeBreakdown {
  source: string;
  type: IncomeSourceType;
  amount: number;
  is_taxable: boolean;
}

export interface ExpenseBreakdown {
  category: string;
  type: RetirementExpenseType;
  amount: number;
  is_essential: boolean;
}

export interface TaxImpactRequest {
  plan_id: string;
  year?: number;
  filing_status?: 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household';
}

export interface TaxImpactResult {
  year: number;
  filing_status: string;
  gross_income: number;
  taxable_income: number;
  federal_tax: number;
  state_tax: number;
  fica_tax: number;
  total_tax: number;
  effective_tax_rate: number;
  marginal_tax_rate: number;
  income_breakdown: TaxableIncomeBreakdown[];
  deductions: TaxDeduction[];
  tax_credits: TaxCredit[];
}

export interface TaxableIncomeBreakdown {
  source: string;
  gross_amount: number;
  taxable_amount: number;
  tax_treatment: 'ordinary' | 'capital_gains' | 'qualified_dividends' | 'tax_free';
}

export interface TaxDeduction {
  name: string;
  amount: number;
  type: 'standard' | 'itemized';
}

export interface TaxCredit {
  name: string;
  amount: number;
  is_refundable: boolean;
}

// Cashflow API methods (account-scoped)
export const retirementCashflowApi = {
  async sankey(accountId: string, data: SankeyRequest): Promise<SankeyResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/cashflow/sankey`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to generate Sankey diagram data');
    }
    return response.json();
  },

  async incomeExpenseFlow(accountId: string, data: IncomeExpenseFlowRequest): Promise<IncomeExpenseFlowResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/cashflow/income-expense-flow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to generate income/expense flow');
    }
    return response.json();
  },

  async taxImpact(accountId: string, data: TaxImpactRequest): Promise<TaxImpactResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/cashflow/tax-impact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to calculate tax impact');
    }
    return response.json();
  },
};

// Backtest types
export interface BacktestRequest {
  plan_id: string;
  start_year: number;
  end_year?: number;
  initial_portfolio: number;
  annual_withdrawal: number;
  withdrawal_strategy?: 'fixed' | 'inflation_adjusted' | 'percentage';
  asset_allocation?: AssetAllocation;
}

export interface AssetAllocation {
  stocks: number;
  bonds: number;
  cash: number;
  other?: number;
}

export interface BacktestResult {
  plan_id: string;
  start_year: number;
  end_year: number;
  years_tested: number;
  initial_portfolio: number;
  final_portfolio: number;
  total_withdrawals: number;
  total_returns: number;
  success: boolean;
  failure_year?: number;
  yearly_data: BacktestYear[];
  statistics: BacktestStatistics;
}

export interface BacktestYear {
  year: number;
  starting_balance: number;
  withdrawal: number;
  market_return: number;
  inflation_rate: number;
  ending_balance: number;
  real_return: number;
}

export interface BacktestStatistics {
  average_annual_return: number;
  best_year_return: number;
  worst_year_return: number;
  max_drawdown: number;
  average_withdrawal: number;
  total_inflation_adjustment: number;
}

export interface BacktestScenario {
  id: string;
  name: string;
  description: string;
  start_year: number;
  end_year: number;
  market_conditions: string;
  average_return: number;
  worst_year: number;
  best_year: number;
}

export interface HistoricalPeriod {
  id: string;
  name: string;
  start_year: number;
  end_year: number;
  description: string;
  average_stock_return: number;
  average_bond_return: number;
  average_inflation: number;
  notable_events: string[];
}

export interface CompareStrategiesRequest {
  plan_id: string;
  strategies: BacktestStrategyInput[];
  start_year?: number;
  end_year?: number;
}

export interface BacktestStrategyInput {
  name: string;
  withdrawal_rate: number;
  asset_allocation: AssetAllocation;
  rebalancing_frequency?: 'monthly' | 'quarterly' | 'annual' | 'never';
}

export interface CompareStrategiesResult {
  strategies: StrategyComparison[];
  best_strategy: string;
  period_tested: string;
}

export interface StrategyComparison {
  name: string;
  success_rate: number;
  average_ending_balance: number;
  worst_case_balance: number;
  best_case_balance: number;
  max_drawdown: number;
  risk_adjusted_return: number;
}

// Backtest API methods (account-scoped)
export const retirementBacktestApi = {
  async runBacktest(accountId: string, data: BacktestRequest): Promise<BacktestResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/backtest/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to run backtest');
    }
    return response.json();
  },

  async scenarios(accountId: string): Promise<BacktestScenario[]> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/backtest/scenarios`);
    if (!response.ok) {
      throw new Error('Failed to fetch backtest scenarios');
    }
    return response.json();
  },

  async historicalPeriods(accountId: string): Promise<HistoricalPeriod[]> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/backtest/historical-periods`);
    if (!response.ok) {
      throw new Error('Failed to fetch historical periods');
    }
    return response.json();
  },

  async compareStrategies(accountId: string, data: CompareStrategiesRequest): Promise<CompareStrategiesResult> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/retirement/backtest/compare-strategies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to compare strategies');
    }
    return response.json();
  },
};

// ============================================================================
// Google Drive Integration API
// ============================================================================

// Google Drive OAuth types
export interface GoogleDriveOAuthInitiateRequest {
  redirect_uri?: string;
  scopes?: string[];
  state?: string;
}

export interface GoogleDriveOAuthInitiateResponse {
  authorization_url: string;
  state: string;
}

export interface GoogleDriveOAuthCallbackRequest {
  code: string;
  state: string;
  redirect_uri?: string;
}

export interface GoogleDriveOAuthCallbackResponse {
  connection_id: string;
  email: string;
  name?: string;
}

// Google Drive OAuth API methods
export const googleDriveOAuthApi = {
  async initiate(accountId: string, data?: GoogleDriveOAuthInitiateRequest): Promise<GoogleDriveOAuthInitiateResponse> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/oauth/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data || {}),
    });
    if (!response.ok) {
      throw new Error('Failed to initiate Google Drive OAuth');
    }
    return response.json();
  },

  async callback(accountId: string, data: GoogleDriveOAuthCallbackRequest): Promise<GoogleDriveOAuthCallbackResponse> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/oauth/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to complete Google Drive OAuth callback');
    }
    return response.json();
  },
};

// Google Drive Connection types
export type GoogleDriveConnectionStatus = 'pending' | 'active' | 'error' | 'disconnected' | 'expired';

export interface GoogleDriveConnection {
  id: string;
  account_id: string;
  email: string;
  name?: string;
  status: GoogleDriveConnectionStatus;
  error_code?: string;
  error_message?: string;
  last_sync_at?: string;
  next_sync_at?: string;
  token_expires_at?: string;
  storage_quota_used?: number;
  storage_quota_total?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListGoogleDriveConnectionsResponse {
  connections: GoogleDriveConnection[];
  total: number;
}

export interface ListGoogleDriveConnectionsParams {
  status?: GoogleDriveConnectionStatus;
  limit?: number;
  offset?: number;
}

// Google Drive Connections API methods (account-scoped)
export const googleDriveConnectionsApi = {
  async list(accountId: string, params?: ListGoogleDriveConnectionsParams): Promise<ListGoogleDriveConnectionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/drive/connections${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch Google Drive connections');
    }
    return response.json();
  },

  async get(accountId: string, connectionId: string): Promise<GoogleDriveConnection> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/connections/${connectionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch Google Drive connection');
    }
    return response.json();
  },

  async disconnect(accountId: string, connectionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/connections/${connectionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to disconnect Google Drive connection');
    }
  },
};

// Google Drive Folder types
export type GoogleDriveFolderStatus = 'active' | 'inactive' | 'syncing' | 'error';

export interface GoogleDriveFolder {
  id: string;
  account_id: string;
  connection_id: string;
  drive_folder_id: string;
  name: string;
  path?: string;
  status: GoogleDriveFolderStatus;
  sync_enabled: boolean;
  file_count?: number;
  last_sync_at?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListGoogleDriveFoldersResponse {
  folders: GoogleDriveFolder[];
  total: number;
}

export interface ListGoogleDriveFoldersParams {
  connection_id?: string;
  status?: GoogleDriveFolderStatus;
  sync_enabled?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateGoogleDriveFolderRequest {
  connection_id: string;
  drive_folder_id: string;
  name: string;
  path?: string;
  sync_enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateGoogleDriveFolderRequest {
  name?: string;
  sync_enabled?: boolean;
  metadata?: Record<string, unknown>;
}

// Google Drive Folders API methods (account-scoped)
export const googleDriveFoldersApi = {
  async list(accountId: string, params?: ListGoogleDriveFoldersParams): Promise<ListGoogleDriveFoldersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.connection_id) searchParams.set('connection_id', params.connection_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.sync_enabled !== undefined) searchParams.set('sync_enabled', params.sync_enabled.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/drive/folders${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch Google Drive folders');
    }
    return response.json();
  },

  async get(accountId: string, folderId: string): Promise<GoogleDriveFolder> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/folders/${folderId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch Google Drive folder');
    }
    return response.json();
  },

  async create(accountId: string, data: CreateGoogleDriveFolderRequest): Promise<GoogleDriveFolder> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create Google Drive folder');
    }
    return response.json();
  },

  async update(accountId: string, folderId: string, data: UpdateGoogleDriveFolderRequest): Promise<GoogleDriveFolder> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/folders/${folderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update Google Drive folder');
    }
    return response.json();
  },

  async delete(accountId: string, folderId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/folders/${folderId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete Google Drive folder');
    }
  },
};

// Google Drive Sync types
export type GoogleDriveSyncStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface GoogleDriveSyncStatus_Response {
  status: GoogleDriveSyncStatus;
  current_sync_id?: string;
  files_processed?: number;
  files_total?: number;
  bytes_processed?: number;
  bytes_total?: number;
  started_at?: string;
  estimated_completion?: string;
  error_message?: string;
}

export interface TriggerSyncRequest {
  folder_ids?: string[];
  force?: boolean;
}

export interface TriggerSyncResponse {
  sync_id: string;
  status: GoogleDriveSyncStatus;
  message: string;
}

export interface TriggerConnectionSyncRequest {
  force?: boolean;
}

// Google Drive Sync API methods (account-scoped)
export const googleDriveSyncApi = {
  async triggerSync(accountId: string, data?: TriggerSyncRequest): Promise<TriggerSyncResponse> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data || {}),
    });
    if (!response.ok) {
      throw new Error('Failed to trigger Google Drive sync');
    }
    return response.json();
  },

  async getSyncStatus(accountId: string): Promise<GoogleDriveSyncStatus_Response> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/sync/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch Google Drive sync status');
    }
    return response.json();
  },

  async triggerConnectionSync(accountId: string, connectionId: string, data?: TriggerConnectionSyncRequest): Promise<TriggerSyncResponse> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/connections/${connectionId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data || {}),
    });
    if (!response.ok) {
      throw new Error('Failed to trigger connection sync');
    }
    return response.json();
  },
};

// Google Drive Sync History types
export type SyncHistoryStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface GoogleDriveSyncHistory {
  id: string;
  account_id: string;
  connection_id?: string;
  folder_id?: string;
  status: SyncHistoryStatus;
  files_processed: number;
  files_total: number;
  files_added: number;
  files_updated: number;
  files_deleted: number;
  files_failed: number;
  bytes_processed: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListGoogleDriveSyncHistoryResponse {
  sync_history: GoogleDriveSyncHistory[];
  total: number;
}

export interface ListGoogleDriveSyncHistoryParams {
  connection_id?: string;
  folder_id?: string;
  status?: SyncHistoryStatus;
  limit?: number;
  offset?: number;
}

// Sync History File types
export type SyncFileStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface GoogleDriveSyncFile {
  id: string;
  sync_history_id: string;
  drive_file_id: string;
  name: string;
  mime_type: string;
  size: number;
  status: SyncFileStatus;
  error_message?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ListGoogleDriveSyncFilesResponse {
  files: GoogleDriveSyncFile[];
  total: number;
}

export interface ListGoogleDriveSyncFilesParams {
  status?: SyncFileStatus;
  limit?: number;
  offset?: number;
}

// Google Drive Sync History API methods (account-scoped)
export const googleDriveSyncHistoryApi = {
  async list(accountId: string, params?: ListGoogleDriveSyncHistoryParams): Promise<ListGoogleDriveSyncHistoryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.connection_id) searchParams.set('connection_id', params.connection_id);
    if (params?.folder_id) searchParams.set('folder_id', params.folder_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/drive/sync-history${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch Google Drive sync history');
    }
    return response.json();
  },

  async get(accountId: string, syncId: string): Promise<GoogleDriveSyncHistory> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/sync-history/${syncId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch Google Drive sync history entry');
    }
    return response.json();
  },

  async cancel(accountId: string, syncId: string): Promise<GoogleDriveSyncHistory> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/drive/sync-history/${syncId}/cancel`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to cancel Google Drive sync');
    }
    return response.json();
  },

  async listFiles(accountId: string, syncId: string, params?: ListGoogleDriveSyncFilesParams): Promise<ListGoogleDriveSyncFilesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/drive/sync-history/${syncId}/files${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch Google Drive sync files');
    }
    return response.json();
  },
};

// ============================================================================
// Email Integration API
// ============================================================================

// Email OAuth types
export interface EmailOAuthInitiateRequest {
  redirect_uri?: string;
  scopes?: string[];
  state?: string;
  provider?: EmailProvider;
}

export interface EmailOAuthInitiateResponse {
  authorization_url: string;
  state: string;
}

export interface EmailOAuthCallbackRequest {
  code: string;
  state: string;
  redirect_uri?: string;
}

export interface EmailOAuthCallbackResponse {
  connection_id: string;
  email: string;
  name?: string;
}

// Email OAuth API methods
export const emailOAuthApi = {
  async initiate(accountId: string, data?: EmailOAuthInitiateRequest): Promise<EmailOAuthInitiateResponse> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/oauth/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data || {}),
    });
    if (!response.ok) {
      throw new Error('Failed to initiate Email OAuth');
    }
    return response.json();
  },

  async callback(accountId: string, data: EmailOAuthCallbackRequest): Promise<EmailOAuthCallbackResponse> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/oauth/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to complete Email OAuth callback');
    }
    return response.json();
  },
};

// Email Connection types
export type EmailConnectionStatus = 'pending' | 'active' | 'error' | 'disconnected' | 'expired';
export type EmailProvider = 'gmail' | 'outlook' | 'imap';

export interface EmailConnection {
  id: string;
  account_id: string;
  email: string;
  name?: string;
  provider: EmailProvider;
  status: EmailConnectionStatus;
  error_code?: string;
  error_message?: string;
  last_sync_at?: string;
  next_sync_at?: string;
  token_expires_at?: string;
  message_count?: number;
  unread_count?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListEmailConnectionsResponse {
  connections: EmailConnection[];
  total: number;
}

export interface ListEmailConnectionsParams {
  status?: EmailConnectionStatus;
  provider?: EmailProvider;
  limit?: number;
  offset?: number;
}

// Email Connections API methods (account-scoped)
export const emailConnectionsApi = {
  async list(accountId: string, params?: ListEmailConnectionsParams): Promise<ListEmailConnectionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.provider) searchParams.set('provider', params.provider);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/email/connections${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch email connections');
    }
    return response.json();
  },

  async get(accountId: string, connectionId: string): Promise<EmailConnection> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/connections/${connectionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch email connection');
    }
    return response.json();
  },

  async disconnect(accountId: string, connectionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/connections/${connectionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to disconnect email connection');
    }
  },
};

// Email Label types
export type EmailLabelStatus = 'active' | 'inactive' | 'syncing' | 'error';

export interface EmailLabel {
  id: string;
  account_id: string;
  connection_id: string;
  provider_label_id: string;
  name: string;
  type: 'system' | 'user';
  status: EmailLabelStatus;
  sync_enabled: boolean;
  message_count?: number;
  last_sync_at?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListEmailLabelsResponse {
  labels: EmailLabel[];
  total: number;
}

export interface ListEmailLabelsParams {
  connection_id?: string;
  status?: EmailLabelStatus;
  sync_enabled?: boolean;
  type?: 'system' | 'user';
  limit?: number;
  offset?: number;
}

export interface CreateEmailLabelRequest {
  connection_id: string;
  provider_label_id: string;
  name: string;
  type?: 'system' | 'user';
  sync_enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateEmailLabelRequest {
  name?: string;
  sync_enabled?: boolean;
  metadata?: Record<string, unknown>;
}

// Email Labels API methods (account-scoped)
export const emailLabelsApi = {
  async list(accountId: string, params?: ListEmailLabelsParams): Promise<ListEmailLabelsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.connection_id) searchParams.set('connection_id', params.connection_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.sync_enabled !== undefined) searchParams.set('sync_enabled', params.sync_enabled.toString());
    if (params?.type) searchParams.set('type', params.type);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/email/labels${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch email labels');
    }
    return response.json();
  },

  async get(accountId: string, labelId: string): Promise<EmailLabel> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/labels/${labelId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch email label');
    }
    return response.json();
  },

  async create(accountId: string, data: CreateEmailLabelRequest): Promise<EmailLabel> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/labels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create email label');
    }
    return response.json();
  },

  async update(accountId: string, labelId: string, data: UpdateEmailLabelRequest): Promise<EmailLabel> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/labels/${labelId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update email label');
    }
    return response.json();
  },

  async delete(accountId: string, labelId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/labels/${labelId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete email label');
    }
  },

  async fetchFromProvider(accountId: string, connectionId: string): Promise<ListEmailLabelsResponse> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/connections/${connectionId}/labels/fetch`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch labels from provider');
    }
    return response.json();
  },
};

// Email Sync types
export type EmailSyncStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface EmailSyncStatus_Response {
  status: EmailSyncStatus;
  current_sync_id?: string;
  messages_processed?: number;
  messages_total?: number;
  started_at?: string;
  estimated_completion?: string;
  error_message?: string;
}

export interface TriggerEmailSyncRequest {
  label_ids?: string[];
  force?: boolean;
}

export interface TriggerEmailSyncResponse {
  sync_id: string;
  status: EmailSyncStatus;
  message: string;
}

// Email Sync API methods (account-scoped)
export const emailSyncApi = {
  async triggerSync(accountId: string, data?: TriggerEmailSyncRequest): Promise<TriggerEmailSyncResponse> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data || {}),
    });
    if (!response.ok) {
      throw new Error('Failed to trigger email sync');
    }
    return response.json();
  },

  async getSyncStatus(accountId: string): Promise<EmailSyncStatus_Response> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/sync/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch email sync status');
    }
    return response.json();
  },

  async triggerConnectionSync(accountId: string, connectionId: string, data?: { force?: boolean }): Promise<TriggerEmailSyncResponse> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/connections/${connectionId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data || {}),
    });
    if (!response.ok) {
      throw new Error('Failed to trigger connection sync');
    }
    return response.json();
  },
};

// Email Sync History types
export interface EmailSyncHistory {
  id: string;
  account_id: string;
  connection_id?: string;
  label_id?: string;
  status: SyncHistoryStatus;
  messages_processed: number;
  messages_total: number;
  messages_added: number;
  messages_updated: number;
  messages_deleted: number;
  messages_failed: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ListEmailSyncHistoryResponse {
  sync_history: EmailSyncHistory[];
  total: number;
}

export interface ListEmailSyncHistoryParams {
  connection_id?: string;
  label_id?: string;
  status?: SyncHistoryStatus;
  limit?: number;
  offset?: number;
}

// Email Sync History API methods (account-scoped)
export const emailSyncHistoryApi = {
  async list(accountId: string, params?: ListEmailSyncHistoryParams): Promise<ListEmailSyncHistoryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.connection_id) searchParams.set('connection_id', params.connection_id);
    if (params?.label_id) searchParams.set('label_id', params.label_id);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/email/sync-history${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch email sync history');
    }
    return response.json();
  },

  async get(accountId: string, syncId: string): Promise<EmailSyncHistory> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/sync-history/${syncId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch email sync history entry');
    }
    return response.json();
  },

  async cancel(accountId: string, syncId: string): Promise<EmailSyncHistory> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/email/sync-history/${syncId}/cancel`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to cancel email sync');
    }
    return response.json();
  },
};

// Document Folder types
export interface CoverImagePosition {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  scale: number; // 1.0 = 100%
}

export interface DocumentFolder {
  id: string;
  account_id: string;
  name: string;
  parent_id: string | null;
  level: number; // 0, 1, or 2 (max 3 levels of nesting)
  position: number; // For ordering within parent
  document_count: number;
  is_expanded: boolean;
  cover_image_url: string | null;
  cover_image_position: CoverImagePosition | null;
  created_at: string;
  updated_at: string;
}

export interface ListDocumentFoldersResponse {
  folders: DocumentFolder[];
  total: number;
}

export interface CreateDocumentFolderRequest {
  name: string;
  parent_id?: string | null;
}

export interface UpdateDocumentFolderRequest {
  name?: string;
  parent_id?: string | null;
  position?: number;
  is_expanded?: boolean;
  cover_image_url?: string | null;
  cover_image_position?: CoverImagePosition | null;
}

export interface ListDocumentFoldersParams {
  parent_id?: string | null;
}

// Document Folder API methods (account-scoped)
export const documentFoldersApi = {
  async list(accountId: string, params?: ListDocumentFoldersParams): Promise<ListDocumentFoldersResponse> {
    const searchParams = new URLSearchParams();
    if (params?.parent_id !== undefined) {
      searchParams.set('parent_id', params.parent_id ?? 'null');
    }

    const query = searchParams.toString();
    const url = `${API_BASE}/accounts/${accountId}/document-folders${query ? `?${query}` : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch document folders');
    }
    return response.json();
  },

  async get(accountId: string, folderId: string): Promise<DocumentFolder> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/document-folders/${folderId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch document folder');
    }
    return response.json();
  },

  async create(accountId: string, data: CreateDocumentFolderRequest): Promise<DocumentFolder> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/document-folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to create document folder');
    }
    return response.json();
  },

  async update(accountId: string, folderId: string, data: UpdateDocumentFolderRequest): Promise<DocumentFolder> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/document-folders/${folderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update document folder');
    }
    return response.json();
  },

  async delete(accountId: string, folderId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/document-folders/${folderId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete document folder');
    }
  },

  async moveDocument(accountId: string, documentId: string, folderId: string | null): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/documents/${documentId}/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ folder_id: folderId }),
    });
    if (!response.ok) {
      throw new Error('Failed to move document');
    }
  },

  async uploadCoverImage(accountId: string, folderId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/accounts/${accountId}/document-folders/${folderId}/cover-image`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Failed to upload cover image');
    }
    return response.json();
  },

  async removeCoverImage(accountId: string, folderId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/document-folders/${folderId}/cover-image`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to remove cover image');
    }
  },
};
