/**
 * AI Paragraph Reorder Panel
 *
 * Displays AI-suggested paragraph reordering in a floating panel.
 * Features:
 * - Draggable paragraph preview for manual reordering
 * - AI suggestions with reasoning
 * - Apply/dismiss/undo actions
 */

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAIParagraphReorderStore,
  useAIParagraphReorder,
  type ParagraphItem,
  type ReorderSuggestion,
} from '../stores/aiParagraphReorder';
import { DraggableList, type DraggableItem } from './ui/DraggableList';
import './AIParagraphReorderPanel.css';

// Extended paragraph item for DraggableList
interface DraggableParagraph extends DraggableItem {
  index: number;
  content: string;
  type: string;
  preview: string;
  originalIndex: number;
}

function ImprovementScoreBadge({
  score,
  isLoading,
}: {
  score: number;
  isLoading: boolean;
}) {
  const getScoreClass = (): string => {
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  };

  const getScoreLabel = (): string => {
    if (score >= 70) return 'Strong Improvement';
    if (score >= 50) return 'Moderate Improvement';
    return 'Minor Improvement';
  };

  return (
    <div className={`reorder-score-badge ${getScoreClass()}`}>
      <div className="reorder-score-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
      <div className="reorder-score-content">
        <span className="reorder-score-value">
          {isLoading ? '...' : `${Math.round(score)}%`}
        </span>
        <span className="reorder-score-label">
          {isLoading ? 'Analyzing...' : getScoreLabel()}
        </span>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  isSelected,
  onSelect,
}: {
  suggestion: ReorderSuggestion;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const changedPositions = useMemo(() => {
    let count = 0;
    for (let i = 0; i < suggestion.originalOrder.length; i++) {
      if (suggestion.originalOrder[i] !== suggestion.suggestedOrder[i]) {
        count++;
      }
    }
    return count;
  }, [suggestion]);

  return (
    <div
      className={`reorder-suggestion-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="reorder-suggestion-header">
        <span className="reorder-suggestion-score">
          {suggestion.improvementScore}% improvement
        </span>
        <span className="reorder-suggestion-changes">
          {changedPositions} {changedPositions === 1 ? 'change' : 'changes'}
        </span>
      </div>
      {isSelected && (
        <div className="reorder-suggestion-reasoning">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <p>{suggestion.reasoning}</p>
        </div>
      )}
    </div>
  );
}

function ParagraphPreviewItem({
  paragraph,
  originalIndex,
  currentIndex,
  isDragging,
}: {
  paragraph: ParagraphItem;
  originalIndex: number;
  currentIndex: number;
  isDragging: boolean;
}) {
  const moved = originalIndex !== currentIndex;
  const direction = currentIndex < originalIndex ? 'up' : currentIndex > originalIndex ? 'down' : null;

  return (
    <div className={`reorder-paragraph-item ${isDragging ? 'dragging' : ''} ${moved ? 'moved' : ''}`}>
      <div className="reorder-paragraph-index">
        <span className="reorder-paragraph-number">{currentIndex + 1}</span>
        {moved && direction && (
          <span className={`reorder-paragraph-direction ${direction}`}>
            {direction === 'up' ? (
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        )}
      </div>
      <div className="reorder-paragraph-content">
        <span className={`reorder-paragraph-type ${paragraph.type}`}>
          {paragraph.type}
        </span>
        <p className="reorder-paragraph-preview">{paragraph.preview}</p>
      </div>
    </div>
  );
}

export function AIParagraphReorderPanel() {
  const {
    isPanelOpen,
    isAnalyzing,
    error,
    paragraphs,
    previewOrder,
    suggestions,
    selectedSuggestionId,
    showReasoning,
  } = useAIParagraphReorder();

  const {
    selectSuggestion,
    applyPreviewOrder,
    applySuggestion,
    dismissPanel,
    closePanel,
    toggleReasoning,
    clearError,
  } = useAIParagraphReorderStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // Create ordered paragraph items for display
  const orderedParagraphs: DraggableParagraph[] = useMemo(() => {
    return previewOrder.map((originalIdx, currentIdx) => {
      const para = paragraphs[originalIdx];
      return {
        id: `para-${originalIdx}`,
        index: currentIdx,
        content: para?.content || '',
        type: para?.type || 'paragraph',
        preview: para?.preview || '',
        originalIndex: originalIdx,
      };
    });
  }, [previewOrder, paragraphs]);

  // Handle reorder from drag-and-drop
  const handleReorder = useCallback(
    (newItems: DraggableParagraph[]) => {
      const newOrder = newItems.map((item) => item.originalIndex);
      applyPreviewOrder(newOrder);
    },
    [applyPreviewOrder]
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
      if (!isPanelOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        applySuggestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen, closePanel, applySuggestion]);

  if (!isPanelOpen) return null;

  const selectedSuggestion = suggestions.find((s) => s.id === selectedSuggestionId);
  const displayedSuggestions = showAllSuggestions ? suggestions : suggestions.slice(0, 3);

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        className="ai-reorder-panel"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        role="complementary"
        aria-label="AI Paragraph Reorder"
      >
        {/* Header */}
        <div className="reorder-header">
          <div className="reorder-title-row">
            <svg
              className="reorder-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
              <path d="M8 6V4m0 14v2m8-18V4m0 14v2" />
            </svg>
            <h3 className="reorder-title">Paragraph Reorder</h3>
          </div>
          <button
            type="button"
            className="reorder-close"
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
          <div className="reorder-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}

        {/* Loading state */}
        {isAnalyzing && (
          <div className="reorder-loading">
            <div className="reorder-spinner" />
            <p>Analyzing document structure...</p>
          </div>
        )}

        {/* Improvement Score Badge */}
        {!isAnalyzing && selectedSuggestion && (
          <ImprovementScoreBadge
            score={selectedSuggestion.improvementScore}
            isLoading={isAnalyzing}
          />
        )}

        {/* Stats row */}
        {!isAnalyzing && paragraphs.length > 0 && (
          <div className="reorder-stats">
            <div className="reorder-stat">
              <span className="reorder-stat-value">{paragraphs.length}</span>
              <span className="reorder-stat-label">Paragraphs</span>
            </div>
            <div className="reorder-stat">
              <span className="reorder-stat-value">{suggestions.length}</span>
              <span className="reorder-stat-label">Suggestions</span>
            </div>
            <div className="reorder-stat">
              <span className="reorder-stat-value">
                {selectedSuggestion
                  ? selectedSuggestion.suggestedOrder.filter(
                      (idx, i) => idx !== selectedSuggestion.originalOrder[i]
                    ).length
                  : 0}
              </span>
              <span className="reorder-stat-label">Changes</span>
            </div>
          </div>
        )}

        {/* Suggestions List */}
        {!isAnalyzing && suggestions.length > 0 && (
          <div className="reorder-suggestions-section">
            <div className="reorder-section-header">
              <h4 className="reorder-section-title">
                Suggestions ({suggestions.length})
              </h4>
              <button
                type="button"
                className="reorder-reasoning-toggle"
                onClick={toggleReasoning}
              >
                {showReasoning ? 'Hide' : 'Show'} reasoning
              </button>
            </div>
            <div className="reorder-suggestions-list">
              {displayedSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  isSelected={selectedSuggestionId === suggestion.id && showReasoning}
                  onSelect={() => selectSuggestion(suggestion.id)}
                />
              ))}
            </div>
            {suggestions.length > 3 && (
              <button
                type="button"
                className="reorder-show-more"
                onClick={() => setShowAllSuggestions(!showAllSuggestions)}
              >
                {showAllSuggestions
                  ? 'Show less'
                  : `Show ${suggestions.length - 3} more`}
              </button>
            )}
          </div>
        )}

        {/* No suggestions */}
        {!isAnalyzing && suggestions.length === 0 && paragraphs.length > 0 && (
          <div className="reorder-no-suggestions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Your document structure looks good!</p>
            <span>No reordering suggestions needed.</span>
          </div>
        )}

        {/* Draggable Paragraph Preview */}
        {!isAnalyzing && paragraphs.length > 0 && (
          <div className="reorder-preview-section">
            <div className="reorder-section-header">
              <h4 className="reorder-section-title">Preview Order</h4>
              <span className="reorder-drag-hint">Drag to reorder</span>
            </div>
            <div className="reorder-preview-list">
              <DraggableList
                items={orderedParagraphs}
                onReorder={handleReorder}
                gap={6}
                renderItem={(item, index, isDragging) => (
                  <ParagraphPreviewItem
                    paragraph={{
                      id: item.id,
                      index: item.index,
                      content: item.content,
                      type: item.type,
                      preview: item.preview,
                    }}
                    originalIndex={item.originalIndex}
                    currentIndex={index}
                    isDragging={isDragging}
                  />
                )}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isAnalyzing && paragraphs.length > 0 && (
          <div className="reorder-actions">
            <button
              type="button"
              className="reorder-action-btn dismiss"
              onClick={dismissPanel}
            >
              Dismiss
            </button>
            <button
              type="button"
              className="reorder-action-btn apply"
              onClick={applySuggestion}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Apply Changes
            </button>
          </div>
        )}

        {/* Footer hint */}
        <div className="reorder-footer">
          <kbd>Esc</kbd> to close
          <span className="reorder-footer-divider">|</span>
          <kbd>Cmd</kbd>+<kbd>Enter</kbd> to apply
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

AIParagraphReorderPanel.displayName = 'AIParagraphReorderPanel';
