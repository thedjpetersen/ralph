import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import {
  googleDriveConnectionsApi,
  googleDriveFoldersApi,
  googleDriveSyncApi,
  googleDriveSyncHistoryApi,
  type GoogleDriveConnection,
  type GoogleDriveFolder,
  type GoogleDriveSyncHistory,
  type GoogleDriveSyncFile,
  type SyncHistoryStatus,
  type SyncFileStatus,
} from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import './GoogleDriveSync.css';

export function GoogleDriveSync() {
  const { currentAccount } = useAccountStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<GoogleDriveConnection[]>([]);
  const [folders, setFolders] = useState<GoogleDriveFolder[]>([]);
  const [syncHistory, setSyncHistory] = useState<GoogleDriveSyncHistory[]>([]);
  const [syncHistoryTotal, setSyncHistoryTotal] = useState(0);
  const [selectedSync, setSelectedSync] = useState<GoogleDriveSyncHistory | null>(null);
  const [syncFiles, setSyncFiles] = useState<GoogleDriveSyncFile[]>([]);
  const [syncFilesTotal, setSyncFilesTotal] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SyncHistoryStatus | ''>('');
  const [page, setPage] = useState(0);
  const [filesPage, setFilesPage] = useState(0);
  const pageSize = 10;

  const fetchData = useCallback(async () => {
    if (!currentAccount?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const [connectionsResponse, foldersResponse, historyResponse] = await Promise.all([
        googleDriveConnectionsApi.list(currentAccount.id),
        googleDriveFoldersApi.list(currentAccount.id),
        googleDriveSyncHistoryApi.list(currentAccount.id, {
          status: statusFilter || undefined,
          limit: pageSize,
          offset: page * pageSize,
        }),
      ]);

      setConnections(connectionsResponse.connections);
      setFolders(foldersResponse.folders);
      setSyncHistory(historyResponse.sync_history);
      setSyncHistoryTotal(historyResponse.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sync data');
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount?.id, statusFilter, page]);

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
        const historyResponse = await googleDriveSyncHistoryApi.list(currentAccount.id, {
          status: statusFilter || undefined,
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
  }, [currentAccount?.id, syncHistory, statusFilter, page]);

  const handleTriggerSync = useCallback(async () => {
    if (!currentAccount?.id) return;

    setIsSyncing(true);
    try {
      await googleDriveSyncApi.triggerSync(currentAccount.id);
      toast.success('Sync started');
      fetchData();
    } catch {
      toast.error('Failed to start sync');
    } finally {
      setIsSyncing(false);
    }
  }, [currentAccount?.id, fetchData]);

  const handleCancelSync = useCallback(async (syncId: string) => {
    if (!currentAccount?.id) return;

    try {
      await googleDriveSyncHistoryApi.cancel(currentAccount.id, syncId);
      toast.success('Sync cancelled');
      fetchData();
    } catch {
      toast.error('Failed to cancel sync');
    }
  }, [currentAccount?.id, fetchData]);

  const handleViewDetails = useCallback(async (sync: GoogleDriveSyncHistory) => {
    if (!currentAccount?.id) return;

    setSelectedSync(sync);
    setFilesPage(0);

    try {
      const filesResponse = await googleDriveSyncHistoryApi.listFiles(currentAccount.id, sync.id, {
        limit: pageSize,
        offset: 0,
      });
      setSyncFiles(filesResponse.files);
      setSyncFilesTotal(filesResponse.total);
    } catch {
      toast.error('Failed to load sync files');
    }
  }, [currentAccount?.id]);

  const handleLoadMoreFiles = useCallback(async () => {
    if (!currentAccount?.id || !selectedSync) return;

    const nextPage = filesPage + 1;
    try {
      const filesResponse = await googleDriveSyncHistoryApi.listFiles(currentAccount.id, selectedSync.id, {
        limit: pageSize,
        offset: nextPage * pageSize,
      });
      setSyncFiles(prev => [...prev, ...filesResponse.files]);
      setFilesPage(nextPage);
    } catch {
      toast.error('Failed to load more files');
    }
  }, [currentAccount?.id, selectedSync, filesPage]);

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

  const getFileStatusLabel = (status: SyncFileStatus) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'skipped': return 'Skipped';
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    if (!connectionId) return 'All Connections';
    const connection = connections.find(c => c.id === connectionId);
    return connection?.email || 'Unknown Account';
  };

  const getFolderName = (folderId?: string) => {
    if (!folderId) return 'All Folders';
    const folder = folders.find(f => f.id === folderId);
    return folder?.name || 'Unknown Folder';
  };

  const activeConnections = connections.filter(c => c.status === 'active');
  const hasActiveSyncs = syncHistory.some(s => s.status === 'running' || s.status === 'pending');
  const totalPages = Math.ceil(syncHistoryTotal / pageSize);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="google-drive-sync-page">
          <div className="google-drive-sync-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view sync history.</p>
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
        <div className="google-drive-sync-page">
          <div className="google-drive-sync-header">
            <Link to="/integrations/google-drive" className="back-link">
              Back to Google Drive Settings
            </Link>
            <h1>Google Drive Sync</h1>
            <p className="google-drive-sync-subtitle">
              View sync history and manage sync operations
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
        <div className="google-drive-sync-page">
          <div className="google-drive-sync-error">
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
      <div className="google-drive-sync-page">
        <div className="google-drive-sync-header">
          <Link to="/integrations/google-drive" className="back-link">
            Back to Google Drive Settings
          </Link>
          <h1>Google Drive Sync</h1>
          <p className="google-drive-sync-subtitle">
            View sync history and manage sync operations
          </p>
        </div>

        {/* Connection Status Section */}
        <section className="sync-section">
          <div className="section-header">
            <h2>Connection Status</h2>
            {activeConnections.length > 0 && folders.length > 0 && (
              <button
                onClick={handleTriggerSync}
                className="sync-now-button"
                disabled={isSyncing || hasActiveSyncs}
              >
                {isSyncing || hasActiveSyncs ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
          </div>

          {activeConnections.length === 0 ? (
            <div className="no-connections-notice">
              <p>No active Google Drive connections. Connect an account to start syncing.</p>
              <Link to="/integrations/google-drive" className="setup-link">
                Set Up Google Drive
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
                    <span className="connection-last-sync">
                      Last sync: {formatDate(connection.last_sync_at)}
                    </span>
                  </div>
                  <span className={`connection-badge status-${connection.status}`}>
                    {connection.status === 'active' ? 'Connected' : connection.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Folder Picker Section */}
        {activeConnections.length > 0 && (
          <section className="sync-section">
            <div className="section-header">
              <h2>Watched Folders</h2>
              <Link to="/integrations/google-drive" className="manage-folders-link">
                Manage Folders
              </Link>
            </div>

            {folders.length === 0 ? (
              <div className="no-folders-notice">
                <p>No folders configured for syncing. Add folders to watch for receipts.</p>
                <Link to="/integrations/google-drive" className="setup-link">
                  Add Folders
                </Link>
              </div>
            ) : (
              <div className="folders-list">
                {folders.map(folder => (
                  <div key={folder.id} className={`folder-item ${!folder.sync_enabled ? 'disabled' : ''}`}>
                    <div className="folder-icon">📁</div>
                    <div className="folder-info">
                      <span className="folder-name">{folder.name}</span>
                      <span className="folder-path">{folder.path || '/'}</span>
                    </div>
                    <span className={`folder-badge ${folder.sync_enabled ? 'enabled' : 'disabled'}`}>
                      {folder.sync_enabled ? 'Watching' : 'Paused'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Sync History Section */}
        <section className="sync-section">
          <div className="section-header">
            <h2>Sync History</h2>
            <div className="history-filters">
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
              <h3>No Sync History</h3>
              <p>
                {statusFilter
                  ? `No syncs with status "${statusFilter}" found.`
                  : 'No sync operations have been performed yet.'}
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
                        <span className="scope-item">{getFolderName(sync.folder_id)}</span>
                      </div>
                    </div>

                    <div className="sync-history-stats">
                      <div className="stat-item">
                        <span className="stat-value">{sync.files_processed}</span>
                        <span className="stat-label">Processed</span>
                      </div>
                      <div className="stat-item stat-added">
                        <span className="stat-value">{sync.files_added}</span>
                        <span className="stat-label">Added</span>
                      </div>
                      <div className="stat-item stat-updated">
                        <span className="stat-value">{sync.files_updated}</span>
                        <span className="stat-label">Updated</span>
                      </div>
                      {sync.files_failed > 0 && (
                        <div className="stat-item stat-failed">
                          <span className="stat-value">{sync.files_failed}</span>
                          <span className="stat-label">Failed</span>
                        </div>
                      )}
                      <div className="stat-item">
                        <span className="stat-value">{formatBytes(sync.bytes_processed)}</span>
                        <span className="stat-label">Size</span>
                      </div>
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
                        View Files
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
                  <div className="detail-row">
                    <span className="detail-label">Files Processed</span>
                    <span className="detail-value">
                      {selectedSync.files_processed} / {selectedSync.files_total}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Data Size</span>
                    <span className="detail-value">{formatBytes(selectedSync.bytes_processed)}</span>
                  </div>
                </div>

                {selectedSync.error_message && (
                  <div className="sync-detail-error">
                    <strong>Error:</strong> {selectedSync.error_message}
                  </div>
                )}

                <div className="sync-files-section">
                  <h4>Files ({syncFilesTotal})</h4>

                  {syncFiles.length === 0 ? (
                    <p className="no-files-message">No files in this sync operation.</p>
                  ) : (
                    <>
                      <div className="sync-files-list">
                        {syncFiles.map(file => (
                          <div key={file.id} className="sync-file-item">
                            <div className="file-info">
                              <span className="file-name">{file.name}</span>
                              <span className="file-meta">
                                {file.mime_type} • {formatBytes(file.size)}
                              </span>
                            </div>
                            <span className={`file-status status-${file.status}`}>
                              {getFileStatusLabel(file.status)}
                            </span>
                            {file.error_message && (
                              <span className="file-error" title={file.error_message}>
                                Error
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {syncFiles.length < syncFilesTotal && (
                        <button
                          onClick={handleLoadMoreFiles}
                          className="load-more-button"
                        >
                          Load More Files
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
