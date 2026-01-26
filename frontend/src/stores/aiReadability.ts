/**
 * AI Readability Scorer Store
 *
 * Manages state for AI-powered readability analysis of text.
 * Features:
 * - Readability score calculation (Flesch-Kincaid, etc.)
 * - Grade level equivalent
 * - Target audience matching
 * - Complex sentence identification
 * - Rewrite suggestions for complex sentences
 */

import { create } from 'zustand';

export type TargetAudience =
  | 'general'
  | 'academic'
  | 'professional'
  | 'children'
  | 'technical';

export interface SentenceAnalysis {
  text: string;
  startIndex: number;
  endIndex: number;
  wordCount: number;
  syllableCount: number;
  avgSyllablesPerWord: number;
  isComplex: boolean;
  complexityReason?: string;
  rewriteSuggestion?: string;
}

export interface ReadabilityScores {
  fleschKincaidGrade: number; // Grade level (e.g., 8.2 means 8th grade)
  fleschReadingEase: number; // 0-100, higher is easier
  automatedReadabilityIndex: number; // Grade level
  colemanLiauIndex: number; // Grade level
  averageGradeLevel: number; // Average of all grade levels
}

export interface ReadabilityAnalysisResult {
  scores: ReadabilityScores;
  gradeLevel: string; // Human-readable grade level (e.g., "8th Grade")
  audienceMatch: 'excellent' | 'good' | 'fair' | 'poor';
  audienceMatchMessage: string;
  complexSentences: SentenceAnalysis[];
  totalSentences: number;
  totalWords: number;
  totalSyllables: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  suggestions: ReadabilitySuggestion[];
  analyzedText: string;
}

export interface ReadabilitySuggestion {
  type: 'sentence-length' | 'word-complexity' | 'passive-voice' | 'general';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIReadabilityState {
  // Analysis state
  isAnalyzing: boolean;
  analysis: ReadabilityAnalysisResult | null;
  error: string | null;

  // Current text being tracked
  currentText: string;

  // Settings
  targetAudience: TargetAudience;

  // Panel visibility
  isPanelOpen: boolean;

  // Selected complex sentence for rewrite
  selectedSentenceIndex: number | null;

  // Actions
  analyzeText: (text: string) => Promise<void>;
  setTargetAudience: (audience: TargetAudience) => void;
  selectSentence: (index: number | null) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  clearAnalysis: () => void;
  clearError: () => void;
}

// Target audience grade level ranges
const AUDIENCE_GRADE_RANGES: Record<
  TargetAudience,
  { min: number; max: number; label: string }
> = {
  children: { min: 1, max: 5, label: 'Children (Grades 1-5)' },
  general: { min: 6, max: 9, label: 'General Public (Grades 6-9)' },
  professional: { min: 10, max: 12, label: 'Professional (Grades 10-12)' },
  academic: { min: 13, max: 16, label: 'Academic (College Level)' },
  technical: { min: 14, max: 20, label: 'Technical (Graduate Level)' },
};

// Count syllables in a word
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  // Handle common endings
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');

  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

// Split text into sentences
function splitIntoSentences(text: string): { text: string; startIndex: number; endIndex: number }[] {
  const sentences: { text: string; startIndex: number; endIndex: number }[] = [];
  // Match sentences ending with . ! ? or end of text
  const regex = /[^.!?]*[.!?]+|[^.!?]+$/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const sentenceText = match[0].trim();
    if (sentenceText.length > 0) {
      sentences.push({
        text: sentenceText,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  return sentences;
}

// Calculate Flesch Reading Ease score
function calculateFleschReadingEase(
  totalWords: number,
  totalSentences: number,
  totalSyllables: number
): number {
  if (totalWords === 0 || totalSentences === 0) return 0;
  const score =
    206.835 -
    1.015 * (totalWords / totalSentences) -
    84.6 * (totalSyllables / totalWords);
  return Math.max(0, Math.min(100, score));
}

// Calculate Flesch-Kincaid Grade Level
function calculateFleschKincaidGrade(
  totalWords: number,
  totalSentences: number,
  totalSyllables: number
): number {
  if (totalWords === 0 || totalSentences === 0) return 0;
  const grade =
    0.39 * (totalWords / totalSentences) +
    11.8 * (totalSyllables / totalWords) -
    15.59;
  return Math.max(0, Math.round(grade * 10) / 10);
}

// Calculate Automated Readability Index
function calculateARI(
  totalWords: number,
  totalSentences: number,
  totalCharacters: number
): number {
  if (totalWords === 0 || totalSentences === 0) return 0;
  const score =
    4.71 * (totalCharacters / totalWords) +
    0.5 * (totalWords / totalSentences) -
    21.43;
  return Math.max(0, Math.round(score * 10) / 10);
}

// Calculate Coleman-Liau Index
function calculateColemanLiau(
  totalWords: number,
  totalSentences: number,
  totalCharacters: number
): number {
  if (totalWords === 0) return 0;
  const L = (totalCharacters / totalWords) * 100; // avg letters per 100 words
  const S = (totalSentences / totalWords) * 100; // avg sentences per 100 words
  const score = 0.0588 * L - 0.296 * S - 15.8;
  return Math.max(0, Math.round(score * 10) / 10);
}

// Get human-readable grade level
function getGradeLevelLabel(grade: number): string {
  if (grade <= 1) return '1st Grade or below';
  if (grade <= 2) return '2nd Grade';
  if (grade <= 3) return '3rd Grade';
  if (grade <= 4) return '4th Grade';
  if (grade <= 5) return '5th Grade';
  if (grade <= 6) return '6th Grade';
  if (grade <= 7) return '7th Grade';
  if (grade <= 8) return '8th Grade';
  if (grade <= 9) return '9th Grade';
  if (grade <= 10) return '10th Grade';
  if (grade <= 11) return '11th Grade';
  if (grade <= 12) return '12th Grade';
  if (grade <= 13) return 'College Freshman';
  if (grade <= 14) return 'College Sophomore';
  if (grade <= 15) return 'College Junior';
  if (grade <= 16) return 'College Senior';
  return 'Graduate Level';
}

// Check if sentence is complex
function analyzeSentence(sentenceText: string): SentenceAnalysis {
  const words = sentenceText.match(/\b[a-zA-Z]+\b/g) || [];
  const wordCount = words.length;
  const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const avgSyllablesPerWord = wordCount > 0 ? syllableCount / wordCount : 0;

  let isComplex = false;
  let complexityReason: string | undefined;
  let rewriteSuggestion: string | undefined;

  // Check for long sentences (over 25 words)
  if (wordCount > 25) {
    isComplex = true;
    complexityReason = `Long sentence (${wordCount} words)`;
    rewriteSuggestion = 'Consider breaking this into two or more shorter sentences.';
  }
  // Check for high syllable density
  else if (avgSyllablesPerWord > 2.0) {
    isComplex = true;
    complexityReason = 'High word complexity';
    rewriteSuggestion = 'Try using simpler words with fewer syllables.';
  }
  // Check for passive voice indicators
  else if (/\b(was|were|been|being|is|are|am)\s+\w+ed\b/i.test(sentenceText)) {
    isComplex = true;
    complexityReason = 'Passive voice detected';
    rewriteSuggestion = 'Consider rewriting in active voice for clarity.';
  }
  // Check for multiple clauses (commas and conjunctions)
  else if ((sentenceText.match(/,/g) || []).length >= 3) {
    isComplex = true;
    complexityReason = 'Multiple clauses';
    rewriteSuggestion = 'Consider simplifying by removing subordinate clauses.';
  }

  return {
    text: sentenceText,
    startIndex: 0,
    endIndex: sentenceText.length,
    wordCount,
    syllableCount,
    avgSyllablesPerWord,
    isComplex,
    complexityReason,
    rewriteSuggestion,
  };
}

// Evaluate audience match
function evaluateAudienceMatch(
  gradeLevel: number,
  targetAudience: TargetAudience
): { match: 'excellent' | 'good' | 'fair' | 'poor'; message: string } {
  const range = AUDIENCE_GRADE_RANGES[targetAudience];

  if (gradeLevel >= range.min && gradeLevel <= range.max) {
    return {
      match: 'excellent',
      message: `Perfect for ${range.label}`,
    };
  }

  const midpoint = (range.min + range.max) / 2;
  const distance = Math.abs(gradeLevel - midpoint);

  if (distance <= 2) {
    return {
      match: 'good',
      message:
        gradeLevel < range.min
          ? `Slightly below ${range.label} level`
          : `Slightly above ${range.label} level`,
    };
  }

  if (distance <= 4) {
    return {
      match: 'fair',
      message:
        gradeLevel < range.min
          ? `Below ${range.label} level - may be too simple`
          : `Above ${range.label} level - may be too complex`,
    };
  }

  return {
    match: 'poor',
    message:
      gradeLevel < range.min
        ? `Too simple for ${range.label}`
        : `Too complex for ${range.label}`,
  };
}

// Generate suggestions based on analysis
function generateSuggestions(
  analysis: Omit<ReadabilityAnalysisResult, 'suggestions'>
): ReadabilitySuggestion[] {
  const suggestions: ReadabilitySuggestion[] = [];

  // Check average sentence length
  if (analysis.avgWordsPerSentence > 20) {
    suggestions.push({
      type: 'sentence-length',
      message: `Average sentence length is ${Math.round(analysis.avgWordsPerSentence)} words. Aim for 15-20 words for better readability.`,
      priority: analysis.avgWordsPerSentence > 25 ? 'high' : 'medium',
    });
  }

  // Check syllable complexity
  if (analysis.avgSyllablesPerWord > 1.7) {
    suggestions.push({
      type: 'word-complexity',
      message:
        'Many complex words detected. Consider using simpler alternatives where possible.',
      priority: analysis.avgSyllablesPerWord > 2.0 ? 'high' : 'medium',
    });
  }

  // Check complex sentence ratio
  const complexRatio = analysis.complexSentences.length / analysis.totalSentences;
  if (complexRatio > 0.3) {
    suggestions.push({
      type: 'general',
      message: `${Math.round(complexRatio * 100)}% of sentences are complex. Consider simplifying highlighted sentences.`,
      priority: complexRatio > 0.5 ? 'high' : 'medium',
    });
  }

  // Audience-specific suggestions
  if (analysis.audienceMatch === 'poor' || analysis.audienceMatch === 'fair') {
    suggestions.push({
      type: 'general',
      message: analysis.audienceMatchMessage,
      priority: analysis.audienceMatch === 'poor' ? 'high' : 'medium',
    });
  }

  return suggestions;
}

// Main analysis function
function analyzeReadability(
  text: string,
  targetAudience: TargetAudience
): ReadabilityAnalysisResult {
  const sentences = splitIntoSentences(text);
  const words = text.match(/\b[a-zA-Z]+\b/g) || [];
  const characters = text.replace(/[^a-zA-Z]/g, '').length;

  const totalSentences = sentences.length;
  const totalWords = words.length;
  const totalSyllables = words.reduce(
    (sum, word) => sum + countSyllables(word),
    0
  );

  if (totalWords === 0 || totalSentences === 0) {
    return {
      scores: {
        fleschKincaidGrade: 0,
        fleschReadingEase: 0,
        automatedReadabilityIndex: 0,
        colemanLiauIndex: 0,
        averageGradeLevel: 0,
      },
      gradeLevel: 'No content',
      audienceMatch: 'fair',
      audienceMatchMessage: 'Add more content for analysis',
      complexSentences: [],
      totalSentences: 0,
      totalWords: 0,
      totalSyllables: 0,
      avgWordsPerSentence: 0,
      avgSyllablesPerWord: 0,
      suggestions: [],
      analyzedText: text,
    };
  }

  // Calculate scores
  const fleschReadingEase = calculateFleschReadingEase(
    totalWords,
    totalSentences,
    totalSyllables
  );
  const fleschKincaidGrade = calculateFleschKincaidGrade(
    totalWords,
    totalSentences,
    totalSyllables
  );
  const automatedReadabilityIndex = calculateARI(
    totalWords,
    totalSentences,
    characters
  );
  const colemanLiauIndex = calculateColemanLiau(
    totalWords,
    totalSentences,
    characters
  );

  const averageGradeLevel =
    Math.round(
      ((fleschKincaidGrade + automatedReadabilityIndex + colemanLiauIndex) / 3) * 10
    ) / 10;

  const scores: ReadabilityScores = {
    fleschKincaidGrade,
    fleschReadingEase,
    automatedReadabilityIndex,
    colemanLiauIndex,
    averageGradeLevel,
  };

  // Analyze sentences for complexity
  const sentenceAnalyses = sentences.map((s) => {
    const analysis = analyzeSentence(s.text);
    return {
      ...analysis,
      startIndex: s.startIndex,
      endIndex: s.endIndex,
    };
  });

  const complexSentences = sentenceAnalyses.filter((s) => s.isComplex);

  // Evaluate audience match
  const { match: audienceMatch, message: audienceMatchMessage } =
    evaluateAudienceMatch(averageGradeLevel, targetAudience);

  const avgWordsPerSentence = totalWords / totalSentences;
  const avgSyllablesPerWord = totalSyllables / totalWords;

  const baseResult = {
    scores,
    gradeLevel: getGradeLevelLabel(averageGradeLevel),
    audienceMatch,
    audienceMatchMessage,
    complexSentences,
    totalSentences,
    totalWords,
    totalSyllables,
    avgWordsPerSentence,
    avgSyllablesPerWord,
    analyzedText: text,
  };

  const suggestions = generateSuggestions(baseResult as ReadabilityAnalysisResult);

  return {
    ...baseResult,
    suggestions,
  };
}

export const useAIReadabilityStore = create<AIReadabilityState>()((set, get) => ({
  // Initial state
  isAnalyzing: false,
  analysis: null,
  error: null,
  currentText: '',
  targetAudience: 'general',
  isPanelOpen: false,
  selectedSentenceIndex: null,

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
      const analysis = analyzeReadability(text, state.targetAudience);

      set({
        analysis,
        isAnalyzing: false,
        selectedSentenceIndex: null,
      });
    } catch (error) {
      set({
        isAnalyzing: false,
        error:
          error instanceof Error ? error.message : 'Failed to analyze readability',
      });
    }
  },

  setTargetAudience: (audience: TargetAudience) => {
    set({ targetAudience: audience });
    // Re-analyze if we have text
    const state = get();
    if (state.currentText) {
      state.analyzeText(state.currentText);
    }
  },

  selectSentence: (index: number | null) => {
    set({ selectedSentenceIndex: index });
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
      selectedSentenceIndex: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Individual selectors for stable references
const selectIsAnalyzing = (state: AIReadabilityState) => state.isAnalyzing;
const selectAnalysis = (state: AIReadabilityState) => state.analysis;
const selectError = (state: AIReadabilityState) => state.error;
const selectCurrentText = (state: AIReadabilityState) => state.currentText;
const selectTargetAudience = (state: AIReadabilityState) => state.targetAudience;
const selectIsPanelOpen = (state: AIReadabilityState) => state.isPanelOpen;
const selectSelectedSentenceIndex = (state: AIReadabilityState) =>
  state.selectedSentenceIndex;

// Hook for accessing the store with stable selectors
export function useAIReadability() {
  const isAnalyzing = useAIReadabilityStore(selectIsAnalyzing);
  const analysis = useAIReadabilityStore(selectAnalysis);
  const error = useAIReadabilityStore(selectError);
  const currentText = useAIReadabilityStore(selectCurrentText);
  const targetAudience = useAIReadabilityStore(selectTargetAudience);
  const isPanelOpen = useAIReadabilityStore(selectIsPanelOpen);
  const selectedSentenceIndex = useAIReadabilityStore(selectSelectedSentenceIndex);

  return {
    isAnalyzing,
    analysis,
    error,
    currentText,
    targetAudience,
    isPanelOpen,
    selectedSentenceIndex,
  };
}

// Helper function to get audience label
export function getAudienceLabel(audience: TargetAudience): string {
  return AUDIENCE_GRADE_RANGES[audience].label;
}

// Helper function to get color for reading ease score
export function getReadingEaseColor(score: number): string {
  if (score >= 60) return 'var(--color-success, #22c55e)';
  if (score >= 30) return 'var(--color-warning, #f59e0b)';
  return 'var(--color-error, #ef4444)';
}

// Helper function to get color for audience match
export function getAudienceMatchColor(
  match: 'excellent' | 'good' | 'fair' | 'poor'
): string {
  switch (match) {
    case 'excellent':
      return 'var(--color-success, #22c55e)';
    case 'good':
      return 'var(--color-info, #3b82f6)';
    case 'fair':
      return 'var(--color-warning, #f59e0b)';
    case 'poor':
      return 'var(--color-error, #ef4444)';
  }
}
