import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  describe('rendering', () => {
    it('renders a checkbox input', () => {
      render(<Checkbox />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Checkbox label="Accept terms" />);
      expect(screen.getByText('Accept terms')).toBeInTheDocument();
    });

    it('renders with hint text', () => {
      render(<Checkbox hint="Optional field" />);
      expect(screen.getByText('Optional field')).toBeInTheDocument();
    });

    it('renders with error message', () => {
      render(<Checkbox error="This field is required" />);
      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    });

    it('renders error instead of hint when both provided', () => {
      render(<Checkbox hint="Optional" error="Required field" />);
      expect(screen.getByText('Required field')).toBeInTheDocument();
      expect(screen.queryByText('Optional')).not.toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      render(<Checkbox size="sm" data-testid="checkbox" />);
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toHaveClass('checkbox-sm');
    });

    it('renders medium size by default', () => {
      render(<Checkbox data-testid="checkbox" />);
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toHaveClass('checkbox-md');
    });

    it('renders large size', () => {
      render(<Checkbox size="lg" data-testid="checkbox" />);
      const checkbox = screen.getByTestId('checkbox');
      expect(checkbox).toHaveClass('checkbox-lg');
    });
  });

  describe('states', () => {
    it('can be checked', () => {
      render(<Checkbox defaultChecked />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('can be disabled', () => {
      render(<Checkbox disabled />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('sets aria-invalid when error is provided', () => {
      render(<Checkbox error="Error message" />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('indeterminate state', () => {
    it('sets indeterminate property', () => {
      render(<Checkbox indeterminate />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.indeterminate).toBe(true);
    });
  });

  describe('interactions', () => {
    it('calls onChange when clicked', () => {
      const handleChange = vi.fn();
      render(<Checkbox onChange={handleChange} />);
      fireEvent.click(screen.getByRole('checkbox'));
      expect(handleChange).toHaveBeenCalled();
    });

    it('is disabled when disabled prop is set', () => {
      render(<Checkbox disabled />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('associates label with checkbox', () => {
      render(<Checkbox label="Test label" />);
      const checkbox = screen.getByRole('checkbox');
      const label = screen.getByText('Test label');
      expect(label.closest('label')).toContainElement(checkbox);
    });

    it('links error message with aria-describedby', () => {
      render(<Checkbox error="Error message" />);
      const checkbox = screen.getByRole('checkbox');
      const errorId = checkbox.getAttribute('aria-describedby');
      expect(errorId).toBeTruthy();
      expect(document.getElementById(errorId!)).toHaveTextContent('Error message');
    });

    it('links hint message with aria-describedby', () => {
      render(<Checkbox hint="Hint message" />);
      const checkbox = screen.getByRole('checkbox');
      const hintId = checkbox.getAttribute('aria-describedby');
      expect(hintId).toBeTruthy();
      expect(document.getElementById(hintId!)).toHaveTextContent('Hint message');
    });

    it('supports custom id', () => {
      render(<Checkbox id="custom-id" />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'custom-id');
    });
  });
});
