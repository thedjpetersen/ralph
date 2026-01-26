import { useMemo, useCallback, useSyncExternalStore } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useCommentHighlightStore, useCommentHighlight, useCommentSearchFilter, hexToRgba, getAuthorColor } from '../stores/commentHighlight';
import { useAppSettingsStore, type CommentSortOrder } from '../stores/appSettings';
import { CommentSearchFilter } from './CommentSearchFilter';
import './CommentsPanel.css';

function getReducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function subscribeToReducedMotion(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
}

interface CommentsPanelProps {
  /** ID of the target text element for highlighting */
  targetElementId?: string;
  /** Optional class name for styling */
  className?: string;
  /** Optional title for the panel */
  title?: string;
}

const SORT_OPTIONS: { value: CommentSortOrder; label: string; icon: string }[] = [
  { value: 'newest', label: 'Newest', icon: '↓' },
  { value: 'oldest', label: 'Oldest', icon: '↑' },
  { value: 'author', label: 'Author', icon: 'A' },
  { value: 'position', label: 'Position', icon: '#' },
  { value: 'type', label: 'Type', icon: '◇' },
];

export function CommentsPanel({
  targetElementId,
  className = '',
  title = 'Comments',
}: CommentsPanelProps) {
  const { commentRanges, focusedCommentId, searchFilters } = useCommentHighlight();
  const { getSortedComments, highlightFromComment, clearHighlight, focusComment } = useCommentHighlightStore();
  const { getSearchFilteredComments, hasActiveFilters } = useCommentSearchFilter();
  const { settings, updateEditorSettings } = useAppSettingsStore();
  const prefersReducedMotion = useReducedMotion();

  const sortOrder = settings.editor.commentSortOrder;
  const isFiltered = hasActiveFilters();

  // Get filtered then sorted comments
  const sortedComments = useMemo(() => {
    if (isFiltered) {
      // Apply search filters first, then sort
      const filtered = getSearchFilteredComments();
      return [...filtered].sort((a, b) => {
        switch (sortOrder) {
          case 'newest':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'oldest':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'author':
            return (a.authorId || '').localeCompare(b.authorId || '');
          case 'position': {
            const aPos = a.textRange?.startIndex ?? Number.MAX_SAFE_INTEGER;
            const bPos = b.textRange?.startIndex ?? Number.MAX_SAFE_INTEGER;
            return aPos - bPos;
          }
          case 'type':
            return a.entityType.localeCompare(b.entityType);
          default:
            return 0;
        }
      });
    }
    return getSortedComments(sortOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSortedComments, getSearchFilteredComments, sortOrder, commentRanges.size, searchFilters, isFiltered]);

  // Handle sort change
  const handleSortChange = useCallback((newSort: CommentSortOrder) => {
    updateEditorSettings({ commentSortOrder: newSort });
  }, [updateEditorSettings]);

  // Handle comment hover for highlighting
  const handleCommentMouseEnter = useCallback((commentId: string) => {
    if (targetElementId) {
      highlightFromComment(commentId, targetElementId);
    }
  }, [targetElementId, highlightFromComment]);

  const handleCommentMouseLeave = useCallback(() => {
    clearHighlight();
  }, [clearHighlight]);

  // Handle comment click
  const handleCommentClick = useCallback((commentId: string) => {
    focusComment(commentId);
    if (targetElementId) {
      highlightFromComment(commentId, targetElementId);
    }
  }, [focusComment, targetElementId, highlightFromComment]);

  // Get current sort option label
  const currentSortOption = SORT_OPTIONS.find(opt => opt.value === sortOrder);

  // Don't render if no comments
  if (commentRanges.size === 0) {
    return (
      <div className={`comments-panel comments-panel-empty ${className}`}>
        <div className="comments-panel-header">
          <div className="comments-panel-title">
            <svg className="comments-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{title}</span>
          </div>
        </div>
        <div className="comments-empty-state">
          <p>No comments yet</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`comments-panel ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header with sort dropdown */}
      <div className="comments-panel-header">
        <div className="comments-panel-title">
          <svg className="comments-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{title}</span>
          <span className="comments-badge">{commentRanges.size}</span>
        </div>
        <div className="comments-sort-container">
          <span className="sort-label">Sort:</span>
          <div className="sort-dropdown">
            <button
              type="button"
              className="sort-dropdown-trigger"
              aria-haspopup="listbox"
              aria-label={`Sort by ${currentSortOption?.label}`}
            >
              <span className="sort-icon">{currentSortOption?.icon}</span>
              <span className="sort-value">{currentSortOption?.label}</span>
              <svg className="sort-chevron" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <select
              className="sort-select-native"
              value={sortOrder}
              onChange={(e) => handleSortChange(e.target.value as CommentSortOrder)}
              aria-label="Sort comments by"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <CommentSearchFilter
        totalCount={commentRanges.size}
        filteredCount={sortedComments.length}
      />

      {/* Comments list with animations */}
      <div className="comments-list">
        {sortedComments.length === 0 && isFiltered ? (
          <div className="comments-filter-empty">
            <svg className="filter-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p>No comments match your filters</p>
          </div>
        ) : (
        <LayoutGroup>
          <AnimatePresence mode="popLayout">
            {sortedComments.map((comment, index) => {
              const authorColor = comment.authorColor || getAuthorColor(comment.authorId);
              const isFocused = focusedCommentId === comment.id;

              return (
                <motion.div
                  key={comment.id}
                  layoutId={comment.id}
                  className={`comment-item ${isFocused ? 'comment-focused' : ''}`}
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
                  transition={{
                    layout: { duration: 0.3, type: 'spring', stiffness: 500, damping: 30 },
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2 },
                    scale: { duration: 0.2 },
                    delay: prefersReducedMotion ? 0 : index * 0.03,
                  }}
                  style={{
                    '--comment-color': authorColor,
                    '--comment-color-light': hexToRgba(authorColor, 0.1),
                    '--comment-color-medium': hexToRgba(authorColor, 0.3),
                  } as React.CSSProperties}
                  onMouseEnter={() => handleCommentMouseEnter(comment.id)}
                  onMouseLeave={handleCommentMouseLeave}
                  onClick={() => handleCommentClick(comment.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleCommentClick(comment.id);
                    }
                  }}
                >
                  <div className="comment-indicator" />
                  <div className="comment-content">
                    <div className="comment-meta">
                      {comment.authorId && (
                        <span className="comment-author">{comment.authorId}</span>
                      )}
                      <span className="comment-type">{comment.entityType}</span>
                      <span className="comment-time">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                    {comment.textRange && (
                      <span className="comment-position">
                        Position: {comment.textRange.startIndex}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </LayoutGroup>
        )}
      </div>
    </motion.div>
  );
}

CommentsPanel.displayName = 'CommentsPanel';
