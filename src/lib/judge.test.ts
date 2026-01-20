import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock execa before importing
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';
import {
  runJudges,
  runJudge,
  requiresJudge,
  getJudgeCount,
  getRequiredJudges,
  formatJudgeResultsForConsole,
  formatJudgeResultsForDiscord,
  COMMON_PERSONAS,
} from './judge.js';
import type { PrdItem, JudgeConfig, JudgeResult, AggregatedJudgeResult } from './prd.js';

const mockExeca = vi.mocked(execa);

describe('judge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockPrdItem = (judges?: JudgeConfig[]): PrdItem => ({
    id: 'task-1',
    description: 'Implement user authentication',
    priority: 'high',
    acceptance_criteria: ['Users can log in', 'Sessions are secure'],
    judges,
  });

  const createMockJudgeContext = () => ({
    taskDescription: 'Implement user authentication',
    acceptanceCriteria: ['Users can log in', 'Sessions are secure'],
    codeChanges: '+ function login() { ... }',
    claudeSummary: 'Implemented login functionality',
  });

  // Helper to create mock Claude response
  const createMockClaudeResponse = (result: {
    passed: boolean;
    verdict: string;
    reasoning: string;
    confidence: number;
    suggestions?: string[];
  }) => {
    return {
      stdout: `Here is my evaluation:

\`\`\`json
${JSON.stringify(result)}
\`\`\`
`,
      stderr: '',
      exitCode: 0,
    };
  };

  describe('runJudges - core execution', () => {
    it('should run all judges and aggregate results', async () => {
      const item = createMockPrdItem([
        { persona: 'QA Engineer' },
        { persona: 'Security Auditor' },
      ]);

      mockExeca
        .mockResolvedValueOnce(createMockClaudeResponse({
          passed: true,
          verdict: 'Looks good',
          reasoning: 'All criteria met',
          confidence: 0.9,
        }) as any)
        .mockResolvedValueOnce(createMockClaudeResponse({
          passed: true,
          verdict: 'Secure',
          reasoning: 'No vulnerabilities found',
          confidence: 0.85,
        }) as any);

      const result = await runJudges(item, createMockJudgeContext(), '/test/project');

      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].persona).toBe('QA Engineer');
      expect(result.results[1].persona).toBe('Security Auditor');
      expect(mockExeca).toHaveBeenCalledTimes(2);
    });

    it('should fail when a required judge fails', async () => {
      const item = createMockPrdItem([
        { persona: 'QA Engineer', required: true },
        { persona: 'UX Designer', required: false },
      ]);

      mockExeca
        .mockResolvedValueOnce(createMockClaudeResponse({
          passed: false,
          verdict: 'Missing tests',
          reasoning: 'No unit tests for login function',
          confidence: 0.95,
        }) as any)
        .mockResolvedValueOnce(createMockClaudeResponse({
          passed: true,
          verdict: 'UI looks good',
          reasoning: 'Clean interface',
          confidence: 0.8,
        }) as any);

      const result = await runJudges(item, createMockJudgeContext(), '/test/project');

      expect(result.passed).toBe(false);
      expect(result.summary).toContain('QA Engineer');
    });

    it('should pass when only optional judges fail', async () => {
      const item = createMockPrdItem([
        { persona: 'QA Engineer', required: true },
        { persona: 'UX Designer', required: false },
      ]);

      mockExeca
        .mockResolvedValueOnce(createMockClaudeResponse({
          passed: true,
          verdict: 'Good',
          reasoning: 'Tests pass',
          confidence: 0.9,
        }) as any)
        .mockResolvedValueOnce(createMockClaudeResponse({
          passed: false,
          verdict: 'Could improve',
          reasoning: 'Minor UI issues',
          confidence: 0.7,
        }) as any);

      const result = await runJudges(item, createMockJudgeContext(), '/test/project');

      expect(result.passed).toBe(true);
    });

    it('should use sonnet model by default', async () => {
      const item = createMockPrdItem([{ persona: 'QA Engineer' }]);

      mockExeca.mockResolvedValueOnce(createMockClaudeResponse({
        passed: true,
        verdict: 'Good',
        reasoning: 'OK',
        confidence: 0.9,
      }) as any);

      await runJudges(item, createMockJudgeContext(), '/test/project');

      expect(mockExeca).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--model', 'sonnet']),
        expect.anything()
      );
    });

    it('should use specified model', async () => {
      const item = createMockPrdItem([{ persona: 'QA Engineer', model: 'opus' }]);

      mockExeca.mockResolvedValueOnce(createMockClaudeResponse({
        passed: true,
        verdict: 'Good',
        reasoning: 'OK',
        confidence: 0.9,
      }) as any);

      await runJudges(item, createMockJudgeContext(), '/test/project');

      expect(mockExeca).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--model', 'opus']),
        expect.anything()
      );
    });

    it('should stop early with failFast option', async () => {
      const item = createMockPrdItem([
        { persona: 'QA Engineer', required: true },
        { persona: 'Security Auditor', required: true },
      ]);

      mockExeca.mockResolvedValueOnce(createMockClaudeResponse({
        passed: false,
        verdict: 'Failed',
        reasoning: 'Missing tests',
        confidence: 0.9,
      }) as any);

      const result = await runJudges(
        item,
        createMockJudgeContext(),
        '/test/project',
        { failFast: true }
      );

      expect(result.passed).toBe(false);
      expect(mockExeca).toHaveBeenCalledTimes(1); // Only first judge called
    });

    it('should handle malformed JSON response', async () => {
      const item = createMockPrdItem([{ persona: 'QA Engineer' }]);

      mockExeca.mockResolvedValueOnce({
        stdout: 'This is not JSON, but I approve this code.',
        stderr: '',
        exitCode: 0,
      } as any);

      const result = await runJudges(item, createMockJudgeContext(), '/test/project');

      // Should parse text and find "approve"
      expect(result.results[0].passed).toBe(true);
      expect(result.results[0].confidence).toBe(0.5); // Lower confidence for text parsing
    });

    it('should handle Claude execution error', async () => {
      const item = createMockPrdItem([{ persona: 'QA Engineer' }]);

      mockExeca.mockRejectedValueOnce(new Error('Claude CLI not found'));

      const result = await runJudges(item, createMockJudgeContext(), '/test/project');

      expect(result.passed).toBe(false);
      expect(result.results[0].verdict).toBe('Evaluation failed');
      expect(result.results[0].confidence).toBe(0);
    });

    it('should include custom criteria in prompt', async () => {
      const item = createMockPrdItem([{
        persona: 'Security Auditor',
        criteria: ['Check for SQL injection', 'Verify CSRF protection'],
      }]);

      mockExeca.mockResolvedValueOnce(createMockClaudeResponse({
        passed: true,
        verdict: 'Secure',
        reasoning: 'All good',
        confidence: 0.9,
      }) as any);

      await runJudges(item, createMockJudgeContext(), '/test/project');

      const callArgs = mockExeca.mock.calls[0]!;
      const args = callArgs[1] as string[];
      const prompt = args[args.length - 1]; // Last arg is prompt

      expect(prompt).toContain('SQL injection');
      expect(prompt).toContain('CSRF protection');
    });

    it('should note when evidence is required but missing', async () => {
      const item = createMockPrdItem([{
        persona: 'UX Designer',
        requireEvidence: true,
      }]);

      const context = createMockJudgeContext();
      // No evidence path set

      mockExeca.mockResolvedValueOnce(createMockClaudeResponse({
        passed: false,
        verdict: 'Cannot verify without screenshot',
        reasoning: 'No visual evidence provided',
        confidence: 0.6,
      }) as any);

      await runJudges(item, context, '/test/project');

      const args = mockExeca.mock.calls[0]![1] as string[];
      const prompt = args[args.length - 1];
      expect(prompt).toContain('Evidence Required');
    });

    it('should run judges in parallel by default', async () => {
      const item = createMockPrdItem([
        { persona: 'QA Engineer' },
        { persona: 'Security Auditor' },
        { persona: 'UX Designer' },
      ]);

      let callOrder: number[] = [];
      let callCount = 0;

      mockExeca.mockImplementation((): any => {
        const myCall = ++callCount;
        callOrder.push(myCall);
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createMockClaudeResponse({
              passed: true,
              verdict: 'Good',
              reasoning: 'OK',
              confidence: 0.9,
            }));
          }, 10);
        });
      });

      await runJudges(item, createMockJudgeContext(), '/test/project', { parallel: true });

      // All calls should start before any complete
      expect(callOrder).toEqual([1, 2, 3]);
    });

    it('should return early when no judges configured', async () => {
      const item = createMockPrdItem([]);

      const result = await runJudges(item, createMockJudgeContext(), '/test/project');

      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(0);
      expect(result.summary).toBe('No judges configured');
      expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should collect suggestions from all judges', async () => {
      const item = createMockPrdItem([
        { persona: 'QA Engineer' },
        { persona: 'Security Auditor' },
      ]);

      mockExeca
        .mockResolvedValueOnce(createMockClaudeResponse({
          passed: true,
          verdict: 'Good',
          reasoning: 'OK',
          confidence: 0.9,
          suggestions: ['Add more unit tests'],
        }) as any)
        .mockResolvedValueOnce(createMockClaudeResponse({
          passed: true,
          verdict: 'Secure',
          reasoning: 'OK',
          confidence: 0.9,
          suggestions: ['Consider rate limiting', 'Add more unit tests'],
        }) as any);

      const result = await runJudges(item, createMockJudgeContext(), '/test/project');

      const allSuggestions = result.results.flatMap(r => r.suggestions || []);
      expect(allSuggestions).toContain('Add more unit tests');
      expect(allSuggestions).toContain('Consider rate limiting');
    });
  });

  describe('requiresJudge', () => {
    it('should return true when judges array has items', () => {
      expect(requiresJudge(createMockPrdItem([{ persona: 'QA' }]))).toBe(true);
    });

    it('should return false when judges is empty', () => {
      expect(requiresJudge(createMockPrdItem([]))).toBe(false);
    });

    it('should return false when judges is undefined', () => {
      expect(requiresJudge(createMockPrdItem())).toBe(false);
    });
  });

  describe('getJudgeCount', () => {
    it('should return count of judges', () => {
      expect(getJudgeCount(createMockPrdItem([
        { persona: 'A' },
        { persona: 'B' },
      ]))).toBe(2);
    });

    it('should return 0 for no judges', () => {
      expect(getJudgeCount(createMockPrdItem())).toBe(0);
    });
  });

  describe('getRequiredJudges', () => {
    it('should filter to only required judges', () => {
      const item = createMockPrdItem([
        { persona: 'QA', required: true },
        { persona: 'UX', required: false },
        { persona: 'Security' },  // Default to required
      ]);

      const required = getRequiredJudges(item);
      expect(required).toHaveLength(2);
      expect(required.map(j => j.persona)).toEqual(['QA', 'Security']);
    });
  });

  describe('formatJudgeResultsForConsole', () => {
    it('should format passing results with green', () => {
      const result: AggregatedJudgeResult = {
        passed: true,
        results: [{
          passed: true,
          persona: 'QA Engineer',
          verdict: 'Approved',
          reasoning: 'All good',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        }],
        summary: 'All judges approved',
        timestamp: new Date().toISOString(),
      };

      const formatted = formatJudgeResultsForConsole(result);
      expect(formatted).toContain('APPROVED');
      expect(formatted).toContain('QA Engineer');
      expect(formatted).toContain('90%');
    });

    it('should format failing results with red', () => {
      const result: AggregatedJudgeResult = {
        passed: false,
        results: [{
          passed: false,
          persona: 'QA Engineer',
          verdict: 'Rejected',
          reasoning: 'Missing tests',
          confidence: 0.95,
          timestamp: new Date().toISOString(),
        }],
        summary: 'QA Engineer rejected',
        timestamp: new Date().toISOString(),
      };

      const formatted = formatJudgeResultsForConsole(result);
      expect(formatted).toContain('REJECTED');
    });

    it('should combine and dedupe suggestions', () => {
      const result: AggregatedJudgeResult = {
        passed: true,
        results: [
          {
            passed: true,
            persona: 'QA',
            verdict: 'OK',
            reasoning: 'Good',
            confidence: 0.9,
            suggestions: ['Add tests', 'Fix types'],
            timestamp: new Date().toISOString(),
          },
          {
            passed: true,
            persona: 'Security',
            verdict: 'OK',
            reasoning: 'Good',
            confidence: 0.9,
            suggestions: ['Add tests', 'Add logging'],  // 'Add tests' is duplicate
            timestamp: new Date().toISOString(),
          },
        ],
        summary: 'All passed',
        timestamp: new Date().toISOString(),
      };

      const formatted = formatJudgeResultsForConsole(result);
      // Should only show "Add tests" once in suggestions
      const testMatches = formatted.match(/Add tests/g);
      expect(testMatches?.length).toBe(1);
    });
  });

  describe('formatJudgeResultsForDiscord', () => {
    it('should use Discord markdown formatting', () => {
      const result: AggregatedJudgeResult = {
        passed: true,
        results: [{
          passed: true,
          persona: 'QA',
          verdict: 'Good',
          reasoning: 'OK',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        }],
        summary: 'All passed',
        timestamp: new Date().toISOString(),
      };

      const formatted = formatJudgeResultsForDiscord(result);
      expect(formatted).toContain('**APPROVED**');
      expect(formatted).toContain('✅');
    });

    it('should truncate to Discord limit', () => {
      const result: AggregatedJudgeResult = {
        passed: true,
        results: Array(10).fill(null).map(() => ({
          passed: true,
          persona: 'Judge',
          verdict: 'A'.repeat(200),
          reasoning: 'B'.repeat(500),
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        })),
        summary: 'All passed',
        timestamp: new Date().toISOString(),
      };

      const formatted = formatJudgeResultsForDiscord(result);
      expect(formatted.length).toBeLessThanOrEqual(1900);
    });
  });

  describe('COMMON_PERSONAS', () => {
    it('should have all standard personas defined', () => {
      expect(COMMON_PERSONAS.QA).toBeDefined();
      expect(COMMON_PERSONAS.UX).toBeDefined();
      expect(COMMON_PERSONAS.SECURITY).toBeDefined();
      expect(COMMON_PERSONAS.PERFORMANCE).toBeDefined();
      expect(COMMON_PERSONAS.ARCHITECT).toBeDefined();
    });

    it('should have criteria for each persona', () => {
      Object.values(COMMON_PERSONAS).forEach(persona => {
        expect(persona.criteria).toBeDefined();
        expect(persona.criteria!.length).toBeGreaterThan(0);
      });
    });

    it('should have UX require evidence', () => {
      expect(COMMON_PERSONAS.UX.requireEvidence).toBe(true);
    });
  });
});
