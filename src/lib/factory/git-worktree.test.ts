import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execa } from 'execa';
import {
  createWorktree,
  removeWorktree,
  resetWorktreeToHead,
  getWorktreeHead,
  commitInWorktree,
  cleanupAllWorktrees,
  worktreePath,
  branchName,
} from './git-worktree.js';

describe('git-worktree', () => {
  let testRepo: string;

  beforeEach(async () => {
    testRepo = join(tmpdir(), `ralph-worktree-test-${Date.now()}`);
    mkdirSync(testRepo, { recursive: true });

    // Init a git repo with an initial commit
    await execa('git', ['init'], { cwd: testRepo });
    await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: testRepo });
    await execa('git', ['config', 'user.name', 'Test'], { cwd: testRepo });
    writeFileSync(join(testRepo, 'README.md'), '# Test repo');
    await execa('git', ['add', '-A'], { cwd: testRepo });
    await execa('git', ['commit', '-m', 'Initial commit'], { cwd: testRepo });
  });

  afterEach(() => {
    if (existsSync(testRepo)) {
      rmSync(testRepo, { recursive: true, force: true });
    }
  });

  describe('worktreePath', () => {
    it('should generate correct paths', () => {
      expect(worktreePath('.ralph/worktrees', 0)).toBe('.ralph/worktrees/worker-0');
      expect(worktreePath('.ralph/worktrees', 3)).toBe('.ralph/worktrees/worker-3');
    });
  });

  describe('branchName', () => {
    it('should generate correct branch names', () => {
      expect(branchName('AUTH-001')).toBe('ralph-factory/AUTH-001');
      expect(branchName('worker-0')).toBe('ralph-factory/worker-0');
    });
  });

  describe('createWorktree', () => {
    it('should create a worktree with a branch', async () => {
      const wtPath = '.ralph/worktrees/worker-0';
      const result = await createWorktree(testRepo, wtPath, 'ralph-factory/test');

      expect(result).toBe(true);

      const absPath = join(testRepo, wtPath);
      expect(existsSync(absPath)).toBe(true);
      expect(existsSync(join(absPath, 'README.md'))).toBe(true);
    });

    it('should create worktree in nested directory', async () => {
      const wtPath = '.ralph/worktrees/deep/worker-0';
      const result = await createWorktree(testRepo, wtPath, 'ralph-factory/deep-test');

      expect(result).toBe(true);
      expect(existsSync(join(testRepo, wtPath))).toBe(true);
    });
  });

  describe('removeWorktree', () => {
    it('should remove an existing worktree', async () => {
      const wtPath = '.ralph/worktrees/worker-0';
      await createWorktree(testRepo, wtPath, 'ralph-factory/remove-test');

      const result = await removeWorktree(testRepo, wtPath);
      expect(result).toBe(true);
      expect(existsSync(join(testRepo, wtPath))).toBe(false);
    });

    it('should handle removing non-existent worktree', async () => {
      const result = await removeWorktree(testRepo, '.ralph/worktrees/nonexistent');
      expect(result).toBe(true); // Should not error
    });
  });

  describe('resetWorktreeToHead', () => {
    it('should reset worktree to main HEAD', async () => {
      const wtPath = '.ralph/worktrees/worker-0';
      await createWorktree(testRepo, wtPath, 'ralph-factory/reset-test');

      const absPath = join(testRepo, wtPath);

      // Make changes in the worktree
      writeFileSync(join(absPath, 'new-file.txt'), 'dirty');

      // Reset
      const result = await resetWorktreeToHead(testRepo, wtPath);
      expect(result).toBe(true);
      expect(existsSync(join(absPath, 'new-file.txt'))).toBe(false);
    });

    it('should match main HEAD after reset', async () => {
      const wtPath = '.ralph/worktrees/worker-0';
      await createWorktree(testRepo, wtPath, 'ralph-factory/head-test');

      // Make a new commit on main
      writeFileSync(join(testRepo, 'new-main.txt'), 'main content');
      await execa('git', ['add', '-A'], { cwd: testRepo });
      await execa('git', ['commit', '-m', 'Main commit'], { cwd: testRepo });

      const { stdout: mainHead } = await execa('git', ['rev-parse', 'HEAD'], { cwd: testRepo });

      // Reset worktree
      await resetWorktreeToHead(testRepo, wtPath);

      const absPath = join(testRepo, wtPath);
      const { stdout: wtHead } = await execa('git', ['rev-parse', 'HEAD'], { cwd: absPath });

      expect(wtHead.trim()).toBe(mainHead.trim());
    });
  });

  describe('getWorktreeHead', () => {
    it('should return the HEAD commit hash', async () => {
      const wtPath = '.ralph/worktrees/worker-0';
      await createWorktree(testRepo, wtPath, 'ralph-factory/head-test-2');

      const absPath = join(testRepo, wtPath);
      const head = await getWorktreeHead(absPath);

      expect(head).toBeDefined();
      expect(head!.length).toBeGreaterThanOrEqual(7);
    });

    it('should return null for invalid path', async () => {
      const head = await getWorktreeHead('/nonexistent');
      expect(head).toBeNull();
    });
  });

  describe('commitInWorktree', () => {
    it('should commit changes and return hash', async () => {
      const wtPath = '.ralph/worktrees/worker-0';
      await createWorktree(testRepo, wtPath, 'ralph-factory/commit-test');

      const absPath = join(testRepo, wtPath);
      writeFileSync(join(absPath, 'feature.ts'), 'export const x = 1;');

      const hash = await commitInWorktree(absPath, 'Add feature');
      expect(hash).not.toBeNull();
      expect(hash!.length).toBeGreaterThanOrEqual(7);
    });

    it('should return null when no changes', async () => {
      const wtPath = '.ralph/worktrees/worker-0';
      await createWorktree(testRepo, wtPath, 'ralph-factory/nochange-test');

      const absPath = join(testRepo, wtPath);
      const hash = await commitInWorktree(absPath, 'Empty commit');
      expect(hash).toBeNull();
    });
  });

  describe('cleanupAllWorktrees', () => {
    it('should remove all ralph factory worktrees', async () => {
      const baseDir = '.ralph/worktrees';
      await createWorktree(testRepo, `${baseDir}/worker-0`, 'ralph-factory/cleanup-0');
      await createWorktree(testRepo, `${baseDir}/worker-1`, 'ralph-factory/cleanup-1');

      expect(existsSync(join(testRepo, baseDir, 'worker-0'))).toBe(true);
      expect(existsSync(join(testRepo, baseDir, 'worker-1'))).toBe(true);

      await cleanupAllWorktrees(testRepo, baseDir);

      expect(existsSync(join(testRepo, baseDir))).toBe(false);
    });
  });
});
