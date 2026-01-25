import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { APIKey } from '../stores/user';
import { useUserStore } from '../stores/user';
import { PageTransition } from '../components/PageTransition';
import { SettingsFormSkeleton } from '../components/skeletons';
import './APIKeys.css';

export function APIKeys() {
  const { apiKeys, isLoading, error, fetchAPIKeys, createAPIKey, deleteAPIKey } =
    useUserStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchAPIKeys();
  }, [fetchAPIKeys]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const result = await createAPIKey(
        newKeyName.trim(),
        newKeyExpiry || undefined
      );
      setCreatedKey(result.key);
      setNewKeyName('');
      setNewKeyExpiry('');
    } catch {
      setCreateError('Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    setIsDeleting(true);
    try {
      await deleteAPIKey(keyId);
      setDeleteConfirm(null);
    } catch {
      // Error is handled by the store
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setCreatedKey(null);
    setNewKeyName('');
    setNewKeyExpiry('');
    setCreateError(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (key: APIKey) => {
    if (!key.expiresAt) return false;
    return new Date(key.expiresAt) < new Date();
  };

  if (isLoading && apiKeys.length === 0) {
    return (
      <PageTransition>
        <div className="api-keys-page">
          <SettingsFormSkeleton />
        </div>
      </PageTransition>
    );
  }

  if (error && apiKeys.length === 0) {
    return (
      <PageTransition>
        <div className="api-keys-page">
          <div className="api-keys-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => fetchAPIKeys()} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="api-keys-page">
        <div className="api-keys-header">
          <Link to="/profile" className="back-link">
            &larr; Back to Profile
          </Link>
          <h1>API Keys</h1>
          <p className="api-keys-subtitle">
            Manage your API keys for programmatic access
          </p>
        </div>

        <div className="api-keys-content">
          <div className="api-keys-actions">
            <button
              className="create-key-button"
              onClick={() => setShowCreateModal(true)}
            >
              Create New API Key
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <div className="no-keys">
              <p>You don't have any API keys yet.</p>
              <p className="no-keys-hint">
                Create an API key to access the ClockZen API programmatically.
              </p>
            </div>
          ) : (
            <div className="api-keys-list">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={`api-key-item ${isExpired(key) ? 'expired' : ''}`}
                >
                  <div className="api-key-info">
                    <div className="api-key-name">{key.name}</div>
                    <div className="api-key-prefix">
                      <code>{key.prefix}...</code>
                    </div>
                    <div className="api-key-meta">
                      <span>Created {formatDate(key.createdAt)}</span>
                      {key.lastUsedAt && (
                        <span>Last used {formatDate(key.lastUsedAt)}</span>
                      )}
                      {key.expiresAt && (
                        <span className={isExpired(key) ? 'expired-text' : ''}>
                          {isExpired(key)
                            ? `Expired ${formatDate(key.expiresAt)}`
                            : `Expires ${formatDate(key.expiresAt)}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="api-key-actions">
                    {deleteConfirm === key.id ? (
                      <div className="delete-confirm">
                        <span>Delete?</span>
                        <button
                          className="confirm-delete"
                          onClick={() => handleDeleteKey(key.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Deleting...' : 'Yes'}
                        </button>
                        <button
                          className="cancel-delete"
                          onClick={() => setDeleteConfirm(null)}
                          disabled={isDeleting}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        className="delete-key-button"
                        onClick={() => setDeleteConfirm(key.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreateModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{createdKey ? 'API Key Created' : 'Create New API Key'}</h2>
                <button className="modal-close" onClick={handleCloseModal}>
                  &times;
                </button>
              </div>
              <div className="modal-body">
                {createdKey ? (
                  <div className="created-key-section">
                    <p className="key-warning">
                      Make sure to copy your API key now. You won't be able to see
                      it again!
                    </p>
                    <div className="created-key-display">
                      <code>{createdKey}</code>
                      <button
                        className="copy-button"
                        onClick={() => copyToClipboard(createdKey)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateKey}>
                    <div className="form-group">
                      <label htmlFor="keyName" className="form-label">
                        Key Name
                      </label>
                      <input
                        type="text"
                        id="keyName"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        className="form-input"
                        placeholder="e.g., Production Server"
                        required
                        maxLength={100}
                      />
                      <p className="form-help">
                        A descriptive name to identify this key.
                      </p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="keyExpiry" className="form-label">
                        Expiration Date (Optional)
                      </label>
                      <input
                        type="date"
                        id="keyExpiry"
                        value={newKeyExpiry}
                        onChange={(e) => setNewKeyExpiry(e.target.value)}
                        className="form-input"
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <p className="form-help">
                        Leave empty for a key that doesn't expire.
                      </p>
                    </div>

                    {createError && (
                      <div className="form-error">{createError}</div>
                    )}

                    <div className="modal-actions">
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={handleCloseModal}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="create-button"
                        disabled={isCreating || !newKeyName.trim()}
                      >
                        {isCreating ? 'Creating...' : 'Create Key'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
