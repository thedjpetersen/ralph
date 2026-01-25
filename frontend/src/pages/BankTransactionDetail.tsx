import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBankTransactionsStore, type BankTransaction, type BankTransactionStatus, type BankTransactionType } from '../stores/bankTransactions';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { CategoryAssigner } from '../components/CategoryAssigner';
import { SettingsFormSkeleton } from '../components/skeletons';
import './BankTransactionDetail.css';

export function BankTransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAccount } = useAccountStore();
  const {
    currentTransaction,
    transactions,
    isLoading,
    error,
    fetchTransaction,
    updateTransaction,
  } = useBankTransactionsStore();

  const [transaction, setTransaction] = useState<BankTransaction | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCategoryAssigner, setShowCategoryAssigner] = useState(false);

  useEffect(() => {
    if (id && currentAccount?.id) {
      const existingTransaction = transactions.find((t) => t.id === id);
      if (existingTransaction) {
        setTransaction(existingTransaction);
        setEditedNotes(existingTransaction.notes || '');
        setEditedTags(existingTransaction.tags || []);
      } else {
        fetchTransaction(currentAccount.id, id)
          .then((fetched) => {
            setTransaction(fetched);
            setEditedNotes(fetched.notes || '');
            setEditedTags(fetched.tags || []);
          })
          .catch(() => {
            // Error is handled by the store
          });
      }
    }
  }, [id, currentAccount?.id, transactions, fetchTransaction]);

  // Update local transaction when currentTransaction changes
  useEffect(() => {
    if (currentTransaction && currentTransaction.id === id) {
      setTransaction(currentTransaction);
      if (!isEditing) {
        setEditedNotes(currentTransaction.notes || '');
        setEditedTags(currentTransaction.tags || []);
      }
    }
  }, [currentTransaction, id, isEditing]);

  const handleSave = async () => {
    if (!id || !currentAccount?.id || !transaction) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await updateTransaction(currentAccount.id, id, {
        notes: editedNotes || undefined,
        tags: editedTags.length > 0 ? editedTags : undefined,
      });
      setTransaction(updated);
      setIsEditing(false);
    } catch {
      setSaveError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedNotes(transaction?.notes || '');
    setEditedTags(transaction?.tags || []);
    setIsEditing(false);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editedTags.includes(newTag.trim())) {
      setEditedTags([...editedTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleCategoryUpdate = async (categoryId: string) => {
    if (!id || !currentAccount?.id) return;
    try {
      const updated = await updateTransaction(currentAccount.id, id, {
        category_id: categoryId,
      });
      setTransaction(updated);
      setShowCategoryAssigner(false);
    } catch {
      // Error handled by store
    }
  };

  const handleRecurringToggle = async () => {
    if (!id || !currentAccount?.id || !transaction) return;
    try {
      const updated = await updateTransaction(currentAccount.id, id, {
        is_recurring: !transaction.is_recurring,
        recurrence_pattern: !transaction.is_recurring ? 'monthly' : undefined,
      });
      setTransaction(updated);
    } catch {
      // Error handled by store
    }
  };

  const getStatusClass = (status: BankTransactionStatus) => {
    switch (status) {
      case 'posted':
        return 'status-posted';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const getTypeClass = (type: BankTransactionType) => {
    switch (type) {
      case 'credit':
        return 'type-credit';
      case 'debit':
        return 'type-debit';
      case 'transfer':
        return 'type-transfer';
      case 'fee':
        return 'type-fee';
      case 'interest':
        return 'type-interest';
      case 'adjustment':
        return 'type-adjustment';
      default:
        return 'type-other';
    }
  };

  const formatAmount = (amount: number, currency: string, type: BankTransactionType) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(Math.abs(amount));
    return type === 'credit' || type === 'interest' ? `+${formatted}` : `-${formatted}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="bank-transaction-detail-page">
          <div className="detail-error">
            <h2>No Account Selected</h2>
            <p>Please select an account to view transaction details.</p>
            <button onClick={() => navigate('/accounts')} className="back-button">
              Select an Account
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && !transaction) {
    return (
      <PageTransition>
        <div className="bank-transaction-detail-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && !transaction) {
    return (
      <PageTransition>
        <div className="bank-transaction-detail-page">
          <div className="detail-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/bank-transactions')} className="back-button">
              Back to Bank Transactions
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!transaction) {
    return (
      <PageTransition>
        <div className="bank-transaction-detail-page">
          <div className="detail-error">
            <h2>Transaction Not Found</h2>
            <p>The transaction you're looking for doesn't exist.</p>
            <button onClick={() => navigate('/bank-transactions')} className="back-button">
              Back to Bank Transactions
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="bank-transaction-detail-page">
        <div className="detail-header">
          <Link to="/bank-transactions" className="back-link">
            &larr; Back to Bank Transactions
          </Link>
          <div className="detail-header-row">
            <div className="detail-header-info">
              <div>
                <h1>{transaction.merchant_name || transaction.description}</h1>
                <div className="detail-meta">
                  <span className={`transaction-status ${getStatusClass(transaction.status)}`}>
                    {transaction.status}
                  </span>
                  <span className={`transaction-type ${getTypeClass(transaction.type)}`}>
                    {transaction.type}
                  </span>
                  {transaction.is_recurring && (
                    <span className="recurring-badge">Recurring</span>
                  )}
                  {transaction.is_pending && (
                    <span className="pending-badge">Pending</span>
                  )}
                </div>
              </div>
            </div>
            <div className="detail-actions">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="cancel-edit-button"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="save-button"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="edit-button"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>

        {saveError && <div className="detail-error-message">{saveError}</div>}

        <div className="detail-content">
          <div className="transaction-amount-section">
            <div className="amount-display">
              <span className={transaction.type === 'credit' || transaction.type === 'interest' ? 'amount-positive' : 'amount-negative'}>
                {formatAmount(transaction.amount, transaction.currency, transaction.type)}
              </span>
            </div>
            <div className="transaction-date">
              {formatDate(transaction.date)}
            </div>
            {transaction.posted_date && transaction.posted_date !== transaction.date && (
              <div className="posted-date">
                Posted: {formatDate(transaction.posted_date)}
              </div>
            )}
          </div>

          <div className="detail-section">
            <h2>Category</h2>
            <div className="category-section">
              {transaction.category_name ? (
                <div className="current-category">
                  <span className="category-badge">{transaction.category_name}</span>
                  <button
                    onClick={() => setShowCategoryAssigner(true)}
                    className="change-category-button"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCategoryAssigner(true)}
                  className="assign-category-button"
                >
                  Assign Category
                </button>
              )}
            </div>
            {showCategoryAssigner && (
              <CategoryAssigner
                currentCategoryId={transaction.category_id}
                onSelect={handleCategoryUpdate}
                onCancel={() => setShowCategoryAssigner(false)}
              />
            )}
          </div>

          <div className="detail-section">
            <h2>Recurring</h2>
            <div className="recurring-section">
              <label className="recurring-toggle">
                <input
                  type="checkbox"
                  checked={transaction.is_recurring}
                  onChange={handleRecurringToggle}
                />
                <span>Mark as recurring transaction</span>
              </label>
              {transaction.is_recurring && transaction.recurrence_pattern && (
                <div className="recurrence-info">
                  Pattern: <span className="recurrence-pattern">{transaction.recurrence_pattern}</span>
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h2>Transaction Details</h2>
            <div className="detail-grid">
              {transaction.merchant_name && (
                <div className="detail-item">
                  <span className="detail-label">Merchant</span>
                  <span className="detail-value">{transaction.merchant_name}</span>
                </div>
              )}
              {transaction.merchant_category && (
                <div className="detail-item">
                  <span className="detail-label">Merchant Category</span>
                  <span className="detail-value">{transaction.merchant_category}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Description</span>
                <span className="detail-value">{transaction.description}</span>
              </div>
              {transaction.original_description && transaction.original_description !== transaction.description && (
                <div className="detail-item">
                  <span className="detail-label">Original Description</span>
                  <span className="detail-value">{transaction.original_description}</span>
                </div>
              )}
              {transaction.provider_transaction_id && (
                <div className="detail-item">
                  <span className="detail-label">Provider Transaction ID</span>
                  <span className="detail-value">{transaction.provider_transaction_id}</span>
                </div>
              )}
              {transaction.linked_receipt_id && (
                <div className="detail-item">
                  <span className="detail-label">Linked Receipt</span>
                  <Link to={`/receipts/${transaction.linked_receipt_id}`} className="detail-value receipt-link">
                    View Receipt
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h2>Tags</h2>
            {isEditing ? (
              <div className="tags-editor">
                <div className="tags-list editable">
                  {editedTags.map((tag) => (
                    <span key={tag} className="detail-tag">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="remove-tag-button"
                        type="button"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="add-tag-row">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    className="tag-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddTag}
                    className="add-tag-button"
                    type="button"
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <div className="detail-list">
                {transaction.tags && transaction.tags.length > 0 ? (
                  transaction.tags.map((tag) => (
                    <span key={tag} className="detail-tag">{tag}</span>
                  ))
                ) : (
                  <span className="no-tags">No tags</span>
                )}
              </div>
            )}
          </div>

          <div className="detail-section">
            <h2>Notes</h2>
            {isEditing ? (
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Add notes about this transaction..."
                className="notes-textarea"
                rows={4}
              />
            ) : (
              <p className="detail-notes">
                {transaction.notes || 'No notes'}
              </p>
            )}
          </div>

          <div className="detail-section detail-timestamps">
            <div className="timestamp-item">
              <span className="detail-label">Imported</span>
              <span className="detail-value">
                {formatDateTime(transaction.created_at)}
              </span>
            </div>
            <div className="timestamp-item">
              <span className="detail-label">Last Updated</span>
              <span className="detail-value">
                {formatDateTime(transaction.updated_at)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
