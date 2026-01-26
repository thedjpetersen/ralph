import { useEffect, useCallback, useRef } from 'react';
import { useCommentHighlightStore } from '../stores/commentHighlight';

/**
 * Hook to register a text element as a target for comment highlighting.
 *
 * Usage:
 * ```tsx
 * const { ref, elementId } = useCommentHighlightTarget('my-textarea');
 * return <textarea ref={ref} />;
 * ```
 *
 * Then pass `elementId` to AICommentCard as `targetElementId`.
 */
export function useCommentHighlightTarget(id: string) {
  const { registerTargetElement, unregisterTargetElement } = useCommentHighlightStore();
  const elementRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // Callback ref to handle element registration
  const setRef = useCallback(
    (element: HTMLTextAreaElement | HTMLInputElement | null) => {
      // Unregister previous element if it exists
      if (elementRef.current && elementRef.current !== element) {
        unregisterTargetElement(id);
      }

      elementRef.current = element;

      // Register new element
      if (element) {
        registerTargetElement(id, element);
      }
    },
    [id, registerTargetElement, unregisterTargetElement]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unregisterTargetElement(id);
    };
  }, [id, unregisterTargetElement]);

  return {
    ref: setRef,
    elementId: id,
  };
}

export default useCommentHighlightTarget;
