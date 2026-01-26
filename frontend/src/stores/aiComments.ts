import { create } from 'zustand';
import { useOptimisticStore } from './optimistic';
import { toast } from './toast';

export interface AICommentSuggestion {
  originalText: string;
  suggestedText: string;
}

export interface AIComment {
  id: string;
  entityType: 'transaction' | 'receipt' | 'budget';
  entityId: string;
  text: string;
  isStreaming: boolean;
  createdAt: string;
  suggestion?: AICommentSuggestion;
  /** Whether this comment is being optimistically deleted */
  isDeleting?: boolean;
}

interface AICommentState {
  // State
  comments: Map<string, AIComment>;
  activeStreamId: string | null;
  streamingText: string;
  abortController: AbortController | null;
  error: string | null;

  // Actions
  generateComment: (
    entityType: AIComment['entityType'],
    entityId: string,
    context?: Record<string, unknown>
  ) => Promise<void>;
  cancelStream: () => void;
  clearComment: (entityId: string) => void;
  clearError: () => void;
  setSuggestion: (entityId: string, suggestion: AICommentSuggestion) => void;
  resolveComment: (entityId: string) => void;
  /** Undo a recently cleared/resolved comment */
  undoClear: (entityId: string) => void;
}

// Store for recently cleared comments (for undo functionality)
const recentlyCleared = new Map<string, AIComment>();
const UNDO_TIMEOUT = 5000; // 5 seconds to undo

function generateCommentId(): string {
  return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useAICommentStore = create<AICommentState>()((set, get) => ({
  // Initial state
  comments: new Map(),
  activeStreamId: null,
  streamingText: '',
  abortController: null,
  error: null,

  // Generate AI comment with streaming (already shows immediate feedback via streaming)
  generateComment: async (entityType, entityId, context) => {
    const state = get();

    // Cancel any existing stream
    if (state.abortController) {
      state.abortController.abort();
    }

    const commentId = generateCommentId();
    const abortController = new AbortController();

    // Create initial comment entry - this is our optimistic state
    const newComment: AIComment = {
      id: commentId,
      entityType,
      entityId,
      text: '',
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };

    // Start optimistic tracking for sync indicator
    useOptimisticStore.getState().startMutation(
      `comment-generate-${entityId}`,
      'comment:generate',
      newComment,
      null
    );

    set((state) => {
      const newComments = new Map(state.comments);
      newComments.set(entityId, newComment);
      return {
        comments: newComments,
        activeStreamId: commentId,
        streamingText: '',
        abortController,
        error: null,
      };
    });

    try {
      const response = await fetch('/api/ai/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          context,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI comment');
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

        set((state) => {
          const newComments = new Map(state.comments);
          const existingComment = newComments.get(entityId);
          if (existingComment) {
            newComments.set(entityId, {
              ...existingComment,
              text: accumulatedText,
            });
          }
          return {
            comments: newComments,
            streamingText: accumulatedText,
          };
        });
      }

      // Mark streaming as complete
      set((state) => {
        const newComments = new Map(state.comments);
        const existingComment = newComments.get(entityId);
        if (existingComment) {
          newComments.set(entityId, {
            ...existingComment,
            isStreaming: false,
          });
        }
        return {
          comments: newComments,
          activeStreamId: null,
          abortController: null,
        };
      });

      // Complete the mutation tracking
      useOptimisticStore.getState().completeMutation(`comment-generate-${entityId}`);
    } catch (error) {
      // Fail the mutation tracking
      useOptimisticStore.getState().failMutation(
        `comment-generate-${entityId}`,
        error instanceof Error ? error.message : 'Unknown error'
      );

      if (error instanceof Error && error.name === 'AbortError') {
        // Stream was cancelled, don't set error
        set((state) => {
          const newComments = new Map(state.comments);
          const existingComment = newComments.get(entityId);
          if (existingComment) {
            newComments.set(entityId, {
              ...existingComment,
              isStreaming: false,
            });
          }
          return {
            comments: newComments,
            activeStreamId: null,
            abortController: null,
          };
        });
        return;
      }

      set((state) => {
        const newComments = new Map(state.comments);
        const existingComment = newComments.get(entityId);
        if (existingComment) {
          newComments.set(entityId, {
            ...existingComment,
            isStreaming: false,
          });
        }
        return {
          comments: newComments,
          activeStreamId: null,
          abortController: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      });
    }
  },

  // Cancel ongoing stream (immediate, no server call needed)
  cancelStream: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({
      activeStreamId: null,
      abortController: null,
    });
  },

  // Clear a specific comment with undo capability
  clearComment: (entityId) => {
    const state = get();
    const existingComment = state.comments.get(entityId);

    if (!existingComment) return;

    // Store for potential undo
    recentlyCleared.set(entityId, existingComment);

    // Optimistically remove the comment immediately
    set((state) => {
      const newComments = new Map(state.comments);
      newComments.delete(entityId);
      return { comments: newComments };
    });

    // Show toast with undo action
    toast.info('Comment cleared', {
      duration: UNDO_TIMEOUT,
      action: {
        label: 'Undo',
        onClick: () => {
          get().undoClear(entityId);
        },
      },
    });

    // Clear from recently cleared after timeout
    setTimeout(() => {
      recentlyCleared.delete(entityId);
    }, UNDO_TIMEOUT);
  },

  // Clear error (immediate)
  clearError: () => {
    set({ error: null });
  },

  // Set a suggestion for a comment (immediate, local-only)
  setSuggestion: (entityId, suggestion) => {
    set((state) => {
      const newComments = new Map(state.comments);
      const existingComment = newComments.get(entityId);
      if (existingComment) {
        newComments.set(entityId, {
          ...existingComment,
          suggestion,
        });
      }
      return { comments: newComments };
    });
  },

  // Resolve (clear) a comment after accepting suggestion with undo capability
  resolveComment: (entityId) => {
    const state = get();
    const existingComment = state.comments.get(entityId);

    if (!existingComment) return;

    // Store for potential undo
    recentlyCleared.set(entityId, existingComment);

    // Optimistically remove the comment immediately
    set((state) => {
      const newComments = new Map(state.comments);
      newComments.delete(entityId);
      return { comments: newComments };
    });

    // Clear from recently cleared after timeout (no toast for resolve as it's expected)
    setTimeout(() => {
      recentlyCleared.delete(entityId);
    }, UNDO_TIMEOUT);
  },

  // Undo a recently cleared/resolved comment
  undoClear: (entityId) => {
    const clearedComment = recentlyCleared.get(entityId);
    if (!clearedComment) {
      toast.warning('Cannot undo - comment no longer available');
      return;
    }

    // Restore the comment
    set((state) => {
      const newComments = new Map(state.comments);
      newComments.set(entityId, clearedComment);
      return { comments: newComments };
    });

    // Remove from recently cleared
    recentlyCleared.delete(entityId);

    toast.success('Comment restored');
  },
}));

// Hook to get comment for specific entity
export function useAIComment(entityId: string) {
  return useAICommentStore((state) => state.comments.get(entityId));
}
