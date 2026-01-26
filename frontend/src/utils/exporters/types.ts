/**
 * Export Types and Interfaces
 */

export type ExportFormat = 'pdf' | 'markdown' | 'html' | 'text';

export interface DocumentMetadata {
  title: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  wordCount?: number;
  characterCount?: number;
}

export interface DocumentExportData {
  content: string;
  metadata: DocumentMetadata;
}

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includeTimestamp: boolean;
  filename?: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  error?: string;
}

export const EXPORT_FORMATS: { value: ExportFormat; label: string; extension: string; mimeType: string }[] = [
  { value: 'pdf', label: 'PDF Document', extension: 'pdf', mimeType: 'application/pdf' },
  { value: 'markdown', label: 'Markdown', extension: 'md', mimeType: 'text/markdown' },
  { value: 'html', label: 'HTML', extension: 'html', mimeType: 'text/html' },
  { value: 'text', label: 'Plain Text', extension: 'txt', mimeType: 'text/plain' },
];

export function getFormatConfig(format: ExportFormat) {
  return EXPORT_FORMATS.find(f => f.value === format)!;
}
