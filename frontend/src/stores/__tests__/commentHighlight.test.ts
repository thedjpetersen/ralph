import { describe, it, expect, beforeEach } from 'vitest';
import { useCommentHighlightStore, CommentWithRange } from '../commentHighlight';

describe('commentHighlight store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCommentHighlightStore.setState({
      commentRanges: new Map(),
      activeHighlight: null,
      focusedCommentId: null,
      targetElements: new Map(),
      currentNavigationIndex: -1,
      commentFilter: null,
    });
  });

  describe('comment navigation', () => {
    const createTestComments = (): CommentWithRange[] => [
      {
        id: 'comment-1',
        entityType: 'transaction',
        entityId: 'entity-1',
        text: 'First comment',
        textRange: { startIndex: 0, endIndex: 10 },
        authorId: 'author-1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'comment-2',
        entityType: 'transaction',
        entityId: 'entity-2',
        text: 'Second comment',
        textRange: { startIndex: 20, endIndex: 30 },
        authorId: 'author-2',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'comment-3',
        entityType: 'transaction',
        entityId: 'entity-3',
        text: 'Third comment',
        textRange: { startIndex: 40, endIndex: 50 },
        authorId: 'author-3',
        createdAt: new Date().toISOString(),
      },
    ];

    it('navigates to next comment', () => {
      const store = useCommentHighlightStore.getState();
      const comments = createTestComments();

      // Register comments
      comments.forEach((comment) => store.registerComment(comment));

      // Navigate to first comment
      store.navigateToNextComment();

      const state1 = useCommentHighlightStore.getState();
      expect(state1.currentNavigationIndex).toBe(0);
      expect(state1.focusedCommentId).toBe('comment-1');

      // Navigate to second comment
      store.navigateToNextComment();

      const state2 = useCommentHighlightStore.getState();
      expect(state2.currentNavigationIndex).toBe(1);
      expect(state2.focusedCommentId).toBe('comment-2');

      // Navigate to third comment
      store.navigateToNextComment();

      const state3 = useCommentHighlightStore.getState();
      expect(state3.currentNavigationIndex).toBe(2);
      expect(state3.focusedCommentId).toBe('comment-3');
    });

    it('wraps around when navigating past the last comment', () => {
      const store = useCommentHighlightStore.getState();
      const comments = createTestComments();

      // Register comments
      comments.forEach((comment) => store.registerComment(comment));

      // Navigate to last comment
      store.navigateToNextComment();
      store.navigateToNextComment();
      store.navigateToNextComment();

      const stateLast = useCommentHighlightStore.getState();
      expect(stateLast.currentNavigationIndex).toBe(2);

      // Navigate one more time - should wrap to first
      store.navigateToNextComment();

      const stateWrapped = useCommentHighlightStore.getState();
      expect(stateWrapped.currentNavigationIndex).toBe(0);
      expect(stateWrapped.focusedCommentId).toBe('comment-1');
    });

    it('navigates to previous comment', () => {
      const store = useCommentHighlightStore.getState();
      const comments = createTestComments();

      // Register comments
      comments.forEach((comment) => store.registerComment(comment));

      // Start at the second comment
      useCommentHighlightStore.setState({ currentNavigationIndex: 1 });

      // Navigate to previous comment
      store.navigateToPreviousComment();

      const state = useCommentHighlightStore.getState();
      expect(state.currentNavigationIndex).toBe(0);
      expect(state.focusedCommentId).toBe('comment-1');
    });

    it('wraps around when navigating before the first comment', () => {
      const store = useCommentHighlightStore.getState();
      const comments = createTestComments();

      // Register comments
      comments.forEach((comment) => store.registerComment(comment));

      // Start at index -1 (no navigation yet)
      // Navigate to previous - should wrap to last
      store.navigateToPreviousComment();

      const state = useCommentHighlightStore.getState();
      expect(state.currentNavigationIndex).toBe(2);
      expect(state.focusedCommentId).toBe('comment-3');
    });

    it('does nothing when there are no comments', () => {
      const store = useCommentHighlightStore.getState();

      store.navigateToNextComment();

      const state = useCommentHighlightStore.getState();
      expect(state.currentNavigationIndex).toBe(-1);
      expect(state.focusedCommentId).toBeNull();
    });

    it('respects comment filter when navigating', () => {
      const store = useCommentHighlightStore.getState();
      const comments = createTestComments();

      // Register comments
      comments.forEach((comment) => store.registerComment(comment));

      // Set filter to only include comments from author-2
      store.setCommentFilter((comment) => comment.authorId === 'author-2');

      // Navigate to next - should only find the filtered comment
      store.navigateToNextComment();

      const state = useCommentHighlightStore.getState();
      expect(state.focusedCommentId).toBe('comment-2');

      // Navigate again - should wrap around to the same comment
      store.navigateToNextComment();

      const state2 = useCommentHighlightStore.getState();
      expect(state2.focusedCommentId).toBe('comment-2');
    });

    it('resets navigation index when filter changes', () => {
      const store = useCommentHighlightStore.getState();
      const comments = createTestComments();

      // Register comments
      comments.forEach((comment) => store.registerComment(comment));

      // Navigate to a comment
      store.navigateToNextComment();
      store.navigateToNextComment();

      const stateBefore = useCommentHighlightStore.getState();
      expect(stateBefore.currentNavigationIndex).toBe(1);

      // Set a filter - should reset index
      store.setCommentFilter((comment) => comment.authorId === 'author-1');

      const stateAfter = useCommentHighlightStore.getState();
      expect(stateAfter.currentNavigationIndex).toBe(-1);
    });

    it('getFilteredComments returns all comments when no filter is set', () => {
      const store = useCommentHighlightStore.getState();
      const comments = createTestComments();

      // Register comments
      comments.forEach((comment) => store.registerComment(comment));

      const filtered = store.getFilteredComments();
      expect(filtered).toHaveLength(3);
    });

    it('getFilteredComments respects the filter', () => {
      const store = useCommentHighlightStore.getState();
      const comments = createTestComments();

      // Register comments
      comments.forEach((comment) => store.registerComment(comment));

      // Set filter
      store.setCommentFilter((comment) => comment.authorId === 'author-1' || comment.authorId === 'author-3');

      const filtered = store.getFilteredComments();
      expect(filtered).toHaveLength(2);
      expect(filtered.map((c) => c.id)).toEqual(['comment-1', 'comment-3']);
    });
  });

  describe('comment registration', () => {
    it('registers a comment', () => {
      const store = useCommentHighlightStore.getState();
      const comment: CommentWithRange = {
        id: 'comment-1',
        entityType: 'transaction',
        entityId: 'entity-1',
        text: 'Test comment',
        textRange: { startIndex: 0, endIndex: 10 },
        createdAt: new Date().toISOString(),
      };

      store.registerComment(comment);

      const state = useCommentHighlightStore.getState();
      expect(state.commentRanges.has('comment-1')).toBe(true);
    });

    it('unregisters a comment', () => {
      const store = useCommentHighlightStore.getState();
      const comment: CommentWithRange = {
        id: 'comment-1',
        entityType: 'transaction',
        entityId: 'entity-1',
        text: 'Test comment',
        textRange: { startIndex: 0, endIndex: 10 },
        createdAt: new Date().toISOString(),
      };

      store.registerComment(comment);
      store.unregisterComment('comment-1');

      const state = useCommentHighlightStore.getState();
      expect(state.commentRanges.has('comment-1')).toBe(false);
    });
  });

  describe('focus actions', () => {
    it('focuses a comment', () => {
      const store = useCommentHighlightStore.getState();

      store.focusComment('comment-1');

      const state = useCommentHighlightStore.getState();
      expect(state.focusedCommentId).toBe('comment-1');
    });

    it('clears focus', () => {
      const store = useCommentHighlightStore.getState();

      store.focusComment('comment-1');
      store.clearFocus();

      const state = useCommentHighlightStore.getState();
      expect(state.focusedCommentId).toBeNull();
    });
  });
});
