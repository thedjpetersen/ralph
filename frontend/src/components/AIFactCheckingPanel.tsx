/**
 * AI Fact-Checking Panel
 *
 * Displays fact-checking analysis results in a floating panel.
 * Shows detected claims, verification confidence, suggested sources,
 * and ability to dismiss false positives.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAIFactCheckingStore,
  useAIFactChecking,
  getClaimCategoryLabel,
  getStatusColor,
  getStatusLabel,
  getActiveClaimsCount,
  type FactCheckItem,
  type VerificationStatus,
} from '../stores/aiFactChecking';
import './AIFactCheckingPanel.css';

function ConfidenceBadge({
  confidence,
  isLoading,
}: {
  confidence: number;
  isLoading: boolean;
}) {
  const getConfidenceClass = (): string => {
    if (confidence >= 80) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  };

  const getConfidenceLabel = (): string => {
    if (confidence >= 80) return 'High Confidence';
    if (confidence >= 50) return 'Review Recommended';
    return 'Needs Verification';
  };

  return (
    <div className={`factcheck-confidence-badge ${getConfidenceClass()}`}>
      <div className="factcheck-confidence-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <div className="factcheck-confidence-content">
        <span className="factcheck-confidence-value">
          {isLoading ? '...' : `${Math.round(confidence)}%`}
        </span>
        <span className="factcheck-confidence-label">
          {isLoading ? 'Analyzing...' : getConfidenceLabel()}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span
      className={`factcheck-status-badge ${status.replace('_', '-')}`}
      style={{ borderColor: getStatusColor(status) }}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function ClaimCard({
  claim,
  isSelected,
  onSelect,
  onDismiss,
  onRestore,
  onHover,
}: {
  claim: FactCheckItem;
  isSelected: boolean;
  onSelect: () => void;
  onDismiss: () => void;
  onRestore: () => void;
  onHover: (hovering: boolean) => void;
}) {
  // Truncate long text for display
  const truncateText = (text: string, maxLength: number = 100): string => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div
      className={`factcheck-card ${isSelected ? 'selected' : ''} ${claim.isDismissed ? 'dismissed' : ''}`}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="factcheck-card-header">
        <span className="factcheck-category-badge">
          {getClaimCategoryLabel(claim.category)}
        </span>
        <StatusBadge status={claim.status} />
      </div>

      <div className="factcheck-claim-text">
        "{truncateText(claim.text)}"
      </div>

      <div className="factcheck-confidence-bar">
        <div className="factcheck-confidence-bar-label">
          <span>Confidence</span>
          <span>{claim.confidence}%</span>
        </div>
        <div className="factcheck-confidence-bar-track">
          <div
            className="factcheck-confidence-bar-fill"
            style={{
              width: `${claim.confidence}%`,
              backgroundColor: getStatusColor(claim.status),
            }}
          />
        </div>
      </div>

      {isSelected && (
        <>
          <div className="factcheck-explanation">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p>{claim.explanation}</p>
          </div>

          <div className="factcheck-sources">
            <h5 className="factcheck-sources-title">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" />
              </svg>
              Suggested Sources
            </h5>
            <ul className="factcheck-sources-list">
              {claim.sources.map((source, index) => (
                <li key={index}>{source}</li>
              ))}
            </ul>
          </div>

          <div className="factcheck-actions">
            {claim.isDismissed ? (
              <button
                type="button"
                className="factcheck-action-btn restore"
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
                className="factcheck-action-btn dismiss"
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
                Dismiss
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function AIFactCheckingPanel() {
  const {
    isAnalyzing,
    analysis,
    error,
    isPanelOpen,
    isFactCheckingEnabled,
    selectedClaimId,
  } = useAIFactChecking();

  const {
    analyzeText,
    selectClaim,
    hoverClaim,
    dismissClaim,
    restoreClaim,
    closePanel,
    toggleFactChecking,
    clearError,
  } = useAIFactCheckingStore();

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

  const hasAnalysis = analysis !== null && analysis.totalClaims > 0;
  const activeClaims = analysis?.claims.filter((c) => !c.isDismissed) || [];
  const dismissedClaims = analysis?.claims.filter((c) => c.isDismissed) || [];
  const activeCount = getActiveClaimsCount(analysis);

  // Count claims by status
  const needsVerification = activeClaims.filter(c => c.status === 'needs_verification' || c.status === 'questionable').length;

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        className="ai-factcheck-panel"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        role="complementary"
        aria-label="AI Fact-Checking"
      >
        {/* Header */}
        <div className="factcheck-header">
          <div className="factcheck-title-row">
            <svg
              className="factcheck-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="factcheck-title">Fact Check</h3>
          </div>
          <button
            type="button"
            className="factcheck-close"
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

        {/* Fact-checking toggle */}
        <div className="factcheck-toggle-row">
          <span className="factcheck-toggle-label">
            Highlight claims in document
          </span>
          <button
            type="button"
            className={`factcheck-toggle ${isFactCheckingEnabled ? 'enabled' : ''}`}
            onClick={toggleFactChecking}
            aria-pressed={isFactCheckingEnabled}
          >
            <span className="factcheck-toggle-track">
              <span className="factcheck-toggle-thumb" />
            </span>
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="factcheck-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        {/* Instructions when no text analyzed */}
        {!hasAnalysis && !isAnalyzing && (
          <div className="factcheck-empty">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Select text to check for factual claims</p>
            <span className="factcheck-hint">
              Minimum 50 characters for analysis
            </span>
          </div>
        )}

        {/* Main content display */}
        {(hasAnalysis || isAnalyzing) && (
          <>
            {/* Confidence Badge */}
            <ConfidenceBadge
              confidence={analysis?.overallConfidence || 0}
              isLoading={isAnalyzing}
            />

            {/* Stats row */}
            <div className="factcheck-stats">
              <div className="factcheck-stat">
                <span className="factcheck-stat-value">
                  {isAnalyzing ? '...' : activeCount}
                </span>
                <span className="factcheck-stat-label">Claims Found</span>
              </div>
              <div className="factcheck-stat warning">
                <span className="factcheck-stat-value">
                  {isAnalyzing ? '...' : needsVerification}
                </span>
                <span className="factcheck-stat-label">Need Review</span>
              </div>
              <div className="factcheck-stat">
                <span className="factcheck-stat-value">
                  {isAnalyzing ? '...' : dismissedClaims.length}
                </span>
                <span className="factcheck-stat-label">Dismissed</span>
              </div>
            </div>
          </>
        )}

        {/* Success state - no claims */}
        {hasAnalysis && activeClaims.length === 0 && !isAnalyzing && (
          <div className="factcheck-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No factual claims detected!</p>
            <span>Your text appears to be opinion or narrative.</span>
          </div>
        )}

        {/* Active Claims List */}
        {hasAnalysis && activeClaims.length > 0 && (
          <div className="factcheck-list-section">
            <h4 className="factcheck-section-title">
              Factual Claims ({activeClaims.length})
            </h4>
            <p className="factcheck-section-hint">
              Click a claim to see sources and details
            </p>
            <div className="factcheck-list">
              {activeClaims.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  isSelected={selectedClaimId === claim.id}
                  onSelect={() =>
                    selectClaim(
                      selectedClaimId === claim.id
                        ? null
                        : claim.id
                    )
                  }
                  onDismiss={() => dismissClaim(claim.id)}
                  onRestore={() => restoreClaim(claim.id)}
                  onHover={(hovering) => hoverClaim(hovering ? claim.id : null)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Dismissed Claims Section */}
        {hasAnalysis && dismissedClaims.length > 0 && (
          <div className="factcheck-dismissed-section">
            <button
              type="button"
              className="factcheck-dismissed-toggle"
              onClick={() => setShowDismissed(!showDismissed)}
            >
              <span>Dismissed Claims ({dismissedClaims.length})</span>
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
              <div className="factcheck-list">
                {dismissedClaims.map((claim) => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    isSelected={selectedClaimId === claim.id}
                    onSelect={() =>
                      selectClaim(
                        selectedClaimId === claim.id
                          ? null
                          : claim.id
                      )
                    }
                    onDismiss={() => dismissClaim(claim.id)}
                    onRestore={() => restoreClaim(claim.id)}
                    onHover={(hovering) => hoverClaim(hovering ? claim.id : null)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer hint */}
        <div className="factcheck-footer">
          <kbd>Esc</kbd> to close
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

AIFactCheckingPanel.displayName = 'AIFactCheckingPanel';
