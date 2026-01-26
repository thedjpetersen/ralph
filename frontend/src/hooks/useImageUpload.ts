/**
 * useImageUpload Hook
 *
 * Handles image upload logic including validation, progress tracking,
 * and integration with the image upload store.
 */

import { useCallback } from 'react';
import { useImageUploadStore, validateImageFile, isImageFile } from '../stores/imageUpload';
import { toast } from '../stores/toast';

export interface UseImageUploadOptions {
  /** Callback when an image is successfully uploaded */
  onUploadComplete?: (imageUrl: string, altText: string) => void;
  /** Callback when upload starts (receives placeholder ID) */
  onUploadStart?: (placeholderId: string) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
}

export interface UseImageUploadReturn {
  /** Upload a single image file */
  uploadImage: (file: File) => Promise<string | null>;
  /** Process multiple files and upload images */
  processFiles: (files: FileList | File[]) => Promise<void>;
  /** Whether images are currently being dragged over */
  isDragging: boolean;
  /** Set the dragging state */
  setDragging: (isDragging: boolean) => void;
  /** Get all active uploads */
  getActiveUploads: () => Map<string, import('../stores/imageUpload').UploadingImage>;
}

/**
 * Simulates image upload to backend storage.
 * In production, this would use a real upload endpoint.
 */
async function uploadToBackend(
  file: File,
  onProgress: (progress: number) => void
): Promise<string> {
  // Simulate upload progress
  return new Promise((resolve, reject) => {
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 20 + 5;
      if (progress > 90) progress = 90;
      onProgress(Math.min(progress, 90));
    }, 200);

    // Simulate upload delay (1-2 seconds)
    const uploadTime = 1000 + Math.random() * 1000;

    setTimeout(async () => {
      clearInterval(progressInterval);
      onProgress(100);

      // Create a local URL for the image
      // In production, this would be replaced with the actual uploaded URL
      try {
        // Create a blob URL that represents the uploaded image
        // This simulates what would be returned from a real backend
        const imageUrl = URL.createObjectURL(file);
        resolve(imageUrl);
      } catch {
        reject(new Error('Failed to process image'));
      }
    }, uploadTime);
  });
}

/**
 * Hook for managing image uploads in the editor.
 */
export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const { onUploadComplete, onUploadStart, onUploadError } = options;

  const {
    isDragging,
    setDragging,
    addUpload,
    updateUploadProgress,
    setUploadComplete,
    setUploadError,
    uploads,
  } = useImageUploadStore();

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      // Validate the file
      const validationError = validateImageFile(file);
      if (validationError) {
        toast.error(validationError);
        onUploadError?.(validationError);
        return null;
      }

      // Add to upload store
      const uploadId = addUpload(file);
      onUploadStart?.(uploadId);

      // Show uploading toast
      const toastId = toast.info(`Uploading ${file.name}...`, { duration: 0 });

      try {
        // Upload to backend
        const imageUrl = await uploadToBackend(file, (progress) => {
          updateUploadProgress(uploadId, progress);
        });

        // Mark as complete
        setUploadComplete(uploadId, imageUrl);

        // Dismiss uploading toast and show success
        toast.dismiss(toastId);
        toast.success(`Image uploaded successfully`);

        // Notify callback
        const altText = file.name.replace(/\.[^/.]+$/, ''); // Remove extension for alt text
        onUploadComplete?.(imageUrl, altText);

        return imageUrl;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        // Mark as error in store
        setUploadError(uploadId, errorMessage);

        // Dismiss uploading toast and show error
        toast.dismiss(toastId);
        toast.error(`Failed to upload image: ${errorMessage}`);

        // Notify callback
        onUploadError?.(errorMessage);

        return null;
      }
    },
    [
      addUpload,
      updateUploadProgress,
      setUploadComplete,
      setUploadError,
      onUploadComplete,
      onUploadStart,
      onUploadError,
    ]
  );

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const imageFiles = fileArray.filter(isImageFile);

      if (imageFiles.length === 0) {
        toast.warning('No valid image files found');
        return;
      }

      // Process all images concurrently
      await Promise.all(imageFiles.map((file) => uploadImage(file)));
    },
    [uploadImage]
  );

  const getActiveUploads = useCallback(() => {
    return uploads;
  }, [uploads]);

  return {
    uploadImage,
    processFiles,
    isDragging,
    setDragging,
    getActiveUploads,
  };
}
