import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAIRewriteStore,
  useAIRewrite,
  REWRITE_OPTIONS,
  type RewriteOption,
} from '../stores/aiRewrite';
import './AIRewriteToolbar.css';

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

interface AIRewriteToolbarProps {
  /** CSS selector or element to attach selection listener to. If not provided, attaches to document. */
  targetSelector?: string;
}

export function AIRewriteToolbar({ targetSelector }: AIRewriteToolbarProps) {
  const { isActive, selectedText, isLoading, previewText, error, toolbarPosition } = useAIRewrite();
  const {
    showToolbar,
    hideToolbar,
    requestRewrite,
    applyRewrite,
    cancelRewrite,
    undo,
    clearError,
  } = useAIRewriteStore();

  const toolbarRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Handle text selection
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 2) {
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

    // Also check the active element (common case for input/textarea selection)
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

  // Listen for selection changes
  useEffect(() => {
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
    };
  }, [targetSelector, handleSelection]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z / Cmd+Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        // Only intercept if we have something in our undo stack
        const state = useAIRewriteStore.getState();
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
        applyRewrite();
        return;
      }

      // Escape to dismiss
      if (e.key === 'Escape') {
        e.preventDefault();
        if (previewText) {
          cancelRewrite();
        } else {
          hideToolbar();
        }
        return;
      }

      // Number keys for quick option selection (1-5)
      if (!isLoading && !previewText && e.key >= '1' && e.key <= '5') {
        const index = parseInt(e.key) - 1;
        if (index < REWRITE_OPTIONS.length) {
          e.preventDefault();
          requestRewrite(REWRITE_OPTIONS[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isLoading, previewText, applyRewrite, cancelRewrite, hideToolbar, requestRewrite, undo]);

  // Handle click outside to dismiss
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        hideToolbar();
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
  }, [isActive, hideToolbar]);

  const handleOptionClick = (option: RewriteOption) => {
    if (isLoading) return;
    requestRewrite(option);
  };

  const handleApply = () => {
    applyRewrite();
  };

  const handleCancel = () => {
    cancelRewrite();
  };

  if (!isActive || !toolbarPosition) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        className={`ai-rewrite-toolbar ${previewText ? 'has-preview' : ''}`}
        style={{
          top: toolbarPosition.top,
          left: toolbarPosition.left,
        }}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="toolbar"
        aria-label="AI rewrite options"
      >
        {/* Header */}
        <div className="ai-rewrite-header">
          <svg className="ai-rewrite-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
            <circle cx="8" cy="14" r="1.5" fill="currentColor" />
            <circle cx="16" cy="14" r="1.5" fill="currentColor" />
          </svg>
          <span className="ai-rewrite-title">AI Rewrite</span>
          <button
            type="button"
            className="ai-rewrite-close"
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
          <div className="ai-rewrite-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="ai-rewrite-error-dismiss">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="ai-rewrite-loading" aria-live="polite">
            <span className="ai-rewrite-dot"></span>
            <span className="ai-rewrite-dot"></span>
            <span className="ai-rewrite-dot"></span>
            <span className="ai-rewrite-loading-text">Rewriting...</span>
          </div>
        )}

        {/* Preview state */}
        {previewText && !isLoading && (
          <div className="ai-rewrite-preview">
            <div className="ai-rewrite-preview-label">Preview:</div>
            <div className="ai-rewrite-preview-content">
              <div className="ai-rewrite-original">
                <span className="ai-rewrite-label">Original:</span>
                <span className="ai-rewrite-text">{selectedText}</span>
              </div>
              <div className="ai-rewrite-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </div>
              <div className="ai-rewrite-new">
                <span className="ai-rewrite-label">New:</span>
                <span className="ai-rewrite-text">{previewText}</span>
              </div>
            </div>
            <div className="ai-rewrite-preview-actions">
              <button
                type="button"
                className="ai-rewrite-btn ai-rewrite-apply"
                onClick={handleApply}
                aria-label="Apply rewrite (Enter)"
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
                className="ai-rewrite-btn ai-rewrite-cancel-btn"
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
            <div className="ai-rewrite-hint" aria-live="polite">
              Press Escape to dismiss, Cmd+Z to undo after applying
            </div>
          </div>
        )}

        {/* Rewrite options */}
        {!previewText && !isLoading && !error && (
          <div className="ai-rewrite-options" role="menu" aria-label="Rewrite options">
            {REWRITE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="ai-rewrite-option"
                onClick={() => handleOptionClick(option.id)}
                role="menuitem"
                aria-label={`${option.label}: ${option.description}`}
              >
                <span className="ai-rewrite-option-label">{option.label}</span>
                <span className="ai-rewrite-option-desc">{option.description}</span>
                <kbd className="ai-rewrite-option-shortcut">{option.shortcut}</kbd>
              </button>
            ))}
            <div className="ai-rewrite-hint">
              Select text and choose a rewrite style. Press 1-5 for quick selection.
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

AIRewriteToolbar.displayName = 'AIRewriteToolbar';
