import { create } from 'zustand';

export type TransitionCategory = 'additive' | 'contrast' | 'causal' | 'temporal' | 'emphasis';

export interface TransitionSuggestion {
  id: string;
  text: string;
  category: TransitionCategory;
  description: string;
}

export interface TransitionCategoryConfig {
  id: TransitionCategory;
  label: string;
  description: string;
  color: string;
}

export const TRANSITION_CATEGORIES: TransitionCategoryConfig[] = [
  { id: 'additive', label: 'Additive', description: 'Add information', color: '#3b82f6' },
  { id: 'contrast', label: 'Contrast', description: 'Show difference', color: '#ef4444' },
  { id: 'causal', label: 'Cause & Effect', description: 'Show relationship', color: '#f59e0b' },
  { id: 'temporal', label: 'Temporal', description: 'Show time sequence', color: '#10b981' },
  { id: 'emphasis', label: 'Emphasis', description: 'Highlight importance', color: '#8b5cf6' },
];

// Comprehensive library of transitional phrases organized by category
const TRANSITION_LIBRARY: Record<TransitionCategory, string[]> = {
  additive: [
    'Furthermore,',
    'Moreover,',
    'In addition,',
    'Additionally,',
    'Also,',
    'Besides,',
    'What is more,',
    'Not only that, but',
    'Equally important,',
    'Along with this,',
  ],
  contrast: [
    'However,',
    'On the other hand,',
    'Nevertheless,',
    'In contrast,',
    'Conversely,',
    'Despite this,',
    'Although,',
    'Yet,',
    'Still,',
    'Even so,',
  ],
  causal: [
    'Therefore,',
    'Consequently,',
    'As a result,',
    'Thus,',
    'Hence,',
    'For this reason,',
    'Because of this,',
    'Accordingly,',
    'This means that',
    'It follows that',
  ],
  temporal: [
    'Meanwhile,',
    'Subsequently,',
    'Afterward,',
    'Before long,',
    'In the meantime,',
    'Later,',
    'Eventually,',
    'At the same time,',
    'Following this,',
    'Soon after,',
  ],
  emphasis: [
    'Indeed,',
    'In fact,',
    'Certainly,',
    'Undoubtedly,',
    'Most importantly,',
    'Significantly,',
    'Above all,',
    'Notably,',
    'Particularly,',
    'Especially,',
  ],
};

export interface ParagraphGap {
  index: number;
  beforeText: string;
  afterText: string;
  position: number; // Character position in text
  needsTransition: boolean;
  score: number; // 0-1 indicating how much a transition is needed
}

export interface AITransitionSuggestionsState {
  // Whether the feature is enabled
  isEnabled: boolean;

  // The target element being monitored
  targetElement: HTMLTextAreaElement | HTMLInputElement | null;

  // Detected paragraph gaps that may need transitions
  paragraphGaps: ParagraphGap[];

  // Currently active gap (clicked on)
  activeGapIndex: number | null;

  // Generated suggestions for the active gap
  suggestions: TransitionSuggestion[];

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Preview text (transition to be inserted)
  previewText: string | null;

  // Selected suggestion
  selectedSuggestion: TransitionSuggestion | null;

  // Position for the suggestion popup
  popupPosition: { top: number; left: number } | null;

  // Undo stack
  undoStack: { text: string; cursorPosition: number }[];

  // Actions
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  setTargetElement: (element: HTMLTextAreaElement | HTMLInputElement | null) => void;
  analyzeText: () => void;
  showSuggestionsForGap: (gapIndex: number, position: { top: number; left: number }) => void;
  hideSuggestions: () => void;
  selectSuggestion: (suggestion: TransitionSuggestion) => void;
  applyTransition: () => void;
  cancelPreview: () => void;
  undo: () => boolean;
  clearError: () => void;
}

/**
 * Analyzes the end of a paragraph to determine its topic/mood
 */
function analyzeParagraphEnding(text: string): {
  suggestedCategories: TransitionCategory[];
  score: number;
} {
  const lowerText = text.toLowerCase();
  const suggestedCategories: TransitionCategory[] = [];
  let score = 0.5; // Default moderate need for transition

  // Check for contrast indicators in the ending
  const contrastWords = ['but', 'however', 'although', 'despite', 'yet', 'still'];
  if (contrastWords.some(word => lowerText.includes(word))) {
    suggestedCategories.push('contrast');
    score += 0.1;
  }

  // Check for causal indicators
  const causalWords = ['because', 'therefore', 'thus', 'result', 'cause', 'effect', 'lead'];
  if (causalWords.some(word => lowerText.includes(word))) {
    suggestedCategories.push('causal');
    score += 0.1;
  }

  // Check for temporal indicators
  const temporalWords = ['then', 'after', 'before', 'during', 'while', 'when', 'finally'];
  if (temporalWords.some(word => lowerText.includes(word))) {
    suggestedCategories.push('temporal');
    score += 0.1;
  }

  // Check for emphasis indicators
  const emphasisWords = ['important', 'significant', 'crucial', 'essential', 'key', 'main'];
  if (emphasisWords.some(word => lowerText.includes(word))) {
    suggestedCategories.push('emphasis');
    score += 0.1;
  }

  // If no specific category detected, suggest additive
  if (suggestedCategories.length === 0) {
    suggestedCategories.push('additive');
  }

  // Increase score if sentences are short (indicating choppy writing)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const avgSentenceLength = sentences.reduce((acc, s) => acc + s.trim().split(/\s+/).length, 0) / Math.max(sentences.length, 1);
  if (avgSentenceLength < 10) {
    score += 0.2;
  }

  return { suggestedCategories, score: Math.min(score, 1) };
}

/**
 * Check if the next paragraph already starts with a transition
 */
function hasExistingTransition(text: string): boolean {
  const transitionStarters = [
    'however', 'therefore', 'moreover', 'furthermore', 'additionally',
    'nevertheless', 'consequently', 'meanwhile', 'subsequently', 'indeed',
    'in addition', 'in contrast', 'as a result', 'on the other hand',
    'for this reason', 'at the same time', 'in fact', 'also', 'besides',
    'thus', 'hence', 'yet', 'still', 'although', 'even', 'notably',
  ];
  return transitionStarters.some(t => text.trim().toLowerCase().startsWith(t));
}

/**
 * Parse text into paragraphs and identify gaps needing transitions
 */
function detectParagraphGaps(text: string): ParagraphGap[] {
  const gaps: ParagraphGap[] = [];

  // Split by double newlines (paragraph breaks)
  const paragraphs = text.split(/\n\s*\n/);

  if (paragraphs.length < 2) {
    return gaps;
  }

  let currentPosition = 0;

  for (let i = 0; i < paragraphs.length - 1; i++) {
    const beforeParagraph = paragraphs[i].trim();
    const afterParagraph = paragraphs[i + 1].trim();

    // Skip empty paragraphs
    if (!beforeParagraph || !afterParagraph) {
      currentPosition += paragraphs[i].length + 2; // +2 for \n\n
      continue;
    }

    // Find the actual position of this gap in the original text
    const gapPosition = currentPosition + paragraphs[i].length;

    // Analyze if a transition is needed
    const hasTransition = hasExistingTransition(afterParagraph);
    const { score } = analyzeParagraphEnding(beforeParagraph);

    gaps.push({
      index: i,
      beforeText: beforeParagraph.slice(-100), // Last 100 chars for context
      afterText: afterParagraph.slice(0, 100), // First 100 chars for context
      position: gapPosition,
      needsTransition: !hasTransition && score > 0.4,
      score: hasTransition ? 0 : score,
    });

    currentPosition += paragraphs[i].length + 2;
  }

  return gaps;
}

/**
 * Generate context-aware transition suggestions
 */
function generateSuggestions(gap: ParagraphGap): TransitionSuggestion[] {
  const suggestions: TransitionSuggestion[] = [];
  const { suggestedCategories } = analyzeParagraphEnding(gap.beforeText);

  // Add suggestions from recommended categories first
  suggestedCategories.forEach(category => {
    const phrases = TRANSITION_LIBRARY[category];
    // Pick 2 random phrases from each recommended category
    const shuffled = [...phrases].sort(() => Math.random() - 0.5);
    shuffled.slice(0, 2).forEach((text, idx) => {
      suggestions.push({
        id: `${category}-${idx}`,
        text,
        category,
        description: TRANSITION_CATEGORIES.find(c => c.id === category)?.description || '',
      });
    });
  });

  // Add one suggestion from each other category for variety
  TRANSITION_CATEGORIES.forEach(config => {
    if (!suggestedCategories.includes(config.id)) {
      const phrases = TRANSITION_LIBRARY[config.id];
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      suggestions.push({
        id: `${config.id}-extra`,
        text: randomPhrase,
        category: config.id,
        description: config.description,
      });
    }
  });

  return suggestions;
}

export const useAITransitionSuggestionsStore = create<AITransitionSuggestionsState>()((set, get) => ({
  // Initial state
  isEnabled: false,
  targetElement: null,
  paragraphGaps: [],
  activeGapIndex: null,
  suggestions: [],
  isLoading: false,
  error: null,
  previewText: null,
  selectedSuggestion: null,
  popupPosition: null,
  undoStack: [],

  enable: () => {
    set({ isEnabled: true });
    get().analyzeText();
  },

  disable: () => {
    set({
      isEnabled: false,
      paragraphGaps: [],
      activeGapIndex: null,
      suggestions: [],
      popupPosition: null,
      previewText: null,
      selectedSuggestion: null,
    });
  },

  toggle: () => {
    const state = get();
    if (state.isEnabled) {
      state.disable();
    } else {
      state.enable();
    }
  },

  setTargetElement: (element) => {
    set({ targetElement: element });
    if (element && get().isEnabled) {
      get().analyzeText();
    }
  },

  analyzeText: () => {
    const { targetElement, isEnabled } = get();
    if (!targetElement || !isEnabled) return;

    const text = targetElement.value;
    const gaps = detectParagraphGaps(text);

    set({ paragraphGaps: gaps });
  },

  showSuggestionsForGap: (gapIndex, position) => {
    const { paragraphGaps } = get();
    const gap = paragraphGaps[gapIndex];

    if (!gap) return;

    set({ isLoading: true, activeGapIndex: gapIndex, popupPosition: position, error: null });

    // Simulate async suggestion generation
    setTimeout(() => {
      const suggestions = generateSuggestions(gap);
      set({
        suggestions,
        isLoading: false,
      });
    }, 300);
  },

  hideSuggestions: () => {
    set({
      activeGapIndex: null,
      suggestions: [],
      popupPosition: null,
      previewText: null,
      selectedSuggestion: null,
      error: null,
    });
  },

  selectSuggestion: (suggestion) => {
    set({
      selectedSuggestion: suggestion,
      previewText: suggestion.text,
    });
  },

  applyTransition: () => {
    const { targetElement, previewText, paragraphGaps, activeGapIndex } = get();

    if (!targetElement || !previewText || activeGapIndex === null) return;

    const gap = paragraphGaps[activeGapIndex];
    if (!gap) return;

    const currentValue = targetElement.value;

    // Save to undo stack
    const undoEntry = {
      text: currentValue,
      cursorPosition: targetElement.selectionStart ?? 0,
    };

    // Find where to insert the transition
    // We insert after the paragraph break (find the start of the next paragraph)
    const beforeGap = currentValue.slice(0, gap.position);
    const afterGap = currentValue.slice(gap.position);

    // Find the start of actual text after the gap
    const afterGapMatch = afterGap.match(/^(\s*)/);
    const whitespaceAfterGap = afterGapMatch ? afterGapMatch[1] : '';

    // Insert the transition at the start of the next paragraph
    const afterWhitespace = afterGap.slice(whitespaceAfterGap.length);
    const newValue = beforeGap + whitespaceAfterGap + previewText + ' ' + afterWhitespace;

    // Update the element value
    targetElement.value = newValue;

    // Trigger input event so React state updates
    const event = new Event('input', { bubbles: true });
    targetElement.dispatchEvent(event);

    // Position cursor after the inserted transition
    const newCursorPos = gap.position + whitespaceAfterGap.length + previewText.length + 1;
    targetElement.setSelectionRange(newCursorPos, newCursorPos);
    targetElement.focus();

    set((state) => ({
      undoStack: [...state.undoStack, undoEntry],
      activeGapIndex: null,
      suggestions: [],
      popupPosition: null,
      previewText: null,
      selectedSuggestion: null,
    }));

    // Re-analyze the text after applying
    setTimeout(() => get().analyzeText(), 100);
  },

  cancelPreview: () => {
    set({
      previewText: null,
      selectedSuggestion: null,
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return false;

    const lastUndo = state.undoStack[state.undoStack.length - 1];

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

      // Restore cursor position
      activeElement.setSelectionRange(lastUndo.cursorPosition, lastUndo.cursorPosition);

      set((state) => ({
        undoStack: state.undoStack.slice(0, -1),
      }));

      // Re-analyze the text after undo
      setTimeout(() => get().analyzeText(), 100);

      return true;
    }

    return false;
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Individual selectors for stable references
const selectIsEnabled = (state: AITransitionSuggestionsState) => state.isEnabled;
const selectTargetElement = (state: AITransitionSuggestionsState) => state.targetElement;
const selectParagraphGaps = (state: AITransitionSuggestionsState) => state.paragraphGaps;
const selectActiveGapIndex = (state: AITransitionSuggestionsState) => state.activeGapIndex;
const selectSuggestions = (state: AITransitionSuggestionsState) => state.suggestions;
const selectIsLoading = (state: AITransitionSuggestionsState) => state.isLoading;
const selectError = (state: AITransitionSuggestionsState) => state.error;
const selectPreviewText = (state: AITransitionSuggestionsState) => state.previewText;
const selectSelectedSuggestion = (state: AITransitionSuggestionsState) => state.selectedSuggestion;
const selectPopupPosition = (state: AITransitionSuggestionsState) => state.popupPosition;

// Combined hook using individual selectors
export function useAITransitionSuggestions() {
  const isEnabled = useAITransitionSuggestionsStore(selectIsEnabled);
  const targetElement = useAITransitionSuggestionsStore(selectTargetElement);
  const paragraphGaps = useAITransitionSuggestionsStore(selectParagraphGaps);
  const activeGapIndex = useAITransitionSuggestionsStore(selectActiveGapIndex);
  const suggestions = useAITransitionSuggestionsStore(selectSuggestions);
  const isLoading = useAITransitionSuggestionsStore(selectIsLoading);
  const error = useAITransitionSuggestionsStore(selectError);
  const previewText = useAITransitionSuggestionsStore(selectPreviewText);
  const selectedSuggestion = useAITransitionSuggestionsStore(selectSelectedSuggestion);
  const popupPosition = useAITransitionSuggestionsStore(selectPopupPosition);

  return {
    isEnabled,
    targetElement,
    paragraphGaps,
    activeGapIndex,
    suggestions,
    isLoading,
    error,
    previewText,
    selectedSuggestion,
    popupPosition,
  };
}
