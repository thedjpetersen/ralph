/**
 * AI Writing Prompts Demo
 *
 * Demo page showcasing the AI-powered writing prompts feature.
 * Displays both the empty state variant and floating panel trigger.
 */

import { useState, useCallback, useEffect } from 'react';
import { PageTransition } from '../components/PageTransition';
import { AIWritingPromptsPanel } from '../components/AIWritingPromptsPanel';
import { GhostTextTextarea } from '../components/GhostTextTextarea';
import { Button } from '../components/ui/Button';
import { useAIWritingPromptsStore } from '../stores/aiWritingPrompts';
import './AIWritingPromptsDemo.css';

// Sparkles icon for the button
const SparklesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
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

export function AIWritingPromptsDemo() {
  const [content, setContent] = useState('');
  const { openPrompts, isOpen, generatePrompts } = useAIWritingPromptsStore();

  // Auto-open prompts panel on mount for demo purposes
  useEffect(() => {
    openPrompts();
    generatePrompts();
  }, [openPrompts, generatePrompts]);

  const handleSelectPrompt = useCallback((text: string) => {
    // If content is empty, replace entirely; otherwise append
    if (!content.trim()) {
      setContent(text);
    } else {
      setContent((prev) => prev + '\n\n' + text);
    }
  }, [content]);

  const handleOpenPrompts = useCallback(() => {
    openPrompts();
    generatePrompts();
  }, [openPrompts, generatePrompts]);

  const isDocumentEmpty = !content.trim();

  return (
    <PageTransition>
      <div className="ai-writing-prompts-demo">
        <header className="demo-header">
          <h1>AI Writing Prompts</h1>
          <p>Overcome writer's block with AI-generated prompts and opening lines</p>
        </header>

        <section className="demo-instructions">
          <h2>How to Use</h2>
          <ol>
            <li>Start with an <strong>empty document</strong> to see writing prompts automatically</li>
            <li>Select a <strong>document type</strong> for contextual suggestions</li>
            <li>Choose from <strong>3-5 prompt options</strong> (writing prompts or opening lines)</li>
            <li>Click a prompt to <strong>insert it</strong> into your document</li>
            <li>Click <strong>Regenerate</strong> for new options</li>
          </ol>
        </section>

        <section className="demo-editor">
          {/* Prompt Button (visible when document has content) */}
          {!isDocumentEmpty && (
            <div className="demo-prompt-button-row">
              <Button
                variant="secondary"
                onClick={handleOpenPrompts}
                className="demo-prompt-button"
              >
                <SparklesIcon />
                Get Writing Prompts
              </Button>
            </div>
          )}

          {/* Empty State with Writing Prompts */}
          {isDocumentEmpty && (
            <AIWritingPromptsPanel
              onSelectPrompt={handleSelectPrompt}
              showAsEmptyState={true}
            />
          )}

          {/* Document Textarea (visible when has content) */}
          {!isDocumentEmpty && (
            <div className="demo-content-section">
              <label htmlFor="demo-content" className="demo-content-label">
                Your Document
              </label>
              <GhostTextTextarea
                id="demo-content"
                fieldId="demo-content"
                value={content}
                onChange={setContent}
                placeholder="Write your content here..."
                rows={14}
                className="demo-content-textarea"
              />
              <div className="demo-content-actions">
                <span className="demo-word-count">
                  {content.trim().split(/\s+/).filter(Boolean).length} words
                </span>
                <button
                  type="button"
                  className="demo-clear-button"
                  onClick={() => setContent('')}
                >
                  Clear document
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Floating Panel (when triggered via button) */}
        {!isDocumentEmpty && isOpen && (
          <AIWritingPromptsPanel
            onSelectPrompt={handleSelectPrompt}
            showAsEmptyState={false}
          />
        )}

        <section className="demo-features">
          <h2>Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L14.5 8.5L21 10L14.5 11.5L12 18L9.5 11.5L3 10L9.5 8.5L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Empty Document Prompts</h3>
              <p>Automatic prompts when you start a new document to spark creativity</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Document Types</h3>
              <p>8 document types for contextual prompts tailored to your writing</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>3-5 Options</h3>
              <p>Multiple prompts and opening lines to choose from each time</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 12a9 9 0 0 1 15.592-6.172M21 12a9 9 0 0 1-15.592 6.172"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18.592 3v4h-4M5.408 21v-4h4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Regenerate</h3>
              <p>Get fresh prompts instantly with the regenerate button</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M17.5 2.5a2.121 2.121 0 013 3L12 14l-4 1 1-4 8.5-8.5z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Click to Insert</h3>
              <p>One click inserts the prompt directly into your document</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 3H5a2 2 0 00-2 2v4M15 3h4a2 2 0 012 2v4M15 21h4a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Two Prompt Types</h3>
              <p>Writing prompts for ideas, opening lines to start immediately</p>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}

AIWritingPromptsDemo.displayName = 'AIWritingPromptsDemo';
