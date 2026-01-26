import { create } from 'zustand';

/**
 * Block types that support drag-and-drop reordering
 */
export type BlockType = 'paragraph' | 'heading' | 'code' | 'list' | 'blockquote' | 'image';

/**
 * A parsed block from markdown content
 */
export interface Block {
  id: string;
  type: BlockType;
  content: string;
  startLine: number;
  endLine: number;
}

/**
 * An entry in the undo stack for block reordering operations
 */
export interface BlockUndoEntry {
  previousContent: string;
  newContent: string;
  timestamp: number;
}

/**
 * State for the block drag-and-drop feature
 */
interface BlockDragState {
  // Drag state
  isDragging: boolean;
  draggedBlockId: string | null;
  draggedBlockIndex: number | null;
  dropTargetIndex: number | null;
  dropPosition: 'before' | 'after' | null;

  // Parsed blocks from current content
  blocks: Block[];

  // Undo stack for reordering operations
  undoStack: BlockUndoEntry[];
  maxUndoStackSize: number;

  // Actions
  setBlocks: (blocks: Block[]) => void;
  startDrag: (blockId: string, blockIndex: number) => void;
  updateDropTarget: (targetIndex: number | null, position: 'before' | 'after' | null) => void;
  endDrag: () => void;
  cancelDrag: () => void;

  // Reorder operation
  reorderBlocks: (
    content: string,
    fromIndex: number,
    toIndex: number,
    position: 'before' | 'after'
  ) => string;

  // Undo support
  pushUndo: (previousContent: string, newContent: string) => void;
  undo: () => BlockUndoEntry | null;
  canUndo: () => boolean;
  clearUndoStack: () => void;
}

/**
 * Parse markdown content into blocks
 */
export function parseBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let blockId = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check for code block
    if (line.trim().startsWith('```')) {
      const startLine = i;
      i++;
      // Find closing ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        i++;
      }
      const endLine = i < lines.length ? i : i - 1;
      blocks.push({
        id: `block-${blockId++}`,
        type: 'code',
        content: lines.slice(startLine, endLine + 1).join('\n'),
        startLine,
        endLine,
      });
      i++;
      continue;
    }

    // Check for heading
    if (line.match(/^#{1,6}\s/)) {
      blocks.push({
        id: `block-${blockId++}`,
        type: 'heading',
        content: line,
        startLine: i,
        endLine: i,
      });
      i++;
      continue;
    }

    // Check for list item (unordered or ordered)
    if (line.match(/^(\s*[-*+]|\s*\d+\.)\s/)) {
      const startLine = i;
      const indent = line.match(/^(\s*)/)?.[1].length || 0;
      i++;
      // Collect continuous list items at the same or deeper indent
      while (
        i < lines.length &&
        (lines[i].match(/^(\s*[-*+]|\s*\d+\.)\s/) ||
          (lines[i].match(/^\s+\S/) && (lines[i].match(/^(\s*)/)?.[1].length || 0) > indent) ||
          lines[i].trim() === '')
      ) {
        // Stop if we hit an empty line followed by non-list content
        if (lines[i].trim() === '' && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (!nextLine.match(/^(\s*[-*+]|\s*\d+\.)\s/) && nextLine.trim() !== '') {
            break;
          }
        }
        i++;
      }
      const endLine = i - 1;
      blocks.push({
        id: `block-${blockId++}`,
        type: 'list',
        content: lines.slice(startLine, endLine + 1).join('\n'),
        startLine,
        endLine,
      });
      continue;
    }

    // Check for blockquote
    if (line.startsWith('>')) {
      const startLine = i;
      i++;
      // Collect continuous blockquote lines
      while (i < lines.length && (lines[i].startsWith('>') || lines[i].trim() === '')) {
        if (lines[i].trim() === '' && i + 1 < lines.length && !lines[i + 1].startsWith('>')) {
          break;
        }
        i++;
      }
      const endLine = i - 1;
      blocks.push({
        id: `block-${blockId++}`,
        type: 'blockquote',
        content: lines.slice(startLine, endLine + 1).join('\n'),
        startLine,
        endLine,
      });
      continue;
    }

    // Check for image on its own line
    if (line.match(/^!\[.*\]\(.*\)$/)) {
      blocks.push({
        id: `block-${blockId++}`,
        type: 'image',
        content: line,
        startLine: i,
        endLine: i,
      });
      i++;
      continue;
    }

    // Skip empty lines between blocks
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Default: paragraph (collect continuous non-empty lines)
    const startLine = i;
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,6}\s/) &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].match(/^(\s*[-*+]|\s*\d+\.)\s/) &&
      !lines[i].startsWith('>') &&
      !lines[i].match(/^!\[.*\]\(.*\)$/)
    ) {
      i++;
    }
    const endLine = i - 1;
    blocks.push({
      id: `block-${blockId++}`,
      type: 'paragraph',
      content: lines.slice(startLine, endLine + 1).join('\n'),
      startLine,
      endLine,
    });
  }

  return blocks;
}

/**
 * Reconstruct content from blocks
 */
export function blocksToContent(blocks: Block[]): string {
  return blocks.map((block) => block.content).join('\n\n');
}

/**
 * Reorder blocks in content
 */
function reorderBlocksInContent(
  content: string,
  blocks: Block[],
  fromIndex: number,
  toIndex: number,
  position: 'before' | 'after'
): string {
  if (fromIndex === toIndex) return content;
  if (fromIndex < 0 || fromIndex >= blocks.length) return content;
  if (toIndex < 0 || toIndex >= blocks.length) return content;

  // Create a copy of blocks array
  const newBlocks = [...blocks];

  // Remove the block from its original position
  const [movedBlock] = newBlocks.splice(fromIndex, 1);

  // Calculate the insertion index
  let insertIndex = toIndex;
  if (fromIndex < toIndex) {
    insertIndex -= 1; // Account for removal
  }
  if (position === 'after') {
    insertIndex += 1;
  }

  // Insert at the new position
  newBlocks.splice(insertIndex, 0, movedBlock);

  // Reconstruct content
  return blocksToContent(newBlocks);
}

export const useBlockDragStore = create<BlockDragState>()((set, get) => ({
  // Initial state
  isDragging: false,
  draggedBlockId: null,
  draggedBlockIndex: null,
  dropTargetIndex: null,
  dropPosition: null,
  blocks: [],
  undoStack: [],
  maxUndoStackSize: 50,

  setBlocks: (blocks) => {
    set({ blocks });
  },

  startDrag: (blockId, blockIndex) => {
    set({
      isDragging: true,
      draggedBlockId: blockId,
      draggedBlockIndex: blockIndex,
      dropTargetIndex: null,
      dropPosition: null,
    });
  },

  updateDropTarget: (targetIndex, position) => {
    set({
      dropTargetIndex: targetIndex,
      dropPosition: position,
    });
  },

  endDrag: () => {
    set({
      isDragging: false,
      draggedBlockId: null,
      draggedBlockIndex: null,
      dropTargetIndex: null,
      dropPosition: null,
    });
  },

  cancelDrag: () => {
    set({
      isDragging: false,
      draggedBlockId: null,
      draggedBlockIndex: null,
      dropTargetIndex: null,
      dropPosition: null,
    });
  },

  reorderBlocks: (content, fromIndex, toIndex, position) => {
    const { blocks } = get();
    return reorderBlocksInContent(content, blocks, fromIndex, toIndex, position);
  },

  pushUndo: (previousContent, newContent) => {
    set((state) => {
      const newEntry: BlockUndoEntry = {
        previousContent,
        newContent,
        timestamp: Date.now(),
      };
      const newStack = [...state.undoStack, newEntry].slice(-state.maxUndoStackSize);
      return { undoStack: newStack };
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;

    const lastEntry = state.undoStack[state.undoStack.length - 1];
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
    }));
    return lastEntry;
  },

  canUndo: () => {
    return get().undoStack.length > 0;
  },

  clearUndoStack: () => {
    set({ undoStack: [] });
  },
}));

// Selectors for stable references
export const selectIsDragging = (state: BlockDragState) => state.isDragging;
export const selectDraggedBlockId = (state: BlockDragState) => state.draggedBlockId;
export const selectDraggedBlockIndex = (state: BlockDragState) => state.draggedBlockIndex;
export const selectDropTargetIndex = (state: BlockDragState) => state.dropTargetIndex;
export const selectDropPosition = (state: BlockDragState) => state.dropPosition;
export const selectBlocks = (state: BlockDragState) => state.blocks;
export const selectCanUndo = (state: BlockDragState) => state.undoStack.length > 0;
