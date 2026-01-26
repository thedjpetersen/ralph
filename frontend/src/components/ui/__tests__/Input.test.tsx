import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('renders an input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with value', () => {
      render(<Input value="Test value" readOnly />);
      expect(screen.getByRole('textbox')).toHaveValue('Test value');
    });

    it('applies custom className', () => {
      render(<Input className="custom-class" />);
      expect(screen.getByRole('textbox')).toHaveClass('custom-class');
    });
  });

  describe('Label', () => {
    it('renders label when provided', () => {
      render(<Input label="Username" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('associates label with input', () => {
      render(<Input label="Email" />);
      const input = screen.getByRole('textbox');
      const label = screen.getByText('Email');
      expect(label).toHaveAttribute('for', input.id);
    });

    it('shows required indicator when required', () => {
      render(<Input label="Required Field" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('hides required indicator from screen readers', () => {
      render(<Input label="Required Field" required />);
      expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Error State', () => {
    it('shows error message', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('applies error class to input', () => {
      render(<Input error="Error" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-error');
    });

    it('sets aria-invalid when error is present', () => {
      render(<Input error="Error" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('links error message with aria-describedby', () => {
      render(<Input error="Error message" />);
      const input = screen.getByRole('textbox');
      const errorId = input.getAttribute('aria-describedby');
      expect(screen.getByText('Error message')).toHaveAttribute('id', errorId);
    });

    it('error message has alert role', () => {
      render(<Input error="Error message" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Error message');
    });
  });

  describe('Hint', () => {
    it('shows hint text', () => {
      render(<Input hint="Enter your full name" />);
      expect(screen.getByText('Enter your full name')).toBeInTheDocument();
    });

    it('links hint with aria-describedby', () => {
      render(<Input hint="Hint text" />);
      const input = screen.getByRole('textbox');
      const hintId = input.getAttribute('aria-describedby');
      expect(screen.getByText('Hint text')).toHaveAttribute('id', hintId);
    });

    it('hides hint when error is present', () => {
      render(<Input hint="Hint text" error="Error message" />);
      expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('applies medium size by default', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toHaveClass('input-md');
    });

    it('applies small size', () => {
      render(<Input size="sm" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-sm');
    });

    it('applies large size', () => {
      render(<Input size="lg" />);
      expect(screen.getByRole('textbox')).toHaveClass('input-lg');
    });
  });

  describe('Icons', () => {
    it('renders left icon', () => {
      render(<Input leftIcon={<span data-testid="left-icon">🔍</span>} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon', () => {
      render(<Input rightIcon={<span data-testid="right-icon">✓</span>} />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('applies class when left icon is present', () => {
      render(<Input leftIcon={<span>🔍</span>} />);
      expect(screen.getByRole('textbox')).toHaveClass('input-with-left-icon');
    });

    it('applies class when right icon is present', () => {
      render(<Input rightIcon={<span>✓</span>} />);
      expect(screen.getByRole('textbox')).toHaveClass('input-with-right-icon');
    });

    it('icons are hidden from screen readers', () => {
      render(
        <Input
          leftIcon={<span data-testid="left-icon">🔍</span>}
          rightIcon={<span data-testid="right-icon">✓</span>}
        />
      );
      const leftContainer = screen.getByTestId('left-icon').parentElement;
      const rightContainer = screen.getByTestId('right-icon').parentElement;
      expect(leftContainer).toHaveAttribute('aria-hidden', 'true');
      expect(rightContainer).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Full Width', () => {
    it('applies full width class', () => {
      render(<Input fullWidth />);
      const wrapper = screen.getByRole('textbox').closest('.input-wrapper');
      expect(wrapper).toHaveClass('input-full-width');
    });

    it('does not apply full width class by default', () => {
      render(<Input />);
      const wrapper = screen.getByRole('textbox').closest('.input-wrapper');
      expect(wrapper).not.toHaveClass('input-full-width');
    });
  });

  describe('States', () => {
    it('can be disabled', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('can be read-only', () => {
      render(<Input readOnly value="Read only" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });
  });

  describe('Event Handlers', () => {
    it('calls onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new value' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('calls onFocus and onBlur', () => {
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();
      render(<Input onFocus={handleFocus} onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');
      fireEvent.focus(input);
      expect(handleFocus).toHaveBeenCalledTimes(1);
      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('calls onKeyDown and onKeyUp', () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      render(<Input onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />);
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      fireEvent.keyUp(input, { key: 'Enter' });
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('Input Types', () => {
    it('supports email type', () => {
      render(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('supports password type', () => {
      render(<Input type="password" />);
      // Password inputs don't have textbox role
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('supports number type', () => {
      render(<Input type="number" />);
      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    });

    it('supports tel type', () => {
      render(<Input type="tel" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel');
    });
  });

  describe('Accessibility', () => {
    it('is focusable', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      input.focus();
      expect(document.activeElement).toBe(input);
    });

    it('is not focusable when disabled', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('supports custom aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="custom-desc" />
          <span id="custom-desc">Custom description</span>
        </>
      );
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'custom-desc');
    });

    it('combines aria-describedby with error', () => {
      render(
        <>
          <Input aria-describedby="custom-desc" error="Error" />
          <span id="custom-desc">Custom description</span>
        </>
      );
      const input = screen.getByRole('textbox');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toContain('custom-desc');
    });

    it('supports aria-label', () => {
      render(<Input aria-label="Search" />);
      expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = vi.fn();
      render(<Input ref={ref} />);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Additional HTML Attributes', () => {
    it('passes through data attributes', () => {
      render(<Input data-testid="custom-input" />);
      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });

    it('passes through autoComplete', () => {
      render(<Input autoComplete="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'email');
    });

    it('passes through maxLength', () => {
      render(<Input maxLength={10} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '10');
    });

    it('passes through minLength', () => {
      render(<Input minLength={5} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('minlength', '5');
    });

    it('passes through pattern', () => {
      render(<Input pattern="[A-Za-z]+" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('pattern', '[A-Za-z]+');
    });

    it('uses provided id over generated one', () => {
      render(<Input id="custom-id" label="Custom" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'custom-id');
      expect(screen.getByText('Custom')).toHaveAttribute('for', 'custom-id');
    });
  });
});
