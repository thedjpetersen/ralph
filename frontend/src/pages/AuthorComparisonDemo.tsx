import { useState, useEffect } from 'react';
import { PageTransition } from '../components/PageTransition';
import { AuthorComparisonPanel } from '../components/AuthorComparisonPanel';
import { AuthorComparisonToolbar } from '../components/AuthorComparisonToolbar';
import { ComparisonModeToggle } from '../components/ComparisonModeToggle';
import { useAIComparisonStore } from '../stores/aiComparison';
import { usePersonasStore } from '../stores/personas';
import { useCommentHighlightStore } from '../stores/commentHighlight';
import type { Persona } from '../api/client';
import './AuthorComparisonDemo.css';

// Mock personas for demo
const mockPersonas: Persona[] = [
  {
    id: 'hemingway',
    account_id: 'demo',
    name: 'Ernest Hemingway',
    description: 'Direct, concise prose with short sentences',
    status: 'active',
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'austen',
    account_id: 'demo',
    name: 'Jane Austen',
    description: 'Elegant, witty prose with social commentary',
    status: 'active',
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'poe',
    account_id: 'demo',
    name: 'Edgar Allan Poe',
    description: 'Dark, atmospheric prose with Gothic elements',
    status: 'active',
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'technical',
    account_id: 'demo',
    name: 'Technical Writer',
    description: 'Clear, precise documentation style',
    status: 'active',
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function AuthorComparisonDemo() {
  const [text, setText] = useState(
    `The quick brown fox jumps over the lazy dog. This is sample text that you can select to compare how different authors would rewrite it.

Try selecting any portion of this text while in comparison mode to see how multiple AI authors would provide feedback on the same selection.`
  );

  const { setPersonas } = usePersonasStore();
  const { setSelectedPersonas } = useAIComparisonStore();
  const { registerTargetElement } = useCommentHighlightStore();

  // Initialize mock personas
  useEffect(() => {
    setPersonas(mockPersonas);
    // Pre-select first two personas for demo
    setSelectedPersonas([mockPersonas[0], mockPersonas[1]]);
  }, [setPersonas, setSelectedPersonas]);

  // Register textarea for highlighting
  useEffect(() => {
    const textarea = document.getElementById('demo-textarea') as HTMLTextAreaElement;
    if (textarea) {
      registerTargetElement('demo-textarea', textarea);
    }
  }, [registerTargetElement]);

  return (
    <PageTransition>
      <div className="author-comparison-demo">
        <header className="demo-header">
          <h1>Author Comparison Demo</h1>
          <p>Compare feedback from multiple AI authors side-by-side</p>
        </header>

        <section className="demo-controls">
          <div className="control-row">
            <ComparisonModeToggle />
            <span className="control-hint">Enable comparison mode, then select text below</span>
          </div>
        </section>

        <section className="demo-content">
          <div className="demo-editor">
            <label htmlFor="demo-textarea">Sample Text</label>
            <textarea
              id="demo-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter or paste text here..."
              rows={8}
            />
          </div>

          <AuthorComparisonPanel
            targetElementId="demo-textarea"
            className="demo-panel"
          />
        </section>

        <section className="demo-instructions">
          <h2>How to Use</h2>
          <ol>
            <li>Click the <strong>Compare</strong> button above to enable comparison mode</li>
            <li>Select 2-4 authors from the dropdown in the comparison panel</li>
            <li>Select some text in the textarea above</li>
            <li>A toolbar will appear - click "Get Feedback" to request feedback from all selected authors</li>
            <li>View side-by-side feedback from each author</li>
            <li>Accept any author's suggestion to apply it to your text</li>
          </ol>
        </section>

        {/* Toolbar appears on text selection when in comparison mode */}
        <AuthorComparisonToolbar />
      </div>
    </PageTransition>
  );
}
