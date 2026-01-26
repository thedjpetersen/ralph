/**
 * Document Share Store
 *
 * Manages state for the document sharing dialog and share link operations.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from './toast';

export type SharePermission = 'view' | 'comment';

export interface DocumentShare {
  id: string;
  documentId: string;
  documentName: string;
  shareLink: string;
  permission: SharePermission;
  createdAt: number;
  expiresAt?: number;
  accessCount: number;
  isActive: boolean;
}

interface DocumentShareState {
  // Dialog state
  isOpen: boolean;
  currentDocumentId: string | null;
  currentDocumentName: string | null;

  // Share options
  selectedPermission: SharePermission;

  // Share state
  shares: DocumentShare[];
  isGenerating: boolean;
  error: string | null;

  // Actions
  openShareDialog: (documentId: string, documentName: string) => void;
  closeShareDialog: () => void;
  setSelectedPermission: (permission: SharePermission) => void;
  generateShareLink: () => Promise<string | null>;
  revokeShare: (shareId: string) => void;
  copyShareLink: (shareLink: string) => Promise<boolean>;
  getSharesForDocument: (documentId: string) => DocumentShare[];
  clearError: () => void;
}

// Generate a unique share ID
function generateShareId(): string {
  return `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate a shareable link token
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Build the share URL
function buildShareUrl(token: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/shared/${token}`;
}

export const useDocumentShareStore = create<DocumentShareState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOpen: false,
      currentDocumentId: null,
      currentDocumentName: null,
      selectedPermission: 'view',
      shares: [],
      isGenerating: false,
      error: null,

      // Open share dialog
      openShareDialog: (documentId, documentName) => {
        set({
          isOpen: true,
          currentDocumentId: documentId,
          currentDocumentName: documentName,
          selectedPermission: 'view',
          error: null,
        });
      },

      // Close share dialog
      closeShareDialog: () => {
        set({
          isOpen: false,
          currentDocumentId: null,
          currentDocumentName: null,
          error: null,
          isGenerating: false,
        });
      },

      // Set permission level
      setSelectedPermission: (permission) => {
        set({ selectedPermission: permission });
      },

      // Generate a new share link
      generateShareLink: async () => {
        const state = get();
        if (!state.currentDocumentId || !state.currentDocumentName) {
          set({ error: 'No document selected' });
          return null;
        }

        set({ isGenerating: true, error: null });

        try {
          // Simulate API delay for realistic UX
          await new Promise((resolve) => setTimeout(resolve, 500));

          const shareToken = generateShareToken();
          const shareLink = buildShareUrl(shareToken);

          const newShare: DocumentShare = {
            id: generateShareId(),
            documentId: state.currentDocumentId,
            documentName: state.currentDocumentName,
            shareLink,
            permission: state.selectedPermission,
            createdAt: Date.now(),
            accessCount: 0,
            isActive: true,
          };

          set((prevState) => ({
            shares: [...prevState.shares, newShare],
            isGenerating: false,
          }));

          toast.success('Share link created');
          return shareLink;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to generate share link';
          set({ error: errorMessage, isGenerating: false });
          toast.error(errorMessage);
          return null;
        }
      },

      // Revoke a share link
      revokeShare: (shareId) => {
        set((state) => ({
          shares: state.shares.map((share) =>
            share.id === shareId ? { ...share, isActive: false } : share
          ),
        }));
        toast.success('Share link revoked');
      },

      // Copy share link to clipboard
      copyShareLink: async (shareLink) => {
        try {
          await navigator.clipboard.writeText(shareLink);
          toast.success('Link copied to clipboard');
          return true;
        } catch {
          toast.error('Failed to copy link');
          return false;
        }
      },

      // Get all active shares for a document
      getSharesForDocument: (documentId) => {
        return get().shares.filter(
          (share) => share.documentId === documentId && share.isActive
        );
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'clockzen-document-shares',
      partialize: (state) => ({
        shares: state.shares,
      }),
    }
  )
);

// Selectors
export const selectActiveShares = (state: DocumentShareState) =>
  state.shares.filter((share) => share.isActive);

export const selectSharesForDocument = (documentId: string) => (state: DocumentShareState) =>
  state.shares.filter((share) => share.documentId === documentId && share.isActive);
