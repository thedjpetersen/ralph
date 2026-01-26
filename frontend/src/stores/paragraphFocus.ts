import { create } from 'zustand';

export interface ParagraphFocusState {
  // Whether paragraph focus mode is enabled
  isEnabled: boolean;

  // The target element being monitored (textarea/input)
  targetElement: HTMLTextAreaElement | HTMLInputElement | null;

  // Current paragraph index (0-based)
  currentParagraphIndex: number;

  // Actions
  toggle: () => void;
  enable: () => void;
  disable: () => void;
  setTargetElement: (element: HTMLTextAreaElement | HTMLInputElement | null) => void;
  updateCurrentParagraph: () => void;
}

/**
 * Get the paragraph index based on cursor position
 */
function getParagraphIndexAtCursor(
  text: string,
  cursorPosition: number
): number {
  // Split text into paragraphs by double newlines or single newlines
  // For focus mode, we treat each line as a paragraph for simpler UX
  const beforeCursor = text.slice(0, cursorPosition);
  const paragraphBreaks = beforeCursor.split('\n').length - 1;
  return paragraphBreaks;
}

/**
 * Get all paragraph boundaries in the text
 */
export function getParagraphBoundaries(text: string): { start: number; end: number }[] {
  const paragraphs: { start: number; end: number }[] = [];
  const lines = text.split('\n');
  let currentIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    paragraphs.push({
      start: currentIndex,
      end: currentIndex + line.length,
    });
    currentIndex += line.length + 1; // +1 for the newline character
  }

  return paragraphs;
}

export const useParagraphFocusStore = create<ParagraphFocusState>()((set, get) => ({
  isEnabled: false,
  targetElement: null,
  currentParagraphIndex: 0,

  toggle: () => {
    const state = get();
    if (state.isEnabled) {
      set({ isEnabled: false });
    } else {
      set({ isEnabled: true });
      // Update paragraph on enable
      get().updateCurrentParagraph();
    }
  },

  enable: () => {
    set({ isEnabled: true });
    get().updateCurrentParagraph();
  },

  disable: () => {
    set({ isEnabled: false });
  },

  setTargetElement: (element) => {
    set({ targetElement: element });
    if (element && get().isEnabled) {
      get().updateCurrentParagraph();
    }
  },

  updateCurrentParagraph: () => {
    const { targetElement } = get();
    if (!targetElement) return;

    const cursorPosition = targetElement.selectionStart ?? 0;
    const text = targetElement.value;
    const paragraphIndex = getParagraphIndexAtCursor(text, cursorPosition);

    set({ currentParagraphIndex: paragraphIndex });
  },
}));

// Individual selectors for stable references
const selectIsEnabled = (state: ParagraphFocusState) => state.isEnabled;
const selectTargetElement = (state: ParagraphFocusState) => state.targetElement;
const selectCurrentParagraphIndex = (state: ParagraphFocusState) =>
  state.currentParagraphIndex;

// Combined hook using individual selectors
export function useParagraphFocus() {
  const isEnabled = useParagraphFocusStore(selectIsEnabled);
  const targetElement = useParagraphFocusStore(selectTargetElement);
  const currentParagraphIndex = useParagraphFocusStore(selectCurrentParagraphIndex);

  return {
    isEnabled,
    targetElement,
    currentParagraphIndex,
  };
}
