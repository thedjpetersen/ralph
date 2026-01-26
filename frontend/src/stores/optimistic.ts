import { create } from 'zustand';
import { toast } from './toast';

/**
 * Represents a pending optimistic mutation
 */
export interface PendingMutation<T = unknown> {
  id: string;
  type: string;
  optimisticData: T;
  previousData: T;
  timestamp: number;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

/**
 * Global sync status for showing sync indicators
 */
export type SyncStatus = 'idle' | 'syncing' | 'error';

interface OptimisticState {
  // Pending mutations by store/entity
  pendingMutations: Map<string, PendingMutation>;

  // Global sync status
  syncStatus: SyncStatus;

  // Count of active mutations
  activeMutationCount: number;

  // Actions
  startMutation: (id: string, type: string, optimisticData: unknown, previousData: unknown) => void;
  completeMutation: (id: string) => void;
  failMutation: (id: string, error: string) => void;
  getMutation: <T>(id: string) => PendingMutation<T> | undefined;
  getPendingMutationsByType: <T>(type: string) => PendingMutation<T>[];
  clearMutations: () => void;
}

let mutationIdCounter = 0;

/**
 * Generate a unique mutation ID
 */
export function generateMutationId(prefix = 'mutation'): string {
  return `${prefix}-${++mutationIdCounter}-${Date.now()}`;
}

/**
 * Central store for tracking optimistic mutations and sync status
 */
export const useOptimisticStore = create<OptimisticState>()((set, get) => ({
  pendingMutations: new Map(),
  syncStatus: 'idle',
  activeMutationCount: 0,

  startMutation: (id: string, type: string, optimisticData: unknown, previousData: unknown) => {
    const mutation: PendingMutation = {
      id,
      type,
      optimisticData,
      previousData,
      timestamp: Date.now(),
      status: 'pending',
    };

    set((state) => {
      const newMutations = new Map(state.pendingMutations);
      newMutations.set(id, mutation);
      return {
        pendingMutations: newMutations,
        activeMutationCount: state.activeMutationCount + 1,
        syncStatus: 'syncing',
      };
    });
  },

  completeMutation: (id) => {
    set((state) => {
      const mutation = state.pendingMutations.get(id);
      if (!mutation) return state;

      const newMutations = new Map(state.pendingMutations);
      newMutations.delete(id);

      const newCount = Math.max(0, state.activeMutationCount - 1);
      return {
        pendingMutations: newMutations,
        activeMutationCount: newCount,
        syncStatus: newCount === 0 ? 'idle' : 'syncing',
      };
    });
  },

  failMutation: (id, error) => {
    set((state) => {
      const mutation = state.pendingMutations.get(id);
      if (!mutation) return state;

      const newMutations = new Map(state.pendingMutations);
      newMutations.set(id, { ...mutation, status: 'error', error });

      const newCount = Math.max(0, state.activeMutationCount - 1);
      return {
        pendingMutations: newMutations,
        activeMutationCount: newCount,
        syncStatus: newCount === 0 ? 'error' : 'syncing',
      };
    });

    // Auto-clear error status after a delay
    setTimeout(() => {
      set((state) => {
        const mutation = state.pendingMutations.get(id);
        if (mutation?.status === 'error') {
          const newMutations = new Map(state.pendingMutations);
          newMutations.delete(id);
          return {
            pendingMutations: newMutations,
            syncStatus: state.activeMutationCount === 0 ? 'idle' : state.syncStatus,
          };
        }
        return state;
      });
    }, 5000);
  },

  getMutation: <T>(id: string) => {
    return get().pendingMutations.get(id) as PendingMutation<T> | undefined;
  },

  getPendingMutationsByType: <T>(type: string) => {
    const mutations: PendingMutation<T>[] = [];
    get().pendingMutations.forEach((mutation) => {
      if (mutation.type === type && mutation.status === 'pending') {
        mutations.push(mutation as PendingMutation<T>);
      }
    });
    return mutations;
  },

  clearMutations: () => {
    set({
      pendingMutations: new Map(),
      syncStatus: 'idle',
      activeMutationCount: 0,
    });
  },
}));

// Selectors for performance
const selectSyncStatus = (state: OptimisticState) => state.syncStatus;
const selectActiveMutationCount = (state: OptimisticState) => state.activeMutationCount;

export function useSyncStatus() {
  return useOptimisticStore(selectSyncStatus);
}

export function useActiveMutationCount() {
  return useOptimisticStore(selectActiveMutationCount);
}

/**
 * Options for optimistic mutation
 */
export interface OptimisticMutationOptions<TOptimistic, TPrevious, TResult> {
  /** Unique identifier for this mutation */
  mutationId?: string;
  /** Type identifier (e.g., 'document', 'comment', 'folder') */
  type: string;
  /** The optimistic data to apply immediately */
  optimisticData: TOptimistic;
  /** The previous data for rollback (can be different structure than optimistic) */
  previousData: TPrevious;
  /** The async mutation function that calls the API */
  mutationFn: () => Promise<TResult>;
  /** Called on success with the server response */
  onSuccess?: (result: TResult) => void;
  /** Called on error, should return the rolled-back state */
  onRollback: () => void;
  /** Toast message on success (optional) */
  successMessage?: string;
  /** Toast message on error */
  errorMessage?: string;
  /** Action for error toast (e.g., retry) */
  errorAction?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Execute an optimistic mutation with automatic rollback on error
 */
export async function executeOptimisticMutation<TOptimistic, TPrevious, TResult>(
  options: OptimisticMutationOptions<TOptimistic, TPrevious, TResult>
): Promise<TResult | null> {
  const {
    mutationId = generateMutationId(options.type),
    type,
    optimisticData,
    previousData,
    mutationFn,
    onSuccess,
    onRollback,
    successMessage,
    errorMessage = 'Operation failed',
    errorAction,
  } = options;

  const { startMutation, completeMutation, failMutation } = useOptimisticStore.getState();

  // Start the mutation (sets syncing status)
  startMutation(mutationId, type, optimisticData, previousData);

  try {
    // Execute the API call
    const result = await mutationFn();

    // Mark mutation as complete
    completeMutation(mutationId);

    // Call success callback
    onSuccess?.(result);

    // Show success toast if provided
    if (successMessage) {
      toast.success(successMessage);
    }

    return result;
  } catch (error) {
    // Mark mutation as failed
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    failMutation(mutationId, errorMsg);

    // Execute rollback
    onRollback();

    // Show error toast with optional retry action
    toast.error(errorMessage, {
      duration: 5000,
      action: errorAction,
    });

    return null;
  }
}

/**
 * Helper type for stores implementing optimistic updates
 */
export interface OptimisticStoreState {
  /** Whether an optimistic mutation is in progress */
  isSyncing: boolean;
}
