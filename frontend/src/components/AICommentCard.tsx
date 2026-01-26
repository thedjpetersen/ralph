import { useRef, useEffect, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAICommentStore, useAIComment } from '../stores/aiComments';
import './AICommentCard.css';

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

interface AICommentCardProps {
  entityType: 'transaction' | 'receipt' | 'budget';
  entityId: string;
  context?: Record<string, unknown>;
  onGenerate?: () => void;
}

export function AICommentCard({ entityType, entityId, context }: AICommentCardProps) {
  const comment = useAIComment(entityId);
  const { generateComment, cancelStream, clearComment, error, clearError } = useAICommentStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Auto-scroll to keep streaming content visible
  useEffect(() => {
    if (comment?.isStreaming && contentRef.current) {
      const element = contentRef.current;
      const parent = element.closest('.ai-comment-content');
      if (parent) {
        parent.scrollTop = parent.scrollHeight;
      }
      // Also scroll the card into view if needed
      if (typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [comment?.text, comment?.isStreaming]);

  const handleGenerate = () => {
    clearError();
    generateComment(entityType, entityId, context);
  };

  const handleCancel = () => {
    cancelStream();
  };

  const handleClear = () => {
    clearComment(entityId);
    clearError();
  };

  const handleRetry = () => {
    clearError();
    generateComment(entityType, entityId, context);
  };

  // AI icon SVG
  const aiIcon = (
    <svg className="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
      <circle cx="8" cy="14" r="1.5" fill="currentColor" />
      <circle cx="16" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );

  // Show generate button if no comment exists
  if (!comment && !error) {
    return (
      <div className="ai-comment-trigger">
        <button
          type="button"
          className="ai-generate-button"
          onClick={handleGenerate}
          aria-label="Generate AI insight"
        >
          {aiIcon}
          <span>Get AI Insight</span>
        </button>
      </div>
    );
  }

  // Show error state
  if (error && !comment) {
    return (
      <motion.div
        className="ai-comment-card ai-comment-error"
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        role="alert"
      >
        <div className="ai-comment-header">
          {aiIcon}
          <span className="ai-comment-label">AI Insight</span>
        </div>
        <div className="ai-comment-content">
          <p className="ai-error-message">{error}</p>
        </div>
        <div className="ai-comment-actions">
          <button type="button" className="ai-action-button ai-retry" onClick={handleRetry}>
            Retry
          </button>
          <button type="button" className="ai-action-button ai-dismiss" onClick={clearError}>
            Dismiss
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {comment && (
        <motion.div
          key={comment.id}
          className={`ai-comment-card ${comment.isStreaming ? 'is-streaming' : ''}`}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="region"
          aria-label="AI-generated insight"
          aria-live="polite"
          aria-busy={comment.isStreaming}
        >
          <div className="ai-comment-header">
            {aiIcon}
            <span className="ai-comment-label">AI Insight</span>
            {comment.isStreaming && (
              <span className="ai-streaming-indicator" aria-hidden="true">
                <span className="streaming-dot" />
                <span className="streaming-dot" />
                <span className="streaming-dot" />
              </span>
            )}
          </div>

          <div className="ai-comment-content" ref={contentRef}>
            <p className="ai-comment-text">
              {comment.text}
              {comment.isStreaming && (
                <span
                  className={`ai-cursor ${prefersReducedMotion ? 'no-animation' : ''}`}
                  aria-hidden="true"
                />
              )}
            </p>
            {!comment.text && comment.isStreaming && (
              <span className="ai-thinking" aria-label="Generating insight">
                Thinking...
              </span>
            )}
          </div>

          <div className="ai-comment-actions">
            {comment.isStreaming ? (
              <button
                type="button"
                className="ai-action-button ai-cancel"
                onClick={handleCancel}
                aria-label="Cancel generation"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="cancel-icon">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Cancel
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="ai-action-button ai-regenerate"
                  onClick={handleGenerate}
                  aria-label="Generate new insight"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="refresh-icon">
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Regenerate
                </button>
                <button
                  type="button"
                  className="ai-action-button ai-clear"
                  onClick={handleClear}
                  aria-label="Clear insight"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="clear-icon">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Clear
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
