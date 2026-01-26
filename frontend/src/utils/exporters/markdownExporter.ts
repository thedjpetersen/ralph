/**
 * Markdown Exporter
 */

import {
  type DocumentExportData,
  type ExportOptions,
  type ExportResult,
  getFormatConfig,
} from './types';
import { generateFilename, downloadFile, formatDate } from './helpers';

/**
 * Generate markdown content from document data
 */
export function generateMarkdown(
  data: DocumentExportData,
  options: ExportOptions
): string {
  const lines: string[] = [];

  // Add title
  lines.push(`# ${data.metadata.title}`);
  lines.push('');

  // Add metadata if requested
  if (options.includeMetadata) {
    lines.push('---');
    if (data.metadata.author) {
      lines.push(`**Author:** ${data.metadata.author}`);
    }
    if (data.metadata.createdAt) {
      lines.push(`**Created:** ${formatDate(data.metadata.createdAt)}`);
    }
    if (data.metadata.updatedAt) {
      lines.push(`**Updated:** ${formatDate(data.metadata.updatedAt)}`);
    }
    if (data.metadata.wordCount !== undefined) {
      lines.push(`**Word Count:** ${data.metadata.wordCount.toLocaleString()}`);
    }
    if (data.metadata.characterCount !== undefined) {
      lines.push(`**Character Count:** ${data.metadata.characterCount.toLocaleString()}`);
    }
    lines.push('---');
    lines.push('');
  }

  // Add content
  lines.push(data.content);

  return lines.join('\n');
}

/**
 * Export document to Markdown format
 */
export async function exportToMarkdown(
  data: DocumentExportData,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    const content = generateMarkdown(data, options);

    const filename = options.filename || generateFilename(
      data.metadata.title,
      'markdown',
      options.includeTimestamp
    );

    const config = getFormatConfig('markdown');
    downloadFile(content, filename, config.mimeType);

    return {
      success: true,
      filename,
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      error: error instanceof Error ? error.message : 'Failed to export Markdown',
    };
  }
}

/**
 * Get Markdown content as string for preview
 */
export function getMarkdownContent(
  data: DocumentExportData,
  options: ExportOptions
): string {
  return generateMarkdown(data, options);
}
