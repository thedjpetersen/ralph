import { useMemo, useCallback, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-xml-doc';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-diff';
import { parseCodeBlocks, normalizeLanguage, SUPPORTED_LANGUAGES } from '../stores/codeBlock';
import { toast } from '../stores/toast';
import './MarkdownPreview.css';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

interface CodeBlockProps {
  code: string;
  language: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const highlightedCode = useMemo(() => {
    const normalizedLang = normalizeLanguage(language);

    // Map language to Prism grammar
    const grammarMap: Record<string, string> = {
      javascript: 'javascript',
      typescript: 'typescript',
      jsx: 'jsx',
      tsx: 'tsx',
      html: 'markup',
      css: 'css',
      scss: 'scss',
      json: 'json',
      markdown: 'markdown',
      python: 'python',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      csharp: 'csharp',
      go: 'go',
      rust: 'rust',
      ruby: 'ruby',
      php: 'php',
      swift: 'swift',
      kotlin: 'kotlin',
      sql: 'sql',
      bash: 'bash',
      yaml: 'yaml',
      xml: 'xml',
      graphql: 'graphql',
      diff: 'diff',
      plaintext: 'plaintext',
    };

    const prismLang = grammarMap[normalizedLang] || 'plaintext';
    const grammar = Prism.languages[prismLang];

    if (!grammar) {
      // Return escaped HTML if no grammar
      return escapeHtml(code);
    }

    try {
      return Prism.highlight(code, grammar, prismLang);
    } catch {
      return escapeHtml(code);
    }
  }, [code, language]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [code]);

  const languageLabel = useMemo(() => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.id === normalizeLanguage(language));
    return lang?.name || language || 'Plain Text';
  }, [language]);

  return (
    <div className="markdown-preview-code-block">
      <div className="markdown-preview-code-header">
        <span className="markdown-preview-code-language">{languageLabel}</span>
        <button
          type="button"
          className="markdown-preview-copy-btn"
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="markdown-preview-copy-icon">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="markdown-preview-copy-icon">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
          )}
          <span className="markdown-preview-copy-text">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className={`markdown-preview-pre language-${normalizeLanguage(language)}`}>
        <code
          className={`markdown-preview-code language-${normalizeLanguage(language)}`}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  );
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

interface ParsedContent {
  type: 'text' | 'code' | 'inline-code';
  content: string;
  language?: string;
}

function parseMarkdownContent(text: string): ParsedContent[] {
  const result: ParsedContent[] = [];
  const codeBlocks = parseCodeBlocks(text);

  if (codeBlocks.length === 0) {
    // No code blocks, just parse inline code
    return parseInlineCode(text);
  }

  let lastIndex = 0;

  for (const block of codeBlocks) {
    // Add text before this code block
    if (block.startIndex > lastIndex) {
      const textBefore = text.slice(lastIndex, block.startIndex);
      result.push(...parseInlineCode(textBefore));
    }

    // Add the code block
    result.push({
      type: 'code',
      content: block.content,
      language: block.language,
    });

    lastIndex = block.endIndex + 1;
  }

  // Add remaining text after last code block
  if (lastIndex < text.length) {
    const textAfter = text.slice(lastIndex);
    result.push(...parseInlineCode(textAfter));
  }

  return result;
}

function parseInlineCode(text: string): ParsedContent[] {
  const result: ParsedContent[] = [];
  const inlineCodeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    // Add text before this inline code
    if (match.index > lastIndex) {
      result.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add the inline code
    result.push({
      type: 'inline-code',
      content: match[1],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return result;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  const parsedContent = useMemo(() => parseMarkdownContent(content), [content]);

  return (
    <div className={`markdown-preview ${className}`}>
      {parsedContent.map((item, index) => {
        if (item.type === 'code') {
          return <CodeBlock key={index} code={item.content} language={item.language || 'plaintext'} />;
        }

        if (item.type === 'inline-code') {
          return (
            <code key={index} className="markdown-preview-inline-code">
              {item.content}
            </code>
          );
        }

        // Render text with line breaks preserved
        return (
          <span key={index} className="markdown-preview-text">
            {item.content.split('\n').map((line, lineIndex, arr) => (
              <span key={lineIndex}>
                {line}
                {lineIndex < arr.length - 1 && <br />}
              </span>
            ))}
          </span>
        );
      })}
    </div>
  );
}

MarkdownPreview.displayName = 'MarkdownPreview';
