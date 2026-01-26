import { create } from 'zustand';
import { useOptimisticStore } from './optimistic';
import { toast } from './toast';
import { getAuthorColor } from './commentHighlight';
import type { Persona } from '../api/client';

/**
 * Represents feedback from a single author/persona
 */
export interface AuthorFeedback {
  id: string;
  personaId: string;
  personaName: string;
  text: string;
  isStreaming: boolean;
  color: string;
  createdAt: string;
  suggestion?: {
    originalText: string;
    suggestedText: string;
  };
}

/**
 * A comparison session containing feedback from multiple authors
 */
export interface ComparisonSession {
  id: string;
  selectedText: string;
  textRange: {
    startIndex: number;
    endIndex: number;
  };
  targetElementId: string;
  feedbacks: Map<string, AuthorFeedback>;
  createdAt: string;
}

interface AIComparisonState {
  // State
  isComparisonMode: boolean;
  activeSession: ComparisonSession | null;
  selectedPersonas: Persona[];
  isLoading: boolean;
  error: string | null;
  abortControllers: Map<string, AbortController>;

  // Actions
  toggleComparisonMode: () => void;
  setSelectedPersonas: (personas: Persona[]) => void;
  addPersona: (persona: Persona) => void;
  removePersona: (personaId: string) => void;
  startComparison: (
    selectedText: string,
    textRange: { startIndex: number; endIndex: number },
    targetElementId: string,
    context?: Record<string, unknown>
  ) => Promise<void>;
  cancelComparison: () => void;
  clearSession: () => void;
  clearError: () => void;
  acceptSuggestion: (personaId: string) => void;
}

function generateSessionId(): string {
  return `comparison-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateFeedbackId(): string {
  return `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useAIComparisonStore = create<AIComparisonState>()((set, get) => ({
  // Initial state
  isComparisonMode: false,
  activeSession: null,
  selectedPersonas: [],
  isLoading: false,
  error: null,
  abortControllers: new Map(),

  // Toggle comparison mode
  toggleComparisonMode: () => {
    set((state) => ({ isComparisonMode: !state.isComparisonMode }));
  },

  // Set selected personas for comparison
  setSelectedPersonas: (personas) => {
    // Limit to 4 personas max for UI reasons
    const limited = personas.slice(0, 4);
    set({ selectedPersonas: limited });
  },

  // Add a persona to the comparison
  addPersona: (persona) => {
    set((state) => {
      if (state.selectedPersonas.length >= 4) {
        toast.warning('Maximum 4 authors can be compared');
        return state;
      }
      if (state.selectedPersonas.some(p => p.id === persona.id)) {
        return state;
      }
      return { selectedPersonas: [...state.selectedPersonas, persona] };
    });
  },

  // Remove a persona from the comparison
  removePersona: (personaId) => {
    set((state) => ({
      selectedPersonas: state.selectedPersonas.filter(p => p.id !== personaId),
    }));
  },

  // Start a comparison session
  startComparison: async (selectedText, textRange, targetElementId, context) => {
    const state = get();

    if (state.selectedPersonas.length < 2) {
      toast.error('Select at least 2 authors to compare');
      return;
    }

    // Cancel any existing session
    state.abortControllers.forEach(controller => controller.abort());

    const sessionId = generateSessionId();
    const newAbortControllers = new Map<string, AbortController>();
    const initialFeedbacks = new Map<string, AuthorFeedback>();

    // Initialize feedbacks for each persona
    state.selectedPersonas.forEach((persona) => {
      const feedbackId = generateFeedbackId();
      const abortController = new AbortController();
      newAbortControllers.set(persona.id, abortController);

      initialFeedbacks.set(persona.id, {
        id: feedbackId,
        personaId: persona.id,
        personaName: persona.name,
        text: '',
        isStreaming: true,
        color: getAuthorColor(persona.id),
        createdAt: new Date().toISOString(),
      });
    });

    const session: ComparisonSession = {
      id: sessionId,
      selectedText,
      textRange,
      targetElementId,
      feedbacks: initialFeedbacks,
      createdAt: new Date().toISOString(),
    };

    // Start optimistic tracking
    useOptimisticStore.getState().startMutation(
      `comparison-${sessionId}`,
      'comparison:start',
      session,
      null
    );

    set({
      activeSession: session,
      isLoading: true,
      error: null,
      abortControllers: newAbortControllers,
    });

    // Request feedback from each persona in parallel
    const feedbackPromises = state.selectedPersonas.map(async (persona) => {
      const abortController = newAbortControllers.get(persona.id);
      if (!abortController) return;

      try {
        const response = await fetch('/api/ai/compare-feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            persona_id: persona.id,
            selected_text: selectedText,
            context,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to get feedback from ${persona.name}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let accumulatedText = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          // Update the feedback for this persona
          set((state) => {
            if (!state.activeSession) return state;
            const newFeedbacks = new Map(state.activeSession.feedbacks);
            const existingFeedback = newFeedbacks.get(persona.id);
            if (existingFeedback) {
              newFeedbacks.set(persona.id, {
                ...existingFeedback,
                text: accumulatedText,
              });
            }
            return {
              activeSession: {
                ...state.activeSession,
                feedbacks: newFeedbacks,
              },
            };
          });
        }

        // Mark streaming as complete for this persona
        set((state) => {
          if (!state.activeSession) return state;
          const newFeedbacks = new Map(state.activeSession.feedbacks);
          const existingFeedback = newFeedbacks.get(persona.id);
          if (existingFeedback) {
            newFeedbacks.set(persona.id, {
              ...existingFeedback,
              isStreaming: false,
            });
          }
          return {
            activeSession: {
              ...state.activeSession,
              feedbacks: newFeedbacks,
            },
          };
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        // Mark this persona's feedback as errored
        set((state) => {
          if (!state.activeSession) return state;
          const newFeedbacks = new Map(state.activeSession.feedbacks);
          const existingFeedback = newFeedbacks.get(persona.id);
          if (existingFeedback) {
            newFeedbacks.set(persona.id, {
              ...existingFeedback,
              isStreaming: false,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
          return {
            activeSession: {
              ...state.activeSession,
              feedbacks: newFeedbacks,
            },
          };
        });
      }
    });

    await Promise.allSettled(feedbackPromises);

    // Check if all feedbacks are complete
    const currentState = get();
    const allComplete = currentState.activeSession?.feedbacks
      ? Array.from(currentState.activeSession.feedbacks.values()).every(f => !f.isStreaming)
      : true;

    if (allComplete) {
      useOptimisticStore.getState().completeMutation(`comparison-${sessionId}`);
      set({ isLoading: false });
    }
  },

  // Cancel the comparison
  cancelComparison: () => {
    const { abortControllers, activeSession } = get();
    abortControllers.forEach(controller => controller.abort());

    if (activeSession) {
      useOptimisticStore.getState().failMutation(
        `comparison-${activeSession.id}`,
        'Comparison cancelled'
      );
    }

    set({
      isLoading: false,
      abortControllers: new Map(),
    });
  },

  // Clear the session
  clearSession: () => {
    const { abortControllers } = get();
    abortControllers.forEach(controller => controller.abort());

    set({
      activeSession: null,
      isLoading: false,
      error: null,
      abortControllers: new Map(),
    });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Accept a suggestion from a specific persona
  acceptSuggestion: (personaId) => {
    const state = get();
    if (!state.activeSession) return;

    const feedback = state.activeSession.feedbacks.get(personaId);
    if (!feedback || !feedback.suggestion) {
      toast.warning('No suggestion available to accept');
      return;
    }

    // The actual text replacement should be handled by the component
    // that has access to the target element
    toast.success(`Accepted suggestion from ${feedback.personaName}`);
  },
}));

// Selector hooks for performance
export function useAIComparison() {
  const isComparisonMode = useAIComparisonStore((state) => state.isComparisonMode);
  const activeSession = useAIComparisonStore((state) => state.activeSession);
  const selectedPersonas = useAIComparisonStore((state) => state.selectedPersonas);
  const isLoading = useAIComparisonStore((state) => state.isLoading);
  const error = useAIComparisonStore((state) => state.error);

  return {
    isComparisonMode,
    activeSession,
    selectedPersonas,
    isLoading,
    error,
  };
}

// Get feedback count that's still streaming
export function useStreamingCount() {
  return useAIComparisonStore((state) => {
    if (!state.activeSession) return 0;
    return Array.from(state.activeSession.feedbacks.values()).filter(f => f.isStreaming).length;
  });
}
