import {
  type ReactNode,
  useEffect,
  useRef,
  useCallback,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';
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

  // Use focus trap hook for proper focus management
  useFocusTrap(panelRef, {
    isActive: isOpen,
    onEscape: closeOnEscape ? onClose : undefined,
    initialFocusRef: initialFocus,
    autoFocus: true,
  });

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
