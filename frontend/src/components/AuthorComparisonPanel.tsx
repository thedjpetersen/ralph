import { useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAIComparisonStore,
  useAIComparison,
  useStreamingCount,
} from '../stores/aiComparison';
import { usePersonasStore } from '../stores/personas';
import { useCommentHighlightStore } from '../stores/commentHighlight';
import { toast } from '../stores/toast';
import { AuthorFeedbackCard } from './AuthorFeedbackCard';
import './AuthorComparisonPanel.css';

interface AuthorComparisonPanelProps {
  /** ID of the target text element for applying suggestions */
  targetElementId?: string;
  /** Optional class name for styling */
  className?: string;
}

export function AuthorComparisonPanel({
  targetElementId,
  className = '',
}: AuthorComparisonPanelProps) {
  const {
    isComparisonMode,
    activeSession,
    selectedPersonas,
    isLoading,
    error,
  } = useAIComparison();

  const {
    toggleComparisonMode,
    addPersona,
    removePersona,
    clearSession,
    cancelComparison,
    clearError,
  } = useAIComparisonStore();

  const { personas } = usePersonasStore();
  const { targetElements } = useCommentHighlightStore();
  const streamingCount = useStreamingCount();

  // Get available personas that aren't already selected
  const availablePersonas = useMemo(() => {
    const selectedIds = new Set(selectedPersonas.map(p => p.id));
    return personas.filter(p => !selectedIds.has(p.id) && p.status === 'active');
  }, [personas, selectedPersonas]);

  // Handle accepting a suggestion from a specific author
  const handleAcceptSuggestion = useCallback((personaId: string) => {
    if (!activeSession || !targetElementId) return;

    const feedback = activeSession.feedbacks.get(personaId);
    if (!feedback) return;

    const targetElement = targetElements.get(targetElementId);
    if (!targetElement) {
      toast.error('Target element not found');
      return;
    }

    const { textRange } = activeSession;
    const currentValue = targetElement.value;

    // For now, we'll replace the selected text with the feedback text
    // In a real app, we'd parse the feedback for a specific suggestion
    const suggestedText = feedback.text;

    const newValue =
      currentValue.slice(0, textRange.startIndex) +
      suggestedText +
      currentValue.slice(textRange.endIndex);

    // Update the element value
    targetElement.value = newValue;

    // Trigger input event so React state updates
    const event = new Event('input', { bubbles: true });
    targetElement.dispatchEvent(event);

    // Update cursor position
    const newCursorPosition = textRange.startIndex + suggestedText.length;
    targetElement.setSelectionRange(newCursorPosition, newCursorPosition);
    targetElement.focus();

    // Show success and clear session
    toast.success(`Applied suggestion from ${feedback.personaName}`);
    clearSession();
  }, [activeSession, targetElementId, targetElements, clearSession]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isComparisonMode) return;

      // Escape to close comparison mode or cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeSession) {
          if (isLoading) {
            cancelComparison();
          } else {
            clearSession();
          }
        } else {
          toggleComparisonMode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isComparisonMode, activeSession, isLoading, toggleComparisonMode, cancelComparison, clearSession]);

  // Sort feedbacks by persona order
  const sortedFeedbacks = useMemo(() => {
    if (!activeSession) return [];
    return selectedPersonas
      .map(p => activeSession.feedbacks.get(p.id))
      .filter((f): f is NonNullable<typeof f> => f !== undefined);
  }, [activeSession, selectedPersonas]);

  // Get the column layout class based on number of personas
  const columnClass = useMemo(() => {
    switch (selectedPersonas.length) {
      case 2: return 'columns-2';
      case 3: return 'columns-3';
      case 4: return 'columns-4';
      default: return 'columns-2';
    }
  }, [selectedPersonas.length]);

  if (!isComparisonMode) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className={`author-comparison-panel ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        role="region"
        aria-label="Author comparison panel"
      >
        {/* Header */}
        <div className="comparison-header">
          <div className="comparison-title">
            <svg className="comparison-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M20 8v6M23 11h-6" />
            </svg>
            <span>Compare Authors</span>
            {streamingCount > 0 && (
              <span className="comparison-badge">
                {streamingCount} generating...
              </span>
            )}
          </div>
          <div className="comparison-actions">
            {activeSession && (
              <button
                type="button"
                className="comparison-btn comparison-clear"
                onClick={clearSession}
                aria-label="Clear comparison"
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Clear
              </button>
            )}
            <button
              type="button"
              className="comparison-btn comparison-close"
              onClick={toggleComparisonMode}
              aria-label="Close comparison mode"
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

        {/* Error display */}
        {error && (
          <div className="comparison-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={clearError}>Dismiss</button>
          </div>
        )}

        {/* Author selector */}
        <div className="author-selector">
          <div className="selected-authors">
            {selectedPersonas.map((persona) => (
              <div key={persona.id} className="selected-author-chip">
                <span>{persona.name}</span>
                <button
                  type="button"
                  onClick={() => removePersona(persona.id)}
                  aria-label={`Remove ${persona.name}`}
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
            ))}
          </div>

          {availablePersonas.length > 0 && selectedPersonas.length < 4 && (
            <div className="add-author-dropdown">
              <select
                onChange={(e) => {
                  const persona = availablePersonas.find(p => p.id === e.target.value);
                  if (persona) {
                    addPersona(persona);
                    e.target.value = '';
                  }
                }}
                aria-label="Add author to comparison"
                defaultValue=""
              >
                <option value="" disabled>+ Add author</option>
                {availablePersonas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Selected text display */}
        {activeSession && (
          <div className="comparison-selection">
            <span className="selection-label">Selected text:</span>
            <span className="selection-text">"{activeSession.selectedText}"</span>
          </div>
        )}

        {/* Comparison hint when no session */}
        {!activeSession && selectedPersonas.length >= 2 && (
          <div className="comparison-hint">
            <p>Select text to get feedback from {selectedPersonas.length} authors</p>
          </div>
        )}

        {/* Not enough authors hint */}
        {!activeSession && selectedPersonas.length < 2 && (
          <div className="comparison-hint warning">
            <p>Select at least 2 authors to compare</p>
          </div>
        )}

        {/* Feedback cards grid */}
        {activeSession && sortedFeedbacks.length > 0 && (
          <div className={`comparison-grid ${columnClass}`}>
            {sortedFeedbacks.map((feedback) => (
              <AuthorFeedbackCard
                key={feedback.id}
                feedback={feedback}
                onAccept={() => handleAcceptSuggestion(feedback.personaId)}
              />
            ))}
          </div>
        )}

        {/* Cancel button during loading */}
        {isLoading && (
          <div className="comparison-loading-actions">
            <button
              type="button"
              className="comparison-btn comparison-cancel"
              onClick={cancelComparison}
            >
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

AuthorComparisonPanel.displayName = 'AuthorComparisonPanel';
