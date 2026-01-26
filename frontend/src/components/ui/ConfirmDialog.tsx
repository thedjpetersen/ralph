import { useRef, type ReactNode } from 'react';
import { Modal, type ModalSize } from './Modal';
import { Button } from './Button';
import './ConfirmDialog.css';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  size?: ModalSize;
  isLoading?: boolean;
  children?: ReactNode;
}

/**
 * A reusable confirmation dialog component for destructive or important actions.
 *
 * Features:
 * - Cancel button is auto-focused (default selection)
 * - Danger variant styles the confirm button in red
 * - Loading state for async operations
 * - Clear description of consequences
 *
 * Usage:
 * ```tsx
 * <ConfirmDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Document"
 *   description="This action cannot be undone."
 *   confirmLabel="Delete"
 *   variant="danger"
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  size = 'sm',
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  // Reference to the cancel button for initial focus
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const getConfirmButtonVariant = () => {
    switch (variant) {
      case 'danger':
        return 'danger';
      case 'warning':
        return 'primary';
      case 'info':
        return 'primary';
      default:
        return 'danger';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      initialFocus={cancelButtonRef}
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={
        <div className="confirm-dialog-actions">
          <Button
            ref={cancelButtonRef}
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={getConfirmButtonVariant()}
            onClick={onConfirm}
            loading={isLoading}
            disabled={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {children && (
        <div className={`confirm-dialog-content confirm-dialog-${variant}`}>
          {children}
        </div>
      )}
    </Modal>
  );
}

ConfirmDialog.displayName = 'ConfirmDialog';
