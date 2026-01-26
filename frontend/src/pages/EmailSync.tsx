import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import {
  emailConnectionsApi,
  emailLabelsApi,
  emailSyncApi,
  emailSyncHistoryApi,
  type EmailConnection,
  type EmailLabel,
  type EmailSyncHistory,
  type SyncHistoryStatus,
} from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import './EmailSync.css';

interface FilterRule {
  id: string;
  name: string;
  from_pattern?: string;
  subject_pattern?: string;
  action: 'import' | 'skip' | 'tag';
  enabled: boolean;
}

export function EmailSync() {
  const { currentAccount } = useAccountStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [labels, setLabels] = useState<EmailLabel[]>([]);
  const [syncHistory, setSyncHistory] = useState<EmailSyncHistory[]>([]);
  const [syncHistoryTotal, setSyncHistoryTotal] = useState(0);
  const [selectedSync, setSelectedSync] = useState<EmailSyncHistory | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SyncHistoryStatus | ''>('');
  const [connectionFilter, setConnectionFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [filterRules] = useState<FilterRule[]>([
    { id: '1', name: 'Receipts from Amazon', from_pattern: '*@amazon.com', subject_pattern: 'Your Amazon.com order*', action: 'import', enabled: true },
    { id: '2', name: 'Skip newsletters', subject_pattern: '*newsletter*', action: 'skip', enabled: true },
  ]);
  const pageSize = 10;

  const fetchData = useCallback(async () => {
    if (!currentAccount?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const [connectionsResponse, labelsResponse, historyResponse] = await Promise.all([
        emailConnectionsApi.list(currentAccount.id),
        emailLabelsApi.list(currentAccount.id),
        emailSyncHistoryApi.list(currentAccount.id, {
          status: statusFilter || undefined,
          connection_id: connectionFilter || undefined,
          limit: pageSize,
          offset: page * pageSize,
        }),
      ]);

      setConnections(connectionsResponse.connections);
      setLabels(labelsResponse.labels);
      setSyncHistory(historyResponse.sync_history);
      setSyncHistoryTotal(historyResponse.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sync data');
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount?.id, statusFilter, connectionFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for active syncs
  useEffect(() => {
    if (!currentAccount?.id) return;

    const hasActiveSyncs = syncHistory.some(s => s.status === 'running' || s.status === 'pending');
    if (!hasActiveSyncs) return;

    const interval = setInterval(async () => {
      try {
        const historyResponse = await emailSyncHistoryApi.list(currentAccount.id, {
          status: statusFilter || undefined,
          connection_id: connectionFilter || undefined,
          limit: pageSize,
          offset: page * pageSize,
        });
        setSyncHistory(historyResponse.sync_history);
        setSyncHistoryTotal(historyResponse.total);
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentAccount?.id, syncHistory, statusFilter, connectionFilter, page]);

  const handleTriggerSync = useCallback(async () => {
    if (!currentAccount?.id) return;

    setIsSyncing(true);
    try {
      await emailSyncApi.triggerSync(currentAccount.id);
      toast.success('Email sync started');
      fetchData();
    } catch {
      toast.error('Failed to start email sync');
    } finally {
      setIsSyncing(false);
    }
  }, [currentAccount?.id, fetchData]);

  const handleCancelSync = useCallback(async (syncId: string) => {
    if (!currentAccount?.id) return;

    try {
      await emailSyncHistoryApi.cancel(currentAccount.id, syncId);
      toast.success('Sync cancelled');
      fetchData();
    } catch {
      toast.error('Failed to cancel sync');
    }
  }, [currentAccount?.id, fetchData]);

  const handleViewDetails = useCallback((sync: EmailSyncHistory) => {
    setSelectedSync(sync);
  }, []);

  const getStatusLabel = (status: SyncHistoryStatus) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'running': return 'Running';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (startedAt: string, completedAt?: string) => {
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const duration = end - start;

    if (duration < 1000) return '<1s';
    if (duration < 60000) return `${Math.floor(duration / 1000)}s`;
    if (duration < 3600000) return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
    return `${Math.floor(duration / 3600000)}h ${Math.floor((duration % 3600000) / 60000)}m`;
  };

  const getConnectionName = (connectionId?: string) => {
    if (!connectionId) return 'All Accounts';
    const connection = connections.find(c => c.id === connectionId);
    return connection?.email || 'Unknown Account';
  };

  const getLabelName = (labelId?: string) => {
    if (!labelId) return 'All Labels';
    const label = labels.find(l => l.id === labelId);
    return label?.name || 'Unknown Label';
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'gmail': return 'Gmail';
      case 'outlook': return 'Outlook';
      case 'imap': return 'IMAP';
      default: return provider;
    }
  };

  const activeConnections = connections.filter(c => c.status === 'active');
  const hasActiveSyncs = syncHistory.some(s => s.status === 'running' || s.status === 'pending');
  const totalPages = Math.ceil(syncHistoryTotal / pageSize);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="email-sync-page">
          <div className="email-sync-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view email sync history.</p>
            <Link to="/accounts" className="select-account-link">
              Select an Account
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (isLoading) {
    return (
      <PageTransition>
        <div className="email-sync-page">
          <div className="email-sync-header">
            <Link to="/integrations/email" className="back-link">
              Back to Email Settings
            </Link>
            <h1>Email Sync</h1>
            <p className="email-sync-subtitle">
              View sync history and manage email import settings
            </p>
          </div>
          <AccountsListSkeleton count={5} />
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="email-sync-page">
          <div className="email-sync-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={fetchData} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="email-sync-page">
        <div className="email-sync-header">
          <Link to="/integrations/email" className="back-link">
            Back to Email Settings
          </Link>
          <h1>Email Sync</h1>
          <p className="email-sync-subtitle">
            View sync history and manage email import settings
          </p>
        </div>

        {/* Connected Accounts Section */}
        <section className="sync-section">
          <div className="section-header">
            <h2>Connected Accounts</h2>
            {activeConnections.length > 0 && labels.some(l => l.sync_enabled) && (
              <button
                onClick={handleTriggerSync}
                className="sync-now-button"
                disabled={isSyncing || hasActiveSyncs}
              >
                {isSyncing || hasActiveSyncs ? 'Syncing...' : 'Check Now'}
              </button>
            )}
          </div>

          {activeConnections.length === 0 ? (
            <div className="no-connections-notice">
              <p>No active email connections. Connect an account to start syncing.</p>
              <Link to="/integrations/email" className="setup-link">
                Set Up Email
              </Link>
            </div>
          ) : (
            <div className="connection-status-grid">
              {activeConnections.map(connection => (
                <div key={connection.id} className="connection-status-card">
                  <div className="connection-avatar">
                    {connection.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="connection-info">
                    <span className="connection-email">{connection.email}</span>
                    <span className="connection-meta">
                      {getProviderLabel(connection.provider)} • Last sync: {formatDate(connection.last_sync_at)}
                    </span>
                  </div>
                  <div className="connection-stats">
                    {connection.message_count !== undefined && (
                      <span className="stat-badge">
                        {connection.message_count.toLocaleString()} messages
                      </span>
                    )}
                    {connection.unread_count !== undefined && connection.unread_count > 0 && (
                      <span className="stat-badge unread">
                        {connection.unread_count.toLocaleString()} unread
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Filter Rules Section */}
        <section className="sync-section">
          <div className="section-header">
            <h2>Filter Rules</h2>
            <button className="add-rule-button" disabled>
              Add Rule
            </button>
          </div>

          <p className="filter-rules-description">
            Configure rules to automatically filter which emails get imported as receipts.
          </p>

          {filterRules.length === 0 ? (
            <div className="no-rules-notice">
              <div className="no-rules-icon">⚙️</div>
              <h3>No Filter Rules</h3>
              <p>Add rules to customize which emails are imported.</p>
            </div>
          ) : (
            <div className="filter-rules-list">
              {filterRules.map(rule => (
                <div key={rule.id} className={`filter-rule-item ${!rule.enabled ? 'disabled' : ''}`}>
                  <div className="rule-info">
                    <span className="rule-name">{rule.name}</span>
                    <div className="rule-patterns">
                      {rule.from_pattern && (
                        <span className="rule-pattern">From: {rule.from_pattern}</span>
                      )}
                      {rule.subject_pattern && (
                        <span className="rule-pattern">Subject: {rule.subject_pattern}</span>
                      )}
                    </div>
                  </div>
                  <span className={`rule-action action-${rule.action}`}>
                    {rule.action === 'import' ? 'Import' : rule.action === 'skip' ? 'Skip' : 'Tag'}
                  </span>
                  <span className={`rule-status ${rule.enabled ? 'enabled' : 'disabled'}`}>
                    {rule.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sync History Section */}
        <section className="sync-section">
          <div className="section-header">
            <h2>Import History</h2>
            <div className="history-filters">
              {connections.length > 1 && (
                <select
                  value={connectionFilter}
                  onChange={(e) => {
                    setConnectionFilter(e.target.value);
                    setPage(0);
                  }}
                  className="connection-filter"
                >
                  <option value="">All Accounts</option>
                  {connections.map(conn => (
                    <option key={conn.id} value={conn.id}>{conn.email}</option>
                  ))}
                </select>
              )}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as SyncHistoryStatus | '');
                  setPage(0);
                }}
                className="status-filter"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {syncHistory.length === 0 ? (
            <div className="no-history-notice">
              <div className="no-history-icon">📋</div>
              <h3>No Import History</h3>
              <p>
                {statusFilter
                  ? `No syncs with status "${statusFilter}" found.`
                  : 'No email sync operations have been performed yet.'}
              </p>
            </div>
          ) : (
            <>
              <div className="sync-history-list">
                {syncHistory.map(sync => (
                  <div key={sync.id} className="sync-history-item">
                    <div className="sync-history-main">
                      <div className="sync-history-status">
                        <span className={`status-indicator status-${sync.status}`} />
                        <span className="status-text">{getStatusLabel(sync.status)}</span>
                      </div>
                      <div className="sync-history-info">
                        <span className="sync-date">{formatDate(sync.started_at)}</span>
                        <span className="sync-duration">
                          Duration: {formatDuration(sync.started_at, sync.completed_at)}
                        </span>
                      </div>
                      <div className="sync-history-scope">
                        <span className="scope-item">{getConnectionName(sync.connection_id)}</span>
                        <span className="scope-separator">•</span>
                        <span className="scope-item">{getLabelName(sync.label_id)}</span>
                      </div>
                    </div>

                    <div className="sync-history-stats">
                      <div className="stat-item">
                        <span className="stat-value">{sync.messages_processed}</span>
                        <span className="stat-label">Processed</span>
                      </div>
                      <div className="stat-item stat-added">
                        <span className="stat-value">{sync.messages_added}</span>
                        <span className="stat-label">Added</span>
                      </div>
                      <div className="stat-item stat-updated">
                        <span className="stat-value">{sync.messages_updated}</span>
                        <span className="stat-label">Updated</span>
                      </div>
                      {sync.messages_deleted > 0 && (
                        <div className="stat-item stat-deleted">
                          <span className="stat-value">{sync.messages_deleted}</span>
                          <span className="stat-label">Deleted</span>
                        </div>
                      )}
                      {sync.messages_failed > 0 && (
                        <div className="stat-item stat-failed">
                          <span className="stat-value">{sync.messages_failed}</span>
                          <span className="stat-label">Failed</span>
                        </div>
                      )}
                    </div>

                    {sync.error_message && (
                      <div className="sync-error-message">
                        <span className="error-icon">!</span>
                        <span>{sync.error_message}</span>
                      </div>
                    )}

                    <div className="sync-history-actions">
                      <button
                        onClick={() => handleViewDetails(sync)}
                        className="view-details-button"
                      >
                        View Details
                      </button>
                      {(sync.status === 'pending' || sync.status === 'running') && (
                        <button
                          onClick={() => handleCancelSync(sync.id)}
                          className="cancel-sync-button"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="pagination-button"
                  >
                    Previous
                  </button>
                  <span className="pagination-info">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="pagination-button"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Sync Detail Modal */}
        {selectedSync && (
          <div className="sync-detail-overlay" onClick={() => setSelectedSync(null)}>
            <div className="sync-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Sync Details</h3>
                <button
                  onClick={() => setSelectedSync(null)}
                  className="modal-close-button"
                >
                  ×
                </button>
              </div>

              <div className="modal-content">
                <div className="sync-detail-summary">
                  <div className="detail-row">
                    <span className="detail-label">Status</span>
                    <span className={`detail-value status-${selectedSync.status}`}>
                      {getStatusLabel(selectedSync.status)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Account</span>
                    <span className="detail-value">{getConnectionName(selectedSync.connection_id)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Label</span>
                    <span className="detail-value">{getLabelName(selectedSync.label_id)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Started</span>
                    <span className="detail-value">{formatDate(selectedSync.started_at)}</span>
                  </div>
                  {selectedSync.completed_at && (
                    <div className="detail-row">
                      <span className="detail-label">Completed</span>
                      <span className="detail-value">{formatDate(selectedSync.completed_at)}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">Duration</span>
                    <span className="detail-value">
                      {formatDuration(selectedSync.started_at, selectedSync.completed_at)}
                    </span>
                  </div>
                </div>

                <div className="sync-detail-stats">
                  <h4>Message Statistics</h4>
                  <div className="stats-grid">
                    <div className="stat-box">
                      <span className="stat-box-value">{selectedSync.messages_processed}</span>
                      <span className="stat-box-label">Processed</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-box-value">{selectedSync.messages_total}</span>
                      <span className="stat-box-label">Total</span>
                    </div>
                    <div className="stat-box stat-added">
                      <span className="stat-box-value">{selectedSync.messages_added}</span>
                      <span className="stat-box-label">Added</span>
                    </div>
                    <div className="stat-box stat-updated">
                      <span className="stat-box-value">{selectedSync.messages_updated}</span>
                      <span className="stat-box-label">Updated</span>
                    </div>
                    <div className="stat-box stat-deleted">
                      <span className="stat-box-value">{selectedSync.messages_deleted}</span>
                      <span className="stat-box-label">Deleted</span>
                    </div>
                    <div className="stat-box stat-failed">
                      <span className="stat-box-value">{selectedSync.messages_failed}</span>
                      <span className="stat-box-label">Failed</span>
                    </div>
                  </div>
                </div>

                {selectedSync.error_message && (
                  <div className="sync-detail-error">
                    <strong>Error:</strong> {selectedSync.error_message}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
