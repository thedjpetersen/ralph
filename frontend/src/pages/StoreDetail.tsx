import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStoresStore, type Store, type StoreType } from '../stores/stores';
import { useAccountStore } from '../stores/account';
import { receiptsApi, type Receipt } from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { SettingsFormSkeleton } from '../components/skeletons';
import './StoreDetail.css';

const STORE_TYPES: { value: StoreType; label: string }[] = [
  { value: 'retail', label: 'Retail' },
  { value: 'online', label: 'Online' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'gas', label: 'Gas Station' },
  { value: 'service', label: 'Service' },
  { value: 'other', label: 'Other' },
];

interface SpendingSummary {
  total: number;
  thisMonth: number;
  lastMonth: number;
  transactionCount: number;
}

interface FrequentItem {
  description: string;
  count: number;
  totalSpent: number;
}

export function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAccount } = useAccountStore();
  const { currentStore, stores, isLoading, error, fetchStore, deleteStore } =
    useStoresStore();

  const [store, setStore] = useState<Store | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // New state for transactions and items
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      const existingStore = stores.find((s) => s.id === id);
      if (existingStore) {
        setStore(existingStore);
      } else {
        fetchStore(id)
          .then((fetched) => {
            setStore(fetched);
          })
          .catch(() => {
            // Error is handled by the store
          });
      }
    }
  }, [id, stores, fetchStore]);

  // Update local store when currentStore changes
  useEffect(() => {
    if (currentStore && currentStore.id === id) {
      setStore(currentStore);
    }
  }, [currentStore, id]);

  // Fetch receipts for this store
  useEffect(() => {
    if (id && currentAccount?.id) {
      setReceiptsLoading(true);
      receiptsApi.list(currentAccount.id, { store_id: id, limit: 50 })
        .then((response) => {
          setReceipts(response.receipts);
        })
        .catch(() => {
          // Silently fail - receipts are optional
        })
        .finally(() => {
          setReceiptsLoading(false);
        });
    }
  }, [id, currentAccount?.id]);

  // Calculate spending summary
  const spendingSummary = useMemo((): SpendingSummary => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    let total = 0;
    let thisMonth = 0;
    let lastMonth = 0;

    receipts.forEach((receipt) => {
      const amount = receipt.total_amount || 0;
      total += amount;

      if (receipt.receipt_date) {
        const date = new Date(receipt.receipt_date);
        if (date >= thisMonthStart) {
          thisMonth += amount;
        } else if (date >= lastMonthStart && date <= lastMonthEnd) {
          lastMonth += amount;
        }
      }
    });

    // Use store's total_spent if available and higher (includes historical data)
    if (store?.total_spent && store.total_spent > total) {
      total = store.total_spent;
    }

    return {
      total,
      thisMonth,
      lastMonth,
      transactionCount: store?.transaction_count || receipts.length,
    };
  }, [receipts, store?.total_spent, store?.transaction_count]);

  // Extract frequently purchased items from receipts
  const frequentItems = useMemo((): FrequentItem[] => {
    const itemMap = new Map<string, { count: number; totalSpent: number }>();

    receipts.forEach((receipt) => {
      const extractedData = receipt.extracted_data;
      if (extractedData?.extracted_fields?.line_items) {
        extractedData.extracted_fields.line_items.forEach((item) => {
          if (item.description) {
            const key = item.description.toLowerCase().trim();
            const existing = itemMap.get(key) || { count: 0, totalSpent: 0 };
            existing.count += item.quantity || 1;
            existing.totalSpent += item.total_price || item.unit_price || 0;
            itemMap.set(key, existing);
          }
        });
      }
    });

    return Array.from(itemMap.entries())
      .map(([description, data]) => ({
        description,
        count: data.count,
        totalSpent: data.totalSpent,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [receipts]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteStore(id);
      navigate('/stores');
    } catch {
      setDeleteError('Failed to delete store');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getTypeLabel = (type: StoreType) => {
    const found = STORE_TYPES.find((t) => t.value === type);
    return found ? found.label : type;
  };

  const getStatusClass = (status: string) => {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading && !store) {
    return (
      <PageTransition>
        <div className="store-detail-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && !store) {
    return (
      <PageTransition>
        <div className="store-detail-page">
          <div className="detail-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/stores')} className="back-button">
              Back to Stores
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!store) {
    return (
      <PageTransition>
        <div className="store-detail-page">
          <div className="detail-error">
            <h2>Store Not Found</h2>
            <p>The store you're looking for doesn't exist.</p>
            <button onClick={() => navigate('/stores')} className="back-button">
              Back to Stores
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="store-detail-page">
        <div className="detail-header">
          <Link to="/stores" className="back-link">
            &larr; Back to Stores
          </Link>
          <div className="detail-header-row">
            <div>
              <h1>{store.display_name || store.name}</h1>
              <div className="detail-meta">
                <span className={`store-status ${getStatusClass(store.status)}`}>
                  {store.status}
                </span>
                <span className="store-type">{getTypeLabel(store.type)}</span>
              </div>
            </div>
            <div className="detail-actions">
              <Link to={`/stores/${store.id}/edit`} className="edit-button">
                Edit Store
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="delete-button"
                disabled={isDeleting}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {deleteError && <div className="detail-error-message">{deleteError}</div>}

        <div className="detail-content">
          {store.description && (
            <div className="detail-section">
              <h2>Description</h2>
              <p className="detail-description">{store.description}</p>
            </div>
          )}

          <div className="detail-section">
            <h2>Contact Information</h2>
            <div className="detail-grid">
              {store.website && (
                <div className="detail-item">
                  <span className="detail-label">Website</span>
                  <a
                    href={store.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-link"
                  >
                    {store.website}
                  </a>
                </div>
              )}
              {store.email && (
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <a href={`mailto:${store.email}`} className="detail-link">
                    {store.email}
                  </a>
                </div>
              )}
              {store.phone && (
                <div className="detail-item">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{store.phone}</span>
                </div>
              )}
            </div>
          </div>

          {store.address && (
            <div className="detail-section">
              <h2>Location</h2>
              <div className="detail-address">
                {store.address.street1 && <div>{store.address.street1}</div>}
                {store.address.street2 && <div>{store.address.street2}</div>}
                {(store.address.city || store.address.state || store.address.postal_code) && (
                  <div>
                    {store.address.city}
                    {store.address.city && store.address.state && ', '}
                    {store.address.state} {store.address.postal_code}
                  </div>
                )}
                {store.address.country && <div>{store.address.country}</div>}
                {store.address.latitude && store.address.longitude && (
                  <div className="detail-coords">
                    Coordinates: {store.address.latitude.toFixed(6)},{' '}
                    {store.address.longitude.toFixed(6)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spending Summary Section */}
          <div className="detail-section">
            <h2>Spending Summary</h2>
            <div className="spending-summary-grid">
              <div className="spending-card">
                <span className="spending-value">{formatCurrency(spendingSummary.total)}</span>
                <span className="spending-label">Total Spent</span>
              </div>
              <div className="spending-card">
                <span className="spending-value">{formatCurrency(spendingSummary.thisMonth)}</span>
                <span className="spending-label">This Month</span>
              </div>
              <div className="spending-card">
                <span className="spending-value">{formatCurrency(spendingSummary.lastMonth)}</span>
                <span className="spending-label">Last Month</span>
              </div>
              <div className="spending-card">
                <span className="spending-value">{spendingSummary.transactionCount}</span>
                <span className="spending-label">Transactions</span>
              </div>
            </div>
          </div>

          {/* Recent Transactions Section */}
          <div className="detail-section">
            <h2>Recent Transactions</h2>
            {receiptsLoading ? (
              <div className="transactions-loading">Loading transactions...</div>
            ) : receipts.length > 0 ? (
              <div className="transactions-list">
                {receipts.slice(0, 10).map((receipt) => (
                  <Link
                    key={receipt.id}
                    to={`/receipts/${receipt.id}`}
                    className="transaction-item"
                  >
                    <div className="transaction-item-info">
                      <span className="transaction-item-date">
                        {receipt.receipt_date ? formatDate(receipt.receipt_date) : 'No date'}
                      </span>
                      <span className="transaction-item-description">
                        {receipt.merchant_name || receipt.file_name}
                      </span>
                    </div>
                    <span className="transaction-item-amount">
                      {receipt.total_amount ? formatCurrency(receipt.total_amount) : '-'}
                    </span>
                  </Link>
                ))}
                {receipts.length > 10 && (
                  <Link to={`/receipts?store_id=${store.id}`} className="view-all-link">
                    View all {receipts.length} transactions
                  </Link>
                )}
              </div>
            ) : (
              <p className="no-data-message">No transactions found for this store.</p>
            )}
          </div>

          {/* Frequently Purchased Items Section */}
          {frequentItems.length > 0 && (
            <div className="detail-section">
              <h2>Frequently Purchased Items</h2>
              <div className="frequent-items-list">
                {frequentItems.map((item, index) => (
                  <div key={index} className="frequent-item">
                    <div className="frequent-item-info">
                      <span className="frequent-item-name">{item.description}</span>
                      <span className="frequent-item-count">Purchased {item.count} times</span>
                    </div>
                    <span className="frequent-item-total">
                      {formatCurrency(item.totalSpent)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {store.aliases && store.aliases.length > 0 && (
            <div className="detail-section">
              <h2>Aliases</h2>
              <div className="detail-list">
                {store.aliases.map((alias, index) => (
                  <span key={index} className="detail-chip">
                    {alias}
                  </span>
                ))}
              </div>
            </div>
          )}

          {store.receipt_patterns && store.receipt_patterns.length > 0 && (
            <div className="detail-section">
              <h2>Receipt Patterns</h2>
              <div className="patterns-list">
                {store.receipt_patterns.map((pattern, index) => (
                  <code key={index} className="pattern-item">
                    {pattern}
                  </code>
                ))}
              </div>
            </div>
          )}

          {store.tags && store.tags.length > 0 && (
            <div className="detail-section">
              <h2>Tags</h2>
              <div className="detail-list">
                {store.tags.map((tag, index) => (
                  <span key={index} className="detail-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h2>Statistics</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{store.match_count}</span>
                <span className="stat-label">Matches</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{store.merge_count}</span>
                <span className="stat-label">Merges</span>
              </div>
            </div>
          </div>

          <div className="detail-section detail-timestamps">
            <div className="timestamp-item">
              <span className="detail-label">Created</span>
              <span className="detail-value">
                {new Date(store.created_at).toLocaleString()}
              </span>
            </div>
            <div className="timestamp-item">
              <span className="detail-label">Updated</span>
              <span className="detail-value">
                {new Date(store.updated_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="delete-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Store</h3>
              <p>
                Are you sure you want to delete <strong>{store.name}</strong>?
                This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="cancel-button"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="confirm-delete-button"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Store'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
