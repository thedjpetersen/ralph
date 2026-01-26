import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  /** If true, the shortcut works even when focused on inputs */
  allowInInput?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 *
 * @param shortcuts - Array of keyboard shortcuts to register
 * @param enabled - Whether shortcuts are active (default: true)
 *
 * Usage:
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'k', metaKey: true, action: () => openSearch(), description: 'Open search' },
 *   { key: '/', action: () => focusSearch(), description: 'Focus search' },
 *   { key: 'Escape', action: () => closeModal(), description: 'Close modal' },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Skip if focused on input/textarea/select unless allowInInput is true
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        // Skip if in input and not allowed
        if (isInputFocused && !shortcut.allowInInput) continue;

        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !shortcut.ctrlKey || event.ctrlKey;
        const metaMatches = !shortcut.metaKey || event.metaKey;
        const shiftMatches = !shortcut.shiftKey || event.shiftKey;
        const altMatches = !shortcut.altKey || event.altKey;

        // For shortcuts with modifiers, ensure exact match
        const hasModifier = shortcut.ctrlKey || shortcut.metaKey || shortcut.shiftKey || shortcut.altKey;
        const modifierExact = !hasModifier || (
          (!!shortcut.ctrlKey === event.ctrlKey || !!shortcut.metaKey === event.metaKey) &&
          !!shortcut.shiftKey === event.shiftKey &&
          !!shortcut.altKey === event.altKey
        );

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches && modifierExact) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Hook for common global shortcuts
 *
 * Provides shortcuts like:
 * - Cmd/Ctrl+K: Open command palette/search
 * - Escape: Close modals/dropdowns
 * - ?: Show keyboard shortcuts help
 */
export function useGlobalShortcuts({
  onSearch,
  onHelp,
  onEscape,
}: {
  onSearch?: () => void;
  onHelp?: () => void;
  onEscape?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [];

  if (onSearch) {
    shortcuts.push({
      key: 'k',
      metaKey: true,
      action: onSearch,
      description: 'Open search',
    });
    shortcuts.push({
      key: 'k',
      ctrlKey: true,
      action: onSearch,
      description: 'Open search',
    });
  }

  if (onHelp) {
    shortcuts.push({
      key: '?',
      shiftKey: true,
      action: onHelp,
      description: 'Show keyboard shortcuts',
    });
  }

  if (onEscape) {
    shortcuts.push({
      key: 'Escape',
      action: onEscape,
      description: 'Close',
      allowInInput: true,
    });
  }

  useKeyboardShortcuts(shortcuts);
}
