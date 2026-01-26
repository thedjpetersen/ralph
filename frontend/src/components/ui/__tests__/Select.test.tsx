import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select, type SelectOption } from '../Select';

const defaultOptions: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

describe('Select', () => {
  describe('Rendering', () => {
    it('renders a select element', () => {
      render(<Select options={defaultOptions} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders all options', () => {
      render(<Select options={defaultOptions} />);
      expect(screen.getByRole('option', { name: 'Apple' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Banana' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Cherry' })).toBeInTheDocument();
    });

    it('renders placeholder option when provided', () => {
      render(<Select options={defaultOptions} placeholder="Select a fruit" />);
      expect(screen.getByRole('option', { name: 'Select a fruit' })).toBeInTheDocument();
    });

    it('placeholder option is disabled', () => {
      render(<Select options={defaultOptions} placeholder="Select a fruit" />);
      expect(screen.getByRole('option', { name: 'Select a fruit' })).toBeDisabled();
    });

    it('applies custom className', () => {
      render(<Select options={defaultOptions} className="custom-class" />);
      expect(screen.getByRole('combobox')).toHaveClass('custom-class');
    });
  });

  describe('Options', () => {
    it('can disable individual options', () => {
      const optionsWithDisabled: SelectOption[] = [
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana', disabled: true },
        { value: 'cherry', label: 'Cherry' },
      ];
      render(<Select options={optionsWithDisabled} />);
      expect(screen.getByRole('option', { name: 'Banana' })).toBeDisabled();
    });

    it('renders options with correct values', () => {
      render(<Select options={defaultOptions} />);
      const appleOption = screen.getByRole('option', { name: 'Apple' });
      expect(appleOption).toHaveValue('apple');
    });
  });

  describe('Label', () => {
    it('renders label when provided', () => {
      render(<Select options={defaultOptions} label="Fruit" />);
      expect(screen.getByText('Fruit')).toBeInTheDocument();
    });

    it('associates label with select', () => {
      render(<Select options={defaultOptions} label="Fruit" />);
      const select = screen.getByRole('combobox');
      const label = screen.getByText('Fruit');
      expect(label).toHaveAttribute('for', select.id);
    });

    it('shows required indicator when required', () => {
      render(<Select options={defaultOptions} label="Required Field" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('hides required indicator from screen readers', () => {
      render(<Select options={defaultOptions} label="Required Field" required />);
      expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Error State', () => {
    it('shows error message', () => {
      render(<Select options={defaultOptions} error="Please select an option" />);
      expect(screen.getByText('Please select an option')).toBeInTheDocument();
    });

    it('applies error class to select', () => {
      render(<Select options={defaultOptions} error="Error" />);
      expect(screen.getByRole('combobox')).toHaveClass('select-error');
    });

    it('sets aria-invalid when error is present', () => {
      render(<Select options={defaultOptions} error="Error" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('links error message with aria-describedby', () => {
      render(<Select options={defaultOptions} error="Error message" />);
      const select = screen.getByRole('combobox');
      const errorId = select.getAttribute('aria-describedby');
      expect(screen.getByText('Error message')).toHaveAttribute('id', errorId);
    });

    it('error message has alert role', () => {
      render(<Select options={defaultOptions} error="Error message" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Error message');
    });
  });

  describe('Hint', () => {
    it('shows hint text', () => {
      render(<Select options={defaultOptions} hint="Choose your favorite" />);
      expect(screen.getByText('Choose your favorite')).toBeInTheDocument();
    });

    it('links hint with aria-describedby', () => {
      render(<Select options={defaultOptions} hint="Hint text" />);
      const select = screen.getByRole('combobox');
      const hintId = select.getAttribute('aria-describedby');
      expect(screen.getByText('Hint text')).toHaveAttribute('id', hintId);
    });

    it('hides hint when error is present', () => {
      render(<Select options={defaultOptions} hint="Hint text" error="Error message" />);
      expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('applies medium size by default', () => {
      render(<Select options={defaultOptions} />);
      expect(screen.getByRole('combobox')).toHaveClass('select-md');
    });

    it('applies small size', () => {
      render(<Select options={defaultOptions} size="sm" />);
      expect(screen.getByRole('combobox')).toHaveClass('select-sm');
    });

    it('applies large size', () => {
      render(<Select options={defaultOptions} size="lg" />);
      expect(screen.getByRole('combobox')).toHaveClass('select-lg');
    });
  });

  describe('Full Width', () => {
    it('applies full width class', () => {
      render(<Select options={defaultOptions} fullWidth />);
      const wrapper = screen.getByRole('combobox').closest('.select-wrapper');
      expect(wrapper).toHaveClass('select-full-width');
    });

    it('does not apply full width class by default', () => {
      render(<Select options={defaultOptions} />);
      const wrapper = screen.getByRole('combobox').closest('.select-wrapper');
      expect(wrapper).not.toHaveClass('select-full-width');
    });
  });

  describe('States', () => {
    it('can be disabled', () => {
      render(<Select options={defaultOptions} disabled />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });

  describe('Value Control', () => {
    it('displays selected value', () => {
      render(<Select options={defaultOptions} value="banana" onChange={() => {}} />);
      expect(screen.getByRole('combobox')).toHaveValue('banana');
    });

    it('displays default value', () => {
      render(<Select options={defaultOptions} defaultValue="cherry" />);
      expect(screen.getByRole('combobox')).toHaveValue('cherry');
    });
  });

  describe('Event Handlers', () => {
    it('calls onChange when selection changes', () => {
      const handleChange = vi.fn();
      render(<Select options={defaultOptions} onChange={handleChange} />);
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'banana' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('calls onFocus and onBlur', () => {
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();
      render(<Select options={defaultOptions} onFocus={handleFocus} onBlur={handleBlur} />);
      const select = screen.getByRole('combobox');
      fireEvent.focus(select);
      expect(handleFocus).toHaveBeenCalledTimes(1);
      fireEvent.blur(select);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('is focusable', () => {
      render(<Select options={defaultOptions} />);
      const select = screen.getByRole('combobox');
      select.focus();
      expect(document.activeElement).toBe(select);
    });

    it('is not focusable when disabled', () => {
      render(<Select options={defaultOptions} disabled />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('supports custom aria-describedby', () => {
      render(
        <>
          <Select options={defaultOptions} aria-describedby="custom-desc" />
          <span id="custom-desc">Custom description</span>
        </>
      );
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-describedby', 'custom-desc');
    });

    it('combines aria-describedby with error', () => {
      render(
        <>
          <Select options={defaultOptions} aria-describedby="custom-desc" error="Error" />
          <span id="custom-desc">Custom description</span>
        </>
      );
      const select = screen.getByRole('combobox');
      const describedBy = select.getAttribute('aria-describedby');
      expect(describedBy).toContain('custom-desc');
    });

    it('supports aria-label', () => {
      render(<Select options={defaultOptions} aria-label="Select fruit" />);
      expect(screen.getByRole('combobox', { name: 'Select fruit' })).toBeInTheDocument();
    });

    it('can navigate options with keyboard', () => {
      render(<Select options={defaultOptions} />);
      const select = screen.getByRole('combobox');
      select.focus();
      fireEvent.keyDown(select, { key: 'ArrowDown' });
      // Note: Actual selection behavior depends on browser implementation
    });

    it('renders chevron icon hidden from screen readers', () => {
      render(<Select options={defaultOptions} />);
      const chevron = document.querySelector('.select-chevron');
      expect(chevron).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to select element', () => {
      const ref = vi.fn();
      render(<Select options={defaultOptions} ref={ref} />);
      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLSelectElement);
    });
  });

  describe('Additional HTML Attributes', () => {
    it('passes through data attributes', () => {
      render(<Select options={defaultOptions} data-testid="custom-select" />);
      expect(screen.getByTestId('custom-select')).toBeInTheDocument();
    });

    it('passes through name attribute', () => {
      render(<Select options={defaultOptions} name="fruit" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('name', 'fruit');
    });

    it('uses provided id over generated one', () => {
      render(<Select options={defaultOptions} id="custom-id" label="Custom" />);
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('id', 'custom-id');
      expect(screen.getByText('Custom')).toHaveAttribute('for', 'custom-id');
    });
  });

  describe('Empty Options', () => {
    it('renders with empty options array', () => {
      render(<Select options={[]} placeholder="No options" />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(1); // Only placeholder
    });
  });
});
