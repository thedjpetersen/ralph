/**
 * AI Transition Suggestions Demo
 *
 * Demo page showcasing the AI-powered transition suggestions feature.
 * Identifies paragraph breaks that could benefit from transitional phrases
 * and offers context-aware suggestions with one-click insertion.
 */

import { useState, useCallback, useEffect } from 'react';
import { PageTransition } from '../components/PageTransition';
import { GhostTextTextarea } from '../components/GhostTextTextarea';
import { AITransitionSuggestionsToolbar } from '../components/AITransitionSuggestionsToolbar';
import { useAITransitionSuggestionsStore, TRANSITION_CATEGORIES } from '../stores/aiTransitionSuggestions';
import './AITransitionSuggestionsDemo.css';

const SAMPLE_CONTENT = `The old factory stood silent on the hill. Its windows had long been shattered by storms and vandals. Rust covered the iron gates that once welcomed hundreds of workers each morning.

The town below had changed dramatically over the decades. New businesses had opened along Main Street. The coffee shop where workers used to gather was now a boutique selling handmade jewelry.

Young families had begun moving back to the area. They were attracted by affordable housing and good schools. The community center offered programs for children after school.

Local entrepreneurs saw opportunity in the abandoned factory. They imagined it transformed into apartments and studios. The mayor supported their vision with tax incentives.

Construction would require significant investment. Environmental assessments had to be completed first. The timeline stretched at least three years into the future.

Residents expressed mixed feelings about the project. Some welcomed the promise of new jobs. Others worried about losing the character of their quiet neighborhood.`;

const TransitionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M13 5l5 5-5 5M2 10h14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function AITransitionSuggestionsDemo() {
  const [content, setContent] = useState(SAMPLE_CONTENT);
  const { enable, disable, isEnabled, paragraphGaps } = useAITransitionSuggestionsStore();

  // Enable the feature when the demo mounts
  useEffect(() => {
    enable();
    return () => disable();
  }, [enable, disable]);

  const handleResetContent = useCallback(() => {
    setContent(SAMPLE_CONTENT);
  }, []);

  const handleToggleFeature = useCallback(() => {
    if (isEnabled) {
      disable();
    } else {
      enable();
    }
  }, [isEnabled, enable, disable]);

  const gapsNeedingTransition = paragraphGaps.filter(g => g.needsTransition).length;

  return (
    <PageTransition>
      <div className="ai-transition-demo">
        <header className="demo-header">
          <h1>AI Transition Suggestions</h1>
          <p>Improve the flow between paragraphs with context-aware transitional phrases</p>
        </header>

        <section className="demo-instructions">
          <h2>How to Use</h2>
          <ol>
            <li>Look for <strong>circular indicators</strong> between paragraphs that may need transitions</li>
            <li><strong>Click an indicator</strong> to see suggested transitional phrases</li>
            <li>Select a phrase to <strong>preview</strong> how it will appear</li>
            <li>Click <strong>Insert</strong> to add the transition to your text</li>
          </ol>
          <p className="demo-tip">
            <strong>Tip:</strong> Use number keys <kbd>1-9</kbd> for quick selection, <kbd>Enter</kbd> to insert, and <kbd>Esc</kbd> to cancel. Press <kbd>Cmd+Z</kbd> (or <kbd>Ctrl+Z</kbd>) to undo.
          </p>
        </section>

        <section className="demo-editor">
          <div className="demo-toolbar">
            <div className="demo-toolbar-info">
              <TransitionIcon />
              <span>
                {isEnabled ? (
                  <>
                    <strong>{gapsNeedingTransition}</strong> transition{gapsNeedingTransition !== 1 ? 's' : ''} suggested
                  </>
                ) : (
                  'Feature disabled'
                )}
              </span>
            </div>
            <div className="demo-toolbar-actions">
              <button
                type="button"
                className={`demo-toggle-btn ${isEnabled ? 'active' : ''}`}
                onClick={handleToggleFeature}
              >
                {isEnabled ? 'Disable' : 'Enable'} Suggestions
              </button>
              <button
                type="button"
                className="demo-reset-btn"
                onClick={handleResetContent}
              >
                Reset Content
              </button>
            </div>
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
              rows={18}
              className="demo-content-textarea"
            />
            <p className="demo-content-hint">
              {content.split(/\n\s*\n/).filter(Boolean).length} paragraphs &middot; {content.split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
        </section>

        <section className="demo-features">
          <h2>Transition Categories</h2>
          <div className="features-grid">
            {TRANSITION_CATEGORIES.map((category) => (
              <div key={category.id} className="feature-card" style={{ '--category-color': category.color } as React.CSSProperties}>
                <div className="feature-badge" style={{ background: category.color }}>
                  {category.label}
                </div>
                <h3>{category.label}</h3>
                <p>{category.description}</p>
                <div className="feature-examples">
                  {category.id === 'additive' && (
                    <span>Furthermore, Moreover, Additionally</span>
                  )}
                  {category.id === 'contrast' && (
                    <span>However, Nevertheless, On the other hand</span>
                  )}
                  {category.id === 'causal' && (
                    <span>Therefore, Consequently, As a result</span>
                  )}
                  {category.id === 'temporal' && (
                    <span>Meanwhile, Subsequently, Eventually</span>
                  )}
                  {category.id === 'emphasis' && (
                    <span>Indeed, Most importantly, Significantly</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="demo-examples">
          <h2>Example Transformations</h2>
          <div className="examples-grid">
            <div className="example-card">
              <h3>Before</h3>
              <p className="example-description">Abrupt paragraph break</p>
              <div className="example-content example-before">
                <p>The project faced several delays. The team worked overtime to meet the deadline.</p>
                <p>The client was satisfied with the final result. They signed a contract for continued support.</p>
              </div>
            </div>
            <div className="example-card">
              <h3>After (Causal)</h3>
              <p className="example-description">With &quot;As a result&quot;</p>
              <div className="example-content example-after">
                <p>The project faced several delays. The team worked overtime to meet the deadline.</p>
                <p><strong>As a result,</strong> the client was satisfied with the final result. They signed a contract for continued support.</p>
              </div>
            </div>
            <div className="example-card">
              <h3>After (Contrast)</h3>
              <p className="example-description">With &quot;Nevertheless&quot;</p>
              <div className="example-content example-after">
                <p>The project faced several delays. The team worked overtime to meet the deadline.</p>
                <p><strong>Nevertheless,</strong> the client was satisfied with the final result. They signed a contract for continued support.</p>
              </div>
            </div>
            <div className="example-card">
              <h3>After (Temporal)</h3>
              <p className="example-description">With &quot;Eventually&quot;</p>
              <div className="example-content example-after">
                <p>The project faced several delays. The team worked overtime to meet the deadline.</p>
                <p><strong>Eventually,</strong> the client was satisfied with the final result. They signed a contract for continued support.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="demo-benefits">
          <h2>Benefits</h2>
          <ul className="benefits-list">
            <li>
              <strong>Visual indicators</strong> - Quickly identify where transitions would improve flow
            </li>
            <li>
              <strong>Context-aware</strong> - Suggestions are tailored to the surrounding content
            </li>
            <li>
              <strong>Multiple categories</strong> - Choose from additive, contrast, causal, temporal, or emphasis phrases
            </li>
            <li>
              <strong>One-click insertion</strong> - Apply transitions instantly with preview support
            </li>
            <li>
              <strong>Undo support</strong> - Easily revert changes with Cmd+Z / Ctrl+Z
            </li>
          </ul>
        </section>
      </div>

      {/* The toolbar renders indicators and popup */}
      <AITransitionSuggestionsToolbar />
    </PageTransition>
  );
}

AITransitionSuggestionsDemo.displayName = 'AITransitionSuggestionsDemo';
