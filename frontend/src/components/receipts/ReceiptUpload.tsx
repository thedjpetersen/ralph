import { useCallback, useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import './ReceiptUpload.css';

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.pdf'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface FileWithProgress {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface ReceiptUploadProps {
  onUpload?: (files: File[]) => Promise<void>;
  onFilesSelected?: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export function ReceiptUpload({
  onUpload,
  onFilesSelected,
  maxFiles = 10,
  disabled = false,
  className = '',
}: ReceiptUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Invalid file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    return null;
  }, []);

  const processFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const validFiles: FileWithProgress[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        if (files.length + validFiles.length >= maxFiles) {
          errors.push(`Maximum ${maxFiles} files allowed`);
          break;
        }

        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push({
            file,
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            progress: 0,
            status: 'pending',
          });
        }
      }

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles]);
        onFilesSelected?.(validFiles.map((f) => f.file));
      }

      return { validFiles, errors };
    },
    [files.length, maxFiles, onFilesSelected, validateFile]
  );

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCounterRef.current++;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      e.dataTransfer.dropEffect = 'copy';
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounterRef.current = 0;

      if (disabled) return;

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [disabled, processFiles]
  );

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    },
    [processFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleUpload = useCallback(async () => {
    if (!onUpload || files.length === 0 || isUploading) return;

    setIsUploading(true);
    const pendingFiles = files.filter((f) => f.status === 'pending');

    // Update all pending files to uploading state
    setFiles((prev) =>
      prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading' as const } : f))
    );

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.status === 'uploading' && f.progress < 90) {
              return { ...f, progress: Math.min(f.progress + 10, 90) };
            }
            return f;
          })
        );
      }, 200);

      await onUpload(pendingFiles.map((f) => f.file));

      clearInterval(progressInterval);

      // Mark all as complete
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading' ? { ...f, status: 'complete' as const, progress: 100 } : f
        )
      );
    } catch (err) {
      // Mark all uploading files as error
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'uploading'
            ? {
                ...f,
                status: 'error' as const,
                error: err instanceof Error ? err.message : 'Upload failed',
              }
            : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  }, [files, isUploading, onUpload]);

  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== 'complete'));
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const completedCount = files.filter((f) => f.status === 'complete').length;

  return (
    <div className={`receipt-upload ${className}`}>
      <div
        className={`receipt-upload-dropzone ${isDragOver ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Upload receipt files"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          onChange={handleFileInputChange}
          className="receipt-upload-input"
          disabled={disabled}
          aria-hidden="true"
        />

        <div className="receipt-upload-content">
          <div className="receipt-upload-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="receipt-upload-text">
            <p className="receipt-upload-primary">
              {isDragOver ? 'Drop files here' : 'Drag & drop receipt files here'}
            </p>
            <p className="receipt-upload-secondary">
              or <span className="receipt-upload-browse">browse</span> to select
            </p>
          </div>
          <p className="receipt-upload-hint">
            Supports images (JPG, PNG, GIF, WebP, HEIC) and PDF. Max {MAX_FILE_SIZE / 1024 / 1024}MB
            per file.
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="receipt-upload-files">
          <div className="receipt-upload-files-header">
            <span className="receipt-upload-files-title">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </span>
            {completedCount > 0 && (
              <button
                type="button"
                onClick={clearCompleted}
                className="receipt-upload-clear-btn"
              >
                Clear completed
              </button>
            )}
          </div>

          <ul className="receipt-upload-file-list">
            {files.map((fileItem) => (
              <li key={fileItem.id} className={`receipt-upload-file-item ${fileItem.status}`}>
                <div className="receipt-upload-file-icon">
                  {fileItem.file.type === 'application/pdf' ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )}
                </div>

                <div className="receipt-upload-file-info">
                  <span className="receipt-upload-file-name">{fileItem.file.name}</span>
                  <span className="receipt-upload-file-size">
                    {formatFileSize(fileItem.file.size)}
                    {fileItem.error && (
                      <span className="receipt-upload-file-error">{fileItem.error}</span>
                    )}
                  </span>
                  {fileItem.status === 'uploading' && (
                    <div className="receipt-upload-progress">
                      <div
                        className="receipt-upload-progress-bar"
                        style={{ width: `${fileItem.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="receipt-upload-file-actions">
                  {fileItem.status === 'complete' && (
                    <span className="receipt-upload-file-status-icon complete">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                  {fileItem.status === 'error' && (
                    <span className="receipt-upload-file-status-icon error">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                    </span>
                  )}
                  {(fileItem.status === 'pending' || fileItem.status === 'error') && (
                    <button
                      type="button"
                      onClick={() => removeFile(fileItem.id)}
                      className="receipt-upload-remove-btn"
                      aria-label={`Remove ${fileItem.file.name}`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {onUpload && pendingCount > 0 && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="receipt-upload-submit-btn"
            >
              {isUploading ? (
                <>
                  <span className="receipt-upload-spinner" />
                  Uploading...
                </>
              ) : (
                `Upload ${pendingCount} file${pendingCount !== 1 ? 's' : ''}`
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
