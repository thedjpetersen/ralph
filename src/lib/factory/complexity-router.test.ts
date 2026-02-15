import { describe, it, expect } from 'vitest';
import {
  scoreComplexity,
  scoreToTier,
  escalateTier,
  buildFactoryTask,
  findAvailableSlot,
} from './complexity-router.js';
import { RateLimiter } from './rate-limiter.js';
import { DEFAULT_FACTORY_CONFIG } from './types.js';
import type { PrdItem } from '../prd.js';

function createItem(overrides: Partial<PrdItem> = {}): PrdItem {
  return {
    id: 'test-1',
    description: 'Test task',
    priority: 'medium',
    status: 'pending',
    ...overrides,
  };
}

describe('complexity-router', () => {
  describe('scoreComplexity', () => {
    it('should return neutral score for basic task', () => {
      const score = scoreComplexity(createItem());
      expect(score).toBeGreaterThanOrEqual(30);
      expect(score).toBeLessThanOrEqual(70);
    });

    it('should score low for simple tasks with low keywords', () => {
      const score = scoreComplexity(createItem({
        description: 'Fix typo in button label',
        priority: 'low',
      }));
      expect(score).toBeLessThan(40);
    });

    it('should score high for complex tasks with high keywords', () => {
      const score = scoreComplexity(createItem({
        description: 'Refactor authentication system to support OAuth2 with database migration',
        priority: 'high',
        acceptance_criteria: ['Design schema', 'Migrate data', 'Update API', 'Add tests', 'Update docs', 'Review security', 'Performance test', 'Deploy', 'Monitor'],
        estimated_hours: 8,
      }));
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it('should respect manual complexity override', () => {
      const item = createItem({ description: 'Something complex' }) as PrdItem & { complexity?: string };
      item.complexity = 'low';
      expect(scoreComplexity(item)).toBe(20);

      item.complexity = 'high';
      expect(scoreComplexity(item)).toBe(80);
    });

    it('should boost score for tasks with judges', () => {
      const withJudges = scoreComplexity(createItem({
        judges: [{ persona: 'QA Engineer' }],
      }));
      const withoutJudges = scoreComplexity(createItem());
      expect(withJudges).toBeGreaterThan(withoutJudges);
    });

    it('should boost score for long descriptions', () => {
      const long = scoreComplexity(createItem({
        description: 'A'.repeat(600),
      }));
      const short = scoreComplexity(createItem({
        description: 'Short',
      }));
      expect(long).toBeGreaterThan(short);
    });

    it('should boost score for many acceptance criteria', () => {
      const many = scoreComplexity(createItem({
        acceptance_criteria: Array(10).fill('criterion'),
      }));
      const few = scoreComplexity(createItem({
        acceptance_criteria: ['one'],
      }));
      expect(many).toBeGreaterThan(few);
    });

    it('should boost score for high estimated_hours', () => {
      const high = scoreComplexity(createItem({ estimated_hours: 8 }));
      const low = scoreComplexity(createItem({ estimated_hours: 0.25 }));
      expect(high).toBeGreaterThan(low);
    });

    it('should clamp score to 0-100', () => {
      // Stack everything low
      const veryLow = scoreComplexity(createItem({
        description: 'Fix typo',
        priority: 'low',
        estimated_hours: 0.1,
      }));
      expect(veryLow).toBeGreaterThanOrEqual(0);

      // Stack everything high
      const veryHigh = scoreComplexity(createItem({
        description: 'Complete refactor of the entire authentication and authorization architecture',
        priority: 'high',
        acceptance_criteria: Array(10).fill('c'),
        estimated_hours: 10,
        judges: [{ persona: 'Architect' }],
        dependencies: ['a', 'b', 'c'],
      }));
      expect(veryHigh).toBeLessThanOrEqual(100);
    });
  });

  describe('scoreToTier', () => {
    it('should map scores to correct tiers', () => {
      expect(scoreToTier(0)).toBe('low');
      expect(scoreToTier(20)).toBe('low');
      expect(scoreToTier(39)).toBe('low');
      expect(scoreToTier(40)).toBe('medium');
      expect(scoreToTier(50)).toBe('medium');
      expect(scoreToTier(69)).toBe('medium');
      expect(scoreToTier(70)).toBe('high');
      expect(scoreToTier(85)).toBe('high');
      expect(scoreToTier(100)).toBe('high');
    });
  });

  describe('escalateTier', () => {
    it('should escalate low to medium', () => {
      expect(escalateTier('low')).toBe('medium');
    });

    it('should escalate medium to high', () => {
      expect(escalateTier('medium')).toBe('high');
    });

    it('should keep high as high', () => {
      expect(escalateTier('high')).toBe('high');
    });
  });

  describe('buildFactoryTask', () => {
    it('should create a factory task with auto-routing', () => {
      const item = createItem({ description: 'Fix typo in label', priority: 'low' });
      const task = buildFactoryTask(item, '/test.json', 'frontend', DEFAULT_FACTORY_CONFIG);

      expect(task.item).toBe(item);
      expect(task.prdFilePath).toBe('/test.json');
      expect(task.prdCategory).toBe('frontend');
      expect(task.retryCount).toBe(0);
      expect(task.tier).toBeDefined();
      expect(task.complexityScore).toBeGreaterThanOrEqual(0);
    });

    it('should escalate tier on retry', () => {
      const item = createItem({ description: 'Simple task', priority: 'low' });
      const task0 = buildFactoryTask(item, '/test.json', 'test', DEFAULT_FACTORY_CONFIG, 0);
      const task1 = buildFactoryTask(item, '/test.json', 'test', DEFAULT_FACTORY_CONFIG, 1);
      const task2 = buildFactoryTask(item, '/test.json', 'test', DEFAULT_FACTORY_CONFIG, 2);

      // Each retry should escalate (or stay at max)
      const tierOrder = { low: 0, medium: 1, high: 2 };
      expect(tierOrder[task1.tier]).toBeGreaterThanOrEqual(tierOrder[task0.tier]);
      expect(tierOrder[task2.tier]).toBeGreaterThanOrEqual(tierOrder[task1.tier]);
    });

    it('should use default tier when autoRoute is off', () => {
      const config = {
        ...DEFAULT_FACTORY_CONFIG,
        routing: { autoRoute: false, defaultTier: 'medium' as const },
      };
      const task = buildFactoryTask(createItem(), '/test.json', 'test', config);
      expect(task.tier).toBe('medium');
    });
  });

  describe('findAvailableSlot', () => {
    it('should find primary slot when available', () => {
      const limiter = new RateLimiter(DEFAULT_FACTORY_CONFIG.pool.slots);
      const slot = findAvailableSlot('high', limiter, DEFAULT_FACTORY_CONFIG);

      expect(slot).not.toBeNull();
      expect(slot!.provider).toBe('claude');
      expect(slot!.model).toBe('opus');
    });

    it('should fall back when primary is full', () => {
      const limiter = new RateLimiter({ 'claude:opus': 0, 'gemini:pro': 2, 'claude:sonnet': 2 });
      const config = {
        ...DEFAULT_FACTORY_CONFIG,
        pool: { ...DEFAULT_FACTORY_CONFIG.pool, slots: { 'claude:opus': 0, 'gemini:pro': 2, 'claude:sonnet': 2 } },
      };
      const slot = findAvailableSlot('high', limiter, config);

      expect(slot).not.toBeNull();
      expect(slot!.provider).toBe('gemini');
      expect(slot!.model).toBe('pro');
    });

    it('should return null when all slots are exhausted', () => {
      const limiter = new RateLimiter({ 'claude:opus': 0, 'gemini:pro': 0, 'claude:sonnet': 0 });
      const config = {
        ...DEFAULT_FACTORY_CONFIG,
        pool: { ...DEFAULT_FACTORY_CONFIG.pool, slots: { 'claude:opus': 0, 'gemini:pro': 0, 'claude:sonnet': 0 } },
      };
      const slot = findAvailableSlot('high', limiter, config);
      expect(slot).toBeNull();
    });

    it('should route low tier to haiku/flash', () => {
      const limiter = new RateLimiter(DEFAULT_FACTORY_CONFIG.pool.slots);
      const slot = findAvailableSlot('low', limiter, DEFAULT_FACTORY_CONFIG);

      expect(slot).not.toBeNull();
      expect(slot!.model).toBe('haiku');
    });
  });
});
