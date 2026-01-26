/**
 * BlockWrapper Component
 *
 * Wraps a content block with drag handle and drop zone functionality.
 * Handles hover state, drag events, and drop target indicators.
 */

import {
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type DragEvent,
} from 'react';
import { DragHandle } from './DragHandle';
import { DropIndicator } from './DropIndicator';
import type { BlockType } from '../stores/blockDrag';
import './BlockWrapper.css';

interface BlockWrapperProps {
  /** Unique identifier for the block */
  blockId: string;
  /** Index of the block in the blocks array */
  blockIndex: number;
  /** Type of block for styling purposes */
  blockType: BlockType;
  /** Content to render inside the wrapper */
  children: ReactNode;
  /** Whether this block is currently being dragged */
  isDragging: boolean;
  /** Whether any drag operation is in progress */
  isAnyDragging: boolean;
  /** Index of the block being dragged */
  draggedBlockIndex: number | null;
  /** Called when drag starts on this block */
  onDragStart: (blockId: string, blockIndex: number) => void;
  /** Called when drag ends */
  onDragEnd: () => void;
  /** Called when something is dragged over this block */
  onDragOver: (blockIndex: number, position: 'before' | 'after') => void;
  /** Called when drag leaves this block */
  onDragLeave: () => void;
  /** Called when something is dropped on this block */
  onDrop: (targetIndex: number, position: 'before' | 'after') => void;
  /** Whether the drop indicator should show before this block */
  showDropBefore: boolean;
  /** Whether the drop indicator should show after this block */
  showDropAfter: boolean;
}

export function BlockWrapper({
  blockId,
  blockIndex,
  blockType,
  children,
  isDragging,
  isAnyDragging,
  draggedBlockIndex,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  showDropBefore,
  showDropAfter,
}: BlockWrapperProps) {
  const [isHovered, setIsHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!isAnyDragging) {
      setIsHovered(true);
    }
  }, [isAnyDragging]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't show drop indicator on the dragged block itself
      if (draggedBlockIndex === blockIndex) {
        return;
      }

      // Determine drop position based on mouse position within the block
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';

      onDragOver(blockIndex, position);
    },
    [blockIndex, draggedBlockIndex, onDragOver]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onDragLeave();
    },
    [onDragLeave]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't drop on the same block
      if (draggedBlockIndex === blockIndex) {
        return;
      }

      // Determine drop position
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';

      onDrop(blockIndex, position);
    },
    [blockIndex, draggedBlockIndex, onDrop]
  );

  const showHandle = isHovered || isDragging;

  return (
    <div
      ref={wrapperRef}
      className={`block-wrapper ${isDragging ? 'block-wrapper-dragging' : ''} ${
        isAnyDragging && !isDragging ? 'block-wrapper-drag-active' : ''
      } block-wrapper-${blockType}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-block-id={blockId}
      data-block-index={blockIndex}
    >
      {showDropBefore && <DropIndicator position="before" />}

      <DragHandle
        blockId={blockId}
        blockIndex={blockIndex}
        isVisible={showHandle}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />

      <div className="block-wrapper-content">
        {children}
      </div>

      {showDropAfter && <DropIndicator position="after" />}
    </div>
  );
}

BlockWrapper.displayName = 'BlockWrapper';
