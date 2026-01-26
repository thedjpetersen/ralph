/**
 * AI Writing Prompts Store
 *
 * Manages state for AI-powered writing prompts and opening lines.
 * Helps overcome writer's block by generating contextual writing starters
 * based on document type and template preferences.
 */

import { create } from 'zustand';

export interface WritingPrompt {
  id: string;
  text: string;
  type: 'prompt' | 'opening_line';
  category: string;
}

export type DocumentType =
  | 'general'
  | 'story'
  | 'article'
  | 'email'
  | 'report'
  | 'blog_post'
  | 'essay'
  | 'letter';

export interface DocumentTypeOption {
  value: DocumentType;
  label: string;
  description: string;
}

export const DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = [
  {
    value: 'general',
    label: 'General',
    description: 'Open-ended writing prompts for any purpose',
  },
  {
    value: 'story',
    label: 'Story',
    description: 'Creative fiction writing starters',
  },
  {
    value: 'article',
    label: 'Article',
    description: 'Informative content and news pieces',
  },
  {
    value: 'email',
    label: 'Email',
    description: 'Professional and personal email openers',
  },
  {
    value: 'report',
    label: 'Report',
    description: 'Business and technical report starters',
  },
  {
    value: 'blog_post',
    label: 'Blog Post',
    description: 'Engaging blog content openers',
  },
  {
    value: 'essay',
    label: 'Essay',
    description: 'Academic and persuasive essay prompts',
  },
  {
    value: 'letter',
    label: 'Letter',
    description: 'Formal and informal letter openings',
  },
];

interface AIWritingPromptsState {
  // State
  prompts: WritingPrompt[];
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  selectedDocumentType: DocumentType;

  // Actions
  generatePrompts: (documentType?: DocumentType) => Promise<void>;
  regeneratePrompts: () => Promise<void>;
  clearPrompts: () => void;
  openPrompts: () => void;
  closePrompts: () => void;
  setDocumentType: (type: DocumentType) => void;
  clearError: () => void;
}

function generatePromptId(): string {
  return `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Mock prompt generation based on document type
// In production, this would call the AI API
function generateMockPrompts(documentType: DocumentType): WritingPrompt[] {
  const promptsByType: Record<DocumentType, Array<{ text: string; type: 'prompt' | 'opening_line'; category: string }>> = {
    general: [
      { text: 'Write about a moment that changed your perspective on life.', type: 'prompt', category: 'Personal Reflection' },
      { text: 'Describe a place you\'ve never been but dream of visiting.', type: 'prompt', category: 'Creative' },
      { text: 'The sound of footsteps echoed through the empty corridor as...', type: 'opening_line', category: 'Narrative' },
      { text: 'In today\'s fast-paced world, we often forget that...', type: 'opening_line', category: 'Reflective' },
      { text: 'What would you do if you had one day to live your dream?', type: 'prompt', category: 'Thought-Provoking' },
    ],
    story: [
      { text: 'The letter arrived exactly ten years after she disappeared.', type: 'opening_line', category: 'Mystery' },
      { text: 'Write about someone who discovers they can hear other people\'s thoughts.', type: 'prompt', category: 'Fantasy' },
      { text: 'The last person on Earth sat alone in a room. There was a knock on the door.', type: 'opening_line', category: 'Suspense' },
      { text: 'Create a story where the villain turns out to be the hero.', type: 'prompt', category: 'Plot Twist' },
      { text: 'She found the old photograph in her grandmother\'s attic, but the face looking back wasn\'t human.', type: 'opening_line', category: 'Horror' },
    ],
    article: [
      { text: 'Recent studies have revealed a surprising connection between...', type: 'opening_line', category: 'Research' },
      { text: 'Write about an emerging technology that could transform daily life.', type: 'prompt', category: 'Technology' },
      { text: 'In an exclusive interview, experts weigh in on...', type: 'opening_line', category: 'News' },
      { text: 'Explore the hidden costs of a common practice everyone accepts.', type: 'prompt', category: 'Investigative' },
      { text: 'The debate has raged for decades, but new evidence suggests...', type: 'opening_line', category: 'Analysis' },
    ],
    email: [
      { text: 'I hope this message finds you well. I\'m reaching out regarding...', type: 'opening_line', category: 'Professional' },
      { text: 'Write a follow-up email after a successful meeting.', type: 'prompt', category: 'Business' },
      { text: 'Thank you for taking the time to speak with me yesterday about...', type: 'opening_line', category: 'Follow-up' },
      { text: 'I wanted to bring to your attention an opportunity that...', type: 'opening_line', category: 'Proposal' },
      { text: 'Compose an email requesting feedback on a recent project.', type: 'prompt', category: 'Feedback Request' },
    ],
    report: [
      { text: 'This report examines the key findings from our Q4 analysis of...', type: 'opening_line', category: 'Business' },
      { text: 'Write a progress report highlighting achievements and challenges.', type: 'prompt', category: 'Progress Update' },
      { text: 'Executive Summary: The following document presents a comprehensive overview of...', type: 'opening_line', category: 'Executive Summary' },
      { text: 'Based on our research and data analysis, we recommend...', type: 'opening_line', category: 'Recommendations' },
      { text: 'Create a report analyzing market trends in your industry.', type: 'prompt', category: 'Market Analysis' },
    ],
    blog_post: [
      { text: 'Have you ever wondered why we struggle with...', type: 'opening_line', category: 'Engaging Question' },
      { text: 'Write about a common misconception in your field of expertise.', type: 'prompt', category: 'Myth Busting' },
      { text: 'Three years ago, I made a decision that completely changed...', type: 'opening_line', category: 'Personal Story' },
      { text: 'Create a listicle of unexpected tips for everyday productivity.', type: 'prompt', category: 'How-To' },
      { text: 'The internet is full of advice about this topic, but here\'s what actually works...', type: 'opening_line', category: 'Practical Guide' },
    ],
    essay: [
      { text: 'The concept of freedom has evolved significantly throughout human history...', type: 'opening_line', category: 'Historical' },
      { text: 'Argue for or against the role of technology in modern education.', type: 'prompt', category: 'Argumentative' },
      { text: 'In examining the relationship between individual rights and collective responsibility...', type: 'opening_line', category: 'Philosophical' },
      { text: 'Write about how a personal experience shaped your worldview.', type: 'prompt', category: 'Personal Narrative' },
      { text: 'While conventional wisdom suggests that success requires sacrifice, a closer examination reveals...', type: 'opening_line', category: 'Analytical' },
    ],
    letter: [
      { text: 'Dear [Name], I am writing to express my sincere appreciation for...', type: 'opening_line', category: 'Thank You' },
      { text: 'Write a letter to your future self, five years from now.', type: 'prompt', category: 'Personal' },
      { text: 'I hope this letter finds you in good health and high spirits. I wanted to reach out because...', type: 'opening_line', category: 'Reconnection' },
      { text: 'Compose a recommendation letter for a colleague or mentee.', type: 'prompt', category: 'Professional' },
      { text: 'After much reflection, I felt compelled to share my thoughts on...', type: 'opening_line', category: 'Formal' },
    ],
  };

  const typePrompts = promptsByType[documentType] || promptsByType.general;

  // Shuffle and select 3-5 prompts
  const shuffled = [...typePrompts].sort(() => Math.random() - 0.5);
  const selectedCount = Math.min(shuffled.length, Math.floor(Math.random() * 3) + 3); // 3-5 prompts
  const selected = shuffled.slice(0, selectedCount);

  return selected.map((prompt) => ({
    id: generatePromptId(),
    ...prompt,
  }));
}

export const useAIWritingPromptsStore = create<AIWritingPromptsState>()((set, get) => ({
  // Initial state
  prompts: [],
  isLoading: false,
  error: null,
  isOpen: false,
  selectedDocumentType: 'general',

  // Generate writing prompts
  generatePrompts: async (documentType) => {
    const typeToUse = documentType || get().selectedDocumentType;

    set({ isLoading: true, error: null, isOpen: true, selectedDocumentType: typeToUse });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Generate mock prompts (would be API call in production)
      const prompts = generateMockPrompts(typeToUse);

      set({ prompts, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to generate prompts',
      });
    }
  },

  // Regenerate with new prompts
  regeneratePrompts: async () => {
    const state = get();
    if (state.isLoading) return;

    set({ isLoading: true, error: null });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Generate new mock prompts
      const prompts = generateMockPrompts(state.selectedDocumentType);

      set({ prompts, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate prompts',
      });
    }
  },

  // Clear all prompts
  clearPrompts: () => {
    set({ prompts: [], isOpen: false, error: null });
  },

  // Open the prompts panel
  openPrompts: () => {
    set({ isOpen: true });
  },

  // Close the prompts panel
  closePrompts: () => {
    set({ isOpen: false });
  },

  // Set document type and regenerate
  setDocumentType: (type) => {
    set({ selectedDocumentType: type });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

// Hook for accessing the store
export function useAIWritingPrompts() {
  return useAIWritingPromptsStore();
}
