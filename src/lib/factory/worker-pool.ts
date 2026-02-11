/**
 * Factory Mode — Worker Pool
 *
 * Manages N workers, each with their own git worktree.
 * Provides idle worker allocation, task assignment, and completion awaiting.
 */

import { EventEmitter } from 'events';
import { resolve } from 'path';
import type { RalphConfig } from '../config.js';
import type { ProviderSlot, FactoryTask, WorkerResult, WorkerState, FactoryConfig } from './types.js';
import { Worker } from './worker.js';
import { createWorktree, removeWorktree, worktreePath, branchName, cleanupAllWorktrees } from './git-worktree.js';
import { logger } from '../logger.js';

// ============================================================================
// Events
// ============================================================================

export interface WorkerPoolEvents {
  'worker:idle': (workerId: number) => void;
  'worker:complete': (result: WorkerResult) => void;
  'worker:error': (workerId: number, error: Error) => void;
}

// ============================================================================
// WorkerPool
// ============================================================================

export class WorkerPool extends EventEmitter {
  private workers: Worker[] = [];
  private activePromises: Map<number, Promise<WorkerResult>> = new Map();
  private initialized = false;

  constructor(
    private readonly maxWorkers: number,
    private readonly factoryConfig: FactoryConfig,
    private readonly mainRepo: string,
  ) {
    super();
  }

  /**
   * Initialize the pool: create worktrees for all workers.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    logger.info(`Initializing worker pool with ${this.maxWorkers} workers...`);

    for (let i = 0; i < this.maxWorkers; i++) {
      const wtPath = worktreePath(this.factoryConfig.worktreeDir, i);
      const branch = branchName(`worker-${i}`);

      const success = await createWorktree(this.mainRepo, wtPath, branch);
      if (!success) {
        logger.error(`Failed to create worktree for worker ${i}`);
        continue;
      }

      const worker = new Worker(i, wtPath, branch);
      this.workers.push(worker);
    }

    this.initialized = true;
    logger.info(`Worker pool ready: ${this.workers.length} workers`);
  }

  /**
   * Get an idle worker, or null if none available.
   */
  getIdleWorker(): Worker | null {
    return this.workers.find(w => w.isIdle) || null;
  }

  /**
   * Get all idle workers.
   */
  getIdleWorkers(): Worker[] {
    return this.workers.filter(w => w.isIdle);
  }

  /**
   * Get the count of active (non-idle) workers.
   */
  getActiveCount(): number {
    return this.workers.filter(w => !w.isIdle).length;
  }

  /**
   * Get the states of all workers.
   */
  getWorkerStates(): WorkerState[] {
    return this.workers.map(w => ({ ...w.state }));
  }

  /**
   * Assign a task to a specific worker and start execution.
   * Returns a promise that resolves when the worker completes.
   */
  assignTask(
    worker: Worker,
    task: FactoryTask,
    slot: ProviderSlot,
    config: RalphConfig,
  ): Promise<WorkerResult> {
    const promise = worker.execute(task, slot, config, this.mainRepo).then(result => {
      this.activePromises.delete(worker.id);

      if (result.success) {
        this.emit('worker:complete', result);
      }

      this.emit('worker:idle', worker.id);
      return result;
    }).catch(error => {
      this.activePromises.delete(worker.id);
      this.emit('worker:error', worker.id, error);
      this.emit('worker:idle', worker.id);

      return {
        taskId: task.item.id,
        workerId: worker.id,
        success: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      } as WorkerResult;
    });

    this.activePromises.set(worker.id, promise);
    return promise;
  }

  /**
   * Wait for any active worker to complete.
   * Returns the result of the first worker to finish.
   * Returns null if no active workers.
   */
  async awaitAnyCompletion(): Promise<WorkerResult | null> {
    if (this.activePromises.size === 0) return null;

    const result = await Promise.race(this.activePromises.values());
    return result;
  }

  /**
   * Wait for all active workers to complete (with timeout).
   */
  async drainAll(timeoutMs: number = 120_000): Promise<WorkerResult[]> {
    if (this.activePromises.size === 0) return [];

    logger.info(`Draining ${this.activePromises.size} active workers (${Math.round(timeoutMs / 1000)}s timeout)...`);

    const timeout = new Promise<'timeout'>(resolve =>
      setTimeout(() => resolve('timeout'), timeoutMs)
    );

    const allDone = Promise.all(this.activePromises.values());

    const raceResult = await Promise.race([allDone, timeout]);

    if (raceResult === 'timeout') {
      logger.warning('Worker drain timed out, some tasks may be incomplete');
      // Collect whatever has finished
      const results: WorkerResult[] = [];
      for (const [workerId, promise] of this.activePromises) {
        // Check if promise is settled by racing with an immediate resolve
        const result = await Promise.race([
          promise,
          Promise.resolve(null),
        ]);
        if (result) results.push(result);
      }
      return results;
    }

    return raceResult as WorkerResult[];
  }

  /**
   * Graceful shutdown: wait for active workers then cleanup worktrees.
   */
  async shutdown(cleanup: boolean = true): Promise<void> {
    logger.info('Shutting down worker pool...');

    // Wait for active workers to finish
    await this.drainAll();

    // Cleanup worktrees
    if (cleanup) {
      await cleanupAllWorktrees(this.mainRepo, this.factoryConfig.worktreeDir);
    }

    this.workers = [];
    this.activePromises.clear();
    this.initialized = false;

    logger.info('Worker pool shut down');
  }

  /**
   * Check if any workers are still active.
   */
  hasActiveWorkers(): boolean {
    return this.activePromises.size > 0;
  }

  /**
   * Get the total number of workers in the pool.
   */
  get size(): number {
    return this.workers.length;
  }
}
