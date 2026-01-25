import { type GoogleDriveSyncStatus_Response } from '../api/client';
import './SyncStatus.css';

interface SyncStatusProps {
  status: GoogleDriveSyncStatus_Response;
}

export function SyncStatus({ status }: SyncStatusProps) {
  const getStatusLabel = () => {
    switch (status.status) {
      case 'idle':
        return 'Ready to sync';
      case 'pending':
        return 'Preparing to sync...';
      case 'running':
        return 'Syncing...';
      case 'completed':
        return 'Sync complete';
      case 'failed':
        return 'Sync failed';
      case 'cancelled':
        return 'Sync cancelled';
      default:
        return status.status;
    }
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'idle':
        return '○';
      case 'pending':
      case 'running':
        return '●';
      case 'completed':
        return '✓';
      case 'failed':
        return '✕';
      case 'cancelled':
        return '○';
      default:
        return '○';
    }
  };

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return '0 B';
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const calculateProgress = () => {
    if (status.files_total && status.files_total > 0) {
      return ((status.files_processed || 0) / status.files_total) * 100;
    }
    if (status.bytes_total && status.bytes_total > 0) {
      return ((status.bytes_processed || 0) / status.bytes_total) * 100;
    }
    return 0;
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isActive = status.status === 'running' || status.status === 'pending';
  const progress = calculateProgress();

  return (
    <div className={`sync-status sync-status-${status.status}`}>
      <div className="sync-status-header">
        <div className="sync-status-indicator">
          <span className={`status-icon ${isActive ? 'pulsing' : ''}`}>
            {getStatusIcon()}
          </span>
          <span className="status-label">{getStatusLabel()}</span>
        </div>
        {status.started_at && (
          <span className="sync-start-time">Started at {formatTime(status.started_at)}</span>
        )}
      </div>

      {isActive && (
        <>
          <div className="sync-progress-bar">
            <div
              className="sync-progress-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="sync-stats">
            {status.files_total !== undefined && status.files_total > 0 && (
              <div className="sync-stat">
                <span className="stat-value">
                  {status.files_processed || 0} / {status.files_total}
                </span>
                <span className="stat-label">files</span>
              </div>
            )}
            {status.bytes_total !== undefined && status.bytes_total > 0 && (
              <div className="sync-stat">
                <span className="stat-value">
                  {formatBytes(status.bytes_processed)} / {formatBytes(status.bytes_total)}
                </span>
                <span className="stat-label">transferred</span>
              </div>
            )}
            {status.estimated_completion && (
              <div className="sync-stat">
                <span className="stat-value">
                  ~{formatTime(status.estimated_completion)}
                </span>
                <span className="stat-label">est. completion</span>
              </div>
            )}
          </div>
        </>
      )}

      {status.status === 'failed' && status.error_message && (
        <div className="sync-error">
          <span className="error-icon">!</span>
          <span className="error-message">{status.error_message}</span>
        </div>
      )}
    </div>
  );
}
