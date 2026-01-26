/**
 * DocumentGrid Component
 *
 * Displays documents in a grid layout with thumbnail previews.
 * Used in the document sidebar when grid view is selected.
 */

import { useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentThumbnail } from './DocumentThumbnail';
import { EmptyState, DocumentIllustration } from './ui/EmptyState';
import type { FolderTreeNode } from '../stores/documentFolders';
import './DocumentGrid.css';

// Icons for view toggle
export const GridViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.25" />
    <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.25" />
    <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.25" />
    <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.25" />
  </svg>
);

export const ListViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
);

export interface DocumentGridProps {
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
  /** Callback for context menu */
  onContextMenu?: (id: string, name: string, documentCount: number) => void;
  /** Callback to create a new folder */
  onCreateFolder?: () => void;
  /** Additional CSS class */
  className?: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 30,
    },
  },
};

function DocumentGridComponent({
  items,
  isLoading = false,
  checkIsStarred,
  onOpen,
  onToggleStar,
  onContextMenu,
  onCreateFolder,
  className = '',
}: DocumentGridProps) {
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

  const allItems = flattenItems(items);

  const handleContextMenu = useCallback(
    (id: string, name: string, e: React.MouseEvent) => {
      e.preventDefault();
      const item = allItems.find((i) => i.id === id);
      onContextMenu?.(id, name, item?.document_count ?? 0);
    },
    [allItems, onContextMenu]
  );

  if (isLoading && allItems.length === 0) {
    return (
      <div className={`document-grid document-grid-loading ${className}`}>
        <div className="document-grid-loading-skeleton">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="document-grid-skeleton-item" />
          ))}
        </div>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className={`document-grid document-grid-empty ${className}`}>
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
    <motion.div
      className={`document-grid ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {allItems.map((item) => (
          <motion.div
            key={item.id}
            className="document-grid-item"
            variants={itemVariants}
            layout
          >
            <DocumentThumbnail
              id={item.id}
              name={item.name}
              documentCount={item.document_count}
              isStarred={checkIsStarred?.(item.id) ?? false}
              onOpen={onOpen}
              onStar={onToggleStar}
              onContextMenu={handleContextMenu}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

// Export memoized component
export const DocumentGrid = memo(DocumentGridComponent);

DocumentGrid.displayName = 'DocumentGrid';

// View toggle component
export interface ViewToggleProps {
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="view-toggle" role="radiogroup" aria-label="View mode">
      <button
        className={`view-toggle-btn ${viewMode === 'list' ? 'view-toggle-btn-active' : ''}`}
        onClick={() => onViewModeChange('list')}
        aria-checked={viewMode === 'list'}
        role="radio"
        title="List view"
        aria-label="List view"
      >
        <ListViewIcon />
      </button>
      <button
        className={`view-toggle-btn ${viewMode === 'grid' ? 'view-toggle-btn-active' : ''}`}
        onClick={() => onViewModeChange('grid')}
        aria-checked={viewMode === 'grid'}
        role="radio"
        title="Grid view"
        aria-label="Grid view"
      >
        <GridViewIcon />
      </button>
    </div>
  );
}

ViewToggle.displayName = 'ViewToggle';
