/**
 * Document Import Helpers
 */

import type { DocumentImportMetadata } from './types';

/**
 * Calculate word and character count from text content
 */
export function calculateStats(content: string): { wordCount: number; characterCount: number } {
  const trimmedContent = content.trim();
  const characterCount = trimmedContent.length;
  const wordCount = trimmedContent ? trimmedContent.split(/\s+/).filter(word => word.length > 0).length : 0;
  return { wordCount, characterCount };
}

/**
 * Extract title from content (first line or heading)
 */
export function extractTitle(content: string, filename: string): string {
  const lines = content.split('\n');

  // Try to find a markdown heading
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('# ')) {
      return trimmedLine.slice(2).trim();
    }
  }

  // Try to find the first non-empty line
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine) {
      // Limit to reasonable length
      if (trimmedLine.length <= 100) {
        return trimmedLine;
      }
      return trimmedLine.slice(0, 100) + '...';
    }
  }

  // Fall back to filename without extension
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.slice(0, lastDot) : filename;
}

/**
 * Create metadata for an imported document
 */
export function createMetadata(file: File, content: string): DocumentImportMetadata {
  const stats = calculateStats(content);
  return {
    originalFilename: file.name,
    fileSize: file.size,
    fileType: file.type || 'unknown',
    wordCount: stats.wordCount,
    characterCount: stats.characterCount,
    importedAt: new Date().toISOString(),
  };
}

/**
 * Read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Read file as ArrayBuffer (for binary formats like .docx)
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
