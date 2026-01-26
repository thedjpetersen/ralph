import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useFormattingToolbarStore,
  useFormattingToolbar,
  FORMAT_ACTIONS,
  type FormatAction,
} from '../stores/formattingToolbar';
import { useAICustomPromptStore } from '../stores/aiCustomPrompt';
import './FormattingToolbar.css';

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

interface FormattingToolbarProps {
  /** CSS selector or element to attach selection listener to. If not provided, attaches to document. */
  targetSelector?: string;
}

export function FormattingToolbar({ targetSelector }: FormattingToolbarProps) {
  const { isActive, toolbarPosition, selectedText, selectionStart, selectionEnd, targetElement } = useFormattingToolbar();
  const { showToolbar, hideToolbar, applyFormat, undo } = useFormattingToolbarStore();
  const { showToolbar: showAIPrompt } = useAICustomPromptStore();

  const toolbarRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Handle text selection
  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 1) {
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
        const state = useFormattingToolbarStore.getState();
        if (state.undoStack.length > 0) {
          e.preventDefault();
          undo();
          return;
        }
      }

      if (!isActive) return;

      // Escape to dismiss
      if (e.key === 'Escape') {
        e.preventDefault();
        hideToolbar();
        return;
      }

      // Keyboard shortcuts for formatting (when toolbar is active)
      if (e.ctrlKey || e.metaKey) {
        let action: FormatAction | null = null;

        switch (e.key.toLowerCase()) {
          case 'b':
            action = 'bold';
            break;
          case 'i':
            action = 'italic';
            break;
          case 'u':
            action = 'underline';
            break;
          case 'e':
            if (e.shiftKey) {
              action = 'codeblock';
            } else {
              action = 'code';
            }
            break;
          case 'k':
            action = 'link';
            break;
          case 's':
            if (e.shiftKey) {
              action = 'strikethrough';
            }
            break;
        }

        if (action) {
          e.preventDefault();
          applyFormat(action);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, applyFormat, hideToolbar, undo]);

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

  const handleFormatClick = (action: FormatAction) => {
    applyFormat(action);
  };

  const handleAskAI = () => {
    if (selectedText && targetElement && toolbarPosition) {
      hideToolbar();
      showAIPrompt(selectedText, selectionStart, selectionEnd, targetElement, toolbarPosition);
    }
  };

  if (!isActive || !toolbarPosition) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        className="formatting-toolbar"
        style={{
          top: toolbarPosition.top,
          left: toolbarPosition.left,
        }}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="toolbar"
        aria-label="Text formatting options"
      >
        <div className="formatting-toolbar-buttons">
          {FORMAT_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`formatting-toolbar-btn formatting-toolbar-btn-${action.id}`}
              onClick={() => handleFormatClick(action.id)}
              title={`${action.label} (${action.shortcut})`}
              aria-label={action.label}
            >
              <span className="formatting-toolbar-btn-icon">{action.icon}</span>
            </button>
          ))}
        </div>
        <div className="formatting-toolbar-divider" aria-hidden="true" />
        <button
          type="button"
          className="formatting-toolbar-btn formatting-toolbar-btn-ai"
          onClick={handleAskAI}
          title="Ask AI..."
          aria-label="Ask AI about selected text"
        >
          <svg className="formatting-toolbar-ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
            <circle cx="8" cy="14" r="1.5" fill="currentColor" />
            <circle cx="16" cy="14" r="1.5" fill="currentColor" />
          </svg>
        </button>
        <div className="formatting-toolbar-divider" aria-hidden="true" />
        <button
          type="button"
          className="formatting-toolbar-close"
          onClick={() => hideToolbar()}
          aria-label="Close toolbar"
          title="Close (Esc)"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

FormattingToolbar.displayName = 'FormattingToolbar';
