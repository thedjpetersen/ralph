import { create } from 'zustand';

export type CombineStrategy = 'conjunction' | 'semicolon' | 'comma' | 'relative';

export interface CombineStrategyConfig {
  id: CombineStrategy;
  label: string;
  description: string;
  shortcut: string;
}

export const COMBINE_STRATEGIES: CombineStrategyConfig[] = [
  { id: 'conjunction', label: 'Conjunction', description: 'Connect with and, but, or so', shortcut: '1' },
  { id: 'semicolon', label: 'Semicolon', description: 'Join with semicolon for related ideas', shortcut: '2' },
  { id: 'comma', label: 'Comma Splice', description: 'Merge with comma and connector', shortcut: '3' },
  { id: 'relative', label: 'Relative Clause', description: 'Use which, that, or who', shortcut: '4' },
];

export interface GhostCombinePreviewInfo {
  beforeText: string;
  originalText: string;
  replacementText: string;
  afterText: string;
  targetRect: DOMRect;
}

export interface SentenceInfo {
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface AISentenceCombinerState {
  // Selection info
  isActive: boolean;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  targetElement: HTMLTextAreaElement | HTMLInputElement | null;

  // Detected sentences
  sentences: SentenceInfo[];

  // Combining state
  isLoading: boolean;
  previewText: string | null;
  originalText: string;
  error: string | null;
  selectedStrategy: CombineStrategy | null;

  // Ghost preview info for inline display
  ghostPreviewInfo: GhostCombinePreviewInfo | null;

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
  requestCombine: (strategy: CombineStrategy) => Promise<void>;
  applyCombine: () => void;
  cancelCombine: () => void;
  undo: () => boolean;
  clearError: () => void;
}

/**
 * Detects sentence boundaries in text
 */
function detectSentences(text: string): SentenceInfo[] {
  const sentences: SentenceInfo[] = [];
  // Match sentences ending with . ! or ? followed by space or end of string
  const regex = /[^.!?]*[.!?]+(?:\s|$)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const trimmedText = match[0].trim();
    if (trimmedText.length > 0) {
      sentences.push({
        text: trimmedText,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  // If no sentences found but there's text, treat the whole thing as one sentence
  if (sentences.length === 0 && text.trim().length > 0) {
    sentences.push({
      text: text.trim(),
      startIndex: 0,
      endIndex: text.length,
    });
  }

  return sentences;
}

/**
 * Combines sentences using the specified strategy
 */
function combineSentences(sentences: SentenceInfo[], strategy: CombineStrategy): string {
  if (sentences.length < 2) {
    return sentences.map(s => s.text).join(' ');
  }

  // Extract sentence texts without trailing punctuation for combining
  const cleanSentences = sentences.map(s => {
    const text = s.text.trim();
    // Remove ending punctuation for combining
    return text.replace(/[.!?]+$/, '').trim();
  });

  switch (strategy) {
    case 'conjunction': {
      // Analyze sentences to pick appropriate conjunction
      const lastSentence = cleanSentences[cleanSentences.length - 1].toLowerCase();
      const firstSentence = cleanSentences[0].toLowerCase();

      // Use "but" if there's contrast
      const contrastWords = ['however', 'although', 'though', 'yet', 'still', 'instead', 'rather'];
      const hasContrast = contrastWords.some(word =>
        lastSentence.includes(word) || firstSentence.includes(word)
      );

      // Use "so" if there's a result/conclusion
      const resultWords = ['therefore', 'thus', 'consequently', 'as a result', 'because'];
      const hasResult = resultWords.some(word => lastSentence.includes(word));

      let conjunction = 'and';
      if (hasContrast) conjunction = 'but';
      else if (hasResult) conjunction = 'so';

      // Combine with conjunction
      const result = cleanSentences.map((s, i) => {
        if (i === 0) return s;
        // Lowercase the first letter of subsequent sentences
        const firstChar = s.charAt(0).toLowerCase();
        return firstChar + s.slice(1);
      }).join(`, ${conjunction} `);

      return result + '.';
    }

    case 'semicolon': {
      // Join with semicolons - good for closely related but independent clauses
      const result = cleanSentences.map((s, i) => {
        if (i === 0) return s;
        // Lowercase subsequent sentences
        const firstChar = s.charAt(0).toLowerCase();
        return firstChar + s.slice(1);
      }).join('; ');

      return result + '.';
    }

    case 'comma': {
      // Use comma with a transitional word
      const transitions = ['however', 'therefore', 'moreover', 'furthermore', 'consequently'];
      const randomTransition = transitions[Math.floor(Math.random() * transitions.length)];

      if (cleanSentences.length === 2) {
        const second = cleanSentences[1].charAt(0).toLowerCase() + cleanSentences[1].slice(1);
        return `${cleanSentences[0]}, ${randomTransition}, ${second}.`;
      }

      // For more than 2 sentences, join first ones with commas, add transition before last
      const allButLast = cleanSentences.slice(0, -1);
      const last = cleanSentences[cleanSentences.length - 1];
      const lastLower = last.charAt(0).toLowerCase() + last.slice(1);

      return `${allButLast.join(', ')}, ${randomTransition}, ${lastLower}.`;
    }

    case 'relative': {
      // Use relative clause construction (which, that, who)
      if (cleanSentences.length === 2) {
        // Try to find a common noun/subject to use as anchor
        const first = cleanSentences[0];
        const second = cleanSentences[1];

        // Simple heuristic: if second sentence starts with a pronoun, replace with relative
        const pronouns = ['it', 'this', 'that', 'they', 'these', 'those', 'he', 'she'];
        const secondWords = second.split(/\s+/);
        const firstWord = secondWords[0].toLowerCase();

        if (pronouns.includes(firstWord)) {
          const rest = secondWords.slice(1).join(' ');
          const firstLower = rest.charAt(0).toLowerCase() + rest.slice(1);
          return `${first}, which ${firstLower}.`;
        }

        // Default: just connect with "which"
        const secondLower = second.charAt(0).toLowerCase() + second.slice(1);
        return `${first}, which ${secondLower}.`;
      }

      // For multiple sentences, combine first two with relative clause, then add rest
      const first = cleanSentences[0];
      const second = cleanSentences[1];
      const rest = cleanSentences.slice(2);

      const secondLower = second.charAt(0).toLowerCase() + second.slice(1);
      let combined = `${first}, which ${secondLower}`;

      if (rest.length > 0) {
        const restLower = rest.map(s => s.charAt(0).toLowerCase() + s.slice(1)).join(', and ');
        combined += `, and ${restLower}`;
      }

      return combined + '.';
    }

    default:
      return sentences.map(s => s.text).join(' ');
  }
}

export const useAISentenceCombinerStore = create<AISentenceCombinerState>()((set, get) => ({
  // Initial state
  isActive: false,
  selectedText: '',
  selectionStart: 0,
  selectionEnd: 0,
  targetElement: null,
  sentences: [],
  isLoading: false,
  previewText: null,
  originalText: '',
  error: null,
  selectedStrategy: null,
  ghostPreviewInfo: null,
  undoStack: [],
  toolbarPosition: null,

  showToolbar: (selectedText, selectionStart, selectionEnd, element, position) => {
    const sentences = detectSentences(selectedText);

    // Only show toolbar if 2+ sentences are selected
    if (sentences.length < 2) {
      return;
    }

    set({
      isActive: true,
      selectedText,
      selectionStart,
      selectionEnd,
      targetElement: element,
      sentences,
      toolbarPosition: position,
      previewText: null,
      originalText: selectedText,
      error: null,
      selectedStrategy: null,
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
      sentences: [],
      toolbarPosition: null,
      previewText: null,
      ghostPreviewInfo: null,
      isLoading: false,
      error: null,
      selectedStrategy: null,
    });
  },

  requestCombine: async (strategy) => {
    const state = get();
    if (!state.selectedText || state.isLoading || state.sentences.length < 2) return;

    set({ isLoading: true, error: null, previewText: null, ghostPreviewInfo: null, selectedStrategy: strategy });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 400));

      const combinedText = combineSentences(state.sentences, strategy);

      // Build ghost preview info for inline display
      let ghostPreviewInfo: GhostCombinePreviewInfo | null = null;
      if (state.targetElement) {
        const fullText = state.targetElement.value;
        ghostPreviewInfo = {
          beforeText: fullText.slice(0, state.selectionStart),
          originalText: state.selectedText,
          replacementText: combinedText,
          afterText: fullText.slice(state.selectionEnd),
          targetRect: state.targetElement.getBoundingClientRect(),
        };
      }

      set({
        previewText: combinedText,
        ghostPreviewInfo,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to combine sentences',
        ghostPreviewInfo: null,
      });
    }
  },

  applyCombine: () => {
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
      sentences: [],
      toolbarPosition: null,
      previewText: null,
      ghostPreviewInfo: null,
      isLoading: false,
      selectedStrategy: null,
    }));
  },

  cancelCombine: () => {
    set({
      previewText: null,
      ghostPreviewInfo: null,
      isLoading: false,
      error: null,
      selectedStrategy: null,
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return false;

    const lastUndo = state.undoStack[state.undoStack.length - 1];

    // Find the target element (if it still exists in DOM)
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

// Individual selectors for stable references
const selectIsActive = (state: AISentenceCombinerState) => state.isActive;
const selectSelectedText = (state: AISentenceCombinerState) => state.selectedText;
const selectIsLoading = (state: AISentenceCombinerState) => state.isLoading;
const selectPreviewText = (state: AISentenceCombinerState) => state.previewText;
const selectError = (state: AISentenceCombinerState) => state.error;
const selectToolbarPosition = (state: AISentenceCombinerState) => state.toolbarPosition;
const selectGhostPreviewInfo = (state: AISentenceCombinerState) => state.ghostPreviewInfo;
const selectSelectionStart = (state: AISentenceCombinerState) => state.selectionStart;
const selectSelectionEnd = (state: AISentenceCombinerState) => state.selectionEnd;
const selectTargetElement = (state: AISentenceCombinerState) => state.targetElement;
const selectSelectedStrategy = (state: AISentenceCombinerState) => state.selectedStrategy;
const selectSentences = (state: AISentenceCombinerState) => state.sentences;

// Combined hook using individual selectors
export function useAISentenceCombiner() {
  const isActive = useAISentenceCombinerStore(selectIsActive);
  const selectedText = useAISentenceCombinerStore(selectSelectedText);
  const isLoading = useAISentenceCombinerStore(selectIsLoading);
  const previewText = useAISentenceCombinerStore(selectPreviewText);
  const error = useAISentenceCombinerStore(selectError);
  const toolbarPosition = useAISentenceCombinerStore(selectToolbarPosition);
  const ghostPreviewInfo = useAISentenceCombinerStore(selectGhostPreviewInfo);
  const selectionStart = useAISentenceCombinerStore(selectSelectionStart);
  const selectionEnd = useAISentenceCombinerStore(selectSelectionEnd);
  const targetElement = useAISentenceCombinerStore(selectTargetElement);
  const selectedStrategy = useAISentenceCombinerStore(selectSelectedStrategy);
  const sentences = useAISentenceCombinerStore(selectSentences);

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
    selectedStrategy,
    sentences,
  };
}
