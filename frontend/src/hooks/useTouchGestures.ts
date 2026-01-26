import { useRef, useCallback, useState, useEffect, type RefObject } from 'react';

/**
 * Configuration options for touch gestures
 */
export interface UseTouchGesturesOptions {
  /** Callback when swipe right gesture is detected */
  onSwipeRight?: (velocity: number) => void;
  /** Callback when swipe left gesture is detected */
  onSwipeLeft?: (velocity: number) => void;
  /** Callback when swipe up gesture is detected */
  onSwipeUp?: (velocity: number) => void;
  /** Callback when swipe down gesture is detected */
  onSwipeDown?: (velocity: number) => void;
  /** Callback when long press gesture is detected */
  onLongPress?: (position: { x: number; y: number }) => void;
  /** Minimum distance in pixels to trigger a swipe (default: 50) */
  swipeThreshold?: number;
  /** Minimum velocity in px/ms to trigger a swipe (default: 0.3) */
  velocityThreshold?: number;
  /** Time in ms to hold for long press (default: 500) */
  longPressDelay?: number;
  /** Whether gestures are enabled (default: true) */
  enabled?: boolean;
  /** Prevent default touch behavior */
  preventDefault?: boolean;
}

export interface TouchState {
  /** Whether a swipe gesture is currently in progress */
  isSwiping: boolean;
  /** Current horizontal offset during swipe */
  swipeOffsetX: number;
  /** Current vertical offset during swipe */
  swipeOffsetY: number;
  /** The direction of current swipe */
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null;
  /** Whether a long press is in progress */
  isLongPressing: boolean;
}

/**
 * Hook for handling common touch gestures on mobile devices.
 * Supports swipe (all directions) and long press gestures.
 */
export function useTouchGestures<T extends HTMLElement>(
  elementRef: RefObject<T | null>,
  options: UseTouchGesturesOptions = {}
) {
  const {
    onSwipeRight,
    onSwipeLeft,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    swipeThreshold = 50,
    velocityThreshold = 0.3,
    longPressDelay = 500,
    enabled = true,
    preventDefault = false,
  } = options;

  const [touchState, setTouchState] = useState<TouchState>({
    isSwiping: false,
    swipeOffsetX: 0,
    swipeOffsetY: 0,
    swipeDirection: null,
    isLongPressing: false,
  });

  // Refs for tracking touch state
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMovedRef = useRef(false);
  const longPressTriggeredRef = useRef(false);

  // Clear long press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Reset state
  const resetState = useCallback(() => {
    setTouchState({
      isSwiping: false,
      swipeOffsetX: 0,
      swipeOffsetY: 0,
      swipeDirection: null,
      isLongPressing: false,
    });
    touchStartRef.current = null;
    hasMovedRef.current = false;
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      if (preventDefault) e.preventDefault();

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      hasMovedRef.current = false;
      longPressTriggeredRef.current = false;

      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          if (!hasMovedRef.current && touchStartRef.current) {
            longPressTriggeredRef.current = true;
            setTouchState(prev => ({ ...prev, isLongPressing: true }));
            onLongPress({
              x: touchStartRef.current.x,
              y: touchStartRef.current.y,
            });
            // Vibrate for haptic feedback if available
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
          }
        }, longPressDelay);
      }
    },
    [enabled, preventDefault, onLongPress, longPressDelay]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchStartRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Cancel long press if moved more than 10px
      if (absX > 10 || absY > 10) {
        hasMovedRef.current = true;
        clearLongPressTimer();
        setTouchState(prev => ({ ...prev, isLongPressing: false }));
      }

      // Determine swipe direction
      let direction: 'left' | 'right' | 'up' | 'down' | null = null;
      if (absX > absY && absX > 10) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else if (absY > absX && absY > 10) {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      if (direction) {
        setTouchState({
          isSwiping: true,
          swipeOffsetX: deltaX,
          swipeOffsetY: deltaY,
          swipeDirection: direction,
          isLongPressing: false,
        });
      }
    },
    [enabled, clearLongPressTimer]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchStartRef.current) {
        resetState();
        return;
      }

      clearLongPressTimer();

      // If long press was triggered, don't process swipe
      if (longPressTriggeredRef.current) {
        resetState();
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const elapsed = Date.now() - touchStartRef.current.time;
      const velocity = Math.max(absX, absY) / elapsed;

      // Check if swipe meets threshold
      const meetsSwipeThreshold =
        (absX >= swipeThreshold || absY >= swipeThreshold) &&
        velocity >= velocityThreshold;

      if (meetsSwipeThreshold) {
        // Determine primary direction
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight(velocity);
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft(velocity);
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown(velocity);
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp(velocity);
          }
        }
      }

      resetState();
    },
    [
      enabled,
      clearLongPressTimer,
      resetState,
      swipeThreshold,
      velocityThreshold,
      onSwipeRight,
      onSwipeLeft,
      onSwipeUp,
      onSwipeDown,
    ]
  );

  // Handle touch cancel
  const handleTouchCancel = useCallback(() => {
    resetState();
  }, [resetState]);

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
      clearLongPressTimer();
    };
  }, [
    elementRef,
    enabled,
    preventDefault,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    clearLongPressTimer,
  ]);

  return {
    /** Current touch state */
    touchState,
    /** Reset touch state manually */
    resetState,
  };
}

/**
 * Utility to check if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0
  );
}
