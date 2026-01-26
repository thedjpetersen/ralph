import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OpenDocument {
  id: string;
  title: string;
  path?: string;
  isModified: boolean;
  openedAt: number;
}

interface OpenDocumentsState {
  // State
  openDocuments: OpenDocument[];
  activeDocumentId: string | null;

  // Actions
  openDocument: (doc: Omit<OpenDocument, 'isModified' | 'openedAt'>) => void;
  closeDocument: (id: string) => void;
  closeAllDocuments: () => void;
  closeOtherDocuments: (id: string) => void;
  setActiveDocument: (id: string | null) => void;
  setDocumentModified: (id: string, isModified: boolean) => void;
  updateDocumentTitle: (id: string, title: string) => void;
  reorderDocuments: (fromIndex: number, toIndex: number) => void;
  getActiveDocument: () => OpenDocument | null;
  getNextDocument: (currentId: string) => OpenDocument | null;
  getPreviousDocument: (currentId: string) => OpenDocument | null;
}

const MAX_OPEN_DOCUMENTS = 20;

export const useOpenDocumentsStore = create<OpenDocumentsState>()(
  persist(
    (set, get) => ({
      // Initial state
      openDocuments: [],
      activeDocumentId: null,

      openDocument: (doc) => {
        const { openDocuments, activeDocumentId } = get();
        const existingIndex = openDocuments.findIndex(d => d.id === doc.id);

        if (existingIndex !== -1) {
          // Document already open, just activate it
          set({ activeDocumentId: doc.id });
          return;
        }

        // Add new document
        const newDoc: OpenDocument = {
          ...doc,
          isModified: false,
          openedAt: Date.now(),
        };

        // Limit number of open documents
        const allDocs = [...openDocuments, newDoc];
        let updatedDocs: OpenDocument[];
        if (allDocs.length > MAX_OPEN_DOCUMENTS) {
          // Close oldest unmodified document
          const unmodifiedIndex = allDocs.findIndex(
            d => !d.isModified && d.id !== activeDocumentId
          );
          if (unmodifiedIndex !== -1) {
            updatedDocs = allDocs.filter((_, i) => i !== unmodifiedIndex);
          } else {
            // If all are modified, remove the oldest
            updatedDocs = allDocs.slice(1);
          }
        } else {
          updatedDocs = allDocs;
        }

        set({
          openDocuments: updatedDocs,
          activeDocumentId: doc.id,
        });
      },

      closeDocument: (id) => {
        const { openDocuments, activeDocumentId } = get();
        const docIndex = openDocuments.findIndex(d => d.id === id);

        if (docIndex === -1) return;

        const updatedDocs = openDocuments.filter(d => d.id !== id);
        let newActiveId = activeDocumentId;

        // If we're closing the active document, switch to another
        if (activeDocumentId === id) {
          if (updatedDocs.length === 0) {
            newActiveId = null;
          } else if (docIndex >= updatedDocs.length) {
            // Was the last tab, activate the new last
            newActiveId = updatedDocs[updatedDocs.length - 1].id;
          } else {
            // Activate the tab that took its place
            newActiveId = updatedDocs[docIndex].id;
          }
        }

        set({
          openDocuments: updatedDocs,
          activeDocumentId: newActiveId,
        });
      },

      closeAllDocuments: () => {
        set({
          openDocuments: [],
          activeDocumentId: null,
        });
      },

      closeOtherDocuments: (id) => {
        const { openDocuments } = get();
        const doc = openDocuments.find(d => d.id === id);

        if (!doc) return;

        set({
          openDocuments: [doc],
          activeDocumentId: id,
        });
      },

      setActiveDocument: (id) => {
        const { openDocuments } = get();
        if (id === null || openDocuments.some(d => d.id === id)) {
          set({ activeDocumentId: id });
        }
      },

      setDocumentModified: (id, isModified) => {
        set((state) => ({
          openDocuments: state.openDocuments.map(d =>
            d.id === id ? { ...d, isModified } : d
          ),
        }));
      },

      updateDocumentTitle: (id, title) => {
        set((state) => ({
          openDocuments: state.openDocuments.map(d =>
            d.id === id ? { ...d, title } : d
          ),
        }));
      },

      reorderDocuments: (fromIndex, toIndex) => {
        set((state) => {
          const docs = [...state.openDocuments];
          const [moved] = docs.splice(fromIndex, 1);
          docs.splice(toIndex, 0, moved);
          return { openDocuments: docs };
        });
      },

      getActiveDocument: () => {
        const { openDocuments, activeDocumentId } = get();
        return openDocuments.find(d => d.id === activeDocumentId) || null;
      },

      getNextDocument: (currentId) => {
        const { openDocuments } = get();
        const currentIndex = openDocuments.findIndex(d => d.id === currentId);
        if (currentIndex === -1 || openDocuments.length <= 1) return null;
        const nextIndex = (currentIndex + 1) % openDocuments.length;
        return openDocuments[nextIndex];
      },

      getPreviousDocument: (currentId) => {
        const { openDocuments } = get();
        const currentIndex = openDocuments.findIndex(d => d.id === currentId);
        if (currentIndex === -1 || openDocuments.length <= 1) return null;
        const prevIndex = (currentIndex - 1 + openDocuments.length) % openDocuments.length;
        return openDocuments[prevIndex];
      },
    }),
    {
      name: 'clockzen-open-documents',
      partialize: (state) => ({
        openDocuments: state.openDocuments,
        activeDocumentId: state.activeDocumentId,
      }),
    }
  )
);

// Selectors
export const selectOpenDocuments = (state: OpenDocumentsState) => state.openDocuments;
export const selectActiveDocumentId = (state: OpenDocumentsState) => state.activeDocumentId;
export const selectHasOpenDocuments = (state: OpenDocumentsState) => state.openDocuments.length > 0;
export const selectHasMultipleDocuments = (state: OpenDocumentsState) => state.openDocuments.length > 1;
