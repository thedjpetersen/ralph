import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useAIRewrite } from '../stores/aiRewrite';
import { useSyncExternalStore } from 'react';
import './GhostRewritePreview.css';

/**
 * GhostRewritePreview displays an inline ghost text preview for AI rewrites.
 * It overlays the target textarea/input and shows:
 * - Text before the selection (normal)
 * - Original selected text (strikethrough, faded)
 * - Replacement text (ghost style, emphasized)
 * - Text after the selection (normal)
 */
export function GhostRewritePreview() {
  const { ghostPreviewInfo, targetElement, isLoading, previewText } = useAIRewrite();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate position using useMemo to avoid setState in effect
  const position = useMemo(() => {
    if (!targetElement || !ghostPreviewInfo) {
      return null;
    }
    const rect = targetElement.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  }, [targetElement, ghostPreviewInfo]);

  // Subscribe to resize/scroll events to trigger re-render
  const getSnapshot = useCallback(() => {
    if (!targetElement) return '';
    const rect = targetElement.getBoundingClientRect();
    return `${rect.top},${rect.left},${rect.width},${rect.height},${window.scrollY},${window.scrollX}`;
  }, [targetElement]);

  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('resize', callback);
    window.addEventListener('scroll', callback);
    return () => {
      window.removeEventListener('resize', callback);
      window.removeEventListener('scroll', callback);
    };
  }, []);

  // This subscribes to resize/scroll and triggers re-renders when position changes
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Sync scroll position with target element
  useEffect(() => {
    if (!targetElement || !overlayRef.current) return;

    const syncScroll = () => {
      if (overlayRef.current) {
        overlayRef.current.scrollTop = targetElement.scrollTop;
        overlayRef.current.scrollLeft = targetElement.scrollLeft;
      }
    };

    syncScroll();
    targetElement.addEventListener('scroll', syncScroll);

    return () => {
      targetElement.removeEventListener('scroll', syncScroll);
    };
  }, [targetElement]);

  // Don't render if no ghost preview info or if we're still loading
  if (!ghostPreviewInfo || !position || isLoading || !previewText) {
    return null;
  }

  // Get computed styles from target element for accurate rendering
  const computedStyles = targetElement ? window.getComputedStyle(targetElement) : null;

  return (
    <div
      ref={overlayRef}
      className="ghost-rewrite-overlay"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        height: position.height,
        padding: computedStyles?.padding,
        fontFamily: computedStyles?.fontFamily,
        fontSize: computedStyles?.fontSize,
        lineHeight: computedStyles?.lineHeight,
        letterSpacing: computedStyles?.letterSpacing,
        textAlign: computedStyles?.textAlign as 'left' | 'right' | 'center' | 'justify',
        borderRadius: computedStyles?.borderRadius,
      }}
      aria-hidden="true"
    >
      <span className="ghost-rewrite-before">{ghostPreviewInfo.beforeText}</span>
      <span className="ghost-rewrite-original">{ghostPreviewInfo.originalText}</span>
      <span className="ghost-rewrite-replacement">{ghostPreviewInfo.replacementText}</span>
      <span className="ghost-rewrite-after">{ghostPreviewInfo.afterText}</span>
    </div>
  );
}

GhostRewritePreview.displayName = 'GhostRewritePreview';
