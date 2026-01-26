/**
 * Document Import Types
 */

export interface ParsedDocument {
  title: string;
  content: string;
  contentType: 'text' | 'markdown' | 'html';
  metadata: DocumentImportMetadata;
}

export interface DocumentImportMetadata {
  originalFilename: string;
  fileSize: number;
  fileType: string;
  wordCount: number;
  characterCount: number;
  importedAt: string;
}

export interface ParseError {
  error: string;
}

export type ParseResult = ParsedDocument | ParseError;
