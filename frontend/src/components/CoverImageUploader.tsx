/**
 * CoverImageUploader Component
 *
 * A modal component for uploading and positioning cover images for documents.
 * Features:
 * - Click to upload or drag-and-drop
 * - Image preview with reposition controls
 * - Scale/zoom adjustment
 * - Remove cover option
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Slider } from './ui/Slider';
import { validateImageFile, ACCEPTED_IMAGE_TYPES } from '../stores/imageUpload';
import { toast } from '../stores/toast';
import type { CoverImagePosition } from '../api/client';
import './CoverImageUploader.css';

// Icons
const UploadIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      x1="12"
      y1="3"
      x2="12"
      y2="15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface CoverImageUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  currentImageUrl?: string | null;
  currentPosition?: CoverImagePosition | null;
  onUpload: (file: File) => Promise<string | null>;
  onUpdatePosition: (position: CoverImagePosition) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
}

export function CoverImageUploader({
  isOpen,
  onClose,
  currentImageUrl,
  currentPosition,
  onUpload,
  onUpdatePosition,
  onRemove,
}: CoverImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [position, setPosition] = useState<CoverImagePosition>({
    x: currentPosition?.x ?? 50,
    y: currentPosition?.y ?? 50,
    scale: currentPosition?.scale ?? 1,
  });
  const [isRepositioning, setIsRepositioning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(null);
      setPosition({
        x: currentPosition?.x ?? 50,
        y: currentPosition?.y ?? 50,
        scale: currentPosition?.scale ?? 1,
      });
      setIsRepositioning(false);
    }
  }, [isOpen, currentPosition]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      const error = validateImageFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      setIsUploading(true);
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      try {
        const result = await onUpload(file);
        if (result) {
          setPreviewUrl(null);
          URL.revokeObjectURL(preview);
        }
      } catch {
        toast.error('Failed to upload image');
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFile]
  );

  const handleRemove = useCallback(async () => {
    const success = await onRemove();
    if (success) {
      onClose();
    }
  }, [onRemove, onClose]);

  const handleScaleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPosition((prev) => ({ ...prev, scale: parseFloat(e.target.value) }));
  }, []);

  const handleImageMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isRepositioning) return;
      e.preventDefault();
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startX: position.x,
        startY: position.y,
      };
    },
    [isRepositioning, position]
  );

  const handleImageMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragStartRef.current || !imageRef.current) return;

      const rect = imageRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaY = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;

      setPosition((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(100, dragStartRef.current!.startX - deltaX)),
        y: Math.max(0, Math.min(100, dragStartRef.current!.startY - deltaY)),
      }));
    },
    []
  );

  const handleImageMouseUp = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  const handleSavePosition = useCallback(async () => {
    const success = await onUpdatePosition(position);
    if (success) {
      setIsRepositioning(false);
    }
  }, [onUpdatePosition, position]);

  const displayImageUrl = previewUrl || currentImageUrl;
  const acceptedTypes = ACCEPTED_IMAGE_TYPES.join(',');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cover Image"
      size="md"
      footer={
        displayImageUrl ? (
          <div className="cover-image-modal-footer">
            {isRepositioning ? (
              <>
                <Button variant="ghost" onClick={() => setIsRepositioning(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSavePosition}>
                  Save Position
                </Button>
              </>
            ) : (
              <>
                <Button variant="danger" onClick={handleRemove} leftIcon={<TrashIcon />}>
                  Remove
                </Button>
                <div className="cover-image-modal-footer-right">
                  <Button variant="secondary" onClick={() => setIsRepositioning(true)}>
                    Reposition
                  </Button>
                  <Button variant="ghost" onClick={onClose}>
                    Done
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="cover-image-uploader">
        {displayImageUrl ? (
          <div className="cover-image-preview-container">
            <div
              ref={imageRef}
              className={`cover-image-preview ${isRepositioning ? 'cover-image-preview-repositioning' : ''}`}
              onMouseDown={handleImageMouseDown}
              onMouseMove={handleImageMouseMove}
              onMouseUp={handleImageMouseUp}
              onMouseLeave={handleImageMouseUp}
            >
              <img
                src={displayImageUrl}
                alt="Cover preview"
                style={{
                  transform: `scale(${position.scale})`,
                  objectPosition: `${position.x}% ${position.y}%`,
                }}
              />
              {isRepositioning && (
                <div className="cover-image-reposition-hint">
                  Drag to reposition
                </div>
              )}
            </div>
            {isRepositioning && (
              <div className="cover-image-scale-control">
                <label htmlFor="cover-scale">Zoom</label>
                <Slider
                  id="cover-scale"
                  min={1}
                  max={2}
                  step={0.1}
                  value={position.scale}
                  onChange={handleScaleChange}
                />
                <span className="cover-image-scale-value">{Math.round(position.scale * 100)}%</span>
              </div>
            )}
            {!isRepositioning && (
              <button
                className="cover-image-change-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <ImageIcon />
                Change Image
              </button>
            )}
          </div>
        ) : (
          <div
            className={`cover-image-dropzone ${isDragging ? 'cover-image-dropzone-active' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="cover-image-dropzone-content">
              <UploadIcon />
              <p className="cover-image-dropzone-title">
                {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
              </p>
              <p className="cover-image-dropzone-hint">
                JPG, PNG, GIF, or WebP (max 10MB)
              </p>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={handleFileSelect}
          className="cover-image-file-input"
          aria-label="Upload cover image"
        />
      </div>
    </Modal>
  );
}

CoverImageUploader.displayName = 'CoverImageUploader';
