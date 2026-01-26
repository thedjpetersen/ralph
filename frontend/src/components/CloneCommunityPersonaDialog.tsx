import { useState, useRef, useMemo, useCallback } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import type { Persona } from '../stores/personas';
import './ClonePersonaDialog.css';

export interface CloneCommunityPersonaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { name: string; is_public: boolean }) => void;
  persona: Persona | null;
  isLoading?: boolean;
}

export function CloneCommunityPersonaDialog({
  isOpen,
  onClose,
  onConfirm,
  persona,
  isLoading = false,
}: CloneCommunityPersonaDialogProps) {
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [isPublicInput, setIsPublicInput] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultName = useMemo(() => {
    return persona ? persona.name : '';
  }, [persona]);

  const name = nameInput ?? defaultName;
  const isPublic = isPublicInput ?? false;

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setNameInput(null);
      setIsPublicInput(null);
      setError(null);
      onClose();
    }
  }, [isLoading, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    onConfirm({ name: name.trim(), is_public: isPublic });
    setNameInput(null);
    setIsPublicInput(null);
    setError(null);
  };

  if (!persona) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add to My Authors"
      description={`Add "${persona.name}" by ${persona.creator_name || 'Anonymous'} to your collection.`}
      size="sm"
      initialFocus={inputRef}
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={
        <div className="clone-dialog-actions">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
          >
            Add Author
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="clone-persona-form">
        <div className="clone-form-group">
          <label htmlFor="clone-community-name" className="clone-form-label">
            Author Name
          </label>
          <input
            ref={inputRef}
            type="text"
            id="clone-community-name"
            value={name}
            onChange={(e) => {
              setNameInput(e.target.value);
              setError(null);
            }}
            className="clone-form-input"
            placeholder="Enter a name for your copy"
            maxLength={100}
            disabled={isLoading}
          />
          {error && <p className="clone-form-error">{error}</p>}
          <p className="clone-form-help">
            You can rename this author or keep the original name.
          </p>
        </div>

        <div className="clone-form-group clone-form-checkbox">
          <input
            type="checkbox"
            id="clone-community-public"
            checked={isPublic}
            onChange={(e) => setIsPublicInput(e.target.checked)}
            className="clone-checkbox-input"
            disabled={isLoading}
          />
          <label htmlFor="clone-community-public" className="clone-checkbox-label">
            Share my copy publicly
          </label>
        </div>
        <p className="clone-form-help">
          If checked, others can discover and add your customized version.
        </p>

        <div className="clone-community-info">
          <div className="clone-community-creator">
            {persona.creator_avatar_url ? (
              <img
                src={persona.creator_avatar_url}
                alt={persona.creator_name || 'Creator'}
                className="clone-creator-avatar"
              />
            ) : (
              <span className="clone-creator-avatar-placeholder">
                {(persona.creator_name || 'U').charAt(0).toUpperCase()}
              </span>
            )}
            <div className="clone-creator-details">
              <span className="clone-creator-label">Created by</span>
              <span className="clone-creator-name">{persona.creator_name || 'Anonymous'}</span>
            </div>
          </div>
          <div className="clone-community-stats">
            <span className="clone-stat">
              <strong>{persona.clone_count || 0}</strong> clones
            </span>
            <span className="clone-stat">
              <strong>{persona.use_count || 0}</strong> uses
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}

CloneCommunityPersonaDialog.displayName = 'CloneCommunityPersonaDialog';
