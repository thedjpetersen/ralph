/**
 * Document Export Utilities
 *
 * This module provides functions to export documents to various formats:
 * - PDF: Using jsPDF for client-side PDF generation
 * - Markdown: Clean markdown output
 * - HTML: Styled HTML with embedded CSS
 * - Plain Text: Simple text format
 */

export * from './types';
export * from './helpers';
export { exportToPdf, exportToPdfBlob } from './pdfExporter';
export { exportToMarkdown, getMarkdownContent } from './markdownExporter';
export { exportToHtml, getHtmlContent } from './htmlExporter';
export { exportToText, getPlainTextContent } from './textExporter';

import { type DocumentExportData, type ExportOptions, type ExportResult } from './types';
import { exportToPdf } from './pdfExporter';
import { exportToMarkdown } from './markdownExporter';
import { exportToHtml } from './htmlExporter';
import { exportToText } from './textExporter';

/**
 * Export document to the specified format
 */
export async function exportDocument(
  data: DocumentExportData,
  options: ExportOptions
): Promise<ExportResult> {
  switch (options.format) {
    case 'pdf':
      return exportToPdf(data, options);
    case 'markdown':
      return exportToMarkdown(data, options);
    case 'html':
      return exportToHtml(data, options);
    case 'text':
      return exportToText(data, options);
    default:
      return {
        success: false,
        filename: '',
        error: `Unsupported format: ${options.format}`,
      };
  }
}
