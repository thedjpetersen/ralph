import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useOptimisticStore, executeOptimisticMutation, generateMutationId } from '../optimistic';
import { useToastStore } from '../toast';

// Helper to reset stores between tests
function resetStores() {
  useOptimisticStore.getState().clearMutations();
  useToastStore.getState().clearAllToasts();
}

describe('optimistic store', () => {
  beforeEach(() => {
    resetStores();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateMutationId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateMutationId('test');
      const id2 = generateMutationId('test');
      expect(id1).not.toBe(id2);
    });

    it('should include prefix in ID', () => {
      const id = generateMutationId('folder');
      expect(id).toContain('folder');
    });
  });

  describe('startMutation', () => {
    it('should add a pending mutation', () => {
      useOptimisticStore.getState().startMutation('test-1', 'test:create', { id: '1' }, null);

      const state = useOptimisticStore.getState();
      expect(state.pendingMutations.size).toBe(1);
      expect(state.activeMutationCount).toBe(1);
      expect(state.syncStatus).toBe('syncing');
    });

    it('should increment active count for multiple mutations', () => {
      useOptimisticStore.getState().startMutation('test-1', 'test:create', { id: '1' }, null);
      useOptimisticStore.getState().startMutation('test-2', 'test:update', { id: '2' }, null);

      const state = useOptimisticStore.getState();
      expect(state.activeMutationCount).toBe(2);
      expect(state.syncStatus).toBe('syncing');
    });
  });

  describe('completeMutation', () => {
    it('should remove mutation and update status', () => {
      const store = useOptimisticStore.getState();
      store.startMutation('test-1', 'test:create', { id: '1' }, null);
      store.completeMutation('test-1');

      expect(useOptimisticStore.getState().pendingMutations.size).toBe(0);
      expect(useOptimisticStore.getState().activeMutationCount).toBe(0);
      expect(useOptimisticStore.getState().syncStatus).toBe('idle');
    });

    it('should keep syncing status if other mutations pending', () => {
      const store = useOptimisticStore.getState();
      store.startMutation('test-1', 'test:create', { id: '1' }, null);
      store.startMutation('test-2', 'test:update', { id: '2' }, null);
      store.completeMutation('test-1');

      expect(useOptimisticStore.getState().activeMutationCount).toBe(1);
      expect(useOptimisticStore.getState().syncStatus).toBe('syncing');
    });
  });

  describe('failMutation', () => {
    it('should mark mutation as error', () => {
      const store = useOptimisticStore.getState();
      store.startMutation('test-1', 'test:create', { id: '1' }, null);
      store.failMutation('test-1', 'Network error');

      const mutation = useOptimisticStore.getState().pendingMutations.get('test-1');
      expect(mutation?.status).toBe('error');
      expect(mutation?.error).toBe('Network error');
    });

    it('should auto-clear error after timeout', () => {
      const store = useOptimisticStore.getState();
      store.startMutation('test-1', 'test:create', { id: '1' }, null);
      store.failMutation('test-1', 'Network error');

      // Fast-forward past the auto-clear timeout
      vi.advanceTimersByTime(6000);

      expect(useOptimisticStore.getState().pendingMutations.has('test-1')).toBe(false);
    });
  });
});

describe('executeOptimisticMutation', () => {
  beforeEach(() => {
    resetStores();
  });

  it('should execute successful mutation', async () => {
    const onSuccess = vi.fn();
    const onRollback = vi.fn();
    const result = { id: '1', name: 'Test' };

    const mutationResult = await executeOptimisticMutation({
      type: 'test:create',
      optimisticData: { id: 'temp', name: 'Test' },
      previousData: null,
      mutationFn: async () => result,
      onSuccess,
      onRollback,
    });

    expect(mutationResult).toEqual(result);
    expect(onSuccess).toHaveBeenCalledWith(result);
    expect(onRollback).not.toHaveBeenCalled();
    expect(useOptimisticStore.getState().syncStatus).toBe('idle');
  });

  it('should rollback on error', async () => {
    const onSuccess = vi.fn();
    const onRollback = vi.fn();

    const mutationResult = await executeOptimisticMutation({
      type: 'test:create',
      optimisticData: { id: 'temp', name: 'Test' },
      previousData: null,
      mutationFn: async () => {
        throw new Error('API Error');
      },
      onSuccess,
      onRollback,
      errorMessage: 'Failed to create',
    });

    expect(mutationResult).toBeNull();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onRollback).toHaveBeenCalled();

    // Should show error toast
    expect(useToastStore.getState().toasts.length).toBe(1);
    expect(useToastStore.getState().toasts[0].type).toBe('error');
    expect(useToastStore.getState().toasts[0].message).toBe('Failed to create');
  });

  it('should show success toast when provided', async () => {
    await executeOptimisticMutation({
      type: 'test:create',
      optimisticData: { id: 'temp' },
      previousData: null,
      mutationFn: async () => ({ id: '1' }),
      onRollback: () => {},
      successMessage: 'Created successfully',
    });

    expect(useToastStore.getState().toasts.length).toBe(1);
    expect(useToastStore.getState().toasts[0].type).toBe('success');
    expect(useToastStore.getState().toasts[0].message).toBe('Created successfully');
  });

  it('should include retry action in error toast', async () => {
    const retryFn = vi.fn();

    await executeOptimisticMutation({
      type: 'test:create',
      optimisticData: { id: 'temp' },
      previousData: null,
      mutationFn: async () => {
        throw new Error('Failed');
      },
      onRollback: () => {},
      errorMessage: 'Operation failed',
      errorAction: {
        label: 'Retry',
        onClick: retryFn,
      },
    });

    const toast = useToastStore.getState().toasts[0];
    expect(toast.action?.label).toBe('Retry');
    expect(toast.action?.onClick).toBe(retryFn);
  });
});

describe('useSyncStatus selector', () => {
  beforeEach(() => {
    resetStores();
  });

  it('should return idle when no mutations', () => {
    // Access the selector directly from the store
    expect(useOptimisticStore.getState().syncStatus).toBe('idle');
  });

  it('should return syncing when mutations active', () => {
    useOptimisticStore.getState().startMutation('test-1', 'test', {}, null);
    expect(useOptimisticStore.getState().syncStatus).toBe('syncing');
  });
});
