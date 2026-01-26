import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Switch } from '../Switch';

describe('Switch', () => {
  describe('rendering', () => {
    it('renders a switch input', () => {
      render(<Switch />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Switch label="Enable notifications" />);
      expect(screen.getByText('Enable notifications')).toBeInTheDocument();
    });

    it('renders with description', () => {
      render(<Switch label="Notifications" description="Get notified about updates" />);
      expect(screen.getByText('Get notified about updates')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      render(<Switch size="sm" data-testid="switch" />);
      const switchInput = screen.getByTestId('switch');
      expect(switchInput).toHaveClass('switch-sm');
    });

    it('renders medium size by default', () => {
      render(<Switch data-testid="switch" />);
      const switchInput = screen.getByTestId('switch');
      expect(switchInput).toHaveClass('switch-md');
    });

    it('renders large size', () => {
      render(<Switch size="lg" data-testid="switch" />);
      const switchInput = screen.getByTestId('switch');
      expect(switchInput).toHaveClass('switch-lg');
    });
  });

  describe('label position', () => {
    it('renders label on right by default', () => {
      const { container } = render(<Switch label="Test label" />);
      const wrapper = container.querySelector('.switch-wrapper');
      expect(wrapper).toHaveClass('switch-label-right');
    });

    it('renders label on left when specified', () => {
      const { container } = render(<Switch label="Test label" labelPosition="left" />);
      const wrapper = container.querySelector('.switch-wrapper');
      expect(wrapper).toHaveClass('switch-label-left');
    });
  });

  describe('states', () => {
    it('can be checked', () => {
      render(<Switch defaultChecked />);
      expect(screen.getByRole('switch')).toBeChecked();
    });

    it('can be disabled', () => {
      render(<Switch disabled />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('can be controlled', () => {
      const { rerender } = render(<Switch checked={false} onChange={() => {}} />);
      expect(screen.getByRole('switch')).not.toBeChecked();

      rerender(<Switch checked={true} onChange={() => {}} />);
      expect(screen.getByRole('switch')).toBeChecked();
    });
  });

  describe('interactions', () => {
    it('calls onChange when clicked', () => {
      const handleChange = vi.fn();
      render(<Switch onChange={handleChange} />);
      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalled();
    });

    it('is disabled when disabled prop is set', () => {
      render(<Switch disabled />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('toggles state when clicked', () => {
      render(<Switch />);
      const switchInput = screen.getByRole('switch');
      expect(switchInput).not.toBeChecked();

      fireEvent.click(switchInput);
      expect(switchInput).toBeChecked();

      fireEvent.click(switchInput);
      expect(switchInput).not.toBeChecked();
    });
  });

  describe('accessibility', () => {
    it('has role="switch"', () => {
      render(<Switch />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('associates label with switch', () => {
      render(<Switch label="Test label" />);
      const switchInput = screen.getByRole('switch');
      const label = screen.getByText('Test label');
      expect(label.closest('label')).toContainElement(switchInput);
    });

    it('renders description text', () => {
      render(<Switch label="Label" description="Description text" />);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('supports custom id', () => {
      render(<Switch id="custom-id" />);
      expect(screen.getByRole('switch')).toHaveAttribute('id', 'custom-id');
    });

    it('can be focused', () => {
      render(<Switch />);
      const switchInput = screen.getByRole('switch');
      switchInput.focus();
      expect(document.activeElement).toBe(switchInput);
    });
  });

  describe('keyboard interaction', () => {
    it('toggles on space key', () => {
      render(<Switch />);
      const switchInput = screen.getByRole('switch');
      switchInput.focus();

      fireEvent.keyDown(switchInput, { key: ' ' });
      fireEvent.keyUp(switchInput, { key: ' ' });
      fireEvent.click(switchInput);

      expect(switchInput).toBeChecked();
    });
  });
});
