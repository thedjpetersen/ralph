import { useState, useEffect } from 'react';
import {
  retirementIncomeSourcesApi,
  type RetirementIncomeSource,
  type IncomeSourceType,
  type IncomeSourceStatus,
  type CreateRetirementIncomeSourceRequest,
} from '../api/client';
import { toast } from '../stores/toast';
import './IncomeSourceForm.css';

const INCOME_TYPES: { value: IncomeSourceType; label: string }[] = [
  { value: 'social_security', label: 'Social Security' },
  { value: 'pension', label: 'Pension' },
  { value: 'annuity', label: 'Annuity' },
  { value: 'rental', label: 'Rental Income' },
  { value: 'part_time', label: 'Part-Time Work' },
  { value: 'dividend', label: 'Dividends' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: { value: IncomeSourceStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'future', label: 'Future' },
];

interface FormData {
  name: string;
  type: IncomeSourceType;
  status: IncomeSourceStatus;
  annual_amount: string;
  start_age: string;
  end_age: string;
  inflation_adjusted: boolean;
  cola_rate: string;
  is_taxable: boolean;
  tax_rate: string;
  notes: string;
}

const initialFormData: FormData = {
  name: '',
  type: 'social_security',
  status: 'future',
  annual_amount: '',
  start_age: '',
  end_age: '',
  inflation_adjusted: true,
  cola_rate: '',
  is_taxable: true,
  tax_rate: '',
  notes: '',
};

interface IncomeSourceFormProps {
  accountId: string;
  planId: string;
  existingIncome?: RetirementIncomeSource | null;
  onClose: () => void;
  onSuccess: (income: RetirementIncomeSource) => void;
}

export function IncomeSourceForm({
  accountId,
  planId,
  existingIncome,
  onClose,
  onSuccess,
}: IncomeSourceFormProps) {
  const isEditing = Boolean(existingIncome);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (existingIncome) {
      setFormData({
        name: existingIncome.name,
        type: existingIncome.type,
        status: existingIncome.status,
        annual_amount: existingIncome.annual_amount.toString(),
        start_age: existingIncome.start_age.toString(),
        end_age: existingIncome.end_age?.toString() || '',
        inflation_adjusted: existingIncome.inflation_adjusted,
        cola_rate: existingIncome.cola_rate ? (existingIncome.cola_rate * 100).toString() : '',
        is_taxable: existingIncome.is_taxable,
        tax_rate: existingIncome.tax_rate ? (existingIncome.tax_rate * 100).toString() : '',
        notes: existingIncome.notes || '',
      });
    }
  }, [existingIncome]);

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
      setSaveError('Income source name is required');
      return;
    }

    if (!formData.annual_amount || parseFloat(formData.annual_amount) <= 0) {
      setSaveError('Annual amount is required');
      return;
    }

    if (!formData.start_age || parseInt(formData.start_age) <= 0) {
      setSaveError('Start age is required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const incomeData: CreateRetirementIncomeSourceRequest = {
      plan_id: planId,
      name: formData.name.trim(),
      type: formData.type,
      annual_amount: parseFloat(formData.annual_amount),
      start_age: parseInt(formData.start_age),
      end_age: formData.end_age ? parseInt(formData.end_age) : undefined,
      inflation_adjusted: formData.inflation_adjusted,
      cola_rate: formData.cola_rate ? parseFloat(formData.cola_rate) / 100 : undefined,
      is_taxable: formData.is_taxable,
      tax_rate: formData.tax_rate ? parseFloat(formData.tax_rate) / 100 : undefined,
      notes: formData.notes.trim() || undefined,
    };

    try {
      let result: RetirementIncomeSource;
      if (isEditing && existingIncome) {
        result = await retirementIncomeSourcesApi.update(accountId, existingIncome.id, {
          ...incomeData,
          status: formData.status,
        });
        toast.success('Income source updated successfully');
      } else {
        result = await retirementIncomeSourcesApi.create(accountId, incomeData);
        toast.success('Income source added successfully');
      }
      onSuccess(result);
    } catch {
      const errorMsg = isEditing ? 'Failed to update income source' : 'Failed to add income source';
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
          <h3>{isEditing ? 'Edit Income Source' : 'Add Income Source'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="income-form">
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
                placeholder="e.g., Social Security"
              />
            </div>

            <div className="form-group">
              <label htmlFor="type" className="form-label">
                Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="form-select"
              >
                {INCOME_TYPES.map((type) => (
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

          <div className="form-group">
            <label htmlFor="annual_amount" className="form-label">
              Annual Amount *
            </label>
            <input
              type="number"
              id="annual_amount"
              name="annual_amount"
              value={formData.annual_amount}
              onChange={handleInputChange}
              className="form-input"
              required
              min="0"
              step="100"
              placeholder="24000"
            />
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
                placeholder="67"
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

            <div className="form-group form-checkbox">
              <input
                type="checkbox"
                id="is_taxable"
                name="is_taxable"
                checked={formData.is_taxable}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <label htmlFor="is_taxable" className="checkbox-label">
                Taxable income
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cola_rate" className="form-label">
                COLA Rate (%)
              </label>
              <input
                type="number"
                id="cola_rate"
                name="cola_rate"
                value={formData.cola_rate}
                onChange={handleInputChange}
                className="form-input"
                min="0"
                max="10"
                step="0.1"
                placeholder="2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tax_rate" className="form-label">
                Effective Tax Rate (%)
              </label>
              <input
                type="number"
                id="tax_rate"
                name="tax_rate"
                value={formData.tax_rate}
                onChange={handleInputChange}
                className="form-input"
                min="0"
                max="50"
                step="0.5"
                placeholder="22"
              />
            </div>
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
              {isSaving ? 'Saving...' : isEditing ? 'Update Income' : 'Add Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
