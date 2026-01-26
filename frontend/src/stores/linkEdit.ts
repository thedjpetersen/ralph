/**
 * Link Edit Store
 *
 * Manages state for the link editing popover, including:
 * - Which link is currently being viewed/edited
 * - Position for the popover
 * - Edit mode state
 */

import { create } from 'zustand';

export interface LinkInfo {
  /** The URL of the link */
  url: string;
  /** The display text of the link */
  text: string;
  /** Position of the link element for popover positioning */
  position: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  /** Original markdown range for editing */
  markdownRange?: {
    start: number;
    end: number;
  };
}

interface LinkEditState {
  /** Currently active link being viewed/edited */
  activeLink: LinkInfo | null;
  /** Whether the popover is open */
  isOpen: boolean;
  /** Whether we're in edit mode (showing URL input) */
  isEditing: boolean;
  /** Edited URL value */
  editedUrl: string;
}

interface LinkEditActions {
  /** Open the popover for a link */
  openPopover: (link: LinkInfo) => void;
  /** Close the popover */
  closePopover: () => void;
  /** Start editing the URL */
  startEditing: () => void;
  /** Cancel editing */
  cancelEditing: () => void;
  /** Update the edited URL value */
  setEditedUrl: (url: string) => void;
  /** Get the final URL (returns editedUrl if in edit mode, otherwise original) */
  getFinalUrl: () => string | null;
}

type LinkEditStore = LinkEditState & LinkEditActions;

export const useLinkEditStore = create<LinkEditStore>((set, get) => ({
  // State
  activeLink: null,
  isOpen: false,
  isEditing: false,
  editedUrl: '',

  // Actions
  openPopover: (link) => {
    set({
      activeLink: link,
      isOpen: true,
      isEditing: false,
      editedUrl: link.url,
    });
  },

  closePopover: () => {
    set({
      activeLink: null,
      isOpen: false,
      isEditing: false,
      editedUrl: '',
    });
  },

  startEditing: () => {
    const { activeLink } = get();
    if (activeLink) {
      set({
        isEditing: true,
        editedUrl: activeLink.url,
      });
    }
  },

  cancelEditing: () => {
    const { activeLink } = get();
    set({
      isEditing: false,
      editedUrl: activeLink?.url || '',
    });
  },

  setEditedUrl: (url) => {
    set({ editedUrl: url });
  },

  getFinalUrl: () => {
    const { activeLink, editedUrl, isEditing } = get();
    if (!activeLink) return null;
    return isEditing ? editedUrl : activeLink.url;
  },
}));

// Selectors
export const selectActiveLink = (state: LinkEditStore) => state.activeLink;
export const selectIsOpen = (state: LinkEditStore) => state.isOpen;
export const selectIsEditing = (state: LinkEditStore) => state.isEditing;
export const selectEditedUrl = (state: LinkEditStore) => state.editedUrl;

/**
 * Truncate a URL for display
 * @param url The URL to truncate
 * @param maxLength Maximum length before truncation (default: 40)
 * @returns Truncated URL with ellipsis if needed
 */
export function truncateUrl(url: string, maxLength = 40): string {
  if (url.length <= maxLength) return url;

  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search + urlObj.hash;

    // If host alone is too long, truncate it
    if (host.length > maxLength - 3) {
      return host.slice(0, maxLength - 3) + '...';
    }

    // Calculate remaining space for path
    const remainingSpace = maxLength - host.length - 3; // 3 for "..."

    if (path.length <= remainingSpace) {
      return host + path;
    }

    // Truncate path from the middle to keep start and end visible
    if (remainingSpace > 10) {
      const halfPath = Math.floor(remainingSpace / 2) - 1;
      return host + path.slice(0, halfPath) + '...' + path.slice(-halfPath);
    }

    return host + '...';
  } catch {
    // If URL parsing fails, just truncate normally
    return url.slice(0, maxLength - 3) + '...';
  }
}

/**
 * Validate a URL
 * @param url The URL to validate
 * @returns True if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  if (!url.trim()) return false;

  try {
    // Allow URLs without protocol by adding https://
    const urlToTest = url.includes('://') ? url : `https://${url}`;
    new URL(urlToTest);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize a URL by adding https:// if no protocol is present
 * @param url The URL to normalize
 * @returns Normalized URL
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (!trimmed.includes('://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}
