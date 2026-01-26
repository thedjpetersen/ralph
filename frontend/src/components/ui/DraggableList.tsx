/**
 * DraggableList Component
 *
 * A reusable drag-and-drop list with smooth animations.
 * Features:
 * - Drag handle visible on hover
 * - Item lifts with shadow on drag start
 * - Other items animate to make space
 * - Drop animation settles item smoothly
 */

import {
  useState,
  useCallback,
  useRef,
  type ReactNode,
  type DragEvent,
  type CSSProperties,
} from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import './DraggableList.css';

export interface DraggableItem {
  id: string;
  [key: string]: unknown;
}

interface DraggableListProps<T extends DraggableItem> {
  /** The list of items to render */
  items: T[];
  /** Callback when items are reordered */
  onReorder: (items: T[]) => void;
  /** Render function for each item */
  renderItem: (item: T, index: number, isDragging: boolean) => ReactNode;
  /** Optional class name for the container */
  className?: string;
  /** Optional class name for each item */
  itemClassName?: string;
  /** Whether drag and drop is disabled */
  disabled?: boolean;
  /** Axis constraint for dragging */
  axis?: 'x' | 'y';
  /** Gap between items in pixels */
  gap?: number;
}

interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  dropTargetIndex: number | null;
  dropPosition: 'before' | 'after' | null;
  initialY: number;
  currentY: number;
}

const initialDragState: DragState = {
  isDragging: false,
  draggedIndex: null,
  dropTargetIndex: null,
  dropPosition: null,
  initialY: 0,
  currentY: 0,
};

// Animation spring config for smooth, natural movement
const springConfig = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 30,
  mass: 0.8,
};

// Animation variants for list items
const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export function DraggableList<T extends DraggableItem>({
  items,
  onReorder,
  renderItem,
  className = '',
  itemClassName = '',
  disabled = false,
  axis = 'y',
  gap = 8,
}: DraggableListProps<T>) {
  const [dragState, setDragState] = useState<DragState>(initialDragState);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const handleDragStart = useCallback(
    (index: number, e: DragEvent<HTMLButtonElement>) => {
      if (disabled) return;

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', items[index].id);
      e.dataTransfer.setData('application/x-draggable-list-index', index.toString());

      // Set drag image with offset
      const draggedElement = itemRefs.current.get(items[index].id);
      if (draggedElement) {
        const rect = draggedElement.getBoundingClientRect();
        e.dataTransfer.setDragImage(
          draggedElement,
          e.clientX - rect.left,
          e.clientY - rect.top
        );
      }

      setDragState({
        isDragging: true,
        draggedIndex: index,
        dropTargetIndex: null,
        dropPosition: null,
        initialY: e.clientY,
        currentY: e.clientY,
      });
    },
    [disabled, items]
  );

  const handleDragEnd = useCallback(() => {
    const { draggedIndex, dropTargetIndex, dropPosition } = dragState;

    if (draggedIndex !== null && dropTargetIndex !== null && dropPosition !== null) {
      const newItems = [...items];
      const [draggedItem] = newItems.splice(draggedIndex, 1);

      let insertIndex = dropTargetIndex;
      if (dropPosition === 'after') {
        insertIndex += 1;
      }
      // Adjust for removed item
      if (draggedIndex < insertIndex) {
        insertIndex -= 1;
      }

      newItems.splice(insertIndex, 0, draggedItem);
      onReorder(newItems);
    }

    setDragState(initialDragState);
  }, [dragState, items, onReorder]);

  const handleDragOver = useCallback(
    (index: number, e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (dragState.draggedIndex === null || dragState.draggedIndex === index) {
        return;
      }

      const itemElement = itemRefs.current.get(items[index].id);
      if (!itemElement) return;

      const rect = itemElement.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';

      setDragState((prev) => ({
        ...prev,
        dropTargetIndex: index,
        dropPosition: position,
        currentY: e.clientY,
      }));
    },
    [dragState.draggedIndex, items]
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only clear if leaving the container entirely
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setDragState((prev) => ({
        ...prev,
        dropTargetIndex: null,
        dropPosition: null,
      }));
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      handleDragEnd();
    },
    [handleDragEnd]
  );

  // Touch-based drag for mobile using framer-motion
  const handlePanStart = useCallback(
    (index: number) => {
      if (disabled) return;
      setDragState({
        isDragging: true,
        draggedIndex: index,
        dropTargetIndex: null,
        dropPosition: null,
        initialY: 0,
        currentY: 0,
      });
    },
    [disabled]
  );

  const handlePan = useCallback(
    (index: number, _event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (dragState.draggedIndex !== index) return;

      // Find which item we're over based on pan offset
      const containerEl = containerRef.current;
      if (!containerEl) return;

      const containerRect = containerEl.getBoundingClientRect();
      const currentY = info.point.y - containerRect.top;

      // Find the item we're hovering over
      let cumulativeHeight = 0;
      for (let i = 0; i < items.length; i++) {
        if (i === index) continue;
        const itemEl = itemRefs.current.get(items[i].id);
        if (!itemEl) continue;

        const itemHeight = itemEl.offsetHeight + gap;
        if (currentY < cumulativeHeight + itemHeight / 2) {
          setDragState((prev) => ({
            ...prev,
            dropTargetIndex: i,
            dropPosition: 'before',
            currentY: info.point.y,
          }));
          return;
        }
        cumulativeHeight += itemHeight;
      }

      // Default to after the last item
      const lastIndex = items.length - 1;
      if (lastIndex !== index) {
        setDragState((prev) => ({
          ...prev,
          dropTargetIndex: lastIndex,
          dropPosition: 'after',
          currentY: info.point.y,
        }));
      }
    },
    [dragState.draggedIndex, gap, items]
  );

  const handlePanEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Calculate Y offset for items during drag
  const getItemStyle = useCallback(
    (index: number): CSSProperties => {
      if (!dragState.isDragging || dragState.draggedIndex === null) {
        return {};
      }

      const { draggedIndex, dropTargetIndex, dropPosition } = dragState;

      if (index === draggedIndex) {
        return { opacity: 0.5, zIndex: 0 };
      }

      if (dropTargetIndex === null || dropPosition === null) {
        return {};
      }

      // Calculate if this item should move to make space
      let shouldMoveDown = false;
      let shouldMoveUp = false;

      if (draggedIndex < dropTargetIndex) {
        // Dragging down
        if (index > draggedIndex && index <= dropTargetIndex) {
          if (dropPosition === 'after' && index === dropTargetIndex) {
            // Don't move the drop target if we're placing after it
          } else {
            shouldMoveUp = true;
          }
        }
      } else {
        // Dragging up
        if (index >= dropTargetIndex && index < draggedIndex) {
          if (dropPosition === 'before' && index === dropTargetIndex) {
            shouldMoveDown = true;
          } else if (index > dropTargetIndex) {
            shouldMoveDown = true;
          }
        }
      }

      if (reducedMotion.current) {
        return shouldMoveDown || shouldMoveUp ? { opacity: 0.8 } : {};
      }

      return {};
    },
    [dragState]
  );

  // Get motion Y offset
  const getMotionY = useCallback(
    (index: number): number => {
      if (!dragState.isDragging || dragState.draggedIndex === null) {
        return 0;
      }

      const { draggedIndex, dropTargetIndex, dropPosition } = dragState;

      if (index === draggedIndex || dropTargetIndex === null || dropPosition === null) {
        return 0;
      }

      // Estimate item height (could be made more accurate with refs)
      const itemHeight = 60 + gap;

      if (draggedIndex < dropTargetIndex) {
        // Dragging down
        if (dropPosition === 'after') {
          if (index > draggedIndex && index <= dropTargetIndex) {
            return -itemHeight;
          }
        } else {
          if (index > draggedIndex && index < dropTargetIndex) {
            return -itemHeight;
          }
        }
      } else {
        // Dragging up
        if (dropPosition === 'before') {
          if (index >= dropTargetIndex && index < draggedIndex) {
            return itemHeight;
          }
        } else {
          if (index > dropTargetIndex && index < draggedIndex) {
            return itemHeight;
          }
        }
      }

      return 0;
    },
    [dragState, gap]
  );

  const setItemRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(id, el);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`draggable-list ${className} ${dragState.isDragging ? 'draggable-list-dragging' : ''}`}
      style={{ gap: `${gap}px` }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const isDraggedItem = dragState.draggedIndex === index;
          const isHovered = hoveredIndex === index && !dragState.isDragging;
          const showDropBefore =
            dragState.dropTargetIndex === index && dragState.dropPosition === 'before';
          const showDropAfter =
            dragState.dropTargetIndex === index && dragState.dropPosition === 'after';

          return (
            <motion.div
              key={item.id}
              ref={(el) => setItemRef(item.id, el)}
              className={`draggable-list-item ${itemClassName} ${isDraggedItem ? 'draggable-list-item-dragging' : ''} ${isHovered ? 'draggable-list-item-hovered' : ''}`}
              style={getItemStyle(index)}
              variants={reducedMotion.current ? undefined : itemVariants}
              initial="initial"
              animate={{
                ...itemVariants.animate,
                y: getMotionY(index),
              }}
              exit="exit"
              transition={springConfig}
              layout={!reducedMotion.current}
              onMouseEnter={() => !disabled && setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onDragOver={(e) => handleDragOver(index, e as unknown as DragEvent<HTMLDivElement>)}
              drag={disabled ? false : axis}
              dragConstraints={containerRef}
              dragElastic={0.1}
              onDragStart={() => handlePanStart(index)}
              onDrag={(event, info) => handlePan(index, event, info)}
              onDragEnd={handlePanEnd}
            >
              {/* Drop indicator before */}
              <AnimatePresence>
                {showDropBefore && (
                  <motion.div
                    className="draggable-list-drop-indicator drop-indicator-before"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="drop-indicator-dot" />
                    <div className="drop-indicator-line" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Drag handle */}
              {!disabled && (
                <button
                  type="button"
                  className={`draggable-list-handle ${isHovered || isDraggedItem ? 'draggable-list-handle-visible' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(index, e)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  aria-label={`Drag to reorder item ${index + 1}`}
                  title="Drag to reorder"
                >
                  <svg
                    className="draggable-list-handle-icon"
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
              )}

              {/* Item content */}
              <div className="draggable-list-content">
                {renderItem(item, index, isDraggedItem)}
              </div>

              {/* Drop indicator after */}
              <AnimatePresence>
                {showDropAfter && (
                  <motion.div
                    className="draggable-list-drop-indicator drop-indicator-after"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="drop-indicator-dot" />
                    <div className="drop-indicator-line" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

DraggableList.displayName = 'DraggableList';
