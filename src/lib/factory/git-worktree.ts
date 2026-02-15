/**
 * Factory Mode — Git Worktree Manager
 *
 * Provides workspace isolation for parallel workers using git worktrees.
 * Each worker gets its own worktree so providers can work on the codebase
 * simultaneously without interfering with each other.
 */

import { execa } from 'execa';
import { existsSync, symlinkSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { logger } from '../logger.js';

// ============================================================================
// Worktree Operations
// ============================================================================

/**
 * Create a new git worktree with a dedicated branch.
 * Branch: ralph-factory/{taskId}
 * Path: .ralph/worktrees/worker-{N}/
 */
export async function createWorktree(
  mainRepo: string,
  worktreePath: string,
  branchName: string
): Promise<boolean> {
  try {
    const absPath = resolve(mainRepo, worktreePath);

    // Ensure parent directory exists
    const parentDir = join(absPath, '..');
    mkdirSync(parentDir, { recursive: true });

    // Remove stale worktree if it exists
    if (existsSync(absPath)) {
      logger.debug(`Removing stale worktree at ${worktreePath}`);
      await removeWorktree(mainRepo, worktreePath);
    }

    // Prune stale worktree refs FIRST (so branch -D can succeed)
    await execa('git', ['worktree', 'prune'], {
      cwd: mainRepo,
      reject: false,
    });

    // Delete existing branch if it exists (leftover from previous run)
    await execa('git', ['branch', '-D', branchName], {
      cwd: mainRepo,
      reject: false,
    });

    // Create worktree with new branch
    await execa('git', ['worktree', 'add', '-b', branchName, absPath], {
      cwd: mainRepo,
      reject: true,
    });

    // Symlink node_modules from main repo for fast setup
    await symlinkNodeModules(mainRepo, absPath);

    logger.debug(`Created worktree: ${worktreePath} (branch: ${branchName})`);
    return true;
  } catch (error) {
    logger.error(`Failed to create worktree ${worktreePath}: ${error}`);
    return false;
  }
}

/**
 * Remove a git worktree and its branch.
 */
export async function removeWorktree(
  mainRepo: string,
  worktreePath: string
): Promise<boolean> {
  try {
    const absPath = resolve(mainRepo, worktreePath);

    // Remove the worktree
    await execa('git', ['worktree', 'remove', '--force', absPath], {
      cwd: mainRepo,
      reject: false,
    });

    // Clean up if directory still exists
    if (existsSync(absPath)) {
      rmSync(absPath, { recursive: true, force: true });
    }

    logger.debug(`Removed worktree: ${worktreePath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to remove worktree ${worktreePath}: ${error}`);
    return false;
  }
}

/**
 * Reset a worktree to the latest main HEAD.
 * Used before assigning a new task to a worker.
 */
export async function resetWorktreeToHead(
  mainRepo: string,
  worktreePath: string
): Promise<boolean> {
  try {
    const absPath = resolve(mainRepo, worktreePath);

    // Get the current main branch HEAD
    const { stdout: mainHead } = await execa('git', ['rev-parse', 'HEAD'], {
      cwd: mainRepo,
      reject: true,
    });

    // Reset the worktree to that commit
    await execa('git', ['reset', '--hard', mainHead.trim()], {
      cwd: absPath,
      reject: true,
    });

    // Clean untracked files
    await execa('git', ['clean', '-fd'], {
      cwd: absPath,
      reject: false,
    });

    logger.debug(`Reset worktree ${worktreePath} to ${mainHead.trim().substring(0, 8)}`);
    return true;
  } catch (error) {
    logger.error(`Failed to reset worktree ${worktreePath}: ${error}`);
    return false;
  }
}

/**
 * Get the latest commit hash from a worktree.
 */
export async function getWorktreeHead(worktreePath: string): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['rev-parse', 'HEAD'], {
      cwd: worktreePath,
      reject: true,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Commit all changes in a worktree.
 */
export async function commitInWorktree(
  worktreePath: string,
  message: string
): Promise<string | null> {
  try {
    // Stage all changes (node_modules should be in .gitignore)
    await execa('git', ['add', '-A'], {
      cwd: worktreePath,
      reject: true,
    });

    // Check if there are changes to commit
    const { stdout: status } = await execa('git', ['status', '--porcelain'], {
      cwd: worktreePath,
      reject: true,
    });

    if (!status.trim()) {
      logger.debug('No changes to commit in worktree');
      return null;
    }

    // Commit
    const fullMessage = `${message}\n\nCo-Authored-By: Ralph Factory <noreply@anthropic.com>`;
    await execa('git', ['commit', '-m', fullMessage], {
      cwd: worktreePath,
      reject: true,
    });

    // Get the commit hash
    const { stdout: hash } = await execa('git', ['rev-parse', 'HEAD'], {
      cwd: worktreePath,
      reject: true,
    });

    logger.debug(`Committed in worktree: ${hash.trim().substring(0, 8)}`);
    return hash.trim();
  } catch (error) {
    logger.error(`Failed to commit in worktree: ${error}`);
    return null;
  }
}

/**
 * Cleanup all ralph factory worktrees and prune.
 */
export async function cleanupAllWorktrees(mainRepo: string, worktreeBaseDir: string): Promise<void> {
  try {
    const absBase = resolve(mainRepo, worktreeBaseDir);

    // List all worktrees
    const { stdout } = await execa('git', ['worktree', 'list', '--porcelain'], {
      cwd: mainRepo,
      reject: false,
    });

    // Remove ralph factory worktrees
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.startsWith('worktree ') && line.includes(absBase)) {
        const path = line.replace('worktree ', '').trim();
        await execa('git', ['worktree', 'remove', '--force', path], {
          cwd: mainRepo,
          reject: false,
        });
      }
    }

    // Remove the directory if it still exists
    if (existsSync(absBase)) {
      rmSync(absBase, { recursive: true, force: true });
    }

    // Prune stale worktree references
    await execa('git', ['worktree', 'prune'], {
      cwd: mainRepo,
      reject: false,
    });

    // Clean up ralph-factory branches
    const { stdout: branches } = await execa(
      'git', ['branch', '--list', 'ralph-factory/*'],
      { cwd: mainRepo, reject: false }
    );

    for (const branch of branches.split('\n').filter(Boolean)) {
      const branchName = branch.trim();
      await execa('git', ['branch', '-D', branchName], {
        cwd: mainRepo,
        reject: false,
      });
    }

    logger.info('Cleaned up all factory worktrees');
  } catch (error) {
    logger.error(`Failed to cleanup worktrees: ${error}`);
  }
}

/**
 * Generate a worktree path for a worker.
 */
export function worktreePath(worktreeDir: string, workerId: number): string {
  return join(worktreeDir, `worker-${workerId}`);
}

/**
 * Generate a branch name for a task.
 */
export function branchName(taskId: string): string {
  return `ralph-factory/${taskId}`;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Symlink node_modules from the main repo into the worktree.
 * This avoids running npm install in every worktree.
 */
async function symlinkNodeModules(mainRepo: string, worktreePath: string): Promise<void> {
  const mainNodeModules = join(mainRepo, 'node_modules');

  if (!existsSync(mainNodeModules)) return;

  const worktreeNodeModules = join(worktreePath, 'node_modules');

  // Don't overwrite if it already exists
  if (existsSync(worktreeNodeModules)) return;

  try {
    symlinkSync(mainNodeModules, worktreeNodeModules, 'dir');
    logger.debug(`Symlinked node_modules into worktree`);
  } catch (error) {
    // Not fatal - the worktree can still work, just slower
    logger.debug(`Failed to symlink node_modules: ${error}`);
  }
}
