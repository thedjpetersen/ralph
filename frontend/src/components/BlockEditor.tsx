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
import { useContextMenuStore } from '../stores/contextMenu';
import { ContextMenu, type ContextMenuItem } from './ui/ContextMenu';
import { toast } from '../stores/toast';
import { useEditorStyles } from '../hooks/useEditorStyles';
import './BlockEditor.css';

// Context menu icons
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.25"/>
    <path d="M10 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v6a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.25"/>
  </svg>
);

const CutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="4" cy="10" r="2" stroke="currentColor" strokeWidth="1.25"/>
    <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.25"/>
    <path d="M5.5 8.5L10 2M8.5 8.5L4 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
  </svg>
);

const AICommentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.25"/>
  </svg>
);

const DefineIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2 3h10M2 7h7M2 11h10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    <circle cx="11" cy="7" r="2" stroke="currentColor" strokeWidth="1.25"/>
  </svg>
);

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
  // Get editor style settings
  const { style: editorStyle } = useEditorStyles();

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

  // Context menu state and handlers
  const {
    isOpen: contextMenuOpen,
    menuType,
    position: contextMenuPosition,
    editorData,
    openEditorMenu,
    closeMenu
  } = useContextMenuStore();

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Get selected text
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';

    // Only show context menu if there's a text selection
    if (selectedText.trim()) {
      e.preventDefault();
      e.stopPropagation();
      openEditorMenu(
        { x: e.clientX, y: e.clientY },
        { selectedText }
      );
    }
  }, [openEditorMenu]);

  const handleCopy = useCallback(async () => {
    if (editorData?.selectedText) {
      try {
        await navigator.clipboard.writeText(editorData.selectedText);
        toast.success('Copied to clipboard');
      } catch {
        toast.error('Failed to copy');
      }
    }
    closeMenu();
  }, [editorData, closeMenu]);

  const handleCut = useCallback(async () => {
    if (editorData?.selectedText) {
      try {
        await navigator.clipboard.writeText(editorData.selectedText);
        toast.success('Cut to clipboard');
        // Note: In a full implementation, we'd also remove the selected text from the content
      } catch {
        toast.error('Failed to cut');
      }
    }
    closeMenu();
  }, [editorData, closeMenu]);

  const handleAIComment = useCallback(() => {
    if (editorData?.selectedText) {
      toast.info(`AI Comment for: "${editorData.selectedText.substring(0, 30)}..."`);
      // In a real implementation, this would trigger an AI comment generation
    }
    closeMenu();
  }, [editorData, closeMenu]);

  const handleDefine = useCallback(() => {
    if (editorData?.selectedText) {
      toast.info(`Looking up definition: "${editorData.selectedText}"`);
      // In a real implementation, this would open a definition popup or panel
    }
    closeMenu();
  }, [editorData, closeMenu]);

  // Build context menu items
  const editorContextMenuItems: ContextMenuItem[] = useMemo(() => {
    if (menuType !== 'editor' || !editorData) return [];

    return [
      {
        id: 'copy',
        label: 'Copy',
        icon: <CopyIcon />,
        shortcut: '⌘C',
        onClick: handleCopy,
      },
      {
        id: 'cut',
        label: 'Cut',
        icon: <CutIcon />,
        shortcut: '⌘X',
        onClick: handleCut,
      },
      {
        id: 'ai-comment',
        label: 'AI Comment',
        icon: <AICommentIcon />,
        shortcut: '⌘⇧C',
        onClick: handleAIComment,
      },
      {
        id: 'define',
        label: 'Define',
        icon: <DefineIcon />,
        shortcut: '⌘D',
        onClick: handleDefine,
      },
    ];
  }, [menuType, editorData, handleCopy, handleCut, handleAIComment, handleDefine]);

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
      onContextMenu={handleContextMenu}
      style={editorStyle}
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

      {/* Editor selection context menu */}
      <ContextMenu
        isOpen={contextMenuOpen && menuType === 'editor'}
        position={contextMenuPosition}
        items={editorContextMenuItems}
        onClose={closeMenu}
        header="Selection"
      />
    </div>
  );
}

BlockEditor.displayName = 'BlockEditor';
