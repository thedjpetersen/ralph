import { useState, useEffect } from 'react';
import {
  retirementAccountsApi,
  type RetirementAccount,
  type RetirementAccountType,
  type CreateRetirementAccountRequest,
} from '../api/client';
import { toast } from '../stores/toast';
import './RetirementAccountForm.css';

const ACCOUNT_TYPES: { value: RetirementAccountType; label: string }[] = [
  { value: '401k', label: '401(k)' },
  { value: '403b', label: '403(b)' },
  { value: 'ira', label: 'Traditional IRA' },
  { value: 'roth_ira', label: 'Roth IRA' },
  { value: 'sep_ira', label: 'SEP IRA' },
  { value: 'simple_ira', label: 'SIMPLE IRA' },
  { value: 'pension', label: 'Pension' },
  { value: 'brokerage', label: 'Brokerage' },
  { value: 'hsa', label: 'HSA' },
  { value: 'other', label: 'Other' },
];

interface FormData {
  name: string;
  type: RetirementAccountType;
  current_balance: string;
  annual_contribution: string;
  contribution_limit: string;
  employer_match_percent: string;
  employer_match_limit: string;
  expected_return_rate: string;
  is_tax_deferred: boolean;
  is_roth: boolean;
  notes: string;
}

const initialFormData: FormData = {
  name: '',
  type: '401k',
  current_balance: '',
  annual_contribution: '',
  contribution_limit: '',
  employer_match_percent: '',
  employer_match_limit: '',
  expected_return_rate: '',
  is_tax_deferred: true,
  is_roth: false,
  notes: '',
};

interface RetirementAccountFormProps {
  accountId: string;
  planId: string;
  existingAccount?: RetirementAccount | null;
  onClose: () => void;
  onSuccess: (account: RetirementAccount) => void;
}

export function RetirementAccountForm({
  accountId,
  planId,
  existingAccount,
  onClose,
  onSuccess,
}: RetirementAccountFormProps) {
  const isEditing = Boolean(existingAccount);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (existingAccount) {
      setFormData({
        name: existingAccount.name,
        type: existingAccount.type,
        current_balance: existingAccount.current_balance.toString(),
        annual_contribution: existingAccount.annual_contribution?.toString() || '',
        contribution_limit: existingAccount.contribution_limit?.toString() || '',
        employer_match_percent: existingAccount.employer_match_percent?.toString() || '',
        employer_match_limit: existingAccount.employer_match_limit?.toString() || '',
        expected_return_rate: existingAccount.expected_return_rate
          ? (existingAccount.expected_return_rate * 100).toString()
          : '',
        is_tax_deferred: existingAccount.is_tax_deferred,
        is_roth: existingAccount.is_roth,
        notes: existingAccount.notes || '',
      });
    }
  }, [existingAccount]);

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
      setSaveError('Account name is required');
      return;
    }

    if (!formData.current_balance || parseFloat(formData.current_balance) < 0) {
      setSaveError('Current balance is required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const accountData: CreateRetirementAccountRequest = {
      plan_id: planId,
      name: formData.name.trim(),
      type: formData.type,
      current_balance: parseFloat(formData.current_balance),
      annual_contribution: formData.annual_contribution ? parseFloat(formData.annual_contribution) : undefined,
      contribution_limit: formData.contribution_limit ? parseFloat(formData.contribution_limit) : undefined,
      employer_match_percent: formData.employer_match_percent ? parseFloat(formData.employer_match_percent) : undefined,
      employer_match_limit: formData.employer_match_limit ? parseFloat(formData.employer_match_limit) : undefined,
      expected_return_rate: formData.expected_return_rate ? parseFloat(formData.expected_return_rate) / 100 : undefined,
      is_tax_deferred: formData.is_tax_deferred,
      is_roth: formData.is_roth,
      notes: formData.notes.trim() || undefined,
    };

    try {
      let result: RetirementAccount;
      if (isEditing && existingAccount) {
        result = await retirementAccountsApi.update(accountId, existingAccount.id, accountData);
        toast.success('Account updated successfully');
      } else {
        result = await retirementAccountsApi.create(accountId, accountData);
        toast.success('Account added successfully');
      }
      onSuccess(result);
    } catch {
      const errorMsg = isEditing ? 'Failed to update account' : 'Failed to add account';
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
          <h3>{isEditing ? 'Edit Retirement Account' : 'Add Retirement Account'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="account-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Account Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                required
                placeholder="e.g., Company 401(k)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="type" className="form-label">
                Account Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="form-select"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="current_balance" className="form-label">
                Current Balance *
              </label>
              <input
                type="number"
                id="current_balance"
                name="current_balance"
                value={formData.current_balance}
                onChange={handleInputChange}
                className="form-input"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="annual_contribution" className="form-label">
                Annual Contribution
              </label>
              <input
                type="number"
                id="annual_contribution"
                name="annual_contribution"
                value={formData.annual_contribution}
                onChange={handleInputChange}
                className="form-input"
                min="0"
                step="100"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contribution_limit" className="form-label">
                Contribution Limit
              </label>
              <input
                type="number"
                id="contribution_limit"
                name="contribution_limit"
                value={formData.contribution_limit}
                onChange={handleInputChange}
                className="form-input"
                min="0"
                step="100"
                placeholder="23000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="expected_return_rate" className="form-label">
                Expected Return (%)
              </label>
              <input
                type="number"
                id="expected_return_rate"
                name="expected_return_rate"
                value={formData.expected_return_rate}
                onChange={handleInputChange}
                className="form-input"
                min="0"
                max="20"
                step="0.1"
                placeholder="7"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="employer_match_percent" className="form-label">
                Employer Match (%)
              </label>
              <input
                type="number"
                id="employer_match_percent"
                name="employer_match_percent"
                value={formData.employer_match_percent}
                onChange={handleInputChange}
                className="form-input"
                min="0"
                max="100"
                step="0.5"
                placeholder="6"
              />
            </div>

            <div className="form-group">
              <label htmlFor="employer_match_limit" className="form-label">
                Match Limit ($)
              </label>
              <input
                type="number"
                id="employer_match_limit"
                name="employer_match_limit"
                value={formData.employer_match_limit}
                onChange={handleInputChange}
                className="form-input"
                min="0"
                step="100"
                placeholder="6000"
              />
            </div>
          </div>

          <div className="form-row checkbox-row">
            <div className="form-group form-checkbox">
              <input
                type="checkbox"
                id="is_tax_deferred"
                name="is_tax_deferred"
                checked={formData.is_tax_deferred}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <label htmlFor="is_tax_deferred" className="checkbox-label">
                Tax-deferred
              </label>
            </div>

            <div className="form-group form-checkbox">
              <input
                type="checkbox"
                id="is_roth"
                name="is_roth"
                checked={formData.is_roth}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <label htmlFor="is_roth" className="checkbox-label">
                Roth (tax-free withdrawals)
              </label>
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
              {isSaving ? 'Saving...' : isEditing ? 'Update Account' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
