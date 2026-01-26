/**
 * Archived Documents Store
 *
 * Manages archived documents state. Archived documents are removed from the main
 * list but not deleted, allowing users to restore them later.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ArchivedDocument {
  id: string;
  name: string;
  type: 'folder' | 'document';
  archivedAt: number;
  originalFolderId?: string | null;
}

interface ArchivedDocumentsState {
  // State
  archivedDocuments: ArchivedDocument[];
  /** IDs of documents selected for bulk operations */
  selectedIds: Set<string>;
  /** Whether bulk selection mode is active */
  bulkSelectionMode: boolean;
  /** Whether to show archived in sidebar */
  showArchivedSection: boolean;

  // Actions
  archive: (id: string, name: string, type: 'folder' | 'document', originalFolderId?: string | null) => void;
  archiveMultiple: (items: Array<{ id: string; name: string; type: 'folder' | 'document'; originalFolderId?: string | null }>) => void;
  restore: (id: string) => ArchivedDocument | null;
  restoreMultiple: (ids: string[]) => ArchivedDocument[];
  permanentlyDelete: (id: string) => void;
  permanentlyDeleteMultiple: (ids: string[]) => void;
  isArchived: (id: string) => boolean;
  clearArchived: () => void;
  renameArchived: (id: string, newName: string) => void;

  // Bulk selection actions
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleBulkSelectionMode: () => void;
  setBulkSelectionMode: (enabled: boolean) => void;

  // Settings
  setShowArchivedSection: (show: boolean) => void;
}

const MAX_ARCHIVED_DOCUMENTS = 500;

export const useArchivedDocumentsStore = create<ArchivedDocumentsState>()(
  persist(
    (set, get) => ({
      archivedDocuments: [],
      selectedIds: new Set<string>(),
      bulkSelectionMode: false,
      showArchivedSection: true,

      archive: (id, name, type, originalFolderId = null) => {
        const { archivedDocuments } = get();
        const isCurrentlyArchived = archivedDocuments.some(d => d.id === id);

        if (isCurrentlyArchived) {
          return; // Already archived
        }

        const newArchived: ArchivedDocument = {
          id,
          name,
          type,
          archivedAt: Date.now(),
          originalFolderId,
        };

        set({
          archivedDocuments: [newArchived, ...archivedDocuments].slice(0, MAX_ARCHIVED_DOCUMENTS),
        });
      },

      archiveMultiple: (items) => {
        const { archivedDocuments } = get();
        const existingIds = new Set(archivedDocuments.map(d => d.id));

        const newItems = items
          .filter(item => !existingIds.has(item.id))
          .map(item => ({
            id: item.id,
            name: item.name,
            type: item.type,
            archivedAt: Date.now(),
            originalFolderId: item.originalFolderId ?? null,
          }));

        set({
          archivedDocuments: [...newItems, ...archivedDocuments].slice(0, MAX_ARCHIVED_DOCUMENTS),
          selectedIds: new Set<string>(),
          bulkSelectionMode: false,
        });
      },

      restore: (id) => {
        const { archivedDocuments } = get();
        const doc = archivedDocuments.find(d => d.id === id);

        if (!doc) {
          return null;
        }

        set({
          archivedDocuments: archivedDocuments.filter(d => d.id !== id),
        });

        return doc;
      },

      restoreMultiple: (ids) => {
        const { archivedDocuments } = get();
        const idsSet = new Set(ids);
        const restored = archivedDocuments.filter(d => idsSet.has(d.id));

        set({
          archivedDocuments: archivedDocuments.filter(d => !idsSet.has(d.id)),
          selectedIds: new Set<string>(),
          bulkSelectionMode: false,
        });

        return restored;
      },

      permanentlyDelete: (id) => {
        const { archivedDocuments, selectedIds } = get();
        const newSelectedIds = new Set(selectedIds);
        newSelectedIds.delete(id);

        set({
          archivedDocuments: archivedDocuments.filter(d => d.id !== id),
          selectedIds: newSelectedIds,
        });
      },

      permanentlyDeleteMultiple: (ids) => {
        const { archivedDocuments } = get();
        const idsSet = new Set(ids);

        set({
          archivedDocuments: archivedDocuments.filter(d => !idsSet.has(d.id)),
          selectedIds: new Set<string>(),
          bulkSelectionMode: false,
        });
      },

      isArchived: (id) => {
        return get().archivedDocuments.some(d => d.id === id);
      },

      clearArchived: () => {
        set({
          archivedDocuments: [],
          selectedIds: new Set<string>(),
          bulkSelectionMode: false,
        });
      },

      renameArchived: (id, newName) => {
        const { archivedDocuments } = get();
        set({
          archivedDocuments: archivedDocuments.map(d =>
            d.id === id ? { ...d, name: newName } : d
          ),
        });
      },

      // Bulk selection actions
      toggleSelection: (id) => {
        const { selectedIds, archivedDocuments } = get();
        const newSelectedIds = new Set(selectedIds);

        if (newSelectedIds.has(id)) {
          newSelectedIds.delete(id);
        } else {
          // Only allow selecting items that exist in archived
          if (archivedDocuments.some(d => d.id === id)) {
            newSelectedIds.add(id);
          }
        }

        set({ selectedIds: newSelectedIds });
      },

      selectAll: () => {
        const { archivedDocuments } = get();
        set({
          selectedIds: new Set(archivedDocuments.map(d => d.id)),
        });
      },

      deselectAll: () => {
        set({ selectedIds: new Set<string>() });
      },

      toggleBulkSelectionMode: () => {
        const { bulkSelectionMode } = get();
        set({
          bulkSelectionMode: !bulkSelectionMode,
          selectedIds: new Set<string>(),
        });
      },

      setBulkSelectionMode: (enabled) => {
        set({
          bulkSelectionMode: enabled,
          selectedIds: enabled ? get().selectedIds : new Set<string>(),
        });
      },

      setShowArchivedSection: (show) => {
        set({ showArchivedSection: show });
      },
    }),
    {
      name: 'clockzen-archived-documents',
      partialize: (state) => ({
        archivedDocuments: state.archivedDocuments,
        showArchivedSection: state.showArchivedSection,
      }),
    }
  )
);

// Selectors
export const selectArchivedDocuments = (state: ArchivedDocumentsState) => state.archivedDocuments;
export const selectIsArchived = (id: string) => (state: ArchivedDocumentsState) =>
  state.archivedDocuments.some(d => d.id === id);
export const selectSelectedIds = (state: ArchivedDocumentsState) => state.selectedIds;
export const selectBulkSelectionMode = (state: ArchivedDocumentsState) => state.bulkSelectionMode;
export const selectShowArchivedSection = (state: ArchivedDocumentsState) => state.showArchivedSection;
export const selectArchivedCount = (state: ArchivedDocumentsState) => state.archivedDocuments.length;
