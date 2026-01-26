/**
 * AI Fact-Checking Store
 *
 * Manages state for AI-powered fact-checking and claim verification.
 * Features:
 * - Detection of factual claims that may need verification
 * - Confidence scoring for each claim
 * - Suggested verification sources
 * - Ability to dismiss individual highlights
 * - Toggle fact-checking mode on/off
 */

import { create } from 'zustand';

export type ClaimCategory =
  | 'statistic'
  | 'attribution'
  | 'date'
  | 'quantity'
  | 'scientific'
  | 'historical'
  | 'quote';

export type VerificationStatus =
  | 'unverified'
  | 'likely_accurate'
  | 'needs_verification'
  | 'questionable';

export interface FactCheckItem {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  category: ClaimCategory;
  confidence: number; // 0-100, how confident the detection is
  status: VerificationStatus;
  explanation: string;
  sources: string[];
  isDismissed: boolean;
}

export interface FactCheckAnalysisResult {
  claims: FactCheckItem[];
  totalClaims: number;
  analyzedText: string;
  overallConfidence: number; // 0-100, overall document factual reliability
}

interface AIFactCheckingState {
  // Analysis state
  isAnalyzing: boolean;
  analysis: FactCheckAnalysisResult | null;
  error: string | null;

  // Current text being tracked
  currentText: string;

  // Panel visibility
  isPanelOpen: boolean;

  // Fact-checking mode enabled (shows highlights in document)
  isFactCheckingEnabled: boolean;

  // Selected claim for details
  selectedClaimId: string | null;

  // Hovered claim (for tooltip)
  hoveredClaimId: string | null;

  // Dismissed claims (persisted)
  dismissedIds: Set<string>;

  // Actions
  analyzeText: (text: string) => Promise<void>;
  selectClaim: (id: string | null) => void;
  hoverClaim: (id: string | null) => void;
  dismissClaim: (id: string) => void;
  restoreClaim: (id: string) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  toggleFactChecking: () => void;
  enableFactChecking: () => void;
  disableFactChecking: () => void;
  clearAnalysis: () => void;
  clearError: () => void;
}

// Generate a unique ID for claims
function generateId(): string {
  return `factcheck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get claim category label
export function getClaimCategoryLabel(category: ClaimCategory): string {
  switch (category) {
    case 'statistic':
      return 'Statistic';
    case 'attribution':
      return 'Attribution';
    case 'date':
      return 'Date/Time';
    case 'quantity':
      return 'Quantity';
    case 'scientific':
      return 'Scientific Claim';
    case 'historical':
      return 'Historical Fact';
    case 'quote':
      return 'Quote';
  }
}

// Get verification status color
export function getStatusColor(status: VerificationStatus): string {
  switch (status) {
    case 'likely_accurate':
      return 'var(--color-success, #22c55e)';
    case 'unverified':
      return 'var(--color-info, #3b82f6)';
    case 'needs_verification':
      return 'var(--color-warning, #f59e0b)';
    case 'questionable':
      return 'var(--color-error, #ef4444)';
  }
}

// Get verification status label
export function getStatusLabel(status: VerificationStatus): string {
  switch (status) {
    case 'likely_accurate':
      return 'Likely Accurate';
    case 'unverified':
      return 'Unverified';
    case 'needs_verification':
      return 'Needs Verification';
    case 'questionable':
      return 'Questionable';
  }
}

// Common verification sources by category
const VERIFICATION_SOURCES: Record<ClaimCategory, string[]> = {
  statistic: ['Bureau of Labor Statistics', 'World Bank Data', 'Statista', 'Census.gov'],
  attribution: ['Official Website', 'Wikipedia', 'News Archives'],
  date: ['Wikipedia', 'History.com', 'News Archives'],
  quantity: ['Official Reports', 'Industry Data', 'Government Statistics'],
  scientific: ['PubMed', 'Nature', 'Science Direct', 'Google Scholar'],
  historical: ['History.com', 'Britannica', 'Wikipedia', 'National Archives'],
  quote: ['Original Source', 'Wikiquote', 'News Archives'],
};

// Patterns for detecting different types of claims
const CLAIM_PATTERNS: { category: ClaimCategory; patterns: RegExp[] }[] = [
  {
    category: 'statistic',
    patterns: [
      /(\d+(?:\.\d+)?)\s*(%|percent|per\s*cent)/gi,
      /(?:average|mean|median|ratio|rate)\s+(?:of|is|was)\s+[\d.]+/gi,
      /(?:increased|decreased|grew|fell|rose|dropped)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*(%|percent)?/gi,
    ],
  },
  {
    category: 'quantity',
    patterns: [
      /(\$|€|£|¥)?\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion|trillion|thousand)?/gi,
      /(?:over|under|about|approximately|nearly|almost)\s+\d+/gi,
      /\d+\s+(?:people|users|customers|employees|members|visitors)/gi,
    ],
  },
  {
    category: 'date',
    patterns: [
      /(?:in|on|since|from|until)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}/gi,
      /(?:in|on|since|from|until)\s+\d{4}/gi,
      /(?:\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/gi,
    ],
  },
  {
    category: 'attribution',
    patterns: [
      /(?:according to|stated by|reported by|said|claimed|announced)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/gi,
      /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:said|stated|claimed|reported|announced|argued|suggested)/gi,
    ],
  },
  {
    category: 'quote',
    patterns: [
      /"[^"]{20,}"/g,
      /'[^']{20,}'/g,
    ],
  },
  {
    category: 'scientific',
    patterns: [
      /(?:study|research|experiment|trial|analysis)\s+(?:shows?|proves?|demonstrates?|found|revealed)/gi,
      /(?:scientists?|researchers?|experts?)\s+(?:say|believe|found|discovered|concluded)/gi,
      /(?:causes?|prevents?|reduces?|increases?|affects?)\s+(?:cancer|disease|mortality|health|risk)/gi,
    ],
  },
  {
    category: 'historical',
    patterns: [
      /(?:in|during|after|before)\s+(?:the\s+)?(?:World War|Civil War|Revolution|Era|Age|Period)/gi,
      /(?:first|oldest|earliest|original|founded|established|invented|discovered)\s+(?:in|on|at)\s+\d{4}/gi,
    ],
  },
];

// Analyze text for factual claims
function analyzeFactualClaims(text: string): FactCheckAnalysisResult {
  const claims: FactCheckItem[] = [];
  const usedRanges: { start: number; end: number }[] = [];

  // Helper to check if a range overlaps with existing ranges
  const overlapsWithExisting = (start: number, end: number): boolean => {
    return usedRanges.some(range =>
      (start >= range.start && start < range.end) ||
      (end > range.start && end <= range.end) ||
      (start <= range.start && end >= range.end)
    );
  };

  // Extract sentence containing the match
  const extractSentence = (matchIndex: number, matchLength: number): { text: string; startIndex: number; endIndex: number } => {
    // Find sentence boundaries
    const sentenceStart = Math.max(0, text.lastIndexOf('.', matchIndex) + 1, text.lastIndexOf('!', matchIndex) + 1, text.lastIndexOf('?', matchIndex) + 1);
    let sentenceEnd = text.indexOf('.', matchIndex + matchLength);
    if (sentenceEnd === -1) sentenceEnd = text.length;
    else sentenceEnd += 1;

    // Also check for ! and ?
    const exclamEnd = text.indexOf('!', matchIndex + matchLength);
    const questEnd = text.indexOf('?', matchIndex + matchLength);
    if (exclamEnd !== -1 && exclamEnd < sentenceEnd) sentenceEnd = exclamEnd + 1;
    if (questEnd !== -1 && questEnd < sentenceEnd) sentenceEnd = questEnd + 1;

    return {
      text: text.slice(sentenceStart, sentenceEnd).trim(),
      startIndex: sentenceStart,
      endIndex: sentenceEnd,
    };
  };

  // Calculate confidence based on claim specificity and context
  const calculateConfidence = (category: ClaimCategory, matchText: string): number => {
    let confidence = 70; // Base confidence

    // More specific numbers are more likely to be verifiable claims
    if (/\d{4}/.test(matchText)) confidence += 10; // Year
    if (/\d+%/.test(matchText)) confidence += 10; // Percentage
    if (/\$|€|£|¥/.test(matchText)) confidence += 5; // Currency
    if (/million|billion|trillion/.test(matchText)) confidence += 10; // Large numbers

    // Quotes and attributions are highly verifiable
    if (category === 'quote' || category === 'attribution') confidence += 15;

    // Scientific claims need more scrutiny
    if (category === 'scientific') confidence -= 5;

    return Math.min(100, Math.max(0, confidence));
  };

  // Determine verification status based on claim characteristics
  const determineStatus = (_category: ClaimCategory, confidence: number): VerificationStatus => {
    if (confidence >= 85) return 'likely_accurate';
    if (confidence >= 60) return 'needs_verification';
    if (confidence >= 40) return 'unverified';
    return 'questionable';
  };

  // Generate explanation based on category
  const generateExplanation = (category: ClaimCategory, matchText: string): string => {
    switch (category) {
      case 'statistic':
        return `This statistic (${matchText.trim()}) should be verified against reliable data sources.`;
      case 'quantity':
        return `This numerical claim should be fact-checked against official records or reports.`;
      case 'date':
        return `This date reference should be verified for historical accuracy.`;
      case 'attribution':
        return `This attributed statement should be verified from the original source.`;
      case 'quote':
        return `This quotation should be verified against the original source.`;
      case 'scientific':
        return `This scientific claim should be verified against peer-reviewed research.`;
      case 'historical':
        return `This historical claim should be verified against authoritative historical sources.`;
    }
  };

  // Process each pattern category
  for (const { category, patterns } of CLAIM_PATTERNS) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;

        // Skip if this range overlaps with an existing claim
        if (overlapsWithExisting(matchStart, matchEnd)) continue;

        // Extract the full sentence
        const sentence = extractSentence(matchStart, match[0].length);

        // Skip very short matches or very long sentences
        if (match[0].length < 3 || sentence.text.length > 500) continue;

        const confidence = calculateConfidence(category, match[0]);
        const status = determineStatus(category, confidence);

        claims.push({
          id: generateId(),
          text: sentence.text,
          startIndex: sentence.startIndex,
          endIndex: sentence.endIndex,
          category,
          confidence,
          status,
          explanation: generateExplanation(category, match[0]),
          sources: VERIFICATION_SOURCES[category],
          isDismissed: false,
        });

        usedRanges.push({ start: sentence.startIndex, end: sentence.endIndex });
      }
    }
  }

  // Sort claims by position in text
  claims.sort((a, b) => a.startIndex - b.startIndex);

  // Calculate overall confidence
  const overallConfidence = claims.length > 0
    ? Math.round(claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length)
    : 100;

  return {
    claims,
    totalClaims: claims.length,
    analyzedText: text,
    overallConfidence,
  };
}

export const useAIFactCheckingStore = create<AIFactCheckingState>()(
  (set, get) => ({
    // Initial state
    isAnalyzing: false,
    analysis: null,
    error: null,
    currentText: '',
    isPanelOpen: false,
    isFactCheckingEnabled: false,
    selectedClaimId: null,
    hoveredClaimId: null,
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

        const analysis = analyzeFactualClaims(text);

        // Mark previously dismissed claims
        const dismissedIds = get().dismissedIds;
        for (const claim of analysis.claims) {
          if (dismissedIds.has(claim.id)) {
            claim.isDismissed = true;
          }
        }

        set({
          analysis,
          isAnalyzing: false,
          selectedClaimId: null,
        });
      } catch (error) {
        set({
          isAnalyzing: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to analyze text for factual claims',
        });
      }
    },

    selectClaim: (id: string | null) => {
      set({ selectedClaimId: id });
    },

    hoverClaim: (id: string | null) => {
      set({ hoveredClaimId: id });
    },

    dismissClaim: (id: string) => {
      const state = get();
      const newDismissedIds = new Set(state.dismissedIds);
      newDismissedIds.add(id);

      if (state.analysis) {
        const updatedClaims = state.analysis.claims.map((c) =>
          c.id === id ? { ...c, isDismissed: true } : c
        );
        set({
          dismissedIds: newDismissedIds,
          analysis: {
            ...state.analysis,
            claims: updatedClaims,
          },
        });
      } else {
        set({ dismissedIds: newDismissedIds });
      }
    },

    restoreClaim: (id: string) => {
      const state = get();
      const newDismissedIds = new Set(state.dismissedIds);
      newDismissedIds.delete(id);

      if (state.analysis) {
        const updatedClaims = state.analysis.claims.map((c) =>
          c.id === id ? { ...c, isDismissed: false } : c
        );
        set({
          dismissedIds: newDismissedIds,
          analysis: {
            ...state.analysis,
            claims: updatedClaims,
          },
        });
      } else {
        set({ dismissedIds: newDismissedIds });
      }
    },

    togglePanel: () => {
      const isPanelOpen = get().isPanelOpen;
      set({
        isPanelOpen: !isPanelOpen,
        // Enable fact-checking when opening panel
        isFactCheckingEnabled: !isPanelOpen ? true : get().isFactCheckingEnabled,
      });
    },

    openPanel: () => {
      set({ isPanelOpen: true, isFactCheckingEnabled: true });
    },

    closePanel: () => {
      set({ isPanelOpen: false });
    },

    toggleFactChecking: () => {
      set((state) => ({ isFactCheckingEnabled: !state.isFactCheckingEnabled }));
    },

    enableFactChecking: () => {
      set({ isFactCheckingEnabled: true });
    },

    disableFactChecking: () => {
      set({ isFactCheckingEnabled: false });
    },

    clearAnalysis: () => {
      set({
        analysis: null,
        currentText: '',
        selectedClaimId: null,
        hoveredClaimId: null,
      });
    },

    clearError: () => {
      set({ error: null });
    },
  })
);

// Individual selectors for stable references
const selectIsAnalyzing = (state: AIFactCheckingState) => state.isAnalyzing;
const selectAnalysis = (state: AIFactCheckingState) => state.analysis;
const selectError = (state: AIFactCheckingState) => state.error;
const selectCurrentText = (state: AIFactCheckingState) => state.currentText;
const selectIsPanelOpen = (state: AIFactCheckingState) => state.isPanelOpen;
const selectIsFactCheckingEnabled = (state: AIFactCheckingState) => state.isFactCheckingEnabled;
const selectSelectedClaimId = (state: AIFactCheckingState) => state.selectedClaimId;
const selectHoveredClaimId = (state: AIFactCheckingState) => state.hoveredClaimId;

// Hook for accessing the store with stable selectors
export function useAIFactChecking() {
  const isAnalyzing = useAIFactCheckingStore(selectIsAnalyzing);
  const analysis = useAIFactCheckingStore(selectAnalysis);
  const error = useAIFactCheckingStore(selectError);
  const currentText = useAIFactCheckingStore(selectCurrentText);
  const isPanelOpen = useAIFactCheckingStore(selectIsPanelOpen);
  const isFactCheckingEnabled = useAIFactCheckingStore(selectIsFactCheckingEnabled);
  const selectedClaimId = useAIFactCheckingStore(selectSelectedClaimId);
  const hoveredClaimId = useAIFactCheckingStore(selectHoveredClaimId);

  return {
    isAnalyzing,
    analysis,
    error,
    currentText,
    isPanelOpen,
    isFactCheckingEnabled,
    selectedClaimId,
    hoveredClaimId,
  };
}

// Helper to get active (non-dismissed) claims count
export function getActiveClaimsCount(
  analysis: FactCheckAnalysisResult | null
): number {
  if (!analysis) return 0;
  return analysis.claims.filter((c) => !c.isDismissed).length;
}

// Helper to get claims by status
export function getClaimsByStatus(
  analysis: FactCheckAnalysisResult | null,
  status: VerificationStatus
): FactCheckItem[] {
  if (!analysis) return [];
  return analysis.claims.filter((c) => !c.isDismissed && c.status === status);
}
