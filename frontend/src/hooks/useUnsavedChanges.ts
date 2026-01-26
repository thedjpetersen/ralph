import { useState, useCallback, useEffect } from 'react';

export interface UseUnsavedChangesOptions {
  /**
   * Whether to show a browser beforeunload prompt when trying to leave the page
   * with unsaved changes.
   */
  enableBeforeUnload?: boolean;
}

export interface UseUnsavedChangesReturn {
  /**
   * Whether there are unsaved changes.
   */
  hasUnsavedChanges: boolean;

  /**
   * Mark the form as having unsaved changes.
   */
  markDirty: () => void;

  /**
   * Mark the form as clean (no unsaved changes).
   */
  markClean: () => void;

  /**
   * Whether the discard confirmation dialog is showing.
   */
  showDiscardDialog: boolean;

  /**
   * Show the discard confirmation dialog.
   * Returns a promise that resolves to true if the user confirms, false otherwise.
   */
  confirmDiscard: () => Promise<boolean>;

  /**
   * Confirm discarding changes (called from dialog confirm button).
   */
  handleDiscardConfirm: () => void;

  /**
   * Cancel discarding changes (called from dialog cancel button).
   */
  handleDiscardCancel: () => void;
}

/**
 * A hook for managing unsaved changes state with optional browser beforeunload prompt
 * and a discard confirmation dialog.
 *
 * Usage:
 * ```tsx
 * function MyForm() {
 *   const {
 *     hasUnsavedChanges,
 *     markDirty,
 *     markClean,
 *     showDiscardDialog,
 *     confirmDiscard,
 *     handleDiscardConfirm,
 *     handleDiscardCancel,
 *   } = useUnsavedChanges({ enableBeforeUnload: true });
 *
 *   const handleChange = () => {
 *     markDirty();
 *   };
 *
 *   const handleSave = async () => {
 *     await saveData();
 *     markClean();
 *   };
 *
 *   const handleNavigateAway = async () => {
 *     if (hasUnsavedChanges) {
 *       const confirmed = await confirmDiscard();
 *       if (!confirmed) return;
 *     }
 *     navigate('/elsewhere');
 *   };
 *
 *   return (
 *     <>
 *       <form>...</form>
 *       <ConfirmDialog
 *         isOpen={showDiscardDialog}
 *         onClose={handleDiscardCancel}
 *         onConfirm={handleDiscardConfirm}
 *         title="Discard Changes"
 *         description="You have unsaved changes. Are you sure you want to discard them?"
 *         confirmLabel="Discard"
 *         variant="danger"
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useUnsavedChanges(
  options: UseUnsavedChangesOptions = {}
): UseUnsavedChangesReturn {
  const { enableBeforeUnload = false } = options;

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [discardResolver, setDiscardResolver] = useState<((value: boolean) => void) | null>(null);

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const markClean = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  const confirmDiscard = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      setDiscardResolver(() => resolve);
      setShowDiscardDialog(true);
    });
  }, []);

  const handleDiscardConfirm = useCallback(() => {
    setShowDiscardDialog(false);
    setHasUnsavedChanges(false);
    if (discardResolver) {
      discardResolver(true);
      setDiscardResolver(null);
    }
  }, [discardResolver]);

  const handleDiscardCancel = useCallback(() => {
    setShowDiscardDialog(false);
    if (discardResolver) {
      discardResolver(false);
      setDiscardResolver(null);
    }
  }, [discardResolver]);

  // Browser beforeunload prompt
  useEffect(() => {
    if (!enableBeforeUnload || !hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enableBeforeUnload, hasUnsavedChanges]);

  return {
    hasUnsavedChanges,
    markDirty,
    markClean,
    showDiscardDialog,
    confirmDiscard,
    handleDiscardConfirm,
    handleDiscardCancel,
  };
}
