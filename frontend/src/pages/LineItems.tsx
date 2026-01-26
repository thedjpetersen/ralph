import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLineItemsStore, type LineItemWithTransaction } from '../stores/lineItems';
import { useAccountStore } from '../stores/account';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import { Pagination } from '../components/ui/Table';
import { announce } from '../stores/announcer';
import './LineItems.css';

type SortField = 'transaction_date' | 'description' | 'unit_price' | 'quantity' | 'total_price' | 'category';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'grouped';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface PriceHistoryEntry {
  date: string;
  price: number;
  transactionId: string;
  quantity: number;
}

interface GroupedItem {
  description: string;
  category?: string;
  entries: LineItemWithTransaction[];
  totalQuantity: number;
  totalSpent: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceHistory: PriceHistoryEntry[];
}

export function LineItems() {
  const { currentAccount } = useAccountStore();
  const {
    lineItems,
    isLoading,
    error,
    fetchAllLineItems,
  } = useLineItemsStore();

  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('transaction_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const prevFilteredCountRef = useRef<number | null>(null);

  // Extract unique categories from line items
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    lineItems.forEach((item) => {
      if (item.category) categories.add(item.category);
    });
    return Array.from(categories).sort();
  }, [lineItems]);

  // Load line items when account or server-side filters change
  useEffect(() => {
    if (currentAccount?.id) {
      fetchAllLineItems(currentAccount.id, {
        category: categoryFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: searchQuery || undefined,
      });
    }
  }, [currentAccount?.id, categoryFilter, startDate, endDate, searchQuery, fetchAllLineItems]);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
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

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
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

  const toggleGroupExpand = useCallback((description: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(description)) {
        next.delete(description);
      } else {
        next.add(description);
      }
      return next;
    });
  }, []);

  const formatAmount = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter line items (client-side search filter)
  const filteredLineItems = useMemo(() => {
    return lineItems.filter((item) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = item.description?.toLowerCase().includes(query);
        const matchesSku = item.sku?.toLowerCase().includes(query);
        const matchesMerchant = item.merchant_name?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesSku && !matchesMerchant) return false;
      }
      return true;
    });
  }, [lineItems, searchQuery]);

  // Group line items by product (description)
  const groupedLineItems = useMemo((): GroupedItem[] => {
    const groups = new Map<string, GroupedItem>();

    filteredLineItems.forEach((item) => {
      const key = item.description.toLowerCase().trim();
      const existing = groups.get(key);

      const priceEntry: PriceHistoryEntry = {
        date: item.transaction_date,
        price: item.unit_price,
        transactionId: item.transaction_id,
        quantity: item.quantity,
      };

      if (existing) {
        existing.entries.push(item);
        existing.totalQuantity += item.quantity;
        existing.totalSpent += item.total_price;
        existing.minPrice = Math.min(existing.minPrice, item.unit_price);
        existing.maxPrice = Math.max(existing.maxPrice, item.unit_price);
        existing.priceHistory.push(priceEntry);
      } else {
        groups.set(key, {
          description: item.description,
          category: item.category,
          entries: [item],
          totalQuantity: item.quantity,
          totalSpent: item.total_price,
          avgPrice: item.unit_price,
          minPrice: item.unit_price,
          maxPrice: item.unit_price,
          priceHistory: [priceEntry],
        });
      }
    });

    // Calculate average prices
    groups.forEach((group) => {
      group.avgPrice = group.totalSpent / group.totalQuantity;
      // Sort price history by date (newest first)
      group.priceHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return Array.from(groups.values());
  }, [filteredLineItems]);

  // Sort line items
  const sortedLineItems = useMemo(() => {
    const sorted = [...filteredLineItems].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'transaction_date':
          comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'unit_price':
          comparison = a.unit_price - b.unit_price;
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'total_price':
          comparison = a.total_price - b.total_price;
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredLineItems, sortField, sortDirection]);

  // Sort grouped items
  const sortedGroupedItems = useMemo(() => {
    return [...groupedLineItems].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'total_price':
          comparison = a.totalSpent - b.totalSpent;
          break;
        case 'quantity':
          comparison = a.totalQuantity - b.totalQuantity;
          break;
        case 'unit_price':
          comparison = a.avgPrice - b.avgPrice;
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        default: {
          // For transaction_date, sort by most recent entry
          const aDate = a.entries[0]?.transaction_date || '';
          const bDate = b.entries[0]?.transaction_date || '';
          comparison = new Date(aDate).getTime() - new Date(bDate).getTime();
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [groupedLineItems, sortField, sortDirection]);

  // Paginate line items
  const paginatedLineItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedLineItems.slice(startIndex, startIndex + pageSize);
  }, [sortedLineItems, currentPage, pageSize]);

  // Paginate grouped items
  const paginatedGroupedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedGroupedItems.slice(startIndex, startIndex + pageSize);
  }, [sortedGroupedItems, currentPage, pageSize]);

  const totalPages = viewMode === 'list'
    ? Math.ceil(sortedLineItems.length / pageSize)
    : Math.ceil(sortedGroupedItems.length / pageSize);

  const totalItems = viewMode === 'list' ? sortedLineItems.length : sortedGroupedItems.length;

  const hasActiveFilters = categoryFilter || startDate || endDate || searchQuery;

  // Announce filter results to screen readers
  useEffect(() => {
    if (prevFilteredCountRef.current !== null && prevFilteredCountRef.current !== filteredLineItems.length) {
      const message = filteredLineItems.length === 0
        ? 'No line items found matching your filters'
        : `Showing ${filteredLineItems.length} line item${filteredLineItems.length === 1 ? '' : 's'}`;
      announce(message);
    }
    prevFilteredCountRef.current = filteredLineItems.length;
  }, [filteredLineItems.length]);

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

  const renderPriceHistory = (priceHistory: PriceHistoryEntry[]) => {
    if (priceHistory.length <= 1) return null;

    const firstPrice = priceHistory[priceHistory.length - 1]?.price || 0;
    const lastPrice = priceHistory[0]?.price || 0;
    const priceDiff = lastPrice - firstPrice;
    const priceChangePercent = firstPrice > 0 ? ((priceDiff / firstPrice) * 100).toFixed(1) : '0';

    return (
      <div className="price-history">
        <div className="price-history-header">
          <span className="price-history-title">Price History</span>
          <span className={`price-trend ${priceDiff > 0 ? 'trend-up' : priceDiff < 0 ? 'trend-down' : 'trend-flat'}`}>
            {priceDiff > 0 ? '↑' : priceDiff < 0 ? '↓' : '—'}
            {priceDiff !== 0 && ` ${priceChangePercent}%`}
          </span>
        </div>
        <div className="price-history-entries">
          {priceHistory.slice(0, 5).map((entry, idx) => (
            <div key={`${entry.transactionId}-${idx}`} className="price-history-entry">
              <span className="price-history-date">{formatDate(entry.date)}</span>
              <span className="price-history-price">{formatAmount(entry.price)}</span>
              <span className="price-history-qty">x{entry.quantity}</span>
            </div>
          ))}
          {priceHistory.length > 5 && (
            <div className="price-history-more">
              +{priceHistory.length - 5} more entries
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="line-items-page">
          <div className="line-items-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view line items.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && lineItems.length === 0) {
    return (
      <PageTransition>
        <div className="line-items-page">
          <div className="line-items-header">
            <h1>Line Items</h1>
            <p className="line-items-subtitle">View all purchased items across transactions</p>
          </div>
          <AccountsListSkeleton count={6} />
        </div>
      </PageTransition>
    );
  }

  if (error && lineItems.length === 0) {
    return (
      <PageTransition>
        <div className="line-items-page">
          <div className="line-items-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={() => fetchAllLineItems(currentAccount.id)}
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
      <div className="line-items-page">
        <div className="line-items-header">
          <div className="line-items-header-row">
            <div>
              <h1>Line Items</h1>
              <p className="line-items-subtitle">View all purchased items across transactions</p>
            </div>
            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
              >
                List View
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'grouped' ? 'active' : ''}`}
                onClick={() => setViewMode('grouped')}
                aria-pressed={viewMode === 'grouped'}
              >
                Grouped by Product
              </button>
            </div>
          </div>
        </div>

        <div className="line-items-filters" role="search" aria-label="Filter line items">
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
            <span id="date-filter-hint" className="sr-only">Filter line items by date range</span>
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
            <div className="search-box">
              <label htmlFor="search-input" className="sr-only">Search line items</label>
              <input
                type="text"
                id="search-input"
                placeholder="Search by item name, SKU, or store..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="search-input"
                aria-label="Search line items by name, SKU, or store"
              />
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button" aria-label="Clear all filters">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {totalItems === 0 ? (
          <div className="line-items-empty">
            <h2>No Line Items Found</h2>
            <p>
              {hasActiveFilters
                ? 'No line items match your filter criteria.'
                : "You don't have any line items yet."}
            </p>
            {!hasActiveFilters && (
              <Link to="/transactions/new" className="create-transaction-link">
                Create a transaction to add line items
              </Link>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <>
            <div className="line-items-list" role="region" aria-label={`Line items list, ${sortedLineItems.length} results`}>
              <div className="line-items-table-header" role="row">
                {renderSortableHeader('transaction_date', 'Date', 'col-date')}
                {renderSortableHeader('description', 'Item', 'col-item')}
                {renderSortableHeader('quantity', 'Qty', 'col-qty')}
                {renderSortableHeader('unit_price', 'Unit Price', 'col-unit-price')}
                {renderSortableHeader('total_price', 'Total', 'col-total')}
                {renderSortableHeader('category', 'Category', 'col-category')}
              </div>
              {paginatedLineItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/transactions/${item.transaction_id}`}
                  className="line-item-row"
                  aria-label={`${item.description}, ${formatDate(item.transaction_date)}, ${formatAmount(item.total_price)}`}
                >
                  <div className="table-col col-date" aria-hidden="true">
                    {formatDate(item.transaction_date)}
                  </div>
                  <div className="table-col col-item" aria-hidden="true">
                    <span className="item-name">{item.description}</span>
                    {item.sku && <span className="item-sku">SKU: {item.sku}</span>}
                    {item.merchant_name && <span className="item-merchant">{item.merchant_name}</span>}
                  </div>
                  <div className="table-col col-qty" aria-hidden="true">
                    {item.quantity}
                  </div>
                  <div className="table-col col-unit-price" aria-hidden="true">
                    {formatAmount(item.unit_price)}
                  </div>
                  <div className="table-col col-total" aria-hidden="true">
                    {formatAmount(item.total_price)}
                  </div>
                  <div className="table-col col-category" aria-hidden="true">
                    <span className="category-badge">
                      {item.category || 'Uncategorized'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="line-items-pagination">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={sortedLineItems.length}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showPageSizeSelector
                showInfo
              />
            </div>
          </>
        ) : (
          <>
            <div className="grouped-items-list" role="region" aria-label={`Grouped items, ${sortedGroupedItems.length} products`}>
              <div className="grouped-items-header" role="row">
                {renderSortableHeader('description', 'Product', 'col-product')}
                {renderSortableHeader('quantity', 'Total Qty', 'col-total-qty')}
                {renderSortableHeader('unit_price', 'Avg Price', 'col-avg-price')}
                {renderSortableHeader('total_price', 'Total Spent', 'col-total-spent')}
                {renderSortableHeader('category', 'Category', 'col-category')}
                <div className="table-col col-actions">Details</div>
              </div>
              {paginatedGroupedItems.map((group) => {
                const isExpanded = expandedGroups.has(group.description);
                return (
                  <div key={group.description} className="grouped-item-container">
                    <div
                      className={`grouped-item-row ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleGroupExpand(group.description)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleGroupExpand(group.description);
                        }
                      }}
                      aria-expanded={isExpanded}
                      aria-label={`${group.description}, ${group.entries.length} purchases, ${formatAmount(group.totalSpent)} total`}
                    >
                      <div className="table-col col-product" aria-hidden="true">
                        <span className="product-name">{group.description}</span>
                        <span className="purchase-count">{group.entries.length} purchase{group.entries.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="table-col col-total-qty" aria-hidden="true">
                        {group.totalQuantity}
                      </div>
                      <div className="table-col col-avg-price" aria-hidden="true">
                        <span className="avg-price">{formatAmount(group.avgPrice)}</span>
                        {group.minPrice !== group.maxPrice && (
                          <span className="price-range">
                            {formatAmount(group.minPrice)} - {formatAmount(group.maxPrice)}
                          </span>
                        )}
                      </div>
                      <div className="table-col col-total-spent" aria-hidden="true">
                        {formatAmount(group.totalSpent)}
                      </div>
                      <div className="table-col col-category" aria-hidden="true">
                        <span className="category-badge">
                          {group.category || 'Uncategorized'}
                        </span>
                      </div>
                      <div className="table-col col-actions" aria-hidden="true">
                        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="grouped-item-details">
                        {renderPriceHistory(group.priceHistory)}
                        <div className="grouped-item-entries">
                          <h4>Purchase History</h4>
                          {group.entries.map((entry) => (
                            <Link
                              key={entry.id}
                              to={`/transactions/${entry.transaction_id}`}
                              className="grouped-entry-row"
                            >
                              <span className="entry-date">{formatDate(entry.transaction_date)}</span>
                              <span className="entry-merchant">{entry.merchant_name || 'Unknown Store'}</span>
                              <span className="entry-qty">x{entry.quantity}</span>
                              <span className="entry-price">{formatAmount(entry.unit_price)}</span>
                              <span className="entry-total">{formatAmount(entry.total_price)}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="line-items-pagination">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={sortedGroupedItems.length}
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
