import { useEffect, useState, useCallback } from 'react';
import { categoriesApi, type Category } from '../api/client';
import './CategoryAssigner.css';

interface CategoryAssignerProps {
  currentCategoryId?: string;
  onSelect: (categoryId: string) => void;
  onCancel: () => void;
}

export function CategoryAssigner({ currentCategoryId, onSelect, onCancel }: CategoryAssignerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(currentCategoryId);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await categoriesApi.list({ tree: true, status: 'active' });
        setCategories(response.categories);

        // Auto-expand parent categories if a category is currently selected
        if (currentCategoryId) {
          const findAndExpandParents = (cats: Category[], targetId: string): string[] => {
            for (const cat of cats) {
              if (cat.id === targetId) {
                return [];
              }
              if (cat.children) {
                const childPath = findAndExpandParents(cat.children, targetId);
                if (childPath.length >= 0) {
                  const found = cat.children.some(c => c.id === targetId) || childPath.length > 0;
                  if (found) {
                    return [cat.id, ...childPath];
                  }
                }
              }
            }
            return [];
          };
          const parentIds = findAndExpandParents(response.categories, currentCategoryId);
          setExpandedCategories(new Set(parentIds));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [currentCategoryId]);

  const handleToggleExpand = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const handleSelectCategory = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedCategoryId) {
      onSelect(selectedCategoryId);
    }
  }, [selectedCategoryId, onSelect]);

  const filterCategories = useCallback((cats: Category[], query: string): Category[] => {
    if (!query) return cats;

    const lowerQuery = query.toLowerCase();

    const filterRecursive = (categories: Category[]): Category[] => {
      return categories.reduce<Category[]>((acc, cat) => {
        const matches =
          cat.name.toLowerCase().includes(lowerQuery) ||
          cat.display_name?.toLowerCase().includes(lowerQuery) ||
          cat.description?.toLowerCase().includes(lowerQuery);

        const filteredChildren = cat.children ? filterRecursive(cat.children) : [];

        if (matches || filteredChildren.length > 0) {
          acc.push({
            ...cat,
            children: filteredChildren.length > 0 ? filteredChildren : cat.children,
          });
        }

        return acc;
      }, []);
    };

    return filterRecursive(cats);
  }, []);

  const renderCategory = useCallback((category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategoryId === category.id;

    return (
      <div key={category.id} className="category-item-wrapper">
        <div
          className={`category-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        >
          {hasChildren && (
            <button
              type="button"
              className="expand-button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand(category.id);
              }}
            >
              {isExpanded ? '−' : '+'}
            </button>
          )}
          {!hasChildren && <span className="expand-placeholder" />}
          <button
            type="button"
            className="category-select-button"
            onClick={() => handleSelectCategory(category.id)}
          >
            <span className="category-name">
              {category.display_name || category.name}
            </span>
            {category.description && (
              <span className="category-description">{category.description}</span>
            )}
          </button>
          {isSelected && <span className="selected-indicator">✓</span>}
        </div>
        {hasChildren && isExpanded && (
          <div className="category-children">
            {category.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedCategories, selectedCategoryId, handleToggleExpand, handleSelectCategory]);

  const filteredCategories = filterCategories(categories, searchQuery);

  if (isLoading) {
    return (
      <div className="category-assigner">
        <div className="category-assigner-loading">Loading categories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="category-assigner">
        <div className="category-assigner-error">
          <p>{error}</p>
          <button onClick={onCancel} className="cancel-button">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="category-assigner">
      <div className="category-assigner-header">
        <h3>Select Category</h3>
        <button
          type="button"
          className="close-button"
          onClick={onCancel}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="category-search">
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="category-search-input"
        />
      </div>

      <div className="category-list">
        {filteredCategories.length === 0 ? (
          <div className="no-categories">
            {searchQuery ? 'No categories match your search' : 'No categories available'}
          </div>
        ) : (
          filteredCategories.map((category) => renderCategory(category))
        )}
      </div>

      <div className="category-assigner-actions">
        <button
          type="button"
          onClick={onCancel}
          className="cancel-button"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="confirm-button"
          disabled={!selectedCategoryId}
        >
          Assign Category
        </button>
      </div>
    </div>
  );
}
