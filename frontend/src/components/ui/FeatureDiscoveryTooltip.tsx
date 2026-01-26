import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeatureDiscoveryStore, FEATURE_TOOLTIPS, type FeatureId } from '../../stores/featureDiscovery';
import './FeatureDiscoveryTooltip.css';

export interface FeatureDiscoveryTooltipProps {
  featureId: FeatureId;
  children: ReactNode;
  targetRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Wrapper component that triggers and displays a feature discovery tooltip
 * for a specific feature when it's first encountered.
 */
export function FeatureDiscoveryTooltip({
  featureId,
  children,
  targetRef,
}: FeatureDiscoveryTooltipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const activeTooltip = useFeatureDiscoveryStore((state) => state.activeTooltip);
  const dismissTooltip = useFeatureDiscoveryStore((state) => state.dismissTooltip);
  const closeActiveTooltip = useFeatureDiscoveryStore((state) => state.closeActiveTooltip);
  const dismissAllPermanently = useFeatureDiscoveryStore((state) => state.dismissAllPermanently);

  const isActive = activeTooltip === featureId;
  const config = FEATURE_TOOLTIPS[featureId];

  // Update tooltip position when active
  const updatePosition = useCallback(() => {
    const target = targetRef?.current || containerRef.current;
    const tooltip = tooltipRef.current;
    if (!target || !tooltip || !isActive) return;

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const offset = 12;

    let top = 0;
    let left = 0;
    let position = config.position;

    // Check if we need to flip position
    switch (config.position) {
      case 'top':
        if (targetRect.top - tooltipRect.height - offset < 0) {
          position = 'bottom';
        }
        break;
      case 'bottom':
        if (targetRect.bottom + tooltipRect.height + offset > viewportHeight) {
          position = 'top';
        }
        break;
      case 'left':
        if (targetRect.left - tooltipRect.width - offset < 0) {
          position = 'right';
        }
        break;
      case 'right':
        if (targetRect.right + tooltipRect.width + offset > viewportWidth) {
          position = 'left';
        }
        break;
    }

    // Calculate position based on adjusted placement
    switch (position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - offset;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + offset;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - offset;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + offset;
        break;
    }

    // Constrain within viewport
    left = Math.max(12, Math.min(left, viewportWidth - tooltipRect.width - 12));
    top = Math.max(12, Math.min(top, viewportHeight - tooltipRect.height - 12));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.dataset.position = position;
  }, [isActive, config.position, targetRef]);

  // Position updates
  useEffect(() => {
    if (!isActive) return;

    // Initial positioning (with small delay to allow render)
    const timer = setTimeout(updatePosition, 50);

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isActive, updatePosition]);

  // Close on escape key
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeActiveTooltip();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, closeActiveTooltip]);

  const handleDismiss = useCallback(() => {
    closeActiveTooltip();
  }, [closeActiveTooltip]);

  const handleDismissPermanently = useCallback(() => {
    dismissTooltip(featureId, true);
  }, [dismissTooltip, featureId]);

  const handleDismissAll = useCallback(() => {
    dismissAllPermanently();
  }, [dismissAllPermanently]);

  return (
    <>
      <div ref={containerRef} style={{ display: 'contents' }}>
        {children}
      </div>
      {isActive && createPortal(
        <AnimatePresence>
          <motion.div
            ref={tooltipRef}
            className="feature-discovery-tooltip"
            data-position={config.position}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-labelledby={`feature-tooltip-title-${featureId}`}
            aria-describedby={`feature-tooltip-desc-${featureId}`}
          >
            <div className="feature-discovery-tooltip-arrow" />
            <div className="feature-discovery-tooltip-content">
              <div className="feature-discovery-tooltip-header">
                <span className="feature-discovery-tooltip-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="8" cy="11" r="0.75" fill="currentColor" />
                  </svg>
                </span>
                <h3 id={`feature-tooltip-title-${featureId}`} className="feature-discovery-tooltip-title">
                  {config.title}
                </h3>
              </div>
              <p id={`feature-tooltip-desc-${featureId}`} className="feature-discovery-tooltip-description">
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
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

FeatureDiscoveryTooltip.displayName = 'FeatureDiscoveryTooltip';
