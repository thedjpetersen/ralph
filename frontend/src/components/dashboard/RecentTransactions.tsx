import { Link } from 'react-router-dom';
import { useId } from 'react';
import type { Transaction } from '../../api/client';
import './RecentTransactions.css';

interface RecentTransactionsProps {
  transactions: Transaction[];
  currency?: string;
  isLoading?: boolean;
  limit?: number;
}

const TRANSACTION_TYPE_ICONS: Record<string, string> = {
  purchase: '-',
  refund: '+',
  payment: '-',
  withdrawal: '-',
  deposit: '+',
  transfer: '~',
  other: '~',
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  refund: 'Refund',
  payment: 'Payment',
  withdrawal: 'Withdrawal',
  deposit: 'Deposit',
  transfer: 'Transfer',
  other: 'Transaction',
};

export function RecentTransactions({
  transactions,
  currency = 'USD',
  isLoading,
  limit = 5,
}: RecentTransactionsProps) {
  const formatAmount = (amount: number, type: string) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(Math.abs(amount));

    const isNegative = ['purchase', 'payment', 'withdrawal'].includes(type);
    return isNegative ? `-${formatted}` : `+${formatted}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getAmountClass = (type: string) => {
    if (['refund', 'deposit'].includes(type)) return 'amount-positive';
    if (['purchase', 'payment', 'withdrawal'].includes(type)) return 'amount-negative';
    return '';
  };

  const displayTransactions = transactions.slice(0, limit);
  const headingId = useId();
  const listId = useId();

  if (isLoading) {
    return (
      <section
        className="recent-transactions"
        aria-labelledby={headingId}
        aria-busy="true"
      >
        <div className="recent-transactions-header">
          <h3 id={headingId}>Recent Transactions</h3>
        </div>
        <div
          className="transactions-list"
          role="list"
          aria-label="Loading transactions"
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="transaction-item skeleton"
              role="listitem"
              aria-hidden="true"
            >
              <div className="skeleton-icon" />
              <div className="skeleton-content">
                <div className="skeleton-title" />
                <div className="skeleton-subtitle" />
              </div>
              <div className="skeleton-amount" />
            </div>
          ))}
        </div>
        <span className="sr-only" role="status">Loading recent transactions</span>
      </section>
    );
  }

  if (transactions.length === 0) {
    return (
      <section
        className="recent-transactions recent-transactions-empty"
        aria-labelledby={headingId}
      >
        <div className="recent-transactions-header">
          <h3 id={headingId}>Recent Transactions</h3>
        </div>
        <div className="recent-transactions-empty-content" role="status">
          <span className="empty-icon" aria-hidden="true">$</span>
          <p>No transactions yet</p>
          <Link to="/transactions/new" className="add-transaction-link">
            Add Transaction
          </Link>
        </div>
      </section>
    );
  }

  const getAccessibleLabel = (transaction: Transaction) => {
    const typeLabel = TRANSACTION_TYPE_LABELS[transaction.type] || 'Transaction';
    const merchant = transaction.merchant_name || transaction.description || 'Unknown';
    const amount = formatAmount(transaction.amount, transaction.type);
    const date = formatDate(transaction.transaction_date);
    return `${typeLabel}: ${merchant}, ${amount}, ${date}`;
  };

  return (
    <section
      className="recent-transactions"
      aria-labelledby={headingId}
    >
      <div className="recent-transactions-header">
        <h3 id={headingId}>Recent Transactions</h3>
        <Link to="/transactions" className="view-all-link">
          View All
        </Link>
      </div>
      <ul
        id={listId}
        className="transactions-list"
        role="list"
        aria-label={`${displayTransactions.length} recent transactions`}
      >
        {displayTransactions.map((transaction) => (
          <li key={transaction.id} role="listitem">
            <Link
              to={`/transactions/${transaction.id}`}
              className="transaction-item"
              aria-label={getAccessibleLabel(transaction)}
            >
              <div className="transaction-icon" aria-hidden="true">
                <span>{TRANSACTION_TYPE_ICONS[transaction.type] || '~'}</span>
              </div>
              <div className="transaction-content">
                <span className="transaction-merchant">
                  {transaction.merchant_name || transaction.description || 'Transaction'}
                </span>
                <span className="transaction-meta">
                  {formatDate(transaction.transaction_date)}
                  {transaction.merchant_category && ` • ${transaction.merchant_category}`}
                </span>
              </div>
              <span className={`transaction-amount ${getAmountClass(transaction.type)}`} aria-hidden="true">
                {formatAmount(transaction.amount, transaction.type)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
