import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAISentenceCombinerStore,
  useAISentenceCombiner,
  COMBINE_STRATEGIES,
  type CombineStrategy,
} from '../stores/aiSentenceCombiner';
import './AISentenceCombinerToolbar.css';

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

interface AISentenceCombinerToolbarProps {
  /** CSS selector or element to attach selection listener to. If not provided, attaches to document. */
  targetSelector?: string;
}

export function AISentenceCombinerToolbar({ targetSelector }: AISentenceCombinerToolbarProps) {
  const { isActive, selectedText, isLoading, previewText, error, toolbarPosition, selectedStrategy, sentences } = useAISentenceCombiner();
  const {
    showToolbar,
    hideToolbar,
    requestCombine,
    applyCombine,
    cancelCombine,
    undo,
    clearError,
  } = useAISentenceCombinerStore();

  const toolbarRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Handle text selection - triggers on selection of 2+ sentences
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 10) {
      return;
    }

    // Quick check: must have at least one sentence-ending punctuation
    if (!/[.!?]/.test(selectedText)) {
      return;
    }

    // Get the anchor node's parent element
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;

    // Find if selection is inside a textarea or input
    let element: HTMLTextAreaElement | HTMLInputElement | null = null;

    // Check if selection is inside a text input or textarea
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

    showToolbar(selectedText, selectionStart, selectionEnd, element, position);
  }, [showToolbar]);

  // Listen for selection changes with Shift key held (to differentiate from tone toolbar)
  useEffect(() => {
    let target: Document | Element = document;

    if (targetSelector) {
      const el = document.querySelector(targetSelector);
      if (el) target = el;
    }

    const handleMouseUp = (e: MouseEvent) => {
      // Trigger sentence combine toolbar if Shift key is held
      if (e.shiftKey && !e.altKey) {
        setTimeout(handleSelection, 10);
      }
    };

    target.addEventListener('mouseup', handleMouseUp as EventListener);

    return () => {
      target.removeEventListener('mouseup', handleMouseUp as EventListener);
    };
  }, [targetSelector, handleSelection]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z / Cmd+Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const state = useAISentenceCombinerStore.getState();
        if (state.undoStack.length > 0) {
          e.preventDefault();
          undo();
          return;
        }
      }

      if (!isActive) return;

      // Enter to apply
      if (e.key === 'Enter' && previewText) {
        e.preventDefault();
        applyCombine();
        return;
      }

      // Escape to dismiss
      if (e.key === 'Escape') {
        e.preventDefault();
        if (previewText) {
          cancelCombine();
        } else {
          hideToolbar();
        }
        return;
      }

      // Number keys for quick option selection (1-4)
      if (!isLoading && !previewText && e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1;
        if (index < COMBINE_STRATEGIES.length) {
          e.preventDefault();
          requestCombine(COMBINE_STRATEGIES[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isLoading, previewText, applyCombine, cancelCombine, hideToolbar, requestCombine, undo]);

  // Handle click outside to dismiss
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        hideToolbar();
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActive, hideToolbar]);

  const handleOptionClick = (option: CombineStrategy) => {
    if (isLoading) return;
    requestCombine(option);
  };

  const handleApply = () => {
    applyCombine();
  };

  const handleCancel = () => {
    cancelCombine();
  };

  const getStrategyLabel = (strategy: CombineStrategy): string => {
    const option = COMBINE_STRATEGIES.find(o => o.id === strategy);
    return option?.label || strategy;
  };

  if (!isActive || !toolbarPosition) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        className={`ai-combine-toolbar ${previewText ? 'has-preview' : ''}`}
        style={{
          top: toolbarPosition.top,
          left: toolbarPosition.left,
        }}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="toolbar"
        aria-label="AI sentence combining options"
      >
        {/* Header */}
        <div className="ai-combine-header">
          <svg className="ai-combine-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 10H3M21 6H3M21 14H3M17 18H3" />
          </svg>
          <span className="ai-combine-title">Combine Sentences</span>
          <span className="ai-combine-badge">{sentences.length} sentences</span>
          <button
            type="button"
            className="ai-combine-close"
            onClick={() => hideToolbar()}
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

        {/* Error state */}
        {error && (
          <div className="ai-combine-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="ai-combine-error-dismiss">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="ai-combine-loading" aria-live="polite">
            <span className="ai-combine-dot"></span>
            <span className="ai-combine-dot"></span>
            <span className="ai-combine-dot"></span>
            <span className="ai-combine-loading-text">Combining sentences...</span>
          </div>
        )}

        {/* Preview state */}
        {previewText && !isLoading && (
          <div className="ai-combine-preview">
            <div className="ai-combine-preview-label">
              Preview ({selectedStrategy ? getStrategyLabel(selectedStrategy) : 'combined'}):
            </div>
            <div className="ai-combine-preview-content">
              <div className="ai-combine-original">
                <span className="ai-combine-label">Original ({sentences.length} sentences):</span>
                <span className="ai-combine-text">{selectedText}</span>
              </div>
              <div className="ai-combine-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </div>
              <div className="ai-combine-new">
                <span className="ai-combine-label">Combined (1 sentence):</span>
                <span className="ai-combine-text">{previewText}</span>
              </div>
            </div>
            <div className="ai-combine-preview-actions">
              <button
                type="button"
                className="ai-combine-btn ai-combine-apply"
                onClick={handleApply}
                aria-label="Apply combination (Enter)"
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Apply
                <kbd>Enter</kbd>
              </button>
              <button
                type="button"
                className="ai-combine-btn ai-combine-cancel-btn"
                onClick={handleCancel}
                aria-label="Cancel preview (Escape)"
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Cancel
                <kbd>Esc</kbd>
              </button>
            </div>
            <div className="ai-combine-hint" aria-live="polite">
              Press Escape to dismiss, Cmd+Z to undo after applying
            </div>
          </div>
        )}

        {/* Strategy options */}
        {!previewText && !isLoading && !error && (
          <div className="ai-combine-options" role="menu" aria-label="Combining strategy options">
            {COMBINE_STRATEGIES.map((option) => (
              <button
                key={option.id}
                type="button"
                className="ai-combine-option"
                onClick={() => handleOptionClick(option.id)}
                role="menuitem"
                aria-label={`${option.label}: ${option.description}`}
              >
                <span className="ai-combine-option-label">{option.label}</span>
                <span className="ai-combine-option-desc">{option.description}</span>
                <kbd className="ai-combine-option-shortcut">{option.shortcut}</kbd>
              </button>
            ))}
            <div className="ai-combine-hint">
              Hold Shift and select 2+ sentences to combine. Press 1-4 for quick selection.
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

AISentenceCombinerToolbar.displayName = 'AISentenceCombinerToolbar';
