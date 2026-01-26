import { useState, useCallback, useRef, useEffect } from 'react';
import { useDocumentFoldersStore, type FolderTreeNode } from '../../stores/documentFolders';
import { useAccountStore } from '../../stores/account';
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

interface FolderItemProps {
  folder: FolderTreeNode;
  level: number;
  isCollapsed: boolean;
  onCreateSubfolder: (parentId: string) => void;
  onRename: (folderId: string, name: string) => void;
  onDelete: (folderId: string) => void;
}

function FolderItem({
  folder,
  level,
  isCollapsed,
  onCreateSubfolder,
  onRename,
  onDelete,
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
    onDelete(folder.id);
  }, [folder.id, onDelete]);

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
          <span className="folder-name">{folder.name}</span>
        )}

        {folder.document_count > 0 && (
          <span className="folder-count">{folder.document_count}</span>
        )}

        <div className="folder-actions" ref={menuRef}>
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

  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

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

  const handleDelete = useCallback(async (folderId: string) => {
    if (!currentAccount) return;
    // Could add confirmation dialog here
    try {
      await deleteFolder(currentAccount.id, folderId);
    } catch {
      // Error is handled in store
    }
  }, [currentAccount, deleteFolder]);

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

  return (
    <div className="document-folders">
      <div className="document-folders-header">
        <span className="document-folders-title">Documents</span>
        <button
          className="document-folders-add-btn"
          onClick={handleCreateFolder}
          aria-label="Create new folder"
          title="New folder"
        >
          <PlusIcon />
        </button>
      </div>

      {error && (
        <div className="document-folders-error" role="alert">
          {error}
        </div>
      )}

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
          <div className="document-folders-empty">
            No folders yet
          </div>
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
                onDelete={handleDelete}
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
    </div>
  );
}
