/**
 * AI Outline Dialog
 *
 * Modal dialog for generating AI-powered document outlines with configurable depth options.
 * Features expandable/collapsible sections and click-to-navigate functionality.
 */

import { useCallback, useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { OutlineItem } from './OutlineItem';
import {
  useAIOutlineStore,
  OUTLINE_DEPTH_OPTIONS,
  countSections,
  type OutlineDepth,
} from '../stores/aiOutline';
import { toast } from '../stores/toast';
import './AIOutlineDialog.css';

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

const ExpandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M2 5V2h3M12 5V2H9M2 9v3h3M12 9v3H9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CollapseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M5 2v3H2M9 2v3h3M5 12V9H2M9 12V9h3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function AIOutlineDialog() {
  const {
    isOpen,
    inputTitle,
    selectedDepth,
    outline,
    isGenerating,
    error,
    onInsertOutline,
    closeOutlineDialog,
    setSelectedDepth,
    generateOutline,
    regenerateOutline,
    toggleSectionExpanded,
    expandAllSections,
    collapseAllSections,
    copyToClipboard,
    clearError,
    insertOutline,
    navigateToSection,
  } = useAIOutlineStore();

  const [copied, setCopied] = useState(false);

  // Auto-generate outline when dialog opens
  useEffect(() => {
    if (isOpen && !outline && !isGenerating) {
      generateOutline();
    }
  }, [isOpen, outline, isGenerating, generateOutline]);

  const handleDepthChange = useCallback(
    (depth: OutlineDepth) => {
      setSelectedDepth(depth);
      // Regenerate outline with new depth
      setTimeout(() => {
        regenerateOutline();
      }, 0);
    },
    [setSelectedDepth, regenerateOutline]
  );

  const handleCopy = useCallback(async () => {
    clearError();
    const success = await copyToClipboard();
    if (success) {
      setCopied(true);
      toast.success('Outline copied to clipboard as markdown');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [copyToClipboard, clearError]);

  const handleInsertOutline = useCallback(() => {
    if (outline && onInsertOutline) {
      insertOutline();
      toast.success('Outline inserted into document');
      closeOutlineDialog();
    }
  }, [outline, onInsertOutline, insertOutline, closeOutlineDialog]);

  const handleRegenerate = useCallback(() => {
    clearError();
    regenerateOutline();
  }, [clearError, regenerateOutline]);

  const handleNavigate = useCallback(
    (section: { id: string; level: 1 | 2 | 3 | 4; title: string }) => {
      navigateToSection(section as import('../stores/aiOutline').OutlineSection);
      toast.info(`Navigating to: ${section.title}`);
    },
    [navigateToSection]
  );

  if (!isOpen) {
    return null;
  }

  const sectionCount = outline ? countSections(outline) : 0;

  const footer = (
    <>
      <Button variant="secondary" onClick={closeOutlineDialog} disabled={isGenerating}>
        Close
      </Button>
      <div className="outline-dialog-actions-right">
        <Button
          variant="secondary"
          onClick={handleCopy}
          disabled={!outline || isGenerating}
          className="outline-action-btn"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        {onInsertOutline && (
          <Button
            variant="primary"
            onClick={handleInsertOutline}
            disabled={!outline || isGenerating}
            className="outline-action-btn"
          >
            <InsertIcon />
            Insert Outline
          </Button>
        )}
      </div>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeOutlineDialog}
      title="Generate Outline"
      size="lg"
      footer={footer}
    >
      <div className="outline-dialog">
        {/* Document Info */}
        <div className="outline-document-info">
          <div className="outline-document-header">
            <SparklesIcon />
            <h3 className="outline-document-title">{inputTitle}</h3>
          </div>
        </div>

        {/* Depth Selection */}
        <fieldset className="outline-depth-fieldset">
          <legend className="outline-section-label">Outline Depth</legend>
          <div className="outline-depth-options" role="radiogroup" aria-label="Select outline depth">
            {OUTLINE_DEPTH_OPTIONS.map((option) => {
              const isSelected = selectedDepth === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`outline-depth-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleDepthChange(option.value)}
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isGenerating}
                >
                  <span className="outline-depth-label">{option.label}</span>
                  <span className="outline-depth-description">{option.description}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Outline Output */}
        <div className="outline-output-section">
          <div className="outline-output-header">
            <span className="outline-section-label">Generated Outline</span>
            <div className="outline-output-actions">
              {outline && (
                <>
                  <button
                    type="button"
                    className="outline-expand-btn"
                    onClick={expandAllSections}
                    disabled={isGenerating}
                    aria-label="Expand all sections"
                  >
                    <ExpandIcon />
                    Expand
                  </button>
                  <button
                    type="button"
                    className="outline-expand-btn"
                    onClick={collapseAllSections}
                    disabled={isGenerating}
                    aria-label="Collapse all sections"
                  >
                    <CollapseIcon />
                    Collapse
                  </button>
                  <button
                    type="button"
                    className="outline-regenerate-btn"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    aria-label="Regenerate outline"
                  >
                    <RefreshIcon />
                    Regenerate
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={`outline-output ${isGenerating ? 'loading' : ''}`}>
            {isGenerating ? (
              <div className="outline-loading">
                <div className="outline-loading-spinner" />
                <span>Generating outline...</span>
              </div>
            ) : outline ? (
              <div className="outline-tree">
                {outline.map((section) => (
                  <OutlineItem
                    key={section.id}
                    section={section}
                    onToggleExpanded={toggleSectionExpanded}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            ) : (
              <div className="outline-empty">
                <p>Click &quot;Generate&quot; to create an outline from your content.</p>
              </div>
            )}
          </div>

          {outline && !isGenerating && (
            <div className="outline-stats">
              <span>{sectionCount} sections</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="outline-error" role="alert">
            <span className="outline-error-icon" aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

AIOutlineDialog.displayName = 'AIOutlineDialog';
