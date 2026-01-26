/**
 * AI Summary Store
 *
 * Manages state for AI-powered document summary generation.
 * Supports configurable summary lengths: Brief, Standard, and Detailed.
 */

import { create } from 'zustand';

export type SummaryLength = 'brief' | 'standard' | 'detailed';

export interface SummaryLengthOption {
  value: SummaryLength;
  label: string;
  description: string;
  targetWords: number;
}

export const SUMMARY_LENGTH_OPTIONS: SummaryLengthOption[] = [
  {
    value: 'brief',
    label: 'Brief',
    description: '2-3 sentences highlighting key points',
    targetWords: 50,
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Balanced overview with main themes',
    targetWords: 150,
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'Comprehensive summary with context',
    targetWords: 300,
  },
];

// Callback type for insert at top functionality
export type InsertAtTopCallback = ((summary: string) => void) | null;

interface AISummaryState {
  // Dialog state
  isOpen: boolean;
  documentContent: string;
  documentTitle: string;

  // Summary options
  selectedLength: SummaryLength;

  // Summary result
  summary: string | null;
  isGenerating: boolean;
  error: string | null;

  // Insert at top callback (set by consuming components)
  onInsertAtTop: InsertAtTopCallback;

  // Actions
  openSummaryDialog: (content: string, title?: string) => void;
  closeSummaryDialog: () => void;
  setSelectedLength: (length: SummaryLength) => void;
  generateSummary: () => Promise<void>;
  regenerateSummary: () => Promise<void>;
  copyToClipboard: () => Promise<boolean>;
  clearError: () => void;
  setInsertAtTopCallback: (callback: InsertAtTopCallback) => void;
  insertAtTop: () => void;
}

// Extract content context for analysis
function getContentContext(content: string, maxWords: number = 1000): string {
  const words = content.trim().split(/\s+/);
  return words.slice(0, maxWords).join(' ');
}

// Mock summary generation based on content analysis
// In production, this would call the AI API
function generateMockSummary(content: string, length: SummaryLength): string {
  const context = getContentContext(content);
  const wordCount = context.split(/\s+/).length;
  const lowerContent = context.toLowerCase();

  // Get target word count based on length (for future word-count based generation)
  const _option = SUMMARY_LENGTH_OPTIONS.find((o) => o.value === length);
  void _option; // Mark as intentionally unused for now

  // Financial/Budget content
  if (
    lowerContent.includes('budget') ||
    lowerContent.includes('expense') ||
    lowerContent.includes('spending') ||
    lowerContent.includes('financial')
  ) {
    if (length === 'brief') {
      return 'This document outlines financial planning strategies and budget allocation recommendations. Key focus areas include expense tracking and spending optimization.';
    } else if (length === 'standard') {
      return 'This document provides a comprehensive overview of financial management practices, including detailed budget allocation strategies and expense tracking methodologies. The content emphasizes the importance of maintaining a balanced approach to spending while identifying opportunities for savings. Key recommendations include establishing clear spending categories, setting realistic financial goals, and implementing regular review cycles to ensure alignment with overall financial objectives.';
    } else {
      return 'This document presents an extensive analysis of financial planning and budget management strategies designed to optimize resource allocation and enhance fiscal responsibility. The content begins by establishing foundational principles of effective budgeting, including the importance of accurate expense tracking and categorization.\n\nKey themes explored include:\n- Strategic allocation of funds across essential and discretionary spending categories\n- Methods for identifying and eliminating unnecessary expenses\n- Techniques for building emergency reserves and long-term savings\n- Best practices for maintaining financial discipline and accountability\n\nThe document concludes with actionable recommendations for implementing these strategies, including suggested tools and review schedules to ensure continued progress toward financial goals.';
    }
  }

  // Project/Team content
  if (
    lowerContent.includes('project') ||
    lowerContent.includes('team') ||
    lowerContent.includes('deadline') ||
    lowerContent.includes('milestone')
  ) {
    if (length === 'brief') {
      return 'This document details project planning and team coordination strategies. Primary focus is on milestone tracking and deadline management.';
    } else if (length === 'standard') {
      return 'This document outlines comprehensive project management methodologies and team collaboration frameworks. It covers essential aspects of planning, execution, and monitoring phases, with particular emphasis on maintaining alignment between team members and stakeholders. The content addresses common challenges in deadline management and provides strategies for risk mitigation and resource optimization throughout the project lifecycle.';
    } else {
      return 'This document provides an in-depth exploration of project management principles and team coordination practices essential for successful delivery of complex initiatives. The content is structured to address all phases of the project lifecycle.\n\nKey areas covered include:\n- Project scoping and requirements definition\n- Resource allocation and team structure optimization\n- Communication protocols and stakeholder management\n- Risk assessment and mitigation strategies\n- Progress tracking and milestone monitoring\n\nThe document emphasizes the importance of adaptive planning while maintaining focus on core deliverables. Recommendations include establishing clear ownership, implementing regular status reviews, and fostering a collaborative team culture that supports both individual accountability and collective success.';
    }
  }

  // Meeting/Discussion content
  if (
    lowerContent.includes('meeting') ||
    lowerContent.includes('agenda') ||
    lowerContent.includes('discussion') ||
    lowerContent.includes('decision')
  ) {
    if (length === 'brief') {
      return 'This document captures key discussion points and decisions from recent meetings. Action items and follow-up responsibilities are outlined.';
    } else if (length === 'standard') {
      return 'This document summarizes meeting proceedings, including agenda items discussed, decisions reached, and action items assigned. Key topics addressed span operational updates, strategic initiatives, and team coordination matters. The summary includes stakeholder input, consensus points, and areas requiring further deliberation. Follow-up responsibilities are clearly delineated with associated timelines.';
    } else {
      return 'This document provides comprehensive meeting documentation covering all discussion topics, decisions, and outcomes from the session. The structured summary ensures accountability and clear communication of results.\n\nAgenda items covered:\n- Review of previous action items and status updates\n- Discussion of current challenges and proposed solutions\n- Strategic planning topics and priority alignment\n- Resource and timeline considerations\n\nKey decisions reached:\n- Approval of proposed initiatives with specified conditions\n- Assignment of ownership for critical deliverables\n- Agreement on communication protocols and escalation paths\n\nAction items have been documented with clear owners, deadlines, and success criteria. The next meeting is scheduled to review progress and address any emerging issues.';
    }
  }

  // Generic content
  if (length === 'brief') {
    return `This document contains ${wordCount} words covering key topics and insights. The main themes focus on providing clear information and actionable guidance.`;
  } else if (length === 'standard') {
    return `This document spans ${wordCount} words and presents a structured analysis of its subject matter. The content is organized to provide readers with a clear understanding of core concepts, supporting details, and practical implications. Key insights are highlighted throughout, with emphasis on actionable takeaways and areas for further consideration. The document balances depth of coverage with accessibility, making it suitable for both overview and detailed reference purposes.`;
  } else {
    return `This comprehensive document contains ${wordCount} words and offers an extensive exploration of its subject matter. The content is thoughtfully structured to guide readers through foundational concepts, detailed analysis, and practical applications.\n\nDocument overview:\n- Introduction establishes context and objectives\n- Core sections provide in-depth coverage of primary topics\n- Supporting analysis offers additional perspectives and considerations\n- Conclusions synthesize key findings and recommendations\n\nThe document is designed to serve multiple purposes, from high-level orientation for new readers to detailed reference material for those seeking deeper understanding. Cross-references and clear section organization facilitate efficient navigation regardless of reading approach.\n\nKey strengths of the document include comprehensive coverage, clear organization, and actionable insights that readers can apply directly to their work.`;
  }
}

export const useAISummaryStore = create<AISummaryState>()((set, get) => ({
  // Initial state
  isOpen: false,
  documentContent: '',
  documentTitle: 'Untitled Document',
  selectedLength: 'standard',
  summary: null,
  isGenerating: false,
  error: null,
  onInsertAtTop: null,

  // Open summary dialog
  openSummaryDialog: (content, title) => {
    set({
      isOpen: true,
      documentContent: content,
      documentTitle: title || 'Untitled Document',
      summary: null,
      error: null,
    });
  },

  // Close summary dialog
  closeSummaryDialog: () => {
    set({
      isOpen: false,
      documentContent: '',
      documentTitle: 'Untitled Document',
      summary: null,
      error: null,
      isGenerating: false,
    });
  },

  // Set selected length
  setSelectedLength: (length) => {
    set({ selectedLength: length });
  },

  // Generate summary
  generateSummary: async () => {
    const state = get();

    if (!state.documentContent.trim()) {
      set({ error: 'Please add some content before generating a summary' });
      return;
    }

    set({ isGenerating: true, error: null });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Generate mock summary (would be API call in production)
      const summary = generateMockSummary(state.documentContent, state.selectedLength);

      set({ summary, isGenerating: false });
    } catch (error) {
      set({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate summary',
      });
    }
  },

  // Regenerate with same settings
  regenerateSummary: async () => {
    const state = get();
    if (state.isGenerating) return;

    set({ isGenerating: true, error: null });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Generate new mock summary
      const summary = generateMockSummary(state.documentContent, state.selectedLength);

      set({ summary, isGenerating: false });
    } catch (error) {
      set({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate summary',
      });
    }
  },

  // Copy summary to clipboard
  copyToClipboard: async () => {
    const state = get();

    if (!state.summary) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(state.summary);
      return true;
    } catch {
      set({ error: 'Failed to copy to clipboard' });
      return false;
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Set insert at top callback
  setInsertAtTopCallback: (callback) => {
    set({ onInsertAtTop: callback });
  },

  // Insert summary at top of document
  insertAtTop: () => {
    const state = get();
    if (state.summary && state.onInsertAtTop) {
      state.onInsertAtTop(state.summary);
    }
  },
}));

// Hook for accessing the store
export function useAISummary() {
  return useAISummaryStore();
}
