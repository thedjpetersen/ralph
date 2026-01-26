import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReceiptsStore, type ReceiptStatus, type ReceiptSourceType } from '../stores/receipts';
import { useAccountStore } from '../stores/account';
import { storesApi, type Store } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import { announce } from '../stores/announcer';
import './Receipts.css';

const STATUS_OPTIONS: { value: ReceiptStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'processed', label: 'Processed' },
  { value: 'failed', label: 'Failed' },
  { value: 'archived', label: 'Archived' },
];

const SOURCE_OPTIONS: { value: ReceiptSourceType | ''; label: string }[] = [
  { value: '', label: 'All Sources' },
  { value: 'email', label: 'Email' },
  { value: 'drive', label: 'Drive' },
  { value: 'upload', label: 'Upload' },
  { value: 'scan', label: 'Scan' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function Receipts() {
  const navigate = useNavigate();
  const { currentAccount } = useAccountStore();
  const {
    receipts,
    isLoading,
    error,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    fetchReceipts,
  } = useReceiptsStore();

  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState<ReceiptSourceType | ''>('');
  const [storeFilter, setStoreFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [merchantFilter, setMerchantFilter] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const prevReceiptCountRef = useRef<number | null>(null);

  // Load stores for filter dropdown
  useEffect(() => {
    storesApi.list().then((response) => {
      setStores(response.stores);
    }).catch(() => {
      // Silently fail - stores filter won't work but page will still load
    });
  }, []);

  // Load receipts when account or filters change
  useEffect(() => {
    if (currentAccount?.id) {
      fetchReceipts(currentAccount.id, {
        status: statusFilter || undefined,
        source_type: sourceFilter || undefined,
        store_id: storeFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
    }
  }, [currentAccount?.id, statusFilter, sourceFilter, storeFilter, startDate, endDate, page, pageSize, fetchReceipts]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as ReceiptStatus | '');
    setPage(1);
  }, [setPage]);

  const handleSourceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSourceFilter(e.target.value as ReceiptSourceType | '');
    setPage(1);
  }, [setPage]);

  const handleStoreChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStoreFilter(e.target.value);
    setPage(1);
  }, [setPage]);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    setPage(1);
  }, [setPage]);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    setPage(1);
  }, [setPage]);

  const handleMerchantChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMerchantFilter(e.target.value);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, [setPage]);

  const handlePageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(parseInt(e.target.value, 10));
  }, [setPageSize]);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setSourceFilter('');
    setStoreFilter('');
    setStartDate('');
    setEndDate('');
    setMerchantFilter('');
    setPage(1);
  }, [setPage]);

  // Handle scroll indicators for mobile
  const updateScrollIndicators = useCallback(() => {
    const wrapper = scrollWrapperRef.current;
    if (!wrapper) return;

    const { scrollLeft, scrollWidth, clientWidth } = wrapper;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  const getStatusClass = (status: ReceiptStatus) => {
    switch (status) {
      case 'processed':
        return 'status-processed';
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'failed':
        return 'status-failed';
      case 'archived':
        return 'status-archived';
      default:
        return '';
    }
  };

  const getSourceClass = (source: ReceiptSourceType) => {
    switch (source) {
      case 'email':
        return 'source-email';
      case 'drive':
        return 'source-drive';
      case 'upload':
        return 'source-upload';
      case 'scan':
        return 'source-scan';
      default:
        return '';
    }
  };

  const formatAmount = (amount: number | undefined, currency: string) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter receipts by merchant name (client-side filter)
  const filteredReceipts = merchantFilter
    ? receipts.filter((r) =>
        r.merchant_name?.toLowerCase().includes(merchantFilter.toLowerCase()) ||
        r.file_name?.toLowerCase().includes(merchantFilter.toLowerCase())
      )
    : receipts;

  // Announce filter results to screen readers
  useEffect(() => {
    if (prevReceiptCountRef.current !== null && prevReceiptCountRef.current !== filteredReceipts.length) {
      const message = filteredReceipts.length === 0
        ? 'No receipts found matching your filters'
        : `Showing ${filteredReceipts.length} receipt${filteredReceipts.length === 1 ? '' : 's'}`;
      announce(message);
    }
    prevReceiptCountRef.current = filteredReceipts.length;
  }, [filteredReceipts.length]);

  // Update scroll indicators when filtered receipts change
  useEffect(() => {
    const wrapper = scrollWrapperRef.current;
    if (!wrapper) return;

    // Initial check
    updateScrollIndicators();

    wrapper.addEventListener('scroll', updateScrollIndicators);
    const resizeObserver = new ResizeObserver(updateScrollIndicators);
    resizeObserver.observe(wrapper);

    return () => {
      wrapper.removeEventListener('scroll', updateScrollIndicators);
      resizeObserver.disconnect();
    };
  }, [updateScrollIndicators, filteredReceipts]);

  const hasActiveFilters = statusFilter || sourceFilter || storeFilter || startDate || endDate || merchantFilter;
  const totalPages = Math.ceil(total / pageSize);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="receipts-page">
          <div className="receipts-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view receipts.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && receipts.length === 0) {
    return (
      <PageTransition>
        <div className="receipts-page">
          <div className="receipts-header">
            <h1>Receipts</h1>
            <p className="receipts-subtitle">View and manage receipts</p>
          </div>
          <AccountsListSkeleton count={6} />
        </div>
      </PageTransition>
    );
  }

  if (error && receipts.length === 0) {
    return (
      <PageTransition>
        <div className="receipts-page">
          <div className="receipts-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={() => fetchReceipts(currentAccount.id)}
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
      <div className="receipts-page">
        <div className="receipts-header">
          <div className="receipts-header-row">
            <div>
              <h1>Receipts</h1>
              <p className="receipts-subtitle">View and manage receipts</p>
            </div>
            <button
              className="upload-receipts-button"
              onClick={() => navigate('/receipts/upload')}
              aria-label="Upload new receipt"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 4v12m0-12L6 8m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 14v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="upload-button-text">Upload</span>
            </button>
          </div>
        </div>

        <div className="receipts-filters" role="search" aria-label="Filter receipts">
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
            <span id="date-filter-hint" className="sr-only">Filter receipts by date range</span>
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="filter-select"
              aria-label="Filter by receipt status"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <label htmlFor="source-filter" className="sr-only">Filter by source</label>
            <select
              id="source-filter"
              value={sourceFilter}
              onChange={handleSourceChange}
              className="filter-select"
              aria-label="Filter by receipt source"
            >
              {SOURCE_OPTIONS.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <label htmlFor="store-filter" className="sr-only">Filter by store</label>
            <select
              id="store-filter"
              value={storeFilter}
              onChange={handleStoreChange}
              className="filter-select store-filter"
              aria-label="Filter by store"
            >
              <option value="">All Stores</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.display_name || store.name}
                </option>
              ))}
            </select>
            <div className="search-box">
              <label htmlFor="merchant-search" className="sr-only">Search by merchant or filename</label>
              <input
                type="text"
                id="merchant-search"
                placeholder="Search by merchant or filename..."
                value={merchantFilter}
                onChange={handleMerchantChange}
                className="search-input"
                aria-label="Search receipts by merchant or filename"
              />
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button" aria-label="Clear all filters">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {filteredReceipts.length === 0 ? (
          <div className="receipts-empty">
            <h2>No Receipts Found</h2>
            <p>
              {hasActiveFilters
                ? 'No receipts match your filter criteria.'
                : "You don't have any receipts yet."}
            </p>
          </div>
        ) : (
          <>
            <div className={`receipts-list ${canScrollLeft ? 'can-scroll-left' : ''} ${canScrollRight ? 'can-scroll-right' : ''}`} role="region" aria-label={`Receipts list, ${filteredReceipts.length} results`}>
              <div className="receipts-scroll-wrapper" ref={scrollWrapperRef}>
                <div className="receipts-table-header" role="row" aria-hidden="true">
                  <div className="table-col col-date">Date</div>
                  <div className="table-col col-merchant">Merchant</div>
                  <div className="table-col col-source">Source</div>
                  <div className="table-col col-amount">Amount</div>
                  <div className="table-col col-status">Status</div>
                </div>
                {filteredReceipts.map((receipt) => {
                  const accessibleLabel = `${receipt.merchant_name || 'Unknown Merchant'}, ${formatDate(receipt.receipt_date || receipt.created_at)}, ${formatAmount(receipt.total_amount, receipt.currency)}, ${receipt.source_type}, ${receipt.status}`;
                  return (
                  <Link
                    key={receipt.id}
                    to={`/receipts/${receipt.id}`}
                    className="receipt-row"
                    aria-label={accessibleLabel}
                  >
                    <div className="table-col col-date" aria-hidden="true">
                      {formatDate(receipt.receipt_date || receipt.created_at)}
                    </div>
                    <div className="table-col col-merchant" aria-hidden="true">
                      <span className="merchant-name">
                        {receipt.merchant_name || 'Unknown Merchant'}
                      </span>
                      <span className="receipt-filename">{receipt.file_name}</span>
                    </div>
                    <div className="table-col col-source" aria-hidden="true">
                      <span className={`receipt-source ${getSourceClass(receipt.source_type)}`}>
                        {receipt.source_type}
                      </span>
                    </div>
                    <div className="table-col col-amount" aria-hidden="true">
                      {formatAmount(receipt.total_amount, receipt.currency)}
                    </div>
                    <div className="table-col col-status" aria-hidden="true">
                      <span className={`receipt-status ${getStatusClass(receipt.status)}`}>
                        {receipt.status}
                      </span>
                    </div>
                  </Link>
                  );
                })}
              </div>
            </div>

            <nav className="receipts-pagination" aria-label="Receipts pagination">
              <div className="pagination-info" aria-live="polite">
                Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} of {total} receipts
              </div>
              <div className="pagination-controls">
                <label htmlFor="page-size-select" className="sr-only">Results per page</label>
                <select
                  id="page-size-select"
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  className="page-size-select"
                  aria-label="Results per page"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} per page
                    </option>
                  ))}
                </select>
                <div className="pagination-buttons" role="group" aria-label="Page navigation">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    className="pagination-button"
                    aria-label="Go to first page"
                  >
                    First
                  </button>
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="pagination-button"
                    aria-label="Go to previous page"
                  >
                    Previous
                  </button>
                  <span className="page-indicator" aria-current="page">
                    Page {page} of {totalPages || 1}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="pagination-button"
                    aria-label="Go to next page"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page >= totalPages}
                    className="pagination-button"
                    aria-label="Go to last page"
                  >
                    Last
                  </button>
                </div>
              </div>
            </nav>
          </>
        )}
      </div>
    </PageTransition>
  );
}
