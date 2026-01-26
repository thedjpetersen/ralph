import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('renders with children text', () => {
      render(<Badge>Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Badge className="custom-class">Badge</Badge>);
      expect(screen.getByText('Badge').closest('.badge')).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('applies default variant by default', () => {
      render(<Badge>Default</Badge>);
      expect(screen.getByText('Default').closest('.badge')).toHaveClass('badge-default');
    });

    it('applies primary variant', () => {
      render(<Badge variant="primary">Primary</Badge>);
      expect(screen.getByText('Primary').closest('.badge')).toHaveClass('badge-primary');
    });

    it('applies success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      expect(screen.getByText('Success').closest('.badge')).toHaveClass('badge-success');
    });

    it('applies warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      expect(screen.getByText('Warning').closest('.badge')).toHaveClass('badge-warning');
    });

    it('applies danger variant', () => {
      render(<Badge variant="danger">Danger</Badge>);
      expect(screen.getByText('Danger').closest('.badge')).toHaveClass('badge-danger');
    });

    it('applies info variant', () => {
      render(<Badge variant="info">Info</Badge>);
      expect(screen.getByText('Info').closest('.badge')).toHaveClass('badge-info');
    });
  });

  describe('Sizes', () => {
    it('applies medium size by default', () => {
      render(<Badge>Medium</Badge>);
      expect(screen.getByText('Medium').closest('.badge')).toHaveClass('badge-md');
    });

    it('applies small size', () => {
      render(<Badge size="sm">Small</Badge>);
      expect(screen.getByText('Small').closest('.badge')).toHaveClass('badge-sm');
    });

    it('applies large size', () => {
      render(<Badge size="lg">Large</Badge>);
      expect(screen.getByText('Large').closest('.badge')).toHaveClass('badge-lg');
    });
  });

  describe('Outlined', () => {
    it('applies outlined class when outlined is true', () => {
      render(<Badge outlined>Outlined</Badge>);
      expect(screen.getByText('Outlined').closest('.badge')).toHaveClass('badge-outlined');
    });

    it('does not apply outlined class by default', () => {
      render(<Badge>Solid</Badge>);
      expect(screen.getByText('Solid').closest('.badge')).not.toHaveClass('badge-outlined');
    });
  });

  describe('Pill shape', () => {
    it('applies pill class when pill is true', () => {
      render(<Badge pill>Pill</Badge>);
      expect(screen.getByText('Pill').closest('.badge')).toHaveClass('badge-pill');
    });

    it('does not apply pill class by default', () => {
      render(<Badge>Square</Badge>);
      expect(screen.getByText('Square').closest('.badge')).not.toHaveClass('badge-pill');
    });
  });

  describe('Stripe styling', () => {
    it('applies stripe class when stripe is true', () => {
      render(<Badge stripe>Stripe</Badge>);
      expect(screen.getByText('Stripe').closest('.badge')).toHaveClass('badge-stripe');
    });

    it('does not apply stripe class by default', () => {
      render(<Badge>Normal</Badge>);
      expect(screen.getByText('Normal').closest('.badge')).not.toHaveClass('badge-stripe');
    });
  });

  describe('Icons', () => {
    it('renders left icon', () => {
      render(
        <Badge leftIcon={<span data-testid="left-icon">→</span>}>
          With Left Icon
        </Badge>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      render(
        <Badge rightIcon={<span data-testid="right-icon">←</span>}>
          With Right Icon
        </Badge>
      );
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('renders both icons', () => {
      render(
        <Badge
          leftIcon={<span data-testid="left-icon">→</span>}
          rightIcon={<span data-testid="right-icon">←</span>}
        >
          With Both Icons
        </Badge>
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('Removable', () => {
    it('renders remove button when removable is true', () => {
      render(<Badge removable>Removable</Badge>);
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });

    it('does not render remove button by default', () => {
      render(<Badge>Not Removable</Badge>);
      expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    });

    it('calls onRemove when remove button is clicked', () => {
      const handleRemove = vi.fn();
      render(<Badge removable onRemove={handleRemove}>Removable</Badge>);
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it('calls onRemove when Enter key is pressed on remove button', () => {
      const handleRemove = vi.fn();
      render(<Badge removable onRemove={handleRemove}>Removable</Badge>);
      fireEvent.keyDown(screen.getByRole('button', { name: 'Remove' }), { key: 'Enter' });
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it('calls onRemove when Space key is pressed on remove button', () => {
      const handleRemove = vi.fn();
      render(<Badge removable onRemove={handleRemove}>Removable</Badge>);
      fireEvent.keyDown(screen.getByRole('button', { name: 'Remove' }), { key: ' ' });
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it('hides right icon when removable', () => {
      render(
        <Badge removable rightIcon={<span data-testid="right-icon">←</span>}>
          Removable
        </Badge>
      );
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('supports aria-label', () => {
      render(<Badge aria-label="Status badge">Status</Badge>);
      expect(screen.getByLabelText('Status badge')).toBeInTheDocument();
    });

    it('remove button has accessible name', () => {
      render(<Badge removable>Tag</Badge>);
      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to span element', () => {
      const ref = vi.fn();
      render(<Badge ref={ref}>With Ref</Badge>);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLSpanElement);
    });
  });

  describe('Additional HTML Attributes', () => {
    it('passes through data attributes', () => {
      render(<Badge data-testid="custom-badge">Data Attr</Badge>);
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
    });

    it('passes through id attribute', () => {
      render(<Badge id="my-badge">With ID</Badge>);
      expect(document.getElementById('my-badge')).toBeInTheDocument();
    });
  });
});
