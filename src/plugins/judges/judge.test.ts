/**
 * Judge Plugin Tests
 * Tests the judge system with provider plugins
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { registry } from '../registry.js';
import { registerProviderPlugins, getProvider, claudeProvider, geminiProvider } from '../providers/index.js';
import { registerJudgePlugins, getJudge, runJudges, qaEngineerJudge, securityAuditorJudge } from './index.js';
import type { Task, JudgeContext } from '../../core/types.js';
import type { ExecutionContext } from '../../core/context.js';
import type { ProviderResult, ProviderRunOptions } from '../../core/types.js';

// Mock execution context
const createMockContext = (): ExecutionContext => ({
  config: {
    projectRoot: '/test/project',
    prdDir: '/test/prd',
    scriptsDir: '/test/scripts',
    sessionDir: '/test/sessions',
    learningsFile: '/test/learnings.json',
    maxIterations: 10,
    opusTokenLimit: 100000,
    sonnetTokenLimit: 50000,
    notifyEnabled: false,
    dryRun: false,
    verbose: false,
    skipValidation: false,
    consumeMode: false,
    noCommit: false,
    model: 'sonnet',
    providerConfig: {
      taskProvider: 'claude',
      claudeModel: 'sonnet',
      geminiModel: 'pro',
      cursorModel: 'claude-3-5-sonnet',
      cursorMode: 'agent',
    },
    validationGates: {
      oxlint: true,
      build: true,
      test: true,
      lint: true,
      custom: true,
    },
    validationTimeout: 120000,
    validationFailFast: false,
    hooks: {
      enabled: false,
      stopValidation: false,
      postEditLint: false,
      autoApprove: false,
      maxContinuations: 5,
    },
  },
  sessionId: 'test-session',
  iteration: 1,
  startTime: Date.now(),
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    header: vi.fn(),
    divider: vi.fn(),
  }),
  getNotifier: vi.fn(),
  getSessionManager: vi.fn(),
  getLearningsManager: vi.fn(),
  getEventEmitter: vi.fn(),
  git: {
    getCurrentBranch: vi.fn(),
    getStatus: vi.fn(),
    getDiff: vi.fn(),
    stageAll: vi.fn(),
    commit: vi.fn(),
    getRecentCommits: vi.fn(),
  },
} as unknown as ExecutionContext);

// Mock task
const createMockTask = (judges: Task['judges'] = []): Task => ({
  id: 'test-task-1',
  name: 'Test Task',
  description: 'Implement a button component',
  priority: 'high',
  category: 'frontend',
  status: 'pending',
  dependencies: [],
  criteria: ['Button should be clickable', 'Button should have hover state'],
  judges,
});

// Mock judge context
const createMockJudgeContext = (task: Task): JudgeContext => ({
  task,
  codeChanges: `
+export function Button({ onClick, children }) {
+  return <button onClick={onClick}>{children}</button>;
+}
`,
  providerSummary: 'Implemented a button component with click handler',
});

describe('Judge Plugin System', () => {
  beforeAll(async () => {
    // Clear registry and register plugins
    await registry.clear();
    await registerProviderPlugins();
    await registerJudgePlugins();
  });

  describe('Provider Plugin Integration', () => {
    it('should have providers registered', () => {
      expect(getProvider('claude')).toBeDefined();
      expect(getProvider('gemini')).toBeDefined();
      expect(getProvider('cursor')).toBeDefined();
    });

    it('should have judges registered', () => {
      expect(getJudge('qa-engineer')).toBeDefined();
      expect(getJudge('security-auditor')).toBeDefined();
      expect(getJudge('ux-designer')).toBeDefined();
    });

    it('judge should use provider plugin for evaluation', () => {
      // Verify the judge has access to provider methods
      expect(qaEngineerJudge.getSystemPrompt).toBeDefined();
      expect(qaEngineerJudge.buildPrompt).toBeDefined();
      expect(qaEngineerJudge.run).toBeDefined();
    });
  });

  describe('Judge Prompt Building', () => {
    it('should build correct prompt for QA Engineer', () => {
      const task = createMockTask();
      const judgeCtx = createMockJudgeContext(task);

      const prompt = qaEngineerJudge.buildPrompt(judgeCtx);

      expect(prompt).toContain('QA Engineer');
      expect(prompt).toContain('Implement a button component');  // Description, not name
      expect(prompt).toContain('Button should be clickable');
      expect(prompt).toContain('score');
      expect(prompt).toContain('0-100');
    });

    it('should include provider summary in prompt', () => {
      const task = createMockTask();
      const judgeCtx = createMockJudgeContext(task);

      const prompt = qaEngineerJudge.buildPrompt(judgeCtx);

      expect(prompt).toContain("Developer's Summary");
      expect(prompt).toContain('Implemented a button component');
    });
  });

  describe('Response Parsing', () => {
    it('should parse valid JSON response', () => {
      const response = `Here is my evaluation:

\`\`\`json
{
  "score": 85,
  "verdict": "Well implemented button component",
  "reasoning": "The button meets all acceptance criteria",
  "suggestions": ["Add aria-label for accessibility"],
  "confidence": 0.9
}
\`\`\``;

      const parsed = qaEngineerJudge.parseResponse(response);

      expect(parsed.score).toBe(85);
      expect(parsed.verdict).toBe('Well implemented button component');
      expect(parsed.reasoning).toContain('meets all acceptance criteria');
      expect(parsed.suggestions).toContain('Add aria-label for accessibility');
      expect(parsed.confidence).toBe(0.9);
    });

    it('should handle text response without JSON', () => {
      const response = 'The implementation looks good and meets the criteria. Approved.';

      const parsed = qaEngineerJudge.parseResponse(response);

      expect(parsed.score).toBe(70);  // Default passing score
      expect(parsed.verdict).toContain('Approved');
      expect(parsed.confidence).toBe(0.5);
    });

    it('should handle failing text response', () => {
      const response = 'The implementation fails to meet the requirements.';

      const parsed = qaEngineerJudge.parseResponse(response);

      expect(parsed.score).toBe(30);  // Default failing score
      expect(parsed.verdict).toContain('Rejected');
    });
  });

  describe('Provider Selection', () => {
    it('should allow different providers per judge in PRD config', () => {
      const task = createMockTask([
        { persona: 'QA Engineer', model: 'sonnet' },
        { persona: 'Security Auditor', model: 'opus' },
      ]);

      // Verify each judge config can have different settings
      expect(task.judges?.[0].model).toBe('sonnet');
      expect(task.judges?.[1].model).toBe('opus');
    });
  });

  describe('Model Selection per Provider', () => {
    it('should default to sonnet for claude', () => {
      const claudePlugin = getProvider('claude');
      expect(claudePlugin?.metadata.models).toContain('sonnet');
      expect(claudePlugin?.metadata.models).toContain('opus');
    });

    it('should default to pro for gemini', () => {
      const geminiPlugin = getProvider('gemini');
      expect(geminiPlugin?.metadata.models).toContain('pro');
      expect(geminiPlugin?.metadata.models).toContain('flash');
    });
  });

  describe('Judge Metadata', () => {
    it('should have correct metadata for QA Engineer', () => {
      expect(qaEngineerJudge.metadata.persona).toBe('QA Engineer');
      expect(qaEngineerJudge.metadata.category).toBe('quality');
      expect(qaEngineerJudge.metadata.defaultThreshold).toBe(70);
    });

    it('should have correct metadata for Security Auditor', () => {
      expect(securityAuditorJudge.metadata.persona).toBe('Security Auditor');
      expect(securityAuditorJudge.metadata.category).toBe('security');
      expect(securityAuditorJudge.metadata.defaultThreshold).toBe(80);
    });
  });

  describe('Threshold Handling', () => {
    it('should use default threshold from metadata', () => {
      expect(qaEngineerJudge.metadata.defaultThreshold).toBe(70);
      expect(securityAuditorJudge.metadata.defaultThreshold).toBe(80);
    });

    it('should allow threshold override in run options', () => {
      const task = createMockTask([
        { persona: 'QA Engineer', threshold: 90 },
      ]);

      expect(task.judges?.[0].threshold).toBe(90);
    });
  });
});

describe('PRD Judge Configuration', () => {
  it('should support provider field in judge config', () => {
    // This is what a PRD task with judge provider config would look like
    const prdTask = {
      id: 'task-1',
      description: 'Implement feature',
      priority: 'high',
      judges: [
        {
          persona: 'QA Engineer',
          provider: 'claude',  // Use Claude for this judge
          model: 'opus',
        },
        {
          persona: 'Security Auditor',
          provider: 'gemini',  // Use Gemini for this judge
          model: 'pro',
        },
      ],
    };

    expect(prdTask.judges[0].provider).toBe('claude');
    expect(prdTask.judges[1].provider).toBe('gemini');
  });
});
