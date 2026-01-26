import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hexToRgba, getAuthorColor } from '../stores/commentHighlight';
import type { Persona } from '../stores/personas';
import './AuthorPreviewDialog.css';

interface AuthorPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickAdd?: () => void;
  persona: Persona | null;
  showQuickAdd?: boolean;
  isAddingAuthor?: boolean;
}

// Default sample texts to preview author's voice
const SAMPLE_TEXTS = [
  "The sun set behind the mountains, casting long shadows across the valley.",
  "She walked into the room, unaware of what awaited her.",
  "Technology has fundamentally changed how we communicate with each other.",
  "The old clock tower had stood for centuries, watching over the town below.",
];

export function AuthorPreviewDialog({
  isOpen,
  onClose,
  onQuickAdd,
  persona,
  showQuickAdd = false,
  isAddingAuthor = false,
}: AuthorPreviewDialogProps) {
  const [selectedSample, setSelectedSample] = useState(0);
  const [customText, setCustomText] = useState('');
  const [useCustomText, setUseCustomText] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const authorColor = persona ? getAuthorColor(persona.id) : '#646cff';

  // Get the text to use for preview
  const getSampleText = useCallback(() => {
    return useCustomText && customText.trim()
      ? customText.trim()
      : SAMPLE_TEXTS[selectedSample];
  }, [useCustomText, customText, selectedSample]);

  // Generate preview when dialog opens or sample changes
  const generatePreview = useCallback(async () => {
    if (!persona || !isOpen) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsGenerating(true);
    setPreviewText('');
    setError(null);

    try {
      const response = await fetch('/api/ai/author-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona_id: persona.id,
          sample_text: getSampleText(),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        setPreviewText(accumulatedText);
      }

      setIsGenerating(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsGenerating(false);
    }
  }, [persona, isOpen, getSampleText]);

  // Trigger preview generation when dialog opens
  useEffect(() => {
    if (isOpen && persona) {
      generatePreview();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, persona]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll content during streaming
  useEffect(() => {
    if (isGenerating && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [previewText, isGenerating]);

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setPreviewText('');
    setError(null);
    setIsGenerating(false);
    onClose();
  };

  const handleSampleChange = (index: number) => {
    setSelectedSample(index);
    setUseCustomText(false);
    generatePreview();
  };

  const handleCustomTextToggle = () => {
    setUseCustomText(!useCustomText);
    if (!useCustomText && customText.trim()) {
      generatePreview();
    }
  };

  const handleRegenerate = () => {
    generatePreview();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!persona) return null;

  const avatarInitial = persona.name.charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="author-preview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Dialog */}
          <motion.div
            className="author-preview-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="author-preview-title"
            onKeyDown={handleKeyDown}
            style={{
              '--preview-author-color': authorColor,
              '--preview-author-color-light': hexToRgba(authorColor, 0.1),
              '--preview-author-color-medium': hexToRgba(authorColor, 0.3),
            } as React.CSSProperties}
          >
            {/* Header */}
            <div className="author-preview-header">
              <div className="author-preview-author">
                {persona.avatar_url ? (
                  <img
                    src={persona.avatar_url}
                    alt={persona.name}
                    className="author-preview-avatar"
                  />
                ) : (
                  <div
                    className="author-preview-avatar-placeholder"
                    style={{ backgroundColor: hexToRgba(authorColor, 0.2), color: authorColor }}
                  >
                    {avatarInitial}
                  </div>
                )}
                <div className="author-preview-author-info">
                  <h2 id="author-preview-title" className="author-preview-name">
                    {persona.name}
                  </h2>
                  <span className="author-preview-subtitle">Author Voice Preview</span>
                </div>
              </div>
              <button
                type="button"
                className="author-preview-close"
                onClick={handleClose}
                aria-label="Close preview"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sample Selection */}
            <div className="author-preview-samples">
              <label className="author-preview-samples-label">Sample Text:</label>
              <div className="author-preview-samples-list">
                {SAMPLE_TEXTS.map((text, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`author-preview-sample-btn ${selectedSample === index && !useCustomText ? 'active' : ''}`}
                    onClick={() => handleSampleChange(index)}
                    title={text}
                  >
                    Sample {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className={`author-preview-sample-btn ${useCustomText ? 'active' : ''}`}
                  onClick={handleCustomTextToggle}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Custom Text Input */}
            {useCustomText && (
              <div className="author-preview-custom">
                <textarea
                  className="author-preview-custom-input"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Enter your own text to see how this author would rewrite it..."
                  rows={3}
                />
                <button
                  type="button"
                  className="author-preview-generate-btn"
                  onClick={generatePreview}
                  disabled={!customText.trim() || isGenerating}
                >
                  Generate Preview
                </button>
              </div>
            )}

            {/* Original Text */}
            <div className="author-preview-original">
              <span className="author-preview-section-label">Original Text:</span>
              <p className="author-preview-original-text">{getSampleText()}</p>
            </div>

            {/* Preview Content */}
            <div className="author-preview-content-wrapper">
              <span className="author-preview-section-label">
                Rewritten by {persona.name}:
              </span>
              <div className="author-preview-content" ref={contentRef}>
                {error ? (
                  <div className="author-preview-error">
                    <p>{error}</p>
                    <button
                      type="button"
                      className="author-preview-retry-btn"
                      onClick={handleRegenerate}
                    >
                      Try Again
                    </button>
                  </div>
                ) : isGenerating && !previewText ? (
                  <div className="author-preview-generating">
                    <span className="author-preview-thinking">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </span>
                    <span className="author-preview-thinking-text">Generating preview...</span>
                  </div>
                ) : (
                  <p className="author-preview-text">
                    {previewText}
                    {isGenerating && (
                      <span className="author-preview-cursor" aria-hidden="true" />
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="author-preview-actions">
              <button
                type="button"
                className="author-preview-regenerate-btn"
                onClick={handleRegenerate}
                disabled={isGenerating}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Regenerate
              </button>

              {showQuickAdd && onQuickAdd && (
                <button
                  type="button"
                  className="author-preview-add-btn"
                  onClick={onQuickAdd}
                  disabled={isAddingAuthor}
                >
                  {isAddingAuthor ? (
                    <>
                      <span className="author-preview-spinner" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Add to My Authors
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Description */}
            {persona.description && (
              <div className="author-preview-description">
                <span className="author-preview-section-label">About this author:</span>
                <p>{persona.description}</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

AuthorPreviewDialog.displayName = 'AuthorPreviewDialog';
