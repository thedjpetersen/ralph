/**
 * Export Helper Functions
 */

import { type ExportFormat, type DocumentMetadata, getFormatConfig } from './types';

/**
 * Generate a filename for the export
 */
export function generateFilename(
  title: string,
  format: ExportFormat,
  includeTimestamp: boolean
): string {
  const config = getFormatConfig(format);
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'document';

  if (includeTimestamp) {
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${sanitizedTitle}-${timestamp}.${config.extension}`;
  }

  return `${sanitizedTitle}.${config.extension}`;
}

/**
 * Download a file to the user's device
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a date for display
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Calculate document statistics
 */
export function calculateStats(content: string): { wordCount: number; characterCount: number } {
  const text = content.trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  const characterCount = text.length;
  return { wordCount, characterCount };
}

/**
 * Build metadata section for exports
 */
export function buildMetadataSection(metadata: DocumentMetadata): string {
  const lines: string[] = [];

  if (metadata.author) {
    lines.push(`Author: ${metadata.author}`);
  }
  if (metadata.createdAt) {
    lines.push(`Created: ${formatDate(metadata.createdAt)}`);
  }
  if (metadata.updatedAt) {
    lines.push(`Updated: ${formatDate(metadata.updatedAt)}`);
  }
  if (metadata.wordCount !== undefined) {
    lines.push(`Word Count: ${metadata.wordCount.toLocaleString()}`);
  }
  if (metadata.characterCount !== undefined) {
    lines.push(`Character Count: ${metadata.characterCount.toLocaleString()}`);
  }

  return lines.join('\n');
}

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char]);
}
