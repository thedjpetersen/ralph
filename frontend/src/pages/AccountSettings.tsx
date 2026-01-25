import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Account } from '../stores/account';
import { useAccountStore } from '../stores/account';
import './AccountSettings.css';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
];

export function AccountSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accounts, isLoading, error, fetchAccount, updateAccount } =
    useAccountStore();

  const [account, setAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    currency: '',
    timezone: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      const existingAccount = accounts.find((a) => a.id === id);
      if (existingAccount) {
        setAccount(existingAccount);
        setFormData({
          name: existingAccount.name,
          currency: existingAccount.currency || '',
          timezone: existingAccount.timezone || '',
        });
      } else {
        fetchAccount(id)
          .then((fetched) => {
            setAccount(fetched);
            setFormData({
              name: fetched.name,
              currency: fetched.currency || '',
              timezone: fetched.timezone || '',
            });
          })
          .catch(() => {
            // Error is handled by the store
          });
      }
    }
  }, [id, accounts, fetchAccount]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !account) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateAccount(id, {
        name: formData.name,
        currency: formData.currency || undefined,
        timezone: formData.timezone || undefined,
      });
      setSaveSuccess(true);
    } catch {
      setSaveError('Failed to save account settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !account) {
    return (
      <div className="account-settings-page">
        <div className="settings-loading">Loading account...</div>
      </div>
    );
  }

  if (error && !account) {
    return (
      <div className="account-settings-page">
        <div className="settings-error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/accounts')} className="back-button">
            Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="account-settings-page">
        <div className="settings-error">
          <h2>Account Not Found</h2>
          <p>The account you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/accounts')} className="back-button">
            Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-settings-page">
      <div className="settings-header">
        <Link to="/accounts" className="back-link">
          &larr; Back to Accounts
        </Link>
        <h1>Account Settings</h1>
        <p className="settings-subtitle">
          Manage settings for <strong>{account.name}</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Account Name
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
            maxLength={100}
          />
          <p className="form-help">
            The display name for this account.
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="currency" className="form-label">
            Default Currency
          </label>
          <select
            id="currency"
            name="currency"
            value={formData.currency}
            onChange={handleInputChange}
            className="form-select"
          >
            <option value="">Select a currency</option>
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
          <p className="form-help">
            The default currency for this account's transactions.
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="timezone" className="form-label">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            value={formData.timezone}
            onChange={handleInputChange}
            className="form-select"
          >
            <option value="">Select a timezone</option>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <p className="form-help">
            The timezone used for displaying dates and times.
          </p>
        </div>

        {saveError && <div className="form-error">{saveError}</div>}
        {saveSuccess && (
          <div className="form-success">Settings saved successfully!</div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/accounts')}
            className="cancel-button"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="save-button"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
