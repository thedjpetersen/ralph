import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAIToneStore,
  useAITone,
  TONE_OPTIONS,
  type ToneOption,
} from '../stores/aiTone';
import './AIToneToolbar.css';

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

interface AIToneToolbarProps {
  /** CSS selector or element to attach selection listener to. If not provided, attaches to document. */
  targetSelector?: string;
}

export function AIToneToolbar({ targetSelector }: AIToneToolbarProps) {
  const { isActive, selectedText, isLoading, previewText, error, toolbarPosition, selectedTone } = useAITone();
  const {
    showToolbar,
    hideToolbar,
    requestToneAdjustment,
    applyToneAdjustment,
    cancelToneAdjustment,
    undo,
    clearError,
  } = useAIToneStore();

  const toolbarRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Handle text selection with Alt/Option key held
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

  // Listen for selection changes with Alt key
  useEffect(() => {
    let target: Document | Element = document;

    if (targetSelector) {
      const el = document.querySelector(targetSelector);
      if (el) target = el;
    }

    const handleMouseUp = (e: MouseEvent) => {
      // Only trigger tone toolbar if Alt/Option key is held
      if (e.altKey) {
        // Small delay to let selection finalize
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
        // Only intercept if we have something in our undo stack
        const state = useAIToneStore.getState();
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
        applyToneAdjustment();
        return;
      }

      // Escape to dismiss
      if (e.key === 'Escape') {
        e.preventDefault();
        if (previewText) {
          cancelToneAdjustment();
        } else {
          hideToolbar();
        }
        return;
      }

      // Number keys for quick option selection (1-6)
      if (!isLoading && !previewText && e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key) - 1;
        if (index < TONE_OPTIONS.length) {
          e.preventDefault();
          requestToneAdjustment(TONE_OPTIONS[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isLoading, previewText, applyToneAdjustment, cancelToneAdjustment, hideToolbar, requestToneAdjustment, undo]);

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

  const handleOptionClick = (option: ToneOption) => {
    if (isLoading) return;
    requestToneAdjustment(option);
  };

  const handleApply = () => {
    applyToneAdjustment();
  };

  const handleCancel = () => {
    cancelToneAdjustment();
  };

  const getToneLabel = (tone: ToneOption): string => {
    const option = TONE_OPTIONS.find(o => o.id === tone);
    return option?.label || tone;
  };

  if (!isActive || !toolbarPosition) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        className={`ai-tone-toolbar ${previewText ? 'has-preview' : ''}`}
        style={{
          top: toolbarPosition.top,
          left: toolbarPosition.left,
        }}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="toolbar"
        aria-label="AI tone adjustment options"
      >
        {/* Header */}
        <div className="ai-tone-header">
          <svg className="ai-tone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span className="ai-tone-title">Adjust Tone</span>
          <button
            type="button"
            className="ai-tone-close"
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
          <div className="ai-tone-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="ai-tone-error-dismiss">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="ai-tone-loading" aria-live="polite">
            <span className="ai-tone-dot"></span>
            <span className="ai-tone-dot"></span>
            <span className="ai-tone-dot"></span>
            <span className="ai-tone-loading-text">Adjusting tone...</span>
          </div>
        )}

        {/* Preview state */}
        {previewText && !isLoading && (
          <div className="ai-tone-preview">
            <div className="ai-tone-preview-label">
              Preview ({selectedTone ? getToneLabel(selectedTone) : 'adjusted'}):
            </div>
            <div className="ai-tone-preview-content">
              <div className="ai-tone-original">
                <span className="ai-tone-label">Original:</span>
                <span className="ai-tone-text">{selectedText}</span>
              </div>
              <div className="ai-tone-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
              </div>
              <div className="ai-tone-new">
                <span className="ai-tone-label">New:</span>
                <span className="ai-tone-text">{previewText}</span>
              </div>
            </div>
            <div className="ai-tone-preview-actions">
              <button
                type="button"
                className="ai-tone-btn ai-tone-apply"
                onClick={handleApply}
                aria-label="Apply tone adjustment (Enter)"
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
                className="ai-tone-btn ai-tone-cancel-btn"
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
            <div className="ai-tone-hint" aria-live="polite">
              Press Escape to dismiss, Cmd+Z to undo after applying
            </div>
          </div>
        )}

        {/* Tone options */}
        {!previewText && !isLoading && !error && (
          <div className="ai-tone-options" role="menu" aria-label="Tone options">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="ai-tone-option"
                onClick={() => handleOptionClick(option.id)}
                role="menuitem"
                aria-label={`${option.label}: ${option.description}`}
              >
                <span className="ai-tone-option-label">{option.label}</span>
                <span className="ai-tone-option-desc">{option.description}</span>
                <kbd className="ai-tone-option-shortcut">{option.shortcut}</kbd>
              </button>
            ))}
            <div className="ai-tone-hint">
              Hold Alt/Option and select text to adjust tone. Press 1-6 for quick selection.
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

AIToneToolbar.displayName = 'AIToneToolbar';
