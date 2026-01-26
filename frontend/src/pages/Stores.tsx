import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStoresStore, type StoreType, type StoreStatus, type Store } from '../stores/stores';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import './Stores.css';

const STORE_TYPES: { value: StoreType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'retail', label: 'Retail' },
  { value: 'online', label: 'Online' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'gas', label: 'Gas Station' },
  { value: 'service', label: 'Service' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: { value: StoreStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
];

type SortField = 'name' | 'transaction_count' | 'total_spent';
type SortDirection = 'asc' | 'desc';

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'transaction_count', label: 'Transaction Count' },
  { value: 'total_spent', label: 'Total Spent' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStoreIcon(type: StoreType): string {
  switch (type) {
    case 'retail':
      return '🛍️';
    case 'online':
      return '💻';
    case 'restaurant':
      return '🍽️';
    case 'grocery':
      return '🛒';
    case 'gas':
      return '⛽';
    case 'service':
      return '🔧';
    default:
      return '🏪';
  }
}

export function Stores() {
  const {
    stores,
    isLoading,
    error,
    searchQuery,
    fetchStores,
    searchStores,
    setSearchQuery,
  } = useStoresStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [typeFilter, setTypeFilter] = useState<StoreType | ''>('');
  const [statusFilter, setStatusFilter] = useState<StoreStatus | ''>('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        if (localSearch.trim()) {
          searchStores({
            query: localSearch,
            type: typeFilter || undefined,
            status: statusFilter || undefined,
          });
        } else {
          setSearchQuery('');
          fetchStores({
            type: typeFilter || undefined,
            status: statusFilter || undefined,
          });
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, typeFilter, statusFilter, searchStores, setSearchQuery, fetchStores]);

  // Initial load and filter changes
  useEffect(() => {
    if (!localSearch.trim()) {
      fetchStores({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
    } else {
      searchStores({
        query: localSearch,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
    }
  }, [typeFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    fetchStores();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as StoreType | '');
  }, []);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as StoreStatus | '');
  }, []);

  const handleSortFieldChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortField(e.target.value as SortField);
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const sortedStores = useMemo(() => {
    const sorted = [...stores].sort((a: Store, b: Store) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = (a.display_name || a.name).localeCompare(b.display_name || b.name);
          break;
        case 'transaction_count': {
          // Use transaction_count if available, fall back to match_count
          const aCount = a.transaction_count ?? a.match_count;
          const bCount = b.transaction_count ?? b.match_count;
          comparison = aCount - bCount;
          break;
        }
        case 'total_spent':
          comparison = (a.total_spent ?? 0) - (b.total_spent ?? 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [stores, sortField, sortDirection]);

  const getStatusClass = (status: StoreStatus) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'pending':
        return 'status-pending';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  const getTypeLabel = (type: StoreType) => {
    const found = STORE_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  if (isLoading && stores.length === 0) {
    return (
      <PageTransition>
        <div className="stores-page">
          <div className="stores-header">
            <h1>Stores</h1>
            <p className="stores-subtitle">Manage merchant stores and patterns</p>
          </div>
          <AccountsListSkeleton count={6} />
        </div>
      </PageTransition>
    );
  }

  if (error && stores.length === 0) {
    return (
      <PageTransition>
        <div className="stores-page">
          <div className="stores-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => fetchStores()} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="stores-page">
        <div className="stores-header">
          <div className="stores-header-row">
            <div>
              <h1>Stores</h1>
              <p className="stores-subtitle">Manage merchant stores and patterns</p>
            </div>
            <Link to="/stores/new" className="create-store-button">
              Create Store
            </Link>
          </div>
        </div>

        <div className="stores-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search stores..."
              value={localSearch}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
          <select
            value={typeFilter}
            onChange={handleTypeChange}
            className="filter-select"
          >
            {STORE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
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
          <div className="sort-controls">
            <select
              value={sortField}
              onChange={handleSortFieldChange}
              className="filter-select"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={toggleSortDirection}
              className="sort-direction-button"
              aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {sortedStores.length === 0 ? (
          <div className="stores-empty">
            <h2>No Stores Found</h2>
            <p>
              {localSearch
                ? 'No stores match your search criteria.'
                : "You don't have any stores yet."}
            </p>
            {!localSearch && (
              <Link to="/stores/new" className="create-store-link">
                Create your first store
              </Link>
            )}
          </div>
        ) : (
          <div className="stores-grid">
            {sortedStores.map((store) => (
              <Link
                key={store.id}
                to={`/stores/${store.id}`}
                className="store-card"
              >
                <div className="store-card-header">
                  <div className="store-card-title">
                    {store.logo ? (
                      <img
                        src={store.logo}
                        alt={`${store.display_name || store.name} logo`}
                        className="store-logo"
                      />
                    ) : (
                      <span className="store-icon">{getStoreIcon(store.type)}</span>
                    )}
                    <h3 className="store-card-name">
                      {store.display_name || store.name}
                    </h3>
                  </div>
                  <span className={`store-status ${getStatusClass(store.status)}`}>
                    {store.status}
                  </span>
                </div>
                <div className="store-card-type">{getTypeLabel(store.type)}</div>
                {store.description && (
                  <p className="store-card-description">{store.description}</p>
                )}
                <div className="store-card-stats">
                  <div className="store-stat">
                    <span className="stat-value">
                      {store.transaction_count ?? store.match_count}
                    </span>
                    <span className="stat-label">Transactions</span>
                  </div>
                  <div className="store-stat">
                    <span className="stat-value">
                      {store.total_spent != null ? formatCurrency(store.total_spent) : '--'}
                    </span>
                    <span className="stat-label">Total Spent</span>
                  </div>
                </div>
                <div className="store-card-details">
                  {store.aliases && store.aliases.length > 0 && (
                    <div className="store-detail">
                      <span className="detail-label">Aliases</span>
                      <span className="detail-value">{store.aliases.length}</span>
                    </div>
                  )}
                  {store.receipt_patterns && store.receipt_patterns.length > 0 && (
                    <div className="store-detail">
                      <span className="detail-label">Patterns</span>
                      <span className="detail-value">
                        {store.receipt_patterns.length}
                      </span>
                    </div>
                  )}
                </div>
                {store.tags && store.tags.length > 0 && (
                  <div className="store-card-tags">
                    {store.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="store-tag">
                        {tag}
                      </span>
                    ))}
                    {store.tags.length > 3 && (
                      <span className="store-tag-more">
                        +{store.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
