/**
 * PDF Exporter
 */

import { jsPDF } from 'jspdf';
import {
  type DocumentExportData,
  type ExportOptions,
  type ExportResult,
  getFormatConfig,
} from './types';
import { generateFilename, formatDate } from './helpers';

const PDF_CONFIG = {
  pageWidth: 210, // A4 width in mm
  pageHeight: 297, // A4 height in mm
  marginLeft: 20,
  marginRight: 20,
  marginTop: 25,
  marginBottom: 25,
  titleFontSize: 18,
  metadataFontSize: 10,
  bodyFontSize: 12,
  lineHeight: 1.5,
};

/**
 * Export document to PDF format
 */
export async function exportToPdf(
  data: DocumentExportData,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const contentWidth = PDF_CONFIG.pageWidth - PDF_CONFIG.marginLeft - PDF_CONFIG.marginRight;
    let yPosition = PDF_CONFIG.marginTop;

    // Add title
    doc.setFontSize(PDF_CONFIG.titleFontSize);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(data.metadata.title, contentWidth);
    doc.text(titleLines, PDF_CONFIG.marginLeft, yPosition);
    yPosition += titleLines.length * (PDF_CONFIG.titleFontSize * 0.4) + 10;

    // Add metadata if requested
    if (options.includeMetadata) {
      doc.setFontSize(PDF_CONFIG.metadataFontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);

      const metadataLines: string[] = [];
      if (data.metadata.author) {
        metadataLines.push(`Author: ${data.metadata.author}`);
      }
      if (data.metadata.createdAt) {
        metadataLines.push(`Created: ${formatDate(data.metadata.createdAt)}`);
      }
      if (data.metadata.updatedAt) {
        metadataLines.push(`Updated: ${formatDate(data.metadata.updatedAt)}`);
      }
      if (data.metadata.wordCount !== undefined) {
        metadataLines.push(`Word Count: ${data.metadata.wordCount.toLocaleString()}`);
      }

      for (const line of metadataLines) {
        doc.text(line, PDF_CONFIG.marginLeft, yPosition);
        yPosition += 5;
      }

      yPosition += 5;
      doc.setTextColor(0, 0, 0);
    }

    // Add horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(PDF_CONFIG.marginLeft, yPosition, PDF_CONFIG.pageWidth - PDF_CONFIG.marginRight, yPosition);
    yPosition += 10;

    // Add content
    doc.setFontSize(PDF_CONFIG.bodyFontSize);
    doc.setFont('helvetica', 'normal');

    const lines = doc.splitTextToSize(data.content, contentWidth);
    const lineHeightMm = PDF_CONFIG.bodyFontSize * 0.35 * PDF_CONFIG.lineHeight;
    const maxYPosition = PDF_CONFIG.pageHeight - PDF_CONFIG.marginBottom;

    for (const line of lines) {
      // Check if we need a new page
      if (yPosition + lineHeightMm > maxYPosition) {
        doc.addPage();
        yPosition = PDF_CONFIG.marginTop;
      }

      doc.text(line, PDF_CONFIG.marginLeft, yPosition);
      yPosition += lineHeightMm;
    }

    // Generate filename and save
    const filename = options.filename || generateFilename(
      data.metadata.title,
      'pdf',
      options.includeTimestamp
    );

    doc.save(filename);

    return {
      success: true,
      filename,
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      error: error instanceof Error ? error.message : 'Failed to export PDF',
    };
  }
}

/**
 * Export to PDF and return as Blob (for preview or different download methods)
 */
export function exportToPdfBlob(
  data: DocumentExportData,
  options: ExportOptions
): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const contentWidth = PDF_CONFIG.pageWidth - PDF_CONFIG.marginLeft - PDF_CONFIG.marginRight;
  let yPosition = PDF_CONFIG.marginTop;

  // Add title
  doc.setFontSize(PDF_CONFIG.titleFontSize);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(data.metadata.title, contentWidth);
  doc.text(titleLines, PDF_CONFIG.marginLeft, yPosition);
  yPosition += titleLines.length * (PDF_CONFIG.titleFontSize * 0.4) + 10;

  // Add metadata if requested
  if (options.includeMetadata) {
    doc.setFontSize(PDF_CONFIG.metadataFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    const metadataLines: string[] = [];
    if (data.metadata.author) {
      metadataLines.push(`Author: ${data.metadata.author}`);
    }
    if (data.metadata.createdAt) {
      metadataLines.push(`Created: ${formatDate(data.metadata.createdAt)}`);
    }
    if (data.metadata.updatedAt) {
      metadataLines.push(`Updated: ${formatDate(data.metadata.updatedAt)}`);
    }
    if (data.metadata.wordCount !== undefined) {
      metadataLines.push(`Word Count: ${data.metadata.wordCount.toLocaleString()}`);
    }

    for (const line of metadataLines) {
      doc.text(line, PDF_CONFIG.marginLeft, yPosition);
      yPosition += 5;
    }

    yPosition += 5;
    doc.setTextColor(0, 0, 0);
  }

  // Add horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(PDF_CONFIG.marginLeft, yPosition, PDF_CONFIG.pageWidth - PDF_CONFIG.marginRight, yPosition);
  yPosition += 10;

  // Add content
  doc.setFontSize(PDF_CONFIG.bodyFontSize);
  doc.setFont('helvetica', 'normal');

  const lines = doc.splitTextToSize(data.content, contentWidth);
  const lineHeightMm = PDF_CONFIG.bodyFontSize * 0.35 * PDF_CONFIG.lineHeight;
  const maxYPosition = PDF_CONFIG.pageHeight - PDF_CONFIG.marginBottom;

  for (const line of lines) {
    if (yPosition + lineHeightMm > maxYPosition) {
      doc.addPage();
      yPosition = PDF_CONFIG.marginTop;
    }

    doc.text(line, PDF_CONFIG.marginLeft, yPosition);
    yPosition += lineHeightMm;
  }

  const config = getFormatConfig('pdf');
  return doc.output('blob', { type: config.mimeType });
}
