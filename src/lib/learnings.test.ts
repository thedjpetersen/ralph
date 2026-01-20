import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  LearningsManager,
  createLearningsManager,
  processClaudeOutput,
} from './learnings.js';

describe('LearningsManager', () => {
  let testDir: string;
  let learningsFile: string;
  let learningsManager: LearningsManager;

  beforeEach(() => {
    testDir = join(tmpdir(), `ralph-learnings-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    learningsFile = join(testDir, 'LEARNINGS.md');
    learningsManager = new LearningsManager(learningsFile);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('constructor', () => {
    it('should create learnings file with header', () => {
      expect(existsSync(learningsFile)).toBe(true);
      const content = readFileSync(learningsFile, 'utf-8');
      expect(content).toContain('# Ralph Learnings');
      expect(content).toContain('## Patterns Discovered');
      expect(content).toContain('## Validation Failures');
      expect(content).toContain('## Gotchas');
    });

    it('should create directory if it does not exist', () => {
      const nestedDir = join(testDir, 'nested/deep');
      const nestedFile = join(nestedDir, 'LEARNINGS.md');
      new LearningsManager(nestedFile);
      expect(existsSync(nestedFile)).toBe(true);
    });
  });

  describe('parseLearnings', () => {
    it('should parse learning blocks from output', () => {
      const output = `
Some text before

<learning>
Pattern: Test Pattern
Context: Testing context
Insight: This is a test insight
</learning>

Some text after
      `;

      const learnings = learningsManager.parseLearnings(output, 'task-1');
      expect(learnings).toHaveLength(1);
      expect(learnings[0].pattern).toBe('Test Pattern');
      expect(learnings[0].context).toBe('Testing context');
      expect(learnings[0].insight).toBe('This is a test insight');
      expect(learnings[0].taskId).toBe('task-1');
    });

    it('should parse multiple learning blocks', () => {
      const output = `
<learning>
Pattern: Pattern 1
Context: Context 1
Insight: Insight 1
</learning>

<learning>
Pattern: Pattern 2
Context: Context 2
Insight: Insight 2
</learning>
      `;

      const learnings = learningsManager.parseLearnings(output);
      expect(learnings).toHaveLength(2);
    });

    it('should handle learning with only insight', () => {
      const output = `
<learning>
Insight: Just an insight without pattern/context
</learning>
      `;

      const learnings = learningsManager.parseLearnings(output);
      expect(learnings).toHaveLength(1);
      expect(learnings[0].pattern).toBe('Unnamed pattern');
      expect(learnings[0].insight).toBe('Just an insight without pattern/context');
    });

    it('should return empty array for no learning blocks', () => {
      const output = 'Just some regular output without learning blocks';
      const learnings = learningsManager.parseLearnings(output);
      expect(learnings).toHaveLength(0);
    });

    it('should handle case-insensitive tags', () => {
      const output = `
<LEARNING>
Pattern: Case Test
Insight: Testing case insensitivity
</LEARNING>
      `;

      const learnings = learningsManager.parseLearnings(output);
      expect(learnings).toHaveLength(1);
    });
  });

  describe('addLearning', () => {
    it('should add learning to Patterns section', () => {
      learningsManager.addLearning({
        pattern: 'Test Pattern',
        context: 'Test context',
        insight: 'Test insight',
        taskId: 'task-123',
        timestamp: new Date().toISOString(),
      });

      const content = learningsManager.getContent();
      expect(content).toContain('Test Pattern');
      expect(content).toContain('Test context');
      expect(content).toContain('Test insight');
      expect(content).toContain('task-123');
    });

    it('should format date correctly', () => {
      const timestamp = '2024-01-15T10:30:00.000Z';
      learningsManager.addLearning({
        pattern: 'Dated Pattern',
        context: '',
        insight: 'Insight',
        timestamp,
      });

      const content = learningsManager.getContent();
      expect(content).toContain('[2024-01-15]');
    });
  });

  describe('logValidationFailure', () => {
    it('should log validation failure', () => {
      learningsManager.logValidationFailure('task-1', {
        last_run: new Date().toISOString(),
        passed: false,
        failed_gates: ['frontend:test'],
        attempts: 2,
        gates: [
          {
            gate: 'test',
            package: 'frontend',
            passed: false,
            duration: 1000,
            error_summary: 'Test failed: 2 assertions',
          },
        ],
      });

      const content = learningsManager.getContent();
      expect(content).toContain('task-1');
      expect(content).toContain('frontend:test');
      expect(content).toContain('Test failed');
    });

    it('should not log passed validation', () => {
      learningsManager.logValidationFailure('task-1', {
        last_run: new Date().toISOString(),
        passed: true,
        failed_gates: [],
        attempts: 1,
        gates: [],
      });

      const content = learningsManager.getContent();
      // Should only have the header, no failure entry
      expect(content).not.toContain('task-1');
    });
  });

  describe('addGotcha', () => {
    it('should add gotcha to Gotchas section', () => {
      learningsManager.addGotcha({
        category: 'TypeScript',
        issue: 'Import paths need .js extension',
        workaround: 'Add .js to all imports',
        timestamp: new Date().toISOString(),
      });

      const content = learningsManager.getContent();
      expect(content).toContain('TypeScript');
      expect(content).toContain('Import paths need .js extension');
      expect(content).toContain('Add .js to all imports');
    });

    it('should handle gotcha without workaround', () => {
      learningsManager.addGotcha({
        category: 'ESLint',
        issue: 'Strict mode required',
        timestamp: new Date().toISOString(),
      });

      const content = learningsManager.getContent();
      expect(content).toContain('ESLint');
      expect(content).toContain('Strict mode required');
    });
  });

  describe('addSessionSummary', () => {
    it('should add session summary', () => {
      learningsManager.addSessionSummary(
        'abc123',
        5,
        3600,
        { passed: 10, failed: 2 }
      );

      const content = learningsManager.getContent();
      expect(content).toContain('abc123');
      expect(content).toContain('Tasks Completed:** 5');
      expect(content).toContain('60 minutes');
      expect(content).toContain('10 passed');
      expect(content).toContain('2 failed');
    });
  });

  describe('getSummaryForPrompt', () => {
    it('should return summary of recent learnings', () => {
      // Add some learnings
      learningsManager.addLearning({
        pattern: 'Pattern 1',
        context: 'Context',
        insight: 'Insight 1',
        timestamp: new Date().toISOString(),
      });
      learningsManager.addGotcha({
        category: 'Category',
        issue: 'Issue',
        timestamp: new Date().toISOString(),
      });

      const summary = learningsManager.getSummaryForPrompt();
      expect(summary).toContain('Recent Learnings');
      expect(summary).toContain('Pattern 1');
    });

    it('should truncate if too long', () => {
      // Add many learnings to exceed limit
      for (let i = 0; i < 20; i++) {
        learningsManager.addLearning({
          pattern: `Pattern ${i}`,
          context: 'A'.repeat(100),
          insight: 'B'.repeat(100),
          timestamp: new Date().toISOString(),
        });
      }

      const summary = learningsManager.getSummaryForPrompt(500);
      expect(summary.length).toBeLessThanOrEqual(500);
      expect(summary).toContain('truncated');
    });
  });

  describe('getContent', () => {
    it('should return full file content', () => {
      const content = learningsManager.getContent();
      expect(content).toContain('# Ralph Learnings');
    });
  });
});

describe('createLearningsManager', () => {
  it('should create a learnings manager from filepath', () => {
    const testDir = join(tmpdir(), `ralph-test-${Date.now()}`);
    const filepath = join(testDir, 'LEARNINGS.md');

    const manager = createLearningsManager(filepath);
    expect(manager).toBeInstanceOf(LearningsManager);

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });
});

describe('processClaudeOutput', () => {
  let testDir: string;
  let learningsManager: LearningsManager;

  beforeEach(() => {
    testDir = join(tmpdir(), `ralph-learnings-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    learningsManager = new LearningsManager(join(testDir, 'LEARNINGS.md'));
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should extract and log learnings from output', () => {
    const output = `
I completed the task.

<learning>
Pattern: Memoization
Context: React components
Insight: Use useMemo for expensive calculations
</learning>

Done!
    `;

    const learnings = processClaudeOutput(output, learningsManager, 'task-1');
    expect(learnings).toHaveLength(1);

    const content = learningsManager.getContent();
    expect(content).toContain('Memoization');
  });

  it('should return empty array if no learnings', () => {
    const output = 'Just a simple completion message';
    const learnings = processClaudeOutput(output, learningsManager);
    expect(learnings).toHaveLength(0);
  });
});
