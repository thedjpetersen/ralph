import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useKeyboardShortcutsStore } from '../stores/keyboardShortcuts';

/**
 * Hook to enable the global Cmd+/ (or Ctrl+/) keyboard shortcut
 * for opening the keyboard shortcuts viewer modal.
 *
 * Add this hook to your root layout component (e.g., AppShell)
 * to enable the shortcut anywhere in the app.
 *
 * Usage:
 * ```tsx
 * function AppShell() {
 *   useKeyboardShortcutsViewer();
 *   return <div>...</div>;
 * }
 * ```
 */
export function useKeyboardShortcutsViewer() {
  const openModal = useKeyboardShortcutsStore((state) => state.openModal);
  const isOpen = useKeyboardShortcutsStore((state) => state.isOpen);
  const closeModal = useKeyboardShortcutsStore((state) => state.closeModal);

  useKeyboardShortcuts(
    [
      // Cmd+/ (Mac) to open shortcuts viewer
      {
        key: '/',
        metaKey: true,
        action: () => {
          if (isOpen) {
            closeModal();
          } else {
            openModal();
          }
        },
        description: 'Show keyboard shortcuts',
      },
      // Ctrl+/ (Windows) to open shortcuts viewer
      {
        key: '/',
        ctrlKey: true,
        action: () => {
          if (isOpen) {
            closeModal();
          } else {
            openModal();
          }
        },
        description: 'Show keyboard shortcuts',
      },
    ],
    true
  );
}
