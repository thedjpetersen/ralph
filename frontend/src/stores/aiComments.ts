import { create } from 'zustand';

export interface AIComment {
  id: string;
  entityType: 'transaction' | 'receipt' | 'budget';
  entityId: string;
  text: string;
  isStreaming: boolean;
  createdAt: string;
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
}

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

  // Generate AI comment with streaming
  generateComment: async (entityType, entityId, context) => {
    const state = get();

    // Cancel any existing stream
    if (state.abortController) {
      state.abortController.abort();
    }

    const commentId = generateCommentId();
    const abortController = new AbortController();

    // Create initial comment entry
    const newComment: AIComment = {
      id: commentId,
      entityType,
      entityId,
      text: '',
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };

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
    } catch (error) {
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

  // Cancel ongoing stream
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

  // Clear a specific comment
  clearComment: (entityId) => {
    set((state) => {
      const newComments = new Map(state.comments);
      newComments.delete(entityId);
      return { comments: newComments };
    });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

// Hook to get comment for specific entity
export function useAIComment(entityId: string) {
  return useAICommentStore((state) => state.comments.get(entityId));
}
