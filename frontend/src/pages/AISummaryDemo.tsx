/**
 * AI Summary Demo
 *
 * Demo page showcasing the AI-powered document summary generation feature.
 * Allows users to test the summary feature with custom content.
 */

import { useState, useCallback, useEffect } from 'react';
import { PageTransition } from '../components/PageTransition';
import { GhostTextTextarea } from '../components/GhostTextTextarea';
import { Button } from '../components/ui/Button';
import { useAISummaryStore } from '../stores/aiSummary';
import './AISummaryDemo.css';

const SAMPLE_CONTENT = `Managing your budget effectively is one of the most important skills for financial health. By tracking your expenses and setting clear financial goals, you can make better decisions about where your money goes.

Start by categorizing your spending into essential needs like housing, food, and transportation, versus discretionary expenses like entertainment and dining out. This helps you identify areas where you might be able to cut back.

Consider using the 50/30/20 rule as a guideline: 50% of your income for needs, 30% for wants, and 20% for savings and debt repayment. This balanced approach ensures you're meeting your basic needs while still enjoying life and building for the future.

Regular reviews of your budget are essential. Set aside time each week to check your progress and adjust as needed. Remember, a budget isn't about restriction—it's about giving yourself permission to spend on what matters most to you.

Emergency funds are crucial for financial stability. Aim to save 3-6 months of living expenses in an easily accessible account. This safety net protects you from unexpected expenses like medical bills, car repairs, or job loss.

When it comes to debt, prioritize high-interest debt like credit cards first. The avalanche method (paying highest interest first) saves more money, while the snowball method (paying smallest balances first) provides psychological wins. Choose the approach that keeps you motivated.

Finally, consider automating your finances. Set up automatic transfers to savings accounts, automatic bill payments, and automatic contributions to retirement accounts. This removes the temptation to skip saving and ensures consistency in building wealth.`;

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

export function AISummaryDemo() {
  const [content, setContent] = useState(SAMPLE_CONTENT);
  const [insertedSummary, setInsertedSummary] = useState<string | null>(null);
  const { openSummaryDialog, setInsertAtTopCallback } = useAISummaryStore();

  // Register insert callback when component mounts
  const handleInsertAtTop = useCallback((summary: string) => {
    setInsertedSummary(summary);
    setContent(prev => `## Executive Summary\n\n${summary}\n\n---\n\n${prev}`);
  }, []);

  useEffect(() => {
    setInsertAtTopCallback(handleInsertAtTop);
    return () => {
      setInsertAtTopCallback(null);
    };
  }, [handleInsertAtTop, setInsertAtTopCallback]);

  const handleGenerateSummary = useCallback(() => {
    openSummaryDialog(content, 'My Document');
  }, [content, openSummaryDialog]);

  const handleClearInserted = useCallback(() => {
    setInsertedSummary(null);
    setContent(SAMPLE_CONTENT);
  }, []);

  return (
    <PageTransition>
      <div className="ai-summary-demo">
        <header className="demo-header">
          <h1>AI Summary Generation</h1>
          <p>Generate executive summaries of your documents with configurable length options</p>
        </header>

        <section className="demo-instructions">
          <h2>How to Use</h2>
          <ol>
            <li>Write or paste your content in the document area below</li>
            <li>Click the <strong>Generate Summary</strong> button</li>
            <li>Select your preferred summary length: Brief, Standard, or Detailed</li>
            <li>Copy the summary to clipboard or insert it at the top of your document</li>
          </ol>
          <p className="demo-tip">
            <strong>Tip:</strong> You can also access this feature from anywhere by pressing <kbd>⌘K</kbd> (or <kbd>Ctrl+K</kbd>) and typing &quot;Generate Summary&quot;
          </p>
        </section>

        <section className="demo-editor">
          <div className="demo-toolbar">
            <Button
              variant="primary"
              onClick={handleGenerateSummary}
              disabled={!content.trim()}
              className="generate-summary-btn"
            >
              <SparklesIcon />
              Generate Summary
            </Button>
            {insertedSummary && (
              <Button variant="secondary" onClick={handleClearInserted}>
                Reset Content
              </Button>
            )}
          </div>

          <div className="demo-content-section">
            <label htmlFor="demo-content" className="demo-content-label">
              Document Content
            </label>
            <GhostTextTextarea
              id="demo-content"
              fieldId="demo-content"
              value={content}
              onChange={setContent}
              placeholder="Write or paste your content here..."
              rows={16}
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
              <p>Intelligent summary generation that understands context and key points</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Configurable Length</h3>
              <p>Choose Brief (50 words), Standard (150 words), or Detailed (300 words)</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3>Copy to Clipboard</h3>
              <p>One-click copy for easy sharing in emails, reports, or presentations</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 3h18M3 7h12M3 11h18M3 15h8M3 19h18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M17 13v8M14 16h6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3>Insert at Top</h3>
              <p>Add the summary directly to your document as an executive summary section</p>
            </div>
          </div>
        </section>

        <section className="demo-examples">
          <h2>Summary Length Examples</h2>
          <div className="examples-grid">
            <div className="example-card">
              <h3>Brief</h3>
              <p className="example-description">2-3 sentences (~50 words)</p>
              <div className="example-content">
                Perfect for email subject lines, social media posts, or quick reference notes.
              </div>
            </div>
            <div className="example-card">
              <h3>Standard</h3>
              <p className="example-description">Balanced overview (~150 words)</p>
              <div className="example-content">
                Ideal for meeting summaries, progress reports, or sharing key insights with stakeholders.
              </div>
            </div>
            <div className="example-card">
              <h3>Detailed</h3>
              <p className="example-description">Comprehensive summary (~300 words)</p>
              <div className="example-content">
                Best for executive summaries, documentation, or comprehensive overviews that need full context.
              </div>
            </div>
          </div>
        </section>
      </div>

    </PageTransition>
  );
}

AISummaryDemo.displayName = 'AISummaryDemo';
