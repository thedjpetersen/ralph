import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execa } from 'execa';
import { MergeCoordinator } from './merge-coordinator.js';
import { createWorktree, commitInWorktree } from './git-worktree.js';

describe('MergeCoordinator', () => {
  let testRepo: string;
  let coordinator: MergeCoordinator;

  beforeEach(async () => {
    testRepo = join(tmpdir(), `ralph-merge-test-${Date.now()}`);
    mkdirSync(testRepo, { recursive: true });

    // Init a git repo with an initial commit
    await execa('git', ['init'], { cwd: testRepo });
    await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: testRepo });
    await execa('git', ['config', 'user.name', 'Test'], { cwd: testRepo });
    writeFileSync(join(testRepo, 'README.md'), '# Test repo');
    await execa('git', ['add', '-A'], { cwd: testRepo });
    await execa('git', ['commit', '-m', 'Initial commit'], { cwd: testRepo });

    coordinator = new MergeCoordinator(testRepo);
  });

  afterEach(() => {
    if (existsSync(testRepo)) {
      rmSync(testRepo, { recursive: true, force: true });
    }
  });

  describe('cherryPick', () => {
    it('should cherry-pick a commit from a worktree branch', async () => {
      // Create a worktree and make a commit in it
      const wtPath = '.ralph/worktrees/worker-0';
      await createWorktree(testRepo, wtPath, 'ralph-factory/merge-test');

      const absWt = join(testRepo, wtPath);
      writeFileSync(join(absWt, 'feature.ts'), 'export const x = 1;');
      const commitHash = await commitInWorktree(absWt, 'Add feature');

      expect(commitHash).not.toBeNull();

      // Cherry-pick it onto main
      const result = await coordinator.cherryPick(commitHash!, 'TEST-001');

      expect(result.success).toBe(true);
      expect(result.commitHash).toBeDefined();
      expect(result.conflict).toBeUndefined();

      // Verify the file exists on main
      expect(existsSync(join(testRepo, 'feature.ts'))).toBe(true);
    });

    it('should detect and handle merge conflicts', async () => {
      // Create a worktree
      const wtPath = '.ralph/worktrees/worker-0';
      await createWorktree(testRepo, wtPath, 'ralph-factory/conflict-test');

      // Modify the same file on main and in the worktree
      writeFileSync(join(testRepo, 'README.md'), '# Modified on main');
      await execa('git', ['add', '-A'], { cwd: testRepo });
      await execa('git', ['commit', '-m', 'Main modification'], { cwd: testRepo });

      const absWt = join(testRepo, wtPath);
      writeFileSync(join(absWt, 'README.md'), '# Modified in worktree');
      const commitHash = await commitInWorktree(absWt, 'Worktree modification');

      expect(commitHash).not.toBeNull();

      // Cherry-pick should detect a conflict
      const result = await coordinator.cherryPick(commitHash!, 'TEST-002');

      expect(result.success).toBe(false);
      expect(result.conflict).toBe(true);
    });

    it('should serialize multiple cherry-picks', async () => {
      // Create two worktrees with non-conflicting changes
      const wt0 = '.ralph/worktrees/worker-0';
      const wt1 = '.ralph/worktrees/worker-1';
      await createWorktree(testRepo, wt0, 'ralph-factory/serial-0');
      await createWorktree(testRepo, wt1, 'ralph-factory/serial-1');

      const absWt0 = join(testRepo, wt0);
      writeFileSync(join(absWt0, 'file-a.ts'), 'export const a = 1;');
      const hash0 = await commitInWorktree(absWt0, 'Add file-a');

      const absWt1 = join(testRepo, wt1);
      writeFileSync(join(absWt1, 'file-b.ts'), 'export const b = 2;');
      const hash1 = await commitInWorktree(absWt1, 'Add file-b');

      // Cherry-pick both concurrently — the mutex should serialize them
      const [result0, result1] = await Promise.all([
        coordinator.cherryPick(hash0!, 'TEST-003'),
        coordinator.cherryPick(hash1!, 'TEST-004'),
      ]);

      expect(result0.success).toBe(true);
      expect(result1.success).toBe(true);

      // Both files should exist on main
      expect(existsSync(join(testRepo, 'file-a.ts'))).toBe(true);
      expect(existsSync(join(testRepo, 'file-b.ts'))).toBe(true);
    });
  });

  describe('getHistory', () => {
    it('should track merge history', async () => {
      const wtPath = '.ralph/worktrees/worker-0';
      await createWorktree(testRepo, wtPath, 'ralph-factory/history-test');

      const absWt = join(testRepo, wtPath);
      writeFileSync(join(absWt, 'tracked.ts'), 'export const tracked = true;');
      const commitHash = await commitInWorktree(absWt, 'Add tracked');

      await coordinator.cherryPick(commitHash!, 'HIST-001');

      const history = coordinator.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].taskId).toBe('HIST-001');
      expect(history[0].success).toBe(true);
      expect(history[0].mergedAt).toBeDefined();
    });

    it('should return a copy of history', async () => {
      const history1 = coordinator.getHistory();
      const history2 = coordinator.getHistory();
      expect(history1).not.toBe(history2);
    });
  });

  describe('getSuccessCount', () => {
    it('should return 0 with no merges', () => {
      expect(coordinator.getSuccessCount()).toBe(0);
    });

    it('should count successful merges', async () => {
      const wtPath = '.ralph/worktrees/worker-0';
      await createWorktree(testRepo, wtPath, 'ralph-factory/count-test');

      const absWt = join(testRepo, wtPath);
      writeFileSync(join(absWt, 'counted.ts'), 'export const counted = true;');
      const commitHash = await commitInWorktree(absWt, 'Add counted');

      await coordinator.cherryPick(commitHash!, 'COUNT-001');
      expect(coordinator.getSuccessCount()).toBe(1);
    });
  });
});
