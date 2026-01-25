import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useBankTransactionsStore, type BankTransactionStatus, type BankTransactionType } from '../stores/bankTransactions';
import { useFinancialStore } from '../stores/financial';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import './BankTransactions.css';

const STATUS_OPTIONS: { value: BankTransactionStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'posted', label: 'Posted' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS: { value: BankTransactionType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'fee', label: 'Fee' },
  { value: 'interest', label: 'Interest' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'other', label: 'Other' },
];

export function BankTransactions() {
  const { currentAccount } = useAccountStore();
  const {
    transactions,
    isLoading,
    error,
    fetchTransactions,
  } = useBankTransactionsStore();
  const { accounts: financialAccounts, fetchAccounts } = useFinancialStore();

  const [statusFilter, setStatusFilter] = useState<BankTransactionStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<BankTransactionType | ''>('');
  const [financialAccountFilter, setFinancialAccountFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showRecurringOnly, setShowRecurringOnly] = useState(false);

  // Load financial accounts for filter dropdown
  useEffect(() => {
    if (currentAccount?.id) {
      fetchAccounts(currentAccount.id);
    }
  }, [currentAccount?.id, fetchAccounts]);

  // Load transactions when account or filters change
  useEffect(() => {
    if (currentAccount?.id) {
      fetchTransactions(currentAccount.id, {
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        financial_account_id: financialAccountFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        is_pending: showPendingOnly ? true : undefined,
        is_recurring: showRecurringOnly ? true : undefined,
      });
    }
  }, [currentAccount?.id, statusFilter, typeFilter, financialAccountFilter, startDate, endDate, showPendingOnly, showRecurringOnly, fetchTransactions]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as BankTransactionStatus | '');
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as BankTransactionType | '');
  }, []);

  const handleFinancialAccountChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFinancialAccountFilter(e.target.value);
  }, []);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  }, []);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDescriptionFilter(e.target.value);
  }, []);

  const handlePendingToggle = useCallback(() => {
    setShowPendingOnly((prev) => !prev);
  }, []);

  const handleRecurringToggle = useCallback(() => {
    setShowRecurringOnly((prev) => !prev);
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setTypeFilter('');
    setFinancialAccountFilter('');
    setStartDate('');
    setEndDate('');
    setDescriptionFilter('');
    setShowPendingOnly(false);
    setShowRecurringOnly(false);
  }, []);

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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter transactions by description (client-side filter)
  const filteredTransactions = descriptionFilter
    ? transactions.filter((t) =>
        t.description?.toLowerCase().includes(descriptionFilter.toLowerCase()) ||
        t.merchant_name?.toLowerCase().includes(descriptionFilter.toLowerCase())
      )
    : transactions;

  const hasActiveFilters = statusFilter || typeFilter || financialAccountFilter || startDate || endDate || descriptionFilter || showPendingOnly || showRecurringOnly;

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="bank-transactions-page">
          <div className="bank-transactions-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view bank transactions.</p>
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
        <div className="bank-transactions-page">
          <div className="bank-transactions-header">
            <h1>Bank Transactions</h1>
            <p className="bank-transactions-subtitle">View and manage imported bank transactions</p>
          </div>
          <AccountsListSkeleton count={6} />
        </div>
      </PageTransition>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <PageTransition>
        <div className="bank-transactions-page">
          <div className="bank-transactions-error">
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
      <div className="bank-transactions-page">
        <div className="bank-transactions-header">
          <div className="bank-transactions-header-row">
            <div>
              <h1>Bank Transactions</h1>
              <p className="bank-transactions-subtitle">View and manage imported bank transactions</p>
            </div>
          </div>
        </div>

        <div className="bank-transactions-filters">
          <div className="filter-row">
            <div className="date-filter">
              <label htmlFor="start-date" className="filter-label">From</label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={handleStartDateChange}
                className="date-input"
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
              />
            </div>
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="filter-select"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={handleTypeChange}
              className="filter-select"
            >
              {TYPE_OPTIONS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <select
              value={financialAccountFilter}
              onChange={handleFinancialAccountChange}
              className="filter-select account-select"
            >
              <option value="">All Accounts</option>
              {financialAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name || account.official_name || 'Unknown Account'}
                </option>
              ))}
            </select>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by description or merchant..."
                value={descriptionFilter}
                onChange={handleDescriptionChange}
                className="search-input"
              />
            </div>
          </div>
          <div className="filter-row toggle-row">
            <label className="toggle-filter">
              <input
                type="checkbox"
                checked={showPendingOnly}
                onChange={handlePendingToggle}
              />
              <span>Pending Only</span>
            </label>
            <label className="toggle-filter">
              <input
                type="checkbox"
                checked={showRecurringOnly}
                onChange={handleRecurringToggle}
              />
              <span>Recurring Only</span>
            </label>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="bank-transactions-empty">
            <h2>No Bank Transactions Found</h2>
            <p>
              {hasActiveFilters
                ? 'No transactions match your filter criteria.'
                : "You don't have any bank transactions yet. Connect a financial account to import transactions."}
            </p>
            {!hasActiveFilters && (
              <Link to="/connections" className="connect-account-link">
                Connect a Financial Account
              </Link>
            )}
          </div>
        ) : (
          <div className="bank-transactions-list">
            <div className="bank-transactions-table-header">
              <div className="table-col col-date">Date</div>
              <div className="table-col col-description">Description</div>
              <div className="table-col col-category">Category</div>
              <div className="table-col col-type">Type</div>
              <div className="table-col col-amount">Amount</div>
              <div className="table-col col-status">Status</div>
            </div>
            {filteredTransactions.map((transaction) => (
              <Link
                key={transaction.id}
                to={`/bank-transactions/${transaction.id}`}
                className="bank-transaction-row"
              >
                <div className="table-col col-date">
                  {formatDate(transaction.date)}
                </div>
                <div className="table-col col-description">
                  <span className="description-text">
                    {transaction.merchant_name || transaction.description}
                  </span>
                  {transaction.merchant_name && transaction.description !== transaction.merchant_name && (
                    <span className="original-description">{transaction.description}</span>
                  )}
                  {transaction.is_recurring && (
                    <span className="recurring-indicator">Recurring</span>
                  )}
                </div>
                <div className="table-col col-category">
                  {transaction.category_name ? (
                    <span className="category-badge">{transaction.category_name}</span>
                  ) : (
                    <span className="uncategorized-badge">Uncategorized</span>
                  )}
                </div>
                <div className="table-col col-type">
                  <span className={`transaction-type ${getTypeClass(transaction.type)}`}>
                    {transaction.type}
                  </span>
                </div>
                <div className="table-col col-amount">
                  <span className={transaction.type === 'credit' || transaction.type === 'interest' ? 'amount-positive' : 'amount-negative'}>
                    {formatAmount(transaction.amount, transaction.currency, transaction.type)}
                  </span>
                </div>
                <div className="table-col col-status">
                  <span className={`transaction-status ${getStatusClass(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
