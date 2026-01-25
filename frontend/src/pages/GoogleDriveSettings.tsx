import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import {
  googleDriveConnectionsApi,
  googleDriveFoldersApi,
  googleDriveSyncApi,
  type GoogleDriveConnection,
  type GoogleDriveFolder,
  type GoogleDriveSyncStatus_Response,
} from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { GoogleDriveConnect } from '../components/GoogleDriveConnect';
import { FolderSelector } from '../components/FolderSelector';
import { SyncStatus } from '../components/SyncStatus';
import { AccountsListSkeleton } from '../components/skeletons';
import './GoogleDriveSettings.css';

export function GoogleDriveSettings() {
  const { currentAccount } = useAccountStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<GoogleDriveConnection[]>([]);
  const [folders, setFolders] = useState<GoogleDriveFolder[]>([]);
  const [syncStatus, setSyncStatus] = useState<GoogleDriveSyncStatus_Response | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentAccount?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const [connectionsResponse, foldersResponse, statusResponse] = await Promise.all([
        googleDriveConnectionsApi.list(currentAccount.id),
        googleDriveFoldersApi.list(currentAccount.id),
        googleDriveSyncApi.getSyncStatus(currentAccount.id).catch(() => null),
      ]);

      setConnections(connectionsResponse.connections);
      setFolders(foldersResponse.folders);
      setSyncStatus(statusResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Google Drive settings');
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
        const status = await googleDriveSyncApi.getSyncStatus(currentAccount.id);
        setSyncStatus(status);
        if (status.status !== 'running' && status.status !== 'pending') {
          clearInterval(interval);
          if (status.status === 'completed') {
            toast.success('Sync completed successfully');
            fetchData();
          } else if (status.status === 'failed') {
            toast.error(status.error_message || 'Sync failed');
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
    // Only re-run when sync status changes, not on every syncStatus object update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount?.id, syncStatus?.status, fetchData]);

  const handleConnectSuccess = useCallback(() => {
    fetchData();
    toast.success('Google Drive connected successfully');
  }, [fetchData]);

  const handleDisconnect = useCallback((connectionId: string) => {
    setShowDisconnectConfirm(connectionId);
  }, []);

  const confirmDisconnect = useCallback(async () => {
    if (!currentAccount?.id || !showDisconnectConfirm) return;

    try {
      await googleDriveConnectionsApi.disconnect(currentAccount.id, showDisconnectConfirm);
      toast.success('Google Drive disconnected');
      fetchData();
    } catch {
      toast.error('Failed to disconnect Google Drive');
    } finally {
      setShowDisconnectConfirm(null);
    }
  }, [currentAccount?.id, showDisconnectConfirm, fetchData]);

  const handleTriggerSync = useCallback(async () => {
    if (!currentAccount?.id) return;

    setIsSyncing(true);
    try {
      const response = await googleDriveSyncApi.triggerSync(currentAccount.id);
      setSyncStatus({
        status: response.status,
        current_sync_id: response.sync_id,
      });
      toast.success('Sync started');
    } catch {
      toast.error('Failed to start sync');
    } finally {
      setIsSyncing(false);
    }
  }, [currentAccount?.id]);

  const handleFolderToggle = useCallback(
    async (folderId: string, enabled: boolean) => {
      if (!currentAccount?.id) return;

      try {
        await googleDriveFoldersApi.update(currentAccount.id, folderId, {
          sync_enabled: enabled,
        });
        setFolders((prev) =>
          prev.map((f) => (f.id === folderId ? { ...f, sync_enabled: enabled } : f))
        );
        toast.success(enabled ? 'Folder sync enabled' : 'Folder sync disabled');
      } catch {
        toast.error('Failed to update folder settings');
      }
    },
    [currentAccount?.id]
  );

  const handleFolderRemove = useCallback(
    async (folderId: string) => {
      if (!currentAccount?.id) return;

      try {
        await googleDriveFoldersApi.delete(currentAccount.id, folderId);
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        toast.success('Folder removed');
      } catch {
        toast.error('Failed to remove folder');
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
        <div className="google-drive-settings-page">
          <div className="google-drive-settings-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to manage Google Drive settings.</p>
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
        <div className="google-drive-settings-page">
          <div className="google-drive-settings-header">
            <Link to="/integrations" className="back-link">
              Back to Integrations
            </Link>
            <h1>Google Drive Settings</h1>
            <p className="google-drive-settings-subtitle">
              Manage your Google Drive connection and sync settings
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
        <div className="google-drive-settings-page">
          <div className="google-drive-settings-error">
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
      <div className="google-drive-settings-page">
        <div className="google-drive-settings-header">
          <Link to="/integrations" className="back-link">
            Back to Integrations
          </Link>
          <h1>Google Drive Settings</h1>
          <p className="google-drive-settings-subtitle">
            Manage your Google Drive connection and sync settings
          </p>
        </div>

        {/* Sync Status */}
        {syncStatus && (syncStatus.status === 'running' || syncStatus.status === 'pending') && (
          <SyncStatus status={syncStatus} />
        )}

        {/* Connection Section */}
        <section className="settings-section">
          <div className="section-header">
            <h2>Connected Accounts</h2>
            <GoogleDriveConnect
              onSuccess={handleConnectSuccess}
              buttonText={hasConnections ? 'Add Another Account' : 'Connect Google Drive'}
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
                        <h3 className="connection-name">{connection.name || 'Google Account'}</h3>
                        <p className="connection-email">{connection.email}</p>
                      </div>
                    </div>
                    <span className={`connection-status status-${connection.status}`}>
                      {getStatusLabel(connection.status)}
                    </span>
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
                    {connection.storage_quota_used !== undefined &&
                      connection.storage_quota_total !== undefined && (
                        <div className="meta-item">
                          <span className="meta-label">Storage Used</span>
                          <span className="meta-value">
                            {((connection.storage_quota_used / connection.storage_quota_total) * 100).toFixed(1)}%
                          </span>
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
              <div className="no-connections-icon">GD</div>
              <h3>No Google Drive Connected</h3>
              <p>Connect your Google Drive to sync receipts and documents automatically.</p>
            </div>
          )}
        </section>

        {/* Folders Section */}
        {activeConnections.length > 0 && (
          <section className="settings-section">
            <div className="section-header">
              <h2>Synced Folders</h2>
              {folders.length > 0 && (
                <button
                  onClick={handleTriggerSync}
                  className="sync-now-button"
                  disabled={isSyncing || syncStatus?.status === 'running'}
                >
                  {isSyncing || syncStatus?.status === 'running' ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>

            <FolderSelector
              folders={folders}
              connections={activeConnections}
              onToggle={handleFolderToggle}
              onRemove={handleFolderRemove}
              onFolderAdded={fetchData}
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
              <h3>Disconnect Google Drive?</h3>
              <p>
                Are you sure you want to disconnect this Google Drive account? This will stop
                syncing files from this account and remove all associated folders.
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
