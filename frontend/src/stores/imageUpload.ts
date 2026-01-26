/**
 * Image Upload Store
 *
 * Manages state for image uploads in the editor, including drag-and-drop
 * and clipboard paste functionality.
 */

import { create } from 'zustand';

export type ImageUploadStatus = 'pending' | 'uploading' | 'complete' | 'error';

export interface UploadingImage {
  id: string;
  file: File;
  progress: number;
  status: ImageUploadStatus;
  error?: string;
  previewUrl?: string;
  uploadedUrl?: string;
}

interface ImageUploadState {
  // Upload state
  uploads: Map<string, UploadingImage>;
  isDragging: boolean;

  // Actions
  setDragging: (isDragging: boolean) => void;
  addUpload: (file: File) => string;
  updateUploadProgress: (id: string, progress: number) => void;
  setUploadComplete: (id: string, uploadedUrl: string) => void;
  setUploadError: (id: string, error: string) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
  getUpload: (id: string) => UploadingImage | undefined;
}

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

let uploadId = 0;

function generateUploadId(): string {
  return `img-upload-${++uploadId}-${Date.now()}`;
}

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `Invalid file type. Accepted: JPG, PNG, GIF, WebP, HEIC`;
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `File too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`;
  }
  return null;
}

export function isImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

export const useImageUploadStore = create<ImageUploadState>()((set, get) => ({
  uploads: new Map(),
  isDragging: false,

  setDragging: (isDragging) => {
    set({ isDragging });
  },

  addUpload: (file) => {
    const id = generateUploadId();
    const previewUrl = URL.createObjectURL(file);

    const upload: UploadingImage = {
      id,
      file,
      progress: 0,
      status: 'pending',
      previewUrl,
    };

    set((state) => {
      const newUploads = new Map(state.uploads);
      newUploads.set(id, upload);
      return { uploads: newUploads };
    });

    return id;
  },

  updateUploadProgress: (id, progress) => {
    set((state) => {
      const upload = state.uploads.get(id);
      if (!upload) return state;

      const newUploads = new Map(state.uploads);
      newUploads.set(id, {
        ...upload,
        progress,
        status: 'uploading',
      });
      return { uploads: newUploads };
    });
  },

  setUploadComplete: (id, uploadedUrl) => {
    set((state) => {
      const upload = state.uploads.get(id);
      if (!upload) return state;

      // Revoke the preview URL since we now have the uploaded URL
      if (upload.previewUrl) {
        URL.revokeObjectURL(upload.previewUrl);
      }

      const newUploads = new Map(state.uploads);
      newUploads.set(id, {
        ...upload,
        progress: 100,
        status: 'complete',
        uploadedUrl,
        previewUrl: undefined,
      });
      return { uploads: newUploads };
    });
  },

  setUploadError: (id, error) => {
    set((state) => {
      const upload = state.uploads.get(id);
      if (!upload) return state;

      const newUploads = new Map(state.uploads);
      newUploads.set(id, {
        ...upload,
        status: 'error',
        error,
      });
      return { uploads: newUploads };
    });
  },

  removeUpload: (id) => {
    set((state) => {
      const upload = state.uploads.get(id);
      if (upload?.previewUrl) {
        URL.revokeObjectURL(upload.previewUrl);
      }

      const newUploads = new Map(state.uploads);
      newUploads.delete(id);
      return { uploads: newUploads };
    });
  },

  clearCompleted: () => {
    set((state) => {
      const newUploads = new Map(state.uploads);
      for (const [id, upload] of newUploads) {
        if (upload.status === 'complete') {
          if (upload.previewUrl) {
            URL.revokeObjectURL(upload.previewUrl);
          }
          newUploads.delete(id);
        }
      }
      return { uploads: newUploads };
    });
  },

  getUpload: (id) => {
    return get().uploads.get(id);
  },
}));

// Export constants for use in other components
export { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE };
