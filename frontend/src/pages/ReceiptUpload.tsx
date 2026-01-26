import { useState, useRef, useCallback, type TouchEvent as ReactTouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccountStore } from '../stores/account';
import { useReceiptsStore, type CreateReceiptRequest } from '../stores/receipts';
import { PageTransition } from '../components/PageTransition';
import { toast } from '../stores/toast';
import './ReceiptUpload.css';

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

interface SwipeState {
  id: string;
  startX: number;
  currentX: number;
  swiping: boolean;
}

export function ReceiptUpload() {
  const navigate = useNavigate();
  const { currentAccount } = useAccountStore();
  const { createReceipt, isLoading } = useReceiptsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [swipeState, setSwipeState] = useState<SwipeState | null>(null);
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      return validTypes.includes(file.type);
    });

    const newFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      id: generateId(),
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const handleUpload = async () => {
    if (!currentAccount || uploadedFiles.length === 0) return;

    setIsUploading(true);

    for (const uploadedFile of uploadedFiles) {
      try {
        setUploadProgress(prev => ({ ...prev, [uploadedFile.id]: 0 }));

        const receiptData: CreateReceiptRequest = {
          source_type: 'upload',
          file_name: uploadedFile.file.name,
          mime_type: uploadedFile.file.type,
          file_size: uploadedFile.file.size,
        };

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [uploadedFile.id]: Math.min((prev[uploadedFile.id] || 0) + 10, 90),
          }));
        }, 200);

        await createReceipt(currentAccount.id, receiptData);

        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [uploadedFile.id]: 100 }));

        // Clean up preview URL
        if (uploadedFile.preview) {
          URL.revokeObjectURL(uploadedFile.preview);
        }
      } catch {
        toast.error(`Failed to upload ${uploadedFile.file.name}`);
      }
    }

    setIsUploading(false);
    toast.success(`Successfully uploaded ${uploadedFiles.length} receipt(s)`);
    navigate('/receipts');
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  // Swipe to delete handlers
  const handleSwipeStart = useCallback((e: ReactTouchEvent, id: string) => {
    if (isUploading) return;
    setSwipeState({
      id,
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
      swiping: false,
    });
  }, [isUploading]);

  const handleSwipeMove = useCallback((e: ReactTouchEvent) => {
    if (!swipeState || isUploading) return;

    const currentX = e.touches[0].clientX;
    const diff = swipeState.startX - currentX;

    // Only track leftward swipes
    if (diff > 10) {
      setSwipeState(prev => prev ? { ...prev, currentX, swiping: true } : null);
      // Cap at -100px
      const offset = Math.min(diff, 100);
      setSwipeOffsets(prev => ({ ...prev, [swipeState.id]: offset }));
    } else if (diff < 0) {
      // Reset if swiping right
      setSwipeOffsets(prev => ({ ...prev, [swipeState.id]: 0 }));
    }
  }, [swipeState, isUploading]);

  const handleSwipeEnd = useCallback(() => {
    if (!swipeState || isUploading) {
      setSwipeState(null);
      return;
    }

    const offset = swipeOffsets[swipeState.id] || 0;

    // If swiped more than 70px, trigger delete
    if (offset > 70) {
      removeFile(swipeState.id);
      setSwipeOffsets(prev => {
        const newOffsets = { ...prev };
        delete newOffsets[swipeState.id];
        return newOffsets;
      });
    } else {
      // Reset position with animation
      setSwipeOffsets(prev => ({ ...prev, [swipeState.id]: 0 }));
    }

    setSwipeState(null);
  }, [swipeState, swipeOffsets, isUploading, removeFile]);

  if (!currentAccount) {
    return (
      <PageTransition>
        <div className="receipt-upload-page">
          <div className="upload-empty">
            <h2>No Account Selected</h2>
            <p>Please select an account to upload receipts.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="receipt-upload-page">
        <div className="upload-header">
          <button
            className="back-button"
            onClick={() => navigate('/receipts')}
            aria-label="Go back to receipts"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1>Upload Receipt</h1>
            <p className="upload-subtitle">Scan or upload your receipts</p>
          </div>
        </div>

        {/* Mobile-optimized action buttons */}
        <div className="upload-actions-mobile">
          <button
            className="upload-action-button camera-button"
            onClick={openCamera}
            disabled={isUploading}
          >
            <svg className="action-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M26 8h-4l-2-3h-8l-2 3H6a2 2 0 00-2 2v14a2 2 0 002 2h20a2 2 0 002-2V10a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>Take Photo</span>
          </button>
          <button
            className="upload-action-button gallery-button"
            onClick={openFileDialog}
            disabled={isUploading}
          >
            <svg className="action-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="4" y="6" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 22l6-6 4 4 6-6 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="10" cy="12" r="2" fill="currentColor"/>
            </svg>
            <span>Choose File</span>
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={handleFileInputChange}
          className="hidden-input"
          aria-hidden="true"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden-input"
          aria-hidden="true"
        />

        {/* Desktop drag and drop zone */}
        <div
          className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${uploadedFiles.length > 0 ? 'has-files' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
          role="button"
          tabIndex={0}
          aria-label="Drop files here or click to browse"
          onKeyDown={(e) => e.key === 'Enter' && openFileDialog()}
        >
          <div className="dropzone-content">
            <svg className="dropzone-icon" width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M24 6v24m0-24l-8 8m8-8l8 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 36v4a2 2 0 002 2h32a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="dropzone-text">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="dropzone-subtext">or click to browse</p>
            <p className="dropzone-formats">Supports: JPG, PNG, WebP, PDF</p>
          </div>
        </div>

        {/* Uploaded files preview */}
        {uploadedFiles.length > 0 && (
          <div className="uploaded-files">
            <h2 className="files-header">Selected Files ({uploadedFiles.length})</h2>
            <p className="files-swipe-hint">Swipe left to delete</p>
            <div className="files-grid">
              {uploadedFiles.map((uploadedFile) => {
                const offset = swipeOffsets[uploadedFile.id] || 0;
                const isSwiping = swipeState?.id === uploadedFile.id && swipeState.swiping;

                return (
                  <div key={uploadedFile.id} className="file-preview-container">
                    {/* Delete background revealed on swipe */}
                    <div
                      className="swipe-delete-bg"
                      style={{ opacity: Math.min(offset / 70, 1) }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M6 6l12 12M18 6l-12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div
                      className={`file-preview ${isSwiping ? 'swiping' : ''}`}
                      style={{
                        transform: `translateX(-${offset}px)`,
                        transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
                      }}
                      onTouchStart={(e) => handleSwipeStart(e, uploadedFile.id)}
                      onTouchMove={handleSwipeMove}
                      onTouchEnd={handleSwipeEnd}
                    >
                      {uploadedFile.preview ? (
                        <img
                          src={uploadedFile.preview}
                          alt={`Preview of ${uploadedFile.file.name}`}
                          className="preview-image"
                          draggable={false}
                        />
                      ) : (
                        <div className="preview-placeholder">
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                            <path d="M8 4h10l6 6v18a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2"/>
                            <path d="M18 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>PDF</span>
                        </div>
                      )}

                      {uploadProgress[uploadedFile.id] !== undefined && (
                        <div className="upload-progress-overlay">
                          <div
                            className="progress-bar"
                            style={{ width: `${uploadProgress[uploadedFile.id]}%` }}
                          />
                          <span className="progress-text">{uploadProgress[uploadedFile.id]}%</span>
                        </div>
                      )}

                      <button
                        className="remove-file-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(uploadedFile.id);
                        }}
                        aria-label={`Remove ${uploadedFile.file.name}`}
                        disabled={isUploading}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>

                      <div className="file-info">
                        <span className="file-name">{uploadedFile.file.name}</span>
                        <span className="file-size">
                          {(uploadedFile.file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload button */}
        {uploadedFiles.length > 0 && (
          <div className="upload-footer">
            <button
              className="upload-submit-button"
              onClick={handleUpload}
              disabled={isUploading || isLoading}
            >
              {isUploading ? (
                <>
                  <span className="loading-spinner" aria-hidden="true" />
                  Uploading...
                </>
              ) : (
                <>
                  Upload {uploadedFiles.length} Receipt{uploadedFiles.length > 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
