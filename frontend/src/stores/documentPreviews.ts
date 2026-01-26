import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DocumentPreview {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
}

interface DocumentPreviewsState {
  // State
  previews: Map<string, DocumentPreview>;
  viewMode: 'list' | 'grid';

  // Actions
  setPreview: (id: string, title: string, content: string) => void;
  removePreview: (id: string) => void;
  getPreview: (id: string) => DocumentPreview | null;
  setViewMode: (mode: 'list' | 'grid') => void;
  clearAllPreviews: () => void;
}

// Extract first paragraph or meaningful preview from content
function extractPreview(content: string, maxLength: number = 150): string {
  if (!content || content.trim().length === 0) {
    return '';
  }

  // Remove markdown headers at the start
  let text = content.replace(/^#{1,6}\s+[^\n]+\n*/gm, '');

  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');

  // Remove markdown links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove images
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, '');

  // Remove bold/italic markers
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');

  // Remove blockquotes
  text = text.replace(/^>\s*/gm, '');

  // Remove list markers
  text = text.replace(/^[-*+]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');

  // Get first non-empty paragraph
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const firstParagraph = paragraphs[0] || '';

  // Clean up whitespace
  const cleaned = firstParagraph.replace(/\s+/g, ' ').trim();

  // Truncate if too long
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Find a good break point (end of word)
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

export const useDocumentPreviewsStore = create<DocumentPreviewsState>()(
  persist(
    (set, get) => ({
      // Initial state
      previews: new Map(),
      viewMode: 'list',

      setPreview: (id, title, content) => {
        const preview = extractPreview(content);
        set((state) => {
          const newPreviews = new Map(state.previews);
          newPreviews.set(id, {
            id,
            title,
            preview,
            updatedAt: Date.now(),
          });
          return { previews: newPreviews };
        });
      },

      removePreview: (id) => {
        set((state) => {
          const newPreviews = new Map(state.previews);
          newPreviews.delete(id);
          return { previews: newPreviews };
        });
      },

      getPreview: (id) => {
        return get().previews.get(id) || null;
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      clearAllPreviews: () => {
        set({ previews: new Map() });
      },
    }),
    {
      name: 'clockzen-document-previews',
      partialize: (state) => ({
        viewMode: state.viewMode,
        // Convert Map to array for JSON serialization
        previewsArray: Array.from(state.previews.entries()),
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as { viewMode?: 'list' | 'grid'; previewsArray?: [string, DocumentPreview][] };
        return {
          ...current,
          viewMode: persistedState.viewMode || current.viewMode,
          previews: new Map(persistedState.previewsArray || []),
        };
      },
    }
  )
);

// Selectors
export const selectViewMode = (state: DocumentPreviewsState) => state.viewMode;
export const selectPreviews = (state: DocumentPreviewsState) => state.previews;

// Export utility function for external use
export { extractPreview };

// Hook for updating preview when document content changes
import { useEffect, useRef } from 'react';

export function useDocumentPreviewUpdater(
  documentId: string | null,
  documentTitle: string,
  content: string,
  debounceMs: number = 1000
): void {
  const { setPreview } = useDocumentPreviewsStore.getState();
  const timeoutRef = useRef<number | null>(null);
  const lastContentRef = useRef<string>('');

  useEffect(() => {
    if (!documentId || !content || content === lastContentRef.current) {
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    // Debounce the preview update
    timeoutRef.current = window.setTimeout(() => {
      setPreview(documentId, documentTitle, content);
      lastContentRef.current = content;
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [documentId, documentTitle, content, debounceMs, setPreview]);
}
