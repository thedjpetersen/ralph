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
