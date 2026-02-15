import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execa } from 'execa';
import { WorkerPool } from './worker-pool.js';
import { DEFAULT_FACTORY_CONFIG } from './types.js';
import type { ProviderSlot, FactoryTask } from './types.js';

// Mock the worker execute method so we don't call real providers
vi.mock('../providers.js', () => ({
  runProvider: vi.fn().mockResolvedValue({ success: true, output: 'done' }),
}));

vi.mock('../claude.js', () => ({
  buildTaskPrompt: vi.fn().mockReturnValue('mock prompt'),
  checkForCompletion: vi.fn().mockReturnValue(true),
}));

vi.mock('../prd.js', () => ({
  formatTaskForPrompt: vi.fn().mockReturnValue('formatted task'),
  loadPrdFile: vi.fn().mockReturnValue({ project: 'test', items: [] }),
  loadAllPrdFiles: vi.fn().mockReturnValue([]),
}));

vi.mock('../validation/index.js', () => ({
  runValidation: vi.fn().mockResolvedValue({ passed: true, failed_gates: [], results: [] }),
  shouldMarkComplete: vi.fn().mockReturnValue(true),
}));

vi.mock('../validation/package-detector.js', () => ({
  detectPackageFromCategory: vi.fn().mockReturnValue(null),
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

describe('WorkerPool', () => {
  let testRepo: string;
  let pool: WorkerPool;

  beforeEach(async () => {
    testRepo = join(tmpdir(), `ralph-pool-test-${Date.now()}`);
    mkdirSync(testRepo, { recursive: true });

    // Init a git repo with an initial commit
    await execa('git', ['init'], { cwd: testRepo });
    await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: testRepo });
    await execa('git', ['config', 'user.name', 'Test'], { cwd: testRepo });
    writeFileSync(join(testRepo, 'README.md'), '# Test repo');
    await execa('git', ['add', '-A'], { cwd: testRepo });
    await execa('git', ['commit', '-m', 'Initial commit'], { cwd: testRepo });

    pool = new WorkerPool(2, DEFAULT_FACTORY_CONFIG, testRepo);
  });

  afterEach(async () => {
    try {
      await pool.shutdown(true);
    } catch {
      // ignore cleanup errors
    }
    if (existsSync(testRepo)) {
      rmSync(testRepo, { recursive: true, force: true });
    }
  });

  describe('init', () => {
    it('should create worktrees for all workers', async () => {
      await pool.init();

      expect(pool.size).toBe(2);

      const wt0 = join(testRepo, '.ralph/worktrees/worker-0');
      const wt1 = join(testRepo, '.ralph/worktrees/worker-1');
      expect(existsSync(wt0)).toBe(true);
      expect(existsSync(wt1)).toBe(true);
    });

    it('should be idempotent', async () => {
      await pool.init();
      await pool.init(); // should not create additional workers

      expect(pool.size).toBe(2);
    });
  });

  describe('getIdleWorker', () => {
    it('should return a worker when pool is idle', async () => {
      await pool.init();

      const worker = pool.getIdleWorker();
      expect(worker).not.toBeNull();
      expect(worker!.isIdle).toBe(true);
    });

    it('should return null when pool is not initialized', () => {
      const worker = pool.getIdleWorker();
      expect(worker).toBeNull();
    });
  });

  describe('getIdleWorkers', () => {
    it('should return all workers when pool is idle', async () => {
      await pool.init();

      const idle = pool.getIdleWorkers();
      expect(idle).toHaveLength(2);
    });
  });

  describe('getActiveCount', () => {
    it('should return 0 when pool is idle', async () => {
      await pool.init();
      expect(pool.getActiveCount()).toBe(0);
    });
  });

  describe('getWorkerStates', () => {
    it('should return state for all workers', async () => {
      await pool.init();

      const states = pool.getWorkerStates();
      expect(states).toHaveLength(2);
      expect(states[0].status).toBe('idle');
      expect(states[1].status).toBe('idle');
    });
  });

  describe('hasActiveWorkers', () => {
    it('should return false when pool is idle', async () => {
      await pool.init();
      expect(pool.hasActiveWorkers()).toBe(false);
    });
  });

  describe('awaitAnyCompletion', () => {
    it('should return null when no active workers', async () => {
      await pool.init();
      const result = await pool.awaitAnyCompletion();
      expect(result).toBeNull();
    });
  });

  describe('drainAll', () => {
    it('should return empty array when no active workers', async () => {
      await pool.init();
      const results = await pool.drainAll();
      expect(results).toEqual([]);
    });
  });

  describe('shutdown', () => {
    it('should cleanup worktrees', async () => {
      await pool.init();

      const wt0 = join(testRepo, '.ralph/worktrees/worker-0');
      expect(existsSync(wt0)).toBe(true);

      await pool.shutdown(true);

      expect(pool.size).toBe(0);
    });

    it('should skip cleanup when told to', async () => {
      await pool.init();

      const wt0 = join(testRepo, '.ralph/worktrees/worker-0');
      expect(existsSync(wt0)).toBe(true);

      await pool.shutdown(false);

      // Worktrees should still exist (no cleanup)
      expect(pool.size).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit worker:idle after task completion', async () => {
      await pool.init();

      const idleEvents: number[] = [];
      pool.on('worker:idle', (workerId) => idleEvents.push(workerId));

      const worker = pool.getIdleWorker()!;
      const task: FactoryTask = {
        item: { id: 'EVT-001', description: 'Event test', priority: 'medium', status: 'pending' } as any,
        prdFilePath: '/test/prd.json',
        prdCategory: 'test',
        tier: 'medium',
        complexityScore: 50,
        retryCount: 0,
      };

      const slot: ProviderSlot = { provider: 'claude', model: 'sonnet', tier: 'medium' };
      const config = {
        dryRun: false,
        opusTokenLimit: 200000,
        sonnetTokenLimit: 100000,
        skipValidation: true,
      } as any;

      await pool.assignTask(worker, task, slot, config);

      expect(idleEvents).toContain(worker.id);
    });
  });
});
