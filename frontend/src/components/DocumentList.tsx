/**
 * DocumentList Component
 *
 * Displays documents in a compact list layout with title, date, and word count.
 * Used in the document sidebar when list view is selected.
 */

import { useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState, DocumentIllustration } from './ui/EmptyState';
import { useDocumentPreviewsStore } from '../stores/documentPreviews';
import type { FolderTreeNode } from '../stores/documentFolders';
import './DocumentList.css';

// Icons
const DocumentIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M4 2.5A1.5 1.5 0 015.5 1h4.172a1.5 1.5 0 011.06.44l2.828 2.828a1.5 1.5 0 01.44 1.06V13.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 014 13.5v-11z"
      stroke="currentColor"
      strokeWidth="1.25"
      fill="none"
    />
    <path
      d="M10 1v3.5a1 1 0 001 1h3.5"
      stroke="currentColor"
      strokeWidth="1.25"
      fill="none"
    />
  </svg>
);

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
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
    <circle cx="3" cy="7" r="1" fill="currentColor" />
    <circle cx="7" cy="7" r="1" fill="currentColor" />
    <circle cx="11" cy="7" r="1" fill="currentColor" />
  </svg>
);

const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
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
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.25" />
    <path d="M10 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v6a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.25" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M2.5 4h9M5.5 4V2.5a1 1 0 011-1h1a1 1 0 011 1V4M10 4v7.5a1 1 0 01-1 1H5a1 1 0 01-1-1V4"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface DocumentListProps {
  /** List of folders/documents to display */
  items: FolderTreeNode[];
  /** Whether the component is in loading state */
  isLoading?: boolean;
  /** Check if an item is starred */
  checkIsStarred?: (id: string) => boolean;
  /** Callback when an item is opened */
  onOpen?: (id: string) => void;
  /** Callback to toggle star status */
  onToggleStar?: (id: string, name: string) => void;
  /** Callback to edit a document */
  onEdit?: (id: string, name: string) => void;
  /** Callback to duplicate a document */
  onDuplicate?: (id: string, name: string) => void;
  /** Callback to delete a document */
  onDelete?: (id: string, name: string, documentCount: number) => void;
  /** Callback for context menu */
  onContextMenu?: (id: string, name: string, documentCount: number) => void;
  /** Callback to create a new folder */
  onCreateFolder?: () => void;
  /** Callback when cover image button is clicked */
  onCoverImageClick?: (id: string) => void;
  /** Additional CSS class */
  className?: string;
}

// Animation variants for list view
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.15,
    },
  },
};

// Format date relative to now
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'Just now';
  }
}

// Estimate word count from preview text
function estimateWordCount(preview: string | undefined): number {
  if (!preview) return 0;
  return preview.split(/\s+/).filter(word => word.length > 0).length;
}

interface DocumentListItemProps {
  item: FolderTreeNode;
  isStarred: boolean;
  wordCount: number;
  onOpen?: (id: string) => void;
  onStar?: (id: string, name: string) => void;
  onEdit?: (id: string, name: string) => void;
  onDuplicate?: (id: string, name: string) => void;
  onDelete?: (id: string, name: string, documentCount: number) => void;
  onContextMenu?: (id: string, name: string, documentCount: number) => void;
  onCoverImageClick?: (id: string) => void;
}

const DocumentListItem = memo(function DocumentListItem({
  item,
  isStarred,
  wordCount,
  onOpen,
  onStar,
  onEdit,
  onDuplicate,
  onDelete,
  onContextMenu,
  onCoverImageClick,
}: DocumentListItemProps) {
  const handleClick = useCallback(() => {
    onOpen?.(item.id);
  }, [item.id, onOpen]);

  const handleStarClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onStar?.(item.id, item.name);
    },
    [item.id, item.name, onStar]
  );

  const handleEditClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(item.id, item.name);
    },
    [item.id, item.name, onEdit]
  );

  const handleDuplicateClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDuplicate?.(item.id, item.name);
    },
    [item.id, item.name, onDuplicate]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(item.id, item.name, item.document_count);
    },
    [item.id, item.name, item.document_count, onDelete]
  );

  const handleContextMenuClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onContextMenu?.(item.id, item.name, item.document_count);
    },
    [item.id, item.name, item.document_count, onContextMenu]
  );

  const handleRightClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu?.(item.id, item.name, item.document_count);
    },
    [item.id, item.name, item.document_count, onContextMenu]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const handleCoverImageClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCoverImageClick?.(item.id);
    },
    [item.id, onCoverImageClick]
  );

  return (
    <motion.div
      className={`document-list-item ${isStarred ? 'document-list-item-starred' : ''} ${item.cover_image_url ? 'document-list-item-has-cover' : ''}`}
      variants={itemVariants}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      layout
    >
      <div className="document-list-item-icon">
        {item.cover_image_url ? (
          <div
            className="document-list-item-cover-thumb"
            onClick={onCoverImageClick ? handleCoverImageClick : undefined}
            role={onCoverImageClick ? 'button' : undefined}
            tabIndex={onCoverImageClick ? 0 : undefined}
            title={onCoverImageClick ? 'Change cover' : undefined}
          >
            <img
              src={item.cover_image_url}
              alt=""
              style={{
                objectPosition: item.cover_image_position
                  ? `${item.cover_image_position.x}% ${item.cover_image_position.y}%`
                  : '50% 50%',
              }}
            />
          </div>
        ) : (
          <DocumentIcon />
        )}
      </div>
      <div className="document-list-item-title" title={item.name}>
        {item.name}
      </div>
      <div className="document-list-item-date">
        {formatRelativeDate(item.updated_at)}
      </div>
      <div className="document-list-item-words">
        {wordCount > 0 ? `${wordCount} words` : '-'}
      </div>
      <div className="document-list-item-actions">
        {onEdit && (
          <button
            className="document-list-action-btn"
            onClick={handleEditClick}
            aria-label="Edit document"
            title="Edit"
          >
            <EditIcon />
          </button>
        )}
        {onDuplicate && (
          <button
            className="document-list-action-btn"
            onClick={handleDuplicateClick}
            aria-label="Duplicate document"
            title="Duplicate"
          >
            <DuplicateIcon />
          </button>
        )}
        {onDelete && (
          <button
            className="document-list-action-btn document-list-action-btn-danger"
            onClick={handleDeleteClick}
            aria-label="Delete document"
            title="Delete"
          >
            <DeleteIcon />
          </button>
        )}
        {onStar && (
          <button
            className={`document-list-action-btn ${isStarred ? 'starred' : ''}`}
            onClick={handleStarClick}
            aria-label={isStarred ? 'Remove from favorites' : 'Add to favorites'}
            title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
          >
            <StarIcon filled={isStarred} />
          </button>
        )}
        {onContextMenu && (
          <button
            className="document-list-action-btn"
            onClick={handleContextMenuClick}
            aria-label="More options"
            title="More options"
          >
            <MoreIcon />
          </button>
        )}
      </div>
    </motion.div>
  );
});

function DocumentListComponent({
  items,
  isLoading = false,
  checkIsStarred,
  onOpen,
  onToggleStar,
  onEdit,
  onDuplicate,
  onDelete,
  onContextMenu,
  onCreateFolder,
  onCoverImageClick,
  className = '',
}: DocumentListProps) {
  const previews = useDocumentPreviewsStore((state) => state.previews);

  // Flatten folder tree to get all documents
  const flattenItems = useCallback((nodes: FolderTreeNode[]): FolderTreeNode[] => {
    const result: FolderTreeNode[] = [];

    const traverse = (node: FolderTreeNode) => {
      result.push(node);
      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    nodes.forEach(traverse);
    return result;
  }, []);

  const allItems = useMemo(() => flattenItems(items), [flattenItems, items]);

  // Get word counts from previews
  const getWordCount = useCallback(
    (id: string): number => {
      const preview = previews.get(id);
      return estimateWordCount(preview?.preview);
    },
    [previews]
  );

  if (isLoading && allItems.length === 0) {
    return (
      <div className={`document-list document-list-loading ${className}`}>
        <div className="document-list-loading-skeleton">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="document-list-skeleton-item" />
          ))}
        </div>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className={`document-list document-list-empty ${className}`}>
        <EmptyState
          illustration={<DocumentIllustration />}
          title="No documents yet"
          description="Create your first document to get started."
          action={
            onCreateFolder
              ? {
                  label: 'New Document',
                  onClick: onCreateFolder,
                }
              : undefined
          }
          size="small"
        />
      </div>
    );
  }

  return (
    <div className={`document-list ${className}`}>
      {/* Header */}
      <div className="document-list-header">
        <div className="document-list-header-icon" />
        <div className="document-list-header-title">Title</div>
        <div className="document-list-header-date">Modified</div>
        <div className="document-list-header-words">Words</div>
        <div className="document-list-header-actions" />
      </div>

      {/* Items */}
      <motion.div
        className="document-list-items"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {allItems.map((item) => (
            <DocumentListItem
              key={item.id}
              item={item}
              isStarred={checkIsStarred?.(item.id) ?? false}
              wordCount={getWordCount(item.id)}
              onOpen={onOpen}
              onStar={onToggleStar}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onContextMenu={onContextMenu}
              onCoverImageClick={onCoverImageClick}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// Export memoized component
export const DocumentList = memo(DocumentListComponent);

DocumentList.displayName = 'DocumentList';
