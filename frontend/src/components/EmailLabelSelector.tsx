import { useState, useCallback } from 'react';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import {
  emailLabelsApi,
  type EmailLabel,
  type EmailConnection,
} from '../api/client';
import './EmailLabelSelector.css';

interface EmailLabelSelectorProps {
  labels: EmailLabel[];
  connections: EmailConnection[];
  onToggle: (labelId: string, enabled: boolean) => void;
  onRemove: (labelId: string) => void;
  onLabelAdded?: () => void;
}

export function EmailLabelSelector({
  labels,
  connections,
  onToggle,
  onRemove,
  onLabelAdded,
}: EmailLabelSelectorProps) {
  const { currentAccount } = useAccountStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [isFetching, setIsFetching] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<Array<{
    provider_label_id: string;
    name: string;
    type: 'system' | 'user';
  }>>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'syncing':
        return 'Syncing';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  const handleFetchLabels = useCallback(async () => {
    if (!currentAccount?.id || !selectedConnection) {
      toast.error('Please select a connection');
      return;
    }

    setIsFetching(true);
    setAvailableLabels([]);
    setSelectedLabels([]);

    try {
      const response = await emailLabelsApi.fetchFromProvider(currentAccount.id, selectedConnection);
      // Filter out labels that are already added
      const existingLabelIds = new Set(labels.map(l => l.provider_label_id));
      const newLabels = response.labels.filter(l => !existingLabelIds.has(l.provider_label_id));
      setAvailableLabels(newLabels.map(l => ({
        provider_label_id: l.provider_label_id,
        name: l.name,
        type: l.type,
      })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch labels');
    } finally {
      setIsFetching(false);
    }
  }, [currentAccount?.id, selectedConnection, labels]);

  const handleLabelSelect = useCallback((providerId: string) => {
    setSelectedLabels(prev =>
      prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    );
  }, []);

  const handleAddLabels = useCallback(async () => {
    if (!currentAccount?.id || !selectedConnection || selectedLabels.length === 0) {
      toast.error('Please select at least one label');
      return;
    }

    setIsFetching(true);

    try {
      await Promise.all(
        selectedLabels.map(providerId => {
          const label = availableLabels.find(l => l.provider_label_id === providerId);
          if (!label) return Promise.resolve();

          return emailLabelsApi.create(currentAccount.id, {
            connection_id: selectedConnection,
            provider_label_id: providerId,
            name: label.name,
            type: label.type,
            sync_enabled: true,
          });
        })
      );

      toast.success(`${selectedLabels.length} label(s) added successfully`);
      setShowAddModal(false);
      setSelectedConnection('');
      setAvailableLabels([]);
      setSelectedLabels([]);
      onLabelAdded?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add labels');
    } finally {
      setIsFetching(false);
    }
  }, [currentAccount?.id, selectedConnection, selectedLabels, availableLabels, onLabelAdded]);

  const getConnectionEmail = (connectionId: string) => {
    const connection = connections.find((c) => c.id === connectionId);
    return connection?.email || 'Unknown';
  };

  const getTypeLabel = (type: 'system' | 'user') => {
    return type === 'system' ? 'System' : 'User';
  };

  return (
    <div className="email-label-selector">
      {labels.length > 0 ? (
        <div className="labels-list">
          {labels.map((label) => (
            <div key={label.id} className={`label-item ${label.status === 'error' ? 'has-error' : ''}`}>
              <div className="label-info">
                <div className="label-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z" />
                  </svg>
                </div>
                <div className="label-details">
                  <h4 className="label-name">{label.name}</h4>
                  <p className="label-meta">
                    {getTypeLabel(label.type)} • {getConnectionEmail(label.connection_id)}
                  </p>
                </div>
              </div>

              <div className="label-stats">
                <span className={`label-status status-${label.status}`}>
                  {getStatusLabel(label.status)}
                </span>
                {label.message_count !== undefined && (
                  <span className="label-message-count">{label.message_count} messages</span>
                )}
                <span className="label-last-sync">Last sync: {formatDate(label.last_sync_at)}</span>
              </div>

              {label.error_message && (
                <div className="label-error">
                  <span className="error-icon">!</span>
                  <span className="error-message">{label.error_message}</span>
                </div>
              )}

              <div className="label-actions">
                <label className="sync-toggle">
                  <input
                    type="checkbox"
                    checked={label.sync_enabled}
                    onChange={(e) => onToggle(label.id, e.target.checked)}
                  />
                  <span className="toggle-slider" />
                  <span className="toggle-label">Sync enabled</span>
                </label>
                <button onClick={() => onRemove(label.id)} className="remove-label-button">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-labels">
          <div className="no-labels-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.5">
              <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z" />
            </svg>
          </div>
          <h3>No Labels Selected</h3>
          <p>Add labels from your email account to sync messages containing receipts.</p>
        </div>
      )}

      <button onClick={() => setShowAddModal(true)} className="add-label-button">
        <span className="plus-icon">+</span>
        Add Label
      </button>

      {showAddModal && (
        <div className="add-label-overlay" onClick={() => setShowAddModal(false)}>
          <div className="add-label-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Labels</h3>
            <p className="modal-description">
              Select an email account and fetch available labels to sync.
            </p>

            <div className="form-group">
              <label htmlFor="connection-select">Email Account</label>
              <select
                id="connection-select"
                value={selectedConnection}
                onChange={(e) => {
                  setSelectedConnection(e.target.value);
                  setAvailableLabels([]);
                  setSelectedLabels([]);
                }}
                className="form-select"
              >
                <option value="">Select an account</option>
                {connections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.email}
                  </option>
                ))}
              </select>
            </div>

            {selectedConnection && availableLabels.length === 0 && !isFetching && (
              <button
                onClick={handleFetchLabels}
                className="fetch-labels-button"
                disabled={isFetching}
              >
                {isFetching ? 'Fetching...' : 'Fetch Available Labels'}
              </button>
            )}

            {availableLabels.length > 0 && (
              <div className="available-labels">
                <label className="form-label">Select Labels to Add</label>
                <div className="labels-checkbox-list">
                  {availableLabels.map((label) => (
                    <label key={label.provider_label_id} className="label-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedLabels.includes(label.provider_label_id)}
                        onChange={() => handleLabelSelect(label.provider_label_id)}
                      />
                      <span className="checkbox-marker" />
                      <span className="label-checkbox-name">{label.name}</span>
                      <span className="label-checkbox-type">{getTypeLabel(label.type)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setShowAddModal(false)} className="cancel-button">
                Cancel
              </button>
              <button
                onClick={handleAddLabels}
                disabled={isFetching || selectedLabels.length === 0}
                className="add-button"
              >
                {isFetching ? 'Adding...' : `Add ${selectedLabels.length} Label(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
