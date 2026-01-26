/**
 * AI Vocabulary Enhancer Store
 *
 * Manages state for AI-powered vocabulary enhancement and word suggestions.
 * Features:
 * - Tracks word frequency across text
 * - Identifies overused/weak vocabulary
 * - Provides synonym suggestions based on vocabulary level target
 * - One-click word replacement
 */

import { create } from 'zustand';

export type VocabularyLevel = 'simple' | 'standard' | 'advanced' | 'academic';

export interface WordFrequency {
  word: string;
  count: number;
  positions: number[];
  isOverused: boolean;
  isWeak: boolean;
}

export interface SynonymSuggestion {
  word: string;
  definition?: string;
  level: VocabularyLevel;
  isRecommended?: boolean;
}

export interface VocabularySuggestion {
  originalWord: string;
  position: number;
  reason: 'overused' | 'weak' | 'both';
  synonyms: SynonymSuggestion[];
}

export interface VocabularyAnalysisResult {
  wordFrequencies: WordFrequency[];
  suggestions: VocabularySuggestion[];
  totalWords: number;
  uniqueWords: number;
  overusedCount: number;
  weakWordCount: number;
}

interface AIVocabularyEnhancerState {
  // Analysis state
  isAnalyzing: boolean;
  analysis: VocabularyAnalysisResult | null;
  error: string | null;

  // Current text being tracked
  currentText: string;

  // Settings
  vocabularyLevel: VocabularyLevel;
  overuseThreshold: number; // Number of occurrences to consider overused

  // Panel visibility
  isPanelOpen: boolean;

  // Active suggestion popup
  activeSuggestion: VocabularySuggestion | null;
  suggestionPosition: { top: number; left: number } | null;

  // Target element for replacements
  targetElement: HTMLTextAreaElement | HTMLInputElement | null;

  // Actions
  analyzeText: (text: string) => Promise<void>;
  setVocabularyLevel: (level: VocabularyLevel) => void;
  setOveruseThreshold: (threshold: number) => void;
  showSuggestion: (
    suggestion: VocabularySuggestion,
    position: { top: number; left: number },
    element: HTMLTextAreaElement | HTMLInputElement
  ) => void;
  hideSuggestion: () => void;
  applySuggestion: (synonym: string) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  clearAnalysis: () => void;
  clearError: () => void;
}

// Common weak words that should be replaced with stronger alternatives
const WEAK_WORDS: Record<string, SynonymSuggestion[]> = {
  'good': [
    { word: 'excellent', level: 'standard', isRecommended: true },
    { word: 'exceptional', level: 'advanced' },
    { word: 'outstanding', level: 'standard' },
    { word: 'superb', level: 'advanced' },
    { word: 'remarkable', level: 'advanced' },
  ],
  'bad': [
    { word: 'poor', level: 'simple', isRecommended: true },
    { word: 'inadequate', level: 'standard' },
    { word: 'substandard', level: 'advanced' },
    { word: 'deficient', level: 'academic' },
    { word: 'inferior', level: 'standard' },
  ],
  'nice': [
    { word: 'pleasant', level: 'standard', isRecommended: true },
    { word: 'delightful', level: 'standard' },
    { word: 'agreeable', level: 'advanced' },
    { word: 'enjoyable', level: 'standard' },
    { word: 'charming', level: 'standard' },
  ],
  'big': [
    { word: 'large', level: 'simple', isRecommended: true },
    { word: 'substantial', level: 'standard' },
    { word: 'significant', level: 'standard' },
    { word: 'considerable', level: 'advanced' },
    { word: 'immense', level: 'advanced' },
  ],
  'small': [
    { word: 'minor', level: 'standard', isRecommended: true },
    { word: 'modest', level: 'standard' },
    { word: 'minimal', level: 'standard' },
    { word: 'diminutive', level: 'academic' },
    { word: 'compact', level: 'standard' },
  ],
  'very': [
    { word: 'extremely', level: 'standard', isRecommended: true },
    { word: 'exceptionally', level: 'advanced' },
    { word: 'remarkably', level: 'advanced' },
    { word: 'considerably', level: 'standard' },
    { word: 'highly', level: 'standard' },
  ],
  'really': [
    { word: 'truly', level: 'standard', isRecommended: true },
    { word: 'genuinely', level: 'standard' },
    { word: 'undoubtedly', level: 'advanced' },
    { word: 'certainly', level: 'standard' },
    { word: 'definitely', level: 'standard' },
  ],
  'thing': [
    { word: 'item', level: 'simple', isRecommended: true },
    { word: 'object', level: 'simple' },
    { word: 'element', level: 'standard' },
    { word: 'aspect', level: 'standard' },
    { word: 'factor', level: 'standard' },
  ],
  'things': [
    { word: 'items', level: 'simple', isRecommended: true },
    { word: 'objects', level: 'simple' },
    { word: 'elements', level: 'standard' },
    { word: 'aspects', level: 'standard' },
    { word: 'factors', level: 'standard' },
  ],
  'stuff': [
    { word: 'materials', level: 'standard', isRecommended: true },
    { word: 'items', level: 'simple' },
    { word: 'content', level: 'standard' },
    { word: 'belongings', level: 'standard' },
    { word: 'possessions', level: 'standard' },
  ],
  'get': [
    { word: 'obtain', level: 'standard', isRecommended: true },
    { word: 'acquire', level: 'advanced' },
    { word: 'receive', level: 'standard' },
    { word: 'gain', level: 'standard' },
    { word: 'secure', level: 'standard' },
  ],
  'got': [
    { word: 'obtained', level: 'standard', isRecommended: true },
    { word: 'acquired', level: 'advanced' },
    { word: 'received', level: 'standard' },
    { word: 'gained', level: 'standard' },
    { word: 'secured', level: 'standard' },
  ],
  'said': [
    { word: 'stated', level: 'standard', isRecommended: true },
    { word: 'mentioned', level: 'standard' },
    { word: 'declared', level: 'advanced' },
    { word: 'expressed', level: 'standard' },
    { word: 'remarked', level: 'advanced' },
  ],
  'went': [
    { word: 'traveled', level: 'standard', isRecommended: true },
    { word: 'proceeded', level: 'advanced' },
    { word: 'journeyed', level: 'advanced' },
    { word: 'departed', level: 'standard' },
    { word: 'headed', level: 'simple' },
  ],
  'make': [
    { word: 'create', level: 'standard', isRecommended: true },
    { word: 'produce', level: 'standard' },
    { word: 'construct', level: 'standard' },
    { word: 'generate', level: 'standard' },
    { word: 'develop', level: 'standard' },
  ],
  'made': [
    { word: 'created', level: 'standard', isRecommended: true },
    { word: 'produced', level: 'standard' },
    { word: 'constructed', level: 'standard' },
    { word: 'generated', level: 'standard' },
    { word: 'developed', level: 'standard' },
  ],
  'lot': [
    { word: 'numerous', level: 'standard', isRecommended: true },
    { word: 'considerable', level: 'advanced' },
    { word: 'substantial', level: 'advanced' },
    { word: 'abundant', level: 'advanced' },
    { word: 'extensive', level: 'advanced' },
  ],
  'many': [
    { word: 'numerous', level: 'standard', isRecommended: true },
    { word: 'multiple', level: 'standard' },
    { word: 'various', level: 'standard' },
    { word: 'countless', level: 'standard' },
    { word: 'several', level: 'simple' },
  ],
  'important': [
    { word: 'significant', level: 'standard', isRecommended: true },
    { word: 'crucial', level: 'standard' },
    { word: 'essential', level: 'standard' },
    { word: 'vital', level: 'standard' },
    { word: 'paramount', level: 'academic' },
  ],
  'interesting': [
    { word: 'engaging', level: 'standard', isRecommended: true },
    { word: 'compelling', level: 'advanced' },
    { word: 'intriguing', level: 'advanced' },
    { word: 'captivating', level: 'advanced' },
    { word: 'fascinating', level: 'standard' },
  ],
  'show': [
    { word: 'demonstrate', level: 'standard', isRecommended: true },
    { word: 'illustrate', level: 'standard' },
    { word: 'reveal', level: 'standard' },
    { word: 'indicate', level: 'standard' },
    { word: 'exhibit', level: 'advanced' },
  ],
  'shows': [
    { word: 'demonstrates', level: 'standard', isRecommended: true },
    { word: 'illustrates', level: 'standard' },
    { word: 'reveals', level: 'standard' },
    { word: 'indicates', level: 'standard' },
    { word: 'exhibits', level: 'advanced' },
  ],
  'use': [
    { word: 'utilize', level: 'standard', isRecommended: true },
    { word: 'employ', level: 'standard' },
    { word: 'apply', level: 'standard' },
    { word: 'leverage', level: 'advanced' },
    { word: 'implement', level: 'standard' },
  ],
  'help': [
    { word: 'assist', level: 'standard', isRecommended: true },
    { word: 'support', level: 'standard' },
    { word: 'aid', level: 'standard' },
    { word: 'facilitate', level: 'advanced' },
    { word: 'enable', level: 'standard' },
  ],
  'helps': [
    { word: 'assists', level: 'standard', isRecommended: true },
    { word: 'supports', level: 'standard' },
    { word: 'aids', level: 'standard' },
    { word: 'facilitates', level: 'advanced' },
    { word: 'enables', level: 'standard' },
  ],
  'basically': [
    { word: 'essentially', level: 'standard', isRecommended: true },
    { word: 'fundamentally', level: 'advanced' },
    { word: 'primarily', level: 'standard' },
    { word: 'principally', level: 'advanced' },
  ],
  'actually': [
    { word: 'genuinely', level: 'standard', isRecommended: true },
    { word: 'truly', level: 'standard' },
    { word: 'in fact', level: 'simple' },
    { word: 'indeed', level: 'standard' },
  ],
  'just': [
    { word: 'simply', level: 'standard', isRecommended: true },
    { word: 'merely', level: 'standard' },
    { word: 'only', level: 'simple' },
    { word: 'precisely', level: 'advanced' },
  ],
};

// Generic synonyms for common overused words
const GENERIC_SYNONYMS: Record<string, SynonymSuggestion[]> = {
  'also': [
    { word: 'additionally', level: 'standard', isRecommended: true },
    { word: 'furthermore', level: 'advanced' },
    { word: 'moreover', level: 'advanced' },
    { word: 'likewise', level: 'standard' },
  ],
  'however': [
    { word: 'nevertheless', level: 'advanced', isRecommended: true },
    { word: 'nonetheless', level: 'advanced' },
    { word: 'yet', level: 'simple' },
    { word: 'conversely', level: 'advanced' },
  ],
  'because': [
    { word: 'since', level: 'simple', isRecommended: true },
    { word: 'as', level: 'simple' },
    { word: 'due to', level: 'standard' },
    { word: 'owing to', level: 'advanced' },
  ],
  'but': [
    { word: 'however', level: 'standard', isRecommended: true },
    { word: 'yet', level: 'simple' },
    { word: 'although', level: 'standard' },
    { word: 'nevertheless', level: 'advanced' },
  ],
  'so': [
    { word: 'therefore', level: 'standard', isRecommended: true },
    { word: 'thus', level: 'advanced' },
    { word: 'consequently', level: 'advanced' },
    { word: 'hence', level: 'academic' },
  ],
  'then': [
    { word: 'subsequently', level: 'advanced', isRecommended: true },
    { word: 'afterward', level: 'standard' },
    { word: 'next', level: 'simple' },
    { word: 'thereafter', level: 'academic' },
  ],
};

function analyzeVocabulary(
  text: string,
  vocabularyLevel: VocabularyLevel,
  overuseThreshold: number
): VocabularyAnalysisResult {
  // Split text into words
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  const totalWords = words.length;

  if (totalWords === 0) {
    return {
      wordFrequencies: [],
      suggestions: [],
      totalWords: 0,
      uniqueWords: 0,
      overusedCount: 0,
      weakWordCount: 0,
    };
  }

  // Count word frequencies and positions
  const frequencyMap = new Map<string, { count: number; positions: number[] }>();
  let position = 0;

  for (const word of words) {
    const existing = frequencyMap.get(word);
    if (existing) {
      existing.count++;
      existing.positions.push(position);
    } else {
      frequencyMap.set(word, { count: 1, positions: [position] });
    }
    position++;
  }

  // Build word frequencies with flags
  const wordFrequencies: WordFrequency[] = [];
  const suggestions: VocabularySuggestion[] = [];
  let overusedCount = 0;
  let weakWordCount = 0;

  for (const [word, data] of frequencyMap) {
    const isWeak = word in WEAK_WORDS;
    const isOverused = data.count >= overuseThreshold;

    if (isWeak) weakWordCount++;
    if (isOverused && word.length > 3) overusedCount++; // Only count meaningful words

    wordFrequencies.push({
      word,
      count: data.count,
      positions: data.positions,
      isOverused: isOverused && word.length > 3,
      isWeak,
    });

    // Generate suggestions for weak or overused words
    if (isWeak || (isOverused && word.length > 3)) {
      const reason: 'overused' | 'weak' | 'both' =
        isWeak && isOverused ? 'both' : isWeak ? 'weak' : 'overused';

      let synonyms: SynonymSuggestion[] = [];

      if (isWeak && WEAK_WORDS[word]) {
        synonyms = filterSynonymsByLevel(WEAK_WORDS[word], vocabularyLevel);
      } else if (GENERIC_SYNONYMS[word]) {
        synonyms = filterSynonymsByLevel(GENERIC_SYNONYMS[word], vocabularyLevel);
      } else {
        // Generate generic alternatives for overused words
        synonyms = generateGenericAlternatives(word);
      }

      // Add a suggestion for each position of the word
      for (const pos of data.positions) {
        suggestions.push({
          originalWord: word,
          position: pos,
          reason,
          synonyms,
        });
      }
    }
  }

  // Sort frequencies by count (descending)
  wordFrequencies.sort((a, b) => b.count - a.count);

  return {
    wordFrequencies,
    suggestions,
    totalWords,
    uniqueWords: frequencyMap.size,
    overusedCount,
    weakWordCount,
  };
}

function filterSynonymsByLevel(
  synonyms: SynonymSuggestion[],
  targetLevel: VocabularyLevel
): SynonymSuggestion[] {
  const levelOrder: VocabularyLevel[] = ['simple', 'standard', 'advanced', 'academic'];
  const targetIndex = levelOrder.indexOf(targetLevel);

  // Filter synonyms that are at or below the target level
  return synonyms.filter((s) => levelOrder.indexOf(s.level) <= targetIndex);
}

function generateGenericAlternatives(
  word: string
): SynonymSuggestion[] {
  // For words without predefined synonyms, suggest varying the sentence structure
  return [
    {
      word: `[consider rephrasing to avoid "${word}"]`,
      level: 'standard' as VocabularyLevel,
      definition: 'Try restructuring the sentence to use different vocabulary',
    },
  ];
}

export const useAIVocabularyEnhancerStore = create<AIVocabularyEnhancerState>()(
  (set, get) => ({
    // Initial state
    isAnalyzing: false,
    analysis: null,
    error: null,
    currentText: '',
    vocabularyLevel: 'standard',
    overuseThreshold: 3,
    isPanelOpen: false,
    activeSuggestion: null,
    suggestionPosition: null,
    targetElement: null,

    analyzeText: async (text: string) => {
      if (!text.trim()) {
        set({
          analysis: null,
          error: null,
          currentText: '',
          isAnalyzing: false,
        });
        return;
      }

      set({ isAnalyzing: true, error: null, currentText: text });

      try {
        // Simulate API delay for realistic UX
        await new Promise((resolve) => setTimeout(resolve, 300));

        const state = get();
        const analysis = analyzeVocabulary(
          text,
          state.vocabularyLevel,
          state.overuseThreshold
        );

        set({
          analysis,
          isAnalyzing: false,
        });
      } catch (error) {
        set({
          isAnalyzing: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to analyze vocabulary',
        });
      }
    },

    setVocabularyLevel: (level: VocabularyLevel) => {
      set({ vocabularyLevel: level });
      // Re-analyze if we have text
      const state = get();
      if (state.currentText) {
        state.analyzeText(state.currentText);
      }
    },

    setOveruseThreshold: (threshold: number) => {
      set({ overuseThreshold: threshold });
      // Re-analyze if we have text
      const state = get();
      if (state.currentText) {
        state.analyzeText(state.currentText);
      }
    },

    showSuggestion: (suggestion, position, element) => {
      set({
        activeSuggestion: suggestion,
        suggestionPosition: position,
        targetElement: element,
      });
    },

    hideSuggestion: () => {
      set({
        activeSuggestion: null,
        suggestionPosition: null,
        targetElement: null,
      });
    },

    applySuggestion: (synonym: string) => {
      const state = get();
      if (!state.activeSuggestion || !state.targetElement) return;

      const element = state.targetElement;
      const currentValue = element.value;
      const originalWord = state.activeSuggestion.originalWord;

      // Find the word in the text and replace it
      // We need to match the case of the original word
      const regex = new RegExp(`\\b${originalWord}\\b`, 'gi');
      let matchIndex = 0;
      const targetIndex = state.activeSuggestion.position;

      const newValue = currentValue.replace(regex, (match) => {
        if (matchIndex === targetIndex) {
          matchIndex++;
          // Preserve case
          if (match[0] === match[0].toUpperCase()) {
            return synonym.charAt(0).toUpperCase() + synonym.slice(1);
          }
          return synonym;
        }
        matchIndex++;
        return match;
      });

      // Update the element value
      element.value = newValue;

      // Trigger input event so React state updates
      const event = new Event('input', { bubbles: true });
      element.dispatchEvent(event);

      // Hide suggestion and re-analyze
      set({
        activeSuggestion: null,
        suggestionPosition: null,
        targetElement: null,
      });

      // Re-analyze with new text
      get().analyzeText(newValue);
    },

    togglePanel: () => {
      set((state) => ({ isPanelOpen: !state.isPanelOpen }));
    },

    openPanel: () => {
      set({ isPanelOpen: true });
    },

    closePanel: () => {
      set({ isPanelOpen: false });
    },

    clearAnalysis: () => {
      set({
        analysis: null,
        currentText: '',
        activeSuggestion: null,
        suggestionPosition: null,
      });
    },

    clearError: () => {
      set({ error: null });
    },
  })
);

// Individual selectors for stable references
const selectIsAnalyzing = (state: AIVocabularyEnhancerState) => state.isAnalyzing;
const selectAnalysis = (state: AIVocabularyEnhancerState) => state.analysis;
const selectError = (state: AIVocabularyEnhancerState) => state.error;
const selectCurrentText = (state: AIVocabularyEnhancerState) => state.currentText;
const selectVocabularyLevel = (state: AIVocabularyEnhancerState) =>
  state.vocabularyLevel;
const selectOveruseThreshold = (state: AIVocabularyEnhancerState) =>
  state.overuseThreshold;
const selectIsPanelOpen = (state: AIVocabularyEnhancerState) => state.isPanelOpen;
const selectActiveSuggestion = (state: AIVocabularyEnhancerState) =>
  state.activeSuggestion;
const selectSuggestionPosition = (state: AIVocabularyEnhancerState) =>
  state.suggestionPosition;
const selectTargetElement = (state: AIVocabularyEnhancerState) =>
  state.targetElement;

// Hook for accessing the store with stable selectors
export function useAIVocabularyEnhancer() {
  const isAnalyzing = useAIVocabularyEnhancerStore(selectIsAnalyzing);
  const analysis = useAIVocabularyEnhancerStore(selectAnalysis);
  const error = useAIVocabularyEnhancerStore(selectError);
  const currentText = useAIVocabularyEnhancerStore(selectCurrentText);
  const vocabularyLevel = useAIVocabularyEnhancerStore(selectVocabularyLevel);
  const overuseThreshold = useAIVocabularyEnhancerStore(selectOveruseThreshold);
  const isPanelOpen = useAIVocabularyEnhancerStore(selectIsPanelOpen);
  const activeSuggestion = useAIVocabularyEnhancerStore(selectActiveSuggestion);
  const suggestionPosition = useAIVocabularyEnhancerStore(selectSuggestionPosition);
  const targetElement = useAIVocabularyEnhancerStore(selectTargetElement);

  return {
    isAnalyzing,
    analysis,
    error,
    currentText,
    vocabularyLevel,
    overuseThreshold,
    isPanelOpen,
    activeSuggestion,
    suggestionPosition,
    targetElement,
  };
}

// Helper function to get vocabulary level label
export function getVocabularyLevelLabel(level: VocabularyLevel): string {
  const labels: Record<VocabularyLevel, string> = {
    simple: 'Simple (Basic)',
    standard: 'Standard (General)',
    advanced: 'Advanced (Professional)',
    academic: 'Academic (Scholarly)',
  };
  return labels[level];
}

// Helper function to get color for suggestion type
export function getSuggestionColor(reason: 'overused' | 'weak' | 'both'): string {
  switch (reason) {
    case 'weak':
      return 'var(--color-warning)';
    case 'overused':
      return 'var(--color-info)';
    case 'both':
      return 'var(--color-error)';
    default:
      return 'var(--color-neutral)';
  }
}
