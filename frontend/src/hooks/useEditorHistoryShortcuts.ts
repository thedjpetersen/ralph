/**
 * useEditorHistoryShortcuts Hook
 *
 * Handles global keyboard shortcuts for undo/redo functionality.
 * - Cmd/Ctrl+Z for undo
 * - Cmd/Ctrl+Shift+Z for redo (Mac) / Cmd/Ctrl+Y for redo (Windows)
 * - Cmd/Ctrl+Shift+H to toggle history panel
 */

import { useEffect, useCallback } from 'react';
import { useEditorHistoryStore } from '../stores/editorHistory';

interface UseEditorHistoryShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Callback when content should be restored */
  onRestore?: (content: string) => void;
  /** Whether to skip when focus is in an input/textarea */
  skipInputs?: boolean;
}

export function useEditorHistoryShortcuts({
  enabled = true,
  onRestore,
  skipInputs = true,
}: UseEditorHistoryShortcutsOptions = {}) {
  const { undo, redo, canUndo, canRedo, togglePanel } = useEditorHistoryStore();

  const handleUndo = useCallback(() => {
    if (!canUndo()) return;
    const entry = undo();
    if (entry && onRestore) {
      onRestore(entry.content);
    }
  }, [undo, canUndo, onRestore]);

  const handleRedo = useCallback(() => {
    if (!canRedo()) return;
    const entry = redo();
    if (entry && onRestore) {
      onRestore(entry.content);
    }
  }, [redo, canRedo, onRestore]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea (if configured)
      if (skipInputs) {
        const activeElement = document.activeElement;
        const tagName = activeElement?.tagName.toLowerCase();
        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          (activeElement as HTMLElement)?.isContentEditable
        ) {
          return;
        }
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+Z for undo (without Shift)
      if (isMod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Cmd/Ctrl+Shift+Z for redo (Mac style)
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Cmd/Ctrl+Y for redo (Windows style)
      if (isMod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Cmd/Ctrl+Shift+H to toggle history panel
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        togglePanel();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleUndo, handleRedo, togglePanel, skipInputs]);

  return {
    handleUndo,
    handleRedo,
    togglePanel,
  };
}
