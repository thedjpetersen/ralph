import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CommandCategory = 'navigation' | 'documents' | 'ai' | 'settings' | 'actions';

export interface Command {
  id: string;
  label: string;
  category: CommandCategory;
  description?: string;
  icon?: string;
  shortcut?: string;
  keywords?: string[];
  action: () => void;
}

export interface RecentCommand {
  id: string;
  usedAt: number;
}

interface CommandPaletteState {
  // UI State
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;

  // Recent commands (persisted)
  recentCommands: RecentCommand[];

  // Actions
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  addRecentCommand: (commandId: string) => void;
  clearRecentCommands: () => void;
  reset: () => void;
}

const MAX_RECENT_COMMANDS = 5;

export const useCommandPaletteStore = create<CommandPaletteState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOpen: false,
      searchQuery: '',
      selectedIndex: 0,
      recentCommands: [],

      openPalette: () => {
        set({ isOpen: true, searchQuery: '', selectedIndex: 0 });
      },

      closePalette: () => {
        set({ isOpen: false, searchQuery: '', selectedIndex: 0 });
      },

      togglePalette: () => {
        const { isOpen } = get();
        if (isOpen) {
          get().closePalette();
        } else {
          get().openPalette();
        }
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query, selectedIndex: 0 });
      },

      setSelectedIndex: (index) => {
        set({ selectedIndex: index });
      },

      addRecentCommand: (commandId) => {
        const { recentCommands } = get();
        const now = Date.now();

        // Remove if already exists
        const filtered = recentCommands.filter(c => c.id !== commandId);

        // Add to front and limit to max
        const updated = [{ id: commandId, usedAt: now }, ...filtered].slice(0, MAX_RECENT_COMMANDS);

        set({ recentCommands: updated });
      },

      clearRecentCommands: () => {
        set({ recentCommands: [] });
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
      name: 'clockzen-command-palette',
      partialize: (state) => ({
        recentCommands: state.recentCommands,
      }),
    }
  )
);

// Selectors
export const selectIsOpen = (state: CommandPaletteState) => state.isOpen;
export const selectSearchQuery = (state: CommandPaletteState) => state.searchQuery;
export const selectSelectedIndex = (state: CommandPaletteState) => state.selectedIndex;
export const selectRecentCommands = (state: CommandPaletteState) => state.recentCommands;
