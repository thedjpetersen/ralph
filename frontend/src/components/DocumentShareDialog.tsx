/**
 * Document Share Dialog
 *
 * Modal dialog for generating and managing shareable links for documents.
 */

import { useCallback, useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import {
  useDocumentShareStore,
  type SharePermission,
  type DocumentShare,
} from '../stores/documentShare';
import './DocumentShareDialog.css';

// Icons
const LinkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M8.5 11.5a4 4 0 005.66 0l2-2a4 4 0 00-5.66-5.66l-1 1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.5 8.5a4 4 0 00-5.66 0l-2 2a4 4 0 005.66 5.66l1-1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect
      x="5.5"
      y="5.5"
      width="8"
      height="8"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path
      d="M3 10.5V3.5A1.5 1.5 0 014.5 2h7"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3 8l3.5 3.5L13 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M10 4C5 4 1.73 8.11 1 10c.73 1.89 4 6 9 6s8.27-4.11 9-6c-.73-1.89-4-6-9-6z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="10"
      cy="10"
      r="3"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const CommentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M4 4h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 3V6a2 2 0 012-2z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 8h8M6 11h5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PERMISSION_OPTIONS: Array<{
  value: SharePermission;
  label: string;
  description: string;
  icon: React.ComponentType;
}> = [
  {
    value: 'view',
    label: 'View only',
    description: 'Recipients can only read the document',
    icon: EyeIcon,
  },
  {
    value: 'comment',
    label: 'Can comment',
    description: 'Recipients can read and add comments',
    icon: CommentIcon,
  },
];

// Share Link Item Component
interface ShareLinkItemProps {
  share: DocumentShare;
  onCopy: (link: string) => void;
  onRevoke: (shareId: string) => void;
}

function ShareLinkItem({ share, onCopy, onRevoke }: ShareLinkItemProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    onCopy(share.shareLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [share.shareLink, onCopy]);

  const permissionLabel = share.permission === 'view' ? 'View only' : 'Can comment';
  const createdDate = new Date(share.createdAt).toLocaleDateString();

  return (
    <div className="share-link-item">
      <div className="share-link-info">
        <div className="share-link-url">
          <LinkIcon />
          <span className="share-link-text">{share.shareLink}</span>
        </div>
        <div className="share-link-meta">
          <span className="share-link-permission">{permissionLabel}</span>
          <span className="share-link-separator">·</span>
          <span className="share-link-date">Created {createdDate}</span>
        </div>
      </div>
      <div className="share-link-actions">
        <button
          type="button"
          className={`share-link-copy-btn ${isCopied ? 'copied' : ''}`}
          onClick={handleCopy}
          title={isCopied ? 'Copied!' : 'Copy link'}
          aria-label={isCopied ? 'Link copied' : 'Copy link'}
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <button
          type="button"
          className="share-link-revoke-btn"
          onClick={() => onRevoke(share.id)}
          title="Revoke access"
          aria-label="Revoke share link"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

export function DocumentShareDialog() {
  const {
    isOpen,
    currentDocumentId,
    currentDocumentName,
    selectedPermission,
    isGenerating,
    error,
    closeShareDialog,
    setSelectedPermission,
    generateShareLink,
    revokeShare,
    copyShareLink,
    getSharesForDocument,
    clearError,
  } = useDocumentShareStore();

  const [recentlyGeneratedLink, setRecentlyGeneratedLink] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);

  // Get existing shares for this document
  const existingShares = currentDocumentId
    ? getSharesForDocument(currentDocumentId)
    : [];

  const handleGenerateLink = useCallback(async () => {
    clearError();
    const link = await generateShareLink();
    if (link) {
      setRecentlyGeneratedLink(link);
    }
  }, [clearError, generateShareLink]);

  const handleCopyRecentLink = useCallback(async () => {
    if (recentlyGeneratedLink) {
      const success = await copyShareLink(recentlyGeneratedLink);
      if (success) {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      }
    }
  }, [recentlyGeneratedLink, copyShareLink]);

  const handlePermissionSelect = useCallback(
    (permission: SharePermission) => {
      setSelectedPermission(permission);
      setRecentlyGeneratedLink(null); // Reset generated link when permission changes
    },
    [setSelectedPermission]
  );

  const handleClose = useCallback(() => {
    closeShareDialog();
    setRecentlyGeneratedLink(null);
    setShowCopied(false);
  }, [closeShareDialog]);

  if (!isOpen || !currentDocumentName) {
    return null;
  }

  const footer = (
    <Button variant="secondary" onClick={handleClose}>
      Done
    </Button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Share Document"
      size="md"
      footer={footer}
    >
      <div className="share-dialog">
        {/* Document Info */}
        <div className="share-document-info">
          <h3 className="share-document-title">{currentDocumentName}</h3>
          <p className="share-document-description">
            Create a shareable link for read-only access to this document.
          </p>
        </div>

        {/* Permission Selection */}
        <fieldset className="share-permission-fieldset">
          <legend className="share-section-label">Access Level</legend>
          <div className="share-permission-options" role="radiogroup" aria-label="Select access level">
            {PERMISSION_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedPermission === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`share-permission-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handlePermissionSelect(option.value)}
                  role="radio"
                  aria-checked={isSelected}
                >
                  <span className="share-permission-icon">
                    <Icon />
                  </span>
                  <span className="share-permission-content">
                    <span className="share-permission-label">{option.label}</span>
                    <span className="share-permission-description">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Generate Link Button */}
        <div className="share-generate-section">
          {recentlyGeneratedLink ? (
            <div className="share-generated-link">
              <div className="share-generated-link-content">
                <LinkIcon />
                <input
                  type="text"
                  readOnly
                  value={recentlyGeneratedLink}
                  className="share-generated-link-input"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>
              <Button
                variant="primary"
                onClick={handleCopyRecentLink}
                className="share-copy-btn"
              >
                {showCopied ? (
                  <>
                    <CheckIcon /> Copied
                  </>
                ) : (
                  <>
                    <CopyIcon /> Copy Link
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={handleGenerateLink}
              loading={isGenerating}
              className="share-generate-btn"
            >
              <LinkIcon /> Generate Share Link
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="share-error" role="alert">
            <span className="share-error-icon" aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Existing Share Links */}
        {existingShares.length > 0 && (
          <div className="share-existing-section">
            <h4 className="share-section-label">Active Links</h4>
            <div className="share-existing-list">
              {existingShares.map((share) => (
                <ShareLinkItem
                  key={share.id}
                  share={share}
                  onCopy={copyShareLink}
                  onRevoke={revokeShare}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

DocumentShareDialog.displayName = 'DocumentShareDialog';
