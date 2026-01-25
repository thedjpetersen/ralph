import { useState, useEffect } from 'react';
import { useBudgetsStore, type CreateBudgetAllocationRequest } from '../stores/budgets';
import { useCategoriesStore } from '../stores/categories';
import { toast } from '../stores/toast';
import './AllocationForm.css';

interface AllocationFormProps {
  accountId: string;
  budgetId: string;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
  editingAllocation?: {
    id: string;
    name: string;
    description?: string;
    category_id?: string;
    amount: number;
    percentage?: number;
    is_percentage: boolean;
  };
}

interface FormData {
  name: string;
  description: string;
  category_id: string;
  amount: string;
  percentage: string;
  is_percentage: boolean;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  category_id: '',
  amount: '',
  percentage: '',
  is_percentage: false,
};

export function AllocationForm({
  accountId,
  budgetId,
  currency,
  onClose,
  onSuccess,
  editingAllocation,
}: AllocationFormProps) {
  const { createAllocation, updateAllocation } = useBudgetsStore();
  const { categories, fetchCategories } = useCategoriesStore();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isEditing = Boolean(editingAllocation);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (editingAllocation) {
      setFormData({
        name: editingAllocation.name,
        description: editingAllocation.description || '',
        category_id: editingAllocation.category_id || '',
        amount: editingAllocation.amount.toString(),
        percentage: editingAllocation.percentage?.toString() || '',
        is_percentage: editingAllocation.is_percentage,
      });
    }
  }, [editingAllocation]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setSaveError('Allocation name is required');
      return;
    }

    if (formData.is_percentage) {
      const pct = parseFloat(formData.percentage);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        setSaveError('Percentage must be between 0 and 100');
        return;
      }
    } else {
      const amt = parseFloat(formData.amount);
      if (isNaN(amt) || amt <= 0) {
        setSaveError('Amount must be greater than 0');
        return;
      }
    }

    setIsSaving(true);
    setSaveError(null);

    const allocationData: CreateBudgetAllocationRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      category_id: formData.category_id || undefined,
      is_percentage: formData.is_percentage,
      amount: formData.is_percentage ? undefined : parseFloat(formData.amount),
      percentage: formData.is_percentage ? parseFloat(formData.percentage) : undefined,
    };

    try {
      if (isEditing && editingAllocation) {
        await updateAllocation(accountId, budgetId, editingAllocation.id, allocationData);
        toast.success('Allocation updated successfully');
      } else {
        await createAllocation(accountId, budgetId, allocationData);
        toast.success('Allocation created successfully');
      }
      onSuccess();
    } catch {
      const errorMsg = isEditing ? 'Failed to update allocation' : 'Failed to create allocation';
      setSaveError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="allocation-modal-overlay" onClick={onClose}>
      <div className="allocation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="allocation-modal-header">
          <h3>{isEditing ? 'Edit Allocation' : 'Add Allocation'}</h3>
          <button onClick={onClose} className="close-button" aria-label="Close">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="allocation-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Allocation Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="form-input"
              required
              maxLength={100}
              placeholder="e.g., Groceries, Utilities, Entertainment"
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
              rows={2}
              maxLength={200}
              placeholder="Optional description..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="category_id" className="form-label">
              Category
            </label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value="">No category (manual)</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.display_name || category.name}
                </option>
              ))}
            </select>
            <p className="form-help">
              Link to a category to automatically track spending.
            </p>
          </div>

          <div className="form-group form-checkbox">
            <input
              type="checkbox"
              id="is_percentage"
              name="is_percentage"
              checked={formData.is_percentage}
              onChange={handleInputChange}
              className="checkbox-input"
            />
            <label htmlFor="is_percentage" className="checkbox-label">
              Set as percentage of total budget
            </label>
          </div>

          {formData.is_percentage ? (
            <div className="form-group">
              <label htmlFor="percentage" className="form-label">
                Percentage *
              </label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  id="percentage"
                  name="percentage"
                  value={formData.percentage}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                />
                <span className="input-suffix">%</span>
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="amount" className="form-label">
                Amount *
              </label>
              <div className="input-with-prefix">
                <span className="input-prefix">{currency}</span>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {saveError && <div className="form-error">{saveError}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-button"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={isSaving}>
              {isSaving
                ? isEditing
                  ? 'Saving...'
                  : 'Adding...'
                : isEditing
                  ? 'Save Changes'
                  : 'Add Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
