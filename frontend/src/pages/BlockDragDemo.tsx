/**
 * Block Drag Demo
 *
 * Demo page showcasing the block-level drag-and-drop reordering feature.
 * Allows users to drag blocks (paragraphs, headings, lists, etc.) to reorder content.
 */

import { useState, useCallback, useEffect } from 'react';
import { PageTransition } from '../components/PageTransition';
import { GhostTextTextarea } from '../components/GhostTextTextarea';
import { BlockEditor } from '../components/BlockEditor';
import { Button } from '../components/ui/Button';
import { useBlockDragStore, selectCanUndo } from '../stores/blockDrag';
import { toast } from '../stores/toast';
import './BlockDragDemo.css';

const SAMPLE_CONTENT = `# Block Drag Demo

This demo showcases **block-level drag-and-drop** functionality for reordering content. Check out [the documentation](https://example.com/docs) for more details.

## How It Works

Hover over any block to reveal the drag handle on the left side. Then drag the block to a new position. See our [getting started guide](https://example.com/getting-started) for more information.

### Key Features

- Drag handle appears on hover
- Visual drop indicator shows target position
- Works with all block types
- Undo support with Cmd/Ctrl+Z

## Example Paragraph

This is a regular paragraph block. You can drag it anywhere in the document. Multiple sentences in the same paragraph stay together as a single block.

### Lists Support

- First list item
- Second list item
- Third list item
- Fourth list item

You can drag entire lists as a single block.

## Code Blocks

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

greet('World');
\`\`\`

Code blocks can also be dragged and reordered.

### Ordered Lists

1. First ordered item
2. Second ordered item
3. Third ordered item

## Blockquotes

> This is a blockquote.
> It can span multiple lines.
> Blockquotes are treated as single blocks.

### Another Section

This demonstrates that you can move sections around freely. The heading and its content move independently.

## Final Notes

Try dragging different blocks around to see how the reordering works. Press Escape to cancel a drag operation, or Cmd/Ctrl+Z to undo the last reorder.`;

const DragIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M7 4V16M13 4V16M4 7H16M4 13H16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UndoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3 6h7a4 4 0 110 8H6M3 6l3-3M3 6l3 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function BlockDragDemo() {
  const [content, setContent] = useState(SAMPLE_CONTENT);
  const [showRawEditor, setShowRawEditor] = useState(false);
  const canUndo = useBlockDragStore(selectCanUndo);
  const { undo } = useBlockDragStore();

  // Handle undo
  const handleUndo = useCallback(() => {
    const entry = undo();
    if (entry) {
      setContent(entry.previousContent);
      toast.success('Block reorder undone');
    }
  }, [undo]);

  // Keyboard shortcut for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        // Only handle if not in a text input/textarea that's focused
        const activeElement = document.activeElement;
        const isInEditor = activeElement?.closest('.block-drag-demo-raw-editor');

        if (!isInEditor && canUndo) {
          e.preventDefault();
          handleUndo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, handleUndo]);

  return (
    <PageTransition>
      <div className="block-drag-demo">
        <header className="demo-header">
          <h1>Block-Level Drag & Drop</h1>
          <p>Reorder content blocks by dragging them to new positions</p>
        </header>

        <section className="demo-instructions">
          <h2>How to Use</h2>
          <div className="instructions-grid">
            <div className="instruction-card">
              <h3>Reveal Handle</h3>
              <p>Hover over any block (paragraph, heading, list, code block) to reveal the drag handle</p>
              <div className="instruction-visual">
                <span className="instruction-handle">
                  <DragIcon />
                </span>
                <span className="instruction-text">Appears on left</span>
              </div>
            </div>
            <div className="instruction-card">
              <h3>Drag & Drop</h3>
              <p>Click and drag the handle to move the block. A blue line shows where it will be placed.</p>
            </div>
            <div className="instruction-card">
              <h3>Cancel or Undo</h3>
              <p>Press <kbd>Esc</kbd> while dragging to cancel, or <kbd>Cmd/Ctrl+Z</kbd> to undo</p>
            </div>
          </div>
        </section>

        <section className="demo-editor-section">
          <div className="demo-toolbar">
            <Button
              variant={showRawEditor ? 'secondary' : 'primary'}
              onClick={() => setShowRawEditor(!showRawEditor)}
            >
              {showRawEditor ? 'Show Block View' : 'Show Raw Markdown'}
            </Button>
            <div className="demo-toolbar-spacer" />
            {canUndo && (
              <Button
                variant="secondary"
                onClick={handleUndo}
                className="undo-btn"
              >
                <UndoIcon />
                Undo Reorder
              </Button>
            )}
          </div>

          {showRawEditor ? (
            <div className="block-drag-demo-raw-editor">
              <label className="demo-editor-label">Raw Markdown</label>
              <GhostTextTextarea
                fieldId="block-drag-raw"
                value={content}
                onChange={setContent}
                placeholder="Enter markdown content..."
                rows={25}
                className="raw-markdown-textarea"
                enableSuggestions={false}
              />
            </div>
          ) : (
            <div className="block-drag-demo-block-editor">
              <label className="demo-editor-label">
                Block Editor
                <span className="demo-editor-hint">(Hover blocks to reveal drag handles)</span>
              </label>
              <div className="block-editor-container">
                <BlockEditor
                  content={content}
                  onChange={setContent}
                  enableDrag={true}
                />
              </div>
            </div>
          )}
        </section>

        <section className="demo-block-types">
          <h2>Supported Block Types</h2>
          <div className="block-types-grid">
            <div className="block-type-card">
              <div className="block-type-icon"># </div>
              <h3>Headings</h3>
              <p>H1-H6 headings are individual blocks</p>
            </div>
            <div className="block-type-card">
              <div className="block-type-icon">P</div>
              <h3>Paragraphs</h3>
              <p>Continuous text forms a paragraph block</p>
            </div>
            <div className="block-type-card">
              <div className="block-type-icon">-</div>
              <h3>Lists</h3>
              <p>Unordered and ordered lists</p>
            </div>
            <div className="block-type-card">
              <div className="block-type-icon">{`{ }`}</div>
              <h3>Code Blocks</h3>
              <p>Fenced code blocks with syntax highlighting</p>
            </div>
            <div className="block-type-card">
              <div className="block-type-icon">&gt;</div>
              <h3>Blockquotes</h3>
              <p>Quoted text blocks</p>
            </div>
            <div className="block-type-card">
              <div className="block-type-icon">IMG</div>
              <h3>Images</h3>
              <p>Standalone images in markdown format</p>
            </div>
          </div>
        </section>

        <section className="demo-features">
          <h2>Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 2v6h6M8 13h8M8 17h8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Block Detection</h3>
              <p>Automatically parses markdown into discrete content blocks</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Visual Feedback</h3>
              <p>Clear drag handles and drop indicators guide the reordering process</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 6h7a4 4 0 110 8H6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 6l3-3M3 6l3 3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Undo Support</h3>
              <p>Easily undo reordering operations with Cmd/Ctrl+Z</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M15 9l-6 6M9 9l6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3>Cancel Anytime</h3>
              <p>Press Escape to cancel a drag operation in progress</p>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}

BlockDragDemo.displayName = 'BlockDragDemo';
