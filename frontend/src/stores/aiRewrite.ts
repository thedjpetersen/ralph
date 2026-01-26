import { create } from 'zustand';

export type RewriteOption = 'shorter' | 'longer' | 'formal' | 'casual' | 'fix-grammar';

export interface RewriteOptionConfig {
  id: RewriteOption;
  label: string;
  description: string;
  shortcut: string;
}

export const REWRITE_OPTIONS: RewriteOptionConfig[] = [
  { id: 'shorter', label: 'Shorter', description: 'Make the text more concise', shortcut: '1' },
  { id: 'longer', label: 'Longer', description: 'Expand with more detail', shortcut: '2' },
  { id: 'formal', label: 'Formal', description: 'Use professional language', shortcut: '3' },
  { id: 'casual', label: 'Casual', description: 'Make it more conversational', shortcut: '4' },
  { id: 'fix-grammar', label: 'Fix Grammar', description: 'Correct grammar and spelling', shortcut: '5' },
];

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

    case 'formal':
      // Make more professional
      return text
        .replace(/\bcan't\b/gi, 'cannot')
        .replace(/\bwon't\b/gi, 'will not')
        .replace(/\bdon't\b/gi, 'do not')
        .replace(/\bdoesn't\b/gi, 'does not')
        .replace(/\bI'm\b/gi, 'I am')
        .replace(/\bit's\b/gi, 'it is')
        .replace(/\bthat's\b/gi, 'that is')
        .replace(/\bthey're\b/gi, 'they are')
        .replace(/\bwe're\b/gi, 'we are')
        .replace(/\byou're\b/gi, 'you are')
        .replace(/\bhey\b/gi, 'Hello')
        .replace(/\bhi\b/gi, 'Hello')
        .replace(/\bthanks\b/gi, 'Thank you')
        .replace(/\bgot\b/gi, 'received')
        .replace(/\bkinda\b/gi, 'somewhat')
        .replace(/\b(awesome|cool|great)\b/gi, 'excellent')
        .trim();

    case 'casual':
      // Make more conversational
      return text
        .replace(/\bcannot\b/gi, "can't")
        .replace(/\bwill not\b/gi, "won't")
        .replace(/\bdo not\b/gi, "don't")
        .replace(/\bdoes not\b/gi, "doesn't")
        .replace(/\bI am\b/gi, "I'm")
        .replace(/\bit is\b/gi, "it's")
        .replace(/\bthat is\b/gi, "that's")
        .replace(/\bthey are\b/gi, "they're")
        .replace(/\bwe are\b/gi, "we're")
        .replace(/\byou are\b/gi, "you're")
        .replace(/\bHello\b/gi, 'Hey')
        .replace(/\bThank you\b/gi, 'Thanks')
        .replace(/\breceived\b/gi, 'got')
        .replace(/\bexcellent\b/gi, 'awesome')
        .replace(/\bRegards\b/gi, 'Cheers')
        .trim();

    case 'fix-grammar':
      // Basic grammar fixes
      return text
        // Capitalize first letter of sentences
        .replace(/(^|[.!?]\s+)([a-z])/g, (_, before, letter) => before + letter.toUpperCase())
        // Remove double spaces
        .replace(/\s{2,}/g, ' ')
        // Fix common issues
        .replace(/\bi\b/g, 'I')
        .replace(/\s+,/g, ',')
        .replace(/\s+\./g, '.')
        .replace(/\s+\?/g, '?')
        .replace(/\s+!/g, '!')
        // Ensure proper spacing after punctuation
        .replace(/([.!?,])([A-Za-z])/g, '$1 $2')
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
      isLoading: false,
      error: null,
    });
  },

  requestRewrite: async (option) => {
    const state = get();
    if (!state.selectedText || state.isLoading) return;

    set({ isLoading: true, error: null, previewText: null });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const rewrittenText = getMockRewrite(state.selectedText, option);

      set({
        previewText: rewrittenText,
        isLoading: false
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to rewrite text',
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
      isLoading: false,
    }));
  },

  cancelRewrite: () => {
    set({
      previewText: null,
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

// Combined hook using individual selectors
export function useAIRewrite() {
  const isActive = useAIRewriteStore(selectIsActive);
  const selectedText = useAIRewriteStore(selectSelectedText);
  const isLoading = useAIRewriteStore(selectIsLoading);
  const previewText = useAIRewriteStore(selectPreviewText);
  const error = useAIRewriteStore(selectError);
  const toolbarPosition = useAIRewriteStore(selectToolbarPosition);

  return {
    isActive,
    selectedText,
    isLoading,
    previewText,
    error,
    toolbarPosition,
  };
}
