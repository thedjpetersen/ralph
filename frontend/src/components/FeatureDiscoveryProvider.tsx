import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useFeatureDiscovery,
  FEATURE_TOOLTIPS,
} from '../stores/featureDiscovery';
import { useFormattingToolbarStore } from '../stores/formattingToolbar';
import { useCommandPaletteStore } from '../stores/commandPalette';
import { useCommentHighlightStore } from '../stores/commentHighlight';
import './FeatureDiscoveryProvider.css';

interface FeatureDiscoveryProviderProps {
  children: ReactNode;
}

interface TooltipPosition {
  top: number;
  left: number;
}

/**
 * Calculate tooltip position based on target position and feature config
 */
function calculateTooltipPosition(
  activeTooltip: string,
  targetPosition: { top: number; left: number; width: number; height: number }
): TooltipPosition {
  const config = FEATURE_TOOLTIPS[activeTooltip as keyof typeof FEATURE_TOOLTIPS];
  const offset = 16;
  const tooltipWidth = 320;
  const tooltipHeight = 180;

  let top = 0;
  let left = 0;

  switch (config.position) {
    case 'top':
      top = targetPosition.top - tooltipHeight - offset;
      left = targetPosition.left - tooltipWidth / 2;
      break;
    case 'bottom':
      top = targetPosition.top + targetPosition.height + offset;
      left = targetPosition.left - tooltipWidth / 2;
      break;
    case 'left':
      top = targetPosition.top - tooltipHeight / 2 + targetPosition.height / 2;
      left = targetPosition.left - tooltipWidth - offset;
      break;
    case 'right':
      top = targetPosition.top - tooltipHeight / 2 + targetPosition.height / 2;
      left = targetPosition.left + targetPosition.width + offset;
      break;
  }

  // Constrain within viewport
  left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
  top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

  return { top, left };
}

/**
 * Provider component that handles feature discovery tooltip triggers.
 * Wraps the application and listens for first-time feature usage.
 */
export function FeatureDiscoveryProvider({ children }: FeatureDiscoveryProviderProps) {
  const { activeTooltip, triggerTooltip, closeActiveTooltip, dismissTooltip, dismissAllPermanently } = useFeatureDiscovery();
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Use state for tooltip position so we don't access refs during render
  const [tooltipStyle, setTooltipStyle] = useState<TooltipPosition>({ top: 0, left: 0 });

  // Track previous state to detect changes
  const prevFormattingToolbarActiveRef = useRef(false);
  const prevCommandPaletteOpenRef = useRef(false);
  const prevCommentsCountRef = useRef(0);

  // Subscribe to formatting toolbar state (text selection)
  useEffect(() => {
    const unsubscribe = useFormattingToolbarStore.subscribe((state) => {
      const wasActive = prevFormattingToolbarActiveRef.current;
      prevFormattingToolbarActiveRef.current = state.isActive;

      // Trigger on first text selection (toolbar becomes active)
      if (state.isActive && !wasActive && state.toolbarPosition) {
        // Store position for tooltip placement
        const targetPosition = {
          top: state.toolbarPosition.top,
          left: state.toolbarPosition.left,
          width: 200,
          height: 40,
        };

        // Small delay to let the formatting toolbar render first
        setTimeout(() => {
          const triggered = triggerTooltip('first-text-selection');
          if (triggered) {
            setTooltipStyle(calculateTooltipPosition('first-text-selection', targetPosition));
          }
        }, 300);
      }
    });

    return unsubscribe;
  }, [triggerTooltip]);

  // Subscribe to command palette state (slash command / Cmd+K)
  useEffect(() => {
    const unsubscribe = useCommandPaletteStore.subscribe((state) => {
      const wasOpen = prevCommandPaletteOpenRef.current;
      prevCommandPaletteOpenRef.current = state.isOpen;

      // Trigger on first command palette open
      if (state.isOpen && !wasOpen) {
        // Position near center of screen where palette appears
        const targetPosition = {
          top: 150,
          left: window.innerWidth / 2,
          width: 400,
          height: 50,
        };

        // Small delay to let the command palette render first
        setTimeout(() => {
          const triggered = triggerTooltip('first-slash-command');
          if (triggered) {
            setTooltipStyle(calculateTooltipPosition('first-slash-command', targetPosition));
          }
        }, 300);
      }
    });

    return unsubscribe;
  }, [triggerTooltip]);

  // Subscribe to comment highlight state (AI comments)
  useEffect(() => {
    const unsubscribe = useCommentHighlightStore.subscribe((state) => {
      const prevCount = prevCommentsCountRef.current;
      const currentCount = state.commentRanges.size;
      prevCommentsCountRef.current = currentCount;

      // Trigger on first comment added
      if (currentCount > 0 && prevCount === 0) {
        // Position on right side where comments panel typically is
        const targetPosition = {
          top: 200,
          left: window.innerWidth - 300,
          width: 250,
          height: 100,
        };

        // Small delay to let the comment render
        setTimeout(() => {
          const triggered = triggerTooltip('first-ai-comment');
          if (triggered) {
            setTooltipStyle(calculateTooltipPosition('first-ai-comment', targetPosition));
          }
        }, 500);
      }
    });

    return unsubscribe;
  }, [triggerTooltip]);

  // Handle escape key to close tooltip
  useEffect(() => {
    if (!activeTooltip) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeActiveTooltip();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTooltip, closeActiveTooltip]);

  const handleDismiss = () => {
    closeActiveTooltip();
  };

  const handleDismissPermanently = () => {
    if (activeTooltip) {
      dismissTooltip(activeTooltip, true);
    }
  };

  const handleDismissAll = () => {
    dismissAllPermanently();
  };

  const config = activeTooltip ? FEATURE_TOOLTIPS[activeTooltip] : null;

  return (
    <>
      {children}
      {createPortal(
        <AnimatePresence>
          {activeTooltip && config && (
            <motion.div
              ref={tooltipRef}
              className="feature-discovery-tooltip"
              style={{
                top: tooltipStyle.top,
                left: tooltipStyle.left,
              }}
              data-position={config.position}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              role="dialog"
              aria-labelledby={`feature-tooltip-title-${activeTooltip}`}
              aria-describedby={`feature-tooltip-desc-${activeTooltip}`}
            >
              <div className="feature-discovery-tooltip-arrow" />
              <div className="feature-discovery-tooltip-content">
                <div className="feature-discovery-tooltip-header">
                  <span className="feature-discovery-tooltip-icon">
                    {activeTooltip === 'first-ai-comment' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    )}
                    {activeTooltip === 'first-text-selection' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                      </svg>
                    )}
                    {activeTooltip === 'first-slash-command' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                    )}
                  </span>
                  <h3 id={`feature-tooltip-title-${activeTooltip}`} className="feature-discovery-tooltip-title">
                    {config.title}
                  </h3>
                </div>
                <p id={`feature-tooltip-desc-${activeTooltip}`} className="feature-discovery-tooltip-description">
                  {config.description}
                </p>
                <div className="feature-discovery-tooltip-actions">
                  <button
                    type="button"
                    className="feature-discovery-tooltip-btn feature-discovery-tooltip-btn-primary"
                    onClick={handleDismiss}
                  >
                    Got it
                  </button>
                  <button
                    type="button"
                    className="feature-discovery-tooltip-btn feature-discovery-tooltip-btn-secondary"
                    onClick={handleDismissPermanently}
                  >
                    Don&apos;t show again
                  </button>
                </div>
                <button
                  type="button"
                  className="feature-discovery-tooltip-dismiss-all"
                  onClick={handleDismissAll}
                >
                  Turn off all tips
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

FeatureDiscoveryProvider.displayName = 'FeatureDiscoveryProvider';
