/**
 * AI Outline Demo
 *
 * Demo page showcasing the AI-powered document outline generation feature.
 * Allows users to test the outline feature with custom content.
 */

import { useState, useCallback, useEffect } from 'react';
import { PageTransition } from '../components/PageTransition';
import { GhostTextTextarea } from '../components/GhostTextTextarea';
import { Button } from '../components/ui/Button';
import { useAIOutlineStore, outlineToMarkdown, type OutlineSection } from '../stores/aiOutline';
import './AIOutlineDemo.css';

const SAMPLE_CONTENT = `I need to write a comprehensive guide about personal finance management for beginners.

Topics to cover:
- Understanding income and expenses
- Creating a budget that works
- Emergency funds and why they matter
- Debt management strategies
- Saving for retirement
- Investment basics
- Tax planning tips

The guide should be practical and actionable, with real-world examples. I want to help readers develop good financial habits and avoid common money mistakes.

Key audience: Young professionals (25-35) just starting their financial journey.`;

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

export function AIOutlineDemo() {
  const [content, setContent] = useState(SAMPLE_CONTENT);
  const [insertedOutline, setInsertedOutline] = useState<string | null>(null);
  const { openOutlineDialog, setInsertOutlineCallback, setNavigateToSectionCallback } =
    useAIOutlineStore();

  // Register insert callback when component mounts
  const handleInsertOutline = useCallback((outline: OutlineSection[]) => {
    const markdown = outlineToMarkdown(outline);
    setInsertedOutline(markdown);
    setContent((prev) => `${markdown}\n---\n\n${prev}`);
  }, []);

  // Register navigate callback
  const handleNavigateToSection = useCallback((section: OutlineSection) => {
    // In a real editor, this would scroll to the section
    // For demo, we'll just log and show a toast
    console.log('Navigate to section:', section.title);
  }, []);

  useEffect(() => {
    setInsertOutlineCallback(handleInsertOutline);
    setNavigateToSectionCallback(handleNavigateToSection);
    return () => {
      setInsertOutlineCallback(null);
      setNavigateToSectionCallback(null);
    };
  }, [handleInsertOutline, handleNavigateToSection, setInsertOutlineCallback, setNavigateToSectionCallback]);

  const handleGenerateOutline = useCallback(() => {
    openOutlineDialog(content, 'My Document');
  }, [content, openOutlineDialog]);

  const handleClearInserted = useCallback(() => {
    setInsertedOutline(null);
    setContent(SAMPLE_CONTENT);
  }, []);

  return (
    <PageTransition>
      <div className="ai-outline-demo">
        <header className="demo-header">
          <h1>AI Outline Generation</h1>
          <p>Generate structured outlines from rough notes or topic descriptions</p>
        </header>

        <section className="demo-instructions">
          <h2>How to Use</h2>
          <ol>
            <li>Write rough notes or a topic description in the area below</li>
            <li>Click the <strong>Generate Outline</strong> button</li>
            <li>Select your preferred outline depth: Shallow, Standard, or Deep</li>
            <li>Expand/collapse sections to explore the structure</li>
            <li>Click on any section title to navigate to it</li>
            <li>Copy the outline as markdown or insert it into your document</li>
          </ol>
          <p className="demo-tip">
            <strong>Tip:</strong> You can also access this feature from anywhere by pressing <kbd>⌘K</kbd> (or <kbd>Ctrl+K</kbd>) and typing &quot;Generate Outline&quot;
          </p>
        </section>

        <section className="demo-editor">
          <div className="demo-toolbar">
            <Button
              variant="primary"
              onClick={handleGenerateOutline}
              disabled={!content.trim()}
              className="generate-outline-btn"
            >
              <SparklesIcon />
              Generate Outline
            </Button>
            {insertedOutline && (
              <Button variant="secondary" onClick={handleClearInserted}>
                Reset Content
              </Button>
            )}
          </div>

          <div className="demo-content-section">
            <label htmlFor="demo-content" className="demo-content-label">
              Rough Notes / Topic Description
            </label>
            <GhostTextTextarea
              id="demo-content"
              fieldId="demo-content"
              value={content}
              onChange={setContent}
              placeholder="Write your rough notes or describe the topic you want to outline..."
              rows={14}
              className="demo-content-textarea"
            />
            <p className="demo-content-hint">
              {content.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
        </section>

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
              <h3>AI-Powered</h3>
              <p>Intelligent outline generation that understands your content structure</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 3h18v18H3zM3 9h18M9 21V9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Hierarchical Structure</h3>
              <p>H1, H2, H3, H4 headings organized in a clear tree view</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Expandable Sections</h3>
              <p>Click to expand or collapse sections for easy navigation</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M21 21l-4.35-4.35"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3>Click to Navigate</h3>
              <p>Click any section title to jump directly to that part</p>
            </div>
          </div>
        </section>

        <section className="demo-examples">
          <h2>Outline Depth Options</h2>
          <div className="examples-grid">
            <div className="example-card">
              <h3>Shallow</h3>
              <p className="example-description">Main sections only (H1, H2)</p>
              <div className="example-content">
                Best for quick overviews, presentations, or when you need a high-level structure.
              </div>
            </div>
            <div className="example-card">
              <h3>Standard</h3>
              <p className="example-description">Balanced depth (H1, H2, H3)</p>
              <div className="example-content">
                Ideal for most documents, balancing detail with readability. Great for articles and reports.
              </div>
            </div>
            <div className="example-card">
              <h3>Deep</h3>
              <p className="example-description">Detailed subsections (H1-H4)</p>
              <div className="example-content">
                Perfect for comprehensive documentation, technical guides, or detailed research papers.
              </div>
            </div>
          </div>
        </section>

        <section className="demo-use-cases">
          <h2>Use Cases</h2>
          <div className="use-cases-grid">
            <div className="use-case-item">
              <span className="use-case-icon">📝</span>
              <span>Blog posts and articles</span>
            </div>
            <div className="use-case-item">
              <span className="use-case-icon">📊</span>
              <span>Business reports</span>
            </div>
            <div className="use-case-item">
              <span className="use-case-icon">📚</span>
              <span>Documentation</span>
            </div>
            <div className="use-case-item">
              <span className="use-case-icon">🎓</span>
              <span>Research papers</span>
            </div>
            <div className="use-case-item">
              <span className="use-case-icon">📋</span>
              <span>Project proposals</span>
            </div>
            <div className="use-case-item">
              <span className="use-case-icon">📖</span>
              <span>Book chapters</span>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}

AIOutlineDemo.displayName = 'AIOutlineDemo';
