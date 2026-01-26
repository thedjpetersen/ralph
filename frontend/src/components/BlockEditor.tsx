/**
 * BlockEditor Component
 *
 * Renders markdown content as draggable blocks that can be reordered.
 * Combines block parsing, drag-and-drop, and undo functionality.
 */

import {
  useMemo,
  useCallback,
  useEffect,
  createElement,
  type DragEvent,
} from 'react';
import { BlockWrapper } from './BlockWrapper';
import { MarkdownPreview } from './MarkdownPreview';
import {
  useBlockDragStore,
  parseBlocks,
  selectIsDragging,
  selectDraggedBlockIndex,
  selectDropTargetIndex,
  selectDropPosition,
  type Block,
  type BlockType,
} from '../stores/blockDrag';
import './BlockEditor.css';

interface BlockEditorProps {
  /** The markdown content to render as blocks */
  content: string;
  /** Called when content changes due to block reordering */
  onChange: (content: string) => void;
  /** Additional CSS class name */
  className?: string;
  /** Whether block dragging is enabled */
  enableDrag?: boolean;
}

/**
 * Render a single block's content based on its type
 */
function renderBlockContent(block: Block): React.ReactNode {
  switch (block.type) {
    case 'code':
      return <MarkdownPreview content={block.content} />;

    case 'heading': {
      // Parse heading level and render appropriately
      const headingMatch = block.content.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        return createElement(`h${level}`, { className: 'block-editor-heading' }, text);
      }
      return <span className="block-editor-text">{block.content}</span>;
    }

    case 'list':
      // Render as markdown preview to handle list formatting
      return <MarkdownPreview content={block.content} />;

    case 'blockquote':
      return <MarkdownPreview content={block.content} />;

    case 'image': {
      // Parse image markdown and render
      const imageMatch = block.content.match(/^!\[(.*)\]\((.+)\)$/);
      if (imageMatch) {
        const alt = imageMatch[1];
        const src = imageMatch[2];
        return (
          <img
            src={src}
            alt={alt}
            className="block-editor-image"
            loading="lazy"
          />
        );
      }
      return <span className="block-editor-text">{block.content}</span>;
    }

    case 'paragraph':
    default:
      return <MarkdownPreview content={block.content} />;
  }
}

export function BlockEditor({
  content,
  onChange,
  className = '',
  enableDrag = true,
}: BlockEditorProps) {
  // Get drag state from store
  const isDragging = useBlockDragStore(selectIsDragging);
  const draggedBlockIndex = useBlockDragStore(selectDraggedBlockIndex);
  const dropTargetIndex = useBlockDragStore(selectDropTargetIndex);
  const dropPosition = useBlockDragStore(selectDropPosition);

  // Get store actions
  const {
    setBlocks,
    startDrag,
    updateDropTarget,
    endDrag,
    cancelDrag,
    reorderBlocks,
    pushUndo,
  } = useBlockDragStore();

  // Parse blocks from content
  const blocks = useMemo(() => parseBlocks(content), [content]);

  // Update store when blocks change
  useEffect(() => {
    setBlocks(blocks);
  }, [blocks, setBlocks]);

  // Handle drag start
  const handleDragStart = useCallback(
    (blockId: string, blockIndex: number) => {
      if (!enableDrag) return;
      startDrag(blockId, blockIndex);
    },
    [enableDrag, startDrag]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    endDrag();
  }, [endDrag]);

  // Handle drag over
  const handleDragOver = useCallback(
    (blockIndex: number, position: 'before' | 'after') => {
      if (!enableDrag) return;
      if (draggedBlockIndex === null) return;

      // Don't allow dropping in the same position
      if (draggedBlockIndex === blockIndex) {
        updateDropTarget(null, null);
        return;
      }

      // Don't show indicator if dropping would result in same position
      if (position === 'after' && draggedBlockIndex === blockIndex + 1) {
        updateDropTarget(null, null);
        return;
      }
      if (position === 'before' && draggedBlockIndex === blockIndex - 1) {
        updateDropTarget(null, null);
        return;
      }

      updateDropTarget(blockIndex, position);
    },
    [enableDrag, draggedBlockIndex, updateDropTarget]
  );

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    // Only clear if we're leaving the entire editor
    // The parent will handle clearing the drop target
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (targetIndex: number, position: 'before' | 'after') => {
      if (!enableDrag) return;
      if (draggedBlockIndex === null) return;
      if (draggedBlockIndex === targetIndex) return;

      // Calculate new content
      const newContent = reorderBlocks(content, draggedBlockIndex, targetIndex, position);

      // Push to undo stack
      pushUndo(content, newContent);

      // Update content
      onChange(newContent);

      // End drag
      endDrag();
    },
    [enableDrag, draggedBlockIndex, content, reorderBlocks, pushUndo, onChange, endDrag]
  );

  // Handle escape key to cancel drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDragging) {
        cancelDrag();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDragging, cancelDrag]);

  // Handle drag end when leaving the editor area
  const handleContainerDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      // Check if we're leaving the container entirely
      const rect = e.currentTarget.getBoundingClientRect();
      const { clientX, clientY } = e;

      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        updateDropTarget(null, null);
      }
    },
    [updateDropTarget]
  );

  if (blocks.length === 0) {
    return (
      <div className={`block-editor block-editor-empty ${className}`}>
        <p className="block-editor-empty-text">No content to display</p>
      </div>
    );
  }

  return (
    <div
      className={`block-editor ${isDragging ? 'block-editor-dragging' : ''} ${className}`}
      onDragLeave={handleContainerDragLeave}
    >
      {blocks.map((block, index) => {
        const showDropBefore =
          dropTargetIndex === index && dropPosition === 'before';
        const showDropAfter =
          dropTargetIndex === index && dropPosition === 'after';

        return (
          <BlockWrapper
            key={block.id}
            blockId={block.id}
            blockIndex={index}
            blockType={block.type as BlockType}
            isDragging={draggedBlockIndex === index}
            isAnyDragging={isDragging}
            draggedBlockIndex={draggedBlockIndex}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            showDropBefore={showDropBefore}
            showDropAfter={showDropAfter}
          >
            {renderBlockContent(block)}
          </BlockWrapper>
        );
      })}
    </div>
  );
}

BlockEditor.displayName = 'BlockEditor';
