import { useRef, useEffect, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { hexToRgba } from '../stores/commentHighlight';
import type { AuthorFeedback } from '../stores/aiComparison';
import './AuthorFeedbackCard.css';

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

interface AuthorFeedbackCardProps {
  feedback: AuthorFeedback;
  onAccept?: () => void;
  onRegenerate?: () => void;
  isActive?: boolean;
}

export function AuthorFeedbackCard({
  feedback,
  onAccept,
  onRegenerate,
  isActive = false,
}: AuthorFeedbackCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Auto-scroll to keep streaming content visible
  useEffect(() => {
    if (feedback.isStreaming && contentRef.current) {
      const element = contentRef.current;
      const parent = element.closest('.author-feedback-content');
      if (parent) {
        parent.scrollTop = parent.scrollHeight;
      }
    }
  }, [feedback.text, feedback.isStreaming]);

  // Get the first letter of the persona name for avatar
  const avatarInitial = feedback.personaName.charAt(0).toUpperCase();

  // AI icon SVG
  const aiIcon = (
    <svg className="author-ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
      <circle cx="8" cy="14" r="1.5" fill="currentColor" />
      <circle cx="16" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );

  return (
    <motion.div
      className={`author-feedback-card ${feedback.isStreaming ? 'is-streaming' : ''} ${isActive ? 'is-active' : ''}`}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        '--author-color': feedback.color,
        '--author-color-light': hexToRgba(feedback.color, 0.1),
        '--author-color-medium': hexToRgba(feedback.color, 0.3),
      } as React.CSSProperties}
      role="article"
      aria-label={`Feedback from ${feedback.personaName}`}
      aria-busy={feedback.isStreaming}
    >
      {/* Header with author info */}
      <div className="author-feedback-header">
        <div
          className="author-avatar"
          style={{ backgroundColor: hexToRgba(feedback.color, 0.2), color: feedback.color }}
          aria-hidden="true"
        >
          {avatarInitial}
        </div>
        <div className="author-info">
          <span className="author-name">{feedback.personaName}</span>
          <span className="author-role">
            {aiIcon}
            <span>AI Author</span>
          </span>
        </div>
        {feedback.isStreaming && (
          <span className="author-streaming-indicator" aria-hidden="true">
            <span className="streaming-dot" />
            <span className="streaming-dot" />
            <span className="streaming-dot" />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="author-feedback-content" ref={contentRef}>
        <p className="author-feedback-text">
          {feedback.text}
          {feedback.isStreaming && (
            <span
              className={`author-cursor ${prefersReducedMotion ? 'no-animation' : ''}`}
              aria-hidden="true"
            />
          )}
        </p>
        {!feedback.text && feedback.isStreaming && (
          <span className="author-thinking" aria-label="Generating feedback">
            Thinking...
          </span>
        )}
      </div>

      {/* Actions */}
      {!feedback.isStreaming && feedback.text && !feedback.text.startsWith('Error:') && (
        <div className="author-feedback-actions">
          {onAccept && (
            <button
              type="button"
              className="author-action-button author-accept"
              onClick={onAccept}
              aria-label={`Accept ${feedback.personaName}'s suggestion`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Accept
            </button>
          )}
          {onRegenerate && (
            <button
              type="button"
              className="author-action-button author-regenerate"
              onClick={onRegenerate}
              aria-label={`Regenerate ${feedback.personaName}'s feedback`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              Retry
            </button>
          )}
        </div>
      )}

      {/* Error state */}
      {feedback.text.startsWith('Error:') && (
        <div className="author-feedback-error">
          {onRegenerate && (
            <button
              type="button"
              className="author-action-button author-retry"
              onClick={onRegenerate}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

AuthorFeedbackCard.displayName = 'AuthorFeedbackCard';
