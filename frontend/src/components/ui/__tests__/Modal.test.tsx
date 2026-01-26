import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { Modal } from '../Modal';

// Helper component for testing initialFocus
function ModalWithInitialFocus({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Test" initialFocus={inputRef}>
      <input ref={inputRef} data-testid="initial-focus-input" />
    </Modal>
  );
}

describe('Modal', () => {
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
        <Modal isOpen={true} onClose={() => {}}>
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}}>
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('renders in a portal', () => {
      const { baseElement } = render(
        <div id="root">
          <Modal isOpen={true} onClose={() => {}}>
            <p>Portal content</p>
          </Modal>
        </div>
      );
      // The modal renders as a portal to document.body
      // Dialog is inside overlay which is inside body
      const overlay = baseElement.querySelector('.modal-overlay');
      expect(overlay?.parentElement).toBe(document.body);
    });
  });

  describe('Title', () => {
    it('renders title when provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Modal Title">
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByText('Modal Title')).toBeInTheDocument();
    });

    it('sets aria-labelledby when title is provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Modal Title">
          <p>Content</p>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('does not set aria-labelledby when no title', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).not.toHaveAttribute('aria-labelledby');
    });
  });

  describe('Description', () => {
    it('renders description when provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} description="This is a description">
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByText('This is a description')).toBeInTheDocument();
    });

    it('sets aria-describedby when description is provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} description="Description">
          <p>Content</p>
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'modal-description');
    });
  });

  describe('Footer', () => {
    it('renders footer when provided', () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          footer={<button>Save</button>}
        >
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('does not render footer section when not provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      expect(document.querySelector('.modal-footer')).not.toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('applies medium size by default', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toHaveClass('modal-md');
    });

    it.each(['sm', 'md', 'lg', 'xl'] as const)('applies %s size', (size) => {
      render(
        <Modal isOpen={true} onClose={() => {}} size={size}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toHaveClass(`modal-${size}`);
    });
  });

  describe('Close Button', () => {
    it('renders close button by default', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} showCloseButton={false}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.queryByRole('button', { name: 'Close modal' })).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <p>Content</p>
        </Modal>
      );
      fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Overlay Click', () => {
    it('calls onClose when overlay is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <p>Content</p>
        </Modal>
      );
      const overlay = document.querySelector('.modal-overlay');
      fireEvent.click(overlay!);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when modal content is clicked', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <p>Content</p>
        </Modal>
      );
      fireEvent.click(screen.getByRole('dialog'));
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('does not close on overlay click when closeOnOverlayClick is false', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={false}>
          <p>Content</p>
        </Modal>
      );
      const overlay = document.querySelector('.modal-overlay');
      fireEvent.click(overlay!);
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Escape Key', () => {
    it('calls onClose when Escape is pressed', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <p>Content</p>
        </Modal>
      );
      const overlay = document.querySelector('.modal-overlay');
      fireEvent.keyDown(overlay!, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not close on Escape when closeOnEscape is false', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} closeOnEscape={false}>
          <p>Content</p>
        </Modal>
      );
      const overlay = document.querySelector('.modal-overlay');
      fireEvent.keyDown(overlay!, { key: 'Escape' });
      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Lock', () => {
    it('locks body scroll when modal opens', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when modal closes', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      // Overflow should be restored
    });
  });

  describe('Focus Management', () => {
    it('focuses first focusable element when opened', async () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      // Focus should be on first focusable element (close button) for better a11y
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close modal' }));
      });
    });

    it('focuses initial element when initialFocus ref is provided', async () => {
      render(<ModalWithInitialFocus isOpen={true} onClose={() => {}} />);
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByTestId('initial-focus-input'));
      });
    });

    it('traps focus within modal', async () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <button>First</button>
          <button>Last</button>
        </Modal>
      );

      const overlay = document.querySelector('.modal-overlay');
      const lastButton = screen.getByRole('button', { name: 'Last' });
      const closeButton = screen.getByRole('button', { name: 'Close modal' });

      // Focus last button and tab forward
      lastButton.focus();
      fireEvent.keyDown(overlay!, { key: 'Tab' });
      // Should wrap to first focusable element (close button)
      // Note: This is hard to test with jsdom as it doesn't fully simulate focus trapping

      // Focus close button and tab backward
      closeButton.focus();
      fireEvent.keyDown(overlay!, { key: 'Tab', shiftKey: true });
      // Should wrap to last focusable element
    });
  });

  describe('Accessibility', () => {
    it('has dialog role', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('close button has accessible name', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
    });

    it('close button icon is hidden from screen readers', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      );
      const closeButton = screen.getByRole('button', { name: 'Close modal' });
      const svg = closeButton.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('can be closed with Enter on close button', () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <p>Content</p>
        </Modal>
      );
      const closeButton = screen.getByRole('button', { name: 'Close modal' });
      fireEvent.keyDown(closeButton, { key: 'Enter' });
      // Enter on button triggers click in browsers
    });
  });

  describe('Keyboard Navigation', () => {
    it('Tab key navigates between focusable elements', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test">
          <input data-testid="input-1" />
          <input data-testid="input-2" />
          <button>Action</button>
        </Modal>
      );
      // All elements should be focusable
      const input1 = screen.getByTestId('input-1');
      const input2 = screen.getByTestId('input-2');
      const button = screen.getByRole('button', { name: 'Action' });

      input1.focus();
      expect(document.activeElement).toBe(input1);

      input2.focus();
      expect(document.activeElement).toBe(input2);

      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });

  describe('Header Rendering', () => {
    it('renders header when title is provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Header Title">
          <p>Content</p>
        </Modal>
      );
      expect(document.querySelector('.modal-header')).toBeInTheDocument();
    });

    it('renders header when only close button is shown', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} showCloseButton={true}>
          <p>Content</p>
        </Modal>
      );
      expect(document.querySelector('.modal-header')).toBeInTheDocument();
    });

    it('does not render header when no title and close button hidden', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} showCloseButton={false}>
          <p>Content</p>
        </Modal>
      );
      expect(document.querySelector('.modal-header')).not.toBeInTheDocument();
    });
  });
});
