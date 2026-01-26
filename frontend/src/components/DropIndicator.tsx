/**
 * DropIndicator Component
 *
 * Visual indicator showing where a dragged block will be dropped.
 * Displays as a horizontal line with a dot at the start.
 */

import './DropIndicator.css';

interface DropIndicatorProps {
  /** Position of the indicator relative to the block */
  position: 'before' | 'after';
}

export function DropIndicator({ position }: DropIndicatorProps) {
  return (
    <div
      className={`drop-indicator drop-indicator-${position}`}
      aria-hidden="true"
    >
      <div className="drop-indicator-dot" />
      <div className="drop-indicator-line" />
    </div>
  );
}

DropIndicator.displayName = 'DropIndicator';
