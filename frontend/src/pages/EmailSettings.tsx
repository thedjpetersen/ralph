import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import {
  emailConnectionsApi,
  emailLabelsApi,
  emailSyncApi,
  type EmailConnection,
  type EmailLabel,
  type EmailSyncStatus_Response,
} from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { EmailConnect } from '../components/EmailConnect';
import { EmailLabelSelector } from '../components/EmailLabelSelector';
import { AccountsListSkeleton } from '../components/skeletons';
import './EmailSettings.css';

export function EmailSettings() {
  const { currentAccount } = useAccountStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [labels, setLabels] = useState<EmailLabel[]>([]);
  const [syncStatus, setSyncStatus] = useState<EmailSyncStatus_Response | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentAccount?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const [connectionsResponse, labelsResponse, statusResponse] = await Promise.all([
        emailConnectionsApi.list(currentAccount.id),
        emailLabelsApi.list(currentAccount.id),
        emailSyncApi.getSyncStatus(currentAccount.id).catch(() => null),
      ]);

      setConnections(connectionsResponse.connections);
      setLabels(labelsResponse.labels);
      setSyncStatus(statusResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch email settings');
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll sync status while syncing
  useEffect(() => {
    if (!currentAccount?.id || !syncStatus) return;
    if (syncStatus.status !== 'running' && syncStatus.status !== 'pending') return;

    const interval = setInterval(async () => {
      try {
        const status = await emailSyncApi.getSyncStatus(currentAccount.id);
        setSyncStatus(status);
        if (status.status !== 'running' && status.status !== 'pending') {
          clearInterval(interval);
          if (status.status === 'completed') {
            toast.success('Email sync completed successfully');
            fetchData();
          } else if (status.status === 'failed') {
            toast.error(status.error_message || 'Email sync failed');
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount?.id, syncStatus?.status, fetchData]);

  const handleConnectSuccess = useCallback(() => {
    fetchData();
    toast.success('Email connected successfully');
  }, [fetchData]);

  const handleDisconnect = useCallback((connectionId: string) => {
    setShowDisconnectConfirm(connectionId);
  }, []);

  const confirmDisconnect = useCallback(async () => {
    if (!currentAccount?.id || !showDisconnectConfirm) return;

    try {
      await emailConnectionsApi.disconnect(currentAccount.id, showDisconnectConfirm);
      toast.success('Email disconnected');
      fetchData();
    } catch {
      toast.error('Failed to disconnect email');
    } finally {
      setShowDisconnectConfirm(null);
    }
  }, [currentAccount?.id, showDisconnectConfirm, fetchData]);

  const handleTriggerSync = useCallback(async () => {
    if (!currentAccount?.id) return;

    setIsSyncing(true);
    try {
      const response = await emailSyncApi.triggerSync(currentAccount.id);
      setSyncStatus({
        status: response.status,
        current_sync_id: response.sync_id,
      });
      toast.success('Email sync started');
    } catch {
      toast.error('Failed to start email sync');
    } finally {
      setIsSyncing(false);
    }
  }, [currentAccount?.id]);

  const handleLabelToggle = useCallback(
    async (labelId: string, enabled: boolean) => {
      if (!currentAccount?.id) return;

      try {
        await emailLabelsApi.update(currentAccount.id, labelId, {
          sync_enabled: enabled,
        });
        setLabels((prev) =>
          prev.map((l) => (l.id === labelId ? { ...l, sync_enabled: enabled } : l))
        );
        toast.success(enabled ? 'Label sync enabled' : 'Label sync disabled');
      } catch {
        toast.error('Failed to update label settings');
      }
    },
    [currentAccount?.id]
  );

  const handleLabelRemove = useCallback(
    async (labelId: string) => {
      if (!currentAccount?.id) return;

      try {
        await emailLabelsApi.delete(currentAccount.id, labelId);
        setLabels((prev) => prev.filter((l) => l.id !== labelId));
        toast.success('Label removed');
      } catch {
        toast.error('Failed to remove label');
      }
    },
    [currentAccount?.id]
  );

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending';
      case 'error':
        return 'Error';
      case 'disconnected':
        return 'Disconnected';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'gmail':
        return 'Gmail';
      case 'outlook':
        return 'Outlook';
      case 'imap':
        return 'IMAP';
      default:
        return provider;
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

  const activeConnections = connections.filter((c) => c.status === 'active');
  const hasConnections = connections.length > 0;

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="email-settings-page">
          <div className="email-settings-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to manage email settings.</p>
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
        <div className="email-settings-page">
          <div className="email-settings-header">
            <Link to="/integrations" className="back-link">
              Back to Integrations
            </Link>
            <h1>Email Settings</h1>
            <p className="email-settings-subtitle">
              Manage your email connection and sync settings
            </p>
          </div>
          <AccountsListSkeleton count={3} />
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="email-settings-page">
          <div className="email-settings-error">
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
      <div className="email-settings-page">
        <div className="email-settings-header">
          <Link to="/integrations" className="back-link">
            Back to Integrations
          </Link>
          <h1>Email Settings</h1>
          <p className="email-settings-subtitle">
            Manage your email connection and sync settings
          </p>
        </div>

        {/* Sync Status */}
        {syncStatus && (syncStatus.status === 'running' || syncStatus.status === 'pending') && (
          <div className="email-sync-status">
            <div className="sync-status-header">
              <span className="sync-status-icon pulsing">●</span>
              <span className="sync-status-label">
                {syncStatus.status === 'pending' ? 'Preparing to sync...' : 'Syncing emails...'}
              </span>
            </div>
            {syncStatus.messages_total !== undefined && syncStatus.messages_total > 0 && (
              <div className="sync-progress">
                <div
                  className="sync-progress-fill"
                  style={{
                    width: `${((syncStatus.messages_processed || 0) / syncStatus.messages_total) * 100}%`,
                  }}
                />
              </div>
            )}
            {syncStatus.messages_total !== undefined && (
              <div className="sync-stats">
                <span>
                  {syncStatus.messages_processed || 0} / {syncStatus.messages_total} messages
                </span>
              </div>
            )}
          </div>
        )}

        {/* Connection Section */}
        <section className="settings-section">
          <div className="section-header">
            <h2>Connected Accounts</h2>
            <EmailConnect
              onSuccess={handleConnectSuccess}
              buttonText={hasConnections ? 'Add Another Account' : 'Connect Email'}
            />
          </div>

          {hasConnections ? (
            <div className="connections-grid">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className={`connection-card ${connection.status === 'error' || connection.status === 'expired' ? 'needs-attention' : ''}`}
                >
                  <div className="connection-card-header">
                    <div className="connection-info">
                      <div className="connection-avatar">
                        {connection.name?.charAt(0).toUpperCase() ||
                          connection.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="connection-details">
                        <h3 className="connection-name">{connection.name || 'Email Account'}</h3>
                        <p className="connection-email">{connection.email}</p>
                      </div>
                    </div>
                    <div className="connection-badges">
                      <span className="connection-provider">
                        {getProviderLabel(connection.provider)}
                      </span>
                      <span className={`connection-status status-${connection.status}`}>
                        {getStatusLabel(connection.status)}
                      </span>
                    </div>
                  </div>

                  {connection.error_message && (
                    <div className="connection-error">
                      <span className="error-icon">!</span>
                      <span className="error-message">{connection.error_message}</span>
                    </div>
                  )}

                  <div className="connection-meta">
                    <div className="meta-item">
                      <span className="meta-label">Last Synced</span>
                      <span className="meta-value">{formatDate(connection.last_sync_at)}</span>
                    </div>
                    {connection.message_count !== undefined && (
                      <div className="meta-item">
                        <span className="meta-label">Messages</span>
                        <span className="meta-value">{connection.message_count.toLocaleString()}</span>
                      </div>
                    )}
                    {connection.unread_count !== undefined && (
                      <div className="meta-item">
                        <span className="meta-label">Unread</span>
                        <span className="meta-value">{connection.unread_count.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="connection-actions">
                    <button
                      onClick={() => handleDisconnect(connection.id)}
                      className="disconnect-button"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-connections">
              <div className="no-connections-icon">@</div>
              <h3>No Email Connected</h3>
              <p>Connect your email to sync receipts and documents automatically.</p>
            </div>
          )}
        </section>

        {/* Labels Section */}
        {activeConnections.length > 0 && (
          <section className="settings-section">
            <div className="section-header">
              <h2>Synced Labels</h2>
              <div className="section-header-actions">
                <Link to="/integrations/email/sync" className="view-sync-history-link">
                  View Sync History
                </Link>
                {labels.length > 0 && (
                  <button
                    onClick={handleTriggerSync}
                    className="sync-now-button"
                    disabled={isSyncing || syncStatus?.status === 'running'}
                  >
                    {isSyncing || syncStatus?.status === 'running' ? 'Syncing...' : 'Sync Now'}
                  </button>
                )}
              </div>
            </div>

            <EmailLabelSelector
              labels={labels}
              connections={activeConnections}
              onToggle={handleLabelToggle}
              onRemove={handleLabelRemove}
              onLabelAdded={fetchData}
            />
          </section>
        )}

        {/* Disconnect Confirmation Modal */}
        {showDisconnectConfirm && (
          <div
            className="disconnect-confirm-overlay"
            onClick={() => setShowDisconnectConfirm(null)}
          >
            <div className="disconnect-confirm-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Disconnect Email?</h3>
              <p>
                Are you sure you want to disconnect this email account? This will stop
                syncing emails from this account and remove all associated labels.
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
