import { useState, useEffect } from 'react';
import {
  retirementExpensesApi,
  type RetirementExpense,
  type RetirementExpenseType,
  type RetirementExpenseStatus,
  type ExpenseFrequency,
  type CreateRetirementExpenseRequest,
} from '../api/client';
import { toast } from '../stores/toast';
import './ExpenseForm.css';

const EXPENSE_TYPES: { value: RetirementExpenseType; label: string }[] = [
  { value: 'housing', label: 'Housing' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'food', label: 'Food' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: { value: RetirementExpenseStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'future', label: 'Future' },
];

const FREQUENCY_OPTIONS: { value: ExpenseFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'one_time', label: 'One Time' },
];

interface FormData {
  name: string;
  type: RetirementExpenseType;
  status: RetirementExpenseStatus;
  amount: string;
  frequency: ExpenseFrequency;
  start_age: string;
  end_age: string;
  inflation_adjusted: boolean;
  inflation_rate: string;
  is_essential: boolean;
  notes: string;
}

const initialFormData: FormData = {
  name: '',
  type: 'housing',
  status: 'active',
  amount: '',
  frequency: 'monthly',
  start_age: '',
  end_age: '',
  inflation_adjusted: true,
  inflation_rate: '',
  is_essential: true,
  notes: '',
};

interface ExpenseFormProps {
  accountId: string;
  planId: string;
  existingExpense?: RetirementExpense | null;
  onClose: () => void;
  onSuccess: (expense: RetirementExpense) => void;
}

export function ExpenseForm({
  accountId,
  planId,
  existingExpense,
  onClose,
  onSuccess,
}: ExpenseFormProps) {
  const isEditing = Boolean(existingExpense);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (existingExpense) {
      setFormData({
        name: existingExpense.name,
        type: existingExpense.type,
        status: existingExpense.status,
        amount: existingExpense.amount.toString(),
        frequency: existingExpense.frequency,
        start_age: existingExpense.start_age.toString(),
        end_age: existingExpense.end_age?.toString() || '',
        inflation_adjusted: existingExpense.inflation_adjusted,
        inflation_rate: existingExpense.inflation_rate
          ? (existingExpense.inflation_rate * 100).toString()
          : '',
        is_essential: existingExpense.is_essential,
        notes: existingExpense.notes || '',
      });
    }
  }, [existingExpense]);

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
      setSaveError('Expense name is required');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setSaveError('Amount is required');
      return;
    }

    if (!formData.start_age || parseInt(formData.start_age) <= 0) {
      setSaveError('Start age is required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const expenseData: CreateRetirementExpenseRequest = {
      plan_id: planId,
      name: formData.name.trim(),
      type: formData.type,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      start_age: parseInt(formData.start_age),
      end_age: formData.end_age ? parseInt(formData.end_age) : undefined,
      inflation_adjusted: formData.inflation_adjusted,
      inflation_rate: formData.inflation_rate ? parseFloat(formData.inflation_rate) / 100 : undefined,
      is_essential: formData.is_essential,
      notes: formData.notes.trim() || undefined,
    };

    try {
      let result: RetirementExpense;
      if (isEditing && existingExpense) {
        result = await retirementExpensesApi.update(accountId, existingExpense.id, {
          ...expenseData,
          status: formData.status,
        });
        toast.success('Expense updated successfully');
      } else {
        result = await retirementExpensesApi.create(accountId, expenseData);
        toast.success('Expense added successfully');
      }
      onSuccess(result);
    } catch {
      const errorMsg = isEditing ? 'Failed to update expense' : 'Failed to add expense';
      setSaveError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Expense' : 'Add Expense'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                required
                placeholder="e.g., Mortgage, Healthcare"
              />
            </div>

            <div className="form-group">
              <label htmlFor="type" className="form-label">
                Category *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="form-select"
              >
                {EXPENSE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isEditing && (
            <div className="form-group">
              <label htmlFor="status" className="form-label">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="form-select"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="amount" className="form-label">
                Amount *
              </label>
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

            <div className="form-group">
              <label htmlFor="frequency" className="form-label">
                Frequency *
              </label>
              <select
                id="frequency"
                name="frequency"
                value={formData.frequency}
                onChange={handleInputChange}
                className="form-select"
              >
                {FREQUENCY_OPTIONS.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_age" className="form-label">
                Start Age *
              </label>
              <input
                type="number"
                id="start_age"
                name="start_age"
                value={formData.start_age}
                onChange={handleInputChange}
                className="form-input"
                required
                min="18"
                max="100"
                placeholder="65"
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_age" className="form-label">
                End Age
              </label>
              <input
                type="number"
                id="end_age"
                name="end_age"
                value={formData.end_age}
                onChange={handleInputChange}
                className="form-input"
                min="18"
                max="120"
                placeholder="Leave blank for lifetime"
              />
            </div>
          </div>

          <div className="form-row checkbox-row">
            <div className="form-group form-checkbox">
              <input
                type="checkbox"
                id="is_essential"
                name="is_essential"
                checked={formData.is_essential}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <label htmlFor="is_essential" className="checkbox-label">
                Essential expense
              </label>
            </div>

            <div className="form-group form-checkbox">
              <input
                type="checkbox"
                id="inflation_adjusted"
                name="inflation_adjusted"
                checked={formData.inflation_adjusted}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <label htmlFor="inflation_adjusted" className="checkbox-label">
                Inflation adjusted
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="inflation_rate" className="form-label">
              Custom Inflation Rate (%)
            </label>
            <input
              type="number"
              id="inflation_rate"
              name="inflation_rate"
              value={formData.inflation_rate}
              onChange={handleInputChange}
              className="form-input"
              min="0"
              max="15"
              step="0.1"
              placeholder="Leave blank to use plan default"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="form-textarea"
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          {saveError && <div className="form-error">{saveError}</div>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditing ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
