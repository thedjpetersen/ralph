/**
 * AI Vocabulary Enhancer Panel
 *
 * Displays vocabulary analysis results in a floating panel.
 * Shows word frequency, identifies overused/weak vocabulary,
 * and provides synonym suggestions with one-click replacement.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAIVocabularyEnhancerStore,
  useAIVocabularyEnhancer,
  getVocabularyLevelLabel,
  type VocabularyLevel,
  type WordFrequency,
} from '../stores/aiVocabularyEnhancer';
import './AIVocabularyEnhancerPanel.css';

const VOCABULARY_LEVELS: VocabularyLevel[] = ['simple', 'standard', 'advanced', 'academic'];

function WordFrequencyItem({
  word,
  onSelect,
}: {
  word: WordFrequency;
  onSelect: (word: string) => void;
}) {
  const getBadgeClass = () => {
    if (word.isOverused && word.isWeak) return 'word-badge-both';
    if (word.isWeak) return 'word-badge-weak';
    if (word.isOverused) return 'word-badge-overused';
    return '';
  };

  const getLabel = () => {
    if (word.isOverused && word.isWeak) return 'Weak & Overused';
    if (word.isWeak) return 'Weak';
    if (word.isOverused) return 'Overused';
    return '';
  };

  const shouldHighlight = word.isOverused || word.isWeak;

  return (
    <button
      type="button"
      className={`word-frequency-item ${shouldHighlight ? 'highlighted' : ''}`}
      onClick={() => shouldHighlight && onSelect(word.word)}
      disabled={!shouldHighlight}
      title={shouldHighlight ? `Click to see suggestions for "${word.word}"` : undefined}
    >
      <span className="word-frequency-word">{word.word}</span>
      <span className="word-frequency-count">{word.count}x</span>
      {shouldHighlight && (
        <span className={`word-frequency-badge ${getBadgeClass()}`}>
          {getLabel()}
        </span>
      )}
    </button>
  );
}

export function AIVocabularyEnhancerPanel() {
  const {
    isAnalyzing,
    analysis,
    error,
    vocabularyLevel,
    overuseThreshold,
    isPanelOpen,
  } = useAIVocabularyEnhancer();

  const {
    analyzeText,
    setVocabularyLevel,
    setOveruseThreshold,
    closePanel,
    clearError,
  } = useAIVocabularyEnhancerStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localText, setLocalText] = useState('');
  const debounceTimerRef = useRef<number | null>(null);

  // Handle text input with debounce
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setLocalText(text);

      // Debounce the analysis
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        if (text.length >= 20) {
          analyzeText(text);
        }
      }, 500);
    },
    [analyzeText]
  );

  // Handle word selection - scroll to first occurrence and show info
  const handleWordSelect = useCallback(
    (word: string) => {
      if (!textareaRef.current) return;

      const text = textareaRef.current.value.toLowerCase();
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const match = regex.exec(text);

      if (match) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(match.index, match.index + word.length);
      }
    },
    []
  );

  // Handle click outside
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPanelOpen, closePanel]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPanelOpen) {
        e.preventDefault();
        closePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen, closePanel]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (!isPanelOpen) return null;

  const hasAnalysis = analysis !== null && analysis.totalWords > 0;
  const flaggedWords = analysis?.wordFrequencies.filter(
    (w) => w.isOverused || w.isWeak
  ) || [];

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        className="ai-vocabulary-enhancer-panel"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        role="complementary"
        aria-label="AI Vocabulary Enhancer"
      >
        {/* Header */}
        <div className="vocab-enhancer-header">
          <div className="vocab-enhancer-title-row">
            <svg
              className="vocab-enhancer-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="vocab-enhancer-title">Vocabulary Enhancer</h3>
          </div>
          <div className="vocab-enhancer-header-actions">
            <button
              type="button"
              className="vocab-enhancer-settings-btn"
              onClick={() => setShowSettings(!showSettings)}
              aria-label="Settings"
              aria-expanded={showSettings}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              className="vocab-enhancer-close"
              onClick={closePanel}
              aria-label="Close panel"
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
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="vocab-enhancer-settings">
            <div className="vocab-setting">
              <label className="vocab-setting-label">Vocabulary Level Target</label>
              <select
                className="vocab-setting-select"
                value={vocabularyLevel}
                onChange={(e) => setVocabularyLevel(e.target.value as VocabularyLevel)}
              >
                {VOCABULARY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {getVocabularyLevelLabel(level)}
                  </option>
                ))}
              </select>
              <span className="vocab-setting-hint">
                Synonyms will be filtered to this level
              </span>
            </div>
            <div className="vocab-setting">
              <label className="vocab-setting-label">
                Overuse Threshold: {overuseThreshold}x
              </label>
              <input
                type="range"
                className="vocab-setting-range"
                min="2"
                max="10"
                value={overuseThreshold}
                onChange={(e) => setOveruseThreshold(parseInt(e.target.value))}
              />
              <span className="vocab-setting-hint">
                Words used more than {overuseThreshold} times are flagged
              </span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="vocab-enhancer-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        {/* Text input area */}
        <div className="vocab-enhancer-input-section">
          <label className="vocab-input-label" htmlFor="vocab-text-input">
            Enter or paste text to analyze
          </label>
          <textarea
            ref={textareaRef}
            id="vocab-text-input"
            className="vocab-text-input"
            placeholder="Type or paste your text here to analyze vocabulary..."
            value={localText}
            onChange={handleTextChange}
            rows={6}
          />
          {localText.length > 0 && localText.length < 20 && (
            <span className="vocab-input-hint">
              Enter at least 20 characters for analysis
            </span>
          )}
        </div>

        {/* Analysis stats */}
        {hasAnalysis && (
          <div className="vocab-enhancer-stats">
            <div className="vocab-stat">
              <span className="vocab-stat-value">{analysis.totalWords}</span>
              <span className="vocab-stat-label">Total Words</span>
            </div>
            <div className="vocab-stat">
              <span className="vocab-stat-value">{analysis.uniqueWords}</span>
              <span className="vocab-stat-label">Unique</span>
            </div>
            <div className="vocab-stat vocab-stat-warning">
              <span className="vocab-stat-value">{analysis.weakWordCount}</span>
              <span className="vocab-stat-label">Weak</span>
            </div>
            <div className="vocab-stat vocab-stat-info">
              <span className="vocab-stat-value">{analysis.overusedCount}</span>
              <span className="vocab-stat-label">Overused</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isAnalyzing && (
          <div className="vocab-enhancer-loading">
            <span className="vocab-loading-dot"></span>
            <span className="vocab-loading-dot"></span>
            <span className="vocab-loading-dot"></span>
            <span className="vocab-loading-text">Analyzing...</span>
          </div>
        )}

        {/* Flagged words list */}
        {hasAnalysis && flaggedWords.length > 0 && (
          <div className="vocab-enhancer-words-section">
            <h4 className="vocab-section-title">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Words to Improve ({flaggedWords.length})
            </h4>
            <div className="vocab-words-list">
              {flaggedWords.slice(0, 15).map((word) => (
                <WordFrequencyItem
                  key={word.word}
                  word={word}
                  onSelect={handleWordSelect}
                />
              ))}
              {flaggedWords.length > 15 && (
                <span className="vocab-words-more">
                  +{flaggedWords.length - 15} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Empty state - no issues found */}
        {hasAnalysis && flaggedWords.length === 0 && (
          <div className="vocab-enhancer-success">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p>Your vocabulary looks great!</p>
            <span>No weak or overused words detected.</span>
          </div>
        )}

        {/* Tip */}
        <div className="vocab-enhancer-tip">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <span>Click on flagged words in the text to see synonym suggestions</span>
        </div>

        {/* Footer hint */}
        <div className="vocab-enhancer-footer">
          <kbd>Esc</kbd> to close
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

AIVocabularyEnhancerPanel.displayName = 'AIVocabularyEnhancerPanel';
