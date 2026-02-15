import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Planner, addTasksToPrd } from './planner.js';
import type { FactoryConfig } from './types.js';
import { DEFAULT_FACTORY_CONFIG } from './types.js';

// Mock external dependencies
vi.mock('../providers.js', () => ({
  runProvider: vi.fn(),
}));

vi.mock('../prd.js', async () => {
  const actual = await vi.importActual('../prd.js');
  return {
    ...actual,
    loadPrdFile: vi.fn(),
    loadAllPrdFiles: vi.fn().mockReturnValue([]),
  };
});

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

const mockConfig = {
  prdFile: '/test/prd.json',
  prdDir: './docs/prd',
  dryRun: false,
  sonnetTokenLimit: 100000,
  skipValidation: false,
} as any;

describe('Planner', () => {
  let planner: Planner;

  beforeEach(() => {
    vi.clearAllMocks();
    planner = new Planner(mockConfig, DEFAULT_FACTORY_CONFIG, '/test/repo');
  });

  afterEach(() => {
    planner.stop();
  });

  describe('isSpecSatisfied', () => {
    it('should return false initially', () => {
      expect(planner.isSpecSatisfied()).toBe(false);
    });
  });

  describe('start/stop', () => {
    it('should start and stop without error', () => {
      const onNewTasks = vi.fn();
      const onSpecSatisfied = vi.fn();

      planner.start(onNewTasks, onSpecSatisfied);
      planner.stop();

      // Should be idempotent
      planner.stop();
    });

    it('should not start twice', () => {
      const onNewTasks = vi.fn();
      const onSpecSatisfied = vi.fn();

      planner.start(onNewTasks, onSpecSatisfied);
      planner.start(onNewTasks, onSpecSatisfied); // no-op

      planner.stop();
    });
  });

  describe('evaluate', () => {
    it('should return empty result when provider fails', async () => {
      const { loadPrdFile } = await import('../prd.js');
      (loadPrdFile as any).mockReturnValue({
        project: 'test',
        description: 'Test project',
        items: [],
      });

      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({
        success: false,
        output: '',
        error: 'Provider failed',
      });

      const result = await planner.evaluate();

      expect(result.newTasks).toEqual([]);
      expect(result.specSatisfied).toBe(false);
    });

    it('should parse specSatisfied response', async () => {
      const { loadPrdFile } = await import('../prd.js');
      (loadPrdFile as any).mockReturnValue({
        project: 'test',
        description: 'Test project',
        items: [{ id: 'T-001', description: 'Task 1', priority: 'high', status: 'completed' }],
      });

      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({
        success: true,
        output: JSON.stringify({
          specSatisfied: true,
          reasoning: 'All tasks completed',
          newTasks: [],
        }),
      });

      const result = await planner.evaluate();

      expect(result.specSatisfied).toBe(true);
      expect(result.newTasks).toEqual([]);
    });

    it('should parse new tasks from response', async () => {
      const { loadPrdFile } = await import('../prd.js');
      (loadPrdFile as any).mockReturnValue({
        project: 'test',
        description: 'Test project',
        items: [{ id: 'T-001', description: 'Task 1', priority: 'high', status: 'completed' }],
      });

      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({
        success: true,
        output: JSON.stringify({
          specSatisfied: false,
          reasoning: 'Need more tasks',
          newTasks: [
            {
              id: 'PLAN-001',
              description: 'New generated task',
              priority: 'medium',
              acceptance_criteria: ['criterion 1'],
              estimated_hours: 1,
              complexity: 'low',
            },
          ],
        }),
      });

      const result = await planner.evaluate();

      expect(result.specSatisfied).toBe(false);
      expect(result.newTasks).toHaveLength(1);
      expect(result.newTasks[0].id).toBe('PLAN-001');
      expect(result.newTasks[0].description).toBe('New generated task');
      expect(result.newTasks[0].status).toBe('pending');
    });

    it('should deduplicate tasks against existing PRD items', async () => {
      const { loadPrdFile } = await import('../prd.js');
      (loadPrdFile as any).mockReturnValue({
        project: 'test',
        description: 'Test project',
        items: [{ id: 'T-001', description: 'Task 1', priority: 'high', status: 'pending' }],
      });

      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({
        success: true,
        output: JSON.stringify({
          specSatisfied: false,
          reasoning: 'Gaps found',
          newTasks: [
            { id: 'T-001', description: 'Duplicate', priority: 'medium' }, // Should be skipped
            { id: 'PLAN-002', description: 'New task', priority: 'high' },
          ],
        }),
      });

      const result = await planner.evaluate();

      expect(result.newTasks).toHaveLength(1);
      expect(result.newTasks[0].id).toBe('PLAN-002');
    });

    it('should skip tasks with missing required fields', async () => {
      const { loadPrdFile } = await import('../prd.js');
      (loadPrdFile as any).mockReturnValue({
        project: 'test',
        description: 'Test project',
        items: [],
      });

      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({
        success: true,
        output: JSON.stringify({
          specSatisfied: false,
          reasoning: 'Some invalid tasks',
          newTasks: [
            { id: '', description: 'Missing id', priority: 'high' },  // empty id
            { id: 'PLAN-003', description: '', priority: 'high' },     // empty desc
            { id: 'PLAN-004', description: 'Valid task', priority: 'medium' }, // valid
          ],
        }),
      });

      const result = await planner.evaluate();

      expect(result.newTasks).toHaveLength(1);
      expect(result.newTasks[0].id).toBe('PLAN-004');
    });

    it('should handle malformed JSON in response', async () => {
      const { loadPrdFile } = await import('../prd.js');
      (loadPrdFile as any).mockReturnValue({
        project: 'test',
        description: 'Test project',
        items: [],
      });

      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({
        success: true,
        output: 'This is not JSON at all, just text',
      });

      const result = await planner.evaluate();

      expect(result.newTasks).toEqual([]);
      expect(result.specSatisfied).toBe(false);
    });

    it('should extract JSON embedded in text', async () => {
      const { loadPrdFile } = await import('../prd.js');
      (loadPrdFile as any).mockReturnValue({
        project: 'test',
        description: 'Test project',
        items: [],
      });

      const { runProvider } = await import('../providers.js');
      (runProvider as any).mockResolvedValue({
        success: true,
        output: `Here is my analysis:
\`\`\`json
{"specSatisfied": true, "reasoning": "All done", "newTasks": []}
\`\`\`
That's my assessment.`,
      });

      const result = await planner.evaluate();

      expect(result.specSatisfied).toBe(true);
    });
  });
});

describe('addTasksToPrd', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = join(tmpdir(), `ralph-planner-test-${Date.now()}.json`);
    writeFileSync(tmpFile, JSON.stringify({
      project: 'test',
      items: [{ id: 'T-001', description: 'Existing', priority: 'high', status: 'pending' }],
    }, null, 2));
  });

  afterEach(() => {
    if (existsSync(tmpFile)) {
      rmSync(tmpFile);
    }
  });

  it('should add tasks to the PRD file', () => {
    const result = addTasksToPrd(tmpFile, [
      { id: 'PLAN-001', description: 'New task', priority: 'medium', status: 'pending' } as any,
    ]);

    expect(result).toBe(true);

    const content = JSON.parse(readFileSync(tmpFile, 'utf-8'));
    expect(content.items).toHaveLength(2);
    expect(content.items[1].id).toBe('PLAN-001');
    expect(content.metadata.updated_at).toBeDefined();
  });

  it('should handle multiple tasks', () => {
    const result = addTasksToPrd(tmpFile, [
      { id: 'PLAN-001', description: 'Task 1', priority: 'high', status: 'pending' } as any,
      { id: 'PLAN-002', description: 'Task 2', priority: 'low', status: 'pending' } as any,
    ]);

    expect(result).toBe(true);

    const content = JSON.parse(readFileSync(tmpFile, 'utf-8'));
    expect(content.items).toHaveLength(3);
  });

  it('should return false for non-existent file', () => {
    const result = addTasksToPrd('/nonexistent/path.json', [
      { id: 'X', description: 'X', priority: 'low', status: 'pending' } as any,
    ]);
    expect(result).toBe(false);
  });

  it('should handle file without items array', () => {
    writeFileSync(tmpFile, JSON.stringify({ project: 'bare' }));

    const result = addTasksToPrd(tmpFile, [
      { id: 'PLAN-001', description: 'New', priority: 'medium', status: 'pending' } as any,
    ]);

    expect(result).toBe(true);

    const content = JSON.parse(readFileSync(tmpFile, 'utf-8'));
    expect(content.items).toHaveLength(1);
  });
});
