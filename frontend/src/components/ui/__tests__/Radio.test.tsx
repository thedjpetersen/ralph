import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Radio, RadioGroup } from '../Radio';

describe('Radio', () => {
  describe('rendering', () => {
    it('renders a radio input', () => {
      render(<Radio name="test" value="option1" />);
      expect(screen.getByRole('radio')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Radio name="test" value="option1" label="Option 1" />);
      expect(screen.getByText('Option 1')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      render(<Radio name="test" value="option1" size="sm" data-testid="radio" />);
      const radio = screen.getByTestId('radio');
      expect(radio).toHaveClass('radio-sm');
    });

    it('renders medium size by default', () => {
      render(<Radio name="test" value="option1" data-testid="radio" />);
      const radio = screen.getByTestId('radio');
      expect(radio).toHaveClass('radio-md');
    });

    it('renders large size', () => {
      render(<Radio name="test" value="option1" size="lg" data-testid="radio" />);
      const radio = screen.getByTestId('radio');
      expect(radio).toHaveClass('radio-lg');
    });
  });

  describe('states', () => {
    it('can be checked', () => {
      render(<Radio name="test" value="option1" defaultChecked />);
      expect(screen.getByRole('radio')).toBeChecked();
    });

    it('can be disabled', () => {
      render(<Radio name="test" value="option1" disabled />);
      expect(screen.getByRole('radio')).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('calls onChange when clicked', () => {
      const handleChange = vi.fn();
      render(<Radio name="test" value="option1" onChange={handleChange} />);
      fireEvent.click(screen.getByRole('radio'));
      expect(handleChange).toHaveBeenCalled();
    });
  });
});

describe('RadioGroup', () => {
  describe('rendering', () => {
    it('renders all radio options', () => {
      render(
        <RadioGroup name="colors">
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
          <Radio value="green" label="Green" />
        </RadioGroup>
      );
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });

    it('renders with label', () => {
      render(
        <RadioGroup name="colors" label="Select a color">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );
      expect(screen.getByText('Select a color')).toBeInTheDocument();
    });

    it('renders with error message', () => {
      render(
        <RadioGroup name="colors" error="Please select an option">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );
      expect(screen.getByRole('alert')).toHaveTextContent('Please select an option');
    });

    it('renders with hint text', () => {
      render(
        <RadioGroup name="colors" hint="Choose your favorite">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );
      expect(screen.getByText('Choose your favorite')).toBeInTheDocument();
    });

    it('renders error instead of hint when both provided', () => {
      render(
        <RadioGroup name="colors" hint="Choose one" error="Required">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );
      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.queryByText('Choose one')).not.toBeInTheDocument();
    });
  });

  describe('orientation', () => {
    it('renders vertical by default', () => {
      render(
        <RadioGroup name="colors">
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );
      expect(screen.getByRole('radiogroup')).toHaveClass('radio-group-vertical');
    });

    it('renders horizontal when specified', () => {
      render(
        <RadioGroup name="colors" orientation="horizontal">
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );
      expect(screen.getByRole('radiogroup')).toHaveClass('radio-group-horizontal');
    });
  });

  describe('controlled behavior', () => {
    it('selects the correct radio based on value', () => {
      render(
        <RadioGroup name="colors" value="blue">
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
          <Radio value="green" label="Green" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole('radio');
      expect(radios[0]).not.toBeChecked();
      expect(radios[1]).toBeChecked();
      expect(radios[2]).not.toBeChecked();
    });

    it('calls onChange with the selected value', () => {
      const handleChange = vi.fn();
      render(
        <RadioGroup name="colors" onChange={handleChange}>
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );
      fireEvent.click(screen.getByLabelText('Blue'));
      expect(handleChange).toHaveBeenCalledWith('blue');
    });
  });

  describe('disabled state', () => {
    it('disables all radios when group is disabled', () => {
      render(
        <RadioGroup name="colors" disabled>
          <Radio value="red" label="Red" />
          <Radio value="blue" label="Blue" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole('radio');
      radios.forEach(radio => {
        expect(radio).toBeDisabled();
      });
    });
  });

  describe('size inheritance', () => {
    it('applies group size to all radios', () => {
      render(
        <RadioGroup name="colors" size="lg">
          <Radio value="red" label="Red" data-testid="radio-red" />
          <Radio value="blue" label="Blue" data-testid="radio-blue" />
        </RadioGroup>
      );
      expect(screen.getByTestId('radio-red')).toHaveClass('radio-lg');
      expect(screen.getByTestId('radio-blue')).toHaveClass('radio-lg');
    });

    it('allows individual radio to override group size', () => {
      render(
        <RadioGroup name="colors" size="md">
          <Radio value="red" label="Red" size="sm" data-testid="radio-red" />
          <Radio value="blue" label="Blue" data-testid="radio-blue" />
        </RadioGroup>
      );
      expect(screen.getByTestId('radio-red')).toHaveClass('radio-sm');
      expect(screen.getByTestId('radio-blue')).toHaveClass('radio-md');
    });
  });

  describe('accessibility', () => {
    it('uses fieldset and legend for group label', () => {
      render(
        <RadioGroup name="colors" label="Select a color">
          <Radio value="red" label="Red" />
        </RadioGroup>
      );
      expect(screen.getByRole('group')).toBeInTheDocument();
      expect(screen.getByText('Select a color').tagName).toBe('LEGEND');
    });

    it('associates name with all radios', () => {
      render(
        <RadioGroup name="test-group">
          <Radio value="a" label="A" />
          <Radio value="b" label="B" />
        </RadioGroup>
      );
      const radios = screen.getAllByRole('radio');
      radios.forEach(radio => {
        expect(radio).toHaveAttribute('name', 'test-group');
      });
    });
  });
});
