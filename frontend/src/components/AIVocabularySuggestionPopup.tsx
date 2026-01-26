/**
 * AI Vocabulary Suggestion Popup
 *
 * A floating popup that appears when clicking on flagged words.
 * Shows synonym suggestions with one-click replacement functionality.
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAIVocabularyEnhancerStore,
  useAIVocabularyEnhancer,
  getVocabularyLevelLabel,
  type SynonymSuggestion,
} from '../stores/aiVocabularyEnhancer';
import './AIVocabularySuggestionPopup.css';

function SynonymButton({
  synonym,
  onSelect,
}: {
  synonym: SynonymSuggestion;
  onSelect: (word: string) => void;
}) {
  return (
    <button
      type="button"
      className={`vocab-synonym-btn ${synonym.isRecommended ? 'recommended' : ''}`}
      onClick={() => onSelect(synonym.word)}
      title={synonym.definition || `Replace with "${synonym.word}"`}
    >
      <span className="vocab-synonym-word">{synonym.word}</span>
      <span className={`vocab-synonym-level vocab-level-${synonym.level}`}>
        {synonym.level.charAt(0).toUpperCase()}
      </span>
      {synonym.isRecommended && (
        <svg
          className="vocab-synonym-star"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-label="Recommended"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
    </button>
  );
}

export function AIVocabularySuggestionPopup() {
  const { activeSuggestion, suggestionPosition, vocabularyLevel } =
    useAIVocabularyEnhancer();

  const { hideSuggestion, applySuggestion } = useAIVocabularyEnhancerStore();

  const popupRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    if (!activeSuggestion) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        hideSuggestion();
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeSuggestion, hideSuggestion]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!activeSuggestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        hideSuggestion();
      }

      // Number keys for quick selection (1-9)
      if (!e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index < activeSuggestion.synonyms.length) {
          e.preventDefault();
          applySuggestion(activeSuggestion.synonyms[index].word);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSuggestion, hideSuggestion, applySuggestion]);

  if (!activeSuggestion || !suggestionPosition) return null;

  const getReasonLabel = () => {
    switch (activeSuggestion.reason) {
      case 'weak':
        return 'Weak vocabulary';
      case 'overused':
        return 'Overused word';
      case 'both':
        return 'Weak & overused';
      default:
        return '';
    }
  };

  const getReasonClass = () => {
    switch (activeSuggestion.reason) {
      case 'weak':
        return 'reason-weak';
      case 'overused':
        return 'reason-overused';
      case 'both':
        return 'reason-both';
      default:
        return '';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        className="ai-vocabulary-suggestion-popup"
        style={{
          top: suggestionPosition.top,
          left: suggestionPosition.left,
        }}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="dialog"
        aria-label="Synonym suggestions"
      >
        {/* Header */}
        <div className="vocab-popup-header">
          <div className="vocab-popup-word">
            <span className="vocab-popup-original">
              "{activeSuggestion.originalWord}"
            </span>
            <span className={`vocab-popup-reason ${getReasonClass()}`}>
              {getReasonLabel()}
            </span>
          </div>
          <button
            type="button"
            className="vocab-popup-close"
            onClick={hideSuggestion}
            aria-label="Close"
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

        {/* Synonyms list */}
        <div className="vocab-popup-synonyms">
          <div className="vocab-popup-synonyms-label">
            Replace with ({getVocabularyLevelLabel(vocabularyLevel)}):
          </div>
          <div className="vocab-popup-synonyms-list">
            {activeSuggestion.synonyms.map((synonym, index) => (
              <SynonymButton
                key={synonym.word}
                synonym={{ ...synonym, word: synonym.word + (index < 9 ? '' : '') }}
                onSelect={() => {
                  applySuggestion(synonym.word);
                }}
              />
            ))}
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="vocab-popup-hints">
          <span className="vocab-popup-hint">
            <kbd>1</kbd>-<kbd>{Math.min(9, activeSuggestion.synonyms.length)}</kbd> to select
          </span>
          <span className="vocab-popup-hint">
            <kbd>Esc</kbd> to close
          </span>
        </div>

        {/* Level legend */}
        <div className="vocab-popup-legend">
          <span className="vocab-legend-item">
            <span className="vocab-level-badge vocab-level-simple">S</span> Simple
          </span>
          <span className="vocab-legend-item">
            <span className="vocab-level-badge vocab-level-standard">S</span> Standard
          </span>
          <span className="vocab-legend-item">
            <span className="vocab-level-badge vocab-level-advanced">A</span> Advanced
          </span>
          <span className="vocab-legend-item">
            <span className="vocab-level-badge vocab-level-academic">A</span> Academic
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

AIVocabularySuggestionPopup.displayName = 'AIVocabularySuggestionPopup';
