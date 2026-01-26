/**
 * AddAnnotationModal Component
 *
 * A modal dialog for adding a new annotation to a block.
 */

import {
  useState,
  useCallback,
  useRef,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './AddAnnotationModal.css';

interface AddAnnotationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Called when saving the annotation */
  onSave: (text: string) => void;
  /** Preview text from the block (first few characters) */
  blockPreview?: string;
}

export function AddAnnotationModal({
  isOpen,
  onClose,
  onSave,
  blockPreview,
}: AddAnnotationModalProps) {
  const [text, setText] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use focus trap
  useFocusTrap(modalRef, {
    isActive: isOpen,
    onEscape: onClose,
    initialFocusRef: textareaRef,
    autoFocus: true,
  });

  // Handle save
  const handleSave = useCallback(() => {
    if (text.trim()) {
      onSave(text.trim());
      setText('');
    }
  }, [text, onSave]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="add-annotation-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="add-annotation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-annotation-title"
        tabIndex={-1}
      >
        <div className="add-annotation-header">
          <h2 id="add-annotation-title" className="add-annotation-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M12 18v-6M9 15h6" />
            </svg>
            Add Note
          </h2>
          <button
            type="button"
            className="add-annotation-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="currentColor"
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>

        {blockPreview && (
          <div className="add-annotation-preview">
            <span className="add-annotation-preview-label">For paragraph:</span>
            <span className="add-annotation-preview-text">{blockPreview}</span>
          </div>
        )}

        <div className="add-annotation-body">
          <textarea
            ref={textareaRef}
            className="add-annotation-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your private note here..."
            rows={4}
          />
          <p className="add-annotation-hint">
            Press <kbd>⌘</kbd>+<kbd>Enter</kbd> to save
          </p>
        </div>

        <div className="add-annotation-footer">
          <button
            type="button"
            className="add-annotation-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="add-annotation-save"
            onClick={handleSave}
            disabled={!text.trim()}
          >
            Add Note
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

AddAnnotationModal.displayName = 'AddAnnotationModal';
