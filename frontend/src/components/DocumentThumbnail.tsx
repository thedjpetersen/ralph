/**
 * DocumentThumbnail Component
 *
 * Displays a visual thumbnail preview of document content in grid view.
 * Features:
 * - Shows first paragraph preview
 * - Hover expands to show full preview
 * - Updates on save
 * - Fallback for empty documents
 */

import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentPreviewsStore } from '../stores/documentPreviews';
import './DocumentThumbnail.css';

// Icons
const DocumentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M6 3.5A2.5 2.5 0 018.5 1h6.172a2.5 2.5 0 011.768.732l3.828 3.828A2.5 2.5 0 0121 7.328V20.5a2.5 2.5 0 01-2.5 2.5h-10A2.5 2.5 0 016 20.5v-17z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M15 1v5a2 2 0 002 2h5"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M9 13h6M9 17h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const EmptyDocumentIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path
      d="M8 4.5A2.5 2.5 0 0110.5 2h8.172a2.5 2.5 0 011.768.732l4.828 4.828A2.5 2.5 0 0126 9.328V27.5a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 018 27.5v-23z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      opacity="0.5"
    />
    <path
      d="M19 2v6a2 2 0 002 2h6"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      opacity="0.5"
    />
    <path
      d="M12 17h8M12 21h5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.3"
    />
  </svg>
);

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M7 1l1.854 3.854 4.146.602-3 2.927.708 4.117L7 10.5l-3.708 2-0.708-4.117-3-2.927 4.146-.602L7 1z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={filled ? 'currentColor' : 'none'}
    />
  </svg>
);

const MoreIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="3" r="1" fill="currentColor" />
    <circle cx="7" cy="7" r="1" fill="currentColor" />
    <circle cx="7" cy="11" r="1" fill="currentColor" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M10.5 1.5l2 2-7 7H3.5v-2l7-7z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DuplicateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.25" />
    <path d="M10 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v6a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.25" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M2.5 4h9M5.5 4V2.5a1 1 0 011-1h1a1 1 0 011 1V4M10 4v7.5a1 1 0 01-1 1H5a1 1 0 01-1-1V4"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface DocumentThumbnailProps {
  id: string;
  name: string;
  documentCount?: number;
  isStarred?: boolean;
  onOpen?: (id: string) => void;
  onStar?: (id: string, name: string) => void;
  onEdit?: (id: string, name: string) => void;
  onDuplicate?: (id: string, name: string) => void;
  onDelete?: (id: string, name: string, documentCount: number) => void;
  onContextMenu?: (id: string, name: string, e: React.MouseEvent) => void;
}

function DocumentThumbnailComponent({
  id,
  name,
  documentCount = 0,
  isStarred = false,
  onOpen,
  onStar,
  onEdit,
  onDuplicate,
  onDelete,
  onContextMenu,
}: DocumentThumbnailProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showExpandedPreview, setShowExpandedPreview] = useState(false);
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const [showActionsFromLongPress, setShowActionsFromLongPress] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const preview = useDocumentPreviewsStore((state) => state.getPreview(id));

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
      if (longPressTimeoutRef.current) {
        window.clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // Capture card position when hover starts
    if (cardRef.current) {
      setCardRect(cardRef.current.getBoundingClientRect());
    }
    // Show expanded preview after a short delay
    hoverTimeoutRef.current = window.setTimeout(() => {
      setShowExpandedPreview(true);
    }, 500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowExpandedPreview(false);
    setCardRect(null);
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleStarClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onStar?.(id, name);
    },
    [id, name, onStar]
  );

  const handleContextMenuClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onContextMenu?.(id, name, e);
    },
    [id, name, onContextMenu]
  );

  const handleRightClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu?.(id, name, e);
    },
    [id, name, onContextMenu]
  );

  const handleEditClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(id, name);
    },
    [id, name, onEdit]
  );

  const handleDuplicateClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDuplicate?.(id, name);
    },
    [id, name, onDuplicate]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(id, name, documentCount);
    },
    [id, name, documentCount, onDelete]
  );

  // Touch long-press handlers
  const handleTouchStart = useCallback(() => {
    longPressTimeoutRef.current = window.setTimeout(() => {
      setShowActionsFromLongPress(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  // Close actions when clicking outside on touch devices
  const handleCardClick = useCallback(() => {
    if (showActionsFromLongPress) {
      setShowActionsFromLongPress(false);
      return;
    }
    onOpen?.(id);
  }, [id, onOpen, showActionsFromLongPress]);

  const hasPreview = preview && preview.preview.length > 0;
  const showActions = isHovered || showActionsFromLongPress;

  // Calculate card position for expanded preview
  const expandedPreviewPosition = useMemo(() => {
    if (!cardRect || !showExpandedPreview) return null;

    const viewportWidth = window.innerWidth;

    // Position the expanded preview to the right if there's space, otherwise to the left
    const expandedWidth = 300;
    const showOnRight = cardRect.right + expandedWidth + 16 < viewportWidth;

    return {
      top: cardRect.top,
      left: showOnRight ? cardRect.right + 8 : cardRect.left - expandedWidth - 8,
    };
  }, [cardRect, showExpandedPreview]);

  return (
    <>
      <motion.div
        ref={cardRef}
        className={`document-thumbnail ${isHovered ? 'document-thumbnail-hovered' : ''} ${isStarred ? 'document-thumbnail-starred' : ''}`}
        onClick={handleCardClick}
        onContextMenu={handleRightClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen?.(id);
          }
        }}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
      >
        {/* Thumbnail Preview Area */}
        <div className="document-thumbnail-preview">
          {hasPreview ? (
            <div className="document-thumbnail-content">
              <p className="document-thumbnail-text">{preview.preview}</p>
            </div>
          ) : (
            <div className="document-thumbnail-empty">
              <EmptyDocumentIcon />
              <span className="document-thumbnail-empty-text">Empty document</span>
            </div>
          )}
        </div>

        {/* Document Info */}
        <div className="document-thumbnail-info">
          <div className="document-thumbnail-icon">
            <DocumentIcon />
          </div>
          <div className="document-thumbnail-details">
            <span className="document-thumbnail-name" title={name}>
              {name}
            </span>
            {documentCount > 0 && (
              <span className="document-thumbnail-count">
                {documentCount} item{documentCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={`document-thumbnail-actions ${showActions ? 'document-thumbnail-actions-visible' : ''}`}>
          {onEdit && (
            <button
              className="document-thumbnail-action-btn"
              onClick={handleEditClick}
              aria-label="Edit document"
              title="Edit"
            >
              <EditIcon />
            </button>
          )}
          {onDuplicate && (
            <button
              className="document-thumbnail-action-btn"
              onClick={handleDuplicateClick}
              aria-label="Duplicate document"
              title="Duplicate"
            >
              <DuplicateIcon />
            </button>
          )}
          {onDelete && (
            <button
              className="document-thumbnail-action-btn document-thumbnail-action-btn-danger"
              onClick={handleDeleteClick}
              aria-label="Delete document"
              title="Delete"
            >
              <DeleteIcon />
            </button>
          )}
          {onStar && (
            <button
              className={`document-thumbnail-action-btn ${isStarred ? 'starred' : ''}`}
              onClick={handleStarClick}
              aria-label={isStarred ? 'Remove from favorites' : 'Add to favorites'}
              title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
            >
              <StarIcon filled={isStarred} />
            </button>
          )}
          {onContextMenu && (
            <button
              className="document-thumbnail-action-btn"
              onClick={handleContextMenuClick}
              aria-label="More options"
              title="More options"
            >
              <MoreIcon />
            </button>
          )}
        </div>

        {/* Starred indicator */}
        {isStarred && (
          <div className="document-thumbnail-star-badge">
            <StarIcon filled />
          </div>
        )}
      </motion.div>

      {/* Expanded Preview Portal */}
      <AnimatePresence>
        {showExpandedPreview && hasPreview && expandedPreviewPosition && (
          <motion.div
            className="document-thumbnail-expanded-preview"
            style={{
              position: 'fixed',
              top: expandedPreviewPosition.top,
              left: expandedPreviewPosition.left,
            }}
            initial={{ opacity: 0, scale: 0.9, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            <div className="document-thumbnail-expanded-header">
              <DocumentIcon />
              <span className="document-thumbnail-expanded-title">{name}</span>
            </div>
            <div className="document-thumbnail-expanded-content">
              {preview?.preview}
            </div>
            <div className="document-thumbnail-expanded-footer">
              <span className="document-thumbnail-expanded-hint">
                Click to open
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Export memoized version for performance
export const DocumentThumbnail = memo(DocumentThumbnailComponent);

DocumentThumbnail.displayName = 'DocumentThumbnail';
