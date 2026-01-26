/**
 * Plain Text Exporter
 */

import {
  type DocumentExportData,
  type ExportOptions,
  type ExportResult,
  getFormatConfig,
} from './types';
import { generateFilename, downloadFile, buildMetadataSection } from './helpers';

/**
 * Generate plain text content from document data
 */
export function generatePlainText(
  data: DocumentExportData,
  options: ExportOptions
): string {
  const lines: string[] = [];

  // Add title
  lines.push(data.metadata.title.toUpperCase());
  lines.push('='.repeat(Math.min(data.metadata.title.length, 60)));
  lines.push('');

  // Add metadata if requested
  if (options.includeMetadata) {
    const metadataSection = buildMetadataSection(data.metadata);
    if (metadataSection) {
      lines.push(metadataSection);
      lines.push('');
      lines.push('-'.repeat(40));
      lines.push('');
    }
  }

  // Add content
  lines.push(data.content);

  return lines.join('\n');
}

/**
 * Export document to Plain Text format
 */
export async function exportToText(
  data: DocumentExportData,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    const content = generatePlainText(data, options);

    const filename = options.filename || generateFilename(
      data.metadata.title,
      'text',
      options.includeTimestamp
    );

    const config = getFormatConfig('text');
    downloadFile(content, filename, config.mimeType);

    return {
      success: true,
      filename,
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      error: error instanceof Error ? error.message : 'Failed to export Plain Text',
    };
  }
}

/**
 * Get plain text content as string for preview
 */
export function getPlainTextContent(
  data: DocumentExportData,
  options: ExportOptions
): string {
  return generatePlainText(data, options);
}
