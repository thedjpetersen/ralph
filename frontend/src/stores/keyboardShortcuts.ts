import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ShortcutDefinition {
  id: string;
  keys: {
    mac: string[];
    windows: string[];
  };
  description: string;
  action?: string;
}

export interface ShortcutCategory {
  id: string;
  title: string;
  shortcuts: ShortcutDefinition[];
}

// Detect if user is on Mac
export function isMacOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.toLowerCase().includes('mac') ||
    navigator.userAgent.toLowerCase().includes('mac');
}

// All available keyboard shortcuts organized by category
export const KEYBOARD_SHORTCUTS: ShortcutCategory[] = [
  {
    id: 'general',
    title: 'General',
    shortcuts: [
      {
        id: 'command-palette',
        keys: { mac: ['⌘', 'K'], windows: ['Ctrl', 'K'] },
        description: 'Open command palette',
      },
      {
        id: 'shortcuts-help',
        keys: { mac: ['⌘', '/'], windows: ['Ctrl', '/'] },
        description: 'Show keyboard shortcuts',
      },
      {
        id: 'help',
        keys: { mac: ['?'], windows: ['?'] },
        description: 'Show help dialog',
      },
      {
        id: 'settings',
        keys: { mac: ['⌘', ','], windows: ['Ctrl', ','] },
        description: 'Open settings',
      },
      {
        id: 'search',
        keys: { mac: ['⌘', 'F'], windows: ['Ctrl', 'F'] },
        description: 'Search in document',
      },
      {
        id: 'find-replace',
        keys: { mac: ['⌘', 'H'], windows: ['Ctrl', 'H'] },
        description: 'Find and replace',
      },
      {
        id: 'save',
        keys: { mac: ['⌘', 'S'], windows: ['Ctrl', 'S'] },
        description: 'Save document',
      },
      {
        id: 'close',
        keys: { mac: ['Escape'], windows: ['Escape'] },
        description: 'Close modal or cancel action',
      },
    ],
  },
  {
    id: 'editor',
    title: 'Editor',
    shortcuts: [
      {
        id: 'bold',
        keys: { mac: ['⌘', 'B'], windows: ['Ctrl', 'B'] },
        description: 'Bold text',
      },
      {
        id: 'italic',
        keys: { mac: ['⌘', 'I'], windows: ['Ctrl', 'I'] },
        description: 'Italic text',
      },
      {
        id: 'underline',
        keys: { mac: ['⌘', 'U'], windows: ['Ctrl', 'U'] },
        description: 'Underline text',
      },
      {
        id: 'strikethrough',
        keys: { mac: ['⌘', 'Shift', 'X'], windows: ['Ctrl', 'Shift', 'X'] },
        description: 'Strikethrough text',
      },
      {
        id: 'heading-1',
        keys: { mac: ['⌘', 'Alt', '1'], windows: ['Ctrl', 'Alt', '1'] },
        description: 'Heading 1',
      },
      {
        id: 'heading-2',
        keys: { mac: ['⌘', 'Alt', '2'], windows: ['Ctrl', 'Alt', '2'] },
        description: 'Heading 2',
      },
      {
        id: 'heading-3',
        keys: { mac: ['⌘', 'Alt', '3'], windows: ['Ctrl', 'Alt', '3'] },
        description: 'Heading 3',
      },
      {
        id: 'bullet-list',
        keys: { mac: ['⌘', 'Shift', '8'], windows: ['Ctrl', 'Shift', '8'] },
        description: 'Bullet list',
      },
      {
        id: 'numbered-list',
        keys: { mac: ['⌘', 'Shift', '7'], windows: ['Ctrl', 'Shift', '7'] },
        description: 'Numbered list',
      },
      {
        id: 'blockquote',
        keys: { mac: ['⌘', 'Shift', '.'], windows: ['Ctrl', 'Shift', '.'] },
        description: 'Blockquote',
      },
      {
        id: 'code-block',
        keys: { mac: ['⌘', 'Shift', 'C'], windows: ['Ctrl', 'Shift', 'C'] },
        description: 'Code block',
      },
      {
        id: 'link',
        keys: { mac: ['⌘', 'K'], windows: ['Ctrl', 'K'] },
        description: 'Insert link (when text selected)',
      },
      {
        id: 'undo',
        keys: { mac: ['⌘', 'Z'], windows: ['Ctrl', 'Z'] },
        description: 'Undo',
      },
      {
        id: 'redo',
        keys: { mac: ['⌘', 'Shift', 'Z'], windows: ['Ctrl', 'Y'] },
        description: 'Redo',
      },
      {
        id: 'history',
        keys: { mac: ['⌘', 'Shift', 'H'], windows: ['Ctrl', 'Shift', 'H'] },
        description: 'Show edit history',
      },
      {
        id: 'select-all',
        keys: { mac: ['⌘', 'A'], windows: ['Ctrl', 'A'] },
        description: 'Select all',
      },
      {
        id: 'copy',
        keys: { mac: ['⌘', 'C'], windows: ['Ctrl', 'C'] },
        description: 'Copy',
      },
      {
        id: 'cut',
        keys: { mac: ['⌘', 'X'], windows: ['Ctrl', 'X'] },
        description: 'Cut',
      },
      {
        id: 'paste',
        keys: { mac: ['⌘', 'V'], windows: ['Ctrl', 'V'] },
        description: 'Paste',
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI',
    shortcuts: [
      {
        id: 'ai-suggest',
        keys: { mac: ['⌘', 'J'], windows: ['Ctrl', 'J'] },
        description: 'Get AI suggestions',
      },
      {
        id: 'ai-rewrite',
        keys: { mac: ['⌘', 'Shift', 'R'], windows: ['Ctrl', 'Shift', 'R'] },
        description: 'Rewrite with AI',
      },
      {
        id: 'ai-expand',
        keys: { mac: ['⌘', 'Shift', 'E'], windows: ['Ctrl', 'Shift', 'E'] },
        description: 'Expand with AI',
      },
      {
        id: 'ai-summarize',
        keys: { mac: ['⌘', 'Shift', 'S'], windows: ['Ctrl', 'Shift', 'S'] },
        description: 'Summarize with AI',
      },
      {
        id: 'ai-grammar',
        keys: { mac: ['⌘', 'Shift', 'G'], windows: ['Ctrl', 'Shift', 'G'] },
        description: 'Check grammar with AI',
      },
      {
        id: 'accept-suggestion',
        keys: { mac: ['Tab'], windows: ['Tab'] },
        description: 'Accept AI suggestion',
      },
      {
        id: 'reject-suggestion',
        keys: { mac: ['Escape'], windows: ['Escape'] },
        description: 'Reject AI suggestion',
      },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation',
    shortcuts: [
      {
        id: 'go-home',
        keys: { mac: ['G', 'H'], windows: ['G', 'H'] },
        description: 'Go to home/dashboard',
      },
      {
        id: 'go-documents',
        keys: { mac: ['G', 'D'], windows: ['G', 'D'] },
        description: 'Go to documents',
      },
      {
        id: 'go-settings',
        keys: { mac: ['G', 'S'], windows: ['G', 'S'] },
        description: 'Go to settings',
      },
      {
        id: 'next-document',
        keys: { mac: ['⌘', ']'], windows: ['Ctrl', ']'] },
        description: 'Next document',
      },
      {
        id: 'previous-document',
        keys: { mac: ['⌘', '['], windows: ['Ctrl', '['] },
        description: 'Previous document',
      },
      {
        id: 'focus-next',
        keys: { mac: ['Tab'], windows: ['Tab'] },
        description: 'Focus next element',
      },
      {
        id: 'focus-previous',
        keys: { mac: ['Shift', 'Tab'], windows: ['Shift', 'Tab'] },
        description: 'Focus previous element',
      },
      {
        id: 'toggle-sidebar',
        keys: { mac: ['⌘', '\\'], windows: ['Ctrl', '\\'] },
        description: 'Toggle sidebar',
      },
      {
        id: 'scroll-up',
        keys: { mac: ['↑'], windows: ['↑'] },
        description: 'Scroll up / previous item',
      },
      {
        id: 'scroll-down',
        keys: { mac: ['↓'], windows: ['↓'] },
        description: 'Scroll down / next item',
      },
      {
        id: 'select-item',
        keys: { mac: ['Enter'], windows: ['Enter'] },
        description: 'Select / confirm item',
      },
    ],
  },
];

interface KeyboardShortcutsState {
  isOpen: boolean;
  searchQuery: string;
  activeCategory: string | null;
  platform: 'mac' | 'windows';
  openModal: () => void;
  closeModal: () => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: string | null) => void;
  setPlatform: (platform: 'mac' | 'windows') => void;
  togglePlatform: () => void;
}

export const useKeyboardShortcutsStore = create<KeyboardShortcutsState>()(
  persist(
    (set) => ({
      isOpen: false,
      searchQuery: '',
      activeCategory: null,
      platform: isMacOS() ? 'mac' : 'windows',
      openModal: () => set({ isOpen: true, searchQuery: '' }),
      closeModal: () => set({ isOpen: false, searchQuery: '' }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveCategory: (category) => set({ activeCategory: category }),
      setPlatform: (platform) => set({ platform }),
      togglePlatform: () => set((state) => ({
        platform: state.platform === 'mac' ? 'windows' : 'mac',
      })),
    }),
    {
      name: 'clockzen-keyboard-shortcuts',
      partialize: (state) => ({
        platform: state.platform,
      }),
    }
  )
);

// Helper function to filter shortcuts by search query
export function filterShortcuts(
  categories: ShortcutCategory[],
  query: string,
  platform: 'mac' | 'windows'
): ShortcutCategory[] {
  if (!query.trim()) return categories;

  const lowerQuery = query.toLowerCase().trim();

  return categories
    .map((category) => ({
      ...category,
      shortcuts: category.shortcuts.filter((shortcut) => {
        const descMatch = shortcut.description.toLowerCase().includes(lowerQuery);
        const keysMatch = shortcut.keys[platform]
          .join(' ')
          .toLowerCase()
          .includes(lowerQuery);
        const categoryMatch = category.title.toLowerCase().includes(lowerQuery);
        return descMatch || keysMatch || categoryMatch;
      }),
    }))
    .filter((category) => category.shortcuts.length > 0);
}
