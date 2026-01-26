import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useSyncExternalStore } from 'react';
import { useParagraphFocus, getParagraphBoundaries, useParagraphFocusStore } from '../stores/paragraphFocus';
import './ParagraphFocusOverlay.css';

/**
 * ParagraphFocusOverlay dims non-active paragraphs to help focus on
 * the current paragraph being written.
 *
 * Features:
 * - Current paragraph has full opacity
 * - Non-active paragraphs dim to 30% opacity
 * - Smooth 200ms transition as cursor moves
 * - Compatible with zen mode
 */
export function ParagraphFocusOverlay() {
  const { isEnabled, targetElement, currentParagraphIndex } = useParagraphFocus();
  const { updateCurrentParagraph } = useParagraphFocusStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate position using useMemo
  const position = useMemo(() => {
    if (!targetElement) {
      return null;
    }
    const rect = targetElement.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  }, [targetElement]);

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

  // Track cursor position changes to update current paragraph
  useEffect(() => {
    if (!isEnabled || !targetElement) return;

    const handleCursorChange = () => {
      updateCurrentParagraph();
    };

    // Listen for various events that can change cursor position
    targetElement.addEventListener('keyup', handleCursorChange);
    targetElement.addEventListener('click', handleCursorChange);
    targetElement.addEventListener('input', handleCursorChange);
    targetElement.addEventListener('select', handleCursorChange);

    // Initial update
    handleCursorChange();

    return () => {
      targetElement.removeEventListener('keyup', handleCursorChange);
      targetElement.removeEventListener('click', handleCursorChange);
      targetElement.removeEventListener('input', handleCursorChange);
      targetElement.removeEventListener('select', handleCursorChange);
    };
  }, [isEnabled, targetElement, updateCurrentParagraph]);

  // Don't render if not enabled or no target element
  if (!isEnabled || !position || !targetElement) {
    return null;
  }

  // Get text and paragraph boundaries
  const fullText = targetElement.value;
  const paragraphs = getParagraphBoundaries(fullText);

  // Get computed styles from target element
  const computedStyles = window.getComputedStyle(targetElement);

  return (
    <>
      <div
        ref={overlayRef}
        className="paragraph-focus-overlay"
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
        }}
        aria-hidden="true"
      >
        {paragraphs.map((paragraph, index) => {
          const text = fullText.slice(paragraph.start, paragraph.end);
          const isActive = index === currentParagraphIndex;

          return (
            <span
              key={`paragraph-${index}`}
              className={`paragraph-focus-line ${isActive ? 'active' : 'dimmed'}`}
            >
              {text || '\u200B'}{/* Use zero-width space for empty lines */}
            </span>
          );
        })}
      </div>

      {/* Screen reader announcement */}
      <div className="paragraph-focus-sr-only" role="status" aria-live="polite">
        Paragraph focus mode active. Press Cmd+Shift+F to disable.
      </div>
    </>
  );
}

ParagraphFocusOverlay.displayName = 'ParagraphFocusOverlay';
