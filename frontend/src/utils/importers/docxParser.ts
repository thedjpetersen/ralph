/**
 * DOCX Parser
 *
 * Parses Microsoft Word .docx files using mammoth.js
 */

import mammoth from 'mammoth';
import type { ParsedDocument } from './types';
import { extractTitle, createMetadata, readFileAsArrayBuffer } from './helpers';

/**
 * Convert HTML to markdown-like plain text
 */
function htmlToMarkdown(html: string): string {
  let markdown = html;

  // Convert headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

  // Convert bold and italic
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  // Convert links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Convert list items
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');

  // Remove list wrappers
  markdown = markdown.replace(/<\/?[uo]l[^>]*>/gi, '\n');

  // Convert paragraphs to text with double newlines
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

  // Convert line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  markdown = markdown.replace(/&nbsp;/g, ' ');
  markdown = markdown.replace(/&amp;/g, '&');
  markdown = markdown.replace(/&lt;/g, '<');
  markdown = markdown.replace(/&gt;/g, '>');
  markdown = markdown.replace(/&quot;/g, '"');
  markdown = markdown.replace(/&#39;/g, "'");

  // Clean up excessive whitespace
  markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
  markdown = markdown.trim();

  return markdown;
}

/**
 * Parse a DOCX file
 */
export async function parseDocx(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await readFileAsArrayBuffer(file);

  const result = await mammoth.convertToHtml({ arrayBuffer });

  if (result.messages.length > 0) {
    // Log any warnings for debugging but don't fail
    console.warn('DOCX parsing warnings:', result.messages);
  }

  // Convert HTML to markdown for better text editing
  const content = htmlToMarkdown(result.value);
  const title = extractTitle(content, file.name);
  const metadata = createMetadata(file, content);

  return {
    title,
    content,
    contentType: 'markdown',
    metadata,
  };
}
