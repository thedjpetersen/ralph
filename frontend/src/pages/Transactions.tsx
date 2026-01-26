import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTransactionsStore, type TransactionStatus, type TransactionType } from '../stores/transactions';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import { Pagination } from '../components/ui/Table';
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

type SortField = 'transaction_date' | 'merchant_name' | 'amount' | 'merchant_category' | 'status';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('transaction_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const prevFilteredCountRef = useRef<number | null>(null);

  // Extract unique stores and categories from transactions for filter dropdowns
  const { uniqueStores, uniqueCategories } = useMemo(() => {
    const stores = new Set<string>();
    const categories = new Set<string>();
    transactions.forEach((t) => {
      if (t.merchant_name) stores.add(t.merchant_name);
      if (t.merchant_category) categories.add(t.merchant_category);
    });
    return {
      uniqueStores: Array.from(stores).sort(),
      uniqueCategories: Array.from(categories).sort(),
    };
  }, [transactions]);

  // Load transactions when account or server-side filters change
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
    setCurrentPage(1);
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as TransactionType | '');
    setCurrentPage(1);
  }, []);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleStoreChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStoreFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setTypeFilter('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setStoreFilter('');
    setCategoryFilter('');
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    announce(`Page ${page}`);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
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

  // Filter transactions (client-side filters)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search filter (search in merchant name, description)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesMerchant = t.merchant_name?.toLowerCase().includes(query);
        const matchesDescription = t.description?.toLowerCase().includes(query);
        if (!matchesMerchant && !matchesDescription) return false;
      }
      // Store filter
      if (storeFilter && t.merchant_name !== storeFilter) return false;
      // Category filter
      if (categoryFilter && t.merchant_category !== categoryFilter) return false;
      return true;
    });
  }, [transactions, searchQuery, storeFilter, categoryFilter]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'transaction_date':
          comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
          break;
        case 'merchant_name':
          comparison = (a.merchant_name || '').localeCompare(b.merchant_name || '');
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'merchant_category':
          comparison = (a.merchant_category || '').localeCompare(b.merchant_category || '');
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredTransactions, sortField, sortDirection]);

  // Paginate transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(startIndex, startIndex + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedTransactions.length / pageSize);

  const hasActiveFilters = statusFilter || typeFilter || startDate || endDate || searchQuery || storeFilter || categoryFilter;

  // Announce filter results to screen readers
  useEffect(() => {
    if (prevFilteredCountRef.current !== null && prevFilteredCountRef.current !== filteredTransactions.length) {
      const message = filteredTransactions.length === 0
        ? 'No transactions found matching your filters'
        : `Showing ${filteredTransactions.length} transaction${filteredTransactions.length === 1 ? '' : 's'}`;
      announce(message);
    }
    prevFilteredCountRef.current = filteredTransactions.length;
  }, [filteredTransactions.length]);

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const renderSortableHeader = (field: SortField, label: string, className: string) => (
    <button
      type="button"
      className={`table-col ${className} sortable-header`}
      onClick={() => handleSort(field)}
      aria-sort={sortField === field ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      {label}
      <span className="sort-indicator" aria-hidden="true">
        {getSortIndicator(field) || '⇅'}
      </span>
    </button>
  );

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
            <label htmlFor="store-filter" className="sr-only">Filter by store</label>
            <select
              id="store-filter"
              value={storeFilter}
              onChange={handleStoreChange}
              className="filter-select"
              aria-label="Filter by store"
            >
              <option value="">All Stores</option>
              {uniqueStores.map((store) => (
                <option key={store} value={store}>
                  {store}
                </option>
              ))}
            </select>
            <label htmlFor="category-filter" className="sr-only">Filter by category</label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={handleCategoryChange}
              className="filter-select"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
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
            <div className="search-box">
              <label htmlFor="search-input" className="sr-only">Search transactions</label>
              <input
                type="text"
                id="search-input"
                placeholder="Search by store or description..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="search-input"
                aria-label="Search transactions by store name or description"
              />
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button" aria-label="Clear all filters">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {paginatedTransactions.length === 0 ? (
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
          <>
            <div className="transactions-list" role="region" aria-label={`Transactions list, ${sortedTransactions.length} results`}>
              <div className="transactions-table-header" role="row">
                {renderSortableHeader('transaction_date', 'Date', 'col-date')}
                {renderSortableHeader('merchant_name', 'Store', 'col-store')}
                {renderSortableHeader('amount', 'Amount', 'col-amount')}
                {renderSortableHeader('merchant_category', 'Category', 'col-category')}
                {renderSortableHeader('status', 'Status', 'col-status')}
              </div>
              {paginatedTransactions.map((transaction) => {
                const amountPrefix = transaction.type === 'refund' || transaction.type === 'deposit' ? '+' : '-';
                const accessibleLabel = `${transaction.merchant_name || 'Unknown Store'}, ${formatDate(transaction.transaction_date)}, ${amountPrefix}${formatAmount(transaction.amount, transaction.currency)}, ${transaction.merchant_category || 'Uncategorized'}, ${transaction.status}`;
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
                    <div className="table-col col-store" aria-hidden="true">
                      <span className="store-name">
                        {transaction.merchant_name || 'Unknown Store'}
                      </span>
                      {transaction.description && (
                        <span className="transaction-description">{transaction.description}</span>
                      )}
                    </div>
                    <div className="table-col col-amount" aria-hidden="true">
                      <span className={transaction.type === 'refund' || transaction.type === 'deposit' ? 'amount-positive' : 'amount-negative'}>
                        {amountPrefix}
                        {formatAmount(transaction.amount, transaction.currency)}
                      </span>
                    </div>
                    <div className="table-col col-category" aria-hidden="true">
                      <span className="category-badge">
                        {transaction.merchant_category || 'Uncategorized'}
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
            <div className="transactions-pagination">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={sortedTransactions.length}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showPageSizeSelector
                showInfo
              />
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
