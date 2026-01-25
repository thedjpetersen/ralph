import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProductsStore, type Product, type ProductStatus } from '../stores/products';
import { PageTransition } from '../components/PageTransition';
import { SettingsFormSkeleton } from '../components/skeletons';
import './ProductDetail.css';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProduct, products, isLoading, error, fetchProduct, deleteProduct } =
    useProductsStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (id) {
      const existingProduct = products.find((p) => p.id === id);
      if (existingProduct) {
        setProduct(existingProduct);
      } else {
        fetchProduct(id)
          .then((fetched) => {
            setProduct(fetched);
          })
          .catch(() => {
            // Error is handled by the store
          });
      }
    }
  }, [id, products, fetchProduct]);

  // Update local product when currentProduct changes
  useEffect(() => {
    if (currentProduct && currentProduct.id === id) {
      setProduct(currentProduct);
    }
  }, [currentProduct, id]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteProduct(id);
      navigate('/products');
    } catch {
      setDeleteError('Failed to delete product');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

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
    if (price === undefined || price === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatNutritionValue = (value?: number, unit?: string) => {
    if (value === undefined || value === null) return null;
    return `${value}${unit || ''}`;
  };

  if (isLoading && !product) {
    return (
      <PageTransition>
        <div className="product-detail-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && !product) {
    return (
      <PageTransition>
        <div className="product-detail-page">
          <div className="detail-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/products')} className="back-button">
              Back to Products
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!product) {
    return (
      <PageTransition>
        <div className="product-detail-page">
          <div className="detail-error">
            <h2>Product Not Found</h2>
            <p>The product you're looking for doesn't exist.</p>
            <button onClick={() => navigate('/products')} className="back-button">
              Back to Products
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="product-detail-page">
        <div className="detail-header">
          <Link to="/products" className="back-link">
            &larr; Back to Products
          </Link>
          <div className="detail-header-row">
            <div className="detail-header-info">
              {product.image_url && (
                <div className="product-image-large">
                  <img src={product.image_url} alt={product.name} />
                </div>
              )}
              <div>
                <h1>{product.display_name || product.name}</h1>
                <div className="detail-meta">
                  <span className={`product-status ${getStatusClass(product.status)}`}>
                    {product.status}
                  </span>
                  {product.brand_name && (
                    <span className="product-brand">{product.brand_name}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="detail-actions">
              <Link to={`/products/${product.id}/edit`} className="edit-button">
                Edit Product
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="delete-button"
                disabled={isDeleting}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {deleteError && <div className="detail-error-message">{deleteError}</div>}

        <div className="detail-content">
          {product.description && (
            <div className="detail-section">
              <h2>Description</h2>
              <p className="detail-description">{product.description}</p>
            </div>
          )}

          <div className="detail-section">
            <h2>Product Information</h2>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Price</span>
                <span className="detail-value">{formatPrice(product.price)}</span>
              </div>
              {product.upc && (
                <div className="detail-item">
                  <span className="detail-label">UPC</span>
                  <span className="detail-value">{product.upc}</span>
                </div>
              )}
              {product.sku && (
                <div className="detail-item">
                  <span className="detail-label">SKU</span>
                  <span className="detail-value">{product.sku}</span>
                </div>
              )}
              {product.category_name && (
                <div className="detail-item">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{product.category_name}</span>
                </div>
              )}
              {product.unit && (
                <div className="detail-item">
                  <span className="detail-label">Unit</span>
                  <span className="detail-value">
                    {product.unit_quantity} {product.unit}
                  </span>
                </div>
              )}
            </div>
          </div>

          {product.nutrition && (
            <div className="detail-section">
              <h2>Nutrition Facts</h2>
              <div className="nutrition-panel">
                {product.nutrition.serving_size && (
                  <div className="nutrition-serving">
                    <span className="nutrition-serving-label">Serving Size</span>
                    <span className="nutrition-serving-value">{product.nutrition.serving_size}</span>
                  </div>
                )}
                {product.nutrition.servings_per_container && (
                  <div className="nutrition-serving">
                    <span className="nutrition-serving-label">Servings Per Container</span>
                    <span className="nutrition-serving-value">{product.nutrition.servings_per_container}</span>
                  </div>
                )}
                <div className="nutrition-divider"></div>
                <div className="nutrition-grid">
                  {product.nutrition.calories !== undefined && (
                    <div className="nutrition-item nutrition-calories">
                      <span className="nutrition-label">Calories</span>
                      <span className="nutrition-value">{product.nutrition.calories}</span>
                    </div>
                  )}
                  {formatNutritionValue(product.nutrition.total_fat, 'g') && (
                    <div className="nutrition-item">
                      <span className="nutrition-label">Total Fat</span>
                      <span className="nutrition-value">{formatNutritionValue(product.nutrition.total_fat, 'g')}</span>
                    </div>
                  )}
                  {formatNutritionValue(product.nutrition.saturated_fat, 'g') && (
                    <div className="nutrition-item nutrition-indent">
                      <span className="nutrition-label">Saturated Fat</span>
                      <span className="nutrition-value">{formatNutritionValue(product.nutrition.saturated_fat, 'g')}</span>
                    </div>
                  )}
                  {formatNutritionValue(product.nutrition.trans_fat, 'g') && (
                    <div className="nutrition-item nutrition-indent">
                      <span className="nutrition-label">Trans Fat</span>
                      <span className="nutrition-value">{formatNutritionValue(product.nutrition.trans_fat, 'g')}</span>
                    </div>
                  )}
                  {formatNutritionValue(product.nutrition.cholesterol, 'mg') && (
                    <div className="nutrition-item">
                      <span className="nutrition-label">Cholesterol</span>
                      <span className="nutrition-value">{formatNutritionValue(product.nutrition.cholesterol, 'mg')}</span>
                    </div>
                  )}
                  {formatNutritionValue(product.nutrition.sodium, 'mg') && (
                    <div className="nutrition-item">
                      <span className="nutrition-label">Sodium</span>
                      <span className="nutrition-value">{formatNutritionValue(product.nutrition.sodium, 'mg')}</span>
                    </div>
                  )}
                  {formatNutritionValue(product.nutrition.total_carbohydrates, 'g') && (
                    <div className="nutrition-item">
                      <span className="nutrition-label">Total Carbohydrates</span>
                      <span className="nutrition-value">{formatNutritionValue(product.nutrition.total_carbohydrates, 'g')}</span>
                    </div>
                  )}
                  {formatNutritionValue(product.nutrition.dietary_fiber, 'g') && (
                    <div className="nutrition-item nutrition-indent">
                      <span className="nutrition-label">Dietary Fiber</span>
                      <span className="nutrition-value">{formatNutritionValue(product.nutrition.dietary_fiber, 'g')}</span>
                    </div>
                  )}
                  {formatNutritionValue(product.nutrition.sugars, 'g') && (
                    <div className="nutrition-item nutrition-indent">
                      <span className="nutrition-label">Sugars</span>
                      <span className="nutrition-value">{formatNutritionValue(product.nutrition.sugars, 'g')}</span>
                    </div>
                  )}
                  {formatNutritionValue(product.nutrition.protein, 'g') && (
                    <div className="nutrition-item">
                      <span className="nutrition-label">Protein</span>
                      <span className="nutrition-value">{formatNutritionValue(product.nutrition.protein, 'g')}</span>
                    </div>
                  )}
                </div>
                {(product.nutrition.vitamin_a !== undefined ||
                  product.nutrition.vitamin_c !== undefined ||
                  product.nutrition.calcium !== undefined ||
                  product.nutrition.iron !== undefined) && (
                  <>
                    <div className="nutrition-divider"></div>
                    <div className="nutrition-vitamins">
                      {formatNutritionValue(product.nutrition.vitamin_a, '%') && (
                        <span>Vitamin A {formatNutritionValue(product.nutrition.vitamin_a, '%')}</span>
                      )}
                      {formatNutritionValue(product.nutrition.vitamin_c, '%') && (
                        <span>Vitamin C {formatNutritionValue(product.nutrition.vitamin_c, '%')}</span>
                      )}
                      {formatNutritionValue(product.nutrition.calcium, '%') && (
                        <span>Calcium {formatNutritionValue(product.nutrition.calcium, '%')}</span>
                      )}
                      {formatNutritionValue(product.nutrition.iron, '%') && (
                        <span>Iron {formatNutritionValue(product.nutrition.iron, '%')}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {product.ingredients && (
            <div className="detail-section">
              <h2>Ingredients</h2>
              <p className="detail-ingredients">{product.ingredients}</p>
            </div>
          )}

          {product.allergens && product.allergens.length > 0 && (
            <div className="detail-section">
              <h2>Allergens</h2>
              <div className="detail-list">
                {product.allergens.map((allergen, index) => (
                  <span key={index} className="detail-chip allergen-chip">
                    {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.tags && product.tags.length > 0 && (
            <div className="detail-section">
              <h2>Tags</h2>
              <div className="detail-list">
                {product.tags.map((tag, index) => (
                  <span key={index} className="detail-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section detail-timestamps">
            <div className="timestamp-item">
              <span className="detail-label">Created</span>
              <span className="detail-value">
                {new Date(product.created_at).toLocaleString()}
              </span>
            </div>
            <div className="timestamp-item">
              <span className="detail-label">Updated</span>
              <span className="detail-value">
                {new Date(product.updated_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="delete-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Product</h3>
              <p>
                Are you sure you want to delete <strong>{product.name}</strong>?
                This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="cancel-button"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="confirm-delete-button"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Product'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
