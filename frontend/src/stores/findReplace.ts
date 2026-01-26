import { create } from 'zustand';

export interface Match {
  index: number;
  start: number;
  end: number;
  text: string;
}

export interface FindReplaceState {
  // Dialog state
  isOpen: boolean;

  // Search settings
  searchText: string;
  replaceText: string;
  matchCase: boolean;
  useRegex: boolean;
  wholeWord: boolean;

  // Match tracking
  matches: Match[];
  currentMatchIndex: number;

  // Target element tracking
  targetElement: HTMLTextAreaElement | HTMLInputElement | null;

  // Undo support
  undoStack: { text: string; selectionStart: number; selectionEnd: number }[];

  // Actions
  openDialog: (element?: HTMLTextAreaElement | HTMLInputElement | null) => void;
  closeDialog: () => void;
  setSearchText: (text: string) => void;
  setReplaceText: (text: string) => void;
  toggleMatchCase: () => void;
  toggleUseRegex: () => void;
  toggleWholeWord: () => void;
  findMatches: () => void;
  goToNextMatch: () => void;
  goToPreviousMatch: () => void;
  replaceCurrentMatch: () => void;
  replaceAllMatches: () => void;
  highlightCurrentMatch: () => void;
  setTargetElement: (element: HTMLTextAreaElement | HTMLInputElement | null) => void;
  undo: () => boolean;
}

export const useFindReplaceStore = create<FindReplaceState>()((set, get) => ({
  // Initial state
  isOpen: false,
  searchText: '',
  replaceText: '',
  matchCase: false,
  useRegex: false,
  wholeWord: false,
  matches: [],
  currentMatchIndex: -1,
  targetElement: null,
  undoStack: [],

  openDialog: (element) => {
    // If no element provided, try to find the active element
    let targetElement = element || null;
    if (!targetElement && document.activeElement) {
      if (
        document.activeElement instanceof HTMLTextAreaElement ||
        (document.activeElement instanceof HTMLInputElement &&
          document.activeElement.type === 'text')
      ) {
        targetElement = document.activeElement;
      }
    }

    // Get any currently selected text to pre-fill search
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';

    set({
      isOpen: true,
      targetElement,
      searchText: selectedText || get().searchText,
      matches: [],
      currentMatchIndex: -1,
    });

    // Auto-find if we have search text
    if (selectedText || get().searchText) {
      setTimeout(() => get().findMatches(), 0);
    }
  },

  closeDialog: () => {
    set({
      isOpen: false,
      matches: [],
      currentMatchIndex: -1,
    });
  },

  setSearchText: (text) => {
    set({ searchText: text });
    // Auto-search as user types
    setTimeout(() => get().findMatches(), 0);
  },

  setReplaceText: (text) => {
    set({ replaceText: text });
  },

  toggleMatchCase: () => {
    set((state) => ({ matchCase: !state.matchCase }));
    setTimeout(() => get().findMatches(), 0);
  },

  toggleUseRegex: () => {
    set((state) => ({ useRegex: !state.useRegex }));
    setTimeout(() => get().findMatches(), 0);
  },

  toggleWholeWord: () => {
    set((state) => ({ wholeWord: !state.wholeWord }));
    setTimeout(() => get().findMatches(), 0);
  },

  findMatches: () => {
    const state = get();
    const { targetElement, searchText, matchCase, useRegex, wholeWord } = state;

    if (!targetElement || !searchText) {
      set({ matches: [], currentMatchIndex: -1 });
      return;
    }

    const content = targetElement.value;
    const matches: Match[] = [];

    try {
      let pattern: RegExp;

      if (useRegex) {
        // User-provided regex
        const flags = matchCase ? 'g' : 'gi';
        pattern = new RegExp(searchText, flags);
      } else {
        // Escape special regex characters for literal search
        const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let finalPattern = escapedSearch;

        if (wholeWord) {
          finalPattern = `\\b${escapedSearch}\\b`;
        }

        const flags = matchCase ? 'g' : 'gi';
        pattern = new RegExp(finalPattern, flags);
      }

      let match: RegExpExecArray | null;
      let index = 0;

      while ((match = pattern.exec(content)) !== null) {
        matches.push({
          index,
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
        });
        index++;

        // Prevent infinite loop with zero-width matches
        if (match[0].length === 0) {
          pattern.lastIndex++;
        }

        // Safety limit
        if (matches.length >= 10000) break;
      }
    } catch {
      // Invalid regex - clear matches
      set({ matches: [], currentMatchIndex: -1 });
      return;
    }

    // Set current match index
    let currentMatchIndex = -1;
    if (matches.length > 0) {
      // Find match closest to current cursor position
      const cursorPos = targetElement.selectionStart ?? 0;
      currentMatchIndex = 0;

      for (let i = 0; i < matches.length; i++) {
        if (matches[i].start >= cursorPos) {
          currentMatchIndex = i;
          break;
        }
        // If we've passed all matches, wrap to first
        if (i === matches.length - 1) {
          currentMatchIndex = 0;
        }
      }
    }

    set({ matches, currentMatchIndex });

    // Highlight current match
    if (currentMatchIndex >= 0) {
      get().highlightCurrentMatch();
    }
  },

  goToNextMatch: () => {
    const state = get();
    const { matches, currentMatchIndex } = state;

    if (matches.length === 0) return;

    const nextIndex = (currentMatchIndex + 1) % matches.length;
    set({ currentMatchIndex: nextIndex });
    get().highlightCurrentMatch();
  },

  goToPreviousMatch: () => {
    const state = get();
    const { matches, currentMatchIndex } = state;

    if (matches.length === 0) return;

    const prevIndex = currentMatchIndex <= 0 ? matches.length - 1 : currentMatchIndex - 1;
    set({ currentMatchIndex: prevIndex });
    get().highlightCurrentMatch();
  },

  highlightCurrentMatch: () => {
    const state = get();
    const { targetElement, matches, currentMatchIndex } = state;

    if (!targetElement || currentMatchIndex < 0 || currentMatchIndex >= matches.length) return;

    const match = matches[currentMatchIndex];

    // Set selection to highlight the match
    targetElement.focus();
    targetElement.setSelectionRange(match.start, match.end);

    // Scroll the element to show the selection if needed
    // This is a basic approach - the browser should auto-scroll to selection
  },

  replaceCurrentMatch: () => {
    const state = get();
    const { targetElement, matches, currentMatchIndex, replaceText, undoStack } = state;

    if (!targetElement || currentMatchIndex < 0 || currentMatchIndex >= matches.length) return;

    const match = matches[currentMatchIndex];
    const currentValue = targetElement.value;

    // Save to undo stack
    const undoEntry = {
      text: currentValue,
      selectionStart: targetElement.selectionStart ?? 0,
      selectionEnd: targetElement.selectionEnd ?? 0,
    };

    // Perform replacement
    const newValue =
      currentValue.slice(0, match.start) +
      replaceText +
      currentValue.slice(match.end);

    // Update the element
    targetElement.value = newValue;

    // Trigger input event so React state updates
    const event = new Event('input', { bubbles: true });
    targetElement.dispatchEvent(event);

    // Update cursor position
    const newCursorPos = match.start + replaceText.length;
    targetElement.setSelectionRange(newCursorPos, newCursorPos);

    // Update undo stack
    set({ undoStack: [...undoStack, undoEntry] });

    // Re-find matches after replacement
    setTimeout(() => get().findMatches(), 0);
  },

  replaceAllMatches: () => {
    const state = get();
    const { targetElement, searchText, replaceText, matchCase, useRegex, wholeWord, undoStack } = state;

    if (!targetElement || !searchText) return;

    const currentValue = targetElement.value;

    // Save to undo stack
    const undoEntry = {
      text: currentValue,
      selectionStart: targetElement.selectionStart ?? 0,
      selectionEnd: targetElement.selectionEnd ?? 0,
    };

    try {
      let pattern: RegExp;

      if (useRegex) {
        const flags = matchCase ? 'g' : 'gi';
        pattern = new RegExp(searchText, flags);
      } else {
        const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let finalPattern = escapedSearch;

        if (wholeWord) {
          finalPattern = `\\b${escapedSearch}\\b`;
        }

        const flags = matchCase ? 'g' : 'gi';
        pattern = new RegExp(finalPattern, flags);
      }

      const newValue = currentValue.replace(pattern, replaceText);

      // Update the element
      targetElement.value = newValue;

      // Trigger input event
      const event = new Event('input', { bubbles: true });
      targetElement.dispatchEvent(event);

      // Update undo stack and re-find matches
      set({ undoStack: [...undoStack, undoEntry] });

      setTimeout(() => get().findMatches(), 0);
    } catch {
      // Invalid regex - do nothing
    }
  },

  setTargetElement: (element) => {
    set({ targetElement: element });
    // Re-find matches for new element
    setTimeout(() => get().findMatches(), 0);
  },

  undo: () => {
    const state = get();
    const { undoStack } = state;

    if (undoStack.length === 0) return false;

    const lastUndo = undoStack[undoStack.length - 1];

    // Find the target element
    const activeElement = document.activeElement;
    const targetElement = state.targetElement;
    const element = targetElement || activeElement;

    if (
      element &&
      (element instanceof HTMLTextAreaElement ||
        element instanceof HTMLInputElement)
    ) {
      element.value = lastUndo.text;

      // Trigger input event
      const event = new Event('input', { bubbles: true });
      element.dispatchEvent(event);

      // Restore selection
      element.setSelectionRange(lastUndo.selectionStart, lastUndo.selectionEnd);

      set({ undoStack: undoStack.slice(0, -1) });

      // Re-find matches
      setTimeout(() => get().findMatches(), 0);

      return true;
    }

    return false;
  },
}));

// Individual selectors for stable references
const selectIsOpen = (state: FindReplaceState) => state.isOpen;
const selectSearchText = (state: FindReplaceState) => state.searchText;
const selectReplaceText = (state: FindReplaceState) => state.replaceText;
const selectMatchCase = (state: FindReplaceState) => state.matchCase;
const selectUseRegex = (state: FindReplaceState) => state.useRegex;
const selectWholeWord = (state: FindReplaceState) => state.wholeWord;
const selectMatches = (state: FindReplaceState) => state.matches;
const selectCurrentMatchIndex = (state: FindReplaceState) => state.currentMatchIndex;
const selectTargetElement = (state: FindReplaceState) => state.targetElement;

// Combined hook using individual selectors
export function useFindReplace() {
  const isOpen = useFindReplaceStore(selectIsOpen);
  const searchText = useFindReplaceStore(selectSearchText);
  const replaceText = useFindReplaceStore(selectReplaceText);
  const matchCase = useFindReplaceStore(selectMatchCase);
  const useRegex = useFindReplaceStore(selectUseRegex);
  const wholeWord = useFindReplaceStore(selectWholeWord);
  const matches = useFindReplaceStore(selectMatches);
  const currentMatchIndex = useFindReplaceStore(selectCurrentMatchIndex);
  const targetElement = useFindReplaceStore(selectTargetElement);

  return {
    isOpen,
    searchText,
    replaceText,
    matchCase,
    useRegex,
    wholeWord,
    matches,
    currentMatchIndex,
    targetElement,
  };
}
