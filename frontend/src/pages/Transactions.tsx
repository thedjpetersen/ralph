import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTransactionsStore, type TransactionStatus, type TransactionType } from '../stores/transactions';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import { announce } from '../stores/announcer';
import './Transactions.css';

const STATUS_OPTIONS: { value: TransactionStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS: { value: TransactionType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'refund', label: 'Refund' },
  { value: 'payment', label: 'Payment' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Other' },
];

export function Transactions() {
  const { currentAccount } = useAccountStore();
  const {
    transactions,
    isLoading,
    error,
    fetchTransactions,
  } = useTransactionsStore();

  const [statusFilter, setStatusFilter] = useState<TransactionStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('');
  const prevFilteredCountRef = useRef<number | null>(null);

  // Load transactions when account or filters change
  useEffect(() => {
    if (currentAccount?.id) {
      fetchTransactions(currentAccount.id, {
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
    }
  }, [currentAccount?.id, statusFilter, typeFilter, startDate, endDate, fetchTransactions]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as TransactionStatus | '');
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as TransactionType | '');
  }, []);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  }, []);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  }, []);

  const handleMerchantChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMerchantFilter(e.target.value);
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setTypeFilter('');
    setStartDate('');
    setEndDate('');
    setMerchantFilter('');
  }, []);

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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter transactions by merchant name (client-side filter)
  const filteredTransactions = merchantFilter
    ? transactions.filter((t) =>
        t.merchant_name?.toLowerCase().includes(merchantFilter.toLowerCase())
      )
    : transactions;

  const hasActiveFilters = statusFilter || typeFilter || startDate || endDate || merchantFilter;

  // Announce filter results to screen readers
  useEffect(() => {
    // Only announce after initial load and when count changes
    if (prevFilteredCountRef.current !== null && prevFilteredCountRef.current !== filteredTransactions.length) {
      const message = filteredTransactions.length === 0
        ? 'No transactions found matching your filters'
        : `Showing ${filteredTransactions.length} transaction${filteredTransactions.length === 1 ? '' : 's'}`;
      announce(message);
    }
    prevFilteredCountRef.current = filteredTransactions.length;
  }, [filteredTransactions.length]);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="transactions-page">
          <div className="transactions-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view transactions.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && transactions.length === 0) {
    return (
      <PageTransition>
        <div className="transactions-page">
          <div className="transactions-header">
            <h1>Transactions</h1>
            <p className="transactions-subtitle">View and manage transactions</p>
          </div>
          <AccountsListSkeleton count={6} />
        </div>
      </PageTransition>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <PageTransition>
        <div className="transactions-page">
          <div className="transactions-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={() => fetchTransactions(currentAccount.id)}
              className="retry-button"
            >
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="transactions-page">
        <div className="transactions-header">
          <div className="transactions-header-row">
            <div>
              <h1>Transactions</h1>
              <p className="transactions-subtitle">View and manage transactions</p>
            </div>
            <Link to="/transactions/new" className="create-transaction-button">
              Add Transaction
            </Link>
          </div>
        </div>

        <div className="transactions-filters" role="search" aria-label="Filter transactions">
          <div className="filter-row">
            <div className="date-filter">
              <label htmlFor="start-date" className="filter-label">From</label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={handleStartDateChange}
                className="date-input"
                aria-describedby="date-filter-hint"
              />
            </div>
            <div className="date-filter">
              <label htmlFor="end-date" className="filter-label">To</label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={handleEndDateChange}
                className="date-input"
                aria-describedby="date-filter-hint"
              />
            </div>
            <span id="date-filter-hint" className="sr-only">Filter transactions by date range</span>
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="filter-select"
              aria-label="Filter by transaction status"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <label htmlFor="type-filter" className="sr-only">Filter by type</label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={handleTypeChange}
              className="filter-select"
              aria-label="Filter by transaction type"
            >
              {TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <div className="search-box">
              <label htmlFor="merchant-search" className="sr-only">Search by merchant name</label>
              <input
                type="text"
                id="merchant-search"
                placeholder="Search by merchant..."
                value={merchantFilter}
                onChange={handleMerchantChange}
                className="search-input"
                aria-label="Search transactions by merchant name"
              />
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button" aria-label="Clear all filters">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="transactions-empty">
            <h2>No Transactions Found</h2>
            <p>
              {hasActiveFilters
                ? 'No transactions match your filter criteria.'
                : "You don't have any transactions yet."}
            </p>
            {!hasActiveFilters && (
              <Link to="/transactions/new" className="create-transaction-link">
                Create your first transaction
              </Link>
            )}
          </div>
        ) : (
          <div className="transactions-list" role="region" aria-label={`Transactions list, ${filteredTransactions.length} results`}>
            <div className="transactions-table-header" role="row" aria-hidden="true">
              <div className="table-col col-date">Date</div>
              <div className="table-col col-merchant">Merchant</div>
              <div className="table-col col-type">Type</div>
              <div className="table-col col-amount">Amount</div>
              <div className="table-col col-status">Status</div>
            </div>
            {filteredTransactions.map((transaction) => {
              const amountPrefix = transaction.type === 'refund' || transaction.type === 'deposit' ? '+' : '-';
              const accessibleLabel = `${transaction.merchant_name || 'Unknown Merchant'}, ${formatDate(transaction.transaction_date)}, ${amountPrefix}${formatAmount(transaction.amount, transaction.currency)}, ${transaction.type}, ${transaction.status}`;
              return (
                <Link
                  key={transaction.id}
                  to={`/transactions/${transaction.id}`}
                  className="transaction-row"
                  aria-label={accessibleLabel}
                >
                  <div className="table-col col-date" aria-hidden="true">
                    {formatDate(transaction.transaction_date)}
                  </div>
                  <div className="table-col col-merchant" aria-hidden="true">
                    <span className="merchant-name">
                      {transaction.merchant_name || 'Unknown Merchant'}
                    </span>
                    {transaction.description && (
                      <span className="transaction-description">{transaction.description}</span>
                    )}
                  </div>
                  <div className="table-col col-type" aria-hidden="true">
                    <span className={`transaction-type ${getTypeClass(transaction.type)}`}>
                      {transaction.type}
                    </span>
                  </div>
                  <div className="table-col col-amount" aria-hidden="true">
                    <span className={transaction.type === 'refund' || transaction.type === 'deposit' ? 'amount-positive' : 'amount-negative'}>
                      {amountPrefix}
                      {formatAmount(transaction.amount, transaction.currency)}
                    </span>
                  </div>
                  <div className="table-col col-status" aria-hidden="true">
                    <span className={`transaction-status ${getStatusClass(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
