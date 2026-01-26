import { create } from 'zustand';

const RECENT_PROMPTS_KEY = 'ai-custom-prompts-recent';
const MAX_RECENT_PROMPTS = 10;

export interface RecentPrompt {
  text: string;
  timestamp: string;
}

export interface AICustomPromptState {
  // Selection info
  isActive: boolean;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  targetElement: HTMLTextAreaElement | HTMLInputElement | null;

  // Prompt state
  isInputExpanded: boolean;
  promptText: string;
  isLoading: boolean;
  responseText: string | null;
  isStreaming: boolean;
  error: string | null;

  // Recent prompts
  recentPrompts: RecentPrompt[];

  // Undo support
  undoStack: { text: string; selectionStart: number; selectionEnd: number }[];

  // Position for floating toolbar
  toolbarPosition: { top: number; left: number } | null;

  // Actions
  showToolbar: (
    selectedText: string,
    selectionStart: number,
    selectionEnd: number,
    element: HTMLTextAreaElement | HTMLInputElement,
    position: { top: number; left: number }
  ) => void;
  hideToolbar: () => void;
  expandInput: () => void;
  collapseInput: () => void;
  setPromptText: (text: string) => void;
  submitPrompt: () => Promise<void>;
  applyResponse: () => void;
  cancelPrompt: () => void;
  undo: () => boolean;
  clearError: () => void;
  selectRecentPrompt: (prompt: string) => void;
}

// Load recent prompts from localStorage
function loadRecentPrompts(): RecentPrompt[] {
  try {
    const stored = localStorage.getItem(RECENT_PROMPTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return [];
}

// Save recent prompts to localStorage
function saveRecentPrompts(prompts: RecentPrompt[]): void {
  try {
    localStorage.setItem(RECENT_PROMPTS_KEY, JSON.stringify(prompts));
  } catch {
    // Ignore storage errors
  }
}

// Add a prompt to recent history
function addToRecentPrompts(text: string, existing: RecentPrompt[]): RecentPrompt[] {
  // Remove duplicates
  const filtered = existing.filter((p) => p.text.toLowerCase() !== text.toLowerCase());

  // Add new prompt at the beginning
  const newPrompt: RecentPrompt = {
    text,
    timestamp: new Date().toISOString(),
  };

  const updated = [newPrompt, ...filtered].slice(0, MAX_RECENT_PROMPTS);
  saveRecentPrompts(updated);
  return updated;
}

// Mock AI response function - in production this would call the AI API
async function getMockAIResponse(prompt: string, selectedText: string): Promise<string> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400));

  const promptLower = prompt.toLowerCase();

  // Generate contextual responses based on prompt
  if (promptLower.includes('explain') || promptLower.includes('what')) {
    return `This text discusses "${selectedText.slice(0, 30)}${selectedText.length > 30 ? '...' : ''}". The key points are: it presents an idea or concept that could benefit from more specific examples or supporting details to strengthen its clarity and impact.`;
  }

  if (promptLower.includes('improve') || promptLower.includes('better')) {
    return `Consider revising to: "${selectedText.replace(/\b(very|really|just)\b\s*/gi, '').trim()}" - This removes unnecessary filler words and makes the text more direct and impactful.`;
  }

  if (promptLower.includes('tone') || promptLower.includes('formal') || promptLower.includes('casual')) {
    return `The current tone is moderately formal. To adjust: For more formal, use complete sentences and avoid contractions. For more casual, add conversational elements and personal touches.`;
  }

  if (promptLower.includes('grammar') || promptLower.includes('spelling') || promptLower.includes('error')) {
    return `I reviewed the text for errors. The grammar appears correct, though you might consider varying sentence structure for better flow.`;
  }

  if (promptLower.includes('shorter') || promptLower.includes('concise')) {
    const words = selectedText.split(' ');
    const shorterText = words.slice(0, Math.ceil(words.length * 0.6)).join(' ');
    return `Condensed version: "${shorterText}${words.length > 5 ? '...' : ''}" - This captures the essential meaning in fewer words.`;
  }

  if (promptLower.includes('longer') || promptLower.includes('expand')) {
    return `Expanded version: "${selectedText} Additionally, this point could be strengthened by including specific examples, relevant data, or addressing potential counterarguments."`;
  }

  // Default response
  return `Analysis of "${selectedText.slice(0, 20)}${selectedText.length > 20 ? '...' : ''}": This text effectively conveys its message. Consider whether the intended audience would benefit from additional context or examples. The structure is clear, though you might explore alternative phrasings to enhance engagement.`;
}

export const useAICustomPromptStore = create<AICustomPromptState>()((set, get) => ({
  // Initial state
  isActive: false,
  selectedText: '',
  selectionStart: 0,
  selectionEnd: 0,
  targetElement: null,
  isInputExpanded: false,
  promptText: '',
  isLoading: false,
  responseText: null,
  isStreaming: false,
  error: null,
  recentPrompts: loadRecentPrompts(),
  undoStack: [],
  toolbarPosition: null,

  showToolbar: (selectedText, selectionStart, selectionEnd, element, position) => {
    set({
      isActive: true,
      selectedText,
      selectionStart,
      selectionEnd,
      targetElement: element,
      toolbarPosition: position,
      isInputExpanded: false,
      promptText: '',
      responseText: null,
      error: null,
      isStreaming: false,
    });
  },

  hideToolbar: () => {
    set({
      isActive: false,
      selectedText: '',
      selectionStart: 0,
      selectionEnd: 0,
      targetElement: null,
      toolbarPosition: null,
      isInputExpanded: false,
      promptText: '',
      responseText: null,
      isLoading: false,
      isStreaming: false,
      error: null,
    });
  },

  expandInput: () => {
    set({ isInputExpanded: true });
  },

  collapseInput: () => {
    set({
      isInputExpanded: false,
      promptText: '',
      responseText: null,
      error: null,
    });
  },

  setPromptText: (text) => {
    set({ promptText: text });
  },

  submitPrompt: async () => {
    const state = get();
    if (!state.selectedText || !state.promptText.trim() || state.isLoading) return;

    set({ isLoading: true, error: null, responseText: null, isStreaming: true });

    try {
      const response = await getMockAIResponse(state.promptText.trim(), state.selectedText);

      // Add to recent prompts
      const updatedRecent = addToRecentPrompts(state.promptText.trim(), state.recentPrompts);

      set({
        responseText: response,
        isLoading: false,
        isStreaming: false,
        recentPrompts: updatedRecent,
      });
    } catch (error) {
      set({
        isLoading: false,
        isStreaming: false,
        error: error instanceof Error ? error.message : 'Failed to get AI response',
      });
    }
  },

  applyResponse: () => {
    const state = get();
    if (!state.responseText || !state.targetElement) return;

    const element = state.targetElement;
    const currentValue = element.value;

    // Save to undo stack
    const undoEntry = {
      text: currentValue,
      selectionStart: state.selectionStart,
      selectionEnd: state.selectionEnd,
    };

    // For "Apply" we replace the selected text with the response
    // But since responses are typically analysis, we just close the toolbar
    // The user can copy the response if needed

    set((s) => ({
      undoStack: [...s.undoStack, undoEntry],
      isActive: false,
      selectedText: '',
      selectionStart: 0,
      selectionEnd: 0,
      targetElement: null,
      toolbarPosition: null,
      isInputExpanded: false,
      promptText: '',
      responseText: null,
      isLoading: false,
      isStreaming: false,
    }));
  },

  cancelPrompt: () => {
    set({
      responseText: null,
      isLoading: false,
      isStreaming: false,
      error: null,
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

      const event = new Event('input', { bubbles: true });
      activeElement.dispatchEvent(event);

      activeElement.setSelectionRange(lastUndo.selectionStart, lastUndo.selectionEnd);

      set((s) => ({
        undoStack: s.undoStack.slice(0, -1),
      }));

      return true;
    }

    return false;
  },

  clearError: () => {
    set({ error: null });
  },

  selectRecentPrompt: (prompt: string) => {
    set({ promptText: prompt });
  },
}));

// Individual selectors for stable references
const selectIsActive = (state: AICustomPromptState) => state.isActive;
const selectSelectedText = (state: AICustomPromptState) => state.selectedText;
const selectIsLoading = (state: AICustomPromptState) => state.isLoading;
const selectResponseText = (state: AICustomPromptState) => state.responseText;
const selectError = (state: AICustomPromptState) => state.error;
const selectToolbarPosition = (state: AICustomPromptState) => state.toolbarPosition;
const selectIsInputExpanded = (state: AICustomPromptState) => state.isInputExpanded;
const selectPromptText = (state: AICustomPromptState) => state.promptText;
const selectRecentPrompts = (state: AICustomPromptState) => state.recentPrompts;
const selectIsStreaming = (state: AICustomPromptState) => state.isStreaming;

// Combined hook using individual selectors
export function useAICustomPrompt() {
  const isActive = useAICustomPromptStore(selectIsActive);
  const selectedText = useAICustomPromptStore(selectSelectedText);
  const isLoading = useAICustomPromptStore(selectIsLoading);
  const responseText = useAICustomPromptStore(selectResponseText);
  const error = useAICustomPromptStore(selectError);
  const toolbarPosition = useAICustomPromptStore(selectToolbarPosition);
  const isInputExpanded = useAICustomPromptStore(selectIsInputExpanded);
  const promptText = useAICustomPromptStore(selectPromptText);
  const recentPrompts = useAICustomPromptStore(selectRecentPrompts);
  const isStreaming = useAICustomPromptStore(selectIsStreaming);

  return {
    isActive,
    selectedText,
    isLoading,
    responseText,
    error,
    toolbarPosition,
    isInputExpanded,
    promptText,
    recentPrompts,
    isStreaming,
  };
}
