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

// Line Items API methods (account-scoped, nested under transactions)
export const lineItemsApi = {
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
