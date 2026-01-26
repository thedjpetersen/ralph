/**
 * DragHandle Component
 *
 * A draggable handle that appears on the left side of blocks when hovered.
 * Used to reorder blocks via drag-and-drop.
 */

import { useCallback, type DragEvent, type MouseEvent } from 'react';
import './DragHandle.css';

interface DragHandleProps {
  /** Unique identifier for the block */
  blockId: string;
  /** Index of the block in the blocks array */
  blockIndex: number;
  /** Whether this handle is currently visible */
  isVisible: boolean;
  /** Called when drag starts */
  onDragStart: (blockId: string, blockIndex: number) => void;
  /** Called when drag ends */
  onDragEnd: () => void;
}

export function DragHandle({
  blockId,
  blockIndex,
  isVisible,
  onDragStart,
  onDragEnd,
}: DragHandleProps) {
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLButtonElement>) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', blockId);
      e.dataTransfer.setData('application/x-block-id', blockId);
      e.dataTransfer.setData('application/x-block-index', blockIndex.toString());
      onDragStart(blockId, blockIndex);
    },
    [blockId, blockIndex, onDragStart]
  );

  const handleDragEnd = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  // Prevent click from propagating to parent
  const handleClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return (
    <button
      type="button"
      className={`drag-handle ${isVisible ? 'drag-handle-visible' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      aria-label={`Drag to reorder block ${blockIndex + 1}`}
      title="Drag to reorder"
    >
      <svg
        className="drag-handle-icon"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        {/* Six dot grip icon */}
        <circle cx="5" cy="3" r="1.5" />
        <circle cx="11" cy="3" r="1.5" />
        <circle cx="5" cy="8" r="1.5" />
        <circle cx="11" cy="8" r="1.5" />
        <circle cx="5" cy="13" r="1.5" />
        <circle cx="11" cy="13" r="1.5" />
      </svg>
    </button>
  );
}

DragHandle.displayName = 'DragHandle';
