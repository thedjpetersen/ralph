import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StarredDocument {
  id: string;
  name: string;
  type: 'folder' | 'document';
  starredAt: number;
}

interface StarredDocumentsState {
  // State
  starredDocuments: StarredDocument[];

  // Actions
  toggleStar: (id: string, name: string, type: 'folder' | 'document') => void;
  isStarred: (id: string) => boolean;
  unstar: (id: string) => void;
  clearStarred: () => void;
  renameStarred: (id: string, newName: string) => void;
}

const MAX_STARRED_DOCUMENTS = 50;

export const useStarredDocumentsStore = create<StarredDocumentsState>()(
  persist(
    (set, get) => ({
      starredDocuments: [],

      toggleStar: (id, name, type) => {
        const { starredDocuments } = get();
        const isCurrentlyStarred = starredDocuments.some(d => d.id === id);

        if (isCurrentlyStarred) {
          // Unstar
          set({
            starredDocuments: starredDocuments.filter(d => d.id !== id),
          });
        } else {
          // Star - add to front
          const newStarred: StarredDocument = {
            id,
            name,
            type,
            starredAt: Date.now(),
          };
          set({
            starredDocuments: [newStarred, ...starredDocuments].slice(0, MAX_STARRED_DOCUMENTS),
          });
        }
      },

      isStarred: (id) => {
        return get().starredDocuments.some(d => d.id === id);
      },

      unstar: (id) => {
        const { starredDocuments } = get();
        set({
          starredDocuments: starredDocuments.filter(d => d.id !== id),
        });
      },

      clearStarred: () => {
        set({ starredDocuments: [] });
      },

      renameStarred: (id, newName) => {
        const { starredDocuments } = get();
        set({
          starredDocuments: starredDocuments.map(d =>
            d.id === id ? { ...d, name: newName } : d
          ),
        });
      },
    }),
    {
      name: 'clockzen-starred-documents',
    }
  )
);

// Selectors
export const selectStarredDocuments = (state: StarredDocumentsState) => state.starredDocuments;
export const selectIsStarred = (id: string) => (state: StarredDocumentsState) =>
  state.starredDocuments.some(d => d.id === id);
