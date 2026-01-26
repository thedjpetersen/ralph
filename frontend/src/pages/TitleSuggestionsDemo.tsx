/**
 * Title Suggestions Demo
 *
 * Demo page showcasing the AI-powered title suggestions feature.
 */

import { useState } from 'react';
import { PageTransition } from '../components/PageTransition';
import { TitleSuggestionsInput } from '../components/TitleSuggestionsInput';
import { GhostTextTextarea } from '../components/GhostTextTextarea';
import './TitleSuggestionsDemo.css';

const SAMPLE_CONTENT = `Managing your budget effectively is one of the most important skills for financial health. By tracking your expenses and setting clear financial goals, you can make better decisions about where your money goes.

Start by categorizing your spending into essential needs like housing, food, and transportation, versus discretionary expenses like entertainment and dining out. This helps you identify areas where you might be able to cut back.

Consider using the 50/30/20 rule as a guideline: 50% of your income for needs, 30% for wants, and 20% for savings and debt repayment. This balanced approach ensures you're meeting your basic needs while still enjoying life and building for the future.

Regular reviews of your budget are essential. Set aside time each week to check your progress and adjust as needed. Remember, a budget isn't about restriction—it's about giving yourself permission to spend on what matters most to you.`;

export function TitleSuggestionsDemo() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(SAMPLE_CONTENT);

  return (
    <PageTransition>
      <div className="title-suggestions-demo">
        <header className="demo-header">
          <h1>AI Title Suggestions</h1>
          <p>Generate title suggestions based on your document content with one click</p>
        </header>

        <section className="demo-instructions">
          <h2>How to Use</h2>
          <ol>
            <li>Write or paste your content in the document area below</li>
            <li>Click the <strong>sparkle icon</strong> next to the title input</li>
            <li>Choose from 3 AI-generated title options</li>
            <li>Click <strong>Regenerate</strong> for new suggestions</li>
          </ol>
        </section>

        <section className="demo-editor">
          <div className="demo-title-section">
            <TitleSuggestionsInput
              value={title}
              onChange={setTitle}
              documentContent={content}
              label="Document Title"
              placeholder="Enter a title or click the sparkle icon for suggestions..."
              hint="Click the sparkle icon to generate AI title suggestions"
            />
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
              placeholder="Write your content here..."
              rows={12}
              className="demo-content-textarea"
            />
            <p className="demo-content-hint">
              The first 500 words are used to generate title suggestions
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
              <h3>Sparkle Icon</h3>
              <p>One-click access to AI title generation right next to your title input</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>3 Options</h3>
              <p>Get three contextually relevant title suggestions to choose from</p>
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
              <p>Not satisfied? Click regenerate for fresh suggestions instantly</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
                  <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>Context Aware</h3>
              <p>Uses the first 500 words of your content for relevant suggestions</p>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}

TitleSuggestionsDemo.displayName = 'TitleSuggestionsDemo';
