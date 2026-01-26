/**
 * AI Writing Prompts Panel
 *
 * Displays writing prompts and opening lines in a panel.
 * Shows on empty documents to help overcome writer's block.
 * Features document type selection and regenerate functionality.
 */

import { useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAIWritingPromptsStore,
  useAIWritingPrompts,
  DOCUMENT_TYPE_OPTIONS,
  type WritingPrompt,
  type DocumentType,
} from '../stores/aiWritingPrompts';
import './AIWritingPromptsPanel.css';

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

const LightbulbIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M8 1v1M14 8h1M1 8h1M12.364 3.636l-.707.707M3.636 3.636l.707.707"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M6 14h4M6.5 12v-1.5a3.5 3.5 0 113 0V12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M11.586 2.586a2 2 0 112.828 2.828l-8 8L3 14l.586-3.414 8-8z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface PromptCardProps {
  prompt: WritingPrompt;
  onSelect: (text: string) => void;
}

function PromptCard({ prompt, onSelect }: PromptCardProps) {
  const isOpeningLine = prompt.type === 'opening_line';

  return (
    <motion.button
      type="button"
      className={`writing-prompt-card ${isOpeningLine ? 'opening-line' : 'prompt'}`}
      onClick={() => onSelect(prompt.text)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="prompt-card-header">
        <span className="prompt-card-type">
          {isOpeningLine ? <PenIcon /> : <LightbulbIcon />}
          {isOpeningLine ? 'Opening Line' : 'Writing Prompt'}
        </span>
        <span className="prompt-card-category">{prompt.category}</span>
      </div>
      <p className="prompt-card-text">{prompt.text}</p>
      <span className="prompt-card-hint">Click to insert</span>
    </motion.button>
  );
}

interface AIWritingPromptsPanelProps {
  onSelectPrompt: (text: string) => void;
  showAsEmptyState?: boolean;
}

export function AIWritingPromptsPanel({
  onSelectPrompt,
  showAsEmptyState = false
}: AIWritingPromptsPanelProps) {
  const {
    prompts,
    isLoading,
    error,
    isOpen,
    selectedDocumentType,
  } = useAIWritingPrompts();

  const {
    generatePrompts,
    regeneratePrompts,
    closePrompts,
    setDocumentType,
    clearError,
  } = useAIWritingPromptsStore();

  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-generate prompts when panel opens
  useEffect(() => {
    if (isOpen && prompts.length === 0 && !isLoading) {
      generatePrompts();
    }
  }, [isOpen, prompts.length, isLoading, generatePrompts]);

  const handleDocumentTypeChange = useCallback(
    (type: DocumentType) => {
      setDocumentType(type);
      generatePrompts(type);
    },
    [setDocumentType, generatePrompts]
  );

  const handleSelectPrompt = useCallback(
    (text: string) => {
      onSelectPrompt(text);
      if (!showAsEmptyState) {
        closePrompts();
      }
    },
    [onSelectPrompt, closePrompts, showAsEmptyState]
  );

  const handleRegenerate = useCallback(() => {
    clearError();
    regeneratePrompts();
  }, [clearError, regeneratePrompts]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePrompts();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePrompts]);

  // Handle click outside (only for floating panel mode)
  useEffect(() => {
    if (!isOpen || showAsEmptyState) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePrompts();
      }
    };

    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, showAsEmptyState, closePrompts]);

  if (!isOpen) return null;

  // Empty state variant (inline within document)
  if (showAsEmptyState) {
    return (
      <div className="ai-writing-prompts-empty-state" ref={panelRef}>
        <div className="empty-state-header">
          <SparklesIcon />
          <h3>Start Writing</h3>
          <p>Choose a prompt or opening line to get started</p>
        </div>

        {/* Document Type Selector */}
        <div className="document-type-selector">
          <label className="document-type-label">Document Type</label>
          <div className="document-type-options" role="radiogroup" aria-label="Select document type">
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`document-type-option ${selectedDocumentType === option.value ? 'selected' : ''}`}
                onClick={() => handleDocumentTypeChange(option.value)}
                role="radio"
                aria-checked={selectedDocumentType === option.value}
                disabled={isLoading}
                title={option.description}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="prompts-error" role="alert">
            <span className="prompts-error-icon">!</span>
            <span>{error}</span>
            <button type="button" onClick={clearError}>Dismiss</button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="prompts-loading">
            <div className="prompts-loading-spinner" />
            <span>Generating prompts...</span>
          </div>
        )}

        {/* Prompts Grid */}
        {!isLoading && prompts.length > 0 && (
          <>
            <div className="prompts-grid">
              <AnimatePresence mode="popLayout">
                {prompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onSelect={handleSelectPrompt}
                  />
                ))}
              </AnimatePresence>
            </div>

            <button
              type="button"
              className="regenerate-button"
              onClick={handleRegenerate}
              disabled={isLoading}
            >
              <RefreshIcon />
              Generate New Prompts
            </button>
          </>
        )}
      </div>
    );
  }

  // Floating panel variant
  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        className="ai-writing-prompts-panel"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-label="AI Writing Prompts"
      >
        {/* Header */}
        <div className="prompts-panel-header">
          <div className="prompts-panel-title-row">
            <SparklesIcon />
            <h3 className="prompts-panel-title">Writing Prompts</h3>
          </div>
          <button
            type="button"
            className="prompts-panel-close"
            onClick={closePrompts}
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

        {/* Document Type Selector */}
        <div className="document-type-selector compact">
          <label className="document-type-label">Type</label>
          <select
            value={selectedDocumentType}
            onChange={(e) => handleDocumentTypeChange(e.target.value as DocumentType)}
            disabled={isLoading}
            className="document-type-select"
          >
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error State */}
        {error && (
          <div className="prompts-error" role="alert">
            <span className="prompts-error-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="prompts-loading">
            <div className="prompts-loading-spinner" />
            <span>Generating prompts...</span>
          </div>
        )}

        {/* Prompts List */}
        {!isLoading && prompts.length > 0 && (
          <div className="prompts-list">
            <AnimatePresence mode="popLayout">
              {prompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onSelect={handleSelectPrompt}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Footer */}
        <div className="prompts-panel-footer">
          <button
            type="button"
            className="regenerate-button-small"
            onClick={handleRegenerate}
            disabled={isLoading}
          >
            <RefreshIcon />
            Regenerate
          </button>
          <span className="prompts-footer-hint">
            <kbd>Esc</kbd> to close
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

AIWritingPromptsPanel.displayName = 'AIWritingPromptsPanel';
