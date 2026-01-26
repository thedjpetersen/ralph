/**
 * Editor Preferences Demo
 *
 * Demo page showcasing the editor preferences panel with live preview.
 * Allows users to customize font family, font size, line height, and editor width.
 */

import { useState } from 'react';
import { PageTransition } from '../components/PageTransition';
import { EditorPreferencesPanel } from '../components/EditorPreferencesPanel';
import { Button } from '../components/ui/Button';
import { useEditorStyles } from '../hooks/useEditorStyles';
import './EditorPreferencesDemo.css';

const SAMPLE_TEXT = `# The Art of Writing

Great writing is not about following rules—it's about breaking them purposefully. Every sentence should earn its place on the page.

## Finding Your Voice

Your unique perspective is your greatest asset. Don't try to sound like anyone else. Write the way you think, then refine it until it sparkles.

### Key Principles

- **Clarity over cleverness**: If readers have to work to understand you, you've already lost them
- **Show, don't tell**: Paint pictures with words instead of explaining
- **Read aloud**: Your ear catches what your eye misses
- **Edit ruthlessly**: Kill your darlings without mercy

## The Writing Process

First drafts are meant to be messy. Give yourself permission to write badly—you can always fix it later. The important thing is to get words on the page.

> "The first draft is just you telling yourself the story." — Terry Pratchett

### Daily Practice

Write every day, even if it's just for fifteen minutes. Consistency builds skill faster than occasional marathon sessions.

## Conclusion

Writing is a craft that improves with practice. Trust the process, embrace revision, and never stop learning.`;

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.166 12.5a1.375 1.375 0 00.275 1.517l.05.05a1.666 1.666 0 11-2.358 2.358l-.05-.05a1.375 1.375 0 00-1.516-.275 1.375 1.375 0 00-.834 1.258v.142a1.667 1.667 0 11-3.333 0v-.075a1.375 1.375 0 00-.9-1.258 1.375 1.375 0 00-1.517.275l-.05.05a1.667 1.667 0 11-2.358-2.358l.05-.05a1.375 1.375 0 00.275-1.517 1.375 1.375 0 00-1.258-.833H2.5a1.667 1.667 0 110-3.334h.075a1.375 1.375 0 001.258-.9 1.375 1.375 0 00-.275-1.516l-.05-.05a1.667 1.667 0 112.359-2.358l.05.05a1.375 1.375 0 001.516.275h.067a1.375 1.375 0 00.833-1.258V2.5a1.667 1.667 0 013.334 0v.075a1.375 1.375 0 00.833 1.258 1.375 1.375 0 001.517-.275l.05-.05a1.667 1.667 0 112.358 2.358l-.05.05a1.375 1.375 0 00-.275 1.517v.067a1.375 1.375 0 001.258.833h.142a1.667 1.667 0 010 3.334h-.075a1.375 1.375 0 00-1.258.833z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function EditorPreferencesDemo() {
  const [showPreferences, setShowPreferences] = useState(false);
  const { style: editorStyle, settings } = useEditorStyles();

  const getWidthLabel = (width: string) => {
    switch (width) {
      case 'narrow':
        return 'Narrow (600px)';
      case 'medium':
        return 'Medium (720px)';
      case 'wide':
        return 'Wide (900px)';
      case 'full':
        return 'Full Width';
      default:
        return width;
    }
  };

  const getFontLabel = (font: string) => {
    switch (font) {
      case 'system':
        return 'System Default';
      case 'serif':
        return 'Serif';
      case 'sans-serif':
        return 'Sans Serif';
      case 'monospace':
        return 'Monospace';
      case 'georgia':
        return 'Georgia';
      default:
        return font;
    }
  };

  return (
    <PageTransition>
      <div className="editor-prefs-demo">
        <header className="demo-header">
          <h1>Editor Preferences</h1>
          <p>Customize your writing environment with typography and layout settings</p>
        </header>

        <section className="demo-controls">
          <Button
            variant="primary"
            onClick={() => setShowPreferences(true)}
            className="open-prefs-btn"
          >
            <SettingsIcon />
            Open Preferences Panel
          </Button>

          <div className="current-settings">
            <h3>Current Settings</h3>
            <div className="settings-display">
              <div className="setting-chip">
                <span className="chip-label">Font</span>
                <span className="chip-value">{getFontLabel(settings.fontFamily)}</span>
              </div>
              <div className="setting-chip">
                <span className="chip-label">Size</span>
                <span className="chip-value">{settings.fontSize}px</span>
              </div>
              <div className="setting-chip">
                <span className="chip-label">Line Height</span>
                <span className="chip-value">{settings.lineHeight.toFixed(1)}</span>
              </div>
              <div className="setting-chip">
                <span className="chip-label">Width</span>
                <span className="chip-value">{getWidthLabel(settings.editorWidth)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="demo-preview">
          <h2>Live Preview</h2>
          <div className="preview-container">
            <div className="preview-content" style={editorStyle}>
              {SAMPLE_TEXT.split('\n\n').map((paragraph, index) => {
                if (paragraph.startsWith('# ')) {
                  return (
                    <h1 key={index} className="preview-h1">
                      {paragraph.replace('# ', '')}
                    </h1>
                  );
                }
                if (paragraph.startsWith('## ')) {
                  return (
                    <h2 key={index} className="preview-h2">
                      {paragraph.replace('## ', '')}
                    </h2>
                  );
                }
                if (paragraph.startsWith('### ')) {
                  return (
                    <h3 key={index} className="preview-h3">
                      {paragraph.replace('### ', '')}
                    </h3>
                  );
                }
                if (paragraph.startsWith('> ')) {
                  return (
                    <blockquote key={index} className="preview-blockquote">
                      {paragraph.replace('> ', '')}
                    </blockquote>
                  );
                }
                if (paragraph.startsWith('- ')) {
                  const items = paragraph.split('\n').map((item) => item.replace('- ', ''));
                  return (
                    <ul key={index} className="preview-list">
                      {items.map((item, i) => (
                        <li
                          key={i}
                          dangerouslySetInnerHTML={{
                            __html: item.replace(
                              /\*\*(.+?)\*\*/g,
                              '<strong>$1</strong>'
                            ),
                          }}
                        />
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={index} className="preview-paragraph">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </div>
        </section>

        <section className="demo-features">
          <h2>Available Settings</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Font Family</h3>
              <p>Choose from 5 font options: System, Serif, Sans-serif, Monospace, or Georgia</p>
            </div>
            <div className="feature-card">
              <h3>Font Size</h3>
              <p>Adjust text size from 14px to 24px for comfortable reading</p>
            </div>
            <div className="feature-card">
              <h3>Line Height</h3>
              <p>Set line spacing from 1.4 to 2.0 for optimal readability</p>
            </div>
            <div className="feature-card">
              <h3>Editor Width</h3>
              <p>Choose between Narrow, Medium, Wide, or Full Width layouts</p>
            </div>
          </div>
        </section>
      </div>

      <EditorPreferencesPanel
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
      />
    </PageTransition>
  );
}

EditorPreferencesDemo.displayName = 'EditorPreferencesDemo';
