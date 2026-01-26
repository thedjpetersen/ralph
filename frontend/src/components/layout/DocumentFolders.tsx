import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentFoldersStore } from '../../stores/documentFolders';
import { useAccountStore } from '../../stores/account';
import { useDocumentImportStore } from '../../stores/documentImport';
import { useStarredDocumentsStore, type StarredDocument } from '../../stores/starredDocuments';
import { useDocumentPreviewsStore } from '../../stores/documentPreviews';
import { useContextMenuStore } from '../../stores/contextMenu';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ContextMenu, type ContextMenuItem } from '../ui/ContextMenu';
import { DocumentGrid, ViewToggle } from '../DocumentGrid';
import { DocumentList } from '../DocumentList';
import { toast } from '../../stores/toast';
import './DocumentFolders.css';

// Icons
const FolderIcon = ({ isOpen }: { isOpen?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    {isOpen ? (
      <path
        d="M2 4.5A1.5 1.5 0 013.5 3h3.172a1.5 1.5 0 011.06.44l.708.707a.5.5 0 00.353.146H12.5A1.5 1.5 0 0114 5.793V11.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z"
        stroke="currentColor"
        strokeWidth="1.25"
        fill="none"
      />
    ) : (
      <path
        d="M2 4.5A1.5 1.5 0 013.5 3h3.172a1.5 1.5 0 011.06.44l.708.707a.5.5 0 00.353.146H12.5A1.5 1.5 0 0114 5.793V11.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11.5v-7z"
        stroke="currentColor"
        strokeWidth="1.25"
        fill="none"
      />
    )}
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const ImportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M12 8v4a1 1 0 01-1 1H3a1 1 0 01-1-1V8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 5l-3 3-3-3M7 8V0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className={`star-icon ${filled ? 'star-icon-filled' : ''}`}>
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

// Context menu icons
const OpenIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2.5 4.5h9M2.5 7h9M2.5 9.5h6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
  </svg>
);

const RenameIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M10.5 1.5l2 2-7 7H3.5v-2l7-7z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DuplicateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.25"/>
    <path d="M10 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v6a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.25"/>
  </svg>
);

const DeleteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2.5 4h9M5.5 4V2.5a1 1 0 011-1h1a1 1 0 011 1V4M10 4v7.5a1 1 0 01-1 1H5a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Document icon for starred documents
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

// Starred Item component for the favorites section
interface StarredItemProps {
  item: StarredDocument;
  onUnstar: (id: string, name: string) => void;
  onRename: (id: string, newName: string) => void;
  isCollapsed: boolean;
}

function StarredItem({ item, onUnstar, onRename, isCollapsed }: StarredItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleUnstar = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUnstar(item.id, item.name);
  }, [item.id, item.name, onUnstar]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(item.name);
    setIsEditing(true);
  }, [item.name]);

  const handleRenameSubmit = useCallback(() => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== item.name) {
      onRename(item.id, trimmedName);
    }
    setIsEditing(false);
  }, [editName, item.id, item.name, onRename]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setEditName(item.name);
    }
  }, [handleRenameSubmit, item.name]);

  if (isCollapsed) {
    return null;
  }

  return (
    <div
      className="starred-item"
      role="listitem"
    >
      <span className="folder-icon starred-item-icon">
        {item.type === 'folder' ? <FolderIcon /> : <DocumentIcon />}
      </span>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="folder-name-input starred-item-input"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={handleRenameKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="starred-item-name"
          onDoubleClick={handleDoubleClick}
        >
          {item.name}
        </span>
      )}
      <button
        className="starred-item-unstar"
        onClick={handleUnstar}
        aria-label={`Remove ${item.name} from favorites`}
      >
        <StarIcon filled />
      </button>
    </div>
  );
}

export interface DocumentFoldersProps {
  isCollapsed?: boolean;
}

export function DocumentFolders({ isCollapsed = false }: DocumentFoldersProps) {
  const { currentAccount } = useAccountStore();
  const {
    folderTree,
    isLoading,
    error,
    fetchFolders,
    deleteFolder,
  } = useDocumentFoldersStore();
  const { openImportDialog } = useDocumentImportStore();
  const { starredDocuments, toggleStar, isStarred, renameStarred } = useStarredDocumentsStore();
  const { viewMode, setViewMode } = useDocumentPreviewsStore();

  // Delete confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string; documentCount: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch folders when account changes
  useEffect(() => {
    if (currentAccount) {
      fetchFolders(currentAccount.id);
    }
  }, [currentAccount, fetchFolders]);

  const handleCreateFolder = useCallback(() => {
    // Placeholder for future folder creation functionality
  }, []);

  const handleDeleteRequest = useCallback((folderId: string, folderName: string, documentCount: number) => {
    setFolderToDelete({ id: folderId, name: folderName, documentCount });
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!currentAccount || !folderToDelete) return;
    setIsDeleting(true);
    try {
      await deleteFolder(currentAccount.id, folderToDelete.id);
      setShowDeleteConfirm(false);
      setFolderToDelete(null);
    } catch {
      // Error is handled in store
    } finally {
      setIsDeleting(false);
    }
  }, [currentAccount, deleteFolder, folderToDelete]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
    setFolderToDelete(null);
  }, []);

  const handleImport = useCallback(() => {
    openImportDialog();
  }, [openImportDialog]);

  const handleToggleStar = useCallback((folderId: string, folderName: string) => {
    toggleStar(folderId, folderName, 'folder');
  }, [toggleStar]);

  const handleRenameStarred = useCallback((id: string, newName: string) => {
    renameStarred(id, newName);
    toast.success(`Renamed to "${newName}"`);
  }, [renameStarred]);

  const checkIsStarred = useCallback((folderId: string) => {
    return isStarred(folderId);
  }, [isStarred]);

  // Context menu handlers
  const handleDuplicate = useCallback((_folderId: string, folderName: string) => {
    // In a real app, this would duplicate the folder
    toast.success(`"${folderName}" duplicated`);
  }, []);

  const handleOpen = useCallback((folderId: string) => {
    // Select and expand the folder
    const { setSelectedFolderId, toggleFolderExpanded, expandedFolderIds } = useDocumentFoldersStore.getState();
    setSelectedFolderId(folderId);
    if (!expandedFolderIds.has(folderId)) {
      toggleFolderExpanded(folderId);
    }
  }, []);

  // Quick action handlers for document cards
  const handleEdit = useCallback((folderId: string) => {
    // Open the document for editing
    handleOpen(folderId);
  }, [handleOpen]);

  const handleQuickDuplicate = useCallback((_folderId: string, folderName: string) => {
    handleDuplicate(_folderId, folderName);
  }, [handleDuplicate]);

  const handleQuickDelete = useCallback((folderId: string, folderName: string, documentCount: number) => {
    handleDeleteRequest(folderId, folderName, documentCount);
  }, [handleDeleteRequest]);

  // Context menu state
  const {
    isOpen: contextMenuOpen,
    menuType,
    position: contextMenuPosition,
    documentData,
    closeMenu
  } = useContextMenuStore();

  // Handle context menu actions
  const handleContextMenuOpen = useCallback(() => {
    if (documentData) {
      handleOpen(documentData.folderId);
    }
    closeMenu();
  }, [documentData, handleOpen, closeMenu]);

  const handleContextMenuRename = useCallback(() => {
    if (documentData) {
      // Trigger a rename prompt via toast - in a real implementation
      // this would focus the rename input for the folder
      toast.info(`Press F2 to rename "${documentData.folderName}"`);
    }
    closeMenu();
  }, [documentData, closeMenu]);

  const handleContextMenuDuplicate = useCallback(() => {
    if (documentData) {
      handleDuplicate(documentData.folderId, documentData.folderName);
    }
    closeMenu();
  }, [documentData, handleDuplicate, closeMenu]);

  const handleContextMenuDelete = useCallback(() => {
    if (documentData) {
      handleDeleteRequest(documentData.folderId, documentData.folderName, documentData.documentCount);
    }
    closeMenu();
  }, [documentData, handleDeleteRequest, closeMenu]);

  // Build context menu items
  const documentContextMenuItems: ContextMenuItem[] = useMemo(() => {
    if (menuType !== 'document' || !documentData) return [];

    return [
      {
        id: 'open',
        label: 'Open',
        icon: <OpenIcon />,
        shortcut: '↵',
        onClick: handleContextMenuOpen,
      },
      {
        id: 'rename',
        label: 'Rename',
        icon: <RenameIcon />,
        shortcut: 'F2',
        onClick: handleContextMenuRename,
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: <DuplicateIcon />,
        shortcut: '⌘D',
        onClick: handleContextMenuDuplicate,
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: <DeleteIcon />,
        shortcut: '⌫',
        danger: true,
        onClick: handleContextMenuDelete,
      },
    ];
  }, [menuType, documentData, handleContextMenuOpen, handleContextMenuRename, handleContextMenuDuplicate, handleContextMenuDelete]);

  if (isCollapsed) {
    return (
      <div className="document-folders document-folders-collapsed">
        <button
          className="document-folders-collapsed-btn"
          title="Documents"
          aria-label="Documents section"
        >
          <FolderIcon />
        </button>
      </div>
    );
  }

  // Get all starred items (both folders and documents)
  const starredItems = starredDocuments;

  return (
    <div className="document-folders">
      {/* Starred Section */}
      {starredItems.length > 0 && (
        <div className="document-folders-starred">
          <div className="document-folders-header">
            <span className="document-folders-title">
              <StarIcon filled /> Favorites
            </span>
          </div>
          <div className="starred-items-list">
            {starredItems.map((starred) => (
              <StarredItem
                key={starred.id}
                item={starred}
                onUnstar={handleToggleStar}
                onRename={handleRenameStarred}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        </div>
      )}

      <div className="document-folders-header">
        <span className="document-folders-title">Documents</span>
        <div className="document-folders-header-actions">
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <button
            className="document-folders-add-btn"
            onClick={handleImport}
            aria-label="Import documents"
            title="Import"
          >
            <ImportIcon />
          </button>
          <button
            className="document-folders-add-btn"
            onClick={handleCreateFolder}
            aria-label="Create new folder"
            title="New folder"
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      {error && (
        <div className="document-folders-error" role="alert">
          {error}
        </div>
      )}

      {/* View Mode Container with smooth transitions */}
      <AnimatePresence mode="wait">
        {/* Grid View */}
        {viewMode === 'grid' && (
          <motion.div
            key="grid-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <DocumentGrid
              items={folderTree}
              isLoading={isLoading}
              checkIsStarred={checkIsStarred}
              onOpen={handleOpen}
              onToggleStar={handleToggleStar}
              onEdit={handleEdit}
              onDuplicate={handleQuickDuplicate}
              onDelete={handleQuickDelete}
              onContextMenu={(id, name, docCount) => handleDeleteRequest(id, name, docCount)}
              onCreateFolder={handleCreateFolder}
            />
          </motion.div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <DocumentList
              items={folderTree}
              isLoading={isLoading}
              checkIsStarred={checkIsStarred}
              onOpen={handleOpen}
              onToggleStar={handleToggleStar}
              onEdit={handleEdit}
              onDuplicate={handleQuickDuplicate}
              onDelete={handleQuickDelete}
              onContextMenu={(id, name, docCount) => handleDeleteRequest(id, name, docCount)}
              onCreateFolder={handleCreateFolder}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete folder confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Folder"
        description={
          folderToDelete
            ? `Are you sure you want to delete "${folderToDelete.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this folder?'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      >
        {folderToDelete && folderToDelete.documentCount > 0 && (
          <p className="confirm-dialog-warning-text">
            This folder contains {folderToDelete.documentCount} document{folderToDelete.documentCount !== 1 ? 's' : ''} that will also be deleted.
          </p>
        )}
      </ConfirmDialog>

      {/* Document context menu */}
      <ContextMenu
        isOpen={contextMenuOpen && menuType === 'document'}
        position={contextMenuPosition}
        items={documentContextMenuItems}
        onClose={closeMenu}
        header={documentData?.folderName}
      />
    </div>
  );
}
