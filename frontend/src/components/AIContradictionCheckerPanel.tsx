/**
 * AI Contradiction Checker Panel
 *
 * Displays contradiction analysis results in a floating panel.
 * Shows consistency score, detected contradictions with explanations,
 * suggestions for resolution, and ability to dismiss false positives.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAIContradictionCheckerStore,
  useAIContradictionChecker,
  getContradictionTypeLabel,
  getSeverityColor,
  getActiveContradictionsCount,
  type Contradiction,
} from '../stores/aiContradictionChecker';
import './AIContradictionCheckerPanel.css';

function ConsistencyScoreBadge({
  score,
  isLoading,
}: {
  score: number;
  isLoading: boolean;
}) {
  const getScoreClass = (): string => {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  };

  const getScoreLabel = (): string => {
    if (score >= 80) return 'Highly Consistent';
    if (score >= 50) return 'Some Issues Found';
    return 'Needs Review';
  };

  return (
    <div className={`contradiction-score-badge ${getScoreClass()}`}>
      <div className="contradiction-score-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="contradiction-score-content">
        <span className="contradiction-score-value">
          {isLoading ? '...' : `${Math.round(score)}%`}
        </span>
        <span className="contradiction-score-label">
          {isLoading ? 'Analyzing...' : getScoreLabel()}
        </span>
      </div>
    </div>
  );
}

function ContradictionCard({
  contradiction,
  isSelected,
  onSelect,
  onDismiss,
  onRestore,
}: {
  contradiction: Contradiction;
  isSelected: boolean;
  onSelect: () => void;
  onDismiss: () => void;
  onRestore: () => void;
}) {
  // Truncate long statements for display
  const truncateText = (text: string, maxLength: number = 80): string => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div
      className={`contradiction-card ${isSelected ? 'selected' : ''} ${contradiction.isDismissed ? 'dismissed' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="contradiction-card-header">
        <span
          className={`contradiction-type-badge ${contradiction.severity}`}
          style={{ borderColor: getSeverityColor(contradiction.severity) }}
        >
          {contradiction.severity.toUpperCase()}
        </span>
        <span className="contradiction-type-label">
          {getContradictionTypeLabel(contradiction.type)}
        </span>
      </div>

      <div className="contradiction-statements">
        <div className="contradiction-statement">
          <span className="contradiction-statement-label">1</span>
          <span className="contradiction-statement-text">
            "{truncateText(contradiction.statement1.text)}"
          </span>
        </div>
        <div className="contradiction-statement">
          <span className="contradiction-statement-label">2</span>
          <span className="contradiction-statement-text">
            "{truncateText(contradiction.statement2.text)}"
          </span>
        </div>
      </div>

      {isSelected && (
        <>
          <div className="contradiction-explanation">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p>{contradiction.explanation}</p>
          </div>

          <div className="contradiction-suggestion">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <p>{contradiction.suggestion}</p>
          </div>

          <div className="contradiction-actions">
            {contradiction.isDismissed ? (
              <button
                type="button"
                className="contradiction-action-btn restore"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore();
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Restore
              </button>
            ) : (
              <button
                type="button"
                className="contradiction-action-btn dismiss"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Dismiss as False Positive
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function AIContradictionCheckerPanel() {
  const {
    isAnalyzing,
    analysis,
    error,
    isPanelOpen,
    selectedContradictionId,
  } = useAIContradictionChecker();

  const {
    analyzeText,
    selectContradiction,
    dismissContradiction,
    restoreContradiction,
    closePanel,
    clearError,
  } = useAIContradictionCheckerStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);

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
      if (selectedText.length >= 100) {
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

  const hasAnalysis = analysis !== null && analysis.totalStatements > 0;
  const activeContradictions = analysis?.contradictions.filter((c) => !c.isDismissed) || [];
  const dismissedContradictions = analysis?.contradictions.filter((c) => c.isDismissed) || [];
  const activeCount = getActiveContradictionsCount(analysis);

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        className="ai-contradiction-panel"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        role="complementary"
        aria-label="AI Contradiction Checker"
      >
        {/* Header */}
        <div className="contradiction-header">
          <div className="contradiction-title-row">
            <svg
              className="contradiction-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="contradiction-title">Consistency Check</h3>
          </div>
          <button
            type="button"
            className="contradiction-close"
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
          <div className="contradiction-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        {/* Instructions when no text analyzed */}
        {!hasAnalysis && !isAnalyzing && (
          <div className="contradiction-empty">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p>Select text to check for contradictions</p>
            <span className="contradiction-hint">
              Minimum 100 characters for analysis
            </span>
          </div>
        )}

        {/* Main content display */}
        {(hasAnalysis || isAnalyzing) && (
          <>
            {/* Consistency Score Badge */}
            <ConsistencyScoreBadge
              score={analysis?.consistencyScore || 0}
              isLoading={isAnalyzing}
            />

            {/* Stats row */}
            <div className="contradiction-stats">
              <div className="contradiction-stat">
                <span className="contradiction-stat-value">
                  {isAnalyzing ? '...' : analysis?.totalStatements}
                </span>
                <span className="contradiction-stat-label">Statements</span>
              </div>
              <div className="contradiction-stat">
                <span className="contradiction-stat-value">
                  {isAnalyzing ? '...' : activeCount}
                </span>
                <span className="contradiction-stat-label">Issues</span>
              </div>
              <div className="contradiction-stat">
                <span className="contradiction-stat-value">
                  {isAnalyzing ? '...' : dismissedContradictions.length}
                </span>
                <span className="contradiction-stat-label">Dismissed</span>
              </div>
            </div>
          </>
        )}

        {/* Success state - no contradictions */}
        {hasAnalysis && activeContradictions.length === 0 && !isAnalyzing && (
          <div className="contradiction-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No contradictions detected!</p>
            <span>Your document appears to be consistent.</span>
          </div>
        )}

        {/* Active Contradictions List */}
        {hasAnalysis && activeContradictions.length > 0 && (
          <div className="contradiction-list-section">
            <h4 className="contradiction-section-title">
              Potential Issues ({activeContradictions.length})
            </h4>
            <p className="contradiction-section-hint">
              Click an issue to see details and suggestions
            </p>
            <div className="contradiction-list">
              {activeContradictions.map((contradiction) => (
                <ContradictionCard
                  key={contradiction.id}
                  contradiction={contradiction}
                  isSelected={selectedContradictionId === contradiction.id}
                  onSelect={() =>
                    selectContradiction(
                      selectedContradictionId === contradiction.id
                        ? null
                        : contradiction.id
                    )
                  }
                  onDismiss={() => dismissContradiction(contradiction.id)}
                  onRestore={() => restoreContradiction(contradiction.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Dismissed Contradictions Section */}
        {hasAnalysis && dismissedContradictions.length > 0 && (
          <div className="contradiction-dismissed-section">
            <button
              type="button"
              className="contradiction-dismissed-toggle"
              onClick={() => setShowDismissed(!showDismissed)}
            >
              <span>Dismissed Items ({dismissedContradictions.length})</span>
              <svg
                className={showDismissed ? 'open' : ''}
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

            {showDismissed && (
              <div className="contradiction-list">
                {dismissedContradictions.map((contradiction) => (
                  <ContradictionCard
                    key={contradiction.id}
                    contradiction={contradiction}
                    isSelected={selectedContradictionId === contradiction.id}
                    onSelect={() =>
                      selectContradiction(
                        selectedContradictionId === contradiction.id
                          ? null
                          : contradiction.id
                      )
                    }
                    onDismiss={() => dismissContradiction(contradiction.id)}
                    onRestore={() => restoreContradiction(contradiction.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer hint */}
        <div className="contradiction-footer">
          <kbd>Esc</kbd> to close
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

AIContradictionCheckerPanel.displayName = 'AIContradictionCheckerPanel';
