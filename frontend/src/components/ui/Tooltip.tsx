import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type HTMLAttributes,
  type ReactNode,
  type ReactElement,
} from 'react';
import { getPlatform, formatShortcutKeys } from '../../utils/keyboardShortcuts';
import './Tooltip.css';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipVariant = 'default' | 'light' | 'stripe';

export interface TooltipShortcut {
  /** Keys for Mac platform, e.g., ['⌘', 'K'] */
  mac: string[];
  /** Keys for Windows platform, e.g., ['Ctrl', 'K'] */
  windows: string[];
}

export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  content: ReactNode;
  position?: TooltipPosition;
  variant?: TooltipVariant;
  /** Delay before showing tooltip in ms (default: 200, with shortcut: 500) */
  delay?: number;
  offset?: number;
  disabled?: boolean;
  showArrow?: boolean;
  children: ReactElement;
  /** Optional keyboard shortcut to display */
  shortcut?: TooltipShortcut;
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      content,
      position = 'top',
      variant = 'default',
      delay,
      offset = 8,
      disabled = false,
      showArrow = true,
      children,
      className = '',
      shortcut,
      ...props
    },
    ref
  ) => {
    // Default delay is 500ms when shortcut is present, 200ms otherwise
    const effectiveDelay = delay ?? (shortcut ? 500 : 200);

    // Get platform-specific shortcut display
    const shortcutDisplay = useMemo(() => {
      if (!shortcut) return null;
      const platform = getPlatform();
      const keys = shortcut[platform];
      return {
        keys,
        formatted: formatShortcutKeys(keys, platform),
      };
    }, [shortcut]);
    const [isVisible, setIsVisible] = useState(false);
    const triggerRef = useRef<HTMLElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const currentPositionRef = useRef<TooltipPosition>(position);

    const showTooltip = useCallback(() => {
      if (disabled) return;
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, effectiveDelay);
    }, [disabled, effectiveDelay]);

    const hideTooltip = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsVisible(false);
      // Reset position for next show
      currentPositionRef.current = position;
    }, [position]);

    const updatePosition = useCallback(() => {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) return;

      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newPosition = position;

      // Check if tooltip would overflow and flip if necessary
      switch (position) {
        case 'top':
          if (triggerRect.top - tooltipRect.height - offset < 0) {
            newPosition = 'bottom';
          }
          break;
        case 'bottom':
          if (triggerRect.bottom + tooltipRect.height + offset > viewportHeight) {
            newPosition = 'top';
          }
          break;
        case 'left':
          if (triggerRect.left - tooltipRect.width - offset < 0) {
            newPosition = 'right';
          }
          break;
        case 'right':
          if (triggerRect.right + tooltipRect.width + offset > viewportWidth) {
            newPosition = 'left';
          }
          break;
      }

      // Update position class via DOM manipulation (avoiding state)
      if (newPosition !== currentPositionRef.current) {
        tooltip.classList.remove(`tooltip-${currentPositionRef.current}`);
        tooltip.classList.add(`tooltip-${newPosition}`);
        currentPositionRef.current = newPosition;
      }

      // Calculate position
      let top = 0;
      let left = 0;

      switch (newPosition) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - offset;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + offset;
          left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.left - tooltipRect.width - offset;
          break;
        case 'right':
          top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
          left = triggerRect.right + offset;
          break;
      }

      // Constrain within viewport
      left = Math.max(8, Math.min(left, viewportWidth - tooltipRect.width - 8));
      top = Math.max(8, Math.min(top, viewportHeight - tooltipRect.height - 8));

      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    }, [position, offset]);

    useEffect(() => {
      if (!isVisible) return;

      // Initial position calculation
      updatePosition();

      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }, [isVisible, updatePosition]);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    const tooltipClasses = [
      'tooltip',
      `tooltip-${variant}`,
      `tooltip-${position}`,
      showArrow && 'tooltip-arrow',
      isVisible && 'tooltip-visible',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    // Event handlers on the wrapper - child handlers will be called
    // via native event bubbling, so we don't need to call them manually
    const handleMouseEnter = useCallback(() => {
      showTooltip();
    }, [showTooltip]);

    const handleMouseLeave = useCallback(() => {
      hideTooltip();
    }, [hideTooltip]);

    const handleFocus = useCallback(() => {
      showTooltip();
    }, [showTooltip]);

    const handleBlur = useCallback(() => {
      hideTooltip();
    }, [hideTooltip]);

    const setTriggerRef = useCallback((node: HTMLElement | null) => {
      triggerRef.current = node;
    }, []);

    const setTooltipRef = useCallback(
      (node: HTMLDivElement | null) => {
        tooltipRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    return (
      <>
        <span
          ref={setTriggerRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-describedby={isVisible ? 'tooltip' : undefined}
          style={{ display: 'contents' }}
        >
          {children}
        </span>
        {isVisible && (
          <div
            ref={setTooltipRef}
            id="tooltip"
            role="tooltip"
            className={tooltipClasses}
            {...props}
          >
            <span className="tooltip-content">
              {content}
              {shortcutDisplay && (
                <span className="tooltip-shortcut">
                  {shortcutDisplay.keys.map((key, index) => (
                    <kbd key={index} className="tooltip-shortcut-key">{key}</kbd>
                  ))}
                </span>
              )}
            </span>
          </div>
        )}
      </>
    );
  }
);

Tooltip.displayName = 'Tooltip';
