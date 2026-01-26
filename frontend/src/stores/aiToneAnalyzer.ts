/**
 * AI Tone Analyzer Store
 *
 * Manages state for AI-powered tone analysis of text.
 * Analyzes text along multiple dimensions:
 * - Formal/Casual
 * - Positive/Negative
 * - Confident/Tentative
 */

import { create } from 'zustand';

export interface ToneAnalysisScore {
  formal: number;       // -1 (casual) to 1 (formal)
  sentiment: number;    // -1 (negative) to 1 (positive)
  confidence: number;   // -1 (tentative) to 1 (confident)
}

export interface ToneAnalysisResult {
  scores: ToneAnalysisScore;
  suggestions: ToneSuggestion[];
  analyzedText: string;
  wordCount: number;
}

export interface ToneSuggestion {
  type: 'formal' | 'sentiment' | 'confidence';
  direction: 'increase' | 'decrease';
  message: string;
  example?: string;
}

export interface TargetTone {
  formal: number;       // -1 to 1, null means no target
  sentiment: number;
  confidence: number;
}

interface AIToneAnalyzerState {
  // Analysis state
  isAnalyzing: boolean;
  analysis: ToneAnalysisResult | null;
  error: string | null;

  // Target tone for comparison
  targetTone: TargetTone | null;

  // Panel visibility
  isPanelOpen: boolean;

  // Current text being tracked
  currentText: string;
  isTrackingSelection: boolean;

  // Actions
  analyzeText: (text: string) => Promise<void>;
  analyzeSelection: (text: string) => Promise<void>;
  setTargetTone: (tone: TargetTone | null) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  clearAnalysis: () => void;
  clearError: () => void;
}

// Word lists for tone detection
const FORMAL_WORDS = [
  'therefore', 'consequently', 'furthermore', 'moreover', 'hereby',
  'pursuant', 'henceforth', 'notwithstanding', 'whereas', 'accordingly',
  'regarding', 'concerning', 'respectfully', 'sincerely', 'cordially',
  'endeavor', 'facilitate', 'implement', 'utilize', 'ascertain',
  'subsequent', 'prior', 'commence', 'conclude', 'shall', 'must'
];

const CASUAL_WORDS = [
  'hey', 'hi', 'yeah', 'yep', 'nope', 'gonna', 'wanna', 'gotta',
  'kinda', 'sorta', 'stuff', 'things', 'like', 'basically', 'actually',
  'just', 'really', 'pretty', 'super', 'cool', 'awesome', 'great',
  'ok', 'okay', 'thanks', 'bye', 'lol', 'btw', 'fyi', 'asap'
];

const POSITIVE_WORDS = [
  'excellent', 'wonderful', 'amazing', 'fantastic', 'great', 'good',
  'love', 'happy', 'pleased', 'delighted', 'thrilled', 'excited',
  'success', 'successful', 'achieve', 'accomplish', 'improve', 'benefit',
  'opportunity', 'advantage', 'positive', 'optimistic', 'confident',
  'grateful', 'appreciate', 'thank', 'welcome', 'enjoy', 'celebrate'
];

const NEGATIVE_WORDS = [
  'terrible', 'awful', 'horrible', 'bad', 'poor', 'disappointing',
  'hate', 'sad', 'upset', 'frustrated', 'angry', 'annoyed',
  'fail', 'failure', 'problem', 'issue', 'concern', 'worry',
  'unfortunately', 'regret', 'sorry', 'mistake', 'error', 'wrong',
  'difficult', 'challenging', 'obstacle', 'barrier', 'risk', 'threat'
];

const CONFIDENT_WORDS = [
  'will', 'definitely', 'certainly', 'absolutely', 'clearly', 'obviously',
  'undoubtedly', 'surely', 'guarantee', 'promise', 'commit', 'ensure',
  'must', 'shall', 'always', 'never', 'know', 'believe', 'confident',
  'proven', 'demonstrated', 'established', 'fact', 'evidence', 'certain'
];

const TENTATIVE_WORDS = [
  'might', 'maybe', 'perhaps', 'possibly', 'could', 'would', 'should',
  'think', 'believe', 'feel', 'seem', 'appear', 'suggest', 'indicate',
  'probably', 'likely', 'unlikely', 'uncertain', 'unsure', 'guess',
  'hope', 'try', 'attempt', 'somewhat', 'sort of', 'kind of',
  'in my opinion', 'i think', 'it seems', 'it appears'
];

function countWordMatches(text: string, wordList: string[]): number {
  const lowerText = text.toLowerCase();
  let count = 0;
  for (const word of wordList) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

function calculateScore(positiveCount: number, negativeCount: number, totalWords: number): number {
  if (totalWords === 0) return 0;

  const normalizedPositive = positiveCount / totalWords;
  const normalizedNegative = negativeCount / totalWords;

  // Calculate raw score and clamp to -1 to 1 range
  const score = (normalizedPositive - normalizedNegative) * 10;
  return Math.max(-1, Math.min(1, score));
}

function analyzeTone(text: string): ToneAnalysisResult {
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;

  if (wordCount === 0) {
    return {
      scores: { formal: 0, sentiment: 0, confidence: 0 },
      suggestions: [],
      analyzedText: text,
      wordCount: 0
    };
  }

  // Count matches for each dimension
  const formalCount = countWordMatches(text, FORMAL_WORDS);
  const casualCount = countWordMatches(text, CASUAL_WORDS);
  const positiveCount = countWordMatches(text, POSITIVE_WORDS);
  const negativeCount = countWordMatches(text, NEGATIVE_WORDS);
  const confidentCount = countWordMatches(text, CONFIDENT_WORDS);
  const tentativeCount = countWordMatches(text, TENTATIVE_WORDS);

  // Calculate scores
  const formalScore = calculateScore(formalCount, casualCount, wordCount);
  const sentimentScore = calculateScore(positiveCount, negativeCount, wordCount);
  const confidenceScore = calculateScore(confidentCount, tentativeCount, wordCount);

  const scores: ToneAnalysisScore = {
    formal: formalScore,
    sentiment: sentimentScore,
    confidence: confidenceScore
  };

  // Generate suggestions
  const suggestions: ToneSuggestion[] = [];

  // Formal/Casual suggestions
  if (formalScore < -0.3) {
    suggestions.push({
      type: 'formal',
      direction: 'increase',
      message: 'Consider using more formal language for professional contexts',
      example: 'Replace "hey" with "Hello" or "Greetings"'
    });
  } else if (formalScore > 0.5) {
    suggestions.push({
      type: 'formal',
      direction: 'decrease',
      message: 'Consider a more conversational tone to seem approachable',
      example: 'Replace "utilize" with "use" or "furthermore" with "also"'
    });
  }

  // Sentiment suggestions
  if (sentimentScore < -0.3) {
    suggestions.push({
      type: 'sentiment',
      direction: 'increase',
      message: 'The tone seems negative. Consider reframing with positive language',
      example: 'Focus on solutions rather than problems'
    });
  } else if (sentimentScore > 0.6) {
    suggestions.push({
      type: 'sentiment',
      direction: 'decrease',
      message: 'Consider balancing enthusiasm with objectivity',
      example: 'Include specific evidence to support positive claims'
    });
  }

  // Confidence suggestions
  if (confidenceScore < -0.3) {
    suggestions.push({
      type: 'confidence',
      direction: 'increase',
      message: 'The writing appears tentative. Consider removing hedging language',
      example: 'Replace "I think we might" with "We will"'
    });
  } else if (confidenceScore > 0.6) {
    suggestions.push({
      type: 'confidence',
      direction: 'decrease',
      message: 'Consider adding nuance to avoid appearing overconfident',
      example: 'Acknowledge complexity where appropriate'
    });
  }

  return {
    scores,
    suggestions,
    analyzedText: text,
    wordCount
  };
}

export const useAIToneAnalyzerStore = create<AIToneAnalyzerState>()((set, get) => ({
  // Initial state
  isAnalyzing: false,
  analysis: null,
  error: null,
  targetTone: null,
  isPanelOpen: false,
  currentText: '',
  isTrackingSelection: false,

  analyzeText: async (text: string) => {
    if (!text.trim()) {
      set({
        analysis: null,
        error: null,
        currentText: '',
        isAnalyzing: false
      });
      return;
    }

    set({ isAnalyzing: true, error: null, currentText: text });

    try {
      // Simulate API delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 300));

      const analysis = analyzeTone(text);

      set({
        analysis,
        isAnalyzing: false
      });
    } catch (error) {
      set({
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Failed to analyze tone'
      });
    }
  },

  analyzeSelection: async (text: string) => {
    const state = get();
    state.analyzeText(text);
    set({ isTrackingSelection: true });
  },

  setTargetTone: (tone: TargetTone | null) => {
    set({ targetTone: tone });
  },

  togglePanel: () => {
    set(state => ({ isPanelOpen: !state.isPanelOpen }));
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
      isTrackingSelection: false
    });
  },

  clearError: () => {
    set({ error: null });
  }
}));

// Individual selectors for stable references
const selectIsAnalyzing = (state: AIToneAnalyzerState) => state.isAnalyzing;
const selectAnalysis = (state: AIToneAnalyzerState) => state.analysis;
const selectError = (state: AIToneAnalyzerState) => state.error;
const selectTargetTone = (state: AIToneAnalyzerState) => state.targetTone;
const selectIsPanelOpen = (state: AIToneAnalyzerState) => state.isPanelOpen;
const selectCurrentText = (state: AIToneAnalyzerState) => state.currentText;
const selectIsTrackingSelection = (state: AIToneAnalyzerState) => state.isTrackingSelection;

// Hook for accessing the store with stable selectors
export function useAIToneAnalyzer() {
  const isAnalyzing = useAIToneAnalyzerStore(selectIsAnalyzing);
  const analysis = useAIToneAnalyzerStore(selectAnalysis);
  const error = useAIToneAnalyzerStore(selectError);
  const targetTone = useAIToneAnalyzerStore(selectTargetTone);
  const isPanelOpen = useAIToneAnalyzerStore(selectIsPanelOpen);
  const currentText = useAIToneAnalyzerStore(selectCurrentText);
  const isTrackingSelection = useAIToneAnalyzerStore(selectIsTrackingSelection);

  return {
    isAnalyzing,
    analysis,
    error,
    targetTone,
    isPanelOpen,
    currentText,
    isTrackingSelection
  };
}

// Helper function to get label for score
export function getScoreLabel(score: number, dimension: 'formal' | 'sentiment' | 'confidence'): string {
  const labels = {
    formal: {
      negative: 'Casual',
      neutral: 'Neutral',
      positive: 'Formal'
    },
    sentiment: {
      negative: 'Negative',
      neutral: 'Neutral',
      positive: 'Positive'
    },
    confidence: {
      negative: 'Tentative',
      neutral: 'Balanced',
      positive: 'Confident'
    }
  };

  if (score < -0.3) return labels[dimension].negative;
  if (score > 0.3) return labels[dimension].positive;
  return labels[dimension].neutral;
}

// Helper function to get color for score
export function getScoreColor(score: number): string {
  if (score < -0.3) return 'var(--color-warning)';
  if (score > 0.3) return 'var(--color-success)';
  return 'var(--color-neutral)';
}
