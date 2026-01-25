import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  usePaychecksStore,
  type Paycheck,
  type PayFrequency,
  type CreatePaycheckRequest,
} from '../stores/paychecks';
import { useAccountStore } from '../stores/account';
import { PageTransition } from './PageTransition';
import { SettingsFormSkeleton } from './skeletons';
import { toast } from '../stores/toast';
import './PaycheckForm.css';

const PAY_FREQUENCIES: { value: PayFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'semimonthly', label: 'Semi-Monthly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'other', label: 'Other' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

interface FormData {
  employer_id: string;
  pay_date: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_frequency: PayFrequency;
  gross_pay: string;
  net_pay: string;
  total_taxes: string;
  total_deductions: string;
  total_earnings: string;
  currency: string;
  check_number: string;
  direct_deposit_account: string;
  notes: string;
}

const initialFormData: FormData = {
  employer_id: '',
  pay_date: '',
  pay_period_start: '',
  pay_period_end: '',
  pay_frequency: 'biweekly',
  gross_pay: '',
  net_pay: '',
  total_taxes: '',
  total_deductions: '',
  total_earnings: '',
  currency: 'USD',
  check_number: '',
  direct_deposit_account: '',
  notes: '',
};

export function PaycheckForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { currentAccount } = useAccountStore();
  const {
    paychecks,
    currentPaycheck,
    employers,
    isLoading,
    error,
    fetchPaycheck,
    fetchEmployers,
    createPaycheck,
    updatePaycheck,
  } = usePaychecksStore();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (currentAccount?.id) {
      fetchEmployers(currentAccount.id);
    }
  }, [currentAccount?.id, fetchEmployers]);

  useEffect(() => {
    if (id && currentAccount?.id) {
      const existingPaycheck = paychecks.find((p) => p.id === id);
      if (existingPaycheck) {
        populateForm(existingPaycheck);
      } else {
        fetchPaycheck(currentAccount.id, id)
          .then((fetched) => {
            populateForm(fetched);
          })
          .catch(() => {
            // Error handled by store
          });
      }
    }
  }, [id, currentAccount?.id, paychecks, fetchPaycheck]);

  useEffect(() => {
    if (currentPaycheck && currentPaycheck.id === id) {
      populateForm(currentPaycheck);
    }
  }, [currentPaycheck, id]);

  const populateForm = (paycheck: Paycheck) => {
    setFormData({
      employer_id: paycheck.employer_id,
      pay_date: paycheck.pay_date.split('T')[0],
      pay_period_start: paycheck.pay_period_start.split('T')[0],
      pay_period_end: paycheck.pay_period_end.split('T')[0],
      pay_frequency: paycheck.pay_frequency || 'biweekly',
      gross_pay: paycheck.gross_pay.toString(),
      net_pay: paycheck.net_pay.toString(),
      total_taxes: paycheck.total_taxes.toString(),
      total_deductions: paycheck.total_deductions.toString(),
      total_earnings: paycheck.total_earnings.toString(),
      currency: paycheck.currency,
      check_number: paycheck.check_number || '',
      direct_deposit_account: paycheck.direct_deposit_account || '',
      notes: paycheck.notes || '',
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.id) {
      setSaveError('No account selected');
      return;
    }

    if (!formData.employer_id) {
      setSaveError('Please select an employer');
      return;
    }

    if (!formData.pay_date) {
      setSaveError('Pay date is required');
      return;
    }

    if (!formData.pay_period_start || !formData.pay_period_end) {
      setSaveError('Pay period dates are required');
      return;
    }

    if (!formData.gross_pay || parseFloat(formData.gross_pay) < 0) {
      setSaveError('Gross pay must be a valid amount');
      return;
    }

    if (!formData.net_pay || parseFloat(formData.net_pay) < 0) {
      setSaveError('Net pay must be a valid amount');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const paycheckData: CreatePaycheckRequest = {
      employer_id: formData.employer_id,
      pay_date: formData.pay_date,
      pay_period_start: formData.pay_period_start,
      pay_period_end: formData.pay_period_end,
      pay_frequency: formData.pay_frequency,
      gross_pay: parseFloat(formData.gross_pay),
      net_pay: parseFloat(formData.net_pay),
      total_taxes: formData.total_taxes ? parseFloat(formData.total_taxes) : undefined,
      total_deductions: formData.total_deductions ? parseFloat(formData.total_deductions) : undefined,
      total_earnings: formData.total_earnings ? parseFloat(formData.total_earnings) : undefined,
      currency: formData.currency,
      check_number: formData.check_number || undefined,
      direct_deposit_account: formData.direct_deposit_account || undefined,
      notes: formData.notes || undefined,
    };

    try {
      if (isEditing && id) {
        await updatePaycheck(currentAccount.id, id, paycheckData);
        toast.success('Paycheck updated successfully');
        navigate(`/paychecks/${id}`);
      } else {
        const newPaycheck = await createPaycheck(currentAccount.id, paycheckData);
        toast.success('Paycheck created successfully');
        navigate(`/paychecks/${newPaycheck.id}`);
      }
    } catch {
      const errorMsg = isEditing ? 'Failed to update paycheck' : 'Failed to create paycheck';
      setSaveError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="paycheck-form-page">
          <div className="form-error-container">
            <h2>No Account Selected</h2>
            <p>Please select an account to create or edit paychecks.</p>
            <button onClick={() => navigate('/accounts')} className="back-button">
              Select an Account
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && isEditing && !formData.employer_id) {
    return (
      <PageTransition>
        <div className="paycheck-form-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && isEditing && !formData.employer_id) {
    return (
      <PageTransition>
        <div className="paycheck-form-page">
          <div className="form-error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/paychecks')} className="back-button">
              Back to Paychecks
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="paycheck-form-page">
        <div className="form-header">
          <Link to={isEditing ? `/paychecks/${id}` : '/paychecks'} className="back-link">
            &larr; {isEditing ? 'Back to Paycheck' : 'Back to Paychecks'}
          </Link>
          <h1>{isEditing ? 'Edit Paycheck' : 'Add Paycheck'}</h1>
          <p className="form-subtitle">
            {isEditing
              ? 'Update paycheck details'
              : 'Record a new paycheck'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="paycheck-form">
          <div className="form-section">
            <h2>Employer & Pay Date</h2>

            <div className="form-group">
              <label htmlFor="employer_id" className="form-label">
                Employer *
              </label>
              <select
                id="employer_id"
                name="employer_id"
                value={formData.employer_id}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="">Select an employer</option>
                {employers.map((employer) => (
                  <option key={employer.id} value={employer.id}>
                    {employer.display_name || employer.name}
                  </option>
                ))}
              </select>
              {employers.length === 0 && (
                <p className="form-help">
                  No employers found.{' '}
                  <Link to="/employers" className="help-link">
                    Add an employer first
                  </Link>
                </p>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pay_date" className="form-label">
                  Pay Date *
                </label>
                <input
                  type="date"
                  id="pay_date"
                  name="pay_date"
                  value={formData.pay_date}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="pay_frequency" className="form-label">
                  Pay Frequency
                </label>
                <select
                  id="pay_frequency"
                  name="pay_frequency"
                  value={formData.pay_frequency}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  {PAY_FREQUENCIES.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Pay Period</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pay_period_start" className="form-label">
                  Period Start *
                </label>
                <input
                  type="date"
                  id="pay_period_start"
                  name="pay_period_start"
                  value={formData.pay_period_start}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="pay_period_end" className="form-label">
                  Period End *
                </label>
                <input
                  type="date"
                  id="pay_period_end"
                  name="pay_period_end"
                  value={formData.pay_period_end}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Pay Amounts</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="gross_pay" className="form-label">
                  Gross Pay *
                </label>
                <input
                  type="number"
                  id="gross_pay"
                  name="gross_pay"
                  value={formData.gross_pay}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="net_pay" className="form-label">
                  Net Pay *
                </label>
                <input
                  type="number"
                  id="net_pay"
                  name="net_pay"
                  value={formData.net_pay}
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="total_earnings" className="form-label">
                  Total Earnings
                </label>
                <input
                  type="number"
                  id="total_earnings"
                  name="total_earnings"
                  value={formData.total_earnings}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="total_taxes" className="form-label">
                  Total Taxes
                </label>
                <input
                  type="number"
                  id="total_taxes"
                  name="total_taxes"
                  value={formData.total_taxes}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="total_deductions" className="form-label">
                  Total Deductions
                </label>
                <input
                  type="number"
                  id="total_deductions"
                  name="total_deductions"
                  value={formData.total_deductions}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Additional Details</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="check_number" className="form-label">
                  Check Number
                </label>
                <input
                  type="text"
                  id="check_number"
                  name="check_number"
                  value={formData.check_number}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label htmlFor="direct_deposit_account" className="form-label">
                  Direct Deposit Account
                </label>
                <input
                  type="text"
                  id="direct_deposit_account"
                  name="direct_deposit_account"
                  value={formData.direct_deposit_account}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., ****1234"
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
                rows={3}
                placeholder="Any additional notes about this paycheck..."
              />
            </div>
          </div>

          {saveError && <div className="form-error">{saveError}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(isEditing ? `/paychecks/${id}` : '/paychecks')}
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
                  : 'Add Paycheck'}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
