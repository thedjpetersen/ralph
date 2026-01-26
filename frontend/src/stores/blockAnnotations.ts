/**
 * Block Annotations Store
 *
 * Manages private annotations attached to document blocks.
 * Annotations are stored per document and persist locally.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * A private annotation attached to a block
 */
export interface BlockAnnotation {
  id: string;
  /** ID of the document this annotation belongs to */
  documentId: string;
  /** ID of the block this annotation is attached to */
  blockId: string;
  /** The text content of the annotation */
  text: string;
  /** When the annotation was created */
  createdAt: string;
  /** When the annotation was last updated */
  updatedAt: string;
  /** Color for the annotation indicator */
  color: string;
}

/**
 * Export format for annotations
 */
export type AnnotationExportFormat = 'json' | 'markdown' | 'csv';

/**
 * Sort options for annotations
 */
export type AnnotationSortOrder = 'newest' | 'oldest' | 'block-order';

interface BlockAnnotationsState {
  /** All annotations keyed by annotation ID */
  annotations: Map<string, BlockAnnotation>;

  /** Currently focused annotation ID (for highlighting) */
  focusedAnnotationId: string | null;

  /** Currently highlighted block ID (from clicking annotation) */
  highlightedBlockId: string | null;

  /** Whether the annotations panel is open */
  isPanelOpen: boolean;

  /** Current sort order */
  sortOrder: AnnotationSortOrder;

  // Actions
  addAnnotation: (documentId: string, blockId: string, text: string, color?: string) => BlockAnnotation;
  updateAnnotation: (annotationId: string, text: string) => void;
  deleteAnnotation: (annotationId: string) => void;

  // Focus/highlight actions
  focusAnnotation: (annotationId: string | null) => void;
  highlightBlock: (blockId: string | null) => void;

  // Panel actions
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  // Query helpers
  getAnnotationsForDocument: (documentId: string) => BlockAnnotation[];
  getAnnotationsForBlock: (documentId: string, blockId: string) => BlockAnnotation[];
  getAnnotationById: (annotationId: string) => BlockAnnotation | undefined;
  hasAnnotation: (documentId: string, blockId: string) => boolean;

  // Sorting
  setSortOrder: (order: AnnotationSortOrder) => void;
  getSortedAnnotations: (documentId: string, blocks?: { id: string }[]) => BlockAnnotation[];

  // Export
  exportAnnotations: (documentId: string, format: AnnotationExportFormat, documentTitle?: string) => string;

  // Bulk operations
  deleteAllForDocument: (documentId: string) => void;
  deleteAllForBlock: (documentId: string, blockId: string) => void;
}

/**
 * Default annotation colors
 */
const ANNOTATION_COLORS = [
  '#F59E0B', // amber-500
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
];

/**
 * Generate a unique ID for an annotation
 */
function generateId(): string {
  return `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get a consistent color based on the number of existing annotations
 */
function getAnnotationColor(index: number): string {
  return ANNOTATION_COLORS[index % ANNOTATION_COLORS.length];
}

export const useBlockAnnotationsStore = create<BlockAnnotationsState>()(
  persist(
    (set, get) => ({
      // Initial state
      annotations: new Map(),
      focusedAnnotationId: null,
      highlightedBlockId: null,
      isPanelOpen: false,
      sortOrder: 'newest',

      // Add a new annotation
      addAnnotation: (documentId, blockId, text, color) => {
        const state = get();
        const existingCount = state.getAnnotationsForDocument(documentId).length;

        const annotation: BlockAnnotation = {
          id: generateId(),
          documentId,
          blockId,
          text,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          color: color || getAnnotationColor(existingCount),
        };

        set((state) => {
          const newAnnotations = new Map(state.annotations);
          newAnnotations.set(annotation.id, annotation);
          return { annotations: newAnnotations };
        });

        return annotation;
      },

      // Update an existing annotation
      updateAnnotation: (annotationId, text) => {
        set((state) => {
          const annotation = state.annotations.get(annotationId);
          if (!annotation) return state;

          const newAnnotations = new Map(state.annotations);
          newAnnotations.set(annotationId, {
            ...annotation,
            text,
            updatedAt: new Date().toISOString(),
          });
          return { annotations: newAnnotations };
        });
      },

      // Delete an annotation
      deleteAnnotation: (annotationId) => {
        set((state) => {
          const newAnnotations = new Map(state.annotations);
          newAnnotations.delete(annotationId);

          // Clear focus if the deleted annotation was focused
          const newFocusedId = state.focusedAnnotationId === annotationId
            ? null
            : state.focusedAnnotationId;

          return {
            annotations: newAnnotations,
            focusedAnnotationId: newFocusedId,
          };
        });
      },

      // Focus actions
      focusAnnotation: (annotationId) => {
        const annotation = annotationId ? get().annotations.get(annotationId) : null;
        set({
          focusedAnnotationId: annotationId,
          highlightedBlockId: annotation?.blockId || null,
        });
      },

      highlightBlock: (blockId) => {
        set({ highlightedBlockId: blockId });
      },

      // Panel actions
      openPanel: () => set({ isPanelOpen: true }),
      closePanel: () => set({ isPanelOpen: false }),
      togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

      // Query helpers
      getAnnotationsForDocument: (documentId) => {
        const state = get();
        return Array.from(state.annotations.values())
          .filter(a => a.documentId === documentId);
      },

      getAnnotationsForBlock: (documentId, blockId) => {
        const state = get();
        return Array.from(state.annotations.values())
          .filter(a => a.documentId === documentId && a.blockId === blockId);
      },

      getAnnotationById: (annotationId) => {
        return get().annotations.get(annotationId);
      },

      hasAnnotation: (documentId, blockId) => {
        const state = get();
        return Array.from(state.annotations.values())
          .some(a => a.documentId === documentId && a.blockId === blockId);
      },

      // Sorting
      setSortOrder: (order) => set({ sortOrder: order }),

      getSortedAnnotations: (documentId, blocks) => {
        const state = get();
        const annotations = state.getAnnotationsForDocument(documentId);

        switch (state.sortOrder) {
          case 'newest':
            return [...annotations].sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          case 'oldest':
            return [...annotations].sort((a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          case 'block-order': {
            if (!blocks) return annotations;
            const blockIndexMap = new Map(blocks.map((b, i) => [b.id, i]));
            return [...annotations].sort((a, b) => {
              const indexA = blockIndexMap.get(a.blockId) ?? Number.MAX_SAFE_INTEGER;
              const indexB = blockIndexMap.get(b.blockId) ?? Number.MAX_SAFE_INTEGER;
              return indexA - indexB;
            });
          }
          default:
            return annotations;
        }
      },

      // Export annotations
      exportAnnotations: (documentId, format, documentTitle = 'Document') => {
        const state = get();
        const annotations = state.getSortedAnnotations(documentId);

        switch (format) {
          case 'json':
            return JSON.stringify({
              documentId,
              documentTitle,
              exportedAt: new Date().toISOString(),
              annotations: annotations.map(a => ({
                id: a.id,
                blockId: a.blockId,
                text: a.text,
                createdAt: a.createdAt,
                updatedAt: a.updatedAt,
              })),
            }, null, 2);

          case 'markdown':
            if (annotations.length === 0) {
              return `# Annotations for ${documentTitle}\n\nNo annotations.`;
            }
            return [
              `# Annotations for ${documentTitle}`,
              '',
              `*Exported on ${new Date().toLocaleString()}*`,
              '',
              '---',
              '',
              ...annotations.map((a, i) => [
                `## Note ${i + 1}`,
                '',
                a.text,
                '',
                `*Created: ${new Date(a.createdAt).toLocaleString()}*`,
                '',
                '---',
                '',
              ].join('\n')),
            ].join('\n');

          case 'csv': {
            const headers = ['ID', 'Block ID', 'Text', 'Created At', 'Updated At'];
            const rows = annotations.map(a => [
              a.id,
              a.blockId,
              `"${a.text.replace(/"/g, '""')}"`,
              a.createdAt,
              a.updatedAt,
            ].join(','));
            return [headers.join(','), ...rows].join('\n');
          }

          default:
            return '';
        }
      },

      // Bulk delete operations
      deleteAllForDocument: (documentId) => {
        set((state) => {
          const newAnnotations = new Map(state.annotations);
          for (const [id, annotation] of newAnnotations) {
            if (annotation.documentId === documentId) {
              newAnnotations.delete(id);
            }
          }
          return { annotations: newAnnotations };
        });
      },

      deleteAllForBlock: (documentId, blockId) => {
        set((state) => {
          const newAnnotations = new Map(state.annotations);
          for (const [id, annotation] of newAnnotations) {
            if (annotation.documentId === documentId && annotation.blockId === blockId) {
              newAnnotations.delete(id);
            }
          }
          return { annotations: newAnnotations };
        });
      },
    }),
    {
      name: 'block-annotations-storage',
      // Custom serialization for Map
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              annotations: new Map(state.annotations || []),
            },
          };
        },
        setItem: (name, value) => {
          const { state } = value as { state: BlockAnnotationsState };
          const serialized = {
            state: {
              ...state,
              annotations: Array.from(state.annotations.entries()),
            },
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

// Selector hooks for performance
const selectAnnotations = (state: BlockAnnotationsState) => state.annotations;
const selectFocusedAnnotationId = (state: BlockAnnotationsState) => state.focusedAnnotationId;
const selectHighlightedBlockId = (state: BlockAnnotationsState) => state.highlightedBlockId;
const selectIsPanelOpen = (state: BlockAnnotationsState) => state.isPanelOpen;
const selectSortOrder = (state: BlockAnnotationsState) => state.sortOrder;

export function useBlockAnnotations() {
  const annotations = useBlockAnnotationsStore(selectAnnotations);
  const focusedAnnotationId = useBlockAnnotationsStore(selectFocusedAnnotationId);
  const highlightedBlockId = useBlockAnnotationsStore(selectHighlightedBlockId);
  const isPanelOpen = useBlockAnnotationsStore(selectIsPanelOpen);
  const sortOrder = useBlockAnnotationsStore(selectSortOrder);

  return {
    annotations,
    focusedAnnotationId,
    highlightedBlockId,
    isPanelOpen,
    sortOrder,
  };
}

// Hook for document-specific annotations
export function useDocumentAnnotations(documentId: string) {
  const { getAnnotationsForDocument, getSortedAnnotations, hasAnnotation } = useBlockAnnotationsStore();
  const annotations = useBlockAnnotationsStore(selectAnnotations);
  const sortOrder = useBlockAnnotationsStore(selectSortOrder);

  return {
    annotations: getAnnotationsForDocument(documentId),
    getSortedAnnotations: (blocks?: { id: string }[]) => getSortedAnnotations(documentId, blocks),
    hasAnnotation: (blockId: string) => hasAnnotation(documentId, blockId),
    count: getAnnotationsForDocument(documentId).length,
    // Re-export these to trigger re-renders
    _annotations: annotations,
    _sortOrder: sortOrder,
  };
}
