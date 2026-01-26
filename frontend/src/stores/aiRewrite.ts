import { create } from 'zustand';

export type RewriteOption = 'shorter' | 'longer' | 'clearer' | 'stronger';

export interface RewriteOptionConfig {
  id: RewriteOption;
  label: string;
  description: string;
  shortcut: string;
}

export const REWRITE_OPTIONS: RewriteOptionConfig[] = [
  { id: 'shorter', label: 'Shorter', description: 'Make the text more concise', shortcut: '1' },
  { id: 'longer', label: 'Longer', description: 'Expand with more detail', shortcut: '2' },
  { id: 'clearer', label: 'Clearer', description: 'Improve clarity and readability', shortcut: '3' },
  { id: 'stronger', label: 'Stronger', description: 'Make it more impactful', shortcut: '4' },
];

export interface GhostPreviewInfo {
  beforeText: string;
  originalText: string;
  replacementText: string;
  afterText: string;
  targetRect: DOMRect;
}

export interface AIRewriteState {
  // Selection info
  isActive: boolean;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  targetElement: HTMLTextAreaElement | HTMLInputElement | null;

  // Rewrite state
  isLoading: boolean;
  previewText: string | null;
  originalText: string;
  error: string | null;

  // Ghost preview info for inline display
  ghostPreviewInfo: GhostPreviewInfo | null;

  // Undo support
  undoStack: { text: string; selectionStart: number; selectionEnd: number }[];

  // Position for floating toolbar
  toolbarPosition: { top: number; left: number } | null;

  // Actions
  showToolbar: (
    selectedText: string,
    selectionStart: number,
    selectionEnd: number,
    element: HTMLTextAreaElement | HTMLInputElement,
    position: { top: number; left: number }
  ) => void;
  hideToolbar: () => void;
  requestRewrite: (option: RewriteOption) => Promise<void>;
  applyRewrite: () => void;
  cancelRewrite: () => void;
  undo: () => boolean;
  clearError: () => void;
}

// Mock rewrite function - in production this would call the AI API
function getMockRewrite(text: string, option: RewriteOption): string {
  switch (option) {
    case 'shorter':
      // Simplify by removing filler words
      return text
        .replace(/\b(very|really|just|quite|basically|actually|literally)\b\s*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim() || text.slice(0, Math.ceil(text.length * 0.7));

    case 'longer': {
      // Expand with more details
      if (text.length < 20) {
        return `${text} - this has been elaborated with additional context and details for clarity.`;
      }
      const words = text.split(' ');
      const midpoint = Math.floor(words.length / 2);
      words.splice(midpoint, 0, 'importantly,');
      return words.join(' ') + ' This provides additional context for better understanding.';
    }

    case 'clearer':
      // Make text clearer and more readable
      return text
        // Fix basic grammar issues first
        .replace(/(^|[.!?]\s+)([a-z])/g, (_, before, letter) => before + letter.toUpperCase())
        .replace(/\s{2,}/g, ' ')
        .replace(/\bi\b/g, 'I')
        // Simplify complex phrases
        .replace(/\bin order to\b/gi, 'to')
        .replace(/\bdue to the fact that\b/gi, 'because')
        .replace(/\bat this point in time\b/gi, 'now')
        .replace(/\bin the event that\b/gi, 'if')
        .replace(/\bwith regard to\b/gi, 'about')
        .replace(/\bprior to\b/gi, 'before')
        .replace(/\bsubsequent to\b/gi, 'after')
        .replace(/\bin spite of the fact that\b/gi, 'although')
        .replace(/\bfor the purpose of\b/gi, 'to')
        .replace(/\bas a result of\b/gi, 'because of')
        .trim();

    case 'stronger':
      // Make text more impactful and confident
      return text
        // Remove hedging language
        .replace(/\bI think\b/gi, '')
        .replace(/\bmaybe\b/gi, '')
        .replace(/\bperhaps\b/gi, '')
        .replace(/\bpossibly\b/gi, '')
        .replace(/\bI believe\b/gi, '')
        .replace(/\bseems to\b/gi, '')
        .replace(/\bkind of\b/gi, '')
        .replace(/\bsort of\b/gi, '')
        .replace(/\ba bit\b/gi, '')
        .replace(/\bsomewhat\b/gi, '')
        // Replace weak words with stronger alternatives
        .replace(/\bgood\b/gi, 'excellent')
        .replace(/\bnice\b/gi, 'outstanding')
        .replace(/\bbad\b/gi, 'unacceptable')
        .replace(/\bimportant\b/gi, 'critical')
        .replace(/\bbig\b/gi, 'significant')
        .replace(/\bhelp\b/gi, 'enable')
        .replace(/\bget\b/gi, 'achieve')
        .replace(/\bmake\b/gi, 'create')
        // Clean up extra spaces from removed words
        .replace(/\s{2,}/g, ' ')
        .replace(/^\s+/, '')
        .trim();

    default:
      return text;
  }
}

export const useAIRewriteStore = create<AIRewriteState>()((set, get) => ({
  // Initial state
  isActive: false,
  selectedText: '',
  selectionStart: 0,
  selectionEnd: 0,
  targetElement: null,
  isLoading: false,
  previewText: null,
  originalText: '',
  error: null,
  ghostPreviewInfo: null,
  undoStack: [],
  toolbarPosition: null,

  showToolbar: (selectedText, selectionStart, selectionEnd, element, position) => {
    set({
      isActive: true,
      selectedText,
      selectionStart,
      selectionEnd,
      targetElement: element,
      toolbarPosition: position,
      previewText: null,
      originalText: selectedText,
      error: null,
      ghostPreviewInfo: null,
    });
  },

  hideToolbar: () => {
    set({
      isActive: false,
      selectedText: '',
      selectionStart: 0,
      selectionEnd: 0,
      targetElement: null,
      toolbarPosition: null,
      previewText: null,
      ghostPreviewInfo: null,
      isLoading: false,
      error: null,
    });
  },

  requestRewrite: async (option) => {
    const state = get();
    if (!state.selectedText || state.isLoading) return;

    set({ isLoading: true, error: null, previewText: null, ghostPreviewInfo: null });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const rewrittenText = getMockRewrite(state.selectedText, option);

      // Build ghost preview info for inline display
      let ghostPreviewInfo: GhostPreviewInfo | null = null;
      if (state.targetElement) {
        const fullText = state.targetElement.value;
        ghostPreviewInfo = {
          beforeText: fullText.slice(0, state.selectionStart),
          originalText: state.selectedText,
          replacementText: rewrittenText,
          afterText: fullText.slice(state.selectionEnd),
          targetRect: state.targetElement.getBoundingClientRect(),
        };
      }

      set({
        previewText: rewrittenText,
        ghostPreviewInfo,
        isLoading: false
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to rewrite text',
        ghostPreviewInfo: null,
      });
    }
  },

  applyRewrite: () => {
    const state = get();
    if (!state.previewText || !state.targetElement) return;

    const element = state.targetElement;
    const currentValue = element.value;

    // Save to undo stack
    const undoEntry = {
      text: currentValue,
      selectionStart: state.selectionStart,
      selectionEnd: state.selectionEnd,
    };

    // Calculate new value
    const newValue =
      currentValue.slice(0, state.selectionStart) +
      state.previewText +
      currentValue.slice(state.selectionEnd);

    // Update the element value
    element.value = newValue;

    // Trigger input event so React state updates
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);

    // Update selection to end of inserted text
    const newSelectionEnd = state.selectionStart + state.previewText.length;
    element.setSelectionRange(newSelectionEnd, newSelectionEnd);
    element.focus();

    set((state) => ({
      undoStack: [...state.undoStack, undoEntry],
      isActive: false,
      selectedText: '',
      selectionStart: 0,
      selectionEnd: 0,
      targetElement: null,
      toolbarPosition: null,
      previewText: null,
      ghostPreviewInfo: null,
      isLoading: false,
    }));
  },

  cancelRewrite: () => {
    set({
      previewText: null,
      ghostPreviewInfo: null,
      isLoading: false,
      error: null,
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return false;

    const lastUndo = state.undoStack[state.undoStack.length - 1];

    // Find the target element (if it still exists in DOM)
    // For now, we'll try to find any textarea/input that was focused
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement)
    ) {
      activeElement.value = lastUndo.text;

      // Trigger input event
      const event = new Event('input', { bubbles: true });
      activeElement.dispatchEvent(event);

      // Restore selection
      activeElement.setSelectionRange(lastUndo.selectionStart, lastUndo.selectionEnd);

      set((state) => ({
        undoStack: state.undoStack.slice(0, -1),
      }));

      return true;
    }

    return false;
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Individual selectors for stable references (avoids infinite loops with useSyncExternalStore)
const selectIsActive = (state: AIRewriteState) => state.isActive;
const selectSelectedText = (state: AIRewriteState) => state.selectedText;
const selectIsLoading = (state: AIRewriteState) => state.isLoading;
const selectPreviewText = (state: AIRewriteState) => state.previewText;
const selectError = (state: AIRewriteState) => state.error;
const selectToolbarPosition = (state: AIRewriteState) => state.toolbarPosition;
const selectGhostPreviewInfo = (state: AIRewriteState) => state.ghostPreviewInfo;
const selectSelectionStart = (state: AIRewriteState) => state.selectionStart;
const selectSelectionEnd = (state: AIRewriteState) => state.selectionEnd;
const selectTargetElement = (state: AIRewriteState) => state.targetElement;

// Combined hook using individual selectors
export function useAIRewrite() {
  const isActive = useAIRewriteStore(selectIsActive);
  const selectedText = useAIRewriteStore(selectSelectedText);
  const isLoading = useAIRewriteStore(selectIsLoading);
  const previewText = useAIRewriteStore(selectPreviewText);
  const error = useAIRewriteStore(selectError);
  const toolbarPosition = useAIRewriteStore(selectToolbarPosition);
  const ghostPreviewInfo = useAIRewriteStore(selectGhostPreviewInfo);
  const selectionStart = useAIRewriteStore(selectSelectionStart);
  const selectionEnd = useAIRewriteStore(selectSelectionEnd);
  const targetElement = useAIRewriteStore(selectTargetElement);

  return {
    isActive,
    selectedText,
    isLoading,
    previewText,
    error,
    toolbarPosition,
    ghostPreviewInfo,
    selectionStart,
    selectionEnd,
    targetElement,
  };
}
