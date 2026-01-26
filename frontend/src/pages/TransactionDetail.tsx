import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTransactionsStore, type Transaction, type TransactionStatus, type TransactionType } from '../stores/transactions';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { LineItemList } from '../components/LineItemList';
import { AICommentCard } from '../components/AICommentCard';
import { SettingsFormSkeleton } from '../components/skeletons';
import './TransactionDetail.css';

export function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAccount } = useAccountStore();
  const {
    currentTransaction,
    transactions,
    lineItems,
    isLoading,
    error,
    fetchTransaction,
    fetchLineItems,
    deleteTransaction,
  } = useTransactionsStore();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (id && currentAccount?.id) {
      const existingTransaction = transactions.find((t) => t.id === id);
      if (existingTransaction) {
        setTransaction(existingTransaction);
      } else {
        fetchTransaction(currentAccount.id, id)
          .then((fetched) => {
            setTransaction(fetched);
          })
          .catch(() => {
            // Error is handled by the store
          });
      }
      // Fetch line items for this transaction
      fetchLineItems(currentAccount.id, id);
    }
  }, [id, currentAccount?.id, transactions, fetchTransaction, fetchLineItems]);

  // Update local transaction when currentTransaction changes
  useEffect(() => {
    if (currentTransaction && currentTransaction.id === id) {
      setTransaction(currentTransaction);
    }
  }, [currentTransaction, id]);

  const handleDelete = async () => {
    if (!id || !currentAccount?.id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteTransaction(currentAccount.id, id);
      navigate('/transactions');
    } catch {
      setDeleteError('Failed to delete transaction');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getStatusClass = (status: TransactionStatus) => {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      case 'failed':
        return 'status-failed';
      case 'refunded':
        return 'status-refunded';
      case 'disputed':
        return 'status-disputed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const getTypeClass = (type: TransactionType) => {
    switch (type) {
      case 'purchase':
        return 'type-purchase';
      case 'refund':
        return 'type-refund';
      case 'deposit':
        return 'type-deposit';
      case 'withdrawal':
        return 'type-withdrawal';
      case 'transfer':
        return 'type-transfer';
      case 'payment':
        return 'type-payment';
      default:
        return 'type-other';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
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
        <div className="transaction-detail-page">
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
        <div className="transaction-detail-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && !transaction) {
    return (
      <PageTransition>
        <div className="transaction-detail-page">
          <div className="detail-error">
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

  if (!transaction) {
    return (
      <PageTransition>
        <div className="transaction-detail-page">
          <div className="detail-error">
            <h2>Transaction Not Found</h2>
            <p>The transaction you're looking for doesn't exist.</p>
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
      <div className="transaction-detail-page">
        <div className="detail-header">
          <Link to="/transactions" className="back-link">
            &larr; Back to Transactions
          </Link>
          <div className="detail-header-row">
            <div className="detail-header-info">
              <div>
                <h1>{transaction.merchant_name || 'Transaction'}</h1>
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
                </div>
              </div>
            </div>
            <div className="detail-actions">
              <Link to={`/transactions/${transaction.id}/edit`} className="edit-button">
                Edit Transaction
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="delete-button"
                disabled={isDeleting}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {deleteError && <div className="detail-error-message">{deleteError}</div>}

        <div className="detail-content">
          <div className="transaction-amount-section">
            <div className="amount-display">
              <span className={transaction.type === 'refund' || transaction.type === 'deposit' ? 'amount-positive' : 'amount-negative'}>
                {transaction.type === 'refund' || transaction.type === 'deposit' ? '+' : '-'}
                {formatAmount(transaction.amount, transaction.currency)}
              </span>
            </div>
            <div className="transaction-date">
              {formatDate(transaction.transaction_date)}
            </div>
          </div>

          {transaction.description && (
            <div className="detail-section">
              <h2>Description</h2>
              <p className="detail-description">{transaction.description}</p>
            </div>
          )}

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
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{transaction.merchant_category}</span>
                </div>
              )}
              {transaction.payment_method && (
                <div className="detail-item">
                  <span className="detail-label">Payment Method</span>
                  <span className="detail-value">{transaction.payment_method}</span>
                </div>
              )}
              {transaction.card_last_four && (
                <div className="detail-item">
                  <span className="detail-label">Card</span>
                  <span className="detail-value">**** {transaction.card_last_four}</span>
                </div>
              )}
              {transaction.reference_number && (
                <div className="detail-item">
                  <span className="detail-label">Reference Number</span>
                  <span className="detail-value">{transaction.reference_number}</span>
                </div>
              )}
              {transaction.authorization_code && (
                <div className="detail-item">
                  <span className="detail-label">Authorization Code</span>
                  <span className="detail-value">{transaction.authorization_code}</span>
                </div>
              )}
              {transaction.is_recurring && transaction.recurrence_pattern && (
                <div className="detail-item">
                  <span className="detail-label">Recurrence</span>
                  <span className="detail-value">{transaction.recurrence_pattern}</span>
                </div>
              )}
            </div>
          </div>

          {transaction.category_tags && transaction.category_tags.length > 0 && (
            <div className="detail-section">
              <h2>Tags</h2>
              <div className="detail-list">
                {transaction.category_tags.map((tag, index) => (
                  <span key={index} className="detail-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {transaction.notes && (
            <div className="detail-section">
              <h2>Notes</h2>
              <p className="detail-notes">{transaction.notes}</p>
            </div>
          )}

          {transaction.receipt_id && (
            <div className="detail-section">
              <h2>Source Receipt</h2>
              <div className="receipt-link-container">
                <Link to={`/receipts/${transaction.receipt_id}`} className="receipt-link">
                  <span className="receipt-link-icon">📄</span>
                  <span className="receipt-link-text">View Source Receipt</span>
                </Link>
              </div>
            </div>
          )}

          <div className="detail-section">
            <h2>Line Items</h2>
            <LineItemList
              accountId={currentAccount.id}
              transactionId={transaction.id}
              lineItems={lineItems}
              currency={transaction.currency}
            />
          </div>

          <div className="detail-section">
            <h2>AI Analysis</h2>
            <AICommentCard
              entityType="transaction"
              entityId={transaction.id}
              context={{
                merchant_name: transaction.merchant_name,
                amount: transaction.amount,
                currency: transaction.currency,
                type: transaction.type,
                category: transaction.merchant_category,
                transaction_date: transaction.transaction_date,
              }}
            />
          </div>

          <div className="detail-section detail-timestamps">
            <div className="timestamp-item">
              <span className="detail-label">Created</span>
              <span className="detail-value">
                {formatDateTime(transaction.created_at)}
              </span>
            </div>
            <div className="timestamp-item">
              <span className="detail-label">Updated</span>
              <span className="detail-value">
                {formatDateTime(transaction.updated_at)}
              </span>
            </div>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="delete-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Transaction</h3>
              <p>
                Are you sure you want to delete this transaction from{' '}
                <strong>{transaction.merchant_name || 'Unknown Merchant'}</strong>?
                This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="cancel-button"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="confirm-delete-button"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Transaction'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
