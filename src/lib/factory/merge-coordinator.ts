/**
 * Factory Mode — Merge Coordinator
 *
 * Mutex-serialized cherry-pick of worker commits onto the main branch.
 * Handles conflicts by aborting and marking the task for re-execution.
 */

import { execa } from 'execa';
import type { MergeResult } from './types.js';
import { logger } from '../logger.js';

// ============================================================================
// Types
// ============================================================================

interface MergeHistoryEntry {
  taskId: string;
  commitHash: string;
  mergedAt: string;
  success: boolean;
  conflict: boolean;
}

// ============================================================================
// MergeCoordinator
// ============================================================================

export class MergeCoordinator {
  private mutex: Promise<void> = Promise.resolve();
  private history: MergeHistoryEntry[] = [];

  constructor(private readonly mainRepo: string) {}

  /**
   * Cherry-pick a commit from a worktree branch onto the main branch.
   * This is serialized so only one merge happens at a time.
   */
  async cherryPick(commitHash: string, taskId: string): Promise<MergeResult> {
    // Serialize through the mutex
    return new Promise<MergeResult>((resolve) => {
      this.mutex = this.mutex.then(async () => {
        const result = await this.doCherryPick(commitHash, taskId);
        resolve(result);
      }).catch(async (error) => {
        logger.error(`Merge mutex error: ${error}`);
        resolve({ success: false, error: String(error) });
      });
    });
  }

  /**
   * Get the merge history for session logging.
   */
  getHistory(): MergeHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Get count of successful merges.
   */
  getSuccessCount(): number {
    return this.history.filter(h => h.success).length;
  }

  // ============================================================================
  // Internal
  // ============================================================================

  private async doCherryPick(commitHash: string, taskId: string): Promise<MergeResult> {
    const entry: MergeHistoryEntry = {
      taskId,
      commitHash,
      mergedAt: new Date().toISOString(),
      success: false,
      conflict: false,
    };

    try {
      logger.debug(`Merge coordinator: cherry-picking ${commitHash.substring(0, 8)} for ${taskId}`);

      // Clean up any leftover state from previous failed cherry-picks.
      // We avoid `reset --hard HEAD` here because it would discard uncommitted
      // PRD status updates that the orchestrator writes during operation.
      await execa('git', ['cherry-pick', '--abort'], { cwd: this.mainRepo, reject: false });
      // Only reset the index, preserving working tree changes (like PRD files)
      await execa('git', ['reset', 'HEAD'], { cwd: this.mainRepo, reject: false });

      // Cherry-pick the commit
      let result = await execa('git', ['cherry-pick', commitHash], {
        cwd: this.mainRepo,
        reject: false,
      });

      // If cherry-pick fails because untracked files would be overwritten,
      // stage those files first and retry
      if (result.exitCode !== 0 && result.stderr?.includes('untracked working tree files would be overwritten')) {
        logger.debug(`Merge coordinator: untracked files conflict for ${taskId}, staging and retrying`);

        // Stage all untracked files so they become part of the index
        await execa('git', ['add', '-A'], { cwd: this.mainRepo, reject: false });
        await execa('git', ['stash'], { cwd: this.mainRepo, reject: false });
        await execa('git', ['cherry-pick', '--abort'], { cwd: this.mainRepo, reject: false });

        // Retry the cherry-pick on the now-clean tree
        result = await execa('git', ['cherry-pick', commitHash], {
          cwd: this.mainRepo,
          reject: false,
        });

        // Pop the stash to restore any other changes (may conflict, that's ok)
        await execa('git', ['stash', 'pop'], { cwd: this.mainRepo, reject: false });
      }

      if (result.exitCode !== 0) {
        // Check if it's a conflict
        const isConflict = result.stderr?.includes('CONFLICT') ||
          result.stderr?.includes('could not apply') ||
          result.stdout?.includes('CONFLICT');

        if (isConflict) {
          logger.warning(`Merge conflict for ${taskId}, aborting cherry-pick`);

          // Abort the cherry-pick
          await execa('git', ['cherry-pick', '--abort'], {
            cwd: this.mainRepo,
            reject: false,
          });

          entry.conflict = true;
          this.history.push(entry);

          return { success: false, conflict: true };
        }

        entry.conflict = false;
        this.history.push(entry);

        return {
          success: false,
          error: result.stderr || `cherry-pick failed with exit code ${result.exitCode}`,
        };
      }

      // Get the new commit hash on main
      const { stdout: newHash } = await execa('git', ['rev-parse', 'HEAD'], {
        cwd: this.mainRepo,
        reject: true,
      });

      entry.success = true;
      entry.commitHash = newHash.trim();
      this.history.push(entry);

      logger.debug(`Merge coordinator: successfully merged ${taskId} as ${newHash.trim().substring(0, 8)}`);

      return {
        success: true,
        commitHash: newHash.trim(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Cherry-pick failed for ${taskId}: ${message}`);

      // Attempt to abort any in-progress cherry-pick
      await execa('git', ['cherry-pick', '--abort'], {
        cwd: this.mainRepo,
        reject: false,
      });

      this.history.push(entry);

      return { success: false, error: message };
    }
  }
}
