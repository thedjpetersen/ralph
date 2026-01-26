import {
  type ReactNode,
  useEffect,
  useRef,
  useCallback,
  useState,
  type MouseEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import './Modal.css';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  initialFocus?: React.RefObject<HTMLElement | null>;
  /** Enable swipe down to dismiss (mobile-friendly) */
  swipeToDismiss?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  initialFocus,
  swipeToDismiss = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ y: number; x: number; time: number } | null>(null);

  // Use focus trap hook for proper focus management
  useFocusTrap(modalRef, {
    isActive: isOpen,
    onEscape: closeOnEscape ? onClose : undefined,
    initialFocusRef: initialFocus,
    autoFocus: true,
  });

  const handleOverlayClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnOverlayClick, onClose]
  );

  // Swipe to dismiss handlers
  const handleTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if (!swipeToDismiss) return;

      const touch = e.touches[0];
      touchStartRef.current = {
        y: touch.clientY,
        x: touch.clientX,
        time: Date.now(),
      };
    },
    [swipeToDismiss]
  );

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      if (!swipeToDismiss || !touchStartRef.current) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaX = touch.clientX - touchStartRef.current.x;

      // Only track downward swipes (positive deltaY) that are more vertical than horizontal
      if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
        setIsSwiping(true);
        // Apply resistance as the user swipes further
        const resistance = 0.5;
        setSwipeOffset(deltaY * resistance);
      }
    },
    [swipeToDismiss]
  );

  const handleTouchEnd = useCallback(() => {
    if (!swipeToDismiss || !touchStartRef.current) {
      touchStartRef.current = null;
      return;
    }

    const dismissThreshold = 100;

    if (swipeOffset >= dismissThreshold) {
      onClose();
    }

    // Reset state
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartRef.current = null;
  }, [swipeToDismiss, swipeOffset, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Early return if modal is closed - state will reset naturally when component remounts
  if (!isOpen) return null;

  // Calculate opacity based on swipe offset for visual feedback
  const overlayOpacity = Math.max(0.5 - swipeOffset / 400, 0.2);

  const modalContent = (
    <div
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="presentation"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
      }}
    >
      <div
        ref={modalRef}
        className={`modal modal-${size} ${swipeToDismiss ? 'modal-touch-dismissible' : ''} ${isSwiping ? 'modal-swiping' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        tabIndex={-1}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: swipeOffset > 0 ? `translateY(${swipeOffset}px)` : undefined,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {/* Drag handle for swipe-to-dismiss indication */}
        {swipeToDismiss && (
          <div className="modal-drag-handle" aria-hidden="true" />
        )}
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && (
              <h2 id="modal-title" className="modal-title">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="modal-close"
                aria-label="Close modal"
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
        {description && (
          <p id="modal-description" className="modal-description">
            {description}
          </p>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

Modal.displayName = 'Modal';
