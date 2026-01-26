/**
 * AI Tone Analyzer Panel
 *
 * Displays tone analysis results in a floating panel.
 * Shows three dimensions: Formal/Casual, Positive/Negative, Confident/Tentative
 * Updates on text selection change and provides suggestions for tone adjustment.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAIToneAnalyzerStore,
  useAIToneAnalyzer,
  getScoreLabel,
  type ToneSuggestion,
  type TargetTone
} from '../stores/aiToneAnalyzer';
import './AIToneAnalyzerPanel.css';

// Preset target tones
const TARGET_TONE_PRESETS: { label: string; tone: TargetTone }[] = [
  { label: 'Professional Email', tone: { formal: 0.5, sentiment: 0.3, confidence: 0.4 } },
  { label: 'Friendly Message', tone: { formal: -0.3, sentiment: 0.6, confidence: 0.2 } },
  { label: 'Formal Report', tone: { formal: 0.8, sentiment: 0, confidence: 0.6 } },
  { label: 'Casual Chat', tone: { formal: -0.6, sentiment: 0.4, confidence: -0.1 } },
];

function ToneMeter({
  label,
  leftLabel,
  rightLabel,
  score,
  targetScore,
  isLoading
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  score: number;
  targetScore?: number;
  isLoading: boolean;
}) {
  // Convert score from -1..1 to 0..100 for the meter
  const percentage = ((score + 1) / 2) * 100;
  const targetPercentage = targetScore !== undefined ? ((targetScore + 1) / 2) * 100 : null;

  // Determine color based on score position
  const getIndicatorColor = () => {
    if (isLoading) return 'var(--tone-meter-loading)';
    if (score < -0.3) return 'var(--tone-meter-left)';
    if (score > 0.3) return 'var(--tone-meter-right)';
    return 'var(--tone-meter-center)';
  };

  return (
    <div className="tone-meter">
      <div className="tone-meter-header">
        <span className="tone-meter-label">{label}</span>
        <span className="tone-meter-value">
          {isLoading ? '...' : getScoreLabel(score, label.toLowerCase().replace('/', '') as 'formal' | 'sentiment' | 'confidence')}
        </span>
      </div>
      <div className="tone-meter-track">
        <div className="tone-meter-gradient" />
        {/* Target indicator */}
        {targetPercentage !== null && (
          <div
            className="tone-meter-target"
            style={{ left: `${targetPercentage}%` }}
            title="Target tone"
          />
        )}
        {/* Current value indicator */}
        <motion.div
          className="tone-meter-indicator"
          style={{ backgroundColor: getIndicatorColor() }}
          initial={{ left: '50%' }}
          animate={{ left: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      </div>
      <div className="tone-meter-labels">
        <span className="tone-meter-left-label">{leftLabel}</span>
        <span className="tone-meter-right-label">{rightLabel}</span>
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: ToneSuggestion }) {
  const getIcon = () => {
    switch (suggestion.type) {
      case 'formal':
        return (
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v2H7V5zm6 4H7v2h6V9zm-6 4h6v2H7v-2z" />
          </svg>
        );
      case 'sentiment':
        return (
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'confidence':
        return (
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
            <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
          </svg>
        );
    }
  };

  return (
    <div className={`tone-suggestion tone-suggestion-${suggestion.direction}`}>
      <div className="tone-suggestion-icon">{getIcon()}</div>
      <div className="tone-suggestion-content">
        <p className="tone-suggestion-message">{suggestion.message}</p>
        {suggestion.example && (
          <p className="tone-suggestion-example">{suggestion.example}</p>
        )}
      </div>
    </div>
  );
}

export function AIToneAnalyzerPanel() {
  const {
    isAnalyzing,
    analysis,
    error,
    targetTone,
    isPanelOpen,
    isTrackingSelection
  } = useAIToneAnalyzer();

  const {
    analyzeText,
    setTargetTone,
    closePanel,
    clearError
  } = useAIToneAnalyzerStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const [showTargetSelector, setShowTargetSelector] = useState(false);
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
      if (selectedText.length >= 10) {
        analyzeText(selectedText);
      }
    }, 300);
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

  const scores = analysis?.scores || { formal: 0, sentiment: 0, confidence: 0 };
  const hasAnalysis = analysis !== null && analysis.wordCount > 0;

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        className="ai-tone-analyzer-panel"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        role="complementary"
        aria-label="AI Tone Analyzer"
      >
        {/* Header */}
        <div className="tone-analyzer-header">
          <div className="tone-analyzer-title-row">
            <svg className="tone-analyzer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
              <path d="M12 6v6l4 2" />
            </svg>
            <h3 className="tone-analyzer-title">Tone Analyzer</h3>
          </div>
          <button
            type="button"
            className="tone-analyzer-close"
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
          <div className="tone-analyzer-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError}>Dismiss</button>
          </div>
        )}

        {/* Instructions when no text analyzed */}
        {!hasAnalysis && !isAnalyzing && (
          <div className="tone-analyzer-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p>Select text to analyze its tone</p>
            <span className="tone-analyzer-hint">
              Minimum 10 characters for analysis
            </span>
          </div>
        )}

        {/* Tone meters */}
        {(hasAnalysis || isAnalyzing) && (
          <div className="tone-analyzer-meters">
            <ToneMeter
              label="Formality"
              leftLabel="Casual"
              rightLabel="Formal"
              score={scores.formal}
              targetScore={targetTone?.formal}
              isLoading={isAnalyzing}
            />
            <ToneMeter
              label="Sentiment"
              leftLabel="Negative"
              rightLabel="Positive"
              score={scores.sentiment}
              targetScore={targetTone?.sentiment}
              isLoading={isAnalyzing}
            />
            <ToneMeter
              label="Confidence"
              leftLabel="Tentative"
              rightLabel="Confident"
              score={scores.confidence}
              targetScore={targetTone?.confidence}
              isLoading={isAnalyzing}
            />
          </div>
        )}

        {/* Word count and selection info */}
        {hasAnalysis && (
          <div className="tone-analyzer-stats">
            <span className="tone-analyzer-stat">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              {analysis.wordCount} words analyzed
            </span>
            {isTrackingSelection && (
              <span className="tone-analyzer-tracking">
                <span className="tone-analyzer-tracking-dot" />
                Live tracking
              </span>
            )}
          </div>
        )}

        {/* Target tone selector */}
        <div className="tone-analyzer-target-section">
          <button
            type="button"
            className="tone-analyzer-target-toggle"
            onClick={() => setShowTargetSelector(!showTargetSelector)}
            aria-expanded={showTargetSelector}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
            </svg>
            {targetTone ? 'Compare to target' : 'Set target tone'}
            <svg
              className={`tone-analyzer-chevron ${showTargetSelector ? 'open' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {showTargetSelector && (
            <div className="tone-analyzer-target-options">
              {TARGET_TONE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`tone-analyzer-preset ${
                    targetTone === preset.tone ? 'active' : ''
                  }`}
                  onClick={() => {
                    setTargetTone(preset.tone);
                    setShowTargetSelector(false);
                  }}
                >
                  {preset.label}
                </button>
              ))}
              {targetTone && (
                <button
                  type="button"
                  className="tone-analyzer-preset tone-analyzer-clear"
                  onClick={() => {
                    setTargetTone(null);
                    setShowTargetSelector(false);
                  }}
                >
                  Clear target
                </button>
              )}
            </div>
          )}
        </div>

        {/* Suggestions */}
        {hasAnalysis && analysis.suggestions.length > 0 && (
          <div className="tone-analyzer-suggestions">
            <h4 className="tone-analyzer-suggestions-title">Suggestions</h4>
            {analysis.suggestions.map((suggestion, index) => (
              <SuggestionCard key={index} suggestion={suggestion} />
            ))}
          </div>
        )}

        {/* Comparison to target */}
        {hasAnalysis && targetTone && (
          <div className="tone-analyzer-comparison">
            <h4 className="tone-analyzer-comparison-title">Target Comparison</h4>
            <div className="tone-analyzer-comparison-items">
              {(['formal', 'sentiment', 'confidence'] as const).map((dim) => {
                const diff = scores[dim] - targetTone[dim];
                const isClose = Math.abs(diff) < 0.2;
                const direction = diff > 0.2 ? 'high' : diff < -0.2 ? 'low' : 'match';

                return (
                  <div
                    key={dim}
                    className={`tone-comparison-item tone-comparison-${direction}`}
                  >
                    <span className="tone-comparison-dim">
                      {dim.charAt(0).toUpperCase() + dim.slice(1)}
                    </span>
                    <span className="tone-comparison-status">
                      {isClose ? 'On target' : direction === 'high' ? 'Too high' : 'Too low'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="tone-analyzer-footer">
          <kbd>Esc</kbd> to close
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

AIToneAnalyzerPanel.displayName = 'AIToneAnalyzerPanel';
