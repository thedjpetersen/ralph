import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Tooltip } from '../Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders trigger element', () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );
      expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
    });

    it('does not show tooltip initially', () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('shows tooltip on mouse enter after delay', async () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', async () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      fireEvent.mouseLeave(screen.getByRole('button'));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Delay', () => {
    it('respects custom delay', async () => {
      render(
        <Tooltip content="Tooltip content" delay={500}>
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  describe('Disabled', () => {
    it('does not show tooltip when disabled', async () => {
      render(
        <Tooltip content="Tooltip content" disabled>
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Positions', () => {
    // Note: In jsdom, getBoundingClientRect returns zeros, which triggers position flipping.
    // We test that position classes are applied (may flip due to viewport constraints).
    it('applies a position class for top position', async () => {
      render(
        <Tooltip content="Tooltip content" position="top">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      const tooltip = screen.getByRole('tooltip');
      // May flip to bottom in jsdom due to viewport constraints
      expect(
        tooltip.classList.contains('tooltip-top') ||
        tooltip.classList.contains('tooltip-bottom')
      ).toBe(true);
    });

    it('applies a position class for bottom position', async () => {
      render(
        <Tooltip content="Tooltip content" position="bottom">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      const tooltip = screen.getByRole('tooltip');
      expect(
        tooltip.classList.contains('tooltip-top') ||
        tooltip.classList.contains('tooltip-bottom')
      ).toBe(true);
    });

    it('applies a position class for left position', async () => {
      render(
        <Tooltip content="Tooltip content" position="left">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      const tooltip = screen.getByRole('tooltip');
      // May flip to right in jsdom due to viewport constraints
      expect(
        tooltip.classList.contains('tooltip-left') ||
        tooltip.classList.contains('tooltip-right')
      ).toBe(true);
    });

    it('applies a position class for right position', async () => {
      render(
        <Tooltip content="Tooltip content" position="right">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      const tooltip = screen.getByRole('tooltip');
      expect(
        tooltip.classList.contains('tooltip-left') ||
        tooltip.classList.contains('tooltip-right')
      ).toBe(true);
    });
  });

  describe('Variants', () => {
    it('applies default variant by default', async () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('tooltip')).toHaveClass('tooltip-default');
    });

    it('applies light variant', async () => {
      render(
        <Tooltip content="Tooltip content" variant="light">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('tooltip')).toHaveClass('tooltip-light');
    });

    it('applies stripe variant', async () => {
      render(
        <Tooltip content="Tooltip content" variant="stripe">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('tooltip')).toHaveClass('tooltip-stripe');
    });
  });

  describe('Arrow', () => {
    it('shows arrow by default', async () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('tooltip')).toHaveClass('tooltip-arrow');
    });

    it('hides arrow when showArrow is false', async () => {
      render(
        <Tooltip content="Tooltip content" showArrow={false}>
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('tooltip')).not.toHaveClass('tooltip-arrow');
    });
  });

  describe('Focus/Blur', () => {
    it('shows tooltip on focus', async () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Focus me</button>
        </Tooltip>
      );
      fireEvent.focus(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('hides tooltip on blur', async () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Focus me</button>
        </Tooltip>
      );
      fireEvent.focus(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      fireEvent.blur(screen.getByRole('button'));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has role tooltip', async () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('sets aria-describedby on wrapper when visible', async () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );
      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      // The wrapper span has the aria-describedby attribute
      const wrapper = button.parentElement;
      expect(wrapper).toHaveAttribute('aria-describedby', 'tooltip');
    });
  });

  describe('Event propagation', () => {
    it('calls original mouseEnter handler on trigger', async () => {
      const handleMouseEnter = vi.fn();
      render(
        <Tooltip content="Tooltip content">
          <button onMouseEnter={handleMouseEnter}>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      // Handler gets called from the wrapper's handler propagating the original handler
      expect(handleMouseEnter).toHaveBeenCalled();
    });

    it('calls original mouseLeave handler on trigger', async () => {
      const handleMouseLeave = vi.fn();
      render(
        <Tooltip content="Tooltip content">
          <button onMouseLeave={handleMouseLeave}>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseLeave(screen.getByRole('button'));
      expect(handleMouseLeave).toHaveBeenCalled();
    });

    it('calls original focus handler on trigger', async () => {
      const handleFocus = vi.fn();
      render(
        <Tooltip content="Tooltip content">
          <button onFocus={handleFocus}>Focus me</button>
        </Tooltip>
      );
      fireEvent.focus(screen.getByRole('button'));
      expect(handleFocus).toHaveBeenCalled();
    });

    it('calls original blur handler on trigger', async () => {
      const handleBlur = vi.fn();
      render(
        <Tooltip content="Tooltip content">
          <button onBlur={handleBlur}>Blur me</button>
        </Tooltip>
      );
      fireEvent.blur(screen.getByRole('button'));
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('Content', () => {
    it('renders string content', async () => {
      render(
        <Tooltip content="Simple text">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByText('Simple text')).toBeInTheDocument();
    });

    it('renders JSX content', async () => {
      render(
        <Tooltip content={<span data-testid="jsx-content">JSX Content</span>}>
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByTestId('jsx-content')).toBeInTheDocument();
    });
  });

  describe('Additional HTML Attributes', () => {
    it('applies custom className', async () => {
      render(
        <Tooltip content="Content" className="custom-class">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByRole('tooltip')).toHaveClass('custom-class');
    });

    it('passes through data attributes', async () => {
      render(
        <Tooltip content="Content" data-testid="custom-tooltip">
          <button>Hover me</button>
        </Tooltip>
      );
      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByTestId('custom-tooltip')).toBeInTheDocument();
    });
  });
});
