/**
 * AnnotationButton Component
 *
 * A button that appears on block hover to add annotations.
 * Shows an indicator if the block already has annotations.
 */

import { useCallback, type MouseEvent } from 'react';
import './AnnotationButton.css';

interface AnnotationButtonProps {
  /** Unique identifier for the block */
  blockId: string;
  /** Whether this button is currently visible */
  isVisible: boolean;
  /** Whether this block already has annotations */
  hasAnnotation: boolean;
  /** Number of annotations on this block */
  annotationCount: number;
  /** Called when the button is clicked */
  onAddAnnotation: (blockId: string) => void;
  /** Called when clicking to view existing annotation */
  onViewAnnotation?: (blockId: string) => void;
}

export function AnnotationButton({
  blockId,
  isVisible,
  hasAnnotation,
  annotationCount,
  onAddAnnotation,
  onViewAnnotation,
}: AnnotationButtonProps) {
  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (hasAnnotation && onViewAnnotation) {
        onViewAnnotation(blockId);
      } else {
        onAddAnnotation(blockId);
      }
    },
    [blockId, hasAnnotation, onAddAnnotation, onViewAnnotation]
  );

  return (
    <button
      type="button"
      className={`annotation-button ${isVisible ? 'annotation-button-visible' : ''} ${
        hasAnnotation ? 'annotation-button-has-note' : ''
      }`}
      onClick={handleClick}
      aria-label={hasAnnotation ? `View ${annotationCount} note(s) on this block` : 'Add note to this block'}
      title={hasAnnotation ? `${annotationCount} note(s)` : 'Add note'}
    >
      {hasAnnotation ? (
        <>
          <svg
            className="annotation-button-icon annotation-button-icon-filled"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M3 2.5A1.5 1.5 0 014.5 1h5.586a1.5 1.5 0 011.06.44l2.415 2.414a1.5 1.5 0 01.439 1.06V12.5a1.5 1.5 0 01-1.5 1.5h-8A1.5 1.5 0 013 12.5v-10z" />
            <path d="M10 1v2.5A1.5 1.5 0 0011.5 5H14" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          {annotationCount > 1 && (
            <span className="annotation-button-count">{annotationCount}</span>
          )}
        </>
      ) : (
        <svg
          className="annotation-button-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          aria-hidden="true"
        >
          <path d="M4.5 2h5.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V12.5a1 1 0 01-1 1h-8a1 1 0 01-1-1v-10a1 1 0 011-1z" />
          <path d="M10 2v2.5a1 1 0 001 1h2.5" strokeLinecap="round" />
          <path d="M8 7v4M6 9h4" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

AnnotationButton.displayName = 'AnnotationButton';
