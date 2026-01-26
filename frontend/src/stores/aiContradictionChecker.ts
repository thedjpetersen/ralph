/**
 * AI Contradiction Checker Store
 *
 * Manages state for AI-powered contradiction and consistency analysis.
 * Features:
 * - Detection of contradictory statements
 * - Identification of inconsistencies in facts, dates, and claims
 * - Explanations for each detected contradiction
 * - Suggestions to resolve contradictions
 * - Ability to dismiss false positives
 */

import { create } from 'zustand';

export type ContradictionSeverity = 'high' | 'medium' | 'low';

export type ContradictionType =
  | 'factual'
  | 'temporal'
  | 'quantitative'
  | 'logical'
  | 'tonal';

export interface StatementPair {
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface Contradiction {
  id: string;
  type: ContradictionType;
  severity: ContradictionSeverity;
  statement1: StatementPair;
  statement2: StatementPair;
  explanation: string;
  suggestion: string;
  isDismissed: boolean;
}

export interface ContradictionAnalysisResult {
  contradictions: Contradiction[];
  totalStatements: number;
  analyzedText: string;
  consistencyScore: number; // 0-100, higher is more consistent
}

interface AIContradictionCheckerState {
  // Analysis state
  isAnalyzing: boolean;
  analysis: ContradictionAnalysisResult | null;
  error: string | null;

  // Current text being tracked
  currentText: string;

  // Panel visibility
  isPanelOpen: boolean;

  // Selected contradiction for details
  selectedContradictionId: string | null;

  // Dismissed contradictions (persisted)
  dismissedIds: Set<string>;

  // Actions
  analyzeText: (text: string) => Promise<void>;
  selectContradiction: (id: string | null) => void;
  dismissContradiction: (id: string) => void;
  restoreContradiction: (id: string) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  clearAnalysis: () => void;
  clearError: () => void;
}

// Generate a unique ID for contradictions
function generateId(): string {
  return `contradiction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get contradiction type label
export function getContradictionTypeLabel(type: ContradictionType): string {
  switch (type) {
    case 'factual':
      return 'Factual Contradiction';
    case 'temporal':
      return 'Timeline Inconsistency';
    case 'quantitative':
      return 'Number Mismatch';
    case 'logical':
      return 'Logical Contradiction';
    case 'tonal':
      return 'Tone Inconsistency';
  }
}

// Get severity color
export function getSeverityColor(severity: ContradictionSeverity): string {
  switch (severity) {
    case 'high':
      return 'var(--color-error, #ef4444)';
    case 'medium':
      return 'var(--color-warning, #f59e0b)';
    case 'low':
      return 'var(--color-info, #3b82f6)';
  }
}

// Split text into sentences with positions
function splitIntoSentences(text: string): StatementPair[] {
  const sentences: StatementPair[] = [];
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

// Detect quantitative contradictions
function detectQuantitativeContradictions(
  sentences: StatementPair[]
): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const numberContexts: Map<
    string,
    { value: number; sentence: StatementPair; context: string }[]
  > = new Map();

  // Keywords that indicate context
  const contextKeywords = [
    'cost',
    'price',
    'revenue',
    'profit',
    'users',
    'customers',
    'employees',
    'members',
    'years',
    'months',
    'days',
    'percent',
    'growth',
    'increase',
    'decrease',
    'total',
    'average',
  ];

  for (const sentence of sentences) {
    const matches = sentence.text.match(
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(%|percent|dollars?|\$|k|m|b)?/gi
    );
    if (!matches) continue;

    for (const match of matches) {
      const numMatch = match.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
      if (!numMatch) continue;

      const value = parseFloat(numMatch[1].replace(/,/g, ''));
      const lowerSentence = sentence.text.toLowerCase();

      // Find context keyword
      let context = 'unknown';
      for (const keyword of contextKeywords) {
        if (lowerSentence.includes(keyword)) {
          context = keyword;
          break;
        }
      }

      const existing = numberContexts.get(context) || [];
      existing.push({ value, sentence, context });
      numberContexts.set(context, existing);
    }
  }

  // Check for contradictions within same context
  for (const [context, entries] of numberContexts) {
    if (context === 'unknown' || entries.length < 2) continue;

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const diff = Math.abs(entries[i].value - entries[j].value);
        const avg = (entries[i].value + entries[j].value) / 2;
        const percentDiff = avg > 0 ? (diff / avg) * 100 : 0;

        // Flag if difference is significant (>20%)
        if (percentDiff > 20 && diff > 1) {
          contradictions.push({
            id: generateId(),
            type: 'quantitative',
            severity: percentDiff > 50 ? 'high' : 'medium',
            statement1: entries[i].sentence,
            statement2: entries[j].sentence,
            explanation: `Different ${context} values mentioned: ${entries[i].value} vs ${entries[j].value} (${Math.round(percentDiff)}% difference).`,
            suggestion: `Verify the correct ${context} value and use it consistently throughout the document.`,
            isDismissed: false,
          });
        }
      }
    }
  }

  return contradictions;
}

// Detect temporal contradictions
function detectTemporalContradictions(
  sentences: StatementPair[]
): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const temporalMarkers: { sentence: StatementPair; markers: string[] }[] = [];

  // Temporal keywords and their relative order
  const temporalKeywords = [
    'before',
    'after',
    'first',
    'then',
    'later',
    'earlier',
    'initially',
    'finally',
    'previously',
    'subsequently',
    'prior to',
    'following',
  ];

  for (const sentence of sentences) {
    const lowerText = sentence.text.toLowerCase();
    const markers = temporalKeywords.filter((kw) => lowerText.includes(kw));
    if (markers.length > 0) {
      temporalMarkers.push({ sentence, markers });
    }
  }

  // Check for conflicting temporal references
  for (let i = 0; i < temporalMarkers.length; i++) {
    for (let j = i + 1; j < temporalMarkers.length; j++) {
      const s1 = temporalMarkers[i];
      const s2 = temporalMarkers[j];

      // Check for before/after conflicts about same event
      if (
        (s1.markers.includes('before') && s2.markers.includes('after')) ||
        (s1.markers.includes('first') && s2.markers.includes('earlier'))
      ) {
        // Check if they reference similar subjects
        const words1 = new Set(
          s1.sentence.text.toLowerCase().match(/\b\w{4,}\b/g) || []
        );
        const words2 = new Set(
          s2.sentence.text.toLowerCase().match(/\b\w{4,}\b/g) || []
        );
        const commonWords = [...words1].filter((w) => words2.has(w));

        if (commonWords.length >= 2) {
          contradictions.push({
            id: generateId(),
            type: 'temporal',
            severity: 'medium',
            statement1: s1.sentence,
            statement2: s2.sentence,
            explanation: `Conflicting temporal references detected. These statements may describe events in inconsistent order.`,
            suggestion: `Review the timeline of events and ensure temporal markers are consistent.`,
            isDismissed: false,
          });
        }
      }
    }
  }

  return contradictions;
}

// Detect logical contradictions
function detectLogicalContradictions(
  sentences: StatementPair[]
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  // Patterns that indicate assertion and negation
  const positivePatterns = [
    /\b(is|are|was|were|has|have|will)\s+(\w+)/gi,
    /\b(always|every|all|must|definitely|certainly)\b/gi,
  ];

  const negativePatterns = [
    /\b(is not|isn't|are not|aren't|was not|wasn't|were not|weren't|has not|hasn't|have not|haven't|will not|won't|cannot|can't)\s+(\w+)/gi,
    /\b(never|no|none|nobody|nothing|neither)\b/gi,
  ];

  // Extract assertions and negations
  const assertions: { sentence: StatementPair; subject: string; isPositive: boolean }[] = [];

  for (const sentence of sentences) {
    const lowerText = sentence.text.toLowerCase();

    // Check for positive assertions
    for (const pattern of positivePatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(lowerText);
      if (match) {
        // Extract likely subject (first noun before verb)
        const subjectMatch = lowerText.match(/(\b\w+\b)\s+(?:is|are|was|were|has|have|will)/);
        if (subjectMatch) {
          assertions.push({
            sentence,
            subject: subjectMatch[1],
            isPositive: true,
          });
        }
      }
    }

    // Check for negative assertions
    for (const pattern of negativePatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(lowerText);
      if (match) {
        const subjectMatch = lowerText.match(/(\b\w+\b)\s+(?:is not|isn't|are not|aren't|was not|wasn't|were not|weren't)/);
        if (subjectMatch) {
          assertions.push({
            sentence,
            subject: subjectMatch[1],
            isPositive: false,
          });
        }
      }
    }
  }

  // Find contradicting assertions about same subject
  for (let i = 0; i < assertions.length; i++) {
    for (let j = i + 1; j < assertions.length; j++) {
      if (
        assertions[i].subject === assertions[j].subject &&
        assertions[i].isPositive !== assertions[j].isPositive
      ) {
        contradictions.push({
          id: generateId(),
          type: 'logical',
          severity: 'high',
          statement1: assertions[i].sentence,
          statement2: assertions[j].sentence,
          explanation: `Contradictory statements about "${assertions[i].subject}": one asserts a positive claim while the other negates it.`,
          suggestion: `Clarify your position on "${assertions[i].subject}" and ensure consistency throughout.`,
          isDismissed: false,
        });
      }
    }
  }

  return contradictions;
}

// Detect tonal inconsistencies
function detectTonalInconsistencies(
  sentences: StatementPair[]
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  // Words indicating positive tone
  const positiveWords = new Set([
    'excellent',
    'great',
    'good',
    'fantastic',
    'wonderful',
    'amazing',
    'best',
    'success',
    'successful',
    'positive',
    'beneficial',
    'advantageous',
    'impressive',
    'outstanding',
  ]);

  // Words indicating negative tone
  const negativeWords = new Set([
    'terrible',
    'bad',
    'poor',
    'awful',
    'worst',
    'failure',
    'failed',
    'negative',
    'detrimental',
    'harmful',
    'disappointing',
    'inadequate',
    'problematic',
  ]);

  // Analyze tone of each sentence
  const sentenceTones: { sentence: StatementPair; tone: 'positive' | 'negative' | 'neutral'; subject: string | null }[] = [];

  for (const sentence of sentences) {
    const words = sentence.text.toLowerCase().match(/\b\w+\b/g) || [];
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.has(word)) positiveCount++;
      if (negativeWords.has(word)) negativeCount++;
    }

    if (positiveCount > 0 || negativeCount > 0) {
      // Extract subject (simplified: first capitalized word or common noun)
      const subjectMatch = sentence.text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/) ||
        sentence.text.match(/the\s+(\w+)/i);
      const subject = subjectMatch ? subjectMatch[1].toLowerCase() : null;

      sentenceTones.push({
        sentence,
        tone:
          positiveCount > negativeCount
            ? 'positive'
            : negativeCount > positiveCount
              ? 'negative'
              : 'neutral',
        subject,
      });
    }
  }

  // Find tonal contradictions about same subject
  for (let i = 0; i < sentenceTones.length; i++) {
    for (let j = i + 1; j < sentenceTones.length; j++) {
      if (
        sentenceTones[i].subject &&
        sentenceTones[i].subject === sentenceTones[j].subject &&
        sentenceTones[i].tone !== 'neutral' &&
        sentenceTones[j].tone !== 'neutral' &&
        sentenceTones[i].tone !== sentenceTones[j].tone
      ) {
        contradictions.push({
          id: generateId(),
          type: 'tonal',
          severity: 'low',
          statement1: sentenceTones[i].sentence,
          statement2: sentenceTones[j].sentence,
          explanation: `Inconsistent tone about "${sentenceTones[i].subject}": described positively in one place and negatively in another.`,
          suggestion: `Consider whether the mixed tone about "${sentenceTones[i].subject}" is intentional or should be unified.`,
          isDismissed: false,
        });
      }
    }
  }

  return contradictions;
}

// Main analysis function
function analyzeContradictions(text: string): ContradictionAnalysisResult {
  const sentences = splitIntoSentences(text);

  if (sentences.length < 2) {
    return {
      contradictions: [],
      totalStatements: sentences.length,
      analyzedText: text,
      consistencyScore: 100,
    };
  }

  // Run all detection algorithms
  const quantitativeContradictions = detectQuantitativeContradictions(sentences);
  const temporalContradictions = detectTemporalContradictions(sentences);
  const logicalContradictions = detectLogicalContradictions(sentences);
  const tonalInconsistencies = detectTonalInconsistencies(sentences);

  const allContradictions = [
    ...quantitativeContradictions,
    ...temporalContradictions,
    ...logicalContradictions,
    ...tonalInconsistencies,
  ];

  // Calculate consistency score
  const maxPenalty = 100;
  let penalty = 0;
  for (const c of allContradictions) {
    switch (c.severity) {
      case 'high':
        penalty += 15;
        break;
      case 'medium':
        penalty += 10;
        break;
      case 'low':
        penalty += 5;
        break;
    }
  }
  const consistencyScore = Math.max(0, maxPenalty - penalty);

  return {
    contradictions: allContradictions,
    totalStatements: sentences.length,
    analyzedText: text,
    consistencyScore,
  };
}

export const useAIContradictionCheckerStore = create<AIContradictionCheckerState>()(
  (set, get) => ({
    // Initial state
    isAnalyzing: false,
    analysis: null,
    error: null,
    currentText: '',
    isPanelOpen: false,
    selectedContradictionId: null,
    dismissedIds: new Set<string>(),

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
        await new Promise((resolve) => setTimeout(resolve, 500));

        const analysis = analyzeContradictions(text);

        // Mark previously dismissed contradictions
        const dismissedIds = get().dismissedIds;
        for (const c of analysis.contradictions) {
          if (dismissedIds.has(c.id)) {
            c.isDismissed = true;
          }
        }

        set({
          analysis,
          isAnalyzing: false,
          selectedContradictionId: null,
        });
      } catch (error) {
        set({
          isAnalyzing: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to analyze contradictions',
        });
      }
    },

    selectContradiction: (id: string | null) => {
      set({ selectedContradictionId: id });
    },

    dismissContradiction: (id: string) => {
      const state = get();
      const newDismissedIds = new Set(state.dismissedIds);
      newDismissedIds.add(id);

      if (state.analysis) {
        const updatedContradictions = state.analysis.contradictions.map((c) =>
          c.id === id ? { ...c, isDismissed: true } : c
        );
        set({
          dismissedIds: newDismissedIds,
          analysis: {
            ...state.analysis,
            contradictions: updatedContradictions,
          },
        });
      } else {
        set({ dismissedIds: newDismissedIds });
      }
    },

    restoreContradiction: (id: string) => {
      const state = get();
      const newDismissedIds = new Set(state.dismissedIds);
      newDismissedIds.delete(id);

      if (state.analysis) {
        const updatedContradictions = state.analysis.contradictions.map((c) =>
          c.id === id ? { ...c, isDismissed: false } : c
        );
        set({
          dismissedIds: newDismissedIds,
          analysis: {
            ...state.analysis,
            contradictions: updatedContradictions,
          },
        });
      } else {
        set({ dismissedIds: newDismissedIds });
      }
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
        selectedContradictionId: null,
      });
    },

    clearError: () => {
      set({ error: null });
    },
  })
);

// Individual selectors for stable references
const selectIsAnalyzing = (state: AIContradictionCheckerState) => state.isAnalyzing;
const selectAnalysis = (state: AIContradictionCheckerState) => state.analysis;
const selectError = (state: AIContradictionCheckerState) => state.error;
const selectCurrentText = (state: AIContradictionCheckerState) => state.currentText;
const selectIsPanelOpen = (state: AIContradictionCheckerState) => state.isPanelOpen;
const selectSelectedContradictionId = (state: AIContradictionCheckerState) =>
  state.selectedContradictionId;

// Hook for accessing the store with stable selectors
export function useAIContradictionChecker() {
  const isAnalyzing = useAIContradictionCheckerStore(selectIsAnalyzing);
  const analysis = useAIContradictionCheckerStore(selectAnalysis);
  const error = useAIContradictionCheckerStore(selectError);
  const currentText = useAIContradictionCheckerStore(selectCurrentText);
  const isPanelOpen = useAIContradictionCheckerStore(selectIsPanelOpen);
  const selectedContradictionId = useAIContradictionCheckerStore(
    selectSelectedContradictionId
  );

  return {
    isAnalyzing,
    analysis,
    error,
    currentText,
    isPanelOpen,
    selectedContradictionId,
  };
}

// Helper to get active (non-dismissed) contradictions count
export function getActiveContradictionsCount(
  analysis: ContradictionAnalysisResult | null
): number {
  if (!analysis) return 0;
  return analysis.contradictions.filter((c) => !c.isDismissed).length;
}
