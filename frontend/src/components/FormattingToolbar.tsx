import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useFormattingToolbarStore,
  useFormattingToolbar,
  FORMAT_ACTIONS,
  type FormatAction,
} from '../stores/formattingToolbar';
import { useAICustomPromptStore } from '../stores/aiCustomPrompt';
import { useTextHighlightStore } from '../stores/textHighlight';
import { HighlightColorPicker } from './HighlightColorPicker';
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

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 640px)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

function useVirtualKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const viewport = window.visualViewport;

    const handleResize = () => {
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const diff = windowHeight - viewportHeight;
      setKeyboardHeight(diff > 100 ? diff : 0);
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);
    handleResize();

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  return keyboardHeight;
}

// Split actions into primary (most used) and secondary (overflow)
const PRIMARY_ACTIONS = FORMAT_ACTIONS.slice(0, 4); // bold, italic, underline, strikethrough
const SECONDARY_ACTIONS = FORMAT_ACTIONS.slice(4); // code, codeblock, link

interface FormattingToolbarProps {
  /** CSS selector or element to attach selection listener to. If not provided, attaches to document. */
  targetSelector?: string;
}

export function FormattingToolbar({ targetSelector }: FormattingToolbarProps) {
  const { isActive, toolbarPosition, selectedText, selectionStart, selectionEnd, targetElement } = useFormattingToolbar();
  const { showToolbar, hideToolbar, applyFormat, undo } = useFormattingToolbarStore();
  const { showToolbar: showAIPrompt } = useAICustomPromptStore();
  const { openColorPicker } = useTextHighlightStore();

  const toolbarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const keyboardHeight = useVirtualKeyboardHeight();
  const [showOverflow, setShowOverflow] = useState(false);

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

      // Escape to dismiss (also close overflow menu)
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowOverflow(false);
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

  // Create a wrapper to hide toolbar and reset overflow state
  const handleHideToolbar = useCallback(() => {
    setShowOverflow(false);
    hideToolbar();
  }, [hideToolbar]);

  // Handle click outside to dismiss
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        handleHideToolbar();
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
  }, [isActive, handleHideToolbar]);

  const handleFormatClick = (action: FormatAction) => {
    applyFormat(action);
    setShowOverflow(false);
  };

  const handleAskAI = () => {
    if (selectedText && targetElement && toolbarPosition) {
      handleHideToolbar();
      showAIPrompt(selectedText, selectionStart, selectionEnd, targetElement, toolbarPosition);
    }
  };

  const handleHighlight = () => {
    if (selectedText && targetElement && toolbarPosition) {
      handleHideToolbar();
      openColorPicker(selectedText, selectionStart, selectionEnd, targetElement, toolbarPosition);
    }
  };

  const toggleOverflow = () => {
    setShowOverflow((prev) => !prev);
  };

  // Calculate mobile-adjusted position
  const getMobileAdjustedPosition = () => {
    if (!toolbarPosition) return toolbarPosition;

    if (isMobile && keyboardHeight > 0) {
      // When keyboard is visible, position toolbar above the keyboard
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      return {
        top: viewportHeight - 60, // Position above keyboard with some margin
        left: window.innerWidth / 2, // Center horizontally
      };
    }

    return toolbarPosition;
  };

  const adjustedPosition = getMobileAdjustedPosition();

  if (!isActive || !adjustedPosition) {
    // Still render the color picker even when main toolbar is hidden
    return <HighlightColorPicker prefersReducedMotion={prefersReducedMotion} />;
  }

  // Desktop layout: Show all actions
  // Mobile layout: Show primary actions + overflow menu
  const actionsToShow = isMobile ? PRIMARY_ACTIONS : FORMAT_ACTIONS;

  return (
    <>
    <HighlightColorPicker prefersReducedMotion={prefersReducedMotion} />
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        className={`formatting-toolbar ${isMobile ? 'formatting-toolbar-mobile' : ''}`}
        style={{
          top: adjustedPosition.top,
          left: adjustedPosition.left,
          ...(isMobile && keyboardHeight > 0 ? { position: 'fixed', transform: 'translateX(-50%)' } : {}),
        }}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="toolbar"
        aria-label="Text formatting options"
      >
        <div
          ref={scrollContainerRef}
          className="formatting-toolbar-scroll-container"
        >
          <div className="formatting-toolbar-buttons">
            {actionsToShow.map((action) => (
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
            <button
              type="button"
              className="formatting-toolbar-btn formatting-toolbar-btn-highlight"
              onClick={handleHighlight}
              title="Highlight"
              aria-label="Highlight text with color"
            >
              <svg className="formatting-toolbar-highlight-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Overflow menu for mobile */}
        {isMobile && SECONDARY_ACTIONS.length > 0 && (
          <>
            <div className="formatting-toolbar-divider" aria-hidden="true" />
            <div className="formatting-toolbar-overflow-wrapper">
              <button
                type="button"
                className={`formatting-toolbar-btn formatting-toolbar-btn-overflow ${showOverflow ? 'active' : ''}`}
                onClick={toggleOverflow}
                title="More formatting options"
                aria-label="More formatting options"
                aria-expanded={showOverflow}
                aria-haspopup="menu"
              >
                <svg className="formatting-toolbar-overflow-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </button>
              <AnimatePresence>
                {showOverflow && (
                  <motion.div
                    className="formatting-toolbar-overflow-menu"
                    initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.1 }}
                    role="menu"
                    aria-label="Additional formatting options"
                  >
                    {SECONDARY_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        className="formatting-toolbar-overflow-item"
                        onClick={() => handleFormatClick(action.id)}
                        role="menuitem"
                      >
                        <span className="formatting-toolbar-overflow-item-icon">{action.icon}</span>
                        <span className="formatting-toolbar-overflow-item-label">{action.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

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
          onClick={handleHideToolbar}
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
    </>
  );
}

FormattingToolbar.displayName = 'FormattingToolbar';
