/**
 * Document Import Store
 *
 * Manages state for the document import dialog and import operations.
 */

import { create } from 'zustand';
import { parseMarkdown, parsePlainText, parseDocx, type ParsedDocument, type ParseError } from '../utils/importers';

export interface ImportFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'parsing' | 'ready' | 'importing' | 'complete' | 'error';
  error?: string;
  parsedDocument?: ParsedDocument;
}

interface DocumentImportState {
  // Dialog state
  isOpen: boolean;
  targetFolderId: string | null;

  // Files state
  files: ImportFile[];

  // Import status
  isImporting: boolean;
  error: string | null;

  // Actions
  openImportDialog: (folderId?: string | null) => void;
  closeImportDialog: () => void;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeFile: (fileId: string) => void;
  clearCompleted: () => void;
  executeImport: (onImport: (doc: ParsedDocument, folderId: string | null) => Promise<void>) => Promise<boolean>;
  clearError: () => void;
}

const SUPPORTED_TYPES = [
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.docx'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
}

function isValidFileType(file: File): boolean {
  const extension = getFileExtension(file.name);
  if (SUPPORTED_EXTENSIONS.includes(extension)) {
    return true;
  }
  if (SUPPORTED_TYPES.includes(file.type)) {
    return true;
  }
  return false;
}

async function parseFile(file: File): Promise<ParsedDocument | ParseError> {
  const extension = getFileExtension(file.name);

  try {
    if (extension === '.md' || file.type === 'text/markdown' || file.type === 'text/x-markdown') {
      return await parseMarkdown(file);
    } else if (extension === '.txt' || file.type === 'text/plain') {
      return await parsePlainText(file);
    } else if (extension === '.docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await parseDocx(file);
    }
    return { error: `Unsupported file type: ${extension || file.type}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to parse file' };
  }
}

export const useDocumentImportStore = create<DocumentImportState>()((set, get) => ({
  // Initial state
  isOpen: false,
  targetFolderId: null,
  files: [],
  isImporting: false,
  error: null,

  // Open import dialog
  openImportDialog: (folderId = null) => {
    set({
      isOpen: true,
      targetFolderId: folderId,
      files: [],
      error: null,
      isImporting: false,
    });
  },

  // Close import dialog
  closeImportDialog: () => {
    set({
      isOpen: false,
      targetFolderId: null,
      files: [],
      error: null,
      isImporting: false,
    });
  },

  // Add files for import
  addFiles: async (fileList) => {
    const { files: existingFiles } = get();
    const newFiles = Array.from(fileList);
    const filesToAdd: ImportFile[] = [];
    const errors: string[] = [];

    for (const file of newFiles) {
      // Validate file type
      if (!isValidFileType(file)) {
        errors.push(`${file.name}: Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        continue;
      }

      // Check for duplicates
      const isDuplicate = existingFiles.some(f => f.file.name === file.name && f.file.size === file.size);
      if (isDuplicate) {
        errors.push(`${file.name}: File already added`);
        continue;
      }

      filesToAdd.push({
        file,
        id: generateFileId(),
        progress: 0,
        status: 'pending',
      });
    }

    if (errors.length > 0) {
      set({ error: errors.join('\n') });
    }

    if (filesToAdd.length > 0) {
      set({ files: [...existingFiles, ...filesToAdd] });

      // Parse files one by one
      for (const fileItem of filesToAdd) {
        set(state => ({
          files: state.files.map(f =>
            f.id === fileItem.id ? { ...f, status: 'parsing' as const, progress: 50 } : f
          ),
        }));

        const result = await parseFile(fileItem.file);

        if ('error' in result) {
          set(state => ({
            files: state.files.map(f =>
              f.id === fileItem.id ? { ...f, status: 'error' as const, error: result.error, progress: 0 } : f
            ),
          }));
        } else {
          set(state => ({
            files: state.files.map(f =>
              f.id === fileItem.id ? { ...f, status: 'ready' as const, parsedDocument: result, progress: 100 } : f
            ),
          }));
        }
      }
    }
  },

  // Remove a file from the list
  removeFile: (fileId) => {
    set(state => ({
      files: state.files.filter(f => f.id !== fileId),
    }));
  },

  // Clear completed files
  clearCompleted: () => {
    set(state => ({
      files: state.files.filter(f => f.status !== 'complete'),
    }));
  },

  // Execute the import
  executeImport: async (onImport) => {
    const { files, targetFolderId } = get();
    const readyFiles = files.filter(f => f.status === 'ready' && f.parsedDocument);

    if (readyFiles.length === 0) {
      set({ error: 'No files ready for import' });
      return false;
    }

    set({ isImporting: true, error: null });

    let hasErrors = false;

    for (const fileItem of readyFiles) {
      if (!fileItem.parsedDocument) continue;

      set(state => ({
        files: state.files.map(f =>
          f.id === fileItem.id ? { ...f, status: 'importing' as const } : f
        ),
      }));

      try {
        await onImport(fileItem.parsedDocument, targetFolderId);
        set(state => ({
          files: state.files.map(f =>
            f.id === fileItem.id ? { ...f, status: 'complete' as const } : f
          ),
        }));
      } catch (err) {
        hasErrors = true;
        set(state => ({
          files: state.files.map(f =>
            f.id === fileItem.id
              ? { ...f, status: 'error' as const, error: err instanceof Error ? err.message : 'Import failed' }
              : f
          ),
        }));
      }
    }

    set({ isImporting: false });

    // Close dialog if all imports succeeded
    if (!hasErrors) {
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      set({
        isOpen: false,
        files: [],
        targetFolderId: null,
      });
    }

    return !hasErrors;
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
