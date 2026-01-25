import { useEffect, useState, useCallback } from 'react';
import { useCategoriesStore, type Category, type CategoryStatus, type CreateCategoryRequest, type UpdateCategoryRequest } from '../stores/categories';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import './Categories.css';

const STATUS_OPTIONS: { value: CategoryStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

interface CategoryFormData {
  name: string;
  display_name: string;
  description: string;
  parent_id: string;
}

const initialFormData: CategoryFormData = {
  name: '',
  display_name: '',
  description: '',
  parent_id: '',
};

interface CategoryTreeItemProps {
  category: Category;
  level: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onAddChild: (parentId: string) => void;
}

function CategoryTreeItem({
  category,
  level,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
}: CategoryTreeItemProps) {
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);

  const getStatusClass = (status: CategoryStatus) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      default:
        return '';
    }
  };

  return (
    <div className="category-tree-item">
      <div
        className="category-tree-row"
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        {hasChildren ? (
          <button
            className="expand-button"
            onClick={() => onToggle(category.id)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="expand-spacer"></span>
        )}
        <div className="category-info">
          <span className="category-name">
            {category.display_name || category.name}
          </span>
          <span className={`category-status ${getStatusClass(category.status)}`}>
            {category.status}
          </span>
          <span className="category-count">{category.product_count} products</span>
        </div>
        <div className="category-actions">
          <button
            onClick={() => onAddChild(category.id)}
            className="add-child-button"
            title="Add subcategory"
          >
            +
          </button>
          <button
            onClick={() => onEdit(category)}
            className="edit-category-button"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(category)}
            className="delete-category-button"
          >
            Delete
          </button>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="category-children">
          {category.children!.map((child) => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Categories() {
  const {
    categories,
    isLoading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategoriesStore();

  const [statusFilter, setStatusFilter] = useState<CategoryStatus | ''>('');
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initial load
  useEffect(() => {
    fetchCategories({ status: statusFilter || undefined, tree: viewMode === 'tree' });
  }, [statusFilter, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as CategoryStatus | '');
  }, []);

  const handleViewModeChange = useCallback((mode: 'tree' | 'flat') => {
    setViewMode(mode);
    if (mode === 'tree') {
      // Expand root level by default
      const rootIds = categories.filter(c => !c.parent_id).map(c => c.id);
      setExpandedIds(new Set(rootIds));
    }
  }, [categories]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const getStatusClass = (status: CategoryStatus) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      default:
        return '';
    }
  };

  const openCreateModal = (parentId?: string) => {
    setFormData({ ...initialFormData, parent_id: parentId || '' });
    setEditingCategory(null);
    setSaveError(null);
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setFormData({
      name: category.name,
      display_name: category.display_name || '',
      description: category.description || '',
      parent_id: category.parent_id || '',
    });
    setEditingCategory(category);
    setSaveError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData(initialFormData);
    setSaveError(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const categoryData: CreateCategoryRequest | UpdateCategoryRequest = {
      name: formData.name,
      display_name: formData.display_name || undefined,
      description: formData.description || undefined,
      parent_id: formData.parent_id || undefined,
    };

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryData);
      } else {
        await createCategory(categoryData as CreateCategoryRequest);
      }
      closeModal();
      fetchCategories({ status: statusFilter || undefined, tree: viewMode === 'tree' });
    } catch {
      setSaveError(editingCategory ? 'Failed to update category' : 'Failed to create category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    setIsDeleting(true);
    try {
      await deleteCategory(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
      fetchCategories({ status: statusFilter || undefined, tree: viewMode === 'tree' });
    } catch {
      // Error handled by store
    } finally {
      setIsDeleting(false);
    }
  };

  // Get flat list of categories for parent selection
  const getFlatCategoriesForSelect = (): Category[] => {
    const result: Category[] = [];
    const flatten = (cats: Category[], level: number = 0) => {
      for (const cat of cats) {
        result.push({ ...cat, level });
        if (cat.children) {
          flatten(cat.children, level + 1);
        }
      }
    };
    flatten(categories);
    return result.filter(c => !editingCategory || c.id !== editingCategory.id);
  };

  if (isLoading && categories.length === 0) {
    return (
      <PageTransition>
        <div className="categories-page">
          <div className="categories-header">
            <h1>Categories</h1>
            <p className="categories-subtitle">Manage product categories</p>
          </div>
          <AccountsListSkeleton count={6} />
        </div>
      </PageTransition>
    );
  }

  if (error && categories.length === 0) {
    return (
      <PageTransition>
        <div className="categories-page">
          <div className="categories-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => fetchCategories()} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="categories-page">
        <div className="categories-header">
          <div className="categories-header-row">
            <div>
              <h1>Categories</h1>
              <p className="categories-subtitle">Manage product categories</p>
            </div>
            <button onClick={() => openCreateModal()} className="create-category-button">
              Add Category
            </button>
          </div>
        </div>

        <div className="categories-filters">
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
          <div className="view-toggle">
            <button
              className={`view-toggle-button ${viewMode === 'tree' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('tree')}
            >
              Tree View
            </button>
            <button
              className={`view-toggle-button ${viewMode === 'flat' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('flat')}
            >
              List View
            </button>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="categories-empty">
            <h2>No Categories Found</h2>
            <p>You don't have any categories yet.</p>
            <button onClick={() => openCreateModal()} className="create-category-link">
              Add your first category
            </button>
          </div>
        ) : viewMode === 'tree' ? (
          <div className="categories-tree">
            {categories.filter(c => !c.parent_id).map((category) => (
              <CategoryTreeItem
                key={category.id}
                category={category}
                level={0}
                expandedIds={expandedIds}
                onToggle={toggleExpanded}
                onEdit={openEditModal}
                onDelete={setShowDeleteConfirm}
                onAddChild={(parentId) => openCreateModal(parentId)}
              />
            ))}
          </div>
        ) : (
          <div className="categories-list">
            {categories.map((category) => (
              <div key={category.id} className="category-list-item">
                <div className="category-list-info">
                  <span className="category-list-name">
                    {category.display_name || category.name}
                  </span>
                  {category.path && (
                    <span className="category-list-path">{category.path}</span>
                  )}
                  <span className={`category-status ${getStatusClass(category.status)}`}>
                    {category.status}
                  </span>
                  <span className="category-count">{category.product_count} products</span>
                </div>
                <div className="category-list-actions">
                  <button
                    onClick={() => openEditModal(category)}
                    className="edit-category-button"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(category)}
                    className="delete-category-button"
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
              <h3>{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Category Name *
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
                    placeholder="e.g., Beverages"
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
                    placeholder="e.g., Beverages & Drinks"
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
                  <label htmlFor="parent_id" className="form-label">
                    Parent Category
                  </label>
                  <select
                    id="parent_id"
                    name="parent_id"
                    value={formData.parent_id}
                    onChange={handleInputChange}
                    className="form-select"
                  >
                    <option value="">None (Top Level)</option>
                    {getFlatCategoriesForSelect().map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {'  '.repeat(cat.level)}{cat.display_name || cat.name}
                      </option>
                    ))}
                  </select>
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
                      ? editingCategory
                        ? 'Saving...'
                        : 'Creating...'
                      : editingCategory
                        ? 'Save Changes'
                        : 'Add Category'}
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
              <h3>Delete Category</h3>
              <p>
                Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?
                {showDeleteConfirm.children && showDeleteConfirm.children.length > 0 && (
                  <span className="delete-warning">
                    {' '}This category has subcategories that will also be affected.
                  </span>
                )}
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
                  {isDeleting ? 'Deleting...' : 'Delete Category'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
