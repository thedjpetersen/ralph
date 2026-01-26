import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { useCommentHighlight, useCommentHighlightStore, hexToRgba } from '../stores/commentHighlight';
import './CommentHighlightOverlay.css';

/**
 * CommentHighlightOverlay displays a highlight over text that a comment refers to.
 * It follows the same pattern as GhostRewritePreview for consistent behavior.
 *
 * Features:
 * - Highlights text when hovering/clicking a comment
 * - Allows clicking highlighted text to show the comment
 * - Fades out after 2 seconds
 * - Uses author-specific colors
 */
export function CommentHighlightOverlay() {
  const { activeHighlight } = useCommentHighlight();
  const { clearHighlight, startFade, focusComment } = useCommentHighlightStore();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(1);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetElement = activeHighlight?.targetElement || null;

  // Calculate position using useMemo
  const position = useMemo(() => {
    if (!targetElement || !activeHighlight) {
      return null;
    }
    const rect = targetElement.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  }, [targetElement, activeHighlight]);

  // Subscribe to resize/scroll events to trigger re-render
  const getSnapshot = useCallback(() => {
    if (!targetElement) return '';
    const rect = targetElement.getBoundingClientRect();
    return `${rect.top},${rect.left},${rect.width},${rect.height},${window.scrollY},${window.scrollX}`;
  }, [targetElement]);

  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('resize', callback);
    window.addEventListener('scroll', callback);
    return () => {
      window.removeEventListener('resize', callback);
      window.removeEventListener('scroll', callback);
    };
  }, []);

  // This subscribes to resize/scroll and triggers re-renders when position changes
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Sync scroll position with target element
  useEffect(() => {
    if (!targetElement || !overlayRef.current) return;

    const syncScroll = () => {
      if (overlayRef.current) {
        overlayRef.current.scrollTop = targetElement.scrollTop;
        overlayRef.current.scrollLeft = targetElement.scrollLeft;
      }
    };

    syncScroll();
    targetElement.addEventListener('scroll', syncScroll);

    return () => {
      targetElement.removeEventListener('scroll', syncScroll);
    };
  }, [targetElement]);

  // Track highlight id to detect changes
  const lastHighlightIdRef = useRef<string | null>(null);

  // Handle fade animation after 2 seconds
  useEffect(() => {
    // Clear any existing timeouts
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    if (!activeHighlight) {
      lastHighlightIdRef.current = null;
      return;
    }

    // Reset opacity when highlight changes (using timeout to avoid synchronous setState in effect)
    if (activeHighlight.commentId !== lastHighlightIdRef.current) {
      lastHighlightIdRef.current = activeHighlight.commentId;
      // Use microtask to reset opacity, avoiding the lint rule for synchronous setState
      queueMicrotask(() => setOpacity(1));
    }

    // Start fade after 2 seconds
    fadeTimeoutRef.current = setTimeout(() => {
      startFade();

      // Animate opacity from 1 to 0 over 500ms
      const startTime = Date.now();
      const duration = 500;

      fadeIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const newOpacity = 1 - progress;

        setOpacity(newOpacity);

        if (progress >= 1) {
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
          clearHighlight();
        }
      }, 16); // ~60fps
    }, 2000);

    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    };
  }, [activeHighlight, clearHighlight, startFade]);

  // Handle click on highlighted text to show comment
  const handleClick = useCallback(() => {
    if (activeHighlight) {
      focusComment(activeHighlight.commentId);
    }
  }, [activeHighlight, focusComment]);

  // Don't render if no active highlight
  if (!activeHighlight || !position || !targetElement) {
    return null;
  }

  // Get text segments
  const fullText = targetElement.value;
  const beforeText = fullText.slice(0, activeHighlight.textRange.startIndex);
  const highlightedText = fullText.slice(
    activeHighlight.textRange.startIndex,
    activeHighlight.textRange.endIndex
  );
  const afterText = fullText.slice(activeHighlight.textRange.endIndex);

  // Get computed styles from target element
  const computedStyles = window.getComputedStyle(targetElement);

  // Generate highlight colors
  const highlightBgColor = hexToRgba(activeHighlight.color, 0.2);
  const highlightBorderColor = hexToRgba(activeHighlight.color, 0.5);

  return (
    <div
      ref={overlayRef}
      className="comment-highlight-overlay"
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
        opacity: opacity,
      }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      aria-label={`Highlighted text for comment. Click to view comment.`}
    >
      <span className="comment-highlight-before">{beforeText}</span>
      <span
        className="comment-highlight-text"
        style={{
          backgroundColor: highlightBgColor,
          borderBottom: `2px solid ${highlightBorderColor}`,
          '--highlight-color': activeHighlight.color,
        } as React.CSSProperties}
      >
        {highlightedText}
      </span>
      <span className="comment-highlight-after">{afterText}</span>
    </div>
  );
}

CommentHighlightOverlay.displayName = 'CommentHighlightOverlay';
