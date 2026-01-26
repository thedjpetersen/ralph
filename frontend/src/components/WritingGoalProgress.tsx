import { useMemo, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWritingStreakStore } from '../stores/writingStreak';
import './WritingGoalProgress.css';

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

// Pencil/quill icon for writing
function WritingIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="writing-goal-icon"
      aria-hidden="true"
    >
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

// Checkmark icon for goal completed
function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="writing-goal-check-icon"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export interface WritingGoalProgressProps {
  /** Position of the indicator */
  position?: 'bottom-left' | 'bottom-right';
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

export function WritingGoalProgress({
  position = 'bottom-left',
  compact = false,
  className = '',
}: WritingGoalProgressProps) {
  const settings = useWritingStreakStore((state) => state.settings);
  const getTodayProgress = useWritingStreakStore((state) => state.getTodayProgress);
  const openStatsModal = useWritingStreakStore((state) => state.openStatsModal);
  const prefersReducedMotion = useReducedMotion();

  const progress = useMemo(() => getTodayProgress(), [getTodayProgress]);

  // Don't render if streak tracking is disabled
  if (!settings.enabled) {
    return null;
  }

  const isGoalMet = progress.goalMet;

  // Compact view - just show progress circle and count
  if (compact) {
    return (
      <button
        className={`writing-goal-progress writing-goal-progress-compact ${position} ${isGoalMet ? 'goal-met' : ''} ${className}`}
        onClick={openStatsModal}
        aria-label={`Daily writing goal: ${progress.wordCount} of ${progress.goal} words${isGoalMet ? ', goal completed!' : ''}`}
        title={`${progress.wordCount}/${progress.goal} words`}
      >
        <div className="writing-goal-circle">
          <svg viewBox="0 0 36 36" className="circular-progress">
            <path
              className="circle-bg"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <motion.path
              className="circle-progress"
              strokeDasharray={`${progress.percentage}, 100`}
              initial={{ strokeDasharray: '0, 100' }}
              animate={{ strokeDasharray: `${progress.percentage}, 100` }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="writing-goal-circle-text">
            {isGoalMet ? <CheckIcon size={12} /> : `${progress.percentage}%`}
          </span>
        </div>
      </button>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.button
        className={`writing-goal-progress ${position} ${isGoalMet ? 'goal-met' : ''} ${className}`}
        onClick={openStatsModal}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
        aria-label={`Daily writing goal: ${progress.wordCount} of ${progress.goal} words. ${progress.wordsRemaining} words remaining.${isGoalMet ? ' Goal completed!' : ''}`}
      >
        <div className="writing-goal-content">
          <div className="writing-goal-header">
            <WritingIcon size={16} />
            <span className="writing-goal-label">Daily Goal</span>
            {isGoalMet && (
              <motion.span
                className="writing-goal-badge"
                initial={prefersReducedMotion ? {} : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 25 }}
              >
                <CheckIcon size={10} />
              </motion.span>
            )}
          </div>

          <div className="writing-goal-stats">
            <span className="writing-goal-current">{progress.wordCount.toLocaleString()}</span>
            <span className="writing-goal-separator">/</span>
            <span className="writing-goal-target">{progress.goal.toLocaleString()}</span>
            <span className="writing-goal-unit">words</span>
          </div>

          <div className="writing-goal-bar-container">
            <div className="writing-goal-bar">
              <motion.div
                className="writing-goal-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {!isGoalMet && progress.wordsRemaining > 0 && (
            <div className="writing-goal-remaining">
              <span className="remaining-count">{progress.wordsRemaining.toLocaleString()}</span>
              <span className="remaining-label"> words to go</span>
            </div>
          )}

          {isGoalMet && (
            <motion.div
              className="writing-goal-complete"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.2 }}
            >
              Goal achieved!
            </motion.div>
          )}
        </div>
      </motion.button>
    </AnimatePresence>
  );
}
