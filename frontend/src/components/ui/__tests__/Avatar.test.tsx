import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Avatar />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Avatar className="custom-class" />);
      expect(screen.getByRole('img')).toHaveClass('custom-class');
    });
  });

  describe('Image', () => {
    it('renders image when src is provided', () => {
      render(<Avatar src="https://example.com/avatar.jpg" alt="User avatar" />);
      const container = screen.getByLabelText('User avatar');
      expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('shows fallback when image fails to load', () => {
      render(<Avatar src="invalid.jpg" name="John Doe" />);
      const container = screen.getByLabelText('John Doe');
      const img = container.querySelector('img');
      fireEvent.error(img!);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('does not show image when src is null', () => {
      render(<Avatar src={null} name="John Doe" />);
      const container = screen.getByLabelText('John Doe');
      expect(container.querySelector('img.avatar-image')).not.toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('Initials', () => {
    it('shows initials when no image is provided', () => {
      render(<Avatar name="John Doe" />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('shows single initial for single name', () => {
      render(<Avatar name="John" />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('shows first and last initials for multiple names', () => {
      render(<Avatar name="John Michael Doe" />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('handles empty name gracefully', () => {
      render(<Avatar name="" />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('handles whitespace-only name gracefully', () => {
      render(<Avatar name="   " />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  describe('Fallback Icon', () => {
    it('renders custom fallback icon when provided', () => {
      render(<Avatar fallbackIcon={<span data-testid="custom-icon">icon</span>} />);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('renders default icon when no name or fallbackIcon is provided', () => {
      render(<Avatar />);
      expect(screen.getByRole('img').querySelector('svg')).toBeInTheDocument();
    });

    it('prioritizes fallbackIcon over initials', () => {
      render(
        <Avatar
          name="John Doe"
          fallbackIcon={<span data-testid="custom-icon">icon</span>}
        />
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
      expect(screen.queryByText('JD')).not.toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('applies medium size by default', () => {
      render(<Avatar name="John" />);
      expect(screen.getByRole('img')).toHaveClass('avatar-md');
    });

    it('applies xs size', () => {
      render(<Avatar name="John" size="xs" />);
      expect(screen.getByRole('img')).toHaveClass('avatar-xs');
    });

    it('applies sm size', () => {
      render(<Avatar name="John" size="sm" />);
      expect(screen.getByRole('img')).toHaveClass('avatar-sm');
    });

    it('applies lg size', () => {
      render(<Avatar name="John" size="lg" />);
      expect(screen.getByRole('img')).toHaveClass('avatar-lg');
    });

    it('applies xl size', () => {
      render(<Avatar name="John" size="xl" />);
      expect(screen.getByRole('img')).toHaveClass('avatar-xl');
    });
  });

  describe('Variants', () => {
    it('applies circle variant by default', () => {
      render(<Avatar name="John" />);
      expect(screen.getByRole('img')).toHaveClass('avatar-circle');
    });

    it('applies rounded variant', () => {
      render(<Avatar name="John" variant="rounded" />);
      expect(screen.getByRole('img')).toHaveClass('avatar-rounded');
    });

    it('applies square variant', () => {
      render(<Avatar name="John" variant="square" />);
      expect(screen.getByRole('img')).toHaveClass('avatar-square');
    });
  });

  describe('Accessibility', () => {
    it('has img role', () => {
      render(<Avatar name="John Doe" />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('uses alt text for aria-label when provided', () => {
      render(<Avatar alt="Profile picture" />);
      expect(screen.getByLabelText('Profile picture')).toBeInTheDocument();
    });

    it('uses name for aria-label when alt not provided', () => {
      render(<Avatar name="John Doe" />);
      expect(screen.getByLabelText('John Doe')).toBeInTheDocument();
    });

    it('uses default aria-label when no alt or name provided', () => {
      render(<Avatar />);
      expect(screen.getByLabelText('Avatar')).toBeInTheDocument();
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to div element', () => {
      const ref = vi.fn();
      render(<Avatar ref={ref} name="John" />);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Additional HTML Attributes', () => {
    it('passes through data attributes', () => {
      render(<Avatar data-testid="custom-avatar" name="John" />);
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
    });

    it('passes through id attribute', () => {
      render(<Avatar id="my-avatar" name="John" />);
      expect(document.getElementById('my-avatar')).toBeInTheDocument();
    });
  });
});
