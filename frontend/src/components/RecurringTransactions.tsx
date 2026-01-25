import { useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useBankTransactionsStore, type BankTransaction, type BankTransactionType } from '../stores/bankTransactions';
import { useAccountStore } from '../stores/account';
import './RecurringTransactions.css';

const RECURRENCE_PATTERNS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
];

interface RecurringTransactionsProps {
  onClose?: () => void;
}

export function RecurringTransactions({ onClose }: RecurringTransactionsProps) {
  const { currentAccount } = useAccountStore();
  const {
    recurringTransactions,
    recurringTotal,
    isLoading,
    error,
    fetchRecurring,
    updateTransaction,
  } = useBankTransactionsStore();

  useEffect(() => {
    if (currentAccount?.id) {
      fetchRecurring(currentAccount.id, { limit: 50 });
    }
  }, [currentAccount?.id, fetchRecurring]);

  const handleToggleRecurring = useCallback(async (transaction: BankTransaction) => {
    if (!currentAccount?.id) return;
    try {
      await updateTransaction(currentAccount.id, transaction.id, {
        is_recurring: !transaction.is_recurring,
        recurrence_pattern: !transaction.is_recurring ? 'monthly' : undefined,
      });
      // Refetch after update
      fetchRecurring(currentAccount.id, { limit: 50 });
    } catch {
      // Error handled by store
    }
  }, [currentAccount, updateTransaction, fetchRecurring]);

  const handleChangePattern = useCallback(async (transaction: BankTransaction, pattern: string) => {
    if (!currentAccount?.id) return;
    try {
      await updateTransaction(currentAccount.id, transaction.id, {
        recurrence_pattern: pattern,
      });
    } catch {
      // Error handled by store
    }
  }, [currentAccount, updateTransaction]);

  const formatAmount = (amount: number, currency: string, type: BankTransactionType) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(Math.abs(amount));
    return type === 'credit' || type === 'interest' ? `+${formatted}` : `-${formatted}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
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
      default:
        return 'type-other';
    }
  };

  if (!currentAccount) {
    return (
      <div className="recurring-transactions">
        <div className="recurring-header">
          <h2>Recurring Transactions</h2>
          {onClose && (
            <button className="close-button" onClick={onClose}>×</button>
          )}
        </div>
        <div className="recurring-empty">
          <p>Please select an account to view recurring transactions.</p>
        </div>
      </div>
    );
  }

  if (isLoading && recurringTransactions.length === 0) {
    return (
      <div className="recurring-transactions">
        <div className="recurring-header">
          <h2>Recurring Transactions</h2>
          {onClose && (
            <button className="close-button" onClick={onClose}>×</button>
          )}
        </div>
        <div className="recurring-loading">Loading...</div>
      </div>
    );
  }

  if (error && recurringTransactions.length === 0) {
    return (
      <div className="recurring-transactions">
        <div className="recurring-header">
          <h2>Recurring Transactions</h2>
          {onClose && (
            <button className="close-button" onClick={onClose}>×</button>
          )}
        </div>
        <div className="recurring-error">
          <p>{error}</p>
          <button
            onClick={() => fetchRecurring(currentAccount.id)}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="recurring-transactions">
      <div className="recurring-header">
        <div>
          <h2>Recurring Transactions</h2>
          <p className="recurring-subtitle">
            {recurringTotal} recurring {recurringTotal === 1 ? 'transaction' : 'transactions'} detected
          </p>
        </div>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>

      <div className="recurring-info">
        <p>
          Transactions marked as recurring will be used for budgeting predictions and
          cash flow analysis. Adjust the recurrence pattern to match your billing cycle.
        </p>
      </div>

      {recurringTransactions.length === 0 ? (
        <div className="recurring-empty">
          <h3>No Recurring Transactions</h3>
          <p>
            No transactions have been marked as recurring yet. You can mark transactions as
            recurring from their detail page, or they may be automatically detected based on patterns.
          </p>
          <Link to="/bank-transactions" className="view-transactions-link">
            View All Transactions
          </Link>
        </div>
      ) : (
        <div className="recurring-list">
          {recurringTransactions.map((transaction) => (
            <div key={transaction.id} className="recurring-item">
              <div className="recurring-item-main">
                <Link
                  to={`/bank-transactions/${transaction.id}`}
                  className="recurring-item-link"
                >
                  <div className="recurring-item-info">
                    <span className="recurring-merchant">
                      {transaction.merchant_name || transaction.description}
                    </span>
                    {transaction.category_name && (
                      <span className="recurring-category">{transaction.category_name}</span>
                    )}
                  </div>
                  <div className="recurring-item-amount">
                    <span className={transaction.type === 'credit' || transaction.type === 'interest' ? 'amount-positive' : 'amount-negative'}>
                      {formatAmount(transaction.amount, transaction.currency, transaction.type)}
                    </span>
                    <span className={`recurring-type ${getTypeClass(transaction.type)}`}>
                      {transaction.type}
                    </span>
                  </div>
                </Link>
              </div>
              <div className="recurring-item-controls">
                <div className="recurring-item-date">
                  Last: {formatDate(transaction.date)}
                </div>
                <select
                  value={transaction.recurrence_pattern || 'monthly'}
                  onChange={(e) => handleChangePattern(transaction, e.target.value)}
                  className="pattern-select"
                >
                  {RECURRENCE_PATTERNS.map((pattern) => (
                    <option key={pattern.value} value={pattern.value}>
                      {pattern.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleToggleRecurring(transaction)}
                  className="remove-recurring-button"
                  title="Remove from recurring"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
