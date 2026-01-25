import { useState, useCallback } from 'react';
import { useAccountStore } from '../stores/account';
import { toast } from '../stores/toast';
import {
  googleDriveFoldersApi,
  type GoogleDriveFolder,
  type GoogleDriveConnection,
} from '../api/client';
import './FolderSelector.css';

interface FolderSelectorProps {
  folders: GoogleDriveFolder[];
  connections: GoogleDriveConnection[];
  onToggle: (folderId: string, enabled: boolean) => void;
  onRemove: (folderId: string) => void;
  onFolderAdded?: () => void;
}

export function FolderSelector({
  folders,
  connections,
  onToggle,
  onRemove,
  onFolderAdded,
}: FolderSelectorProps) {
  const { currentAccount } = useAccountStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [folderId, setFolderId] = useState('');
  const [folderName, setFolderName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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

  const handleAddFolder = useCallback(async () => {
    if (!currentAccount?.id || !selectedConnection || !folderId || !folderName) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsAdding(true);

    try {
      await googleDriveFoldersApi.create(currentAccount.id, {
        connection_id: selectedConnection,
        drive_folder_id: folderId,
        name: folderName,
        sync_enabled: true,
      });

      toast.success('Folder added successfully');
      setShowAddModal(false);
      setSelectedConnection('');
      setFolderId('');
      setFolderName('');
      onFolderAdded?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add folder');
    } finally {
      setIsAdding(false);
    }
  }, [currentAccount?.id, selectedConnection, folderId, folderName, onFolderAdded]);

  const getConnectionEmail = (connectionId: string) => {
    const connection = connections.find((c) => c.id === connectionId);
    return connection?.email || 'Unknown';
  };

  return (
    <div className="folder-selector">
      {folders.length > 0 ? (
        <div className="folders-list">
          {folders.map((folder) => (
            <div key={folder.id} className={`folder-item ${folder.status === 'error' ? 'has-error' : ''}`}>
              <div className="folder-info">
                <div className="folder-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                  </svg>
                </div>
                <div className="folder-details">
                  <h4 className="folder-name">{folder.name}</h4>
                  <p className="folder-path">
                    {folder.path || 'Root'} • {getConnectionEmail(folder.connection_id)}
                  </p>
                </div>
              </div>

              <div className="folder-meta">
                <span className={`folder-status status-${folder.status}`}>
                  {getStatusLabel(folder.status)}
                </span>
                {folder.file_count !== undefined && (
                  <span className="folder-file-count">{folder.file_count} files</span>
                )}
                <span className="folder-last-sync">Last sync: {formatDate(folder.last_sync_at)}</span>
              </div>

              {folder.error_message && (
                <div className="folder-error">
                  <span className="error-icon">!</span>
                  <span className="error-message">{folder.error_message}</span>
                </div>
              )}

              <div className="folder-actions">
                <label className="sync-toggle">
                  <input
                    type="checkbox"
                    checked={folder.sync_enabled}
                    onChange={(e) => onToggle(folder.id, e.target.checked)}
                  />
                  <span className="toggle-slider" />
                  <span className="toggle-label">Sync enabled</span>
                </label>
                <button onClick={() => onRemove(folder.id)} className="remove-folder-button">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-folders">
          <div className="no-folders-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.5">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          </div>
          <h3>No Folders Selected</h3>
          <p>Add folders from your Google Drive to sync receipts and documents.</p>
        </div>
      )}

      <button onClick={() => setShowAddModal(true)} className="add-folder-button">
        <span className="plus-icon">+</span>
        Add Folder
      </button>

      {showAddModal && (
        <div className="add-folder-overlay" onClick={() => setShowAddModal(false)}>
          <div className="add-folder-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Folder</h3>
            <p className="modal-description">
              Enter the Google Drive folder ID to sync. You can find this in the folder's URL.
            </p>

            <div className="form-group">
              <label htmlFor="connection-select">Google Account</label>
              <select
                id="connection-select"
                value={selectedConnection}
                onChange={(e) => setSelectedConnection(e.target.value)}
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

            <div className="form-group">
              <label htmlFor="folder-id">Folder ID</label>
              <input
                id="folder-id"
                type="text"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74"
                className="form-input"
              />
              <p className="form-hint">
                Find this in the URL: drive.google.com/drive/folders/<strong>[folder-id]</strong>
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="folder-name">Display Name</label>
              <input
                id="folder-name"
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g., Receipts 2024"
                className="form-input"
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowAddModal(false)} className="cancel-button">
                Cancel
              </button>
              <button
                onClick={handleAddFolder}
                disabled={isAdding || !selectedConnection || !folderId || !folderName}
                className="add-button"
              >
                {isAdding ? 'Adding...' : 'Add Folder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
