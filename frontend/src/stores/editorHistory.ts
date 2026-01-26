/**
 * Editor History Store
 *
 * Comprehensive undo/redo with history visualization.
 * Features:
 * - Full undo/redo stack management
 * - History timeline with descriptions
 * - Jump to any point in history
 * - Preview on hover
 * - Session persistence
 */

import { create } from 'zustand';

/**
 * Types of edits that can be tracked
 */
export type EditType =
  | 'text'
  | 'format'
  | 'block-reorder'
  | 'ai-rewrite'
  | 'ai-suggestion'
  | 'paste'
  | 'cut'
  | 'delete'
  | 'insert'
  | 'initial';

/**
 * A single entry in the history stack
 */
export interface HistoryEntry {
  id: string;
  content: string;
  timestamp: number;
  type: EditType;
  description: string;
  /** Optional preview text for the change */
  preview?: string;
  /** Selection state at the time of the change */
  selectionStart?: number;
  selectionEnd?: number;
}

/**
 * State for the editor history feature
 */
interface EditorHistoryState {
  /** Document ID this history is for */
  documentId: string | null;

  /** Full history stack (all past states) */
  history: HistoryEntry[];

  /** Current position in history (index) */
  currentIndex: number;

  /** Maximum history size */
  maxHistorySize: number;

  /** Whether history panel is open */
  isPanelOpen: boolean;

  /** Entry being previewed (on hover) */
  previewEntryId: string | null;

  /** Actions */
  initializeHistory: (documentId: string, initialContent: string) => void;
  pushState: (content: string, type: EditType, description: string, preview?: string) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  jumpToEntry: (entryId: string) => HistoryEntry | null;
  getEntryContent: (entryId: string) => string | null;
  setPreviewEntry: (entryId: string | null) => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  clearHistory: () => void;
  getCurrentEntry: () => HistoryEntry | null;
  getUndoStack: () => HistoryEntry[];
  getRedoStack: () => HistoryEntry[];
}

/**
 * Generate a unique ID for history entries
 */
function generateId(): string {
  return `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get a description prefix based on edit type
 */
export function getEditTypeLabel(type: EditType): string {
  switch (type) {
    case 'text':
      return 'Text edit';
    case 'format':
      return 'Formatting';
    case 'block-reorder':
      return 'Block reorder';
    case 'ai-rewrite':
      return 'AI rewrite';
    case 'ai-suggestion':
      return 'AI suggestion';
    case 'paste':
      return 'Paste';
    case 'cut':
      return 'Cut';
    case 'delete':
      return 'Delete';
    case 'insert':
      return 'Insert';
    case 'initial':
      return 'Initial state';
    default:
      return 'Edit';
  }
}

/**
 * Get an icon name for edit type
 */
export function getEditTypeIcon(type: EditType): string {
  switch (type) {
    case 'text':
      return 'edit';
    case 'format':
      return 'format';
    case 'block-reorder':
      return 'reorder';
    case 'ai-rewrite':
      return 'ai';
    case 'ai-suggestion':
      return 'ai';
    case 'paste':
      return 'paste';
    case 'cut':
      return 'cut';
    case 'delete':
      return 'delete';
    case 'insert':
      return 'insert';
    case 'initial':
      return 'document';
    default:
      return 'edit';
  }
}

export const useEditorHistoryStore = create<EditorHistoryState>()((set, get) => ({
  // Initial state
  documentId: null,
  history: [],
  currentIndex: -1,
  maxHistorySize: 100,
  isPanelOpen: false,
  previewEntryId: null,

  initializeHistory: (documentId, initialContent) => {
    const initialEntry: HistoryEntry = {
      id: generateId(),
      content: initialContent,
      timestamp: Date.now(),
      type: 'initial',
      description: 'Document opened',
      preview: initialContent.substring(0, 100) + (initialContent.length > 100 ? '...' : ''),
    };

    set({
      documentId,
      history: [initialEntry],
      currentIndex: 0,
      previewEntryId: null,
    });
  },

  pushState: (content, type, description, preview) => {
    const state = get();

    // Don't push if content is the same as current
    const currentEntry = state.history[state.currentIndex];
    if (currentEntry && currentEntry.content === content) {
      return;
    }

    const newEntry: HistoryEntry = {
      id: generateId(),
      content,
      timestamp: Date.now(),
      type,
      description,
      preview: preview || content.substring(0, 100) + (content.length > 100 ? '...' : ''),
    };

    // Truncate any future history if we're not at the end
    const newHistory = state.history.slice(0, state.currentIndex + 1);
    newHistory.push(newEntry);

    // Trim to max size if needed
    const trimmedHistory = newHistory.slice(-state.maxHistorySize);
    const newIndex = trimmedHistory.length - 1;

    set({
      history: trimmedHistory,
      currentIndex: newIndex,
    });
  },

  undo: () => {
    const state = get();
    if (state.currentIndex <= 0) {
      return null;
    }

    const newIndex = state.currentIndex - 1;
    set({ currentIndex: newIndex });

    return state.history[newIndex];
  },

  redo: () => {
    const state = get();
    if (state.currentIndex >= state.history.length - 1) {
      return null;
    }

    const newIndex = state.currentIndex + 1;
    set({ currentIndex: newIndex });

    return state.history[newIndex];
  },

  canUndo: () => {
    const state = get();
    return state.currentIndex > 0;
  },

  canRedo: () => {
    const state = get();
    return state.currentIndex < state.history.length - 1;
  },

  jumpToEntry: (entryId) => {
    const state = get();
    const entryIndex = state.history.findIndex((e) => e.id === entryId);

    if (entryIndex === -1) {
      return null;
    }

    set({ currentIndex: entryIndex });
    return state.history[entryIndex];
  },

  getEntryContent: (entryId) => {
    const state = get();
    const entry = state.history.find((e) => e.id === entryId);
    return entry?.content ?? null;
  },

  setPreviewEntry: (entryId) => {
    set({ previewEntryId: entryId });
  },

  openPanel: () => {
    set({ isPanelOpen: true });
  },

  closePanel: () => {
    set({ isPanelOpen: false, previewEntryId: null });
  },

  togglePanel: () => {
    set((state) => ({
      isPanelOpen: !state.isPanelOpen,
      previewEntryId: state.isPanelOpen ? null : state.previewEntryId,
    }));
  },

  clearHistory: () => {
    set({
      documentId: null,
      history: [],
      currentIndex: -1,
      previewEntryId: null,
    });
  },

  getCurrentEntry: () => {
    const state = get();
    if (state.currentIndex >= 0 && state.currentIndex < state.history.length) {
      return state.history[state.currentIndex];
    }
    return null;
  },

  getUndoStack: () => {
    const state = get();
    return state.history.slice(0, state.currentIndex);
  },

  getRedoStack: () => {
    const state = get();
    return state.history.slice(state.currentIndex + 1);
  },
}));

// Selectors for stable references
export const selectIsPanelOpen = (state: EditorHistoryState) => state.isPanelOpen;
export const selectHistory = (state: EditorHistoryState) => state.history;
export const selectCurrentIndex = (state: EditorHistoryState) => state.currentIndex;
export const selectPreviewEntryId = (state: EditorHistoryState) => state.previewEntryId;
export const selectCanUndo = (state: EditorHistoryState) => state.currentIndex > 0;
export const selectCanRedo = (state: EditorHistoryState) =>
  state.currentIndex < state.history.length - 1;

/**
 * Hook for using editor history with convenience methods
 */
export function useEditorHistory() {
  const history = useEditorHistoryStore(selectHistory);
  const currentIndex = useEditorHistoryStore(selectCurrentIndex);
  const isPanelOpen = useEditorHistoryStore(selectIsPanelOpen);
  const previewEntryId = useEditorHistoryStore(selectPreviewEntryId);
  const canUndo = useEditorHistoryStore(selectCanUndo);
  const canRedo = useEditorHistoryStore(selectCanRedo);

  // Get actions directly from the store
  const initializeHistory = useEditorHistoryStore((s) => s.initializeHistory);
  const pushState = useEditorHistoryStore((s) => s.pushState);
  const undo = useEditorHistoryStore((s) => s.undo);
  const redo = useEditorHistoryStore((s) => s.redo);
  const jumpToEntry = useEditorHistoryStore((s) => s.jumpToEntry);
  const getEntryContent = useEditorHistoryStore((s) => s.getEntryContent);
  const setPreviewEntry = useEditorHistoryStore((s) => s.setPreviewEntry);
  const openPanel = useEditorHistoryStore((s) => s.openPanel);
  const closePanel = useEditorHistoryStore((s) => s.closePanel);
  const togglePanel = useEditorHistoryStore((s) => s.togglePanel);
  const clearHistory = useEditorHistoryStore((s) => s.clearHistory);
  const getCurrentEntry = useEditorHistoryStore((s) => s.getCurrentEntry);
  const getUndoStack = useEditorHistoryStore((s) => s.getUndoStack);
  const getRedoStack = useEditorHistoryStore((s) => s.getRedoStack);

  return {
    history,
    currentIndex,
    isPanelOpen,
    previewEntryId,
    canUndo,
    canRedo,
    currentEntry: history[currentIndex] || null,
    undoStack: history.slice(0, currentIndex),
    redoStack: history.slice(currentIndex + 1),
    initializeHistory,
    pushState,
    undo,
    redo,
    jumpToEntry,
    getEntryContent,
    setPreviewEntry,
    openPanel,
    closePanel,
    togglePanel,
    clearHistory,
    getCurrentEntry,
    getUndoStack,
    getRedoStack,
  };
}
