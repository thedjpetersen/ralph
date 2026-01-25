import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  useFinancialStore,
  type FinancialConnectionStatus,
  type FinancialConnectionProvider,
} from '../stores/financial';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import { PageTransition } from '../components/PageTransition';
import { ConnectionCard } from '../components/ConnectionCard';
import { PlaidLink } from '../components/PlaidLink';
import { AccountsListSkeleton } from '../components/skeletons';
import './FinancialConnections.css';

const STATUS_OPTIONS: { value: FinancialConnectionStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'error', label: 'Error' },
  { value: 'disconnected', label: 'Disconnected' },
  { value: 'expired', label: 'Expired' },
];

const PROVIDER_OPTIONS: { value: FinancialConnectionProvider | ''; label: string }[] = [
  { value: '', label: 'All Providers' },
  { value: 'plaid', label: 'Plaid' },
  { value: 'mx', label: 'MX' },
  { value: 'finicity', label: 'Finicity' },
  { value: 'yodlee', label: 'Yodlee' },
  { value: 'manual', label: 'Manual' },
];

export function FinancialConnections() {
  const { currentAccount } = useAccountStore();
  const {
    connections,
    isLoading,
    error,
    fetchConnections,
    refreshConnection,
    disconnectConnection,
  } = useFinancialStore();

  const [statusFilter, setStatusFilter] = useState<FinancialConnectionStatus | ''>('');
  const [providerFilter, setProviderFilter] = useState<FinancialConnectionProvider | ''>('');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (currentAccount?.id) {
      fetchConnections(currentAccount.id, {
        status: statusFilter || undefined,
        provider: providerFilter || undefined,
      });
    }
  }, [currentAccount?.id, statusFilter, providerFilter, fetchConnections]);

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as FinancialConnectionStatus | '');
  }, []);

  const handleProviderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setProviderFilter(e.target.value as FinancialConnectionProvider | '');
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setProviderFilter('');
  }, []);

  const handleRefresh = useCallback(
    async (id: string) => {
      if (!currentAccount) return;
      setRefreshingId(id);
      try {
        await refreshConnection(currentAccount.id, id);
        toast.success('Connection synced successfully');
      } catch {
        toast.error('Failed to sync connection');
      } finally {
        setRefreshingId(null);
      }
    },
    [currentAccount, refreshConnection]
  );

  const handleDisconnect = useCallback((id: string) => {
    setShowDisconnectConfirm(id);
  }, []);

  const confirmDisconnect = useCallback(async () => {
    if (!currentAccount || !showDisconnectConfirm) return;
    try {
      await disconnectConnection(currentAccount.id, showDisconnectConfirm);
      toast.success('Connection removed successfully');
    } catch {
      toast.error('Failed to remove connection');
    } finally {
      setShowDisconnectConfirm(null);
    }
  }, [currentAccount, showDisconnectConfirm, disconnectConnection]);

  const handlePlaidSuccess = useCallback(() => {
    if (currentAccount?.id) {
      fetchConnections(currentAccount.id, {
        status: statusFilter || undefined,
        provider: providerFilter || undefined,
      });
    }
  }, [currentAccount?.id, statusFilter, providerFilter, fetchConnections]);

  const hasActiveFilters = statusFilter !== '' || providerFilter !== '';

  const connectionNeedsAttention = connections.some(
    (c) => c.status === 'error' || c.status === 'expired'
  );

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="connections-page">
          <div className="connections-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view financial connections.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading && connections.length === 0) {
    return (
      <PageTransition>
        <div className="connections-page">
          <div className="connections-header">
            <h1>Bank Connections</h1>
            <p className="connections-subtitle">Manage your linked bank accounts</p>
          </div>
          <AccountsListSkeleton count={3} />
        </div>
      </PageTransition>
    );
  }

  if (error && connections.length === 0) {
    return (
      <PageTransition>
        <div className="connections-page">
          <div className="connections-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={() => fetchConnections(currentAccount.id)}
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
      <div className="connections-page">
        <div className="connections-header">
          <div className="connections-header-row">
            <div>
              <h1>Bank Connections</h1>
              <p className="connections-subtitle">Manage your linked bank accounts</p>
            </div>
            <PlaidLink
              onSuccess={handlePlaidSuccess}
              buttonText="Connect Bank"
              buttonClassName="connect-bank-button"
            />
          </div>
        </div>

        {connectionNeedsAttention && (
          <div className="connections-alert">
            <span className="alert-icon">!</span>
            <span className="alert-text">
              Some connections need attention. Please review and reconnect if necessary.
            </span>
          </div>
        )}

        <div className="connections-filters">
          <div className="filter-row">
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
              value={providerFilter}
              onChange={handleProviderChange}
              className="filter-select"
            >
              {PROVIDER_OPTIONS.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-button">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {connections.length === 0 ? (
          <div className="connections-empty">
            <h2>No Connections Found</h2>
            <p>
              {hasActiveFilters
                ? 'No connections match your filter criteria.'
                : "You don't have any bank connections yet."}
            </p>
            {!hasActiveFilters && (
              <PlaidLink
                onSuccess={handlePlaidSuccess}
                buttonText="Connect your first bank"
              />
            )}
          </div>
        ) : (
          <div className="connections-grid">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onRefresh={handleRefresh}
                onDisconnect={handleDisconnect}
                isRefreshing={refreshingId === connection.id}
              />
            ))}
          </div>
        )}

        {showDisconnectConfirm && (
          <div className="disconnect-confirm-overlay" onClick={() => setShowDisconnectConfirm(null)}>
            <div className="disconnect-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Disconnect Bank?</h3>
              <p>
                Are you sure you want to disconnect this bank connection? This will stop
                syncing transactions from this institution.
              </p>
              <div className="disconnect-confirm-actions">
                <button
                  onClick={() => setShowDisconnectConfirm(null)}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button onClick={confirmDisconnect} className="confirm-disconnect-button">
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
