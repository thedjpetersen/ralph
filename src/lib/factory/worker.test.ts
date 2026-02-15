import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Worker } from './worker.js';
import type { FactoryTask, ProviderSlot } from './types.js';
import type { PrdItem } from '../prd.js';

// Mock all external dependencies
vi.mock('../providers.js', () => ({
  runProvider: vi.fn(),
}));

vi.mock('../claude.js', () => ({
  buildTaskPrompt: vi.fn().mockReturnValue('mock prompt'),
  checkForCompletion: vi.fn().mockReturnValue(true),
}));

vi.mock('../prd.js', () => ({
  formatTaskForPrompt: vi.fn().mockReturnValue('formatted task'),
  loadPrdFile: vi.fn().mockReturnValue({
    project: 'test',
    items: [],
  }),
}));

vi.mock('../validation/index.js', () => ({
  runValidation: vi.fn().mockResolvedValue({
    passed: true,
    failed_gates: [],
    results: [],
  }),
  shouldMarkComplete: vi.fn().mockReturnValue(true),
}));

vi.mock('../validation/package-detector.js', () => ({
  detectPackageFromCategory: vi.fn().mockReturnValue(null),
}));

vi.mock('./git-worktree.js', () => ({
  resetWorktreeToHead: vi.fn().mockResolvedValue(true),
  commitInWorktree: vi.fn().mockResolvedValue('abc1234'),
}));

vi.mock('./rate-limiter.js', () => ({
  RateLimiter: {
    isRateLimited: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

function createMockItem(overrides: Partial<PrdItem> = {}): PrdItem {
  return {
    id: 'TEST-001',
    description: 'Test task description',
    priority: 'medium',
    status: 'pending',
    ...overrides,
  };
}

function createMockTask(itemOverrides: Partial<PrdItem> = {}): FactoryTask {
  return {
    item: createMockItem(itemOverrides),
    prdFilePath: '/test/prd.json',
    prdCategory: 'backend',
    tier: 'medium',
    complexityScore: 50,
    retryCount: 0,
  };
}

const mockSlot: ProviderSlot = {
  provider: 'claude',
  model: 'sonnet',
  tier: 'medium',
};

const mockConfig = {
  dryRun: false,
  opusTokenLimit: 200000,
  sonnetTokenLimit: 100000,
  haikuTokenLimit: 50000,
  skipValidation: false,
  validationGates: {},
  validationTimeout: 30000,
  validationFailFast: false,
} as any;

describe('Worker', () => {
  let worker: Worker;

  beforeEach(() => {
    vi.clearAllMocks();
    worker = new Worker(0, '.ralph/worktrees/worker-0', 'ralph-factory/worker-0');
  });

  describe('constructor', () => {
    it('should initialize with correct state', () => {
      expect(worker.id).toBe(0);
      expect(worker.worktreePath).toBe('.ralph/worktrees/worker-0');
      expect(worker.branchName).toBe('ralph-factory/worker-0');
      expect(worker.status).toBe('idle');
      expect(worker.isIdle).toBe(true);
      expect(worker.state.completedTasks).toEqual([]);
    });
  });

  describe('execute', () => {
    it('should complete successfully with all steps passing', async () => {
      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({ success: true, output: 'done' });

      const task = createMockTask();
      const result = await worker.execute(task, mockSlot, mockConfig, '/repo');

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('TEST-001');
      expect(result.workerId).toBe(0);
      expect(result.commitHash).toBe('abc1234');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(worker.isIdle).toBe(true);
      expect(worker.state.completedTasks).toContain('TEST-001');
    });

    it('should fail when worktree reset fails', async () => {
      const { resetWorktreeToHead } = await import('./git-worktree.js');
      (resetWorktreeToHead as any).mockResolvedValueOnce(false);

      const task = createMockTask();
      const result = await worker.execute(task, mockSlot, mockConfig, '/repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('reset worktree');
      expect(worker.isIdle).toBe(true);
    });

    it('should fail when PRD file cannot be loaded', async () => {
      const { loadPrdFile } = await import('../prd.js');
      (loadPrdFile as any).mockReturnValueOnce(null);

      const task = createMockTask();
      const result = await worker.execute(task, mockSlot, mockConfig, '/repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load PRD');
      expect(worker.isIdle).toBe(true);
    });

    it('should detect rate limiting from provider output', async () => {
      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({
        success: false,
        output: '',
        error: 'rate_limit_error',
      });

      const { RateLimiter } = await import('./rate-limiter.js');
      (RateLimiter.isRateLimited as any).mockReturnValueOnce(true);

      const task = createMockTask();
      const result = await worker.execute(task, mockSlot, mockConfig, '/repo');

      expect(result.success).toBe(false);
      expect(result.rateLimited).toBe(true);
    });

    it('should fail when provider returns failure without rate limit', async () => {
      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({
        success: false,
        error: 'Provider crashed',
      });

      const task = createMockTask();
      const result = await worker.execute(task, mockSlot, mockConfig, '/repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Provider crashed');
    });

    it('should fail when completion marker is missing', async () => {
      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({ success: true, output: 'partial' });

      const { checkForCompletion } = await import('../claude.js');
      (checkForCompletion as any).mockReturnValueOnce(false);

      const task = createMockTask();
      const result = await worker.execute(task, mockSlot, mockConfig, '/repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('completion');
    });

    it('should fail when validation fails', async () => {
      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({ success: true, output: 'done' });

      const { shouldMarkComplete } = await import('../validation/index.js');
      (shouldMarkComplete as any).mockReturnValueOnce(false);

      const { runValidation } = await import('../validation/index.js');
      (runValidation as any).mockResolvedValueOnce({
        passed: false,
        failed_gates: ['lint', 'test'],
        results: [],
      });

      const task = createMockTask();
      const result = await worker.execute(task, mockSlot, mockConfig, '/repo');

      expect(result.success).toBe(false);
      expect(result.validationPassed).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should skip validation when skipValidation is true', async () => {
      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({ success: true, output: 'done' });

      const configWithSkip = { ...mockConfig, skipValidation: true };
      const task = createMockTask();
      const result = await worker.execute(task, mockSlot, configWithSkip, '/repo');

      expect(result.success).toBe(true);

      const { runValidation } = await import('../validation/index.js');
      expect(runValidation).not.toHaveBeenCalled();
    });

    it('should handle thrown errors gracefully', async () => {
      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockRejectedValue(new Error('Unexpected crash'));

      const task = createMockTask();
      const result = await worker.execute(task, mockSlot, mockConfig, '/repo');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected crash');
      expect(worker.isIdle).toBe(true);
    });

    it('should return to idle after execution regardless of outcome', async () => {
      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockRejectedValue(new Error('fail'));

      expect(worker.isIdle).toBe(true);

      const task = createMockTask();
      await worker.execute(task, mockSlot, mockConfig, '/repo');

      expect(worker.isIdle).toBe(true);
    });

    it('should use correct token limit for haiku slot', async () => {
      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({ success: true, output: 'done' });

      const haikuSlot: ProviderSlot = { provider: 'claude', model: 'haiku', tier: 'low' };
      const task = createMockTask();
      await worker.execute(task, haikuSlot, mockConfig, '/repo');

      expect(runProvider).toHaveBeenCalledWith(
        'claude',
        expect.any(String),
        expect.objectContaining({ tokenLimit: 50000 }),
      );
    });

    it('should use correct token limit for opus slot', async () => {
      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({ success: true, output: 'done' });

      const opusSlot: ProviderSlot = { provider: 'claude', model: 'opus', tier: 'high' };
      const task = createMockTask();
      await worker.execute(task, opusSlot, mockConfig, '/repo');

      expect(runProvider).toHaveBeenCalledWith(
        'claude',
        expect.any(String),
        expect.objectContaining({ tokenLimit: 200000 }),
      );
    });
  });
});
