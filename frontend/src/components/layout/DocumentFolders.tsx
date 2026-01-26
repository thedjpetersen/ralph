import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useDocumentFoldersStore, type FolderTreeNode } from '../../stores/documentFolders';
import { useAccountStore } from '../../stores/account';
import { useDocumentExportStore } from '../../stores/documentExport';
import { useDocumentShareStore } from '../../stores/documentShare';
import { useDocumentImportStore } from '../../stores/documentImport';
import { useStarredDocumentsStore, type StarredDocument } from '../../stores/starredDocuments';
import { useDocumentPreviewsStore } from '../../stores/documentPreviews';
import { useContextMenuStore } from '../../stores/contextMenu';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ContextMenu, type ContextMenuItem } from '../ui/ContextMenu';
import { EmptyState, DocumentIllustration } from '../ui/EmptyState';
import { DocumentGrid, ViewToggle } from '../DocumentGrid';
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

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    className={`folder-chevron ${isOpen ? 'open' : ''}`}
    aria-hidden="true"
  >
    <path d="M4 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const MoreIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="3" r="1" fill="currentColor"/>
    <circle cx="7" cy="7" r="1" fill="currentColor"/>
    <circle cx="7" cy="11" r="1" fill="currentColor"/>
  </svg>
);

const ExportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M12 8v4a1 1 0 01-1 1H3a1 1 0 01-1-1V8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 5l3-3 3 3M7 2v8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ImportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M12 8v4a1 1 0 01-1 1H3a1 1 0 01-1-1V8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 5l-3 3-3-3M7 8V0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="10.5" cy="2.5" r="1.75" stroke="currentColor" strokeWidth="1.25"/>
    <circle cx="3.5" cy="7" r="1.75" stroke="currentColor" strokeWidth="1.25"/>
    <circle cx="10.5" cy="11.5" r="1.75" stroke="currentColor" strokeWidth="1.25"/>
    <path d="M5 6l4-2.5M5 8l4 2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
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

interface FolderItemProps {
  folder: FolderTreeNode;
  level: number;
  isCollapsed: boolean;
  onCreateSubfolder: (parentId: string) => void;
  onRename: (folderId: string, name: string) => void;
  onDelete: (folderId: string, folderName: string, documentCount: number) => void;
  onExport: (folderName: string) => void;
  onShare: (folderId: string, folderName: string) => void;
  onDuplicate: (folderId: string, folderName: string) => void;
  onOpen: (folderId: string) => void;
  checkIsStarred?: (folderId: string) => boolean;
  onToggleStar?: (folderId: string, folderName: string) => void;
}

function FolderItem({
  folder,
  level,
  isCollapsed,
  onCreateSubfolder,
  onRename,
  onDelete,
  onExport,
  onShare,
  onDuplicate,
  onOpen,
  checkIsStarred,
  onToggleStar,
}: FolderItemProps) {
  const {
    expandedFolderIds,
    selectedFolderId,
    toggleFolderExpanded,
    setSelectedFolderId,
    draggedFolderId,
    dropTargetFolderId,
    setDraggedFolderId,
    setDropTargetFolderId,
    moveFolderToParent,
    moveDocumentToFolder,
  } = useDocumentFoldersStore();
  const { currentAccount } = useAccountStore();

  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isExpanded = expandedFolderIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children.length > 0;
  const isDragging = draggedFolderId === folder.id;
  const isDropTarget = dropTargetFolderId === folder.id;
  const canHaveChildren = level < 2; // Max 3 levels (0, 1, 2)
  const isStarred = checkIsStarred?.(folder.id) ?? false;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Focus input when editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = useCallback(() => {
    if (!isEditing) {
      setSelectedFolderId(folder.id);
    }
  }, [folder.id, isEditing, setSelectedFolderId]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFolderExpanded(folder.id);
  }, [folder.id, toggleFolderExpanded]);

  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  }, [showMenu]);

  const handleCreateSubfolder = useCallback(() => {
    setShowMenu(false);
    onCreateSubfolder(folder.id);
  }, [folder.id, onCreateSubfolder]);

  const handleRenameClick = useCallback(() => {
    setShowMenu(false);
    setEditName(folder.name);
    setIsEditing(true);
  }, [folder.name]);

  const handleRenameSubmit = useCallback(() => {
    if (editName.trim() && editName.trim() !== folder.name) {
      onRename(folder.id, editName.trim());
    }
    setIsEditing(false);
  }, [editName, folder.id, folder.name, onRename]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(folder.name);
    }
  }, [folder.name, handleRenameSubmit]);

  const handleDeleteClick = useCallback(() => {
    setShowMenu(false);
    onDelete(folder.id, folder.name, folder.document_count);
  }, [folder.id, folder.name, folder.document_count, onDelete]);

  const handleExportClick = useCallback(() => {
    setShowMenu(false);
    onExport(folder.name);
  }, [folder.name, onExport]);

  const handleShareClick = useCallback(() => {
    setShowMenu(false);
    onShare(folder.id, folder.name);
  }, [folder.id, folder.name, onShare]);

  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStar?.(folder.id, folder.name);
  }, [folder.id, folder.name, onToggleStar]);

  // Context menu handler
  const { openDocumentMenu } = useContextMenuStore();

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openDocumentMenu(
      { x: e.clientX, y: e.clientY },
      {
        folderId: folder.id,
        folderName: folder.name,
        documentCount: folder.document_count,
      }
    );
  }, [folder.id, folder.name, folder.document_count, openDocumentMenu]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/folder-id', folder.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedFolderId(folder.id);
  }, [folder.id, setDraggedFolderId]);

  const handleDragEnd = useCallback(() => {
    setDraggedFolderId(null);
    setDropTargetFolderId(null);
  }, [setDraggedFolderId, setDropTargetFolderId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only allow drop if this folder can have children and isn't being dragged
    if (canHaveChildren && !isDragging) {
      e.dataTransfer.dropEffect = 'move';
      setDropTargetFolderId(folder.id);
    }
  }, [canHaveChildren, folder.id, isDragging, setDropTargetFolderId]);

  const handleDragLeave = useCallback(() => {
    setDropTargetFolderId(null);
  }, [setDropTargetFolderId]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetFolderId(null);

    if (!currentAccount) return;

    const folderId = e.dataTransfer.getData('application/folder-id');
    const documentId = e.dataTransfer.getData('application/document-id');

    if (folderId && folderId !== folder.id) {
      // Moving a folder
      await moveFolderToParent(currentAccount.id, folderId, folder.id);
    } else if (documentId) {
      // Moving a document
      await moveDocumentToFolder(currentAccount.id, documentId, folder.id);
    }
  }, [currentAccount, folder.id, moveFolderToParent, moveDocumentToFolder, setDropTargetFolderId]);

  if (isCollapsed) {
    return null;
  }

  return (
    <div className="folder-item-container">
      <div
        className={`folder-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
        style={{ paddingLeft: `${12 + level * 16}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable={!isEditing}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        tabIndex={0}
      >
        <button
          className={`folder-toggle ${hasChildren ? 'has-children' : ''}`}
          onClick={handleToggle}
          aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          tabIndex={-1}
        >
          {hasChildren && <ChevronIcon isOpen={isExpanded} />}
        </button>

        <span className="folder-icon">
          <FolderIcon isOpen={isExpanded && hasChildren} />
        </span>

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="folder-name-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="folder-name"
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleRenameClick();
            }}
          >
            {folder.name}
          </span>
        )}

        {folder.document_count > 0 && (
          <span className="folder-count">{folder.document_count}</span>
        )}

        <div className="folder-actions" ref={menuRef}>
          {onToggleStar && (
            <button
              className={`folder-action-btn folder-star-btn ${isStarred ? 'starred' : ''}`}
              onClick={handleStarClick}
              aria-label={isStarred ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={isStarred}
            >
              <StarIcon filled={isStarred} />
            </button>
          )}
          <button
            className="folder-action-btn"
            onClick={handleMenuClick}
            aria-label="Folder options"
            aria-haspopup="menu"
            aria-expanded={showMenu}
          >
            <MoreIcon />
          </button>

          {showMenu && (
            <div className="folder-menu" role="menu">
              {canHaveChildren && (
                <button
                  className="folder-menu-item"
                  onClick={handleCreateSubfolder}
                  role="menuitem"
                >
                  New subfolder
                </button>
              )}
              <button
                className="folder-menu-item"
                onClick={handleShareClick}
                role="menuitem"
              >
                <ShareIcon />
                Share
              </button>
              <button
                className="folder-menu-item"
                onClick={handleExportClick}
                role="menuitem"
              >
                <ExportIcon />
                Export
              </button>
              <button
                className="folder-menu-item"
                onClick={handleRenameClick}
                role="menuitem"
              >
                Rename
              </button>
              <button
                className="folder-menu-item folder-menu-item-danger"
                onClick={handleDeleteClick}
                role="menuitem"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="folder-children" role="group">
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              isCollapsed={isCollapsed}
              onCreateSubfolder={onCreateSubfolder}
              onRename={onRename}
              onDelete={onDelete}
              onExport={onExport}
              onShare={onShare}
              onDuplicate={onDuplicate}
              onOpen={onOpen}
              checkIsStarred={checkIsStarred}
              onToggleStar={onToggleStar}
            />
          ))}
        </div>
      )}
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
    createFolder,
    updateFolder,
    deleteFolder,
    setDropTargetFolderId,
    draggedFolderId,
    draggedDocumentId,
    dropTargetFolderId,
    moveFolderToParent,
    moveDocumentToFolder,
  } = useDocumentFoldersStore();
  const { openExportDialog } = useDocumentExportStore();
  const { openShareDialog } = useDocumentShareStore();
  const { openImportDialog } = useDocumentImportStore();
  const { starredDocuments, toggleStar, isStarred, renameStarred } = useStarredDocumentsStore();
  const { viewMode, setViewMode } = useDocumentPreviewsStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

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

  // Focus new folder input when creating
  useEffect(() => {
    if (isCreating && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateFolder = useCallback(() => {
    setCreateParentId(null);
    setNewFolderName('');
    setIsCreating(true);
  }, []);

  const handleCreateSubfolder = useCallback((parentId: string) => {
    setCreateParentId(parentId);
    setNewFolderName('');
    setIsCreating(true);
  }, []);

  const handleSubmitNewFolder = useCallback(async () => {
    if (!currentAccount || !newFolderName.trim()) {
      setIsCreating(false);
      return;
    }

    try {
      await createFolder(currentAccount.id, {
        name: newFolderName.trim(),
        parent_id: createParentId,
      });
      setIsCreating(false);
      setNewFolderName('');
      setCreateParentId(null);
    } catch {
      // Error is handled in store
    }
  }, [currentAccount, newFolderName, createParentId, createFolder]);

  const handleNewFolderKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitNewFolder();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewFolderName('');
      setCreateParentId(null);
    }
  }, [handleSubmitNewFolder]);

  const handleRename = useCallback(async (folderId: string, name: string) => {
    if (!currentAccount) return;
    try {
      await updateFolder(currentAccount.id, folderId, { name });
    } catch {
      // Error is handled in store
    }
  }, [currentAccount, updateFolder]);

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

  const handleExport = useCallback((folderName: string) => {
    // Open export dialog with sample document content
    // In a real implementation, this would load the actual document content
    const sampleContent = `This is the content from the "${folderName}" folder.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

This document demonstrates the export functionality which supports:
- PDF format with title and metadata
- Clean Markdown output
- Styled HTML with embedded CSS
- Plain text format

You can export this document to any of these formats using the export dialog.`;

    openExportDialog(sampleContent, {
      title: folderName,
      author: currentAccount?.name || 'Unknown Author',
      createdAt: new Date().toISOString(),
    });
  }, [openExportDialog, currentAccount]);

  const handleShare = useCallback((folderId: string, folderName: string) => {
    openShareDialog(folderId, folderName);
  }, [openShareDialog]);

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

  // Root drop zone for moving to root level
  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggedFolderId || draggedDocumentId) {
      e.dataTransfer.dropEffect = 'move';
      setDropTargetFolderId('root');
    }
  }, [draggedFolderId, draggedDocumentId, setDropTargetFolderId]);

  const handleRootDragLeave = useCallback(() => {
    setDropTargetFolderId(null);
  }, [setDropTargetFolderId]);

  const handleRootDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetFolderId(null);

    if (!currentAccount) return;

    const folderId = e.dataTransfer.getData('application/folder-id');
    const documentId = e.dataTransfer.getData('application/document-id');

    if (folderId) {
      // Moving a folder to root
      await moveFolderToParent(currentAccount.id, folderId, null);
    } else if (documentId) {
      // Moving a document to root (no folder)
      await moveDocumentToFolder(currentAccount.id, documentId, null);
    }
  }, [currentAccount, moveFolderToParent, moveDocumentToFolder, setDropTargetFolderId]);

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

      {/* Grid View */}
      {viewMode === 'grid' && (
        <DocumentGrid
          items={folderTree}
          isLoading={isLoading}
          checkIsStarred={checkIsStarred}
          onOpen={handleOpen}
          onToggleStar={handleToggleStar}
          onContextMenu={(id, name, docCount) => handleDeleteRequest(id, name, docCount)}
          onCreateFolder={handleCreateFolder}
        />
      )}

      {/* List View (Tree) */}
      {viewMode === 'list' && (
        <div
          className={`document-folders-tree ${dropTargetFolderId === 'root' ? 'drop-target' : ''}`}
          role="tree"
          aria-label="Document folders"
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
        >
          {isLoading && folderTree.length === 0 ? (
            <div className="document-folders-loading">Loading...</div>
          ) : folderTree.length === 0 && !isCreating ? (
            <EmptyState
              illustration={<DocumentIllustration />}
              title="Create your first document"
              description="Organize your writing with folders and start creating amazing content."
              action={{
                label: 'New Folder',
                onClick: handleCreateFolder,
              }}
              size="small"
              className="document-folders-empty-state"
            />
          ) : (
            <>
              {folderTree.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  level={0}
                  isCollapsed={isCollapsed}
                  onCreateSubfolder={handleCreateSubfolder}
                  onRename={handleRename}
                  onDelete={handleDeleteRequest}
                  onExport={handleExport}
                  onShare={handleShare}
                  onDuplicate={handleDuplicate}
                  onOpen={handleOpen}
                  checkIsStarred={checkIsStarred}
                  onToggleStar={handleToggleStar}
                />
              ))}
            </>
          )}

          {isCreating && (
            <div
              className="folder-item new-folder"
              style={{ paddingLeft: createParentId ? '28px' : '12px' }}
            >
              <span className="folder-icon">
                <FolderIcon />
              </span>
              <input
                ref={newFolderInputRef}
                type="text"
                className="folder-name-input"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={handleSubmitNewFolder}
                onKeyDown={handleNewFolderKeyDown}
                placeholder="Folder name"
              />
            </div>
          )}
        </div>
      )}

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
