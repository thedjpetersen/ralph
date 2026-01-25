import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAccountStore } from '../stores/account';
import {
  googleDriveConnectionsApi,
  type GoogleDriveConnection,
  type GoogleDriveConnectionStatus,
} from '../api/client';
import { PageTransition } from '../components/PageTransition';
import { AccountsListSkeleton } from '../components/skeletons';
import './Integrations.css';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
  settingsPath: string;
  connections?: GoogleDriveConnection[];
}

export function Integrations() {
  const { currentAccount } = useAccountStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleDriveConnections, setGoogleDriveConnections] = useState<GoogleDriveConnection[]>([]);

  const fetchIntegrations = useCallback(async () => {
    if (!currentAccount?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await googleDriveConnectionsApi.list(currentAccount.id);
      setGoogleDriveConnections(response.connections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch integrations');
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount?.id]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const getGoogleDriveStatus = (): 'connected' | 'disconnected' | 'error' => {
    if (googleDriveConnections.length === 0) return 'disconnected';
    const hasError = googleDriveConnections.some(
      (c) => c.status === 'error' || c.status === 'expired'
    );
    if (hasError) return 'error';
    const hasActive = googleDriveConnections.some((c) => c.status === 'active');
    return hasActive ? 'connected' : 'disconnected';
  };

  const getStatusLabel = (status: GoogleDriveConnectionStatus) => {
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

  const integrations: Integration[] = [
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Sync receipts and documents from Google Drive folders',
      icon: 'GD',
      status: getGoogleDriveStatus(),
      settingsPath: '/integrations/google-drive',
      connections: googleDriveConnections,
    },
  ];

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="integrations-page">
          <div className="integrations-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to view integrations.</p>
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
        <div className="integrations-page">
          <div className="integrations-header">
            <h1>Integrations</h1>
            <p className="integrations-subtitle">Connect external services to sync your data</p>
          </div>
          <AccountsListSkeleton count={2} />
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="integrations-page">
          <div className="integrations-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={fetchIntegrations} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="integrations-page">
        <div className="integrations-header">
          <h1>Integrations</h1>
          <p className="integrations-subtitle">Connect external services to sync your data</p>
        </div>

        <div className="integrations-grid">
          {integrations.map((integration) => (
            <div key={integration.id} className="integration-card">
              <div className="integration-card-header">
                <div className="integration-icon">{integration.icon}</div>
                <div className="integration-info">
                  <h3 className="integration-name">{integration.name}</h3>
                  <p className="integration-description">{integration.description}</p>
                </div>
                <span className={`integration-status status-${integration.status}`}>
                  {integration.status === 'connected'
                    ? 'Connected'
                    : integration.status === 'error'
                      ? 'Needs Attention'
                      : 'Not Connected'}
                </span>
              </div>

              {integration.connections && integration.connections.length > 0 && (
                <div className="integration-connections">
                  <h4 className="connections-title">Connected Accounts</h4>
                  <ul className="connections-list">
                    {integration.connections.slice(0, 3).map((connection) => (
                      <li key={connection.id} className="connection-item">
                        <span className="connection-email">{connection.email}</span>
                        <span className={`connection-status status-${connection.status}`}>
                          {getStatusLabel(connection.status)}
                        </span>
                      </li>
                    ))}
                    {integration.connections.length > 3 && (
                      <li className="connection-item more-connections">
                        +{integration.connections.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="integration-card-actions">
                <Link to={integration.settingsPath} className="integration-settings-button">
                  {integration.status === 'disconnected' ? 'Connect' : 'Manage'}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="integrations-info">
          <h3>Coming Soon</h3>
          <p>
            We're working on additional integrations including Dropbox, OneDrive, and email
            receipt parsing. Stay tuned for updates!
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
