/**
 * AI Readability Panel
 *
 * Displays readability analysis results in a floating panel.
 * Shows readability score, grade level, target audience matching,
 * highlights complex sentences, and provides rewrite suggestions.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAIReadabilityStore,
  useAIReadability,
  getAudienceLabel,
  getReadingEaseColor,
  getAudienceMatchColor,
  type TargetAudience,
  type SentenceAnalysis,
  type ReadabilitySuggestion,
} from '../stores/aiReadability';
import './AIReadabilityPanel.css';

// Target audience options
const TARGET_AUDIENCES: { value: TargetAudience; label: string; description: string }[] = [
  { value: 'children', label: 'Children', description: 'Grades 1-5' },
  { value: 'general', label: 'General Public', description: 'Grades 6-9' },
  { value: 'professional', label: 'Professional', description: 'Grades 10-12' },
  { value: 'academic', label: 'Academic', description: 'College Level' },
  { value: 'technical', label: 'Technical', description: 'Graduate Level' },
];

function ScoreGauge({
  score,
  label,
  maxScore = 100,
  isLoading,
}: {
  score: number;
  label: string;
  maxScore?: number;
  isLoading: boolean;
}) {
  const percentage = Math.min(100, (score / maxScore) * 100);
  const color = getReadingEaseColor(score);

  return (
    <div className="readability-gauge">
      <div className="readability-gauge-header">
        <span className="readability-gauge-label">{label}</span>
        <span
          className="readability-gauge-value"
          style={{ color: isLoading ? 'var(--readability-panel-text-secondary)' : color }}
        >
          {isLoading ? '...' : Math.round(score)}
        </span>
      </div>
      <div className="readability-gauge-track">
        <motion.div
          className="readability-gauge-fill"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        />
      </div>
      <div className="readability-gauge-labels">
        <span>Difficult</span>
        <span>Easy</span>
      </div>
    </div>
  );
}

function GradeLevelBadge({
  gradeLevel,
  audienceMatch,
  isLoading,
}: {
  gradeLevel: string;
  audienceMatch: 'excellent' | 'good' | 'fair' | 'poor';
  isLoading: boolean;
}) {
  const matchColor = getAudienceMatchColor(audienceMatch);

  return (
    <div className="readability-grade-badge">
      <div className="readability-grade-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 14l9-5-9-5-9 5 9 5z" />
          <path d="M12 14l6.16-3.42a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          <path d="M12 14l9-5-9-5-9 5 9 5z" />
          <path d="M12 14v7" />
        </svg>
      </div>
      <div className="readability-grade-content">
        <span className="readability-grade-title">
          {isLoading ? 'Analyzing...' : gradeLevel}
        </span>
        <span
          className="readability-grade-match"
          style={{ color: isLoading ? 'inherit' : matchColor }}
        >
          {isLoading ? '...' : audienceMatch.charAt(0).toUpperCase() + audienceMatch.slice(1)} match
        </span>
      </div>
    </div>
  );
}

function AudienceSelector({
  selected,
  onSelect,
  isOpen,
  onToggle,
}: {
  selected: TargetAudience;
  onSelect: (audience: TargetAudience) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="readability-audience-section">
      <button
        type="button"
        className="readability-audience-toggle"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>Target: {getAudienceLabel(selected)}</span>
        <svg
          className={`readability-chevron ${isOpen ? 'open' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="readability-audience-options">
          {TARGET_AUDIENCES.map((audience) => (
            <button
              key={audience.value}
              type="button"
              className={`readability-audience-option ${
                selected === audience.value ? 'active' : ''
              }`}
              onClick={() => {
                onSelect(audience.value);
                onToggle();
              }}
            >
              <span className="readability-audience-option-label">{audience.label}</span>
              <span className="readability-audience-option-desc">{audience.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ComplexSentenceCard({
  sentence,
  isSelected,
  onSelect,
}: {
  sentence: SentenceAnalysis;
  isSelected: boolean;
  onSelect: () => void;
}) {
  // Truncate long sentences for display
  const displayText =
    sentence.text.length > 100
      ? sentence.text.substring(0, 100) + '...'
      : sentence.text;

  return (
    <div
      className={`readability-sentence-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="readability-sentence-header">
        <span className="readability-sentence-badge">
          {sentence.complexityReason}
        </span>
        <span className="readability-sentence-words">
          {sentence.wordCount} words
        </span>
      </div>
      <p className="readability-sentence-text">{displayText}</p>
      {isSelected && sentence.rewriteSuggestion && (
        <div className="readability-sentence-suggestion">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <span>{sentence.rewriteSuggestion}</span>
        </div>
      )}
    </div>
  );
}

function SuggestionItem({ suggestion }: { suggestion: ReadabilitySuggestion }) {
  const getPriorityColor = () => {
    switch (suggestion.priority) {
      case 'high':
        return 'var(--color-error, #ef4444)';
      case 'medium':
        return 'var(--color-warning, #f59e0b)';
      case 'low':
        return 'var(--color-info, #3b82f6)';
    }
  };

  return (
    <div
      className="readability-suggestion"
      style={{ borderLeftColor: getPriorityColor() }}
    >
      <div className="readability-suggestion-priority">
        {suggestion.priority}
      </div>
      <p className="readability-suggestion-message">{suggestion.message}</p>
    </div>
  );
}

export function AIReadabilityPanel() {
  const {
    isAnalyzing,
    analysis,
    error,
    targetAudience,
    isPanelOpen,
    selectedSentenceIndex,
  } = useAIReadability();

  const {
    analyzeText,
    setTargetAudience,
    selectSentence,
    closePanel,
    clearError,
  } = useAIReadabilityStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const [showAudienceSelector, setShowAudienceSelector] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);

  // Handle text selection changes
  const handleSelectionChange = useCallback(() => {
    if (!isPanelOpen) return;

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';

    // Debounce the analysis to avoid too many calls
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      if (selectedText.length >= 50) {
        analyzeText(selectedText);
      }
    }, 500);
  }, [isPanelOpen, analyzeText]);

  // Listen for selection changes when panel is open
  useEffect(() => {
    if (!isPanelOpen) return;

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isPanelOpen, handleSelectionChange]);

  // Handle click outside
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Don't close if clicking on text (for selection)
        const target = e.target as HTMLElement;
        if (target.closest('textarea, input, [contenteditable]')) {
          return;
        }
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

  if (!isPanelOpen) return null;

  const hasAnalysis = analysis !== null && analysis.totalWords > 0;

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        className="ai-readability-panel"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        role="complementary"
        aria-label="AI Readability Scorer"
      >
        {/* Header */}
        <div className="readability-header">
          <div className="readability-title-row">
            <svg
              className="readability-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <path d="M8 7h8M8 11h8M8 15h4" />
            </svg>
            <h3 className="readability-title">Readability</h3>
          </div>
          <button
            type="button"
            className="readability-close"
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

        {/* Error state */}
        {error && (
          <div className="readability-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        {/* Instructions when no text analyzed */}
        {!hasAnalysis && !isAnalyzing && (
          <div className="readability-empty">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p>Select text to analyze readability</p>
            <span className="readability-hint">
              Minimum 50 characters for analysis
            </span>
          </div>
        )}

        {/* Target Audience Selector */}
        <AudienceSelector
          selected={targetAudience}
          onSelect={setTargetAudience}
          isOpen={showAudienceSelector}
          onToggle={() => setShowAudienceSelector(!showAudienceSelector)}
        />

        {/* Main score display */}
        {(hasAnalysis || isAnalyzing) && (
          <>
            {/* Grade Level Badge */}
            <GradeLevelBadge
              gradeLevel={analysis?.gradeLevel || ''}
              audienceMatch={analysis?.audienceMatch || 'fair'}
              isLoading={isAnalyzing}
            />

            {/* Reading Ease Score */}
            <ScoreGauge
              score={analysis?.scores.fleschReadingEase || 0}
              label="Flesch Reading Ease"
              maxScore={100}
              isLoading={isAnalyzing}
            />

            {/* Stats row */}
            <div className="readability-stats">
              <div className="readability-stat">
                <span className="readability-stat-value">
                  {isAnalyzing ? '...' : analysis?.totalWords}
                </span>
                <span className="readability-stat-label">Words</span>
              </div>
              <div className="readability-stat">
                <span className="readability-stat-value">
                  {isAnalyzing ? '...' : analysis?.totalSentences}
                </span>
                <span className="readability-stat-label">Sentences</span>
              </div>
              <div className="readability-stat">
                <span className="readability-stat-value">
                  {isAnalyzing
                    ? '...'
                    : Math.round(analysis?.avgWordsPerSentence || 0)}
                </span>
                <span className="readability-stat-label">Avg Words/Sent</span>
              </div>
            </div>

            {/* Additional Scores */}
            <div className="readability-scores-detail">
              <h4 className="readability-section-title">Score Details</h4>
              <div className="readability-score-items">
                <div className="readability-score-item">
                  <span>Flesch-Kincaid Grade</span>
                  <span>
                    {isAnalyzing
                      ? '...'
                      : analysis?.scores.fleschKincaidGrade.toFixed(1)}
                  </span>
                </div>
                <div className="readability-score-item">
                  <span>Automated Readability Index</span>
                  <span>
                    {isAnalyzing
                      ? '...'
                      : analysis?.scores.automatedReadabilityIndex.toFixed(1)}
                  </span>
                </div>
                <div className="readability-score-item">
                  <span>Coleman-Liau Index</span>
                  <span>
                    {isAnalyzing
                      ? '...'
                      : analysis?.scores.colemanLiauIndex.toFixed(1)}
                  </span>
                </div>
                <div className="readability-score-item highlight">
                  <span>Average Grade Level</span>
                  <span>
                    {isAnalyzing
                      ? '...'
                      : analysis?.scores.averageGradeLevel.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Suggestions */}
        {hasAnalysis && analysis.suggestions.length > 0 && (
          <div className="readability-suggestions-section">
            <h4 className="readability-section-title">Suggestions</h4>
            {analysis.suggestions.map((suggestion, index) => (
              <SuggestionItem key={index} suggestion={suggestion} />
            ))}
          </div>
        )}

        {/* Complex Sentences */}
        {hasAnalysis && analysis.complexSentences.length > 0 && (
          <div className="readability-complex-section">
            <h4 className="readability-section-title">
              Complex Sentences ({analysis.complexSentences.length})
            </h4>
            <p className="readability-section-hint">
              Click a sentence to see improvement suggestions
            </p>
            <div className="readability-sentences-list">
              {analysis.complexSentences.map((sentence, index) => (
                <ComplexSentenceCard
                  key={index}
                  sentence={sentence}
                  isSelected={selectedSentenceIndex === index}
                  onSelect={() =>
                    selectSentence(selectedSentenceIndex === index ? null : index)
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="readability-footer">
          <kbd>Esc</kbd> to close
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

AIReadabilityPanel.displayName = 'AIReadabilityPanel';
