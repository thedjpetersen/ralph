/**
 * HTML Exporter
 */

import {
  type DocumentExportData,
  type ExportOptions,
  type ExportResult,
  getFormatConfig,
} from './types';
import { generateFilename, downloadFile, escapeHtml, formatDate } from './helpers';

/**
 * Generate HTML content from document data
 */
export function generateHtml(
  data: DocumentExportData,
  options: ExportOptions
): string {
  const escapedTitle = escapeHtml(data.metadata.title);
  const escapedContent = escapeHtml(data.content);

  // Convert newlines to paragraphs
  const contentParagraphs = escapedContent
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p)
    .map(p => `    <p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n');

  let metadataHtml = '';
  if (options.includeMetadata) {
    const metaItems: string[] = [];
    if (data.metadata.author) {
      metaItems.push(`      <dt>Author</dt><dd>${escapeHtml(data.metadata.author)}</dd>`);
    }
    if (data.metadata.createdAt) {
      metaItems.push(`      <dt>Created</dt><dd>${formatDate(data.metadata.createdAt)}</dd>`);
    }
    if (data.metadata.updatedAt) {
      metaItems.push(`      <dt>Updated</dt><dd>${formatDate(data.metadata.updatedAt)}</dd>`);
    }
    if (data.metadata.wordCount !== undefined) {
      metaItems.push(`      <dt>Word Count</dt><dd>${data.metadata.wordCount.toLocaleString()}</dd>`);
    }
    if (data.metadata.characterCount !== undefined) {
      metaItems.push(`      <dt>Character Count</dt><dd>${data.metadata.characterCount.toLocaleString()}</dd>`);
    }

    if (metaItems.length > 0) {
      metadataHtml = `
    <aside class="metadata">
      <dl>
${metaItems.join('\n')}
      </dl>
    </aside>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  <style>
    :root {
      --color-text: #1a1a1a;
      --color-text-secondary: #666;
      --color-border: #e5e5e5;
      --color-bg: #fff;
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      --font-serif: Georgia, 'Times New Roman', Times, serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-serif);
      font-size: 18px;
      line-height: 1.7;
      color: var(--color-text);
      background: var(--color-bg);
      max-width: 680px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    h1 {
      font-family: var(--font-sans);
      font-size: 2.5rem;
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 1rem;
    }

    .metadata {
      font-family: var(--font-sans);
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }

    .metadata dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.25rem 1rem;
      margin: 0;
    }

    .metadata dt {
      font-weight: 600;
    }

    .metadata dd {
      margin: 0;
    }

    article p {
      margin: 0 0 1.5em;
    }

    article p:last-child {
      margin-bottom: 0;
    }

    @media print {
      body {
        padding: 0;
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <main>
    <h1>${escapedTitle}</h1>${metadataHtml}
    <article>
${contentParagraphs}
    </article>
  </main>
</body>
</html>`;
}

/**
 * Export document to HTML format
 */
export async function exportToHtml(
  data: DocumentExportData,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    const content = generateHtml(data, options);

    const filename = options.filename || generateFilename(
      data.metadata.title,
      'html',
      options.includeTimestamp
    );

    const config = getFormatConfig('html');
    downloadFile(content, filename, config.mimeType);

    return {
      success: true,
      filename,
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      error: error instanceof Error ? error.message : 'Failed to export HTML',
    };
  }
}

/**
 * Get HTML content as string for preview
 */
export function getHtmlContent(
  data: DocumentExportData,
  options: ExportOptions
): string {
  return generateHtml(data, options);
}
