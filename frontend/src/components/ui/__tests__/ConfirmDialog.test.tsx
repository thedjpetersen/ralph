import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  let originalOverflow: string;

  beforeEach(() => {
    originalOverflow = document.body.style.overflow;
  });

  afterEach(() => {
    document.body.style.overflow = originalOverflow;
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Confirm Action"
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <ConfirmDialog
          isOpen={false}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Confirm Action"
        />
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders title', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete Item"
        />
      );
      expect(screen.getByText('Delete Item')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete Item"
          description="This action cannot be undone."
        />
      );
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete Item"
        >
          <p>Additional information</p>
        </ConfirmDialog>
      );
      expect(screen.getByText('Additional information')).toBeInTheDocument();
    });
  });

  describe('Button Labels', () => {
    it('renders default button labels', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Confirm"
        />
      );
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('renders custom button labels', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete"
          confirmLabel="Delete Forever"
          cancelLabel="Keep It"
        />
      );
      expect(screen.getByRole('button', { name: 'Keep It' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete Forever' })).toBeInTheDocument();
    });
  });

  describe('Button Actions', () => {
    it('calls onClose when cancel button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={handleClose}
          onConfirm={() => {}}
          title="Confirm"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when confirm button is clicked', () => {
      const handleConfirm = vi.fn();
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={handleConfirm}
          title="Confirm"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Variants', () => {
    it('applies danger variant to confirm button by default', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete"
        />
      );
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('btn-danger');
    });

    it('applies danger variant when specified', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete"
          variant="danger"
        />
      );
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('btn-danger');
    });

    it('applies primary variant for warning', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Warning"
          variant="warning"
        />
      );
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('btn-primary');
    });

    it('applies primary variant for info', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Info"
          variant="info"
        />
      );
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('btn-primary');
    });
  });

  describe('Loading State', () => {
    it('shows loading state on confirm button', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete"
          isLoading={true}
        />
      );
      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('btn-loading');
      expect(confirmButton).toBeDisabled();
    });

    it('disables cancel button when loading', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete"
          isLoading={true}
        />
      );
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeDisabled();
    });

    it('prevents overlay click when loading', () => {
      const handleClose = vi.fn();
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={handleClose}
          onConfirm={() => {}}
          title="Delete"
          isLoading={true}
        />
      );
      const overlay = document.querySelector('.modal-overlay');
      fireEvent.click(overlay!);
      // Should not close when loading
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('focuses cancel button by default (cancel is default selection)', async () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Confirm"
        />
      );
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
      });
    });
  });

  describe('Sizes', () => {
    it('uses small size by default', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Confirm"
        />
      );
      expect(screen.getByRole('dialog')).toHaveClass('modal-sm');
    });

    it('applies custom size', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Confirm"
          size="md"
        />
      );
      expect(screen.getByRole('dialog')).toHaveClass('modal-md');
    });
  });

  describe('Accessibility', () => {
    it('has dialog role', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Confirm"
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Confirm"
        />
      );
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete Item"
        />
      );
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('has aria-describedby when description is provided', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Delete"
          description="Are you sure?"
        />
      );
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'modal-description');
    });
  });
});
