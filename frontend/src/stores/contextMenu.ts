/**
 * Context Menu Store
 *
 * Global state management for context menus across the application.
 * Handles document, comment, and editor selection context menus.
 */

import { create } from 'zustand';
import type { ReactNode } from 'react';

export type ContextMenuType = 'document' | 'comment' | 'editor' | null;

export interface ContextMenuShortcut {
  /** Keys for Mac platform, e.g., ['⌘', 'K'] */
  mac: string[];
  /** Keys for Windows platform, e.g., ['Ctrl', 'K'] */
  windows: string[];
}

export interface ContextMenuItemData {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Whether this is a destructive action */
  danger?: boolean;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Keyboard shortcut to display (legacy string format) */
  shortcut?: string;
  /** Platform-aware keyboard shortcut keys */
  shortcutKeys?: ContextMenuShortcut;
  /** Click handler */
  onClick: () => void;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface DocumentContextData {
  folderId: string;
  folderName: string;
  documentCount: number;
}

export interface CommentContextData {
  commentId: string;
  commentText: string;
  authorId?: string;
}

export interface EditorContextData {
  selectedText: string;
  blockId?: string;
  blockIndex?: number;
}

interface ContextMenuState {
  /** Whether the context menu is open */
  isOpen: boolean;
  /** Type of context menu currently open */
  menuType: ContextMenuType;
  /** Position of the context menu */
  position: ContextMenuPosition;
  /** Data for document context menu */
  documentData: DocumentContextData | null;
  /** Data for comment context menu */
  commentData: CommentContextData | null;
  /** Data for editor context menu */
  editorData: EditorContextData | null;

  /** Open document context menu */
  openDocumentMenu: (position: ContextMenuPosition, data: DocumentContextData) => void;
  /** Open comment context menu */
  openCommentMenu: (position: ContextMenuPosition, data: CommentContextData) => void;
  /** Open editor selection context menu */
  openEditorMenu: (position: ContextMenuPosition, data: EditorContextData) => void;
  /** Close the context menu */
  closeMenu: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isOpen: false,
  menuType: null,
  position: { x: 0, y: 0 },
  documentData: null,
  commentData: null,
  editorData: null,

  openDocumentMenu: (position, data) => {
    set({
      isOpen: true,
      menuType: 'document',
      position,
      documentData: data,
      commentData: null,
      editorData: null,
    });
  },

  openCommentMenu: (position, data) => {
    set({
      isOpen: true,
      menuType: 'comment',
      position,
      commentData: data,
      documentData: null,
      editorData: null,
    });
  },

  openEditorMenu: (position, data) => {
    set({
      isOpen: true,
      menuType: 'editor',
      position,
      editorData: data,
      documentData: null,
      commentData: null,
    });
  },

  closeMenu: () => {
    set({
      isOpen: false,
      menuType: null,
      documentData: null,
      commentData: null,
      editorData: null,
    });
  },
}));

// Selectors for optimized re-renders
export const selectIsOpen = (state: ContextMenuState) => state.isOpen;
export const selectMenuType = (state: ContextMenuState) => state.menuType;
export const selectPosition = (state: ContextMenuState) => state.position;
export const selectDocumentData = (state: ContextMenuState) => state.documentData;
export const selectCommentData = (state: ContextMenuState) => state.commentData;
export const selectEditorData = (state: ContextMenuState) => state.editorData;
