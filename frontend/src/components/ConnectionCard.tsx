import { type FinancialConnection } from '../stores/financial';
import './ConnectionCard.css';

interface ConnectionCardProps {
  connection: FinancialConnection;
  onRefresh?: (id: string) => void;
  onDisconnect?: (id: string) => void;
  isRefreshing?: boolean;
}

export function ConnectionCard({
  connection,
  onRefresh,
  onDisconnect,
  isRefreshing = false,
}: ConnectionCardProps) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'pending':
        return 'status-pending';
      case 'error':
        return 'status-error';
      case 'disconnected':
        return 'status-disconnected';
      case 'expired':
        return 'status-expired';
      default:
        return '';
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'plaid':
        return 'Plaid';
      case 'mx':
        return 'MX';
      case 'finicity':
        return 'Finicity';
      case 'yodlee':
        return 'Yodlee';
      case 'manual':
        return 'Manual';
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

  const needsAttention = connection.status === 'error' || connection.status === 'expired';

  return (
    <div className={`connection-card ${needsAttention ? 'needs-attention' : ''}`}>
      <div className="connection-card-header">
        <div className="connection-card-institution">
          {connection.institution_logo ? (
            <img
              src={connection.institution_logo}
              alt={connection.institution_name || 'Bank'}
              className="institution-logo"
            />
          ) : (
            <div className="institution-logo-placeholder">
              {(connection.institution_name || 'Bank').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="institution-info">
            <h3 className="institution-name">
              {connection.institution_name || 'Unknown Institution'}
            </h3>
            <span className="provider-badge">{getProviderLabel(connection.provider)}</span>
          </div>
        </div>
        <span className={`connection-status ${getStatusClass(connection.status)}`}>
          {connection.status}
        </span>
      </div>

      {connection.error_message && (
        <div className="connection-error">
          <span className="error-icon">!</span>
          <span className="error-message">{connection.error_message}</span>
        </div>
      )}

      <div className="connection-card-details">
        <div className="connection-detail-item">
          <span className="connection-detail-label">Last Synced</span>
          <span className="connection-detail-value">
            {formatDate(connection.last_sync_at)}
          </span>
        </div>
        {connection.consent_expires_at && (
          <div className="connection-detail-item">
            <span className="connection-detail-label">Consent Expires</span>
            <span className="connection-detail-value">
              {formatDate(connection.consent_expires_at)}
            </span>
          </div>
        )}
      </div>

      <div className="connection-card-actions">
        {onRefresh && (
          <button
            onClick={() => onRefresh(connection.id)}
            className="connection-action-button refresh-button"
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
        {onDisconnect && (
          <button
            onClick={() => onDisconnect(connection.id)}
            className="connection-action-button disconnect-button"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
