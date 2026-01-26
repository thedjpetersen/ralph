import { useEffect, useCallback } from 'react';
import { useTypewriterScroll, useTypewriterScrollStore } from '../stores/typewriterScroll';

/**
 * TypewriterScrollManager keeps the current line vertically centered
 * as the user types, so their eyes never have to chase the cursor.
 *
 * Features:
 * - Current line stays at vertical center of the viewport
 * - Smooth scroll animation as you type
 * - Works during all editing operations
 * - Can be combined with paragraph focus mode
 */
export function TypewriterScrollManager() {
  const { isEnabled, targetElement } = useTypewriterScroll();
  const { scrollToCurrentLine } = useTypewriterScrollStore();

  // Handle cursor position changes
  const handleCursorChange = useCallback(() => {
    if (isEnabled) {
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        scrollToCurrentLine();
      });
    }
  }, [isEnabled, scrollToCurrentLine]);

  // Track cursor position changes to scroll to current line
  useEffect(() => {
    if (!isEnabled || !targetElement) return;

    // Listen for various events that can change cursor position
    targetElement.addEventListener('keyup', handleCursorChange);
    targetElement.addEventListener('click', handleCursorChange);
    targetElement.addEventListener('input', handleCursorChange);
    targetElement.addEventListener('select', handleCursorChange);
    targetElement.addEventListener('focus', handleCursorChange);

    // Initial scroll when enabled
    handleCursorChange();

    return () => {
      targetElement.removeEventListener('keyup', handleCursorChange);
      targetElement.removeEventListener('click', handleCursorChange);
      targetElement.removeEventListener('input', handleCursorChange);
      targetElement.removeEventListener('select', handleCursorChange);
      targetElement.removeEventListener('focus', handleCursorChange);
    };
  }, [isEnabled, targetElement, handleCursorChange]);

  // Don't render anything - this is a behavior-only component
  if (!isEnabled) {
    return null;
  }

  return (
    <>
      {/* Screen reader announcement */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Typewriter scroll mode active. Press Cmd+Shift+T to disable.
      </div>
    </>
  );
}

TypewriterScrollManager.displayName = 'TypewriterScrollManager';
