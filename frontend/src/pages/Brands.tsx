import { useEffect, useState, useCallback } from 'react';
import { useBrandsStore, type Brand, type BrandStatus, type CreateBrandRequest, type UpdateBrandRequest } from '../stores/brands';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import './Brands.css';

const STATUS_OPTIONS: { value: BrandStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

interface BrandFormData {
  name: string;
  display_name: string;
  description: string;
  website: string;
  logo_url: string;
}

const initialFormData: BrandFormData = {
  name: '',
  display_name: '',
  description: '',
  website: '',
  logo_url: '',
};

export function Brands() {
  const {
    brands,
    isLoading,
    error,
    fetchBrands,
    createBrand,
    updateBrand,
    deleteBrand,
  } = useBrandsStore();

  const [statusFilter, setStatusFilter] = useState<BrandStatus | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState<BrandFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initial load
  useEffect(() => {
    fetchBrands({ status: statusFilter || undefined });
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as BrandStatus | '');
  }, []);

  const getStatusClass = (status: BrandStatus) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      default:
        return '';
    }
  };

  const openCreateModal = () => {
    setFormData(initialFormData);
    setEditingBrand(null);
    setSaveError(null);
    setShowModal(true);
  };

  const openEditModal = (brand: Brand) => {
    setFormData({
      name: brand.name,
      display_name: brand.display_name || '',
      description: brand.description || '',
      website: brand.website || '',
      logo_url: brand.logo_url || '',
    });
    setEditingBrand(brand);
    setSaveError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBrand(null);
    setFormData(initialFormData);
    setSaveError(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const brandData: CreateBrandRequest | UpdateBrandRequest = {
      name: formData.name,
      display_name: formData.display_name || undefined,
      description: formData.description || undefined,
      website: formData.website || undefined,
      logo_url: formData.logo_url || undefined,
    };

    try {
      if (editingBrand) {
        await updateBrand(editingBrand.id, brandData);
      } else {
        await createBrand(brandData as CreateBrandRequest);
      }
      closeModal();
      fetchBrands({ status: statusFilter || undefined });
    } catch {
      setSaveError(editingBrand ? 'Failed to update brand' : 'Failed to create brand');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    setIsDeleting(true);
    try {
      await deleteBrand(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
      fetchBrands({ status: statusFilter || undefined });
    } catch {
      // Error handled by store
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading && brands.length === 0) {
    return (
      <PageTransition>
        <div className="brands-page">
          <div className="brands-header">
            <h1>Brands</h1>
            <p className="brands-subtitle">Manage product brands</p>
          </div>
          <AccountsListSkeleton count={6} />
        </div>
      </PageTransition>
    );
  }

  if (error && brands.length === 0) {
    return (
      <PageTransition>
        <div className="brands-page">
          <div className="brands-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => fetchBrands()} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="brands-page">
        <div className="brands-header">
          <div className="brands-header-row">
            <div>
              <h1>Brands</h1>
              <p className="brands-subtitle">Manage product brands</p>
            </div>
            <button onClick={openCreateModal} className="create-brand-button">
              Add Brand
            </button>
          </div>
        </div>

        <div className="brands-filters">
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
        </div>

        {brands.length === 0 ? (
          <div className="brands-empty">
            <h2>No Brands Found</h2>
            <p>You don't have any brands yet.</p>
            <button onClick={openCreateModal} className="create-brand-link">
              Add your first brand
            </button>
          </div>
        ) : (
          <div className="brands-grid">
            {brands.map((brand) => (
              <div key={brand.id} className="brand-card">
                <div className="brand-card-header">
                  {brand.logo_url && (
                    <div className="brand-logo">
                      <img src={brand.logo_url} alt={brand.name} />
                    </div>
                  )}
                  <div className="brand-card-info">
                    <h3 className="brand-card-name">
                      {brand.display_name || brand.name}
                    </h3>
                    <span className={`brand-status ${getStatusClass(brand.status)}`}>
                      {brand.status}
                    </span>
                  </div>
                </div>
                {brand.description && (
                  <p className="brand-card-description">{brand.description}</p>
                )}
                <div className="brand-card-details">
                  <div className="brand-detail">
                    <span className="detail-label">Products</span>
                    <span className="detail-value">{brand.product_count}</span>
                  </div>
                  {brand.website && (
                    <div className="brand-detail">
                      <span className="detail-label">Website</span>
                      <a
                        href={brand.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="detail-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Visit
                      </a>
                    </div>
                  )}
                </div>
                <div className="brand-card-actions">
                  <button
                    onClick={() => openEditModal(brand)}
                    className="edit-brand-button"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(brand)}
                    className="delete-brand-button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>{editingBrand ? 'Edit Brand' : 'Add Brand'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    minLength={1}
                    maxLength={200}
                    placeholder="e.g., Coca-Cola"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="display_name" className="form-label">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="display_name"
                    name="display_name"
                    value={formData.display_name}
                    onChange={handleInputChange}
                    className="form-input"
                    maxLength={200}
                    placeholder="e.g., Coca-Cola Company"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="form-textarea"
                    rows={3}
                    maxLength={1000}
                    placeholder="Brief description..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="website" className="form-label">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="logo_url" className="form-label">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    id="logo_url"
                    name="logo_url"
                    value={formData.logo_url}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                {saveError && <div className="form-error">{saveError}</div>}

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="cancel-button"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="save-button" disabled={isSaving}>
                    {isSaving
                      ? editingBrand
                        ? 'Saving...'
                        : 'Creating...'
                      : editingBrand
                        ? 'Save Changes'
                        : 'Add Brand'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Brand</h3>
              <p>
                Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?
                This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
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
                  {isDeleting ? 'Deleting...' : 'Delete Brand'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
