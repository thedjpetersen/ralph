/**
 * Document Import Dialog
 *
 * Modal dialog for importing documents from .md, .txt, and .docx files.
 * Supports drag-and-drop file upload.
 */

import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useDocumentImportStore, type ImportFile } from '../stores/documentImport';
import { toast } from '../stores/toast';
import './DocumentImportDialog.css';

// Icons
const UploadIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="17 8 12 3 7 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="12" y1="3" x2="12" y2="15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DocumentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 2v6h6M8 13h8M8 17h5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <polyline
      points="20 6 9 17 4 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ErrorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const RemoveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ACCEPTED_EXTENSIONS = '.md,.txt,.docx';
const MAX_FILE_SIZE_MB = 10;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileItem({
  file,
  onRemove,
}: {
  file: ImportFile;
  onRemove: (id: string) => void;
}) {
  const canRemove = file.status === 'pending' || file.status === 'ready' || file.status === 'error';

  return (
    <li className={`import-file-item ${file.status}`}>
      <div className="import-file-icon">
        <DocumentIcon />
      </div>

      <div className="import-file-info">
        <span className="import-file-name">{file.file.name}</span>
        <span className="import-file-meta">
          {formatFileSize(file.file.size)}
          {file.parsedDocument && (
            <> &middot; {file.parsedDocument.metadata.wordCount.toLocaleString()} words</>
          )}
          {file.error && <span className="import-file-error">{file.error}</span>}
        </span>
        {(file.status === 'parsing' || file.status === 'importing') && (
          <div className="import-progress">
            <div
              className="import-progress-bar"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="import-file-actions">
        {file.status === 'complete' && (
          <span className="import-file-status-icon complete">
            <CheckIcon />
          </span>
        )}
        {file.status === 'error' && (
          <span className="import-file-status-icon error">
            <ErrorIcon />
          </span>
        )}
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            className="import-remove-btn"
            aria-label={`Remove ${file.file.name}`}
          >
            <RemoveIcon />
          </button>
        )}
      </div>
    </li>
  );
}

export function DocumentImportDialog() {
  const {
    isOpen,
    files,
    isImporting,
    error,
    closeImportDialog,
    addFiles,
    removeFile,
    clearCompleted,
    executeImport,
    clearError,
  } = useDocumentImportStore();

  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounterRef.current = 0;

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        addFiles(droppedFiles);
      }
    },
    [addFiles]
  );

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    },
    [addFiles]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    []
  );

  const handleImport = useCallback(async () => {
    clearError();

    const success = await executeImport(async (doc) => {
      // For now, just show a success toast since we don't have a backend endpoint
      // In a real implementation, this would call the API to create the document
      console.log('Importing document:', doc.title, doc.metadata);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    if (success) {
      toast.success('Documents imported successfully');
    }
  }, [clearError, executeImport]);

  if (!isOpen) {
    return null;
  }

  const readyCount = files.filter(f => f.status === 'ready').length;
  const completedCount = files.filter(f => f.status === 'complete').length;
  const hasFiles = files.length > 0;

  const footer = (
    <>
      <Button variant="secondary" onClick={closeImportDialog} disabled={isImporting}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleImport}
        loading={isImporting}
        disabled={readyCount === 0}
      >
        Import {readyCount > 0 ? `${readyCount} file${readyCount !== 1 ? 's' : ''}` : ''}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeImportDialog}
      title="Import Documents"
      size="md"
      footer={footer}
    >
      <div className="import-dialog">
        {/* Dropzone */}
        <div
          className={`import-dropzone ${isDragOver ? 'dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label="Upload document files"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            onChange={handleFileInputChange}
            className="import-file-input"
            aria-hidden="true"
          />

          <div className="import-dropzone-content">
            <div className="import-dropzone-icon">
              <UploadIcon />
            </div>
            <div className="import-dropzone-text">
              <p className="import-dropzone-primary">
                {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="import-dropzone-secondary">
                or <span className="import-dropzone-browse">browse</span> to select
              </p>
            </div>
            <p className="import-dropzone-hint">
              Supports Markdown (.md), Plain Text (.txt), and Word (.docx). Max {MAX_FILE_SIZE_MB}MB per file.
            </p>
          </div>
        </div>

        {/* File list */}
        {hasFiles && (
          <div className="import-files">
            <div className="import-files-header">
              <span className="import-files-title">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </span>
              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="import-clear-btn"
                >
                  Clear completed
                </button>
              )}
            </div>

            <ul className="import-file-list">
              {files.map((file) => (
                <FileItem key={file.id} file={file} onRemove={removeFile} />
              ))}
            </ul>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="import-error" role="alert">
            <span className="import-error-icon" aria-hidden="true">!</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

DocumentImportDialog.displayName = 'DocumentImportDialog';
