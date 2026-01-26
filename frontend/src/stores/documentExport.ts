/**
 * Document Export Store
 *
 * Manages state for the document export dialog and export operations.
 */

import { create } from 'zustand';
import {
  type ExportFormat,
  type ExportOptions,
  type DocumentExportData,
  type DocumentMetadata,
  exportDocument,
  calculateStats,
} from '../utils/exporters';

interface DocumentExportState {
  // Dialog state
  isOpen: boolean;
  documentData: DocumentExportData | null;

  // Export options
  selectedFormat: ExportFormat;
  includeMetadata: boolean;
  includeTimestamp: boolean;

  // Export status
  isExporting: boolean;
  error: string | null;
  lastExportedFilename: string | null;

  // Actions
  openExportDialog: (content: string, metadata: Partial<DocumentMetadata>) => void;
  closeExportDialog: () => void;
  setSelectedFormat: (format: ExportFormat) => void;
  setIncludeMetadata: (include: boolean) => void;
  setIncludeTimestamp: (include: boolean) => void;
  executeExport: () => Promise<boolean>;
  clearError: () => void;
}

export const useDocumentExportStore = create<DocumentExportState>()((set, get) => ({
  // Initial state
  isOpen: false,
  documentData: null,
  selectedFormat: 'pdf',
  includeMetadata: true,
  includeTimestamp: false,
  isExporting: false,
  error: null,
  lastExportedFilename: null,

  // Open export dialog with document data
  openExportDialog: (content, metadata) => {
    const stats = calculateStats(content);
    const documentData: DocumentExportData = {
      content,
      metadata: {
        title: metadata.title || 'Untitled Document',
        author: metadata.author,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt || new Date().toISOString(),
        wordCount: stats.wordCount,
        characterCount: stats.characterCount,
      },
    };

    set({
      isOpen: true,
      documentData,
      error: null,
      lastExportedFilename: null,
    });
  },

  // Close export dialog
  closeExportDialog: () => {
    set({
      isOpen: false,
      documentData: null,
      error: null,
      isExporting: false,
    });
  },

  // Set selected format
  setSelectedFormat: (format) => {
    set({ selectedFormat: format });
  },

  // Toggle metadata inclusion
  setIncludeMetadata: (include) => {
    set({ includeMetadata: include });
  },

  // Toggle timestamp inclusion
  setIncludeTimestamp: (include) => {
    set({ includeTimestamp: include });
  },

  // Execute the export
  executeExport: async () => {
    const state = get();

    if (!state.documentData) {
      set({ error: 'No document data available' });
      return false;
    }

    set({ isExporting: true, error: null });

    const options: ExportOptions = {
      format: state.selectedFormat,
      includeMetadata: state.includeMetadata,
      includeTimestamp: state.includeTimestamp,
    };

    try {
      const result = await exportDocument(state.documentData, options);

      if (result.success) {
        set({
          isExporting: false,
          lastExportedFilename: result.filename,
          isOpen: false,
          documentData: null,
        });
        return true;
      } else {
        set({
          isExporting: false,
          error: result.error || 'Export failed',
        });
        return false;
      }
    } catch (error) {
      set({
        isExporting: false,
        error: error instanceof Error ? error.message : 'Export failed',
      });
      return false;
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
