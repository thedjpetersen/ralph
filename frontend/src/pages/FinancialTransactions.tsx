import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useBankTransactionsStore, type BankTransactionStatus, type BankTransactionType, type BankTransaction } from '../stores/bankTransactions';
import { useFinancialStore } from '../stores/financial';
import { useAccountStore } from '../stores/account';
import { useReceiptsStore, type Receipt } from '../stores/receipts';
import { useCategoriesStore } from '../stores/categories';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import { Pagination } from '../components/ui/Table';
import { announce } from '../stores/announcer';
import './FinancialTransactions.css';

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

type SortField = 'date' | 'merchant_name' | 'amount' | 'category_name' | 'status';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface ReceiptSuggestion {
  receipt: Receipt;
  score: number;
  matchReason: string;
}

export function FinancialTransactions() {
  const { currentAccount } = useAccountStore();
  const {
    transactions,
    isLoading,
    error,
    fetchTransactions,
    updateTransaction,
  } = useBankTransactionsStore();
  const { accounts: financialAccounts, fetchAccounts } = useFinancialStore();
  const { receipts, fetchReceipts } = useReceiptsStore();
  const { categories, fetchCategories } = useCategoriesStore();

  // Filters
  const [statusFilter, setStatusFilter] = useState<BankTransactionStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<BankTransactionType | ''>('');
  const [financialAccountFilter, setFinancialAccountFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Sorting and pagination
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Category assignment modal
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState('');

  // Receipt linking modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');

  const prevFilteredCountRef = useRef<number | null>(null);

  // Load financial accounts and categories for filter dropdowns
  useEffect(() => {
    if (currentAccount?.id) {
      fetchAccounts(currentAccount.id);
      fetchCategories();
      fetchReceipts(currentAccount.id, { limit: 200 });
    }
  }, [currentAccount?.id, fetchAccounts, fetchCategories, fetchReceipts]);

  // Load transactions when account or filters change
  useEffect(() => {
    if (currentAccount?.id) {
      fetchTransactions(currentAccount.id, {
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        financial_account_id: financialAccountFilter || undefined,
        category_id: categoryFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        is_pending: showPendingOnly ? true : undefined,
      });
    }
  }, [currentAccount?.id, statusFilter, typeFilter, financialAccountFilter, categoryFilter, startDate, endDate, showPendingOnly, fetchTransactions]);

  const generateReceiptSuggestions = useCallback((transaction: BankTransaction, allReceipts: Receipt[]): ReceiptSuggestion[] => {
    const suggestions: ReceiptSuggestion[] = [];
    const transactionDate = new Date(transaction.date);
    const transactionAmount = Math.abs(transaction.amount);

    for (const receipt of allReceipts) {
      // Skip receipts that are already linked
      if (receipt.transaction_id) continue;

      let score = 0;
      const matchReasons: string[] = [];

      // Check amount match (within 5%)
      if (receipt.total_amount) {
        const amountDiff = Math.abs(receipt.total_amount - transactionAmount);
        const percentDiff = (amountDiff / transactionAmount) * 100;
        if (percentDiff < 1) {
          score += 50;
          matchReasons.push('Exact amount match');
        } else if (percentDiff < 5) {
          score += 30;
          matchReasons.push('Similar amount');
        }
      }

      // Check date match
      if (receipt.receipt_date) {
        const receiptDate = new Date(receipt.receipt_date);
        const daysDiff = Math.abs((transactionDate.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 1) {
          score += 30;
          matchReasons.push('Same day');
        } else if (daysDiff < 3) {
          score += 20;
          matchReasons.push('Within 3 days');
        } else if (daysDiff < 7) {
          score += 10;
          matchReasons.push('Within a week');
        }
      }

      // Check merchant name match
      if (receipt.merchant_name && transaction.merchant_name) {
        const receiptMerchant = receipt.merchant_name.toLowerCase();
        const transactionMerchant = transaction.merchant_name.toLowerCase();
        if (receiptMerchant === transactionMerchant) {
          score += 30;
          matchReasons.push('Merchant match');
        } else if (receiptMerchant.includes(transactionMerchant) || transactionMerchant.includes(receiptMerchant)) {
          score += 15;
          matchReasons.push('Partial merchant match');
        }
      }

      if (score > 0) {
        suggestions.push({
          receipt,
          score,
          matchReason: matchReasons.join(', '),
        });
      }
    }

    // Sort by score descending
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
  }, []);

  // Generate receipt suggestions when a transaction is selected
  const receiptSuggestions = useMemo(() => {
    if (selectedTransaction && showReceiptModal) {
      return generateReceiptSuggestions(selectedTransaction, receipts);
    }
    return [];
  }, [selectedTransaction, showReceiptModal, receipts, generateReceiptSuggestions]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as BankTransactionStatus | '');
    setCurrentPage(1);
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as BankTransactionType | '');
    setCurrentPage(1);
  }, []);

  const handleFinancialAccountChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFinancialAccountFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleCategoryFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value);
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

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDescriptionFilter(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleUncategorizedToggle = useCallback(() => {
    setShowUncategorizedOnly((prev) => !prev);
    setCurrentPage(1);
  }, []);

  const handlePendingToggle = useCallback(() => {
    setShowPendingOnly((prev) => !prev);
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setTypeFilter('');
    setFinancialAccountFilter('');
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
    setDescriptionFilter('');
    setShowUncategorizedOnly(false);
    setShowPendingOnly(false);
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

  // Category assignment handlers
  const handleOpenCategoryModal = useCallback((transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    setNewCategoryId(transaction.category_id || '');
    setShowCategoryModal(true);
  }, []);

  const handleCloseCategoryModal = useCallback(() => {
    setSelectedTransaction(null);
    setNewCategoryId('');
    setShowCategoryModal(false);
  }, []);

  const handleCategoryAssign = useCallback(async () => {
    if (!currentAccount?.id || !selectedTransaction) return;

    try {
      await updateTransaction(currentAccount.id, selectedTransaction.id, {
        category_id: newCategoryId || undefined,
      });
      announce('Category updated successfully');
      handleCloseCategoryModal();
    } catch {
      announce('Failed to update category');
    }
  }, [currentAccount, selectedTransaction, newCategoryId, updateTransaction, handleCloseCategoryModal]);

  // Receipt linking handlers
  const handleOpenReceiptModal = useCallback((transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    setReceiptSearchQuery('');
    setShowReceiptModal(true);
  }, []);

  const handleCloseReceiptModal = useCallback(() => {
    setSelectedTransaction(null);
    setReceiptSearchQuery('');
    setShowReceiptModal(false);
  }, []);

  const handleLinkReceipt = useCallback(async (receiptId: string) => {
    if (!currentAccount?.id || !selectedTransaction) return;

    try {
      // For now, we'll store the receipt link in metadata
      // In a real implementation, this would use a dedicated API endpoint
      await updateTransaction(currentAccount.id, selectedTransaction.id, {
        metadata: {
          ...selectedTransaction.metadata,
          linked_receipt_id: receiptId,
        },
      });
      announce('Receipt linked successfully');
      handleCloseReceiptModal();
      // Refresh transactions
      fetchTransactions(currentAccount.id);
    } catch {
      announce('Failed to link receipt');
    }
  }, [currentAccount, selectedTransaction, updateTransaction, handleCloseReceiptModal, fetchTransactions]);

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

  // Filter transactions (client-side filters)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Description filter
      if (descriptionFilter) {
        const query = descriptionFilter.toLowerCase();
        const matchesDescription = t.description?.toLowerCase().includes(query);
        const matchesMerchant = t.merchant_name?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesMerchant) return false;
      }
      // Uncategorized filter
      if (showUncategorizedOnly && t.category_id) return false;
      return true;
    });
  }, [transactions, descriptionFilter, showUncategorizedOnly]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'merchant_name':
          comparison = (a.merchant_name || '').localeCompare(b.merchant_name || '');
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'category_name':
          comparison = (a.category_name || '').localeCompare(b.category_name || '');
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

  const hasActiveFilters = statusFilter || typeFilter || financialAccountFilter || categoryFilter || startDate || endDate || descriptionFilter || showUncategorizedOnly || showPendingOnly;

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

  // Filter receipts for manual search
  const filteredReceipts = useMemo(() => {
    if (!receiptSearchQuery) return [];
    const query = receiptSearchQuery.toLowerCase();
    return receipts.filter((r) => {
      if (r.transaction_id) return false; // Skip already linked
      const matchesMerchant = r.merchant_name?.toLowerCase().includes(query);
      const matchesFileName = r.file_name?.toLowerCase().includes(query);
      return matchesMerchant || matchesFileName;
    }).slice(0, 10);
  }, [receipts, receiptSearchQuery]);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="financial-transactions-page">
          <div className="financial-transactions-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view financial transactions.</p>
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
        <div className="financial-transactions-page">
          <div className="financial-transactions-header">
            <h1>Financial Transactions</h1>
            <p className="financial-transactions-subtitle">View, categorize, and match transactions with receipts</p>
          </div>
          <AccountsListSkeleton count={6} />
        </div>
      </PageTransition>
    );
  }

  if (error && transactions.length === 0) {
    return (
      <PageTransition>
        <div className="financial-transactions-page">
          <div className="financial-transactions-error">
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
      <div className="financial-transactions-page">
        <div className="financial-transactions-header">
          <div className="financial-transactions-header-row">
            <div>
              <h1>Financial Transactions</h1>
              <p className="financial-transactions-subtitle">View, categorize, and match transactions with receipts</p>
            </div>
          </div>
        </div>

        <div className="financial-transactions-filters" role="search" aria-label="Filter transactions">
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
            <label htmlFor="account-filter" className="sr-only">Filter by account</label>
            <select
              id="account-filter"
              value={financialAccountFilter}
              onChange={handleFinancialAccountChange}
              className="filter-select account-select"
              aria-label="Filter by financial account"
            >
              <option value="">All Accounts</option>
              {financialAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name || account.official_name || 'Unknown Account'}
                </option>
              ))}
            </select>
            <label htmlFor="category-filter" className="sr-only">Filter by category</label>
            <select
              id="category-filter"
              value={categoryFilter}
              onChange={handleCategoryFilterChange}
              className="filter-select"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.display_name || category.name}
                </option>
              ))}
            </select>
            <div className="search-box">
              <label htmlFor="search-input" className="sr-only">Search transactions</label>
              <input
                type="text"
                id="search-input"
                placeholder="Search by description or merchant..."
                value={descriptionFilter}
                onChange={handleDescriptionChange}
                className="search-input"
                aria-label="Search transactions by description or merchant"
              />
            </div>
          </div>
          <div className="filter-row toggle-row">
            <label className="toggle-filter">
              <input
                type="checkbox"
                checked={showUncategorizedOnly}
                onChange={handleUncategorizedToggle}
              />
              <span>Uncategorized Only</span>
            </label>
            <label className="toggle-filter">
              <input
                type="checkbox"
                checked={showPendingOnly}
                onChange={handlePendingToggle}
              />
              <span>Pending Only</span>
            </label>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button" aria-label="Clear all filters">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {paginatedTransactions.length === 0 ? (
          <div className="financial-transactions-empty">
            <h2>No Transactions Found</h2>
            <p>
              {hasActiveFilters
                ? 'No transactions match your filter criteria.'
                : "You don't have any financial transactions yet. Connect a financial account to import transactions."}
            </p>
            {!hasActiveFilters && (
              <Link to="/connections" className="connect-account-link">
                Connect a Financial Account
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="financial-transactions-list" role="region" aria-label={`Transactions list, ${sortedTransactions.length} results`}>
              <div className="financial-transactions-table-header" role="row">
                {renderSortableHeader('date', 'Date', 'col-date')}
                <div className="table-col col-description">Description</div>
                {renderSortableHeader('category_name', 'Category', 'col-category')}
                <div className="table-col col-type">Type</div>
                {renderSortableHeader('amount', 'Amount', 'col-amount')}
                {renderSortableHeader('status', 'Status', 'col-status')}
                <div className="table-col col-actions">Actions</div>
              </div>
              {paginatedTransactions.map((transaction) => {
                const hasSuggestions = generateReceiptSuggestions(transaction, receipts).length > 0;
                const hasLinkedReceipt = transaction.linked_receipt_id || (transaction.metadata as Record<string, unknown>)?.linked_receipt_id;
                const accessibleLabel = `${transaction.merchant_name || transaction.description || 'Unknown'}, ${formatDate(transaction.date)}, ${formatAmount(transaction.amount, transaction.currency, transaction.type)}, ${transaction.category_name || 'Uncategorized'}, ${transaction.status}`;

                return (
                  <div
                    key={transaction.id}
                    className="financial-transaction-row"
                    aria-label={accessibleLabel}
                  >
                    <div className="table-col col-date">
                      {formatDate(transaction.date)}
                    </div>
                    <div className="table-col col-description">
                      <Link to={`/bank-transactions/${transaction.id}`} className="description-link">
                        <span className="description-text">
                          {transaction.merchant_name || transaction.description}
                        </span>
                        {transaction.merchant_name && transaction.description !== transaction.merchant_name && (
                          <span className="original-description">{transaction.description}</span>
                        )}
                        {transaction.is_recurring && (
                          <span className="recurring-indicator">Recurring</span>
                        )}
                      </Link>
                    </div>
                    <div className="table-col col-category">
                      <button
                        className={`category-button ${!transaction.category_name ? 'uncategorized' : ''}`}
                        onClick={() => handleOpenCategoryModal(transaction)}
                        title="Click to assign category"
                      >
                        {transaction.category_name || 'Assign Category'}
                      </button>
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
                    <div className="table-col col-actions">
                      <button
                        className={`action-button receipt-button ${hasLinkedReceipt ? 'linked' : ''} ${hasSuggestions && !hasLinkedReceipt ? 'has-suggestions' : ''}`}
                        onClick={() => handleOpenReceiptModal(transaction)}
                        title={hasLinkedReceipt ? 'Receipt linked' : hasSuggestions ? 'Suggested receipts available' : 'Link receipt'}
                      >
                        {hasLinkedReceipt ? '✓' : '📄'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="financial-transactions-pagination">
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

        {/* Category Assignment Modal */}
        {showCategoryModal && selectedTransaction && (
          <div className="modal-overlay" onClick={handleCloseCategoryModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Assign Category</h2>
                <button className="modal-close" onClick={handleCloseCategoryModal} aria-label="Close modal">
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="transaction-summary">
                  <div className="summary-row">
                    <span className="summary-label">Transaction:</span>
                    <span className="summary-value">{selectedTransaction.merchant_name || selectedTransaction.description}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Amount:</span>
                    <span className="summary-value">{formatAmount(selectedTransaction.amount, selectedTransaction.currency, selectedTransaction.type)}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Date:</span>
                    <span className="summary-value">{formatDate(selectedTransaction.date)}</span>
                  </div>
                </div>
                <div className="category-select-wrapper">
                  <label htmlFor="category-select">Category</label>
                  <select
                    id="category-select"
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="category-select"
                  >
                    <option value="">No Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.display_name || category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={handleCloseCategoryModal}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleCategoryAssign}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Linking Modal */}
        {showReceiptModal && selectedTransaction && (
          <div className="modal-overlay" onClick={handleCloseReceiptModal}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Link Receipt</h2>
                <button className="modal-close" onClick={handleCloseReceiptModal} aria-label="Close modal">
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="transaction-summary">
                  <div className="summary-row">
                    <span className="summary-label">Transaction:</span>
                    <span className="summary-value">{selectedTransaction.merchant_name || selectedTransaction.description}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Amount:</span>
                    <span className="summary-value">{formatAmount(selectedTransaction.amount, selectedTransaction.currency, selectedTransaction.type)}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">Date:</span>
                    <span className="summary-value">{formatDate(selectedTransaction.date)}</span>
                  </div>
                </div>

                {receiptSuggestions.length > 0 && (
                  <div className="receipt-suggestions">
                    <h3>Suggested Matches</h3>
                    <div className="suggestions-list">
                      {receiptSuggestions.map((suggestion) => (
                        <div key={suggestion.receipt.id} className="suggestion-item">
                          <div className="suggestion-info">
                            <div className="suggestion-merchant">
                              {suggestion.receipt.merchant_name || suggestion.receipt.file_name}
                            </div>
                            <div className="suggestion-details">
                              {suggestion.receipt.total_amount && (
                                <span className="suggestion-amount">
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: suggestion.receipt.currency || 'USD' }).format(suggestion.receipt.total_amount)}
                                </span>
                              )}
                              {suggestion.receipt.receipt_date && (
                                <span className="suggestion-date">
                                  {formatDate(suggestion.receipt.receipt_date)}
                                </span>
                              )}
                            </div>
                            <div className="suggestion-reason">
                              <span className="match-score">Match: {suggestion.score}%</span>
                              <span className="match-reason">{suggestion.matchReason}</span>
                            </div>
                          </div>
                          <button
                            className="btn-link-receipt"
                            onClick={() => handleLinkReceipt(suggestion.receipt.id)}
                          >
                            Link
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="receipt-search">
                  <h3>Manual Search</h3>
                  <input
                    type="text"
                    placeholder="Search receipts by merchant or filename..."
                    value={receiptSearchQuery}
                    onChange={(e) => setReceiptSearchQuery(e.target.value)}
                    className="receipt-search-input"
                  />
                  {filteredReceipts.length > 0 && (
                    <div className="search-results-list">
                      {filteredReceipts.map((receipt) => (
                        <div key={receipt.id} className="search-result-item">
                          <div className="result-info">
                            <div className="result-merchant">
                              {receipt.merchant_name || receipt.file_name}
                            </div>
                            <div className="result-details">
                              {receipt.total_amount && (
                                <span className="result-amount">
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: receipt.currency || 'USD' }).format(receipt.total_amount)}
                                </span>
                              )}
                              {receipt.receipt_date && (
                                <span className="result-date">
                                  {formatDate(receipt.receipt_date)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            className="btn-link-receipt"
                            onClick={() => handleLinkReceipt(receipt.id)}
                          >
                            Link
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {receiptSearchQuery && filteredReceipts.length === 0 && (
                    <p className="no-results">No matching receipts found</p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={handleCloseReceiptModal}>
                  Cancel
                </button>
                <Link to="/receipts/upload" className="btn-primary">
                  Upload New Receipt
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
