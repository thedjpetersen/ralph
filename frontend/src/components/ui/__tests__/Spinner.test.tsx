import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '../Spinner';

describe('Spinner', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Spinner className="custom-class" />);
      expect(screen.getByRole('status')).toHaveClass('custom-class');
    });

    it('renders SVG ring spinner by default', () => {
      render(<Spinner />);
      expect(screen.getByRole('status').querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('applies medium size by default', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toHaveClass('spinner-md');
    });

    it('applies xs size', () => {
      render(<Spinner size="xs" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-xs');
    });

    it('applies sm size', () => {
      render(<Spinner size="sm" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-sm');
    });

    it('applies lg size', () => {
      render(<Spinner size="lg" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-lg');
    });

    it('applies xl size', () => {
      render(<Spinner size="xl" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-xl');
    });
  });

  describe('Variants', () => {
    it('applies default variant by default', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toHaveClass('spinner-default');
    });

    it('applies primary variant', () => {
      render(<Spinner variant="primary" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-primary');
    });

    it('applies secondary variant', () => {
      render(<Spinner variant="secondary" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-secondary');
    });

    it('applies white variant', () => {
      render(<Spinner variant="white" />);
      expect(screen.getByRole('status')).toHaveClass('spinner-white');
    });
  });

  describe('Stripe Animation', () => {
    it('does not apply stripe class by default', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).not.toHaveClass('spinner-stripe');
    });

    it('applies stripe class when stripe is true', () => {
      render(<Spinner stripe />);
      expect(screen.getByRole('status')).toHaveClass('spinner-stripe');
    });

    it('renders stripe bars when stripe is true', () => {
      render(<Spinner stripe />);
      const container = screen.getByRole('status').querySelector('.spinner-stripe-container');
      expect(container).toBeInTheDocument();
      expect(container?.querySelectorAll('.spinner-stripe-bar')).toHaveLength(3);
    });

    it('does not render SVG when stripe is true', () => {
      render(<Spinner stripe />);
      expect(screen.getByRole('status').querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has status role', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has default aria-label', () => {
      render(<Spinner />);
      expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    });

    it('accepts custom aria-label via label prop', () => {
      render(<Spinner label="Please wait" />);
      expect(screen.getByLabelText('Please wait')).toBeInTheDocument();
    });

    it('has screen reader text', () => {
      render(<Spinner label="Loading data" />);
      expect(screen.getByText('Loading data')).toBeInTheDocument();
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to div element', () => {
      const ref = vi.fn();
      render(<Spinner ref={ref} />);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Additional HTML Attributes', () => {
    it('passes through data attributes', () => {
      render(<Spinner data-testid="custom-spinner" />);
      expect(screen.getByTestId('custom-spinner')).toBeInTheDocument();
    });

    it('passes through id attribute', () => {
      render(<Spinner id="my-spinner" />);
      expect(document.getElementById('my-spinner')).toBeInTheDocument();
    });
  });
});
