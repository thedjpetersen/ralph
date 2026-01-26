/**
 * Code Block Demo
 *
 * Demo page showcasing the code block and syntax highlighting features.
 * Allows users to test inline code and fenced code blocks with various languages.
 */

import { useState, useCallback } from 'react';
import { PageTransition } from '../components/PageTransition';
import { GhostTextTextarea } from '../components/GhostTextTextarea';
import { MarkdownPreview } from '../components/MarkdownPreview';
import { FormattingToolbar } from '../components/FormattingToolbar';
import { LanguageSelector } from '../components/LanguageSelector';
import { Button } from '../components/ui/Button';
import { insertCodeBlock, SUPPORTED_LANGUAGES } from '../stores/codeBlock';
import './CodeBlockDemo.css';

const SAMPLE_CONTENT = `# Code Blocks Demo

This demo showcases **inline code** and **fenced code blocks** with syntax highlighting.

## Inline Code Example

Use backticks to wrap inline code like \`const x = 42\` or \`npm install\`.

## JavaScript Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

const users = ['Alice', 'Bob', 'Charlie'];
users.forEach(user => console.log(greet(user)));
\`\`\`

## TypeScript Example

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}
\`\`\`

## Python Example

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Generate first 10 Fibonacci numbers
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
\`\`\`

## CSS Example

\`\`\`css
.code-block {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  font-family: 'Fira Code', monospace;
}
\`\`\`

## Bash Example

\`\`\`bash
#!/bin/bash

# Clone a repository
git clone https://github.com/user/repo.git
cd repo

# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

You can also use inline code for things like variable names (\`useState\`), commands (\`git commit\`), or file paths (\`/src/components/App.tsx\`).`;

const CodeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M6 6L2 10L6 14M14 6L18 10L14 14M12 4L8 16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function CodeBlockDemo() {
  const [content, setContent] = useState(SAMPLE_CONTENT);
  const [showPreview, setShowPreview] = useState(true);

  const handleInsertCodeBlock = useCallback(
    (language: string = '') => {
      const textarea = document.querySelector('.demo-content-textarea textarea') as HTMLTextAreaElement;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const { text, newCursorPosition } = insertCodeBlock(content, cursorPos, language);
      setContent(text);

      // Restore focus and cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    },
    [content]
  );

  return (
    <PageTransition>
      <div className="code-block-demo">
        <header className="demo-header">
          <h1>Code Blocks & Syntax Highlighting</h1>
          <p>Support for inline code and fenced code blocks with syntax highlighting for common languages</p>
        </header>

        <section className="demo-instructions">
          <h2>How to Use</h2>
          <div className="instructions-grid">
            <div className="instruction-card">
              <h3>Inline Code</h3>
              <p>Wrap text with backticks or select text and press <kbd>Ctrl+E</kbd></p>
              <code className="instruction-example">`code here`</code>
            </div>
            <div className="instruction-card">
              <h3>Code Block</h3>
              <p>Use triple backticks with optional language or press <kbd>Ctrl+Shift+E</kbd></p>
              <code className="instruction-example">```javascript<br />code here<br />```</code>
            </div>
            <div className="instruction-card">
              <h3>Copy Code</h3>
              <p>Click the copy button on any code block to copy the code to clipboard</p>
            </div>
          </div>
        </section>

        <section className="demo-editor">
          <div className="demo-toolbar">
            <Button
              variant="primary"
              onClick={() => handleInsertCodeBlock('')}
              className="insert-code-btn"
            >
              <CodeIcon />
              Insert Code Block
            </Button>
            <div className="language-buttons">
              {['javascript', 'typescript', 'python', 'bash'].map((lang) => (
                <Button
                  key={lang}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleInsertCodeBlock(lang)}
                >
                  {lang}
                </Button>
              ))}
            </div>
            <div className="demo-toolbar-spacer" />
            <Button
              variant={showPreview ? 'primary' : 'secondary'}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>

          <div className={`demo-content-grid ${showPreview ? 'with-preview' : ''}`}>
            <div className="demo-content-section">
              <label htmlFor="demo-content" className="demo-content-label">
                Editor (Markdown)
              </label>
              <GhostTextTextarea
                id="demo-content"
                fieldId="demo-content"
                value={content}
                onChange={setContent}
                placeholder="Write your content here with code blocks..."
                rows={20}
                className="demo-content-textarea"
                enableSuggestions={false}
              />
            </div>

            {showPreview && (
              <div className="demo-preview-section">
                <label className="demo-preview-label">Preview</label>
                <div className="demo-preview-content">
                  <MarkdownPreview content={content} />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="demo-languages">
          <h2>Supported Languages</h2>
          <p className="languages-intro">
            Syntax highlighting is available for {SUPPORTED_LANGUAGES.length} programming languages:
          </p>
          <div className="languages-grid">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <div key={lang.id} className="language-item">
                <span className="language-name">{lang.name}</span>
                {lang.aliases && lang.aliases.length > 0 && (
                  <span className="language-aliases">
                    ({lang.aliases.join(', ')})
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="demo-features">
          <h2>Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 8l-4 4 4 4M17 8l4 4-4 4M14 4l-4 16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3>Syntax Highlighting</h3>
              <p>Beautiful syntax highlighting for 25+ programming languages powered by Prism.js</p>
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
              <h3>One-Click Copy</h3>
              <p>Every code block includes a copy button for quickly copying code to clipboard</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3v18M3 12h18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3>Quick Insert</h3>
              <p>Use keyboard shortcuts or the toolbar to quickly insert code blocks with language</p>
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
                  />
                </svg>
              </div>
              <h3>Light & Dark Mode</h3>
              <p>Syntax highlighting adapts to your system theme preference automatically</p>
            </div>
          </div>
        </section>
      </div>

      <FormattingToolbar />
      <LanguageSelector />
    </PageTransition>
  );
}

CodeBlockDemo.displayName = 'CodeBlockDemo';
