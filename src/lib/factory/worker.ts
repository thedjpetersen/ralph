/**
 * Factory Mode — Worker
 *
 * Single worker lifecycle: reset worktree, build prompt, call provider,
 * check completion, run validation, commit results.
 */

import { resolve } from 'path';
import type { RalphConfig } from '../config.js';
import type { ProviderSlot, FactoryTask, WorkerResult, WorkerState, WorkerStatus } from './types.js';
import { resetWorktreeToHead, commitInWorktree } from './git-worktree.js';
import { RateLimiter } from './rate-limiter.js';
import { runProvider } from '../providers.js';
import { buildTaskPrompt, checkForCompletion } from '../claude.js';
import { formatTaskForPrompt, loadPrdFile } from '../prd.js';
import { runValidation, shouldMarkComplete } from '../validation/index.js';
import { detectPackageFromCategory } from '../validation/package-detector.js';
import type { Package } from '../validation/validation.types.js';
import { logger } from '../logger.js';

// ============================================================================
// Worker
// ============================================================================

export class Worker {
  public state: WorkerState;

  constructor(
    public readonly id: number,
    public readonly worktreePath: string,
    public readonly branchName: string,
  ) {
    this.state = {
      id,
      worktreePath,
      branchName,
      status: 'idle',
      completedTasks: [],
    };
  }

  get status(): WorkerStatus {
    return this.state.status;
  }

  get isIdle(): boolean {
    return this.state.status === 'idle';
  }

  /**
   * Execute a task in this worker's worktree.
   */
  async execute(
    task: FactoryTask,
    slot: ProviderSlot,
    config: RalphConfig,
    mainRepo: string,
  ): Promise<WorkerResult> {
    const startTime = Date.now();
    this.state.status = 'running';
    this.state.currentTask = task;
    this.state.currentSlot = slot;

    const absWorktree = resolve(mainRepo, this.worktreePath);

    try {
      // 1. Reset worktree to main HEAD
      const resetOk = await resetWorktreeToHead(mainRepo, this.worktreePath);
      if (!resetOk) {
        return this.buildResult(task, startTime, { success: false, error: 'Failed to reset worktree' });
      }

      // 2. Build prompt
      const prdFile = loadPrdFile(task.prdFilePath);
      if (!prdFile) {
        return this.buildResult(task, startTime, { success: false, error: `Failed to load PRD: ${task.prdFilePath}` });
      }

      const taskPrompt = formatTaskForPrompt(task.item, prdFile);
      const categoryPackage = detectPackageFromCategory(task.prdCategory);
      const targetPackages: Package[] = categoryPackage ? [categoryPackage] : [];

      const fullPrompt = buildTaskPrompt(taskPrompt, config, {
        taskId: task.item.id,
        previousValidationResult: task.item.validation_results,
        previousJudgeResult: task.item.judge_results,
        targetPackages,
      });

      // 3. Call provider with worktree as projectRoot
      logger.info(`Worker ${this.id}: running ${slot.provider}:${slot.model} for ${task.item.id}`);

      const tokenLimit = resolveTokenLimit(slot, config);
      const result = await runProvider(
        slot.provider,
        fullPrompt,
        {
          projectRoot: absWorktree,
          dryRun: config.dryRun,
          claudeModel: slot.provider === 'claude' ? slot.model as 'opus' | 'sonnet' | 'haiku' : undefined,
          geminiModel: slot.provider === 'gemini' ? slot.model as 'pro' | 'flash' : undefined,
          cursorModel: slot.provider === 'cursor' ? slot.model : undefined,
          cursorMode: slot.provider === 'cursor' ? 'agent' : undefined,
          tokenLimit,
        }
      );

      // 4. Check for rate limiting
      if (!result.success) {
        const combinedOutput = `${result.output || ''} ${result.error || ''}`;
        if (RateLimiter.isRateLimited(combinedOutput)) {
          return this.buildResult(task, startTime, { success: false, rateLimited: true });
        }
        return this.buildResult(task, startTime, { success: false, error: result.error || 'Provider failed' });
      }

      // 5. Check completion marker
      if (!checkForCompletion(result.output)) {
        return this.buildResult(task, startTime, { success: false, error: 'Provider did not signal completion' });
      }

      // 6. Run validation in worktree
      this.state.status = 'validating';
      let validationPassed = true;

      const skipValidation = config.skipValidation || task.item.validation?.skip;
      if (!skipValidation) {
        const taskValidation = task.item.validation || {};
        const mergedGates = {
          ...config.validationGates,
          ...taskValidation.gates,
        };

        const validationResult = await runValidation(absWorktree, {
          config: {
            gates: mergedGates,
            timeout: taskValidation.timeout ?? config.validationTimeout,
            failFast: taskValidation.failFast ?? config.validationFailFast,
            packages: taskValidation.packages,
          },
          category: task.prdCategory,
          taskNotes: task.item.notes,
        });

        validationPassed = shouldMarkComplete(validationResult);

        if (!validationPassed) {
          return this.buildResult(task, startTime, {
            success: false,
            validationPassed: false,
            error: `Validation failed: ${validationResult.failed_gates.join(', ')}`,
          });
        }
      }

      // 7. Commit in worktree
      this.state.status = 'merging';
      const taskName = task.item.name || task.item.description.substring(0, 60);
      const commitMsg = `Ralph: ${taskName} (${task.prdCategory}-${task.item.id})`;
      const commitHash = await commitInWorktree(absWorktree, commitMsg);

      this.state.completedTasks.push(task.item.id);

      return this.buildResult(task, startTime, {
        success: true,
        commitHash: commitHash || undefined,
        validationPassed: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Worker ${this.id} error: ${message}`);
      return this.buildResult(task, startTime, { success: false, error: message });
    } finally {
      this.state.status = 'idle';
      this.state.currentTask = undefined;
      this.state.currentSlot = undefined;
    }
  }

  private buildResult(
    task: FactoryTask,
    startTime: number,
    partial: Partial<WorkerResult>
  ): WorkerResult {
    return {
      taskId: task.item.id,
      workerId: this.id,
      success: false,
      duration: Math.round((Date.now() - startTime) / 1000),
      ...partial,
    };
  }
}

// ============================================================================
// Helpers
// ============================================================================

function resolveTokenLimit(
  slot: ProviderSlot,
  config: RalphConfig
): number {
  if (slot.provider === 'claude') {
    if (slot.model === 'opus') return config.opusTokenLimit;
    if (slot.model === 'haiku') return (config as RalphConfig & { haikuTokenLimit?: number }).haikuTokenLimit || 50000;
    return config.sonnetTokenLimit;
  }
  // Default for other providers
  return config.sonnetTokenLimit;
}
