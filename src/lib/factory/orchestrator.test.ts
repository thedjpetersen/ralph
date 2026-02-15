import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FactoryOrchestrator } from './orchestrator.js';
import { DEFAULT_FACTORY_CONFIG } from './types.js';

// Heavy mocking since the orchestrator ties everything together
vi.mock('../prd.js', () => ({
  loadPrdFile: vi.fn().mockReturnValue(null),
  loadAllPrdFiles: vi.fn().mockReturnValue([]),
  getTaskSummary: vi.fn().mockReturnValue({ total: 0, pending: 0, completed: 0, inProgress: 0 }),
  getReadyTasks: vi.fn().mockReturnValue([]),
  markTaskInProgress: vi.fn(),
  markTaskComplete: vi.fn(),
  resetTaskStatus: vi.fn(),
}));

vi.mock('./rate-limiter.js', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    tryAcquire: vi.fn().mockReturnValue(true),
    release: vi.fn(),
    reportRateLimit: vi.fn(),
    reportSuccess: vi.fn(),
    getAvailableSlots: vi.fn().mockReturnValue(['claude:sonnet']),
    getStatus: vi.fn().mockReturnValue({}),
  })),
}));

vi.mock('./complexity-router.js', () => ({
  buildFactoryTask: vi.fn().mockImplementation((item, prdFilePath, category, config, retry) => ({
    item,
    prdFilePath,
    prdCategory: category,
    tier: 'medium',
    complexityScore: 50,
    retryCount: retry || 0,
  })),
  findAvailableSlot: vi.fn().mockReturnValue({ provider: 'claude', model: 'sonnet', tier: 'medium' }),
  escalateTier: vi.fn().mockReturnValue('high'),
}));

vi.mock('./worker-pool.js', () => {
  const EventEmitter = require('events');
  return {
    WorkerPool: vi.fn().mockImplementation(() => {
      const pool = Object.create(EventEmitter.prototype);
      EventEmitter.call(pool);
      pool.init = vi.fn();
      pool.getIdleWorker = vi.fn().mockReturnValue(null);
      pool.getIdleWorkers = vi.fn().mockReturnValue([]);
      pool.getActiveCount = vi.fn().mockReturnValue(0);
      pool.getWorkerStates = vi.fn().mockReturnValue([]);
      pool.hasActiveWorkers = vi.fn().mockReturnValue(false);
      pool.assignTask = vi.fn();
      pool.awaitAnyCompletion = vi.fn().mockResolvedValue(null);
      pool.drainAll = vi.fn().mockResolvedValue([]);
      pool.shutdown = vi.fn();
      pool.size = 2;
      return pool;
    }),
  };
});

vi.mock('./merge-coordinator.js', () => ({
  MergeCoordinator: vi.fn().mockImplementation(() => ({
    cherryPick: vi.fn().mockResolvedValue({ success: true, commitHash: 'abc123' }),
    getHistory: vi.fn().mockReturnValue([]),
    getSuccessCount: vi.fn().mockReturnValue(0),
  })),
}));

vi.mock('./planner.js', () => ({
  Planner: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    maybeRefill: vi.fn(),
    notifyCompletion: vi.fn(),
    isSpecSatisfied: vi.fn().mockReturnValue(false),
    hasEvaluated: vi.fn().mockReturnValue(true),
    evaluate: vi.fn(),
  })),
  addTasksToPrd: vi.fn().mockReturnValue(true),
}));

vi.mock('../session.js', () => ({
  createSessionManager: vi.fn().mockReturnValue({
    createSession: vi.fn().mockResolvedValue('session-123'),
    completeSession: vi.fn(),
    completeTask: vi.fn(),
  }),
  SessionManager: vi.fn(),
}));

vi.mock('../notify.js', () => ({
  Notifier: vi.fn().mockImplementation(() => ({
    notify: vi.fn(),
  })),
}));

vi.mock('../git.js', () => ({
  getCurrentBranch: vi.fn().mockResolvedValue('main'),
  getStatus: vi.fn().mockResolvedValue({ branch: 'main' }),
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    divider: vi.fn(),
    header: vi.fn(),
  },
}));

const mockConfig = {
  projectRoot: '/test/repo',
  prdFile: '/test/prd.json',
  prdDir: './docs/prd',
  dryRun: false,
  opusTokenLimit: 200000,
  sonnetTokenLimit: 100000,
  haikuTokenLimit: 50000,
  skipValidation: true,
  filterCategory: undefined,
  filterPriority: undefined,
  notifyScript: undefined,
  notifyEnabled: false,
} as any;

describe('FactoryOrchestrator', () => {
  let orchestrator: FactoryOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new FactoryOrchestrator(mockConfig, DEFAULT_FACTORY_CONFIG);
  });

  describe('constructor', () => {
    it('should create an orchestrator instance', () => {
      expect(orchestrator).toBeDefined();
    });
  });

  describe('run', () => {
    it('should exit early when no PRD files found', async () => {
      const { loadPrdFile } = await import('../prd.js');
      (loadPrdFile as any).mockReturnValue(null);

      const { logger } = await import('../logger.js');

      await orchestrator.run();

      expect(logger.error).toHaveBeenCalledWith('No PRD files found');
    });

    it('should initialize all subsystems when PRD exists', async () => {
      const { loadPrdFile } = await import('../prd.js');
      (loadPrdFile as any).mockReturnValue({
        project: 'test',
        filepath: '/test/prd.json',
        category: 'backend',
        items: [],
      });

      const { getTaskSummary } = await import('../prd.js');
      (getTaskSummary as any).mockReturnValue({ total: 0, pending: 0, completed: 0, inProgress: 0 });

      const { WorkerPool } = await import('./worker-pool.js');
      const { Planner } = await import('./planner.js');
      const { createSessionManager } = await import('../session.js');

      await orchestrator.run();

      // Pool should be initialized
      expect(WorkerPool).toHaveBeenCalled();

      // Planner should be started
      expect(Planner).toHaveBeenCalled();

      // Session should be created
      expect(createSessionManager).toHaveBeenCalled();
    });

    it('should converge immediately when no tasks are pending', async () => {
      const { loadPrdFile } = await import('../prd.js');
      (loadPrdFile as any).mockReturnValue({
        project: 'test',
        filepath: '/test/prd.json',
        category: 'backend',
        items: [{ id: 'T-001', description: 'Done', status: 'completed', priority: 'medium' }],
      });

      const { getTaskSummary } = await import('../prd.js');
      (getTaskSummary as any).mockReturnValue({ total: 1, pending: 0, completed: 1, inProgress: 0 });

      const { logger } = await import('../logger.js');

      await orchestrator.run();

      // Should exit because no tasks in queue and no in-progress
      // May converge or detect "no more tasks" depending on timing
      const successCalls = (logger.success as any).mock?.calls?.flat() || [];
      const infoCalls = (logger.info as any).mock?.calls?.flat() || [];
      const allMessages = [...successCalls, ...infoCalls].join(' ');
      expect(allMessages).toMatch(/converged|no more tasks/i);
    });
  });
});
