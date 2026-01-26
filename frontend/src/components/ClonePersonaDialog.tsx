import { useState, useRef, useMemo, useCallback } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import type { Persona } from '../stores/personas';
import './ClonePersonaDialog.css';

export interface ClonePersonaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { name: string; is_public: boolean }) => void;
  persona: Persona | null;
  isLoading?: boolean;
}

export function ClonePersonaDialog({
  isOpen,
  onClose,
  onConfirm,
  persona,
  isLoading = false,
}: ClonePersonaDialogProps) {
  // Use separate state for user modifications
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [isPublicInput, setIsPublicInput] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute the effective name (user input or default)
  const defaultName = useMemo(() => {
    return persona ? `Copy of ${persona.name}` : '';
  }, [persona]);

  const name = nameInput ?? defaultName;
  const isPublic = isPublicInput ?? false;

  // Reset form state when dialog closes
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
    // Reset inputs after successful submit
    setNameInput(null);
    setIsPublicInput(null);
    setError(null);
  };

  if (!persona) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Clone Persona"
      description={`Create a copy of "${persona.name}" with your own customizations.`}
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
            Clone Persona
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="clone-persona-form">
        <div className="clone-form-group">
          <label htmlFor="clone-name" className="clone-form-label">
            New Persona Name
          </label>
          <input
            ref={inputRef}
            type="text"
            id="clone-name"
            value={name}
            onChange={(e) => {
              setNameInput(e.target.value);
              setError(null);
            }}
            className="clone-form-input"
            placeholder="Enter a name for your clone"
            maxLength={100}
            disabled={isLoading}
          />
          {error && <p className="clone-form-error">{error}</p>}
        </div>

        <div className="clone-form-group clone-form-checkbox">
          <input
            type="checkbox"
            id="clone-public"
            checked={isPublic}
            onChange={(e) => setIsPublicInput(e.target.checked)}
            className="clone-checkbox-input"
            disabled={isLoading}
          />
          <label htmlFor="clone-public" className="clone-checkbox-label">
            Make this clone public
          </label>
        </div>
        <p className="clone-form-help">
          Public clones can be discovered and cloned by other users.
        </p>

        <div className="clone-lineage-info">
          <span className="clone-lineage-label">Based on:</span>
          <span className="clone-lineage-value">{persona.name}</span>
        </div>
      </form>
    </Modal>
  );
}

ClonePersonaDialog.displayName = 'ClonePersonaDialog';
