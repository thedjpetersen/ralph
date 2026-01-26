/**
 * Block Drag Demo
 *
 * Demo page showcasing the block-level drag-and-drop reordering feature.
 * Allows users to drag blocks (paragraphs, headings, lists, etc.) to reorder content.
 * Now includes enhanced undo/redo with history visualization panel.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PageTransition } from '../components/PageTransition';
import { GhostTextTextarea } from '../components/GhostTextTextarea';
import { BlockEditor } from '../components/BlockEditor';
import { EditorPreferencesPanel } from '../components/EditorPreferencesPanel';
import { EditorHistoryPanel } from '../components/EditorHistoryPanel';
import { StickyDocumentHeader } from '../components/StickyDocumentHeader';
import { AnnotationsPanel } from '../components/AnnotationsPanel';
import { Button } from '../components/ui/Button';
import { useBlockDragStore, parseBlocks } from '../stores/blockDrag';
import { useBlockAnnotations } from '../stores/blockAnnotations';
import {
  useEditorHistoryStore,
  useEditorHistory,
  selectCanUndo as selectHistoryCanUndo,
  selectCanRedo as selectHistoryCanRedo,
} from '../stores/editorHistory';
import { useDocumentPreviewUpdater } from '../stores/documentPreviews';
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
- Full history timeline with Cmd/Ctrl+Shift+H

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

const RedoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M13 6H6a4 4 0 100 8h4M13 6l-3-3M13 6l-3 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M8 5v3l2 1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M6.5 1.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1.293l.646.647a.5.5 0 0 1 0 .707L9.5 4.793v.914l.646.646a.5.5 0 0 1 0 .707l-.646.647v.914l.646.646a.5.5 0 0 1 0 .707l-.646.647v.914l.646.646a.5.5 0 0 1 0 .707l-.646.647v1.293a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5v-1.293l-.646-.647a.5.5 0 0 1 0-.707l.646-.647v-.914l-.646-.646a.5.5 0 0 1 0-.707l.646-.647v-.914l-.646-.646a.5.5 0 0 1 0-.707L6.5 4.793V3.5l-.646-.647a.5.5 0 0 1 0-.707l.646-.646V1.5z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
  </svg>
);

const NotesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M11 2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11 2v4h-2M5.5 7h5M5.5 10h3"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DOCUMENT_ID = 'block-drag-demo';

export function BlockDragDemo() {
  const [content, setContent] = useState(SAMPLE_CONTENT);
  const [showRawEditor, setShowRawEditor] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const isInitialized = useRef(false);

  // Annotations panel state
  const { isPanelOpen: annotationsPanelOpen } = useBlockAnnotations();

  // Parse blocks for the annotations panel
  const blocks = useMemo(() => parseBlocks(content), [content]);

  // Block drag store for legacy undo (block reordering)
  const { pushUndo: pushBlockUndo } = useBlockDragStore();

  // Editor history store for comprehensive undo/redo
  const canUndo = useEditorHistoryStore(selectHistoryCanUndo);
  const canRedo = useEditorHistoryStore(selectHistoryCanRedo);
  const {
    initializeHistory,
    pushState,
    undo,
    redo,
    togglePanel,
    isPanelOpen,
  } = useEditorHistory();

  // Initialize history on mount
  useEffect(() => {
    if (!isInitialized.current) {
      initializeHistory('block-drag-demo', SAMPLE_CONTENT);
      isInitialized.current = true;
    }
  }, [initializeHistory]);

  // Update document preview when content changes
  useDocumentPreviewUpdater('block-drag-demo', 'Block Drag Demo', content);

  // Handle content change from editor
  const handleContentChange = useCallback((newContent: string) => {
    // Track the change in history
    const previousContent = content;
    if (newContent !== previousContent) {
      // Also push to block drag undo for backward compatibility
      pushBlockUndo(previousContent, newContent);
      // Push to new history system
      pushState(newContent, 'block-reorder', 'Reordered blocks');
    }
    setContent(newContent);
  }, [content, pushBlockUndo, pushState]);

  // Handle content change from raw editor
  const handleRawContentChange = useCallback((newContent: string) => {
    if (newContent !== content) {
      pushState(newContent, 'text', 'Text edit');
    }
    setContent(newContent);
  }, [content, pushState]);

  // Handle undo
  const handleUndo = useCallback(() => {
    const entry = undo();
    if (entry) {
      setContent(entry.content);
      toast.success('Undone');
    }
  }, [undo]);

  // Handle redo
  const handleRedo = useCallback(() => {
    const entry = redo();
    if (entry) {
      setContent(entry.content);
      toast.success('Redone');
    }
  }, [redo]);

  // Handle restore from history panel
  const handleHistoryRestore = useCallback((restoredContent: string) => {
    setContent(restoredContent);
    toast.success('Restored from history');
  }, []);

  // Keyboard shortcuts for undo/redo/history
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Skip if in raw editor textarea
      const activeElement = document.activeElement;
      const isInRawEditor = activeElement?.closest('.block-drag-demo-raw-editor');

      if (isInRawEditor) return;

      // Cmd/Ctrl+Z for undo (without Shift)
      if (isMod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (canUndo) {
          e.preventDefault();
          handleUndo();
        }
        return;
      }

      // Cmd/Ctrl+Shift+Z for redo
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'z') {
        if (canRedo) {
          e.preventDefault();
          handleRedo();
        }
        return;
      }

      // Cmd/Ctrl+Y for redo (Windows style)
      if (isMod && e.key.toLowerCase() === 'y') {
        if (canRedo) {
          e.preventDefault();
          handleRedo();
        }
        return;
      }

      // Cmd/Ctrl+Shift+H to toggle history panel
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        togglePanel();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, handleUndo, handleRedo, togglePanel]);

  // Toolbar content for the sticky header
  const toolbarContent = (
    <>
      <Button
        variant={showRawEditor ? 'secondary' : 'primary'}
        onClick={() => setShowRawEditor(!showRawEditor)}
      >
        {showRawEditor ? 'Show Block View' : 'Show Raw Markdown'}
      </Button>
      <Button
        variant="secondary"
        onClick={handleUndo}
        disabled={!canUndo}
        className="undo-btn"
        title="Undo (Cmd+Z)"
      >
        <UndoIcon />
        Undo
      </Button>
      <Button
        variant="secondary"
        onClick={handleRedo}
        disabled={!canRedo}
        className="redo-btn"
        title="Redo (Cmd+Shift+Z)"
      >
        <RedoIcon />
        Redo
      </Button>
      <Button
        variant={isPanelOpen ? 'primary' : 'secondary'}
        onClick={togglePanel}
        className="history-btn"
        title="History (Cmd+Shift+H)"
      >
        <HistoryIcon />
        History
      </Button>
      <Button
        variant={annotationsPanelOpen || showAnnotations ? 'primary' : 'secondary'}
        onClick={() => setShowAnnotations(!showAnnotations)}
        className="notes-btn"
        title="Toggle Notes Panel"
      >
        <NotesIcon />
        Notes
      </Button>
      <Button
        variant="ghost"
        onClick={() => setShowPreferences(true)}
        className="preferences-btn"
        title="Editor Preferences"
      >
        <SettingsIcon />
        Preferences
      </Button>
    </>
  );

  return (
    <PageTransition>
      <div className="block-drag-demo">
        <StickyDocumentHeader
          title="Block-Level Drag & Drop"
          subtitle="Reorder content blocks by dragging them to new positions"
          toolbar={toolbarContent}
          className="block-drag-demo-header"
        />

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
              <h3>Undo & Redo</h3>
              <p>Press <kbd>Cmd+Z</kbd> to undo, <kbd>Cmd+Shift+Z</kbd> to redo, or <kbd>Cmd+Shift+H</kbd> for full history</p>
            </div>
          </div>
        </section>

        <section className="demo-editor-section">
          <div className={`demo-editor-layout ${showAnnotations ? 'with-sidebar' : ''}`}>
            <div className="demo-editor-main">
              {showRawEditor ? (
                <div className="block-drag-demo-raw-editor">
                  <label className="demo-editor-label">Raw Markdown</label>
                  <GhostTextTextarea
                    fieldId="block-drag-raw"
                    value={content}
                    onChange={handleRawContentChange}
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
                    <span className="demo-editor-hint">(Hover blocks to reveal drag handles and note icons)</span>
                  </label>
                  <div className="block-editor-container">
                    <BlockEditor
                      content={content}
                      onChange={handleContentChange}
                      enableDrag={true}
                      documentId={DOCUMENT_ID}
                      enableAnnotations={true}
                    />
                  </div>
                </div>
              )}
            </div>
            {showAnnotations && (
              <aside className="demo-editor-sidebar">
                <AnnotationsPanel
                  documentId={DOCUMENT_ID}
                  documentTitle="Block Drag Demo"
                  blocks={blocks}
                  isCollapsed={false}
                  onToggleCollapse={() => setShowAnnotations(false)}
                />
              </aside>
            )}
          </div>
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
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M12 6v6l4 2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>History Timeline</h3>
              <p>Full edit history with ability to jump to any point and preview changes</p>
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

      <EditorPreferencesPanel
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />

      <EditorHistoryPanel onRestore={handleHistoryRestore} />
    </PageTransition>
  );
}

BlockDragDemo.displayName = 'BlockDragDemo';
