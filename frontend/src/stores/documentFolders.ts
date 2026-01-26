import { create } from 'zustand';
import {
  documentFoldersApi,
  type DocumentFolder,
  type CreateDocumentFolderRequest,
  type UpdateDocumentFolderRequest,
} from '../api/client';

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

  // API actions
  fetchFolders: (accountId: string) => Promise<void>;
  createFolder: (accountId: string, data: CreateDocumentFolderRequest) => Promise<DocumentFolder>;
  updateFolder: (accountId: string, folderId: string, data: UpdateDocumentFolderRequest) => Promise<DocumentFolder>;
  deleteFolder: (accountId: string, folderId: string) => Promise<void>;
  moveDocumentToFolder: (accountId: string, documentId: string, folderId: string | null) => Promise<void>;
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

  // Fetch all folders
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

  // Create a new folder
  createFolder: async (accountId, data) => {
    set({ isLoading: true, error: null });
    try {
      // Check max depth before creating
      if (data.parent_id) {
        const { folders } = get();
        const parentDepth = getFolderDepth(folders, data.parent_id);
        if (parentDepth >= 2) {
          throw new Error('Cannot create folder: maximum nesting depth (3 levels) reached');
        }
      }

      const newFolder = await documentFoldersApi.create(accountId, data);
      set((state) => {
        const folders = [...state.folders, newFolder];
        const folderTree = buildFolderTree(folders);
        return { folders, folderTree, isLoading: false };
      });
      return newFolder;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Update a folder
  updateFolder: async (accountId, folderId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedFolder = await documentFoldersApi.update(accountId, folderId, data);
      set((state) => {
        const folders = state.folders.map((f) =>
          f.id === folderId ? updatedFolder : f
        );
        const folderTree = buildFolderTree(folders);
        return { folders, folderTree, isLoading: false };
      });
      return updatedFolder;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Delete a folder
  deleteFolder: async (accountId, folderId) => {
    set({ isLoading: true, error: null });
    try {
      await documentFoldersApi.delete(accountId, folderId);
      set((state) => {
        // Remove folder and all descendants
        const idsToRemove = new Set<string>([folderId]);
        let foundMore = true;
        while (foundMore) {
          foundMore = false;
          for (const f of state.folders) {
            if (f.parent_id && idsToRemove.has(f.parent_id) && !idsToRemove.has(f.id)) {
              idsToRemove.add(f.id);
              foundMore = true;
            }
          }
        }
        const folders = state.folders.filter((f) => !idsToRemove.has(f.id));
        const folderTree = buildFolderTree(folders);
        const expandedFolderIds = new Set(state.expandedFolderIds);
        for (const id of idsToRemove) {
          expandedFolderIds.delete(id);
        }
        return {
          folders,
          folderTree,
          expandedFolderIds,
          selectedFolderId: idsToRemove.has(state.selectedFolderId || '') ? null : state.selectedFolderId,
          isLoading: false,
        };
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Move document to folder
  moveDocumentToFolder: async (accountId, documentId, folderId) => {
    set({ isLoading: true, error: null });
    try {
      await documentFoldersApi.moveDocument(accountId, documentId, folderId);
      // Update document counts
      set(() => {
        // This would ideally update document counts, but we'd need to know the previous folder
        // For now, just clear loading state - a full refresh would be needed for accurate counts
        return { isLoading: false };
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },

  // Move folder to new parent
  moveFolderToParent: async (accountId, folderId, parentId) => {
    const { folders } = get();

    // Validate: can't move to self
    if (folderId === parentId) {
      set({ error: 'Cannot move folder to itself' });
      return null;
    }

    // Validate: can't move to descendant
    if (parentId && isDescendant(folders, parentId, folderId)) {
      set({ error: 'Cannot move folder to its own descendant' });
      return null;
    }

    // Validate: max depth
    if (wouldExceedMaxDepth(folders, folderId, parentId)) {
      set({ error: 'Cannot move folder: would exceed maximum nesting depth (3 levels)' });
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const updatedFolder = await documentFoldersApi.update(accountId, folderId, { parent_id: parentId });
      set((state) => {
        const folders = state.folders.map((f) =>
          f.id === folderId ? updatedFolder : f
        );
        const folderTree = buildFolderTree(folders);
        return { folders, folderTree, isLoading: false };
      });
      return updatedFolder;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false,
      });
      throw err;
    }
  },
}));

// Re-export types for convenience
export type { DocumentFolder, CreateDocumentFolderRequest, UpdateDocumentFolderRequest };
