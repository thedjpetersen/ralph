import { useEffect, useCallback, type RefObject } from 'react';

/**
 * Options for the useTapOutsideDeselect hook
 */
export interface UseTapOutsideDeselectOptions {
  /** Whether the selection mode is active */
  isActive: boolean;
  /** Callback when tap/click outside is detected */
  onDeselect: () => void;
  /** Optional refs to ignore (elements that should not trigger deselect) */
  ignoreRefs?: RefObject<HTMLElement | null>[];
  /** Optional class names to ignore (elements with these classes won't trigger deselect) */
  ignoreClassNames?: string[];
}

/**
 * Hook to handle tap/click outside to deselect functionality.
 * Useful for dismissing selection states when tapping outside the selected area.
 *
 * @param containerRef - Reference to the container element
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const [selectedItems, setSelectedItems] = useState<string[]>([]);
 *
 * useTapOutsideDeselect(containerRef, {
 *   isActive: selectedItems.length > 0,
 *   onDeselect: () => setSelectedItems([]),
 *   ignoreClassNames: ['selection-toolbar'],
 * });
 * ```
 */
export function useTapOutsideDeselect<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: UseTapOutsideDeselectOptions
) {
  const { isActive, onDeselect, ignoreRefs = [], ignoreClassNames = [] } = options;

  const shouldIgnore = useCallback(
    (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof Node)) return false;

      // Check if target is within any ignored refs
      for (const ref of ignoreRefs) {
        if (ref.current?.contains(target as Node)) {
          return true;
        }
      }

      // Check if target or any ancestor has an ignored class name
      if (target instanceof Element) {
        let element: Element | null = target;
        while (element) {
          for (const className of ignoreClassNames) {
            if (element.classList.contains(className)) {
              return true;
            }
          }
          element = element.parentElement;
        }
      }

      return false;
    },
    [ignoreRefs, ignoreClassNames]
  );

  const handleInteraction = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isActive) return;

      const target = e.target;

      // Check if click/tap was inside the container
      if (containerRef.current?.contains(target as Node)) {
        return;
      }

      // Check if target should be ignored
      if (shouldIgnore(target)) {
        return;
      }

      // Trigger deselect
      onDeselect();
    },
    [isActive, containerRef, shouldIgnore, onDeselect]
  );

  useEffect(() => {
    if (!isActive) return;

    // Use mousedown for desktop and touchstart for mobile
    // This ensures we catch the event before focus changes
    document.addEventListener('mousedown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('mousedown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [isActive, handleInteraction]);
}

/**
 * Utility component wrapper that handles tap-outside-to-deselect
 * Can be used for simpler use cases where a hook is overkill
 */
export function createTapOutsideHandler(
  onDeselect: () => void,
  ignoreClassNames: string[] = []
): (e: React.MouseEvent | React.TouchEvent) => void {
  return (e: React.MouseEvent | React.TouchEvent) => {
    let target = e.target as Element | null;

    // Walk up the tree to check for ignored classes
    while (target) {
      for (const className of ignoreClassNames) {
        if (target.classList.contains(className)) {
          return;
        }
      }
      target = target.parentElement;
    }

    onDeselect();
  };
}
