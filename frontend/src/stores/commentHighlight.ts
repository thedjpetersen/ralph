import { create } from 'zustand';

/**
 * Represents a text range within an editable element
 */
export interface TextRange {
  startIndex: number;
  endIndex: number;
}

/**
 * A comment with its associated text range
 */
export interface CommentWithRange {
  id: string;
  entityType: 'transaction' | 'receipt' | 'budget';
  entityId: string;
  text: string;
  textRange?: TextRange;
  authorId?: string;
  authorColor?: string;
  createdAt: string;
}

/**
 * Information for displaying the highlight overlay
 */
export interface HighlightInfo {
  commentId: string;
  targetElement: HTMLTextAreaElement | HTMLInputElement | null;
  textRange: TextRange;
  color: string;
  fadeStartTime: number | null;
}

interface CommentHighlightState {
  // Registered comments with text ranges
  commentRanges: Map<string, CommentWithRange>;

  // Currently highlighted comment (from hover or click)
  activeHighlight: HighlightInfo | null;

  // Currently shown comment panel (from clicking highlighted text)
  focusedCommentId: string | null;

  // Target elements registry (element id -> element ref)
  targetElements: Map<string, HTMLTextAreaElement | HTMLInputElement>;

  // Comment navigation index (for keyboard navigation)
  currentNavigationIndex: number;

  // Filter function for comments (used with filtered views)
  commentFilter: ((comment: CommentWithRange) => boolean) | null;

  // Actions
  registerComment: (comment: CommentWithRange) => void;
  unregisterComment: (commentId: string) => void;
  registerTargetElement: (elementId: string, element: HTMLTextAreaElement | HTMLInputElement) => void;
  unregisterTargetElement: (elementId: string) => void;

  // Highlight actions
  highlightFromComment: (commentId: string, elementId: string) => void;
  highlightFromText: (commentId: string) => void;
  clearHighlight: () => void;
  startFade: () => void;

  // Focus actions (when clicking highlighted text to show comment)
  focusComment: (commentId: string) => void;
  clearFocus: () => void;

  // Get comment by ID
  getComment: (commentId: string) => CommentWithRange | undefined;

  // Navigation actions
  navigateToNextComment: () => void;
  navigateToPreviousComment: () => void;
  setCommentFilter: (filter: ((comment: CommentWithRange) => boolean) | null) => void;
  getFilteredComments: () => CommentWithRange[];
}

/**
 * Default author colors - used when no specific color is assigned
 */
const DEFAULT_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#8B5CF6', // violet-500
  '#F59E0B', // amber-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#EF4444', // red-500
  '#84CC16', // lime-500
];

/**
 * Generate a consistent color for an author based on their ID
 */
export function getAuthorColor(authorId?: string): string {
  if (!authorId) {
    return DEFAULT_COLORS[0];
  }
  // Simple hash to pick a consistent color
  let hash = 0;
  for (let i = 0; i < authorId.length; i++) {
    const char = authorId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
}

/**
 * Convert hex color to rgba with opacity
 */
export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(59, 130, 246, ${alpha})`; // fallback to blue
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Scroll a text element to show the specified text range
 * This is used when navigating between comments to show the highlighted text
 */
function scrollToTextRange(element: HTMLTextAreaElement | HTMLInputElement, textRange: TextRange): void {
  // Focus the element briefly to ensure scroll works
  const wasActive = document.activeElement === element;

  // Set selection to the text range to trigger scroll
  element.setSelectionRange(textRange.startIndex, textRange.startIndex);

  // For textareas, we need to ensure the text is visible
  if (element instanceof HTMLTextAreaElement) {
    // Create a temporary hidden clone to measure text position
    const lineHeight = parseInt(window.getComputedStyle(element).lineHeight) || 20;
    const textBeforeCursor = element.value.substring(0, textRange.startIndex);
    const linesBefore = textBeforeCursor.split('\n').length - 1;

    // Calculate approximate scroll position
    const targetScrollTop = linesBefore * lineHeight - element.clientHeight / 2 + lineHeight;

    // Scroll to make the text visible
    element.scrollTop = Math.max(0, targetScrollTop);
  }

  // Scroll the element into view
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Clear selection if element wasn't focused
  if (!wasActive) {
    element.blur();
  }
}

export const useCommentHighlightStore = create<CommentHighlightState>()((set, get) => ({
  // Initial state
  commentRanges: new Map(),
  activeHighlight: null,
  focusedCommentId: null,
  targetElements: new Map(),
  currentNavigationIndex: -1,
  commentFilter: null,

  // Register a comment with its text range
  registerComment: (comment) => {
    set((state) => {
      const newComments = new Map(state.commentRanges);
      // Assign a color if not already set
      const color = comment.authorColor || getAuthorColor(comment.authorId);
      newComments.set(comment.id, { ...comment, authorColor: color });
      return { commentRanges: newComments };
    });
  },

  // Unregister a comment
  unregisterComment: (commentId) => {
    set((state) => {
      const newComments = new Map(state.commentRanges);
      newComments.delete(commentId);
      // Clear highlight if it was for this comment
      const newHighlight = state.activeHighlight?.commentId === commentId ? null : state.activeHighlight;
      const newFocus = state.focusedCommentId === commentId ? null : state.focusedCommentId;
      return {
        commentRanges: newComments,
        activeHighlight: newHighlight,
        focusedCommentId: newFocus,
      };
    });
  },

  // Register a target element for highlighting
  registerTargetElement: (elementId, element) => {
    set((state) => {
      const newElements = new Map(state.targetElements);
      newElements.set(elementId, element);
      return { targetElements: newElements };
    });
  },

  // Unregister a target element
  unregisterTargetElement: (elementId) => {
    set((state) => {
      const newElements = new Map(state.targetElements);
      newElements.delete(elementId);
      return { targetElements: newElements };
    });
  },

  // Highlight text from hovering/clicking a comment
  highlightFromComment: (commentId, elementId) => {
    const state = get();
    const comment = state.commentRanges.get(commentId);
    const targetElement = state.targetElements.get(elementId);

    if (!comment || !comment.textRange || !targetElement) {
      return;
    }

    set({
      activeHighlight: {
        commentId,
        targetElement,
        textRange: comment.textRange,
        color: comment.authorColor || getAuthorColor(comment.authorId),
        fadeStartTime: null,
      },
      focusedCommentId: null,
    });
  },

  // Highlight text when clicking on text (to show which comment it belongs to)
  highlightFromText: (commentId) => {
    const state = get();
    const comment = state.commentRanges.get(commentId);

    if (!comment || !comment.textRange) {
      return;
    }

    // Find the target element that contains this comment's text
    // For now, we'll use the first registered element
    // In a real app, comments would be associated with specific elements
    const targetElement = state.targetElements.values().next().value || null;

    set({
      activeHighlight: {
        commentId,
        targetElement,
        textRange: comment.textRange,
        color: comment.authorColor || getAuthorColor(comment.authorId),
        fadeStartTime: null,
      },
    });
  },

  // Clear the active highlight
  clearHighlight: () => {
    set({ activeHighlight: null });
  },

  // Start the fade timer
  startFade: () => {
    set((state) => ({
      activeHighlight: state.activeHighlight
        ? { ...state.activeHighlight, fadeStartTime: Date.now() }
        : null,
    }));
  },

  // Focus on a comment (when clicking highlighted text)
  focusComment: (commentId) => {
    set({ focusedCommentId: commentId });
  },

  // Clear the focused comment
  clearFocus: () => {
    set({ focusedCommentId: null });
  },

  // Get a comment by ID
  getComment: (commentId) => {
    return get().commentRanges.get(commentId);
  },

  // Get filtered comments (respects commentFilter if set)
  getFilteredComments: () => {
    const state = get();
    const comments = Array.from(state.commentRanges.values());
    if (state.commentFilter) {
      return comments.filter(state.commentFilter);
    }
    return comments;
  },

  // Set comment filter for filtered views
  setCommentFilter: (filter) => {
    set({ commentFilter: filter, currentNavigationIndex: -1 });
  },

  // Navigate to next comment
  navigateToNextComment: () => {
    const state = get();
    const filteredComments = state.getFilteredComments();

    if (filteredComments.length === 0) return;

    // Calculate new index
    let newIndex = state.currentNavigationIndex + 1;
    if (newIndex >= filteredComments.length) {
      newIndex = 0; // Wrap around to first comment
    }

    const comment = filteredComments[newIndex];
    if (!comment || !comment.textRange) return;

    // Find the target element
    const targetElement = state.targetElements.values().next().value || null;

    // Scroll to the text in the editor
    if (targetElement && comment.textRange) {
      scrollToTextRange(targetElement, comment.textRange);
    }

    set({
      currentNavigationIndex: newIndex,
      focusedCommentId: comment.id,
      activeHighlight: targetElement ? {
        commentId: comment.id,
        targetElement,
        textRange: comment.textRange,
        color: comment.authorColor || getAuthorColor(comment.authorId),
        fadeStartTime: null,
      } : null,
    });
  },

  // Navigate to previous comment
  navigateToPreviousComment: () => {
    const state = get();
    const filteredComments = state.getFilteredComments();

    if (filteredComments.length === 0) return;

    // Calculate new index
    let newIndex = state.currentNavigationIndex - 1;
    if (newIndex < 0) {
      newIndex = filteredComments.length - 1; // Wrap around to last comment
    }

    const comment = filteredComments[newIndex];
    if (!comment || !comment.textRange) return;

    // Find the target element
    const targetElement = state.targetElements.values().next().value || null;

    // Scroll to the text in the editor
    if (targetElement && comment.textRange) {
      scrollToTextRange(targetElement, comment.textRange);
    }

    set({
      currentNavigationIndex: newIndex,
      focusedCommentId: comment.id,
      activeHighlight: targetElement ? {
        commentId: comment.id,
        targetElement,
        textRange: comment.textRange,
        color: comment.authorColor || getAuthorColor(comment.authorId),
        fadeStartTime: null,
      } : null,
    });
  },
}));

// Selector hooks for performance
const selectActiveHighlight = (state: CommentHighlightState) => state.activeHighlight;
const selectFocusedCommentId = (state: CommentHighlightState) => state.focusedCommentId;
const selectCommentRanges = (state: CommentHighlightState) => state.commentRanges;
const selectTargetElements = (state: CommentHighlightState) => state.targetElements;
const selectCurrentNavigationIndex = (state: CommentHighlightState) => state.currentNavigationIndex;

export function useCommentHighlight() {
  const activeHighlight = useCommentHighlightStore(selectActiveHighlight);
  const focusedCommentId = useCommentHighlightStore(selectFocusedCommentId);
  const commentRanges = useCommentHighlightStore(selectCommentRanges);
  const targetElements = useCommentHighlightStore(selectTargetElements);
  const currentNavigationIndex = useCommentHighlightStore(selectCurrentNavigationIndex);

  return {
    activeHighlight,
    focusedCommentId,
    commentRanges,
    targetElements,
    currentNavigationIndex,
  };
}

// Hook for comment navigation
export function useCommentNavigation() {
  const { navigateToNextComment, navigateToPreviousComment, setCommentFilter, getFilteredComments } = useCommentHighlightStore();
  const currentNavigationIndex = useCommentHighlightStore(selectCurrentNavigationIndex);
  const commentRanges = useCommentHighlightStore(selectCommentRanges);

  return {
    navigateToNextComment,
    navigateToPreviousComment,
    setCommentFilter,
    getFilteredComments,
    currentNavigationIndex,
    totalComments: commentRanges.size,
  };
}
