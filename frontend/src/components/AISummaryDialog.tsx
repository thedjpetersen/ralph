/**
 * AI Summary Dialog
 *
 * Modal dialog for generating AI-powered document summaries with configurable length options.
 * Features copy to clipboard and insert at document top functionality.
 */

import { useCallback, useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAISummaryStore, SUMMARY_LENGTH_OPTIONS, type SummaryLength } from '../stores/aiSummary';
import { toast } from '../stores/toast';
import './AISummaryDialog.css';

// Icons
const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M10 2L11.5 6.5L16 8L11.5 9.5L10 14L8.5 9.5L4 8L8.5 6.5L10 2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 12L15.75 14.25L18 15L15.75 15.75L15 18L14.25 15.75L12 15L14.25 14.25L15 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 12L5.5 13.5L7 14L5.5 14.5L5 16L4.5 14.5L3 14L4.5 13.5L5 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="5" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M3 11V3a1 1 0 011-1h8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M13 4L6 11L3 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M14 8A6 6 0 112 8a6 6 0 0112 0z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M14 4v4h-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const InsertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3 3h10M3 7h6M3 11h10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M11 5v6M8 8h6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export function AISummaryDialog() {
  const {
    isOpen,
    documentTitle,
    selectedLength,
    summary,
    isGenerating,
    error,
    onInsertAtTop,
    closeSummaryDialog,
    setSelectedLength,
    generateSummary,
    regenerateSummary,
    copyToClipboard,
    clearError,
    insertAtTop,
  } = useAISummaryStore();

  const [copied, setCopied] = useState(false);

  // Auto-generate summary when dialog opens
  useEffect(() => {
    if (isOpen && !summary && !isGenerating) {
      generateSummary();
    }
  }, [isOpen, summary, isGenerating, generateSummary]);

  const handleLengthChange = useCallback(
    (length: SummaryLength) => {
      setSelectedLength(length);
      // Regenerate summary with new length
      setTimeout(() => {
        regenerateSummary();
      }, 0);
    },
    [setSelectedLength, regenerateSummary]
  );

  const handleCopy = useCallback(async () => {
    clearError();
    const success = await copyToClipboard();
    if (success) {
      setCopied(true);
      toast.success('Summary copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [copyToClipboard, clearError]);

  const handleInsertAtTop = useCallback(() => {
    if (summary && onInsertAtTop) {
      insertAtTop();
      toast.success('Summary inserted at document top');
      closeSummaryDialog();
    }
  }, [summary, onInsertAtTop, insertAtTop, closeSummaryDialog]);

  const handleRegenerate = useCallback(() => {
    clearError();
    regenerateSummary();
  }, [clearError, regenerateSummary]);

  if (!isOpen) {
    return null;
  }

  const wordCount = summary ? summary.split(/\s+/).length : 0;

  const footer = (
    <>
      <Button variant="secondary" onClick={closeSummaryDialog} disabled={isGenerating}>
        Close
      </Button>
      <div className="summary-dialog-actions-right">
        <Button
          variant="secondary"
          onClick={handleCopy}
          disabled={!summary || isGenerating}
          className="summary-action-btn"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        {onInsertAtTop && (
          <Button
            variant="primary"
            onClick={handleInsertAtTop}
            disabled={!summary || isGenerating}
            className="summary-action-btn"
          >
            <InsertIcon />
            Insert at Top
          </Button>
        )}
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeSummaryDialog}
      title="Generate Summary"
      size="lg"
      footer={footer}
    >
      <div className="summary-dialog">
        {/* Document Info */}
        <div className="summary-document-info">
          <div className="summary-document-header">
            <SparklesIcon />
            <h3 className="summary-document-title">{documentTitle}</h3>
          </div>
        </div>

        {/* Length Selection */}
        <fieldset className="summary-length-fieldset">
          <legend className="summary-section-label">Summary Length</legend>
          <div className="summary-length-options" role="radiogroup" aria-label="Select summary length">
            {SUMMARY_LENGTH_OPTIONS.map((option) => {
              const isSelected = selectedLength === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`summary-length-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleLengthChange(option.value)}
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isGenerating}
                >
                  <span className="summary-length-label">{option.label}</span>
                  <span className="summary-length-description">{option.description}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Summary Output */}
        <div className="summary-output-section">
          <div className="summary-output-header">
            <span className="summary-section-label">Generated Summary</span>
            {summary && (
              <button
                type="button"
                className="summary-regenerate-btn"
                onClick={handleRegenerate}
                disabled={isGenerating}
                aria-label="Regenerate summary"
              >
                <RefreshIcon />
                Regenerate
              </button>
            )}
          </div>

          <div className={`summary-output ${isGenerating ? 'loading' : ''}`}>
            {isGenerating ? (
              <div className="summary-loading">
                <div className="summary-loading-spinner" />
                <span>Generating summary...</span>
              </div>
            ) : summary ? (
              <div className="summary-text">{summary}</div>
            ) : (
              <div className="summary-empty">
                <p>Click &quot;Generate&quot; to create a summary of your document.</p>
              </div>
            )}
          </div>

          {summary && !isGenerating && (
            <div className="summary-stats">
              <span>{wordCount} words</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="summary-error" role="alert">
            <span className="summary-error-icon" aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

AISummaryDialog.displayName = 'AISummaryDialog';
