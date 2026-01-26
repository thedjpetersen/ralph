/**
 * LinkPopover Component
 *
 * A popover that appears when clicking a link in the editor.
 * Shows the URL and provides options to edit, open in new tab, or remove the link.
 */

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  useLinkEditStore,
  selectActiveLink,
  selectIsOpen,
  selectIsEditing,
  selectEditedUrl,
  truncateUrl,
  isValidUrl,
  normalizeUrl,
} from '../stores/linkEdit';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './LinkPopover.css';

export interface LinkPopoverProps {
  /** Callback when the URL is updated */
  onUpdateLink?: (originalUrl: string, newUrl: string) => void;
  /** Callback when the link is removed */
  onRemoveLink?: (url: string) => void;
}

export function LinkPopover({ onUpdateLink, onRemoveLink }: LinkPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

  // Store state
  const activeLink = useLinkEditStore(selectActiveLink);
  const isOpen = useLinkEditStore(selectIsOpen);
  const isEditing = useLinkEditStore(selectIsEditing);
  const editedUrl = useLinkEditStore(selectEditedUrl);
  const {
    closePopover,
    startEditing,
    cancelEditing,
    setEditedUrl,
  } = useLinkEditStore();

  // Focus trap for accessibility
  useFocusTrap(popoverRef, {
    isActive: isOpen,
    onEscape: () => {
      if (isEditing) {
        cancelEditing();
      } else {
        closePopover();
      }
    },
    autoFocus: true,
  });

  // Calculate popover position
  const updatePosition = useCallback(() => {
    if (!activeLink || !popoverRef.current) return;

    const { position } = activeLink;
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Position below the link by default
    let top = position.top + position.height + 8;
    let left = position.left + position.width / 2 - popoverRect.width / 2;

    // If popover would go off the bottom, position above
    if (top + popoverRect.height > viewportHeight - 8) {
      top = position.top - popoverRect.height - 8;
    }

    // Constrain horizontally within viewport
    left = Math.max(8, Math.min(left, viewportWidth - popoverRect.width - 8));

    setPopoverPosition({ top, left });
  }, [activeLink]);

  // Update position when popover opens or link changes
  useEffect(() => {
    if (!isOpen) return;

    // Initial position calculation
    requestAnimationFrame(updatePosition);

    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closePopover();
      }
    };

    // Delay adding listener to avoid immediate close from the click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closePopover]);

  // Handle URL input change
  const handleUrlChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setEditedUrl(e.target.value);
    },
    [setEditedUrl]
  );

  // Save the edited URL
  const handleSaveUrl = useCallback(() => {
    if (!activeLink || !isValidUrl(editedUrl)) return;

    const normalizedUrl = normalizeUrl(editedUrl);
    if (normalizedUrl !== activeLink.url && onUpdateLink) {
      onUpdateLink(activeLink.url, normalizedUrl);
    }
    closePopover();
  }, [activeLink, editedUrl, onUpdateLink, closePopover]);

  // Handle URL input keydown
  const handleUrlKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveUrl();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
      }
    },
    [cancelEditing, handleSaveUrl]
  );

  // Open link in new tab
  const handleOpenInNewTab = useCallback(() => {
    if (!activeLink) return;
    window.open(activeLink.url, '_blank', 'noopener,noreferrer');
    closePopover();
  }, [activeLink, closePopover]);

  // Remove the link
  const handleRemoveLink = useCallback(() => {
    if (!activeLink) return;
    if (onRemoveLink) {
      onRemoveLink(activeLink.url);
    }
    closePopover();
  }, [activeLink, onRemoveLink, closePopover]);

  // Don't render if not open
  if (!isOpen || !activeLink) return null;

  const urlIsValid = isValidUrl(editedUrl);

  const popoverContent = (
    <div
      ref={popoverRef}
      className={`link-popover ${isEditing ? 'link-popover-editing' : ''}`}
      style={{
        top: popoverPosition.top,
        left: popoverPosition.left,
      }}
      role="dialog"
      aria-label="Link options"
      tabIndex={-1}
    >
      {isEditing ? (
        // Edit mode
        <div className="link-popover-edit-form">
          <input
            ref={inputRef}
            type="url"
            className={`link-popover-input ${!urlIsValid && editedUrl ? 'link-popover-input-error' : ''}`}
            value={editedUrl}
            onChange={handleUrlChange}
            onKeyDown={handleUrlKeyDown}
            placeholder="Enter URL..."
            aria-label="Link URL"
            aria-invalid={!urlIsValid && editedUrl ? 'true' : undefined}
          />
          <div className="link-popover-edit-actions">
            <button
              type="button"
              className="link-popover-btn link-popover-btn-cancel"
              onClick={cancelEditing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="link-popover-btn link-popover-btn-save"
              onClick={handleSaveUrl}
              disabled={!urlIsValid}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        // View mode
        <>
          <div className="link-popover-url-container">
            <span className="link-popover-url" title={activeLink.url}>
              {truncateUrl(activeLink.url)}
            </span>
          </div>
          <div className="link-popover-actions">
            <button
              type="button"
              className="link-popover-action"
              onClick={startEditing}
              aria-label="Edit link URL"
            >
              <svg
                className="link-popover-icon"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path
                  fillRule="evenodd"
                  d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Edit</span>
            </button>
            <button
              type="button"
              className="link-popover-action"
              onClick={handleOpenInNewTab}
              aria-label="Open link in new tab"
            >
              <svg
                className="link-popover-icon"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
              <span>Open</span>
            </button>
            <button
              type="button"
              className="link-popover-action link-popover-action-danger"
              onClick={handleRemoveLink}
              aria-label="Remove link"
            >
              <svg
                className="link-popover-icon"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Unlink</span>
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Render in portal to avoid z-index issues
  return createPortal(popoverContent, document.body);
}

LinkPopover.displayName = 'LinkPopover';
