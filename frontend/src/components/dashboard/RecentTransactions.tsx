import { Link } from 'react-router-dom';
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

  if (isLoading) {
    return (
      <div className="recent-transactions">
        <div className="recent-transactions-header">
          <h3>Recent Transactions</h3>
        </div>
        <div className="transactions-list">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="transaction-item skeleton">
              <div className="skeleton-icon" />
              <div className="skeleton-content">
                <div className="skeleton-title" />
                <div className="skeleton-subtitle" />
              </div>
              <div className="skeleton-amount" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="recent-transactions recent-transactions-empty">
        <div className="recent-transactions-header">
          <h3>Recent Transactions</h3>
        </div>
        <div className="recent-transactions-empty-content">
          <span className="empty-icon">$</span>
          <p>No transactions yet</p>
          <Link to="/transactions/new" className="add-transaction-link">
            Add Transaction
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-transactions">
      <div className="recent-transactions-header">
        <h3>Recent Transactions</h3>
        <Link to="/transactions" className="view-all-link">
          View All
        </Link>
      </div>
      <div className="transactions-list">
        {displayTransactions.map((transaction) => (
          <Link
            key={transaction.id}
            to={`/transactions/${transaction.id}`}
            className="transaction-item"
          >
            <div className="transaction-icon">
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
            <span className={`transaction-amount ${getAmountClass(transaction.type)}`}>
              {formatAmount(transaction.amount, transaction.type)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
