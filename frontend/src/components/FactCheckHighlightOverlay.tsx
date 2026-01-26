/**
 * FactCheckHighlightOverlay
 *
 * Displays subtle highlights on factual claims in the document when
 * fact-checking mode is enabled. Shows a hover tooltip with confidence
 * scores and suggested verification sources.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useAIFactChecking,
  useAIFactCheckingStore,
  getStatusColor,
  getStatusLabel,
  getClaimCategoryLabel,
  type FactCheckItem,
} from '../stores/aiFactChecking';
import './FactCheckHighlightOverlay.css';

interface TooltipPosition {
  x: number;
  y: number;
}

interface HighlightSegment {
  claim: FactCheckItem;
  startInView: number;
  endInView: number;
}

/**
 * Hook to find the active textarea/contenteditable element
 */
function useActiveTextArea() {
  const [textArea, setTextArea] = useState<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    // Find the main editor textarea
    const findTextArea = () => {
      // Try to find the document editor textarea
      const ta = document.querySelector<HTMLTextAreaElement>(
        'textarea.document-editor-textarea, textarea[data-editor], .editor-content textarea'
      );
      if (ta) {
        setTextArea(ta);
        return;
      }

      // Fallback: find any focused or large textarea
      const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea');
      for (const el of textareas) {
        if (el.offsetHeight > 100) {
          setTextArea(el);
          return;
        }
      }

      setTextArea(null);
    };

    findTextArea();

    // Observe DOM changes to detect when textarea appears
    const observer = new MutationObserver(findTextArea);
    observer.observe(document.body, { childList: true, subtree: true });

    // Also check on focus changes
    document.addEventListener('focusin', findTextArea);

    return () => {
      observer.disconnect();
      document.removeEventListener('focusin', findTextArea);
    };
  }, []);

  return textArea;
}

/**
 * Convert a hex color to rgba with alpha
 */
function hexToRgba(hex: string, alpha: number): string {
  // Handle CSS variables by returning a fallback
  if (hex.startsWith('var(')) {
    return `rgba(59, 130, 246, ${alpha})`; // Default blue
  }

  // Remove # if present
  hex = hex.replace('#', '');

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * ClaimTooltip shows details when hovering over a highlighted claim
 */
function ClaimTooltip({
  claim,
  position,
  onDismiss,
}: {
  claim: FactCheckItem;
  position: TooltipPosition;
  onDismiss: () => void;
}) {
  const statusColor = getStatusColor(claim.status);

  return (
    <motion.div
      className="factcheck-tooltip"
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      style={{
        left: position.x,
        top: position.y,
      }}
      role="tooltip"
    >
      <div className="factcheck-tooltip-header">
        <span className="factcheck-tooltip-category">
          {getClaimCategoryLabel(claim.category)}
        </span>
        <span
          className="factcheck-tooltip-status"
          style={{ color: statusColor }}
        >
          {getStatusLabel(claim.status)}
        </span>
      </div>

      <div className="factcheck-tooltip-confidence">
        <div className="factcheck-tooltip-confidence-bar">
          <div
            className="factcheck-tooltip-confidence-fill"
            style={{
              width: `${claim.confidence}%`,
              backgroundColor: statusColor,
            }}
          />
        </div>
        <span className="factcheck-tooltip-confidence-label">
          {claim.confidence}% confidence
        </span>
      </div>

      <p className="factcheck-tooltip-explanation">{claim.explanation}</p>

      <div className="factcheck-tooltip-sources">
        <span className="factcheck-tooltip-sources-label">Verify with:</span>
        <div className="factcheck-tooltip-sources-list">
          {claim.sources.slice(0, 3).map((source, i) => (
            <span key={i} className="factcheck-tooltip-source">
              {source}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="factcheck-tooltip-dismiss"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        Dismiss
      </button>
    </motion.div>
  );
}

export function FactCheckHighlightOverlay() {
  const { analysis, isFactCheckingEnabled, hoveredClaimId } = useAIFactChecking();
  const { hoverClaim, dismissClaim, selectClaim } = useAIFactCheckingStore();

  const overlayRef = useRef<HTMLDivElement>(null);
  const textArea = useActiveTextArea();
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

  // Get the text content from the textarea
  const textContent = textArea?.value || '';

  // Subscribe to resize/scroll events to trigger re-render
  const getSnapshot = useCallback(() => {
    if (!textArea) return '';
    const rect = textArea.getBoundingClientRect();
    return `${rect.top},${rect.left},${rect.width},${rect.height},${window.scrollY},${window.scrollX},${textArea.scrollTop}`;
  }, [textArea]);

  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('resize', callback);
    window.addEventListener('scroll', callback);
    if (textArea) {
      textArea.addEventListener('scroll', callback);
    }
    return () => {
      window.removeEventListener('resize', callback);
      window.removeEventListener('scroll', callback);
      if (textArea) {
        textArea.removeEventListener('scroll', callback);
      }
    };
  }, [textArea]);

  // Trigger re-renders when position changes
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Calculate position
  const position = useMemo(() => {
    if (!textArea) return null;
    const rect = textArea.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  }, [textArea]);

  // Get active (non-dismissed) claims that match the current text
  const activeHighlights = useMemo<HighlightSegment[]>(() => {
    if (!analysis || !isFactCheckingEnabled || !textContent) return [];

    return analysis.claims
      .filter((claim) => !claim.isDismissed)
      .filter((claim) => {
        // Verify the claim text exists at the expected position
        const textAtPosition = textContent.slice(claim.startIndex, claim.endIndex);
        return textAtPosition === claim.text;
      })
      .map((claim) => ({
        claim,
        startInView: claim.startIndex,
        endInView: claim.endIndex,
      }));
  }, [analysis, isFactCheckingEnabled, textContent]);

  // Handle mouse move for hover tracking
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!textArea || !overlayRef.current) return;

      // Find which highlight we're over (if any)
      for (const segment of activeHighlights) {
        const highlightEl = overlayRef.current.querySelector(
          `[data-claim-id="${segment.claim.id}"]`
        );
        if (highlightEl) {
          const highlightRect = highlightEl.getBoundingClientRect();
          if (
            e.clientX >= highlightRect.left &&
            e.clientX <= highlightRect.right &&
            e.clientY >= highlightRect.top &&
            e.clientY <= highlightRect.bottom
          ) {
            hoverClaim(segment.claim.id);
            setTooltipPosition({
              x: e.clientX + 10,
              y: e.clientY + 10,
            });
            return;
          }
        }
      }

      // Not over any highlight
      if (hoveredClaimId) {
        hoverClaim(null);
        setTooltipPosition(null);
      }
    },
    [textArea, activeHighlights, hoverClaim, hoveredClaimId]
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    hoverClaim(null);
    setTooltipPosition(null);
  }, [hoverClaim]);

  // Handle click on highlight
  const handleHighlightClick = useCallback(
    (claimId: string) => {
      selectClaim(claimId);
    },
    [selectClaim]
  );

  // Handle dismiss from tooltip
  const handleDismiss = useCallback(() => {
    if (hoveredClaimId) {
      dismissClaim(hoveredClaimId);
      hoverClaim(null);
      setTooltipPosition(null);
    }
  }, [hoveredClaimId, dismissClaim, hoverClaim]);

  // Get the hovered claim
  const hoveredClaim = useMemo(() => {
    if (!hoveredClaimId || !analysis) return null;
    return analysis.claims.find((c) => c.id === hoveredClaimId) || null;
  }, [hoveredClaimId, analysis]);

  // Don't render if fact-checking is disabled or no highlights
  if (!isFactCheckingEnabled || !position || !textArea || activeHighlights.length === 0) {
    return null;
  }

  // Get computed styles from target element
  const computedStyles = window.getComputedStyle(textArea);

  // Build the text with highlights
  const renderHighlightedText = () => {
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    // Sort highlights by start position
    const sortedHighlights = [...activeHighlights].sort(
      (a, b) => a.startInView - b.startInView
    );

    for (const segment of sortedHighlights) {
      // Add text before this highlight
      if (segment.startInView > lastIndex) {
        segments.push(
          <span key={`text-${lastIndex}`} className="factcheck-highlight-normal">
            {textContent.slice(lastIndex, segment.startInView)}
          </span>
        );
      }

      // Add the highlighted text
      const statusColor = getStatusColor(segment.claim.status);
      const isHovered = hoveredClaimId === segment.claim.id;

      segments.push(
        <span
          key={segment.claim.id}
          data-claim-id={segment.claim.id}
          className={`factcheck-highlight-claim ${isHovered ? 'hovered' : ''}`}
          style={{
            backgroundColor: hexToRgba(statusColor, isHovered ? 0.3 : 0.15),
            borderBottomColor: statusColor,
          }}
          onClick={() => handleHighlightClick(segment.claim.id)}
          onMouseEnter={() => {
            hoverClaim(segment.claim.id);
          }}
          role="button"
          tabIndex={0}
          aria-label={`Factual claim: ${getClaimCategoryLabel(segment.claim.category)}. ${segment.claim.confidence}% confidence. Click to see details.`}
        >
          {textContent.slice(segment.startInView, segment.endInView)}
        </span>
      );

      lastIndex = segment.endInView;
    }

    // Add remaining text
    if (lastIndex < textContent.length) {
      segments.push(
        <span key={`text-${lastIndex}`} className="factcheck-highlight-normal">
          {textContent.slice(lastIndex)}
        </span>
      );
    }

    return segments;
  };

  return (
    <>
      <div
        ref={overlayRef}
        className="factcheck-highlight-overlay"
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
          height: position.height,
          padding: computedStyles.padding,
          fontFamily: computedStyles.fontFamily,
          fontSize: computedStyles.fontSize,
          lineHeight: computedStyles.lineHeight,
          letterSpacing: computedStyles.letterSpacing,
          textAlign: computedStyles.textAlign as 'left' | 'right' | 'center' | 'justify',
          borderRadius: computedStyles.borderRadius,
          transform: `translateY(-${textArea.scrollTop}px)`,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-hidden="true"
      >
        {renderHighlightedText()}
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredClaim && tooltipPosition && (
          <ClaimTooltip
            claim={hoveredClaim}
            position={tooltipPosition}
            onDismiss={handleDismiss}
          />
        )}
      </AnimatePresence>
    </>
  );
}

FactCheckHighlightOverlay.displayName = 'FactCheckHighlightOverlay';
