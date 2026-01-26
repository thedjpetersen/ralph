import { create } from 'zustand';
import {
  documentFoldersApi,
  type DocumentFolder,
  type CreateDocumentFolderRequest,
  type UpdateDocumentFolderRequest,
} from '../api/client';
import { executeOptimisticMutation, generateMutationId } from './optimistic';
import { toast } from './toast';

export interface FolderTreeNode extends DocumentFolder {
  children: FolderTreeNode[];
}

interface DocumentFoldersState {
  // State
  folders: DocumentFolder[];
  folderTree: FolderTreeNode[];
  expandedFolderIds: Set<string>;
  selectedFolderId: string | null;
  isLoading: boolean;
  error: string | null;

  // Drag state
  draggedFolderId: string | null;
  draggedDocumentId: string | null;
  dropTargetFolderId: string | null;

  // Actions
  setFolders: (folders: DocumentFolder[]) => void;
  setSelectedFolderId: (folderId: string | null) => void;
  toggleFolderExpanded: (folderId: string) => void;
  setFolderExpanded: (folderId: string, expanded: boolean) => void;

  // Drag actions
  setDraggedFolderId: (folderId: string | null) => void;
  setDraggedDocumentId: (documentId: string | null) => void;
  setDropTargetFolderId: (folderId: string | null) => void;

  // API actions (with optimistic updates)
  fetchFolders: (accountId: string) => Promise<void>;
  createFolder: (accountId: string, data: CreateDocumentFolderRequest) => Promise<DocumentFolder | null>;
  updateFolder: (accountId: string, folderId: string, data: UpdateDocumentFolderRequest) => Promise<DocumentFolder | null>;
  deleteFolder: (accountId: string, folderId: string) => Promise<boolean>;
  moveDocumentToFolder: (accountId: string, documentId: string, folderId: string | null) => Promise<boolean>;
  moveFolderToParent: (accountId: string, folderId: string, parentId: string | null) => Promise<DocumentFolder | null>;
}

// Helper to build tree structure from flat list
function buildFolderTree(folders: DocumentFolder[]): FolderTreeNode[] {
  const folderMap = new Map<string, FolderTreeNode>();
  const rootFolders: FolderTreeNode[] = [];

  // First pass: create nodes
  for (const folder of folders) {
    folderMap.set(folder.id, { ...folder, children: [] });
  }

  // Second pass: build tree
  for (const folder of folders) {
    const node = folderMap.get(folder.id)!;
    if (folder.parent_id === null) {
      rootFolders.push(node);
    } else {
      const parent = folderMap.get(folder.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not found, treat as root
        rootFolders.push(node);
      }
    }
  }

  // Sort by position
  const sortByPosition = (a: FolderTreeNode, b: FolderTreeNode) => a.position - b.position;
  rootFolders.sort(sortByPosition);
  for (const node of folderMap.values()) {
    node.children.sort(sortByPosition);
  }

  return rootFolders;
}

// Helper to get folder depth
function getFolderDepth(folders: DocumentFolder[], folderId: string): number {
  const folder = folders.find(f => f.id === folderId);
  if (!folder || folder.parent_id === null) {
    return 0;
  }
  return 1 + getFolderDepth(folders, folder.parent_id);
}

// Helper to check if moving would exceed max depth
function wouldExceedMaxDepth(
  folders: DocumentFolder[],
  folderId: string,
  newParentId: string | null
): boolean {
  const MAX_DEPTH = 2; // 0, 1, 2 = 3 levels

  // Get depth of new parent
  const newParentDepth = newParentId === null ? -1 : getFolderDepth(folders, newParentId);

  // Get the maximum depth of children under the folder being moved
  function getMaxChildDepth(id: string, currentDepth: number): number {
    const children = folders.filter(f => f.parent_id === id);
    if (children.length === 0) {
      return currentDepth;
    }
    return Math.max(...children.map(c => getMaxChildDepth(c.id, currentDepth + 1)));
  }

  const folderSubtreeDepth = getMaxChildDepth(folderId, 0);

  // New depth of the folder would be newParentDepth + 1
  // The deepest child would be at newParentDepth + 1 + folderSubtreeDepth
  const deepestLevel = newParentDepth + 1 + folderSubtreeDepth;

  return deepestLevel > MAX_DEPTH;
}

// Helper to check if a folder is a descendant of another
function isDescendant(folders: DocumentFolder[], folderId: string, potentialAncestorId: string): boolean {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return false;
  if (folder.parent_id === potentialAncestorId) return true;
  if (folder.parent_id === null) return false;
  return isDescendant(folders, folder.parent_id, potentialAncestorId);
}

// Helper to generate optimistic folder ID
function generateOptimisticFolderId(): string {
  return `optimistic-folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useDocumentFoldersStore = create<DocumentFoldersState>()((set, get) => ({
  // Initial state
  folders: [],
  folderTree: [],
  expandedFolderIds: new Set<string>(),
  selectedFolderId: null,
  isLoading: false,
  error: null,

  // Drag state
  draggedFolderId: null,
  draggedDocumentId: null,
  dropTargetFolderId: null,

  // Setters
  setFolders: (folders) => {
    const folderTree = buildFolderTree(folders);
    // Initialize expanded state from folder data
    const expandedFolderIds = new Set<string>();
    for (const folder of folders) {
      if (folder.is_expanded) {
        expandedFolderIds.add(folder.id);
      }
    }
    set({ folders, folderTree, expandedFolderIds });
  },

  setSelectedFolderId: (folderId) => {
    set({ selectedFolderId: folderId });
  },

  toggleFolderExpanded: (folderId) => {
    set((state) => {
      const expandedFolderIds = new Set(state.expandedFolderIds);
      if (expandedFolderIds.has(folderId)) {
        expandedFolderIds.delete(folderId);
      } else {
        expandedFolderIds.add(folderId);
      }
      return { expandedFolderIds };
    });
  },

  setFolderExpanded: (folderId, expanded) => {
    set((state) => {
      const expandedFolderIds = new Set(state.expandedFolderIds);
      if (expanded) {
        expandedFolderIds.add(folderId);
      } else {
        expandedFolderIds.delete(folderId);
      }
      return { expandedFolderIds };
    });
  },

  // Drag actions
  setDraggedFolderId: (folderId) => {
    set({ draggedFolderId: folderId });
  },

  setDraggedDocumentId: (documentId) => {
    set({ draggedDocumentId: documentId });
  },

  setDropTargetFolderId: (folderId) => {
    set({ dropTargetFolderId: folderId });
  },

  // Fetch all folders (no optimistic update needed for reads)
  fetchFolders: async (accountId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await documentFoldersApi.list(accountId);
      const folderTree = buildFolderTree(response.folders);
      // Initialize expanded state from folder data
      const expandedFolderIds = new Set<string>();
      for (const folder of response.folders) {
        if (folder.is_expanded) {
          expandedFolderIds.add(folder.id);
        }
      }
      set({ folders: response.folders, folderTree, expandedFolderIds, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  // Create a new folder with optimistic update
  createFolder: async (accountId, data) => {
    const { folders } = get();

    // Check max depth before creating
    if (data.parent_id) {
      const parentDepth = getFolderDepth(folders, data.parent_id);
      if (parentDepth >= 2) {
        toast.error('Cannot create folder: maximum nesting depth (3 levels) reached');
        return null;
      }
    }

    // Create optimistic folder
    const optimisticId = generateOptimisticFolderId();
    const parentFolder = data.parent_id ? folders.find(f => f.id === data.parent_id) : null;
    const siblingFolders = folders.filter(f => f.parent_id === (data.parent_id || null));

    const optimisticFolder: DocumentFolder = {
      id: optimisticId,
      account_id: accountId,
      name: data.name,
      parent_id: data.parent_id || null,
      level: parentFolder ? parentFolder.level + 1 : 0,
      position: siblingFolders.length,
      document_count: 0,
      is_expanded: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    const optimisticFolders = [...folders, optimisticFolder];
    const optimisticTree = buildFolderTree(optimisticFolders);
    set({ folders: optimisticFolders, folderTree: optimisticTree, error: null });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('folder-create'),
      type: 'folder:create',
      optimisticData: optimisticFolder,
      previousData: folders,
      mutationFn: () => documentFoldersApi.create(accountId, data),
      onSuccess: (newFolder) => {
        // Replace optimistic folder with real one from server
        set((state) => {
          const updatedFolders = state.folders
            .filter(f => f.id !== optimisticId)
            .concat(newFolder);
          const folderTree = buildFolderTree(updatedFolders);
          return { folders: updatedFolders, folderTree };
        });
      },
      onRollback: () => {
        // Restore previous state
        set(() => {
          const folderTree = buildFolderTree(folders);
          return { folders, folderTree };
        });
      },
      errorMessage: 'Failed to create folder',
    });

    return result;
  },

  // Update a folder with optimistic update
  updateFolder: async (accountId, folderId, data) => {
    const { folders } = get();
    const existingFolder = folders.find(f => f.id === folderId);

    if (!existingFolder) {
      toast.error('Folder not found');
      return null;
    }

    // Create optimistic updated folder
    const optimisticFolder: DocumentFolder = {
      ...existingFolder,
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    const optimisticFolders = folders.map(f => f.id === folderId ? optimisticFolder : f);
    const optimisticTree = buildFolderTree(optimisticFolders);
    set({ folders: optimisticFolders, folderTree: optimisticTree, error: null });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('folder-update'),
      type: 'folder:update',
      optimisticData: optimisticFolder,
      previousData: existingFolder,
      mutationFn: () => documentFoldersApi.update(accountId, folderId, data),
      onSuccess: (updatedFolder) => {
        // Apply server response
        set((state) => {
          const updatedFolders = state.folders.map(f => f.id === folderId ? updatedFolder : f);
          const folderTree = buildFolderTree(updatedFolders);
          return { folders: updatedFolders, folderTree };
        });
      },
      onRollback: () => {
        // Restore previous state
        set((state) => {
          const restoredFolders = state.folders.map(f => f.id === folderId ? existingFolder : f);
          const folderTree = buildFolderTree(restoredFolders);
          return { folders: restoredFolders, folderTree };
        });
      },
      errorMessage: 'Failed to update folder',
    });

    return result;
  },

  // Delete a folder with optimistic update
  deleteFolder: async (accountId, folderId) => {
    const { folders, expandedFolderIds, selectedFolderId } = get();

    // Calculate all folders to remove (folder and descendants)
    const idsToRemove = new Set<string>([folderId]);
    let foundMore = true;
    while (foundMore) {
      foundMore = false;
      for (const f of folders) {
        if (f.parent_id && idsToRemove.has(f.parent_id) && !idsToRemove.has(f.id)) {
          idsToRemove.add(f.id);
          foundMore = true;
        }
      }
    }

    // Apply optimistic delete immediately
    const optimisticFolders = folders.filter(f => !idsToRemove.has(f.id));
    const optimisticTree = buildFolderTree(optimisticFolders);
    const optimisticExpandedIds = new Set(expandedFolderIds);
    for (const id of idsToRemove) {
      optimisticExpandedIds.delete(id);
    }
    const optimisticSelectedId = idsToRemove.has(selectedFolderId || '') ? null : selectedFolderId;

    set({
      folders: optimisticFolders,
      folderTree: optimisticTree,
      expandedFolderIds: optimisticExpandedIds,
      selectedFolderId: optimisticSelectedId,
      error: null,
    });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('folder-delete'),
      type: 'folder:delete',
      optimisticData: null,
      previousData: { folders, expandedFolderIds, selectedFolderId },
      mutationFn: () => documentFoldersApi.delete(accountId, folderId),
      onRollback: () => {
        // Restore previous state
        const folderTree = buildFolderTree(folders);
        set({
          folders,
          folderTree,
          expandedFolderIds,
          selectedFolderId,
        });
      },
      errorMessage: 'Failed to delete folder',
    });

    return result !== null;
  },

  // Move document to folder with optimistic update
  moveDocumentToFolder: async (accountId, documentId, folderId) => {
    // For document moves, we don't have full document state here,
    // but we can show immediate feedback via the sync indicator
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('document-move'),
      type: 'document:move',
      optimisticData: { documentId, folderId },
      previousData: { documentId, folderId: null },
      mutationFn: () => documentFoldersApi.moveDocument(accountId, documentId, folderId),
      onRollback: () => {
        // Document state is managed elsewhere; this just shows the error toast
      },
      successMessage: 'Document moved',
      errorMessage: 'Failed to move document',
    });

    return result !== null;
  },

  // Move folder to new parent with optimistic update
  moveFolderToParent: async (accountId, folderId, parentId) => {
    const { folders } = get();

    // Validate: can't move to self
    if (folderId === parentId) {
      toast.error('Cannot move folder to itself');
      return null;
    }

    // Validate: can't move to descendant
    if (parentId && isDescendant(folders, parentId, folderId)) {
      toast.error('Cannot move folder to its own descendant');
      return null;
    }

    // Validate: max depth
    if (wouldExceedMaxDepth(folders, folderId, parentId)) {
      toast.error('Cannot move folder: would exceed maximum nesting depth (3 levels)');
      return null;
    }

    const existingFolder = folders.find(f => f.id === folderId);
    if (!existingFolder) {
      toast.error('Folder not found');
      return null;
    }

    // Calculate new level based on parent
    const parentFolder = parentId ? folders.find(f => f.id === parentId) : null;
    const newLevel = parentFolder ? parentFolder.level + 1 : 0;

    // Create optimistic updated folder
    const optimisticFolder: DocumentFolder = {
      ...existingFolder,
      parent_id: parentId,
      level: newLevel,
      updated_at: new Date().toISOString(),
    };

    // Apply optimistic update immediately
    const optimisticFolders = folders.map(f => f.id === folderId ? optimisticFolder : f);
    const optimisticTree = buildFolderTree(optimisticFolders);
    set({ folders: optimisticFolders, folderTree: optimisticTree, error: null });

    // Execute mutation with rollback
    const result = await executeOptimisticMutation({
      mutationId: generateMutationId('folder-move'),
      type: 'folder:move',
      optimisticData: optimisticFolder,
      previousData: existingFolder,
      mutationFn: () => documentFoldersApi.update(accountId, folderId, { parent_id: parentId }),
      onSuccess: (updatedFolder) => {
        // Apply server response
        set((state) => {
          const updatedFolders = state.folders.map(f => f.id === folderId ? updatedFolder : f);
          const folderTree = buildFolderTree(updatedFolders);
          return { folders: updatedFolders, folderTree };
        });
      },
      onRollback: () => {
        // Restore previous state
        set((state) => {
          const restoredFolders = state.folders.map(f => f.id === folderId ? existingFolder : f);
          const folderTree = buildFolderTree(restoredFolders);
          return { folders: restoredFolders, folderTree };
        });
      },
      successMessage: 'Folder moved',
      errorMessage: 'Failed to move folder',
    });

    return result;
  },
}));

// Re-export types for convenience
export type { DocumentFolder, CreateDocumentFolderRequest, UpdateDocumentFolderRequest };
