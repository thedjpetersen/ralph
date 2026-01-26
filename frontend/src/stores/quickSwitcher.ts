import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useArchivedDocumentsStore } from './archivedDocuments';

export interface RecentDocument {
  id: string;
  title: string;
  type: 'receipt' | 'transaction' | 'budget' | 'paycheck' | 'document';
  lastEditedAt: number;
  path?: string;
}

interface QuickSwitcherState {
  // UI State
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  /** Whether to include archived documents in search results */
  includeArchived: boolean;

  // Recent documents (persisted)
  recentDocuments: RecentDocument[];

  // Actions
  openSwitcher: () => void;
  closeSwitcher: () => void;
  toggleSwitcher: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  setIncludeArchived: (include: boolean) => void;
  addRecentDocument: (doc: Omit<RecentDocument, 'lastEditedAt'>) => void;
  removeRecentDocument: (id: string) => void;
  clearRecentDocuments: () => void;
  reset: () => void;
}

const MAX_RECENT_DOCUMENTS = 10;

export const useQuickSwitcherStore = create<QuickSwitcherState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOpen: false,
      searchQuery: '',
      selectedIndex: 0,
      includeArchived: false, // Default to excluding archived documents
      recentDocuments: [],

      openSwitcher: () => {
        set({ isOpen: true, searchQuery: '', selectedIndex: 0 });
      },

      closeSwitcher: () => {
        set({ isOpen: false, searchQuery: '', selectedIndex: 0 });
      },

      toggleSwitcher: () => {
        const { isOpen } = get();
        if (isOpen) {
          get().closeSwitcher();
        } else {
          get().openSwitcher();
        }
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query, selectedIndex: 0 });
      },

      setSelectedIndex: (index) => {
        set({ selectedIndex: index });
      },

      setIncludeArchived: (include) => {
        set({ includeArchived: include, selectedIndex: 0 });
      },

      addRecentDocument: (doc) => {
        const { recentDocuments } = get();
        const now = Date.now();

        // Remove if already exists
        const filtered = recentDocuments.filter(d => d.id !== doc.id);

        // Add to front with updated timestamp and limit to max
        const updated = [{ ...doc, lastEditedAt: now }, ...filtered].slice(0, MAX_RECENT_DOCUMENTS);

        set({ recentDocuments: updated });
      },

      removeRecentDocument: (id) => {
        const { recentDocuments } = get();
        set({ recentDocuments: recentDocuments.filter(d => d.id !== id) });
      },

      clearRecentDocuments: () => {
        set({ recentDocuments: [] });
      },

      reset: () => {
        set({
          isOpen: false,
          searchQuery: '',
          selectedIndex: 0,
        });
      },
    }),
    {
      name: 'clockzen-quick-switcher',
      partialize: (state) => ({
        recentDocuments: state.recentDocuments,
        includeArchived: state.includeArchived,
      }),
    }
  )
);

// Selectors
export const selectIsOpen = (state: QuickSwitcherState) => state.isOpen;
export const selectSearchQuery = (state: QuickSwitcherState) => state.searchQuery;
export const selectSelectedIndex = (state: QuickSwitcherState) => state.selectedIndex;
export const selectIncludeArchived = (state: QuickSwitcherState) => state.includeArchived;
export const selectRecentDocuments = (state: QuickSwitcherState) => state.recentDocuments;

/**
 * Returns recent documents filtered by archived status.
 * When includeArchived is false (default), archived documents are excluded.
 */
export const selectFilteredRecentDocuments = (state: QuickSwitcherState) => {
  const { recentDocuments, includeArchived } = state;
  if (includeArchived) {
    return recentDocuments;
  }
  // Filter out archived documents
  const archivedStore = useArchivedDocumentsStore.getState();
  return recentDocuments.filter(doc => !archivedStore.isArchived(doc.id));
};
