import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAITransitionSuggestionsStore,
  useAITransitionSuggestions,
  TRANSITION_CATEGORIES,
  type TransitionSuggestion,
  type ParagraphGap,
} from '../stores/aiTransitionSuggestions';
import './AITransitionSuggestionsToolbar.css';

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

interface TransitionIndicatorProps {
  gap: ParagraphGap;
  textareaRef: HTMLTextAreaElement | HTMLInputElement;
  onClick: (position: { top: number; left: number }) => void;
  isActive: boolean;
}

function TransitionIndicator({ gap, textareaRef, onClick, isActive }: TransitionIndicatorProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const indicatorRef = useRef<HTMLButtonElement>(null);

  // Calculate position based on text content
  useEffect(() => {
    if (!textareaRef) return;

    const updatePosition = () => {
      const textarea = textareaRef;
      const textareaRect = textarea.getBoundingClientRect();

      // Create a hidden div to measure text position
      const measureDiv = document.createElement('div');
      measureDiv.style.cssText = window.getComputedStyle(textarea).cssText;
      measureDiv.style.position = 'absolute';
      measureDiv.style.visibility = 'hidden';
      measureDiv.style.whiteSpace = 'pre-wrap';
      measureDiv.style.wordWrap = 'break-word';
      measureDiv.style.width = `${textarea.clientWidth}px`;
      measureDiv.style.height = 'auto';
      measureDiv.style.overflow = 'hidden';

      // Text before the gap position
      const textBefore = textarea.value.slice(0, gap.position);
      measureDiv.textContent = textBefore;

      document.body.appendChild(measureDiv);
      const textHeight = measureDiv.scrollHeight;
      document.body.removeChild(measureDiv);

      // Calculate position relative to textarea
      const scrollTop = textarea.scrollTop;
      const top = textareaRect.top + textHeight - scrollTop + window.scrollY;
      const left = textareaRect.left + 20;

      setPosition({ top, left });
    };

    updatePosition();

    // Update position on scroll and resize
    const handleScroll = () => updatePosition();
    textareaRef.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updatePosition);

    return () => {
      textareaRef.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updatePosition);
    };
  }, [gap.position, textareaRef]);

  const handleClick = useCallback(() => {
    if (position) {
      onClick({ top: position.top, left: position.left + 30 });
    }
  }, [onClick, position]);

  if (!position || !gap.needsTransition) return null;

  const scoreColor = gap.score > 0.7 ? '#ef4444' : gap.score > 0.5 ? '#f59e0b' : '#3b82f6';

  return (
    <motion.button
      ref={indicatorRef}
      type="button"
      className={`transition-indicator ${isActive ? 'active' : ''}`}
      style={{
        top: position.top,
        left: position.left,
        '--indicator-color': scoreColor,
      } as React.CSSProperties}
      onClick={handleClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      aria-label="Add transition between paragraphs"
      title={`Transition needed (confidence: ${Math.round(gap.score * 100)}%)`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.button>
  );
}

interface AITransitionSuggestionsToolbarProps {
  targetSelector?: string;
}

export function AITransitionSuggestionsToolbar({ targetSelector }: AITransitionSuggestionsToolbarProps) {
  const {
    isEnabled,
    targetElement,
    paragraphGaps,
    activeGapIndex,
    suggestions,
    isLoading,
    error,
    previewText,
    selectedSuggestion,
    popupPosition,
  } = useAITransitionSuggestions();

  const {
    setTargetElement,
    analyzeText,
    showSuggestionsForGap,
    hideSuggestions,
    selectSuggestion,
    applyTransition,
    cancelPreview,
    undo,
    clearError,
  } = useAITransitionSuggestionsStore();

  const popupRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Group suggestions by category for display
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, TransitionSuggestion[]> = {};
    suggestions.forEach(s => {
      if (!groups[s.category]) {
        groups[s.category] = [];
      }
      groups[s.category].push(s);
    });
    return groups;
  }, [suggestions]);

  // Set up target element monitoring
  useEffect(() => {
    if (!isEnabled) return;

    let target: HTMLTextAreaElement | HTMLInputElement | null = null;

    if (targetSelector) {
      const el = document.querySelector(targetSelector);
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
        target = el;
      }
    }

    // Also listen for focus on any textarea
    const handleFocus = (e: FocusEvent) => {
      if (
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLInputElement && e.target.type === 'text')
      ) {
        setTargetElement(e.target);
      }
    };

    document.addEventListener('focusin', handleFocus);

    if (target) {
      setTargetElement(target);
    }

    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, [isEnabled, targetSelector, setTargetElement]);

  // Listen for text changes to re-analyze
  useEffect(() => {
    if (!targetElement || !isEnabled) return;

    const handleInput = () => {
      // Debounce analysis
      const timeout = setTimeout(() => {
        analyzeText();
      }, 500);

      return () => clearTimeout(timeout);
    };

    targetElement.addEventListener('input', handleInput);
    return () => targetElement.removeEventListener('input', handleInput);
  }, [targetElement, isEnabled, analyzeText]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo support
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const state = useAITransitionSuggestionsStore.getState();
        if (state.undoStack.length > 0) {
          e.preventDefault();
          undo();
          return;
        }
      }

      if (activeGapIndex === null) return;

      // Enter to apply
      if (e.key === 'Enter' && previewText) {
        e.preventDefault();
        applyTransition();
        return;
      }

      // Escape to dismiss
      if (e.key === 'Escape') {
        e.preventDefault();
        if (previewText) {
          cancelPreview();
        } else {
          hideSuggestions();
        }
        return;
      }

      // Number keys for quick selection (1-9)
      if (!isLoading && !previewText && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index < suggestions.length) {
          e.preventDefault();
          selectSuggestion(suggestions[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeGapIndex, isLoading, previewText, suggestions, applyTransition, cancelPreview, hideSuggestions, selectSuggestion, undo]);

  // Handle click outside to dismiss
  useEffect(() => {
    if (activeGapIndex === null) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        // Check if clicking on an indicator
        if ((e.target as HTMLElement).closest('.transition-indicator')) {
          return;
        }
        hideSuggestions();
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeGapIndex, hideSuggestions]);

  const handleIndicatorClick = useCallback((gapIndex: number, position: { top: number; left: number }) => {
    showSuggestionsForGap(gapIndex, position);
  }, [showSuggestionsForGap]);

  const handleSuggestionClick = useCallback((suggestion: TransitionSuggestion) => {
    selectSuggestion(suggestion);
  }, [selectSuggestion]);

  const getCategoryConfig = (categoryId: string) => {
    return TRANSITION_CATEGORIES.find(c => c.id === categoryId);
  };

  if (!isEnabled) return null;

  return (
    <>
      {/* Transition Indicators */}
      <AnimatePresence>
        {targetElement && paragraphGaps.map((gap, idx) => (
          <TransitionIndicator
            key={`gap-${gap.index}`}
            gap={gap}
            textareaRef={targetElement}
            onClick={(pos) => handleIndicatorClick(idx, pos)}
            isActive={activeGapIndex === idx}
          />
        ))}
      </AnimatePresence>

      {/* Suggestions Popup */}
      <AnimatePresence>
        {activeGapIndex !== null && popupPosition && (
          <motion.div
            ref={popupRef}
            className={`transition-suggestions-popup ${previewText ? 'has-preview' : ''}`}
            style={{
              top: popupPosition.top,
              left: popupPosition.left,
            }}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="dialog"
            aria-label="Transition suggestions"
          >
            {/* Header */}
            <div className="transition-popup-header">
              <svg className="transition-popup-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 5l7 7-7 7M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="transition-popup-title">Add Transition</span>
              <button
                type="button"
                className="transition-popup-close"
                onClick={hideSuggestions}
                aria-label="Close suggestions"
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
              <div className="transition-popup-error" role="alert">
                <span>{error}</span>
                <button type="button" onClick={clearError} className="transition-error-dismiss">
                  Dismiss
                </button>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="transition-popup-loading" aria-live="polite">
                <span className="transition-dot"></span>
                <span className="transition-dot"></span>
                <span className="transition-dot"></span>
                <span className="transition-loading-text">Finding transitions...</span>
              </div>
            )}

            {/* Preview state */}
            {previewText && !isLoading && selectedSuggestion && (
              <div className="transition-preview">
                <div className="transition-preview-label">
                  Preview:
                </div>
                <div className="transition-preview-content">
                  <span
                    className="transition-preview-text"
                    style={{ '--category-color': getCategoryConfig(selectedSuggestion.category)?.color } as React.CSSProperties}
                  >
                    {previewText}
                  </span>
                  <span className="transition-preview-category">
                    {getCategoryConfig(selectedSuggestion.category)?.label}
                  </span>
                </div>
                <div className="transition-preview-actions">
                  <button
                    type="button"
                    className="transition-btn transition-apply"
                    onClick={applyTransition}
                    aria-label="Apply transition (Enter)"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Insert
                    <kbd>Enter</kbd>
                  </button>
                  <button
                    type="button"
                    className="transition-btn transition-cancel-btn"
                    onClick={cancelPreview}
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
              </div>
            )}

            {/* Suggestions list */}
            {!previewText && !isLoading && !error && (
              <div className="transition-suggestions-list" role="menu" aria-label="Transition options">
                {Object.entries(groupedSuggestions).map(([category, categorySuggestions]) => (
                  <div key={category} className="transition-category-group">
                    <div
                      className="transition-category-label"
                      style={{ '--category-color': getCategoryConfig(category)?.color } as React.CSSProperties}
                    >
                      {getCategoryConfig(category)?.label}
                    </div>
                    {categorySuggestions.map((suggestion) => {
                      const globalIndex = suggestions.findIndex(s => s.id === suggestion.id);
                      return (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="transition-suggestion-option"
                          onClick={() => handleSuggestionClick(suggestion)}
                          role="menuitem"
                          aria-label={`${suggestion.text} - ${suggestion.description}`}
                        >
                          <span className="transition-suggestion-text">{suggestion.text}</span>
                          {globalIndex < 9 && (
                            <kbd className="transition-suggestion-shortcut">{globalIndex + 1}</kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="transition-popup-hint">
                  Click a phrase to preview, then Insert to apply. Press 1-9 for quick selection.
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

AITransitionSuggestionsToolbar.displayName = 'AITransitionSuggestionsToolbar';
