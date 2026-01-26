import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFindReplaceStore, useFindReplace } from '../stores/findReplace';
import './FindReplaceDialog.css';

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

export function FindReplaceDialog() {
  const {
    isOpen,
    searchText,
    replaceText,
    matchCase,
    useRegex,
    wholeWord,
    matches,
    currentMatchIndex,
  } = useFindReplace();

  const {
    closeDialog,
    setSearchText,
    setReplaceText,
    toggleMatchCase,
    toggleUseRegex,
    toggleWholeWord,
    goToNextMatch,
    goToPreviousMatch,
    replaceCurrentMatch,
    replaceAllMatches,
    undo,
  } = useFindReplaceStore();

  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Focus search input when dialog opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDialog();
        return;
      }

      // Ctrl+Z / Cmd+Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        const state = useFindReplaceStore.getState();
        if (state.undoStack.length > 0) {
          e.preventDefault();
          undo();
          return;
        }
      }

      // Enter for next match, Shift+Enter for previous
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (e.shiftKey) {
          goToPreviousMatch();
        } else {
          goToNextMatch();
        }
        return;
      }

      // Ctrl+H / Cmd+Shift+H for replace current
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'h' &&
        !e.shiftKey
      ) {
        e.preventDefault();
        replaceCurrentMatch();
        return;
      }

      // Ctrl+Shift+H / Cmd+Option+H for replace all
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'h'
      ) {
        e.preventDefault();
        replaceAllMatches();
        return;
      }
    },
    [isOpen, closeDialog, undo, goToNextMatch, goToPreviousMatch, replaceCurrentMatch, replaceAllMatches]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        // Don't close if clicking on a textarea/input (user might be selecting text)
        const target = e.target as HTMLElement;
        if (
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLInputElement
        ) {
          return;
        }
        closeDialog();
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeDialog]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleReplaceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReplaceText(e.target.value);
  };

  const matchCountText =
    matches.length === 0
      ? 'No matches'
      : `${currentMatchIndex + 1} of ${matches.length}`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={dialogRef}
        className="find-replace-dialog"
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="dialog"
        aria-label="Find and Replace"
        aria-modal="false"
      >
        {/* Header */}
        <div className="find-replace-header">
          <span className="find-replace-title">Find & Replace</span>
          <button
            type="button"
            className="find-replace-close"
            onClick={closeDialog}
            aria-label="Close dialog"
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
        </div>

        {/* Search row */}
        <div className="find-replace-row">
          <div className="find-replace-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              className="find-replace-input"
              placeholder="Find"
              value={searchText}
              onChange={handleSearchInputChange}
              aria-label="Search text"
            />
            <span className="find-replace-match-count" aria-live="polite">
              {matchCountText}
            </span>
          </div>
          <div className="find-replace-nav-buttons">
            <button
              type="button"
              className="find-replace-nav-btn"
              onClick={goToPreviousMatch}
              disabled={matches.length === 0}
              aria-label="Previous match"
              title="Previous (Shift+Enter)"
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              className="find-replace-nav-btn"
              onClick={goToNextMatch}
              disabled={matches.length === 0}
              aria-label="Next match"
              title="Next (Enter)"
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Replace row */}
        <div className="find-replace-row">
          <div className="find-replace-input-wrapper">
            <input
              type="text"
              className="find-replace-input"
              placeholder="Replace"
              value={replaceText}
              onChange={handleReplaceInputChange}
              aria-label="Replace text"
            />
          </div>
          <div className="find-replace-replace-buttons">
            <button
              type="button"
              className="find-replace-action-btn"
              onClick={replaceCurrentMatch}
              disabled={matches.length === 0}
              title="Replace current match"
            >
              Replace
            </button>
            <button
              type="button"
              className="find-replace-action-btn"
              onClick={replaceAllMatches}
              disabled={matches.length === 0}
              title="Replace all matches"
            >
              All
            </button>
          </div>
        </div>

        {/* Options row */}
        <div className="find-replace-options">
          <label className="find-replace-option">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={toggleMatchCase}
            />
            <span className="find-replace-option-label" title="Match case (Aa)">
              Aa
            </span>
          </label>
          <label className="find-replace-option">
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={toggleWholeWord}
            />
            <span className="find-replace-option-label" title="Whole word">
              W
            </span>
          </label>
          <label className="find-replace-option">
            <input
              type="checkbox"
              checked={useRegex}
              onChange={toggleUseRegex}
            />
            <span className="find-replace-option-label" title="Regular expression">
              .*
            </span>
          </label>
        </div>

        {/* Keyboard hints */}
        <div className="find-replace-hints">
          <span className="find-replace-hint">Enter: Next</span>
          <span className="find-replace-hint">Shift+Enter: Previous</span>
          <span className="find-replace-hint">Esc: Close</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

FindReplaceDialog.displayName = 'FindReplaceDialog';
