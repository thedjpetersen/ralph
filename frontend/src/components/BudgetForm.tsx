import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useBudgetsStore,
  type Budget,
  type BudgetPeriodType,
  type CreateBudgetRequest,
} from '../stores/budgets';
import { useAccountStore } from '../stores/account';
import { PageTransition } from './PageTransition';
import { SettingsFormSkeleton } from './skeletons';
import { toast } from '../stores/toast';
import './BudgetForm.css';

const PERIOD_TYPES: { value: BudgetPeriodType; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

interface FormData {
  name: string;
  description: string;
  period_type: BudgetPeriodType;
  total_amount: string;
  currency: string;
  start_date: string;
  end_date: string;
  rollover_enabled: boolean;
  alert_threshold: string;
  is_default: boolean;
}

const initialFormData: FormData = {
  name: '',
  description: '',
  period_type: 'monthly',
  total_amount: '',
  currency: 'USD',
  start_date: '',
  end_date: '',
  rollover_enabled: false,
  alert_threshold: '80',
  is_default: false,
};

export function BudgetForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { currentAccount } = useAccountStore();
  const {
    budgets,
    currentBudget,
    isLoading,
    error,
    fetchBudget,
    createBudget,
    updateBudget,
  } = useBudgetsStore();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (id && currentAccount?.id) {
      const existingBudget = budgets.find((b) => b.id === id);
      if (existingBudget) {
        populateForm(existingBudget);
      } else {
        fetchBudget(currentAccount.id, id)
          .then((fetched) => {
            populateForm(fetched);
          })
          .catch(() => {
            // Error handled by store
          });
      }
    }
  }, [id, currentAccount?.id, budgets, fetchBudget]);

  useEffect(() => {
    if (currentBudget && currentBudget.id === id) {
      populateForm(currentBudget);
    }
  }, [currentBudget, id]);

  const populateForm = (budget: Budget) => {
    setFormData({
      name: budget.name,
      description: budget.description || '',
      period_type: budget.period_type,
      total_amount: budget.total_amount.toString(),
      currency: budget.currency,
      start_date: budget.start_date?.split('T')[0] || '',
      end_date: budget.end_date?.split('T')[0] || '',
      rollover_enabled: budget.rollover_enabled,
      alert_threshold: budget.alert_threshold?.toString() || '80',
      is_default: budget.is_default,
    });
  };

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
    if (!currentAccount?.id) {
      setSaveError('No account selected');
      return;
    }

    if (!formData.name.trim()) {
      setSaveError('Budget name is required');
      return;
    }

    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      setSaveError('Budget amount must be greater than 0');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const budgetData: CreateBudgetRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      period_type: formData.period_type,
      total_amount: parseFloat(formData.total_amount),
      currency: formData.currency,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
      rollover_enabled: formData.rollover_enabled,
      alert_threshold: formData.alert_threshold ? parseInt(formData.alert_threshold, 10) : undefined,
      is_default: formData.is_default,
    };

    try {
      if (isEditing && id) {
        await updateBudget(currentAccount.id, id, budgetData);
        toast.success('Budget updated successfully');
        navigate(`/budgets/${id}`);
      } else {
        const newBudget = await createBudget(currentAccount.id, budgetData);
        toast.success('Budget created successfully');
        navigate(`/budgets/${newBudget.id}`);
      }
    } catch {
      const errorMsg = isEditing ? 'Failed to update budget' : 'Failed to create budget';
      setSaveError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="budget-form-page">
          <div className="form-error-container">
            <h2>No Account Selected</h2>
            <p>Please select an account to create or edit budgets.</p>
            <button onClick={() => navigate('/accounts')} className="back-button">
              Select an Account
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && isEditing && !formData.name) {
    return (
      <PageTransition>
        <div className="budget-form-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && isEditing && !formData.name) {
    return (
      <PageTransition>
        <div className="budget-form-page">
          <div className="form-error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/budgets')} className="back-button">
              Back to Budgets
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="budget-form-page">
        <div className="form-header">
          <Link to={isEditing ? `/budgets/${id}` : '/budgets'} className="back-link">
            &larr; {isEditing ? 'Back to Budget' : 'Back to Budgets'}
          </Link>
          <h1>{isEditing ? 'Edit Budget' : 'Create Budget'}</h1>
          <p className="form-subtitle">
            {isEditing
              ? 'Update budget details'
              : 'Set up a new spending budget'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="budget-form">
          <div className="form-section">
            <h2>Basic Information</h2>

            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Budget Name *
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
                placeholder="e.g., Monthly Expenses, Groceries, Entertainment"
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
                maxLength={500}
                placeholder="Brief description of this budget..."
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Budget Amount</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="total_amount" className="form-label">
                  Amount *
                </label>
                <input
                  type="number"
                  id="total_amount"
                  name="total_amount"
                  value={formData.total_amount}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="currency" className="form-label">
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Budget Period</h2>

            <div className="form-group">
              <label htmlFor="period_type" className="form-label">
                Period Type *
              </label>
              <select
                id="period_type"
                name="period_type"
                value={formData.period_type}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                {PERIOD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="form-help">
                How often the budget resets and spending is calculated.
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_date" className="form-label">
                  Start Date
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="end_date" className="form-label">
                  End Date
                </label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="form-input"
                />
                <p className="form-help">
                  Optional. Leave empty for an ongoing budget.
                </p>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Options</h2>

            <div className="form-group form-checkbox">
              <input
                type="checkbox"
                id="rollover_enabled"
                name="rollover_enabled"
                checked={formData.rollover_enabled}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <label htmlFor="rollover_enabled" className="checkbox-label">
                Enable rollover
              </label>
            </div>
            <p className="form-help checkbox-help">
              When enabled, unused budget from one period carries over to the next.
            </p>

            <div className="form-group">
              <label htmlFor="alert_threshold" className="form-label">
                Alert Threshold (%)
              </label>
              <input
                type="number"
                id="alert_threshold"
                name="alert_threshold"
                value={formData.alert_threshold}
                onChange={handleInputChange}
                className="form-input"
                min="0"
                max="100"
                placeholder="80"
              />
              <p className="form-help">
                Get notified when spending reaches this percentage of the budget.
              </p>
            </div>

            <div className="form-group form-checkbox">
              <input
                type="checkbox"
                id="is_default"
                name="is_default"
                checked={formData.is_default}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <label htmlFor="is_default" className="checkbox-label">
                Set as default budget
              </label>
            </div>
            <p className="form-help checkbox-help">
              The default budget is used for automatic categorization.
            </p>
          </div>

          {saveError && <div className="form-error">{saveError}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(isEditing ? `/budgets/${id}` : '/budgets')}
              className="cancel-button"
            >
              Cancel
            </button>
            <button type="submit" className="save-button" disabled={isSaving}>
              {isSaving
                ? isEditing
                  ? 'Saving...'
                  : 'Creating...'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Budget'}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
