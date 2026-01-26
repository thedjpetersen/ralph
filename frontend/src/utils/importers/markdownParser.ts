/**
 * Markdown Parser
 *
 * Parses Markdown files while preserving formatting.
 */

import type { ParsedDocument } from './types';
import { extractTitle, createMetadata, readFileAsText } from './helpers';

/**
 * Parse a Markdown file
 */
export async function parseMarkdown(file: File): Promise<ParsedDocument> {
  const content = await readFileAsText(file);
  const title = extractTitle(content, file.name);
  const metadata = createMetadata(file, content);

  return {
    title,
    content,
    contentType: 'markdown',
    metadata,
  };
}
