import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useProductsStore, type ProductStatus } from '../stores/products';
import { useBrandsStore } from '../stores/brands';
import { useCategoriesStore } from '../stores/categories';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import './Products.css';

const STATUS_OPTIONS: { value: ProductStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'discontinued', label: 'Discontinued' },
];

export function Products() {
  const {
    products,
    isLoading,
    error,
    searchQuery,
    fetchProducts,
    searchProducts,
    setSearchQuery,
  } = useProductsStore();

  const { brands, fetchBrands } = useBrandsStore();
  const { categories, fetchCategories } = useCategoriesStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('');
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Load brands and categories for filters
  useEffect(() => {
    fetchBrands();
    fetchCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        if (localSearch.trim()) {
          searchProducts({
            query: localSearch,
            status: statusFilter || undefined,
            brand_id: brandFilter || undefined,
            category_id: categoryFilter || undefined,
          });
        } else {
          setSearchQuery('');
          fetchProducts({
            status: statusFilter || undefined,
            brand_id: brandFilter || undefined,
            category_id: categoryFilter || undefined,
          });
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, statusFilter, brandFilter, categoryFilter, searchProducts, setSearchQuery, fetchProducts]);

  // Filter changes
  useEffect(() => {
    if (!localSearch.trim()) {
      fetchProducts({
        status: statusFilter || undefined,
        brand_id: brandFilter || undefined,
        category_id: categoryFilter || undefined,
      });
    } else {
      searchProducts({
        query: localSearch,
        status: statusFilter || undefined,
        brand_id: brandFilter || undefined,
        category_id: categoryFilter || undefined,
      });
    }
  }, [statusFilter, brandFilter, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
  }, []);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as ProductStatus | '');
  }, []);

  const handleBrandChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setBrandFilter(e.target.value);
  }, []);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
  }, []);

  const getStatusClass = (status: ProductStatus) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'discontinued':
        return 'status-discontinued';
      default:
        return '';
    }
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (isLoading && products.length === 0) {
    return (
      <PageTransition>
        <div className="products-page">
          <div className="products-header">
            <h1>Products</h1>
            <p className="products-subtitle">Manage product catalog</p>
          </div>
          <AccountsListSkeleton count={6} />
        </div>
      </PageTransition>
    );
  }

  if (error && products.length === 0) {
    return (
      <PageTransition>
        <div className="products-page">
          <div className="products-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => fetchProducts()} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="products-page">
        <div className="products-header">
          <div className="products-header-row">
            <div>
              <h1>Products</h1>
              <p className="products-subtitle">Manage product catalog</p>
            </div>
            <Link to="/products/new" className="create-product-button">
              Add Product
            </Link>
          </div>
        </div>

        <div className="products-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search products..."
              value={localSearch}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="filter-select"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            value={brandFilter}
            onChange={handleBrandChange}
            className="filter-select"
          >
            <option value="">All Brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.display_name || brand.name}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={handleCategoryChange}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.display_name || category.name}
              </option>
            ))}
          </select>
        </div>

        {products.length === 0 ? (
          <div className="products-empty">
            <h2>No Products Found</h2>
            <p>
              {localSearch
                ? 'No products match your search criteria.'
                : "You don't have any products yet."}
            </p>
            {!localSearch && (
              <Link to="/products/new" className="create-product-link">
                Add your first product
              </Link>
            )}
          </div>
        ) : (
          <div className="products-grid">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="product-card"
              >
                <div className="product-card-header">
                  {product.image_url && (
                    <div className="product-image">
                      <img src={product.image_url} alt={product.name} />
                    </div>
                  )}
                  <div className="product-card-info">
                    <h3 className="product-card-name">
                      {product.display_name || product.name}
                    </h3>
                    <span className={`product-status ${getStatusClass(product.status)}`}>
                      {product.status}
                    </span>
                  </div>
                </div>
                {product.brand_name && (
                  <div className="product-card-brand">{product.brand_name}</div>
                )}
                {product.description && (
                  <p className="product-card-description">{product.description}</p>
                )}
                <div className="product-card-details">
                  {product.price !== undefined && (
                    <div className="product-detail">
                      <span className="detail-label">Price</span>
                      <span className="detail-value">{formatPrice(product.price)}</span>
                    </div>
                  )}
                  {product.upc && (
                    <div className="product-detail">
                      <span className="detail-label">UPC</span>
                      <span className="detail-value">{product.upc}</span>
                    </div>
                  )}
                  {product.category_name && (
                    <div className="product-detail">
                      <span className="detail-label">Category</span>
                      <span className="detail-value">{product.category_name}</span>
                    </div>
                  )}
                </div>
                {product.tags && product.tags.length > 0 && (
                  <div className="product-card-tags">
                    {product.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="product-tag">
                        {tag}
                      </span>
                    ))}
                    {product.tags.length > 3 && (
                      <span className="product-tag-more">
                        +{product.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
