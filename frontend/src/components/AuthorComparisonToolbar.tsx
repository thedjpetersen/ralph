import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAIComparisonStore,
  useAIComparison,
} from '../stores/aiComparison';
import { useCommentHighlightStore } from '../stores/commentHighlight';
import './AuthorComparisonToolbar.css';

function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

interface AuthorComparisonToolbarProps {
  /** CSS selector or element to attach selection listener to */
  targetSelector?: string;
  /** Context to pass to the comparison */
  context?: Record<string, unknown>;
}

interface SelectionInfo {
  text: string;
  start: number;
  end: number;
  element: HTMLTextAreaElement | HTMLInputElement;
  position: { top: number; left: number };
}

export function AuthorComparisonToolbar({
  targetSelector,
  context,
}: AuthorComparisonToolbarProps) {
  const { isComparisonMode, selectedPersonas, isLoading } = useAIComparison();
  const { startComparison } = useAIComparisonStore();
  const { registerTargetElement } = useCommentHighlightStore();

  const toolbarRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Handle text selection
  const handleSelection = useCallback(() => {
    if (!isComparisonMode) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setIsVisible(false);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 2) {
      setIsVisible(false);
      return;
    }

    // Get the anchor node's parent element
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;

    // Find if selection is inside a textarea or input
    let element: HTMLTextAreaElement | HTMLInputElement | null = null;

    const parentElement = anchorNode.parentElement;
    if (parentElement) {
      const editableParent = parentElement.closest('textarea, input[type="text"]');
      if (editableParent) {
        element = editableParent as HTMLTextAreaElement | HTMLInputElement;
      }
    }

    // Also check the active element
    if (!element && document.activeElement) {
      if (
        document.activeElement instanceof HTMLTextAreaElement ||
        (document.activeElement instanceof HTMLInputElement &&
          document.activeElement.type === 'text')
      ) {
        element = document.activeElement;
      }
    }

    if (!element) return;

    // Get selection range from the input/textarea
    const selectionStart = element.selectionStart ?? 0;
    const selectionEnd = element.selectionEnd ?? 0;

    if (selectionStart === selectionEnd) return;

    // Calculate toolbar position
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const position = {
      top: rect.top + window.scrollY - 10,
      left: rect.left + window.scrollX + rect.width / 2,
    };

    // Register the target element
    const elementId = `comparison-target-${Date.now()}`;
    registerTargetElement(elementId, element);

    setSelectionInfo({
      text: selectedText,
      start: selectionStart,
      end: selectionEnd,
      element,
      position,
    });
    setIsVisible(true);

    // Store element id on the element for later retrieval
    (element as HTMLElement).dataset.comparisonTargetId = elementId;
  }, [isComparisonMode, registerTargetElement]);

  // Listen for selection changes
  useEffect(() => {
    if (!isComparisonMode) {
      return;
    }

    let target: Document | Element = document;

    if (targetSelector) {
      const el = document.querySelector(targetSelector);
      if (el) target = el;
    }

    const handleMouseUp = () => {
      // Small delay to let selection finalize
      setTimeout(handleSelection, 10);
    };

    target.addEventListener('mouseup', handleMouseUp);

    return () => {
      target.removeEventListener('mouseup', handleMouseUp);
      // Reset visibility when comparison mode is turned off (cleanup)
      setIsVisible(false);
    };
  }, [targetSelector, handleSelection, isComparisonMode]);

  // Handle click outside to dismiss
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };

    // Delay to prevent immediate dismissal
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  // Start the comparison
  const handleCompare = useCallback(() => {
    if (!selectionInfo || selectedPersonas.length < 2) return;

    const elementId = (selectionInfo.element as HTMLElement).dataset.comparisonTargetId;
    if (!elementId) return;

    startComparison(
      selectionInfo.text,
      { startIndex: selectionInfo.start, endIndex: selectionInfo.end },
      elementId,
      context
    );

    setIsVisible(false);
  }, [selectionInfo, selectedPersonas, startComparison, context]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsVisible(false);
      }

      // Enter to start comparison
      if (e.key === 'Enter' && selectionInfo && selectedPersonas.length >= 2) {
        e.preventDefault();
        handleCompare();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, selectionInfo, selectedPersonas, handleCompare]);

  // Don't render if not in comparison mode or no selection
  if (!isComparisonMode || !isVisible || !selectionInfo) {
    return null;
  }

  const canCompare = selectedPersonas.length >= 2;

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        className="author-comparison-toolbar"
        style={{
          top: selectionInfo.position.top,
          left: selectionInfo.position.left,
        }}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="toolbar"
        aria-label="Author comparison options"
      >
        {/* Header */}
        <div className="comparison-toolbar-header">
          <svg className="comparison-toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6M23 11h-6" />
          </svg>
          <span className="comparison-toolbar-title">Compare Authors</span>
          <button
            type="button"
            className="comparison-toolbar-close"
            onClick={() => setIsVisible(false)}
            aria-label="Close toolbar"
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Selected text preview */}
        <div className="comparison-toolbar-selection">
          <span className="selection-preview">"{selectionInfo.text.length > 50 ? selectionInfo.text.slice(0, 50) + '...' : selectionInfo.text}"</span>
        </div>

        {/* Author count display */}
        <div className="comparison-toolbar-authors">
          <span>{selectedPersonas.length} author{selectedPersonas.length !== 1 ? 's' : ''} selected</span>
        </div>

        {/* Action button */}
        <div className="comparison-toolbar-actions">
          <button
            type="button"
            className={`comparison-toolbar-btn ${canCompare ? 'primary' : 'disabled'}`}
            onClick={handleCompare}
            disabled={!canCompare || isLoading}
            aria-label={canCompare ? 'Get feedback from selected authors' : 'Select at least 2 authors'}
          >
            {isLoading ? (
              <>
                <span className="loading-dots">
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                </span>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                <span>{canCompare ? 'Get Feedback' : 'Select 2+ Authors'}</span>
                {canCompare && <kbd>Enter</kbd>}
              </>
            )}
          </button>
        </div>

        {!canCompare && (
          <div className="comparison-toolbar-hint">
            Select at least 2 authors in the comparison panel
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

AuthorComparisonToolbar.displayName = 'AuthorComparisonToolbar';
