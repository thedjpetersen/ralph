/**
 * AI Sentence Combiner Demo
 *
 * Demo page showcasing the AI-powered sentence combining feature.
 * Allows users to select multiple short sentences and combine them into more fluid text.
 */

import { useState, useCallback } from 'react';
import { PageTransition } from '../components/PageTransition';
import { GhostTextTextarea } from '../components/GhostTextTextarea';
import { AISentenceCombinerToolbar } from '../components/AISentenceCombinerToolbar';
import './AISentenceCombinerDemo.css';

const SAMPLE_CONTENT = `The sun rose over the mountains. It painted the sky orange and pink. The birds began to sing. They welcomed the new day.

The coffee was hot. It was strong. It was exactly what I needed. I sat by the window. I watched the world wake up.

The project was challenging. It took many weeks. The team worked hard. They collaborated effectively. The results exceeded expectations.

She walked into the room. Everyone turned to look. She commanded attention. Her presence was remarkable. People respected her immediately.

The old house stood alone. It was at the end of the street. Paint peeled from the walls. Windows were broken. Nobody had lived there for years.`;

const CombineIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M17 10H3M12 5l5 5-5 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 5h4M3 15h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function AISentenceCombinerDemo() {
  const [content, setContent] = useState(SAMPLE_CONTENT);

  const handleResetContent = useCallback(() => {
    setContent(SAMPLE_CONTENT);
  }, []);

  return (
    <PageTransition>
      <div className="ai-sentence-combiner-demo">
        <header className="demo-header">
          <h1>AI Sentence Combining</h1>
          <p>Select multiple short sentences and combine them into more fluid, sophisticated prose</p>
        </header>

        <section className="demo-instructions">
          <h2>How to Use</h2>
          <ol>
            <li>Select <strong>2 or more sentences</strong> in the text area below</li>
            <li>Hold <kbd>Shift</kbd> while making your selection to trigger the toolbar</li>
            <li>Choose a combining strategy from the floating toolbar</li>
            <li>Preview the combined result and click <strong>Apply</strong> to accept</li>
          </ol>
          <p className="demo-tip">
            <strong>Tip:</strong> Use <kbd>1-4</kbd> to quickly select a combining strategy, <kbd>Enter</kbd> to apply, and <kbd>Esc</kbd> to cancel. Press <kbd>Cmd+Z</kbd> (or <kbd>Ctrl+Z</kbd>) to undo after applying.
          </p>
        </section>

        <section className="demo-editor">
          <div className="demo-toolbar">
            <div className="demo-toolbar-info">
              <CombineIcon />
              <span>Hold <kbd>Shift</kbd> + Select text to combine sentences</span>
            </div>
            <button
              type="button"
              className="demo-reset-btn"
              onClick={handleResetContent}
            >
              Reset Content
            </button>
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
              {content.split(/[.!?]+/).filter(s => s.trim()).length} sentences &middot; {content.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
        </section>

        <section className="demo-features">
          <h2>Combining Strategies</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Conjunction</h3>
              <p>Connect with &quot;and&quot;, &quot;but&quot;, or &quot;so&quot; based on context analysis</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="16" r="2" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3>Semicolon</h3>
              <p>Join closely related independent clauses with semicolons</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 8h16M4 16h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="8" cy="12" r="2" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <h3>Comma Splice</h3>
              <p>Merge with comma and transitional words like &quot;however&quot; or &quot;therefore&quot;</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Relative Clause</h3>
              <p>Use &quot;which&quot;, &quot;that&quot;, or &quot;who&quot; to create dependent clauses</p>
            </div>
          </div>
        </section>

        <section className="demo-examples">
          <h2>Example Transformations</h2>
          <div className="examples-grid">
            <div className="example-card">
              <h3>Before</h3>
              <p className="example-description">Two separate sentences</p>
              <div className="example-content example-before">
                The project was challenging. The team worked hard.
              </div>
            </div>
            <div className="example-card">
              <h3>After (Conjunction)</h3>
              <p className="example-description">Connected with &quot;and&quot;</p>
              <div className="example-content example-after">
                The project was challenging, and the team worked hard.
              </div>
            </div>
            <div className="example-card">
              <h3>After (Semicolon)</h3>
              <p className="example-description">Joined with semicolon</p>
              <div className="example-content example-after">
                The project was challenging; the team worked hard.
              </div>
            </div>
            <div className="example-card">
              <h3>After (Relative)</h3>
              <p className="example-description">Using relative clause</p>
              <div className="example-content example-after">
                The project was challenging, which required the team to work hard.
              </div>
            </div>
          </div>
        </section>

        <section className="demo-benefits">
          <h2>Benefits</h2>
          <ul className="benefits-list">
            <li>
              <strong>Improved flow</strong> - Combine choppy sentences into smooth, readable prose
            </li>
            <li>
              <strong>Variety</strong> - Multiple combining strategies for different contexts
            </li>
            <li>
              <strong>Preview before applying</strong> - See the result before committing
            </li>
            <li>
              <strong>Undo support</strong> - Easily revert changes with Cmd+Z / Ctrl+Z
            </li>
          </ul>
        </section>
      </div>

      {/* The toolbar listens for Shift+selection */}
      <AISentenceCombinerToolbar />
    </PageTransition>
  );
}

AISentenceCombinerDemo.displayName = 'AISentenceCombinerDemo';
