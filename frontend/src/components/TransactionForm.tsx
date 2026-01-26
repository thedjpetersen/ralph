import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useTransactionsStore,
  type Transaction,
  type TransactionType,
  type TransactionStatus,
  type CreateTransactionRequest,
} from '../stores/transactions';
import { useAccountStore } from '../stores/account';
import { PageTransition } from './PageTransition';
import { SettingsFormSkeleton } from './skeletons';
import { GhostTextTextarea } from './GhostTextTextarea';
import './TransactionForm.css';

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'refund', label: 'Refund' },
  { value: 'payment', label: 'Payment' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Other' },
];

const TRANSACTION_STATUSES: { value: TransactionStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_METHODS = [
  'Credit Card',
  'Debit Card',
  'Cash',
  'Check',
  'Bank Transfer',
  'PayPal',
  'Apple Pay',
  'Google Pay',
  'Venmo',
  'Other',
];

interface FormData {
  receipt_id: string;
  type: TransactionType;
  amount: string;
  currency: string;
  transaction_date: string;
  description: string;
  merchant_name: string;
  merchant_category: string;
  payment_method: string;
  card_last_four: string;
  reference_number: string;
  authorization_code: string;
  status: TransactionStatus;
  is_recurring: boolean;
  recurrence_pattern: string;
  category_tags: string;
  notes: string;
}

const initialFormData: FormData = {
  receipt_id: '',
  type: 'purchase',
  amount: '',
  currency: 'USD',
  transaction_date: new Date().toISOString().split('T')[0],
  description: '',
  merchant_name: '',
  merchant_category: '',
  payment_method: '',
  card_last_four: '',
  reference_number: '',
  authorization_code: '',
  status: 'completed',
  is_recurring: false,
  recurrence_pattern: '',
  category_tags: '',
  notes: '',
};

export function TransactionForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { currentAccount } = useAccountStore();
  const {
    transactions,
    currentTransaction,
    isLoading,
    error,
    fetchTransaction,
    createTransaction,
    updateTransaction,
  } = useTransactionsStore();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load transaction data for editing
  useEffect(() => {
    if (id && currentAccount?.id) {
      const existingTransaction = transactions.find((t) => t.id === id);
      if (existingTransaction) {
        populateForm(existingTransaction);
      } else {
        fetchTransaction(currentAccount.id, id)
          .then((fetched) => {
            populateForm(fetched);
          })
          .catch(() => {
            // Error handled by store
          });
      }
    }
  }, [id, currentAccount?.id, transactions, fetchTransaction]);

  // Update form when currentTransaction changes
  useEffect(() => {
    if (currentTransaction && currentTransaction.id === id) {
      populateForm(currentTransaction);
    }
  }, [currentTransaction, id]);

  const populateForm = (transaction: Transaction) => {
    setFormData({
      receipt_id: transaction.receipt_id || '',
      type: transaction.type,
      amount: transaction.amount.toString(),
      currency: transaction.currency || 'USD',
      transaction_date: transaction.transaction_date.split('T')[0],
      description: transaction.description || '',
      merchant_name: transaction.merchant_name || '',
      merchant_category: transaction.merchant_category || '',
      payment_method: transaction.payment_method || '',
      card_last_four: transaction.card_last_four || '',
      reference_number: transaction.reference_number || '',
      authorization_code: transaction.authorization_code || '',
      status: transaction.status,
      is_recurring: transaction.is_recurring,
      recurrence_pattern: transaction.recurrence_pattern || '',
      category_tags: transaction.category_tags?.join(', ') || '',
      notes: transaction.notes || '',
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

  const parseCommaSeparated = (value: string): string[] => {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount?.id) {
      setSaveError('No account selected');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const transactionData: CreateTransactionRequest = {
      receipt_id: formData.receipt_id || `manual-${Date.now()}`,
      type: formData.type,
      amount: parseFloat(formData.amount) || 0,
      currency: formData.currency || 'USD',
      transaction_date: formData.transaction_date,
      description: formData.description || undefined,
      merchant_name: formData.merchant_name || undefined,
      merchant_category: formData.merchant_category || undefined,
      payment_method: formData.payment_method || undefined,
      card_last_four: formData.card_last_four || undefined,
      reference_number: formData.reference_number || undefined,
      authorization_code: formData.authorization_code || undefined,
      status: formData.status,
      is_recurring: formData.is_recurring,
      recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern || undefined : undefined,
      category_tags: parseCommaSeparated(formData.category_tags).length > 0
        ? parseCommaSeparated(formData.category_tags)
        : undefined,
      notes: formData.notes || undefined,
    };

    try {
      if (isEditing && id) {
        await updateTransaction(currentAccount.id, id, transactionData);
        navigate(`/transactions/${id}`);
      } else {
        const newTransaction = await createTransaction(currentAccount.id, transactionData);
        if (newTransaction) {
          navigate(`/transactions/${newTransaction.id}`);
        } else {
          navigate('/transactions');
        }
      }
    } catch {
      setSaveError(isEditing ? 'Failed to update transaction' : 'Failed to create transaction');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="transaction-form-page">
          <div className="form-error-container">
            <h2>No Account Selected</h2>
            <p>Please select an account to create or edit transactions.</p>
            <button onClick={() => navigate('/accounts')} className="back-button">
              Select an Account
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && isEditing && !formData.amount) {
    return (
      <PageTransition>
        <div className="transaction-form-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && isEditing && !formData.amount) {
    return (
      <PageTransition>
        <div className="transaction-form-page">
          <div className="form-error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/transactions')} className="back-button">
              Back to Transactions
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="transaction-form-page">
        <div className="form-header">
          <Link to={isEditing ? `/transactions/${id}` : '/transactions'} className="back-link">
            &larr; {isEditing ? 'Back to Transaction' : 'Back to Transactions'}
          </Link>
          <h1>{isEditing ? 'Edit Transaction' : 'Create Transaction'}</h1>
          <p className="form-subtitle">
            {isEditing
              ? 'Update transaction details'
              : 'Add a new transaction to your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-section">
            <h2>Basic Information</h2>

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
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="type" className="form-label">
                  Transaction Type *
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  {TRANSACTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status" className="form-label">
                  Status *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  {TRANSACTION_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="transaction_date" className="form-label">
                Transaction Date *
              </label>
              <input
                type="date"
                id="transaction_date"
                name="transaction_date"
                value={formData.transaction_date}
                onChange={handleInputChange}
                className="form-input"
                required
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
                placeholder="Brief description of the transaction..."
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Merchant Information</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="merchant_name" className="form-label">
                  Merchant Name
                </label>
                <input
                  type="text"
                  id="merchant_name"
                  name="merchant_name"
                  value={formData.merchant_name}
                  onChange={handleInputChange}
                  className="form-input"
                  maxLength={200}
                  placeholder="e.g., Starbucks"
                />
              </div>

              <div className="form-group">
                <label htmlFor="merchant_category" className="form-label">
                  Merchant Category
                </label>
                <input
                  type="text"
                  id="merchant_category"
                  name="merchant_category"
                  value={formData.merchant_category}
                  onChange={handleInputChange}
                  className="form-input"
                  maxLength={100}
                  placeholder="e.g., Restaurants"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Payment Details</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="payment_method" className="form-label">
                  Payment Method
                </label>
                <select
                  id="payment_method"
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Select method...</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="card_last_four" className="form-label">
                  Card Last 4 Digits
                </label>
                <input
                  type="text"
                  id="card_last_four"
                  name="card_last_four"
                  value={formData.card_last_four}
                  onChange={handleInputChange}
                  className="form-input"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="1234"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reference_number" className="form-label">
                  Reference Number
                </label>
                <input
                  type="text"
                  id="reference_number"
                  name="reference_number"
                  value={formData.reference_number}
                  onChange={handleInputChange}
                  className="form-input"
                  maxLength={100}
                  placeholder="Transaction reference"
                />
              </div>

              <div className="form-group">
                <label htmlFor="authorization_code" className="form-label">
                  Authorization Code
                </label>
                <input
                  type="text"
                  id="authorization_code"
                  name="authorization_code"
                  value={formData.authorization_code}
                  onChange={handleInputChange}
                  className="form-input"
                  maxLength={50}
                  placeholder="Auth code"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Additional Details</h2>

            <div className="form-group form-checkbox">
              <input
                type="checkbox"
                id="is_recurring"
                name="is_recurring"
                checked={formData.is_recurring}
                onChange={handleInputChange}
                className="checkbox-input"
              />
              <label htmlFor="is_recurring" className="checkbox-label">
                This is a recurring transaction
              </label>
            </div>

            {formData.is_recurring && (
              <div className="form-group">
                <label htmlFor="recurrence_pattern" className="form-label">
                  Recurrence Pattern
                </label>
                <input
                  type="text"
                  id="recurrence_pattern"
                  name="recurrence_pattern"
                  value={formData.recurrence_pattern}
                  onChange={handleInputChange}
                  className="form-input"
                  maxLength={50}
                  placeholder="e.g., Monthly, Weekly, Yearly"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="category_tags" className="form-label">
                Category Tags
              </label>
              <input
                type="text"
                id="category_tags"
                name="category_tags"
                value={formData.category_tags}
                onChange={handleInputChange}
                className="form-input"
                placeholder="food, coffee, business"
              />
              <p className="form-help">
                Comma-separated tags for categorization.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="notes" className="form-label">
                Notes
              </label>
              <GhostTextTextarea
                fieldId="transaction-notes"
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, notes: value }))
                }
                className="form-textarea"
                rows={3}
                maxLength={1000}
                placeholder="Additional notes about this transaction..."
                context={{
                  amount: formData.amount,
                  merchant: formData.merchant_name,
                  type: formData.type,
                }}
              />
              <p className="form-help">
                AI suggestions enabled. Press Tab to accept, Cmd+Right for word-by-word, Escape to dismiss.
              </p>
            </div>
          </div>

          {saveError && <div className="form-error">{saveError}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(isEditing ? `/transactions/${id}` : '/transactions')}
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
                  : 'Create Transaction'}
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
