import {
  type ReactNode,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import './SlideOutPanel.css';

export type SlideOutPanelPosition = 'left' | 'right';
export type SlideOutPanelSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface SlideOutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  position?: SlideOutPanelPosition;
  size?: SlideOutPanelSize;
  children: ReactNode;
  footer?: ReactNode;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  initialFocus?: React.RefObject<HTMLElement | null>;
}

export function SlideOutPanel({
  isOpen,
  onClose,
  title,
  position = 'right',
  size = 'md',
  children,
  footer,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  initialFocus,
}: SlideOutPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store previously focused element and restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
    return () => {
      if (!isOpen && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus initial element or first focusable
      if (initialFocus?.current) {
        initialFocus.current.focus();
      } else {
        panelRef.current?.focus();
      }
    }
  }, [isOpen, initialFocus]);

  // Trap focus within panel
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusableElements = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    },
    [closeOnEscape, onClose]
  );

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  // Lock body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const panelContent = (
    <div
      className={`slideout-backdrop ${isOpen ? 'slideout-backdrop-visible' : ''}`}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`slideout-panel slideout-panel-${position} slideout-panel-${size} ${isOpen ? 'slideout-panel-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'slideout-title' : undefined}
        tabIndex={-1}
      >
        {(title || showCloseButton) && (
          <div className="slideout-header">
            {title && (
              <h2 id="slideout-title" className="slideout-title">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="slideout-close"
                aria-label="Close panel"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="slideout-body">{children}</div>
        {footer && <div className="slideout-footer">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
}

SlideOutPanel.displayName = 'SlideOutPanel';
