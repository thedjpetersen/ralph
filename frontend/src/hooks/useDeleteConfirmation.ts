import { useState, useCallback } from 'react';

export interface UseDeleteConfirmationOptions<T = unknown> {
  /**
   * Callback invoked when the user confirms the delete action.
   * Should return a promise that resolves when the delete is complete.
   */
  onDelete: (item: T) => Promise<void>;

  /**
   * Optional callback invoked after a successful delete.
   */
  onSuccess?: () => void;

  /**
   * Optional callback invoked if delete fails.
   */
  onError?: (error: unknown) => void;
}

export interface UseDeleteConfirmationReturn<T = unknown> {
  /**
   * The item currently being confirmed for deletion, or null if no dialog is shown.
   */
  itemToDelete: T | null;

  /**
   * Whether the delete operation is currently in progress.
   */
  isDeleting: boolean;

  /**
   * Show the confirmation dialog for deleting an item.
   */
  confirmDelete: (item: T) => void;

  /**
   * Cancel the delete operation and close the dialog.
   */
  cancelDelete: () => void;

  /**
   * Execute the delete operation after confirmation.
   */
  executeDelete: () => Promise<void>;

  /**
   * Whether the delete confirmation dialog is open.
   */
  isOpen: boolean;
}

/**
 * A hook for managing delete confirmation dialogs with loading state.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const {
 *     itemToDelete,
 *     isDeleting,
 *     confirmDelete,
 *     cancelDelete,
 *     executeDelete,
 *     isOpen,
 *   } = useDeleteConfirmation({
 *     onDelete: async (item) => {
 *       await deleteItem(item.id);
 *     },
 *     onSuccess: () => {
 *       toast.success('Item deleted');
 *     },
 *   });
 *
 *   return (
 *     <>
 *       <button onClick={() => confirmDelete(item)}>Delete</button>
 *       <ConfirmDialog
 *         isOpen={isOpen}
 *         onClose={cancelDelete}
 *         onConfirm={executeDelete}
 *         title="Delete Item"
 *         description={`Are you sure you want to delete "${itemToDelete?.name}"?`}
 *         confirmLabel="Delete"
 *         variant="danger"
 *         isLoading={isDeleting}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useDeleteConfirmation<T = unknown>(
  options: UseDeleteConfirmationOptions<T>
): UseDeleteConfirmationReturn<T> {
  const { onDelete, onSuccess, onError } = options;

  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = useCallback((item: T) => {
    setItemToDelete(item);
  }, []);

  const cancelDelete = useCallback(() => {
    if (!isDeleting) {
      setItemToDelete(null);
    }
  }, [isDeleting]);

  const executeDelete = useCallback(async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(itemToDelete);
      setItemToDelete(null);
      onSuccess?.();
    } catch (error) {
      onError?.(error);
    } finally {
      setIsDeleting(false);
    }
  }, [itemToDelete, onDelete, onSuccess, onError]);

  return {
    itemToDelete,
    isDeleting,
    confirmDelete,
    cancelDelete,
    executeDelete,
    isOpen: itemToDelete !== null,
  };
}
