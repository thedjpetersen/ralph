import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

  // Recent documents (persisted)
  recentDocuments: RecentDocument[];

  // Actions
  openSwitcher: () => void;
  closeSwitcher: () => void;
  toggleSwitcher: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
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
      }),
    }
  )
);

// Selectors
export const selectIsOpen = (state: QuickSwitcherState) => state.isOpen;
export const selectSearchQuery = (state: QuickSwitcherState) => state.searchQuery;
export const selectSelectedIndex = (state: QuickSwitcherState) => state.selectedIndex;
export const selectRecentDocuments = (state: QuickSwitcherState) => state.recentDocuments;
