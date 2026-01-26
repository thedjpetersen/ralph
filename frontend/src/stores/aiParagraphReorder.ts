import { create } from 'zustand';
import { parseBlocks } from './blockDrag';

/**
 * A suggested paragraph reordering with reasoning
 */
export interface ReorderSuggestion {
  id: string;
  originalOrder: number[];
  suggestedOrder: number[];
  reasoning: string;
  improvementScore: number; // 0-100
}

/**
 * A paragraph with its content and metadata for display
 */
export interface ParagraphItem {
  id: string;
  index: number;
  content: string;
  type: string;
  preview: string; // First 100 chars for display
}

/**
 * Undo entry for paragraph reordering
 */
export interface ParagraphReorderUndoEntry {
  previousContent: string;
  newContent: string;
  timestamp: number;
}

/**
 * AI Paragraph Reorder store state
 */
interface AIParagraphReorderState {
  // Panel state
  isPanelOpen: boolean;
  isAnalyzing: boolean;
  error: string | null;

  // Document content
  documentContent: string;
  paragraphs: ParagraphItem[];

  // Current preview order (for draggable list)
  previewOrder: number[];

  // AI suggestions
  suggestions: ReorderSuggestion[];
  selectedSuggestionId: string | null;
  showReasoning: boolean;

  // Undo support
  undoStack: ParagraphReorderUndoEntry[];
  originalContent: string;

  // Callback for applying changes
  onApply: ((newContent: string) => void) | null;

  // Actions
  openPanel: (content: string, onApply: (newContent: string) => void) => void;
  closePanel: () => void;
  analyzeStructure: () => Promise<void>;
  selectSuggestion: (id: string | null) => void;
  applyPreviewOrder: (newOrder: number[]) => void;
  applySuggestion: () => void;
  dismissPanel: () => void;
  undo: () => boolean;
  toggleReasoning: () => void;
  clearError: () => void;
}

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number = 100): string {
  const cleaned = text.replace(/\n/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + '...';
}

/**
 * Parse document content into paragraphs for display
 */
function parseParagraphs(content: string): ParagraphItem[] {
  const blocks = parseBlocks(content);
  return blocks.map((block, index) => ({
    id: block.id,
    index,
    content: block.content,
    type: block.type,
    preview: truncateText(block.content),
  }));
}

/**
 * Reconstruct content from paragraphs in a given order
 */
function reconstructContent(paragraphs: ParagraphItem[], order: number[]): string {
  return order
    .map((idx) => paragraphs[idx]?.content || '')
    .filter((c) => c)
    .join('\n\n');
}

/**
 * Mock AI analysis for paragraph reordering suggestions
 * In production, this would call an AI API
 */
async function generateMockSuggestions(paragraphs: ParagraphItem[]): Promise<ReorderSuggestion[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (paragraphs.length < 2) {
    return [];
  }

  const suggestions: ReorderSuggestion[] = [];
  const originalOrder = paragraphs.map((_, i) => i);

  // Suggestion 1: Move conclusion-like paragraphs to the end
  const conclusionKeywords = ['in conclusion', 'finally', 'to summarize', 'in summary', 'overall'];
  const hasConclusion = paragraphs.some((p) =>
    conclusionKeywords.some((kw) => p.content.toLowerCase().includes(kw))
  );

  if (hasConclusion) {
    const conclusionIdx = paragraphs.findIndex((p) =>
      conclusionKeywords.some((kw) => p.content.toLowerCase().includes(kw))
    );
    if (conclusionIdx !== paragraphs.length - 1 && conclusionIdx !== -1) {
      const newOrder = [...originalOrder];
      const [removed] = newOrder.splice(conclusionIdx, 1);
      newOrder.push(removed);
      suggestions.push({
        id: 'suggestion-conclusion',
        originalOrder,
        suggestedOrder: newOrder,
        reasoning:
          'The conclusion paragraph should typically appear at the end of the document for better flow and reader comprehension.',
        improvementScore: 75,
      });
    }
  }

  // Suggestion 2: Group related paragraphs together (based on heading proximity)
  const headingIndices = paragraphs
    .map((p, i) => (p.type === 'heading' ? i : -1))
    .filter((i) => i !== -1);

  if (headingIndices.length > 0 && paragraphs.length > 3) {
    // Simple heuristic: ensure content follows its heading
    const improvedOrder = [...originalOrder];
    let madeChange = false;

    for (let i = 0; i < paragraphs.length - 1; i++) {
      if (paragraphs[i].type === 'heading') {
        // Check if next item is also a heading (missing content)
        if (i + 1 < paragraphs.length && paragraphs[i + 1].type === 'heading') {
          // Find a non-heading paragraph to move here
          for (let j = i + 2; j < paragraphs.length; j++) {
            if (paragraphs[j].type !== 'heading') {
              const [moved] = improvedOrder.splice(
                improvedOrder.indexOf(j),
                1
              );
              improvedOrder.splice(i + 1, 0, moved);
              madeChange = true;
              break;
            }
          }
        }
      }
    }

    if (madeChange) {
      suggestions.push({
        id: 'suggestion-grouping',
        originalOrder,
        suggestedOrder: improvedOrder,
        reasoning:
          'Grouping related content under their headings improves document structure and makes it easier to navigate.',
        improvementScore: 68,
      });
    }
  }

  // Suggestion 3: Move introduction-like paragraphs to the start
  const introKeywords = ['introduction', 'overview', 'this document', 'this article', 'in this'];
  const hasIntro = paragraphs.some(
    (p, i) => i !== 0 && introKeywords.some((kw) => p.content.toLowerCase().includes(kw))
  );

  if (hasIntro) {
    const introIdx = paragraphs.findIndex(
      (p, i) => i !== 0 && introKeywords.some((kw) => p.content.toLowerCase().includes(kw))
    );
    if (introIdx > 0) {
      const newOrder = [...originalOrder];
      const [removed] = newOrder.splice(introIdx, 1);
      newOrder.unshift(removed);
      suggestions.push({
        id: 'suggestion-intro',
        originalOrder,
        suggestedOrder: newOrder,
        reasoning:
          'Moving the introduction paragraph to the beginning helps establish context for readers before diving into details.',
        improvementScore: 82,
      });
    }
  }

  // Suggestion 4: Chronological ordering (if timestamps or sequence words detected)
  const sequenceKeywords = ['first', 'second', 'third', 'then', 'next', 'after', 'before', 'finally'];
  const sequenceMatches = paragraphs.map((p) => {
    const content = p.content.toLowerCase();
    for (let i = 0; i < sequenceKeywords.length; i++) {
      if (content.startsWith(sequenceKeywords[i]) || content.includes('. ' + sequenceKeywords[i])) {
        return i;
      }
    }
    return -1;
  });

  const hasSequence = sequenceMatches.filter((m) => m !== -1).length >= 2;
  if (hasSequence) {
    const withSequence = paragraphs
      .map((_, i) => ({ idx: i, seq: sequenceMatches[i] }))
      .filter((item) => item.seq !== -1)
      .sort((a, b) => a.seq - b.seq);

    const withoutSequence = paragraphs
      .map((_, i) => i)
      .filter((i) => sequenceMatches[i] === -1);

    const newOrder = [...withoutSequence.slice(0, 1), ...withSequence.map((item) => item.idx), ...withoutSequence.slice(1)];

    if (JSON.stringify(newOrder) !== JSON.stringify(originalOrder)) {
      suggestions.push({
        id: 'suggestion-sequence',
        originalOrder,
        suggestedOrder: newOrder,
        reasoning:
          'Reordering paragraphs to follow their natural sequence (first, second, then, etc.) improves logical flow.',
        improvementScore: 71,
      });
    }
  }

  // If no specific suggestions, provide a general flow improvement
  if (suggestions.length === 0 && paragraphs.length >= 3) {
    // Simple suggestion: put shortest paragraphs in the middle
    const sorted = paragraphs
      .map((p, i) => ({ idx: i, len: p.content.length }))
      .sort((a, b) => b.len - a.len);

    const newOrder: number[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i % 2 === 0) {
        newOrder.push(sorted[i].idx);
      } else {
        newOrder.unshift(sorted[i].idx);
      }
    }

    if (JSON.stringify(newOrder) !== JSON.stringify(originalOrder)) {
      suggestions.push({
        id: 'suggestion-balance',
        originalOrder,
        suggestedOrder: newOrder,
        reasoning:
          'Balancing paragraph lengths throughout the document creates better visual rhythm and maintains reader engagement.',
        improvementScore: 55,
      });
    }
  }

  // Sort suggestions by improvement score
  return suggestions.sort((a, b) => b.improvementScore - a.improvementScore);
}

export const useAIParagraphReorderStore = create<AIParagraphReorderState>()((set, get) => ({
  // Initial state
  isPanelOpen: false,
  isAnalyzing: false,
  error: null,
  documentContent: '',
  paragraphs: [],
  previewOrder: [],
  suggestions: [],
  selectedSuggestionId: null,
  showReasoning: true,
  undoStack: [],
  originalContent: '',
  onApply: null,

  openPanel: (content, onApply) => {
    const paragraphs = parseParagraphs(content);
    const initialOrder = paragraphs.map((_, i) => i);

    set({
      isPanelOpen: true,
      documentContent: content,
      paragraphs,
      previewOrder: initialOrder,
      suggestions: [],
      selectedSuggestionId: null,
      error: null,
      undoStack: [],
      originalContent: content,
      onApply,
    });

    // Automatically start analysis
    get().analyzeStructure();
  },

  closePanel: () => {
    set({
      isPanelOpen: false,
      isAnalyzing: false,
      error: null,
      documentContent: '',
      paragraphs: [],
      previewOrder: [],
      suggestions: [],
      selectedSuggestionId: null,
      undoStack: [],
      originalContent: '',
      onApply: null,
    });
  },

  analyzeStructure: async () => {
    const { paragraphs } = get();
    if (paragraphs.length < 2) {
      set({ error: 'Document needs at least 2 paragraphs to analyze.' });
      return;
    }

    set({ isAnalyzing: true, error: null });

    try {
      const suggestions = await generateMockSuggestions(paragraphs);

      set({
        suggestions,
        isAnalyzing: false,
        selectedSuggestionId: suggestions.length > 0 ? suggestions[0].id : null,
        previewOrder: suggestions.length > 0 ? suggestions[0].suggestedOrder : get().previewOrder,
      });
    } catch (error) {
      set({
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Failed to analyze document structure',
      });
    }
  },

  selectSuggestion: (id) => {
    const { suggestions, paragraphs } = get();
    const suggestion = suggestions.find((s) => s.id === id);

    set({
      selectedSuggestionId: id,
      previewOrder: suggestion ? suggestion.suggestedOrder : paragraphs.map((_, i) => i),
    });
  },

  applyPreviewOrder: (newOrder) => {
    set({ previewOrder: newOrder, selectedSuggestionId: null });
  },

  applySuggestion: () => {
    const { paragraphs, previewOrder, originalContent, onApply } = get();
    const newContent = reconstructContent(paragraphs, previewOrder);

    if (onApply) {
      // Save to undo stack
      set((state) => ({
        undoStack: [
          ...state.undoStack,
          {
            previousContent: originalContent,
            newContent,
            timestamp: Date.now(),
          },
        ],
      }));

      onApply(newContent);
    }

    get().closePanel();
  },

  dismissPanel: () => {
    get().closePanel();
  },

  undo: () => {
    const { undoStack, onApply } = get();
    if (undoStack.length === 0 || !onApply) return false;

    const lastEntry = undoStack[undoStack.length - 1];
    onApply(lastEntry.previousContent);

    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
    }));

    return true;
  },

  toggleReasoning: () => {
    set((state) => ({ showReasoning: !state.showReasoning }));
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Individual selectors for stable references
const selectIsPanelOpen = (state: AIParagraphReorderState) => state.isPanelOpen;
const selectIsAnalyzing = (state: AIParagraphReorderState) => state.isAnalyzing;
const selectError = (state: AIParagraphReorderState) => state.error;
const selectParagraphs = (state: AIParagraphReorderState) => state.paragraphs;
const selectPreviewOrder = (state: AIParagraphReorderState) => state.previewOrder;
const selectSuggestions = (state: AIParagraphReorderState) => state.suggestions;
const selectSelectedSuggestionId = (state: AIParagraphReorderState) => state.selectedSuggestionId;
const selectShowReasoning = (state: AIParagraphReorderState) => state.showReasoning;
const selectCanUndo = (state: AIParagraphReorderState) => state.undoStack.length > 0;

// Combined hook using individual selectors
export function useAIParagraphReorder() {
  const isPanelOpen = useAIParagraphReorderStore(selectIsPanelOpen);
  const isAnalyzing = useAIParagraphReorderStore(selectIsAnalyzing);
  const error = useAIParagraphReorderStore(selectError);
  const paragraphs = useAIParagraphReorderStore(selectParagraphs);
  const previewOrder = useAIParagraphReorderStore(selectPreviewOrder);
  const suggestions = useAIParagraphReorderStore(selectSuggestions);
  const selectedSuggestionId = useAIParagraphReorderStore(selectSelectedSuggestionId);
  const showReasoning = useAIParagraphReorderStore(selectShowReasoning);
  const canUndo = useAIParagraphReorderStore(selectCanUndo);

  return {
    isPanelOpen,
    isAnalyzing,
    error,
    paragraphs,
    previewOrder,
    suggestions,
    selectedSuggestionId,
    showReasoning,
    canUndo,
  };
}
