import { create } from 'zustand';
import {
  applySmartTypographyToInput,
  isInsideCode,
} from '../utils/smartTypography';

export interface TypographyUndoEntry {
  /** Original text before transformation */
  originalText: string;
  /** Transformed text */
  transformedText: string;
  /** Cursor position after transformation */
  cursorPosition: number;
  /** Original cursor position before transformation */
  originalCursorPosition: number;
}

export interface SmartTypographyState {
  /** Whether smart typography is enabled globally */
  isEnabled: boolean;

  /** Stack of transformations for undo support */
  undoStack: TypographyUndoEntry[];

  /** Previous text value for comparison */
  previousText: string;

  /** Toggle smart typography on/off */
  setEnabled: (enabled: boolean) => void;

  /** Toggle smart typography */
  toggle: () => void;

  /**
   * Process input and apply smart typography if appropriate.
   * Returns the transformed result or null if no transformation was applied.
   */
  processInput: (
    currentText: string,
    cursorPosition: number
  ) => { text: string; cursorPosition: number } | null;

  /**
   * Undo the last typography transformation.
   * Returns the original text and cursor position, or null if nothing to undo.
   */
  undo: () => TypographyUndoEntry | null;

  /**
   * Check if there are undo entries available
   */
  canUndo: () => boolean;

  /**
   * Update the previous text value (call when accepting external changes)
   */
  setPreviousText: (text: string) => void;

  /**
   * Clear the undo stack
   */
  clearUndoStack: () => void;
}

export const useSmartTypographyStore = create<SmartTypographyState>()((set, get) => ({
  isEnabled: true,
  undoStack: [],
  previousText: '',

  setEnabled: (enabled: boolean) => {
    set({ isEnabled: enabled });
  },

  toggle: () => {
    set((state) => ({ isEnabled: !state.isEnabled }));
  },

  processInput: (currentText: string, cursorPosition: number) => {
    const state = get();

    // Don't process if disabled
    if (!state.isEnabled) {
      set({ previousText: currentText });
      return null;
    }

    // Don't process if cursor is in code
    if (isInsideCode(currentText, cursorPosition)) {
      set({ previousText: currentText });
      return null;
    }

    // Apply smart typography
    const result = applySmartTypographyToInput(
      state.previousText,
      currentText,
      cursorPosition
    );

    if (!result) {
      set({ previousText: currentText });
      return null;
    }

    // Save to undo stack
    const undoEntry: TypographyUndoEntry = {
      originalText: currentText,
      transformedText: result.text,
      cursorPosition: result.newCursorPosition,
      originalCursorPosition: cursorPosition,
    };

    set((state) => ({
      undoStack: [...state.undoStack, undoEntry],
      previousText: result.text,
    }));

    return {
      text: result.text,
      cursorPosition: result.newCursorPosition,
    };
  },

  undo: () => {
    const state = get();

    if (state.undoStack.length === 0) {
      return null;
    }

    const lastEntry = state.undoStack[state.undoStack.length - 1];

    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      previousText: lastEntry.originalText,
    }));

    return lastEntry;
  },

  canUndo: () => {
    return get().undoStack.length > 0;
  },

  setPreviousText: (text: string) => {
    set({ previousText: text });
  },

  clearUndoStack: () => {
    set({ undoStack: [] });
  },
}));

// Selectors for stable references
const selectIsEnabled = (state: SmartTypographyState) => state.isEnabled;
const selectCanUndo = (state: SmartTypographyState) => state.undoStack.length > 0;

export function useSmartTypography() {
  const isEnabled = useSmartTypographyStore(selectIsEnabled);
  const canUndo = useSmartTypographyStore(selectCanUndo);
  const { setEnabled, toggle, processInput, undo, clearUndoStack, setPreviousText } =
    useSmartTypographyStore.getState();

  return {
    isEnabled,
    canUndo,
    setEnabled,
    toggle,
    processInput,
    undo,
    clearUndoStack,
    setPreviousText,
  };
}
