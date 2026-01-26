/**
 * Plain Text Parser
 *
 * Parses plain text files.
 */

import type { ParsedDocument } from './types';
import { extractTitle, createMetadata, readFileAsText } from './helpers';

/**
 * Parse a plain text file
 */
export async function parsePlainText(file: File): Promise<ParsedDocument> {
  const content = await readFileAsText(file);
  const title = extractTitle(content, file.name);
  const metadata = createMetadata(file, content);

  return {
    title,
    content,
    contentType: 'text',
    metadata,
  };
}
