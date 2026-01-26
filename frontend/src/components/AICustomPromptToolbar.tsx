import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAICustomPromptStore,
  useAICustomPrompt,
} from '../stores/aiCustomPrompt';
import './AICustomPromptToolbar.css';

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

interface AICustomPromptToolbarProps {
  /** CSS selector or element to attach selection listener to. If not provided, attaches to document. */
  targetSelector?: string;
}

export function AICustomPromptToolbar({ targetSelector }: AICustomPromptToolbarProps) {
  const {
    isActive,
    selectedText,
    isLoading,
    responseText,
    error,
    toolbarPosition,
    isInputExpanded,
    promptText,
    recentPrompts,
  } = useAICustomPrompt();

  const {
    showToolbar,
    hideToolbar,
    expandInput,
    collapseInput,
    setPromptText,
    submitPrompt,
    applyResponse,
    cancelPrompt,
    undo,
    clearError,
    selectRecentPrompt,
  } = useAICustomPromptStore();

  const toolbarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [showSuggestions, setShowSuggestions] = useState(false);

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

    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;

    let element: HTMLTextAreaElement | HTMLInputElement | null = null;

    const parentElement = anchorNode.parentElement;
    if (parentElement) {
      const editableParent = parentElement.closest('textarea, input[type="text"]');
      if (editableParent) {
        element = editableParent as HTMLTextAreaElement | HTMLInputElement;
      }
    }

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

    const selectionStart = element.selectionStart ?? 0;
    const selectionEnd = element.selectionEnd ?? 0;

    if (selectionStart === selectionEnd) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const position = {
      top: rect.top + window.scrollY - 10,
      left: rect.left + window.scrollX + rect.width / 2,
    };

    showToolbar(selectedText, selectionStart, selectionEnd, element, position);
  }, [showToolbar]);

  // Listen for Alt+click selection (to differentiate from regular formatting toolbar)
  useEffect(() => {
    let target: Document | Element = document;

    if (targetSelector) {
      const el = document.querySelector(targetSelector);
      if (el) target = el;
    }

    const handleMouseUp = (e: MouseEvent) => {
      // Only trigger on Alt+click to avoid conflict with other toolbars
      if (e.altKey) {
        setTimeout(handleSelection, 10);
      }
    };

    target.addEventListener('mouseup', handleMouseUp as EventListener);

    return () => {
      target.removeEventListener('mouseup', handleMouseUp as EventListener);
    };
  }, [targetSelector, handleSelection]);

  // Focus input when expanded
  useEffect(() => {
    if (isInputExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isInputExpanded]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z / Cmd+Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const state = useAICustomPromptStore.getState();
        if (state.undoStack.length > 0) {
          e.preventDefault();
          undo();
          return;
        }
      }

      if (!isActive) return;

      // Enter to submit (when input is focused and has text)
      if (e.key === 'Enter' && isInputExpanded && promptText.trim() && !isLoading) {
        e.preventDefault();
        setShowSuggestions(false);
        submitPrompt();
        return;
      }

      // Escape to dismiss
      if (e.key === 'Escape') {
        e.preventDefault();
        if (responseText) {
          cancelPrompt();
        } else if (isInputExpanded) {
          collapseInput();
        } else {
          hideToolbar();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isInputExpanded, promptText, isLoading, responseText, submitPrompt, cancelPrompt, collapseInput, hideToolbar, undo]);

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

  const handleAskAIClick = () => {
    expandInput();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPromptText(e.target.value);
    setShowSuggestions(e.target.value.length === 0 && recentPrompts.length > 0);
  };

  const handleInputFocus = () => {
    if (promptText.length === 0 && recentPrompts.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSuggestionClick = (prompt: string) => {
    selectRecentPrompt(prompt);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptText.trim() && !isLoading) {
      setShowSuggestions(false);
      submitPrompt();
    }
  };

  const handleDone = () => {
    applyResponse();
  };

  const handleCancel = () => {
    cancelPrompt();
  };

  if (!isActive || !toolbarPosition) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={toolbarRef}
        className={`ai-custom-prompt-toolbar ${isInputExpanded ? 'expanded' : ''} ${responseText ? 'has-response' : ''}`}
        style={{
          top: toolbarPosition.top,
          left: toolbarPosition.left,
        }}
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="toolbar"
        aria-label="AI custom prompt options"
      >
        {/* Header */}
        <div className="ai-custom-prompt-header">
          <svg className="ai-custom-prompt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
            <circle cx="8" cy="14" r="1.5" fill="currentColor" />
            <circle cx="16" cy="14" r="1.5" fill="currentColor" />
          </svg>
          <span className="ai-custom-prompt-title">Ask AI</span>
          <button
            type="button"
            className="ai-custom-prompt-close"
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
          <div className="ai-custom-prompt-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="ai-custom-prompt-error-dismiss">
              Dismiss
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="ai-custom-prompt-loading" aria-live="polite">
            <span className="ai-custom-prompt-dot"></span>
            <span className="ai-custom-prompt-dot"></span>
            <span className="ai-custom-prompt-dot"></span>
            <span className="ai-custom-prompt-loading-text">Thinking...</span>
          </div>
        )}

        {/* Response state */}
        {responseText && !isLoading && (
          <div className="ai-custom-prompt-response">
            <div className="ai-custom-prompt-response-label">AI Response:</div>
            <div className="ai-custom-prompt-response-content">
              <p className="ai-custom-prompt-response-text">{responseText}</p>
            </div>
            <div className="ai-custom-prompt-response-actions">
              <button
                type="button"
                className="ai-custom-prompt-btn ai-custom-prompt-done"
                onClick={handleDone}
                aria-label="Done (Enter)"
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Done
              </button>
              <button
                type="button"
                className="ai-custom-prompt-btn ai-custom-prompt-cancel-btn"
                onClick={handleCancel}
                aria-label="Ask another question (Escape)"
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Ask Again
              </button>
            </div>
          </div>
        )}

        {/* Initial state - Ask AI button */}
        {!isInputExpanded && !responseText && !isLoading && !error && (
          <div className="ai-custom-prompt-initial">
            <button
              type="button"
              className="ai-custom-prompt-ask-btn"
              onClick={handleAskAIClick}
              aria-label="Ask AI about selected text"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="ai-custom-prompt-ask-icon">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>Ask AI...</span>
              <kbd className="ai-custom-prompt-shortcut">Alt+Click</kbd>
            </button>
            <div className="ai-custom-prompt-hint">
              Select text and Alt+Click to ask AI any question
            </div>
          </div>
        )}

        {/* Input state - expanded prompt input */}
        {isInputExpanded && !responseText && !isLoading && (
          <div className="ai-custom-prompt-input-container">
            <form onSubmit={handleSubmit} className="ai-custom-prompt-form">
              <div className="ai-custom-prompt-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  className="ai-custom-prompt-input"
                  placeholder="Ask anything about this text..."
                  value={promptText}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  aria-label="Enter your prompt"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="ai-custom-prompt-submit"
                  disabled={!promptText.trim() || isLoading}
                  aria-label="Submit prompt"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
              {/* Recent prompts suggestions */}
              {showSuggestions && recentPrompts.length > 0 && (
                <div className="ai-custom-prompt-suggestions" role="listbox" aria-label="Recent prompts">
                  <div className="ai-custom-prompt-suggestions-label">Recent:</div>
                  {recentPrompts.slice(0, 5).map((prompt, index) => (
                    <button
                      key={`${prompt.text}-${index}`}
                      type="button"
                      className="ai-custom-prompt-suggestion"
                      onClick={() => handleSuggestionClick(prompt.text)}
                      role="option"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="ai-custom-prompt-suggestion-icon">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <span className="ai-custom-prompt-suggestion-text">{prompt.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>
            <div className="ai-custom-prompt-input-hint">
              Press Enter to submit, Escape to cancel
            </div>
          </div>
        )}

        {/* Selected text preview */}
        {selectedText && !responseText && (
          <div className="ai-custom-prompt-selection">
            <span className="ai-custom-prompt-selection-label">Selected:</span>
            <span className="ai-custom-prompt-selection-text">
              {selectedText.length > 50 ? `${selectedText.slice(0, 50)}...` : selectedText}
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

AICustomPromptToolbar.displayName = 'AICustomPromptToolbar';
