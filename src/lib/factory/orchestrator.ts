/**
 * Factory Mode — Orchestrator
 *
 * The factory brain: manages the task DAG, worker pool, planner loop,
 * rate limiter, and merge coordinator. Runs the main factory loop until
 * the specification is satisfied or all tasks are complete.
 */

import type { RalphConfig } from '../config.js';
import type {
  FactoryConfig,
  FactoryTask,
  WorkerResult,
  ProviderSlot,
  ComplexityTier,
} from './types.js';
import type { PrdFile, PrdItem } from '../prd.js';
import {
  loadPrdFile,
  loadAllPrdFiles,
  getTaskSummary,
  getReadyTasks,
  markTaskInProgress,
  markTaskComplete,
  resetTaskStatus,
} from '../prd.js';
import { RateLimiter } from './rate-limiter.js';
import { buildFactoryTask, findAvailableSlot, escalateTier } from './complexity-router.js';
import { WorkerPool } from './worker-pool.js';
import { MergeCoordinator } from './merge-coordinator.js';
import { Planner, addTasksToPrd } from './planner.js';
import { SessionManager, createSessionManager } from '../session.js';
import { Notifier } from '../notify.js';
import * as git from '../git.js';
import { logger } from '../logger.js';

// ============================================================================
// FactoryOrchestrator
// ============================================================================

export class FactoryOrchestrator {
  private pool!: WorkerPool;
  private rateLimiter!: RateLimiter;
  private mergeCoordinator!: MergeCoordinator;
  private planner!: Planner;
  private sessionManager!: SessionManager;
  private notifier!: Notifier;

  private prdFiles: PrdFile[] = [];
  private taskQueue: FactoryTask[] = [];
  private inProgressTasks: Map<string, FactoryTask> = new Map();
  private completedTaskIds: Set<string> = new Set();
  private failedTaskRetries: Map<string, number> = new Map();

  private shuttingDown = false;
  private startTime = 0;

  constructor(
    private readonly config: RalphConfig,
    private readonly factoryConfig: FactoryConfig,
  ) {}

  /**
   * Run the factory.
   */
  async run(): Promise<void> {
    this.startTime = Date.now();
    const mainRepo = this.config.projectRoot;

    // Initialize services
    this.notifier = new Notifier(this.config.notifyScript, this.config.notifyEnabled);
    this.sessionManager = createSessionManager(this.config);
    this.rateLimiter = new RateLimiter(this.factoryConfig.pool.slots);
    this.mergeCoordinator = new MergeCoordinator(mainRepo);
    this.planner = new Planner(this.config, this.factoryConfig, mainRepo);
    this.pool = new WorkerPool(
      this.factoryConfig.pool.maxTotalWorkers,
      this.factoryConfig,
      mainRepo,
    );

    // Setup signal handlers
    this.setupSignalHandlers();

    // 1. Load PRD files
    this.loadPrds();
    if (this.prdFiles.length === 0) {
      logger.error('No PRD files found');
      return;
    }

    const summary = getTaskSummary(this.prdFiles);
    logger.info(`Factory: ${summary.total} tasks (${summary.pending} pending, ${summary.completed} completed)`);

    // 2. Create session
    const gitBranch = await git.getCurrentBranch(mainRepo);
    const gitStatus = await git.getStatus(mainRepo);
    const sessionId = await this.sessionManager.createSession(
      this.config, Date.now(), gitBranch, gitStatus.branch
    );
    logger.info(`Factory session: ${sessionId}`);

    // 3. Initialize worker pool
    await this.pool.init();

    if (this.pool.size === 0) {
      logger.error('Factory: no workers could be initialized, aborting');
      return;
    }

    // 4. Start planner loop
    this.planner.start(
      (newTasks) => this.handleNewTasks(newTasks),
      () => this.handleSpecSatisfied(),
    );

    // 5. Build initial task queue
    this.refreshTaskQueue();
    logger.info(`Factory: ${this.taskQueue.length} tasks in queue after refresh`);
    for (const t of this.taskQueue) {
      logger.info(`  [${t.item.id}] tier=${t.tier} score=${t.complexityScore} "${t.item.name || t.item.description.substring(0, 40)}"`);
    }

    // 6. Main loop
    await this.mainLoop();

    // 7. Shutdown
    await this.shutdown();

    // 8. Final summary
    this.printSummary();

    // 9. Complete session
    this.sessionManager.completeSession();
  }

  // ============================================================================
  // Main Loop
  // ============================================================================

  private async mainLoop(): Promise<void> {
    while (!this.shuttingDown) {
      // Check convergence
      if (this.isConverged()) {
        logger.success('Factory: converged — all tasks complete or spec satisfied');
        break;
      }

      // Try to assign tasks to idle workers
      const assigned = this.tryAssignTasks();

      // If we assigned tasks or have active workers, wait for completions
      if (this.pool.hasActiveWorkers()) {
        const result = await this.pool.awaitAnyCompletion();
        if (result) {
          await this.handleResult(result);
        }
      } else if (assigned === 0) {
        // No active workers and couldn't assign anything
        if (this.taskQueue.length === 0 && this.inProgressTasks.size === 0) {
          // If waiting for planner, don't exit yet
          if (this.factoryConfig.specContent && !this.planner.hasEvaluated()) {
            logger.debug('Factory: waiting for planner to generate initial tasks...');
            await sleep(3000);
            this.refreshTaskQueue();
            continue;
          }
          logger.info('Factory: no more tasks in queue');
          break;
        }

        // Check if we're waiting on rate limits
        const availableSlots = this.rateLimiter.getAvailableSlots();
        if (availableSlots.length === 0 && this.taskQueue.length > 0) {
          // All slots in backoff, wait a bit
          logger.debug('Factory: all slots in backoff, waiting...');
          await sleep(5000);
        } else if (this.taskQueue.length > 0 && this.inProgressTasks.size === 0) {
          // Tasks exist but none could be assigned and nothing is running
          // This means all remaining tasks are stuck (no matching slots)
          logger.warning(`Factory: ${this.taskQueue.length} tasks stuck — no available slots match their tiers`);
          logger.info('Factory: aborting — remaining tasks cannot be assigned with current slot config');
          break;
        } else {
          // Wait for in-progress tasks to complete or planner to add new tasks
          await sleep(2000);
        }
      }
    }
  }

  // ============================================================================
  // Task Assignment
  // ============================================================================

  private tryAssignTasks(): number {
    let assigned = 0;

    logger.debug(`tryAssignTasks: queue=${this.taskQueue.length}, idle=${this.pool.getIdleWorker() ? 'yes' : 'no'}, active=${this.pool.getActiveCount()}`);

    let i = 0;
    while (i < this.taskQueue.length) {
      const idleWorker = this.pool.getIdleWorker();
      if (!idleWorker) { logger.debug('tryAssignTasks: no idle worker'); break; }

      // Check total active worker limit
      if (this.pool.getActiveCount() >= this.factoryConfig.pool.maxTotalWorkers) { logger.debug('tryAssignTasks: at max workers'); break; }

      const task = this.taskQueue[i];

      // Find an available slot for this task's tier
      const slot = findAvailableSlot(task.tier, this.rateLimiter, this.factoryConfig);
      if (!slot) {
        logger.debug(`tryAssignTasks: no slot for tier=${task.tier} task=${task.item.id}, trying next`);
        i++;
        continue;
      }

      // Acquire the rate limiter permit
      if (!this.rateLimiter.tryAcquire(slot.provider, slot.model)) {
        i++;
        continue;
      }

      // Remove from queue and track
      this.taskQueue.splice(i, 1);
      task.assignedSlot = slot;
      task.assignedWorkerId = idleWorker.id;
      this.inProgressTasks.set(task.item.id, task);

      // Mark in PRD
      const prdFile = this.prdFiles.find(p => p.filepath === task.prdFilePath);
      if (prdFile) {
        markTaskInProgress(prdFile, task.item.id);
      }

      // Start execution
      logger.info(
        `Assigning ${task.item.id} → worker ${idleWorker.id} ` +
        `(${slot.provider}:${slot.model}, tier=${task.tier})`
      );

      this.pool.assignTask(idleWorker, task, slot, this.config);
      assigned++;
    }

    return assigned;
  }

  // ============================================================================
  // Result Handling
  // ============================================================================

  private async handleResult(result: WorkerResult): Promise<void> {
    const task = this.inProgressTasks.get(result.taskId);
    if (!task) {
      logger.warning(`Got result for unknown task: ${result.taskId}`);
      return;
    }

    this.inProgressTasks.delete(result.taskId);
    const slot = task.assignedSlot;

    // Release rate limiter permit
    if (slot) {
      this.rateLimiter.release(slot.provider, slot.model);
    }

    if (result.rateLimited) {
      // Rate limited: re-queue with backoff
      if (slot) {
        this.rateLimiter.reportRateLimit(slot.provider, slot.model);
      }
      logger.warning(`Task ${result.taskId} rate limited, re-queuing`);
      this.requeueTask(task);
      return;
    }

    if (result.success && result.commitHash) {
      // Success: cherry-pick to main
      if (slot) {
        this.rateLimiter.reportSuccess(slot.provider, slot.model);
      }

      const mergeResult = await this.mergeCoordinator.cherryPick(
        result.commitHash, result.taskId
      );

      if (mergeResult.success) {
        // Mark complete in PRD
        const prdFile = this.prdFiles.find(p => p.filepath === task.prdFilePath);
        if (prdFile) {
          markTaskComplete(prdFile, result.taskId);
        }

        this.completedTaskIds.add(result.taskId);

        // Track in session
        this.sessionManager.completeTask({
          taskId: result.taskId,
          taskName: task.item.name || task.item.description.substring(0, 60),
          prdFile: task.prdFilePath,
          duration: result.duration,
          commitHash: mergeResult.commitHash,
          completedAt: new Date().toISOString(),
        });

        // Check if planner should generate more tasks
        const pendingCount = this.taskQueue.length + this.inProgressTasks.size;
        this.planner.maybeRefill(pendingCount);

        logger.success(
          `Task ${result.taskId} completed and merged ` +
          `(${result.duration}s, worker ${result.workerId})`
        );

        // Refresh queue (new tasks may be unblocked)
        this.refreshTaskQueue();
      } else if (mergeResult.conflict) {
        // Merge conflict: re-queue on fresh worktree
        logger.warning(`Merge conflict for ${result.taskId}, re-queuing`);
        this.requeueTask(task);
      } else {
        logger.error(`Merge failed for ${result.taskId}: ${mergeResult.error}`);
        this.requeueTask(task);
      }
    } else {
      // Validation or execution failure
      if (slot) {
        this.rateLimiter.reportSuccess(slot.provider, slot.model);
      }

      logger.warning(`Task ${result.taskId} failed: ${result.error || 'unknown'}`);
      this.requeueTask(task);
    }
  }

  // ============================================================================
  // Re-queue with retry escalation
  // ============================================================================

  private requeueTask(task: FactoryTask): void {
    const retryCount = (this.failedTaskRetries.get(task.item.id) || 0) + 1;
    this.failedTaskRetries.set(task.item.id, retryCount);

    if (retryCount > this.factoryConfig.pool.retryLimit) {
      logger.error(`Task ${task.item.id} exceeded retry limit (${retryCount}), skipping`);
      return;
    }

    // Build a new factory task with escalated tier
    const newTask = buildFactoryTask(
      task.item,
      task.prdFilePath,
      task.prdCategory,
      this.factoryConfig,
      retryCount,
    );

    logger.info(
      `Re-queuing ${task.item.id} (retry ${retryCount}, tier: ${task.tier} → ${newTask.tier})`
    );

    this.taskQueue.push(newTask);
  }

  // ============================================================================
  // Task Queue Management
  // ============================================================================

  private refreshTaskQueue(): void {
    const readyTasks = getReadyTasks(this.prdFiles, {
      filterCategory: this.config.filterCategory,
      filterPriority: this.config.filterPriority,
    });

    for (const { prdFile, item } of readyTasks) {
      // Skip if already in queue, in progress, or completed
      if (this.completedTaskIds.has(item.id)) continue;
      if (this.inProgressTasks.has(item.id)) continue;
      if (this.taskQueue.some(t => t.item.id === item.id)) continue;

      const retryCount = this.failedTaskRetries.get(item.id) || 0;
      if (retryCount > this.factoryConfig.pool.retryLimit) continue;

      const factoryTask = buildFactoryTask(
        item,
        prdFile.filepath,
        prdFile.category,
        this.factoryConfig,
        retryCount,
      );

      this.taskQueue.push(factoryTask);
    }

    // Sort queue by priority (high first), then by complexity (high first for better throughput)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    this.taskQueue.sort((a, b) => {
      const pa = priorityOrder[a.item.priority] ?? 1;
      const pb = priorityOrder[b.item.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      return b.complexityScore - a.complexityScore;
    });
  }

  // ============================================================================
  // Planner Callbacks
  // ============================================================================

  private handleNewTasks(newTasks: PrdItem[]): void {
    // Add to the first PRD file
    if (this.prdFiles.length > 0) {
      const prdFile = this.prdFiles[0];
      addTasksToPrd(prdFile.filepath, newTasks);

      // Reload PRDs and refresh queue
      this.loadPrds();
      this.refreshTaskQueue();
    }
  }

  private handleSpecSatisfied(): void {
    logger.success('Factory: planner reports specification satisfied');
    // Don't shut down immediately — wait for in-progress tasks to finish
    // The convergence check in the main loop will handle this
  }

  // ============================================================================
  // Convergence Check
  // ============================================================================

  private isConverged(): boolean {
    // Spec satisfied and no in-progress work
    if (this.planner.isSpecSatisfied() && this.inProgressTasks.size === 0) {
      return true;
    }

    // No more tasks and nothing in progress
    if (this.taskQueue.length === 0 && this.inProgressTasks.size === 0) {
      // If spec content is provided but planner hasn't evaluated yet,
      // wait for the planner to have a chance to generate new tasks
      if (this.factoryConfig.specContent && !this.planner.hasEvaluated()) {
        logger.debug('Factory: waiting for planner initial evaluation before converging...');
        return false;
      }
      return true;
    }

    return false;
  }

  // ============================================================================
  // PRD Loading
  // ============================================================================

  private loadPrds(): void {
    if (this.config.prdFile) {
      const prd = loadPrdFile(this.config.prdFile);
      this.prdFiles = prd ? [prd] : [];
    } else {
      this.prdFiles = loadAllPrdFiles(this.config.prdDir);
    }
  }

  // ============================================================================
  // Signal Handling
  // ============================================================================

  private setupSignalHandlers(): void {
    const handleShutdown = (signal: string) => {
      logger.warning(`\nFactory received ${signal}, shutting down gracefully...`);
      this.shuttingDown = true;
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  }

  // ============================================================================
  // Shutdown
  // ============================================================================

  private async shutdown(): Promise<void> {
    logger.info('Factory shutting down...');

    // Stop planner
    this.planner.stop();

    // Drain active workers
    await this.pool.shutdown(this.factoryConfig.cleanupOnShutdown);

    // Reset in-progress tasks to pending
    for (const [taskId, task] of this.inProgressTasks) {
      const prdFile = this.prdFiles.find(p => p.filepath === task.prdFilePath);
      if (prdFile) {
        resetTaskStatus(prdFile, taskId);
      }
    }

    logger.info('Factory shutdown complete');
  }

  // ============================================================================
  // Summary
  // ============================================================================

  private printSummary(): void {
    const totalDuration = Math.round((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(totalDuration / 60);
    const seconds = totalDuration % 60;

    const mergeHistory = this.mergeCoordinator.getHistory();
    const successfulMerges = mergeHistory.filter(h => h.success).length;
    const conflicts = mergeHistory.filter(h => h.conflict).length;

    logger.divider();
    logger.header('Factory Summary');
    logger.info(`Duration: ${minutes}m ${seconds}s`);
    logger.info(`Tasks completed: ${this.completedTaskIds.size}`);
    logger.info(`Successful merges: ${successfulMerges}`);
    logger.info(`Merge conflicts: ${conflicts}`);
    logger.info(`Workers used: ${this.pool.size}`);

    const status = this.rateLimiter.getStatus();
    const rateLimitedSlots = Object.entries(status)
      .filter(([_, s]) => s.backoffSeconds > 0)
      .map(([key]) => key);
    if (rateLimitedSlots.length > 0) {
      logger.info(`Rate limited slots: ${rateLimitedSlots.join(', ')}`);
    }

    logger.divider();
  }
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
