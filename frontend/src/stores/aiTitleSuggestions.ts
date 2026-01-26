/**
 * AI Title Suggestions Store
 *
 * Manages state for AI-powered title generation based on document content.
 * Generates multiple title suggestions that users can choose from.
 */

import { create } from 'zustand';

export interface TitleSuggestion {
  id: string;
  text: string;
}

interface AITitleSuggestionsState {
  // State
  suggestions: TitleSuggestion[];
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;

  // Actions
  generateSuggestions: (content: string) => Promise<void>;
  regenerateSuggestions: (content: string) => Promise<void>;
  clearSuggestions: () => void;
  openSuggestions: () => void;
  closeSuggestions: () => void;
  clearError: () => void;
}

function generateSuggestionId(): string {
  return `title-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Extract first 500 words from content
function getContentContext(content: string): string {
  const words = content.trim().split(/\s+/);
  const first500 = words.slice(0, 500);
  return first500.join(' ');
}

// Mock title generation based on content analysis
// In production, this would call the AI API
function generateMockTitles(content: string): string[] {
  const context = getContentContext(content);
  const wordCount = context.split(/\s+/).length;

  // Analyze content for keywords/themes
  const lowerContent = context.toLowerCase();

  // Topic-specific title suggestions
  if (lowerContent.includes('budget') || lowerContent.includes('expense') || lowerContent.includes('spending')) {
    return [
      'Managing Your Monthly Budget: A Practical Guide',
      'Smart Spending Strategies for Better Financial Health',
      'The Art of Budgeting: Track, Save, and Succeed',
    ];
  }

  if (lowerContent.includes('project') || lowerContent.includes('team') || lowerContent.includes('deadline')) {
    return [
      'Project Planning: From Vision to Execution',
      'Building Effective Teams for Project Success',
      'Meeting Deadlines Without Burning Out',
    ];
  }

  if (lowerContent.includes('meeting') || lowerContent.includes('agenda') || lowerContent.includes('discussion')) {
    return [
      'Meeting Notes: Key Decisions and Action Items',
      'Team Sync: Progress Update and Next Steps',
      'Strategic Discussion Summary',
    ];
  }

  if (lowerContent.includes('review') || lowerContent.includes('analysis') || lowerContent.includes('report')) {
    return [
      'Quarterly Review: Insights and Opportunities',
      'Performance Analysis: Trends and Recommendations',
      'Comprehensive Report: Findings and Conclusions',
    ];
  }

  if (lowerContent.includes('idea') || lowerContent.includes('proposal') || lowerContent.includes('concept')) {
    return [
      'A Fresh Approach: Innovative Ideas for Growth',
      'Proposal for Strategic Initiative',
      'Exploring New Possibilities: A Concept Overview',
    ];
  }

  if (lowerContent.includes('story') || lowerContent.includes('chapter') || lowerContent.includes('character')) {
    return [
      'Untold Stories: A Journey Through Words',
      'The Beginning of Something New',
      'Tales from the Creative Mind',
    ];
  }

  if (lowerContent.includes('learn') || lowerContent.includes('guide') || lowerContent.includes('tutorial')) {
    return [
      'A Step-by-Step Guide to Success',
      'Learning Made Simple: Essential Tips',
      'The Complete Beginner\'s Handbook',
    ];
  }

  // Extract potential keywords for generic suggestions
  const significantWords = context
    .split(/\s+/)
    .filter(word => word.length > 5)
    .slice(0, 10);

  const titleWord = significantWords.length > 0
    ? significantWords[Math.floor(Math.random() * significantWords.length)]
    : 'Document';

  // Capitalize first letter
  const capitalizedWord = titleWord.charAt(0).toUpperCase() + titleWord.slice(1);

  // Default generic titles based on content length
  if (wordCount > 200) {
    return [
      `${capitalizedWord}: A Comprehensive Overview`,
      'Thoughts on the Matter at Hand',
      'Reflections and Insights',
    ];
  } else if (wordCount > 50) {
    return [
      `Notes on ${capitalizedWord}`,
      'Quick Thoughts and Ideas',
      'A Brief Summary',
    ];
  } else {
    return [
      'Untitled Document',
      'New Draft',
      'Quick Notes',
    ];
  }
}

export const useAITitleSuggestionsStore = create<AITitleSuggestionsState>()((set, get) => ({
  // Initial state
  suggestions: [],
  isLoading: false,
  error: null,
  isOpen: false,

  // Generate title suggestions
  generateSuggestions: async (content) => {
    if (!content.trim()) {
      set({ error: 'Please add some content before generating titles' });
      return;
    }

    set({ isLoading: true, error: null, isOpen: true });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate mock titles (would be API call in production)
      const titles = generateMockTitles(content);

      const suggestions: TitleSuggestion[] = titles.map((text) => ({
        id: generateSuggestionId(),
        text,
      }));

      set({ suggestions, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to generate suggestions',
      });
    }
  },

  // Regenerate with new suggestions
  regenerateSuggestions: async (content) => {
    const state = get();
    if (state.isLoading) return;

    set({ isLoading: true, error: null });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate new mock titles
      const titles = generateMockTitles(content);

      const suggestions: TitleSuggestion[] = titles.map((text) => ({
        id: generateSuggestionId(),
        text,
      }));

      set({ suggestions, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate suggestions',
      });
    }
  },

  // Clear all suggestions
  clearSuggestions: () => {
    set({ suggestions: [], isOpen: false, error: null });
  },

  // Open the suggestions popover
  openSuggestions: () => {
    set({ isOpen: true });
  },

  // Close the suggestions popover
  closeSuggestions: () => {
    set({ isOpen: false });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

// Hook for accessing the store
export function useAITitleSuggestions() {
  return useAITitleSuggestionsStore();
}
