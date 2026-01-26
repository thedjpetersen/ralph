import { useEffect, useRef, useCallback, type RefObject } from 'react';

/**
 * A hook that traps focus within a container element.
 * When the container is active, focus cannot escape to elements outside.
 * Focus is also restored to the previously focused element when the trap is deactivated.
 */
export interface UseFocusTrapOptions {
  /** Whether the focus trap is currently active */
  isActive: boolean;
  /** Callback when escape key is pressed */
  onEscape?: () => void;
  /** Element to focus initially (defaults to first focusable) */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Element to return focus to on close (defaults to previously focused) */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Whether to auto-focus when activated (default: true) */
  autoFocus?: boolean;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: UseFocusTrapOptions
) {
  const {
    isActive,
    onEscape,
    initialFocusRef,
    returnFocusRef,
    autoFocus = true,
  } = options;

  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the previously focused element when trap activates
  useEffect(() => {
    if (isActive) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [isActive]);

  // Focus the initial element when trap activates
  useEffect(() => {
    if (isActive && autoFocus) {
      // Use requestAnimationFrame to ensure DOM is ready
      const frameId = requestAnimationFrame(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else if (containerRef.current) {
          const focusables = containerRef.current.querySelectorAll<HTMLElement>(
            FOCUSABLE_SELECTOR
          );
          if (focusables.length > 0) {
            focusables[0].focus();
          } else {
            // If no focusable elements, focus the container itself
            containerRef.current.focus();
          }
        }
      });

      return () => cancelAnimationFrame(frameId);
    }
  }, [isActive, autoFocus, initialFocusRef, containerRef]);

  // Restore focus when trap deactivates
  useEffect(() => {
    if (!isActive && previousActiveElement.current) {
      const elementToFocus =
        returnFocusRef?.current || previousActiveElement.current;

      // Use requestAnimationFrame to ensure focus restoration happens after DOM updates
      const frameId = requestAnimationFrame(() => {
        if (elementToFocus && document.body.contains(elementToFocus)) {
          elementToFocus.focus();
        }
      });

      previousActiveElement.current = null;
      return () => cancelAnimationFrame(frameId);
    }
  }, [isActive, returnFocusRef]);

  // Handle keyboard events for focus trapping
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive || !containerRef.current) return;

      // Handle Escape
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      // Handle Tab for focus trapping
      if (event.key === 'Tab') {
        const container = containerRef.current;
        const focusables =
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

        if (focusables.length === 0) {
          // No focusable elements, prevent tab from leaving
          event.preventDefault();
          return;
        }

        const firstFocusable = focusables[0];
        const lastFocusable = focusables[focusables.length - 1];

        if (event.shiftKey) {
          // Shift+Tab: if on first element, wrap to last
          if (document.activeElement === firstFocusable) {
            event.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === lastFocusable) {
            event.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    },
    [isActive, containerRef, onEscape]
  );

  // Attach/detach keyboard listener
  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isActive, handleKeyDown]);

  return {
    /** Get keyboard props to spread on the container for local handling */
    getContainerProps: () => ({
      tabIndex: -1 as const,
    }),
  };
}
