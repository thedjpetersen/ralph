import {
  type ReactNode,
  useRef,
  useState,
  useCallback,
  type TouchEvent as ReactTouchEvent,
  type CSSProperties,
} from 'react';
import './SwipeableListItem.css';

export interface SwipeAction {
  /** Unique identifier for the action */
  id: string;
  /** Icon to display */
  icon: ReactNode;
  /** Label for accessibility */
  label: string;
  /** Background color */
  color?: string;
  /** Callback when action is triggered */
  onAction: () => void;
}

export interface SwipeableListItemProps {
  /** Content to render inside the item */
  children: ReactNode;
  /** Actions shown when swiping right (from left edge) */
  leftActions?: SwipeAction[];
  /** Actions shown when swiping left (from right edge) */
  rightActions?: SwipeAction[];
  /** Whether swiping is disabled */
  disabled?: boolean;
  /** Minimum swipe distance to trigger action (default: 80) */
  actionThreshold?: number;
  /** Additional class name */
  className?: string;
  /** Called when item is long-pressed */
  onLongPress?: (position: { x: number; y: number }) => void;
  /** Long press delay in ms (default: 500) */
  longPressDelay?: number;
  /** Callback when item is clicked/tapped */
  onClick?: () => void;
}

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  startTime: number;
  isSwiping: boolean;
  direction: 'left' | 'right' | null;
}

export function SwipeableListItem({
  children,
  leftActions = [],
  rightActions = [],
  disabled = false,
  actionThreshold = 80,
  className = '',
  onLongPress,
  longPressDelay = 500,
  onClick,
}: SwipeableListItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [swipeState, setSwipeState] = useState<SwipeState | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMovedRef = useRef(false);
  const longPressTriggeredRef = useRef(false);

  const maxLeftOffset = leftActions.length * 72;
  const maxRightOffset = rightActions.length * 72;

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      setSwipeState({
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        startTime: Date.now(),
        isSwiping: false,
        direction: null,
      });
      hasMovedRef.current = false;
      longPressTriggeredRef.current = false;

      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          if (!hasMovedRef.current) {
            longPressTriggeredRef.current = true;
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
            onLongPress({ x: touch.clientX, y: touch.clientY });
          }
        }, longPressDelay);
      }
    },
    [disabled, onLongPress, longPressDelay]
  );

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      if (!swipeState || disabled) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeState.startX;
      const deltaY = touch.clientY - swipeState.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Cancel long press if moved more than 10px
      if (absX > 10 || absY > 10) {
        hasMovedRef.current = true;
        clearLongPressTimer();
      }

      // Determine if this is a horizontal swipe (not vertical scroll)
      if (!swipeState.isSwiping) {
        if (absX > 10 && absX > absY) {
          // Check if we have actions in this direction
          const direction = deltaX > 0 ? 'right' : 'left';
          const hasActionsInDirection =
            (direction === 'right' && leftActions.length > 0) ||
            (direction === 'left' && rightActions.length > 0);

          if (hasActionsInDirection) {
            setSwipeState(prev =>
              prev
                ? {
                    ...prev,
                    isSwiping: true,
                    direction,
                    currentX: touch.clientX,
                  }
                : null
            );
          }
        }
        return;
      }

      // Calculate constrained offset
      let newOffset = deltaX;

      // Apply constraints based on direction and available actions
      if (deltaX > 0) {
        // Swiping right (showing left actions)
        newOffset = Math.min(deltaX, maxLeftOffset + 20); // Allow slight overscroll
        newOffset = leftActions.length === 0 ? 0 : newOffset;
      } else {
        // Swiping left (showing right actions)
        newOffset = Math.max(deltaX, -(maxRightOffset + 20));
        newOffset = rightActions.length === 0 ? 0 : newOffset;
      }

      // Apply rubber-band effect at boundaries
      if (Math.abs(newOffset) > (deltaX > 0 ? maxLeftOffset : maxRightOffset)) {
        const overscroll =
          Math.abs(newOffset) - (deltaX > 0 ? maxLeftOffset : maxRightOffset);
        const dampedOverscroll = overscroll * 0.3;
        newOffset =
          deltaX > 0
            ? maxLeftOffset + dampedOverscroll
            : -(maxRightOffset + dampedOverscroll);
      }

      setOffset(newOffset);
    },
    [
      swipeState,
      disabled,
      leftActions.length,
      rightActions.length,
      maxLeftOffset,
      maxRightOffset,
      clearLongPressTimer,
    ]
  );

  const handleTouchEnd = useCallback(() => {
    clearLongPressTimer();

    if (!swipeState || disabled) {
      setSwipeState(null);
      return;
    }

    // If long press was triggered, don't process as click
    if (longPressTriggeredRef.current) {
      setSwipeState(null);
      return;
    }

    // If no significant movement, treat as tap
    if (!swipeState.isSwiping && !hasMovedRef.current) {
      onClick?.();
      setSwipeState(null);
      return;
    }

    const absOffset = Math.abs(offset);
    setIsAnimating(true);

    if (absOffset >= actionThreshold) {
      // Find and trigger the primary action
      if (offset > 0 && leftActions.length > 0) {
        // Trigger first left action
        leftActions[0].onAction();
      } else if (offset < 0 && rightActions.length > 0) {
        // Trigger first right action
        rightActions[0].onAction();
      }
    }

    // Snap back to closed position
    setOffset(0);
    setTimeout(() => setIsAnimating(false), 200);
    setSwipeState(null);
  }, [
    swipeState,
    disabled,
    offset,
    actionThreshold,
    leftActions,
    rightActions,
    onClick,
    clearLongPressTimer,
  ]);

  const handleTouchCancel = useCallback(() => {
    clearLongPressTimer();
    setSwipeState(null);
    setIsAnimating(true);
    setOffset(0);
    setTimeout(() => setIsAnimating(false), 200);
  }, [clearLongPressTimer]);

  const contentStyle: CSSProperties = {
    transform: `translateX(${offset}px)`,
    transition: isAnimating ? 'transform 0.2s ease-out' : 'none',
  };

  // Calculate action background opacity based on offset
  const leftActionsOpacity = Math.min(offset / actionThreshold, 1);
  const rightActionsOpacity = Math.min(Math.abs(offset) / actionThreshold, 1);

  return (
    <div
      ref={containerRef}
      className={`swipeable-list-item ${className}`}
      role="listitem"
    >
      {/* Left action background */}
      {leftActions.length > 0 && (
        <div
          className="swipeable-action-bg swipeable-action-bg--left"
          style={{
            opacity: leftActionsOpacity,
            backgroundColor: leftActions[0].color || 'var(--color-accent)',
          }}
          aria-hidden="true"
        >
          {leftActions.map(action => (
            <button
              key={action.id}
              className="swipeable-action"
              onClick={action.onAction}
              aria-label={action.label}
              tabIndex={-1}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}

      {/* Right action background */}
      {rightActions.length > 0 && (
        <div
          className="swipeable-action-bg swipeable-action-bg--right"
          style={{
            opacity: rightActionsOpacity,
            backgroundColor: rightActions[0].color || 'var(--color-error)',
          }}
          aria-hidden="true"
        >
          {rightActions.map(action => (
            <button
              key={action.id}
              className="swipeable-action"
              onClick={action.onAction}
              aria-label={action.label}
              tabIndex={-1}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div
        ref={contentRef}
        className={`swipeable-list-item-content ${swipeState?.isSwiping ? 'swiping' : ''}`}
        style={contentStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {children}
      </div>
    </div>
  );
}

SwipeableListItem.displayName = 'SwipeableListItem';
