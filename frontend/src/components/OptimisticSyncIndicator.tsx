import { useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSyncStatus, useActiveMutationCount } from '../stores/optimistic';
import './OptimisticSyncIndicator.css';

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

export interface OptimisticSyncIndicatorProps {
  /** Position of the indicator */
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  /** Whether to show the indicator inline (no fixed positioning) */
  inline?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * A subtle indicator that shows when optimistic mutations are syncing with the server.
 * Shows a small animated dot when syncing, and briefly shows an error state on failure.
 */
export function OptimisticSyncIndicator({
  position = 'bottom-right',
  inline = false,
  className = '',
}: OptimisticSyncIndicatorProps) {
  const syncStatus = useSyncStatus();
  const activeMutationCount = useActiveMutationCount();
  const prefersReducedMotion = useReducedMotion();

  const isVisible = syncStatus !== 'idle';

  const getStatusLabel = () => {
    switch (syncStatus) {
      case 'syncing':
        return activeMutationCount > 1
          ? `Saving ${activeMutationCount} changes...`
          : 'Saving...';
      case 'error':
        return 'Sync error';
      default:
        return '';
    }
  };

  const getAriaLabel = () => {
    switch (syncStatus) {
      case 'syncing':
        return `Syncing with server. ${activeMutationCount} pending operations.`;
      case 'error':
        return 'Sync error occurred. Changes may not be saved.';
      default:
        return 'Sync status idle';
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          className={`optimistic-sync-indicator ${inline ? 'inline' : position} ${className}`}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15 }}
          role="status"
          aria-live="polite"
          aria-label={getAriaLabel()}
        >
          <div className={`sync-indicator-content ${syncStatus}`}>
            {syncStatus === 'syncing' && (
              <span
                className={`sync-spinner ${prefersReducedMotion ? 'no-animation' : ''}`}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </span>
            )}
            {syncStatus === 'error' && (
              <span className="sync-error-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
            <span className="sync-label">{getStatusLabel()}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Minimal version - just shows a small dot indicator
 */
export function OptimisticSyncDot({ className = '' }: { className?: string }) {
  const syncStatus = useSyncStatus();
  const prefersReducedMotion = useReducedMotion();

  if (syncStatus === 'idle') {
    return null;
  }

  return (
    <span
      className={`optimistic-sync-dot ${syncStatus} ${prefersReducedMotion ? 'no-animation' : ''} ${className}`}
      role="status"
      aria-label={syncStatus === 'syncing' ? 'Syncing changes' : 'Sync error'}
    />
  );
}
