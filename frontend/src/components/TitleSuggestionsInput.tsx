/**
 * Title Suggestions Input
 *
 * An input component with AI-powered title suggestions.
 * Features a sparkle icon that opens a popover with generated title options.
 */

import { useRef, useEffect, useCallback, type InputHTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAITitleSuggestionsStore } from '../stores/aiTitleSuggestions';
import './TitleSuggestionsInput.css';

// Sparkle icon for AI suggestions
const SparkleIcon = () => (
  <svg
    className="title-suggestions-sparkle-icon"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M8 1L9.5 5.5L14 7L9.5 8.5L8 13L6.5 8.5L2 7L6.5 5.5L8 1Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12.5 1L13 2.5L14.5 3L13 3.5L12.5 5L12 3.5L10.5 3L12 2.5L12.5 1Z"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 11L3.5 12.5L5 13L3.5 13.5L3 15L2.5 13.5L1 13L2.5 12.5L3 11Z"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Regenerate icon
const RegenerateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M1.5 7a5.5 5.5 0 0 1 9.548-3.75M12.5 7a5.5 5.5 0 0 1-9.548 3.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M11.048 1v2.25h-2.25M2.952 13v-2.25h2.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface TitleSuggestionsInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Current title value */
  value: string;
  /** Called when title changes */
  onChange: (value: string) => void;
  /** Document content used to generate title suggestions (first 500 words used) */
  documentContent: string;
  /** Optional label for the input */
  label?: string;
  /** Optional error message */
  error?: string;
  /** Optional hint text */
  hint?: string;
}

export function TitleSuggestionsInput({
  value,
  onChange,
  documentContent,
  label,
  error,
  hint,
  className = '',
  ...props
}: TitleSuggestionsInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const {
    suggestions,
    isLoading,
    error: storeError,
    isOpen,
    generateSuggestions,
    regenerateSuggestions,
    closeSuggestions,
    clearError,
  } = useAITitleSuggestionsStore();

  // Handle sparkle button click
  const handleSparkleClick = useCallback(() => {
    if (isLoading) return;
    generateSuggestions(documentContent);
  }, [documentContent, generateSuggestions, isLoading]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(
    (suggestionText: string) => {
      onChange(suggestionText);
      closeSuggestions();
    },
    [onChange, closeSuggestions]
  );

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    if (isLoading) return;
    regenerateSuggestions(documentContent);
  }, [documentContent, isLoading, regenerateSuggestions]);

  // Handle click outside to close popover
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeSuggestions();
      }
    };

    // Delay adding listener to prevent immediate close
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeSuggestions]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSuggestions();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeSuggestions]);

  const displayError = error || storeError;

  return (
    <div className="title-suggestions-wrapper" ref={containerRef}>
      {label && (
        <label className="title-suggestions-label">
          {label}
          {props.required && (
            <span className="title-suggestions-required" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}

      <div className="title-suggestions-input-container">
        <input
          type="text"
          className={`title-suggestions-input ${displayError ? 'has-error' : ''} ${className}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />

        <button
          type="button"
          className={`title-suggestions-sparkle-btn ${isLoading ? 'loading' : ''}`}
          onClick={handleSparkleClick}
          disabled={isLoading}
          aria-label="Generate title suggestions"
          title="Generate AI title suggestions"
        >
          {isLoading ? (
            <span className="title-suggestions-spinner" />
          ) : (
            <SparkleIcon />
          )}
        </button>

        {/* Suggestions popover */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={popoverRef}
              className="title-suggestions-popover"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              role="listbox"
              aria-label="Title suggestions"
            >
              <div className="title-suggestions-header">
                <span className="title-suggestions-header-text">
                  <SparkleIcon />
                  AI Title Suggestions
                </span>
                <button
                  type="button"
                  className="title-suggestions-close"
                  onClick={closeSuggestions}
                  aria-label="Close suggestions"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              {isLoading ? (
                <div className="title-suggestions-loading">
                  <span className="title-suggestions-dot" />
                  <span className="title-suggestions-dot" />
                  <span className="title-suggestions-dot" />
                  <span className="title-suggestions-loading-text">
                    Generating titles...
                  </span>
                </div>
              ) : storeError ? (
                <div className="title-suggestions-error" role="alert">
                  <span>{storeError}</span>
                  <button
                    type="button"
                    onClick={clearError}
                    className="title-suggestions-error-dismiss"
                  >
                    Dismiss
                  </button>
                </div>
              ) : suggestions.length > 0 ? (
                <>
                  <ul className="title-suggestions-list">
                    {suggestions.map((suggestion) => (
                      <li key={suggestion.id}>
                        <button
                          type="button"
                          className="title-suggestions-option"
                          onClick={() => handleSelectSuggestion(suggestion.text)}
                          role="option"
                        >
                          {suggestion.text}
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="title-suggestions-footer">
                    <button
                      type="button"
                      className="title-suggestions-regenerate"
                      onClick={handleRegenerate}
                      disabled={isLoading}
                    >
                      <RegenerateIcon />
                      Regenerate
                    </button>
                  </div>
                </>
              ) : (
                <div className="title-suggestions-empty">
                  No suggestions available
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {displayError && (
        <span className="title-suggestions-error-message" role="alert">
          {displayError}
        </span>
      )}

      {hint && !displayError && (
        <span className="title-suggestions-hint">{hint}</span>
      )}
    </div>
  );
}

TitleSuggestionsInput.displayName = 'TitleSuggestionsInput';
