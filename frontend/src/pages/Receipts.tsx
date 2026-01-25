import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useReceiptsStore, type ReceiptStatus, type ReceiptSourceType } from '../stores/receipts';
import { useAccountStore } from '../stores/account';
import { storesApi, type Store } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
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
          </div>
        </div>

        <div className="receipts-filters">
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
              value={sourceFilter}
              onChange={handleSourceChange}
              className="filter-select"
            >
              {SOURCE_OPTIONS.map((source) => (
                <option key={source.value} value={source.value}>
                  {source.label}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-row">
            <select
              value={storeFilter}
              onChange={handleStoreChange}
              className="filter-select store-filter"
            >
              <option value="">All Stores</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.display_name || store.name}
                </option>
              ))}
            </select>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by merchant or filename..."
                value={merchantFilter}
                onChange={handleMerchantChange}
                className="search-input"
              />
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button">
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
            <div className="receipts-list">
              <div className="receipts-table-header">
                <div className="table-col col-date">Date</div>
                <div className="table-col col-merchant">Merchant</div>
                <div className="table-col col-source">Source</div>
                <div className="table-col col-amount">Amount</div>
                <div className="table-col col-status">Status</div>
              </div>
              {filteredReceipts.map((receipt) => (
                <Link
                  key={receipt.id}
                  to={`/receipts/${receipt.id}`}
                  className="receipt-row"
                >
                  <div className="table-col col-date">
                    {formatDate(receipt.receipt_date || receipt.created_at)}
                  </div>
                  <div className="table-col col-merchant">
                    <span className="merchant-name">
                      {receipt.merchant_name || 'Unknown Merchant'}
                    </span>
                    <span className="receipt-filename">{receipt.file_name}</span>
                  </div>
                  <div className="table-col col-source">
                    <span className={`receipt-source ${getSourceClass(receipt.source_type)}`}>
                      {receipt.source_type}
                    </span>
                  </div>
                  <div className="table-col col-amount">
                    {formatAmount(receipt.total_amount, receipt.currency)}
                  </div>
                  <div className="table-col col-status">
                    <span className={`receipt-status ${getStatusClass(receipt.status)}`}>
                      {receipt.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="receipts-pagination">
              <div className="pagination-info">
                Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} of {total} receipts
              </div>
              <div className="pagination-controls">
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  className="page-size-select"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} per page
                    </option>
                  ))}
                </select>
                <div className="pagination-buttons">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    className="pagination-button"
                  >
                    First
                  </button>
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="pagination-button"
                  >
                    Previous
                  </button>
                  <span className="page-indicator">
                    Page {page} of {totalPages || 1}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="pagination-button"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page >= totalPages}
                    className="pagination-button"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
