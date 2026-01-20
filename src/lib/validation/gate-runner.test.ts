import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';

// Mock execa before importing the module
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

import { execa } from 'execa';
import { runGate, parseCustomValidations } from './gate-runner.js';

const mockExeca = vi.mocked(execa);

describe('gate-runner', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `ralph-gate-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create mock package structure
    mkdirSync(join(testDir, 'frontend'), { recursive: true });
    mkdirSync(join(testDir, 'backend'), { recursive: true });
    writeFileSync(join(testDir, 'frontend', 'package.json'), '{}');
    writeFileSync(join(testDir, 'backend', 'package.json'), '{}');

    vi.clearAllMocks();
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('runGate', () => {
    it('should run build gate successfully', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: 'Build completed successfully',
        stderr: '',
        exitCode: 0,
      } as any);

      const result = await runGate('build', 'frontend', testDir);

      expect(result.passed).toBe(true);
      expect(result.gate).toBe('build');
      expect(result.package).toBe('frontend');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(mockExeca).toHaveBeenCalledWith(
        'sh',
        ['-c', 'npm run build'],
        expect.objectContaining({
          cwd: join(testDir, 'frontend'),
        })
      );
    });

    it('should detect build failure from exit code', async () => {
      mockExeca.mockRejectedValueOnce({
        stdout: '',
        stderr: 'error TS2304: Cannot find name "foo"',
        message: 'Command failed',
        exitCode: 1,
      });

      const result = await runGate('build', 'frontend', testDir);

      expect(result.passed).toBe(false);
      expect(result.error_summary).toContain('Cannot find name');
    });

    it('should detect test failure from output patterns', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: 'FAIL src/test.ts\n2 tests failed',
        stderr: '',
        exitCode: 0,  // Some test runners exit 0 even on failure
      } as any);

      const result = await runGate('test', 'frontend', testDir);

      expect(result.passed).toBe(false);
      expect(result.error_summary).toBeDefined();
    });

    it('should detect lint errors from output', async () => {
      // Use oxlint format with actual errors
      mockExeca.mockResolvedValueOnce({
        stdout: 'src/file.ts:10 error: Unexpected any\nFound 0 warnings and 5 errors.',
        stderr: '',
        exitCode: 0,
      } as any);

      const result = await runGate('lint', 'frontend', testDir);

      expect(result.passed).toBe(false);
    });

    it('should pass when lint output is clean', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: 'All files pass linting',
        stderr: '',
        exitCode: 0,
      } as any);

      const result = await runGate('lint', 'frontend', testDir);

      expect(result.passed).toBe(true);
    });

    it('should skip when package directory does not exist', async () => {
      const result = await runGate('build', 'mobile', testDir);

      expect(result.passed).toBe(true);
      expect(result.output).toContain('not found');
      expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should skip when no command is configured for gate', async () => {
      // chrome-extension has no test command configured
      mkdirSync(join(testDir, 'chrome-extension'), { recursive: true });
      writeFileSync(join(testDir, 'chrome-extension', 'package.json'), '{}');

      const result = await runGate('test', 'chrome-extension', testDir);

      expect(result.passed).toBe(true);
      expect(result.output).toContain('No command configured');
    });

    it('should handle timeout', async () => {
      mockExeca.mockRejectedValueOnce({
        message: 'Timed out',
        timedOut: true,
      });

      const result = await runGate('test', 'frontend', testDir, { timeout: 1000 });

      expect(result.passed).toBe(false);
      expect(result.error_summary).toContain('Timed out');
    });

    it('should run custom command when provided', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: 'Custom check passed',
        stderr: '',
        exitCode: 0,
      } as any);

      const result = await runGate('custom', 'frontend', testDir, {
        customCommand: 'npm run custom-check',
      });

      expect(result.passed).toBe(true);
      expect(mockExeca).toHaveBeenCalledWith(
        'sh',
        ['-c', 'npm run custom-check'],
        expect.anything()
      );
    });

    it('should extract TypeScript error codes', async () => {
      mockExeca.mockRejectedValueOnce({
        stdout: '',
        stderr: 'src/file.ts(10,5): error TS2339: Property "x" does not exist',
        message: 'Command failed',
      });

      const result = await runGate('build', 'frontend', testDir);

      expect(result.passed).toBe(false);
      expect(result.error_summary).toContain('TS2339');
    });

    it('should measure duration accurately', async () => {
      mockExeca.mockImplementationOnce((): any => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            stdout: 'Done',
            stderr: '',
            exitCode: 0,
          }), 50);
        });
      });

      const result = await runGate('build', 'frontend', testDir);

      expect(result.duration).toBeGreaterThanOrEqual(50);
      expect(result.duration).toBeLessThan(200);  // Should not be too long
    });

    it('should set CI environment variable', async () => {
      mockExeca.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
        exitCode: 0,
      } as any);

      await runGate('build', 'frontend', testDir);

      expect(mockExeca).toHaveBeenCalledWith(
        'sh',
        expect.anything(),
        expect.objectContaining({
          env: expect.objectContaining({
            CI: 'true',
          }),
        })
      );
    });
  });

  describe('parseCustomValidations', () => {
    it('should parse VALIDATE comments from notes', () => {
      const notes = `
        Some notes here.
        VALIDATE: 'npm run typecheck'
        More notes.
        VALIDATE: "npm run e2e"
      `;

      const validations = parseCustomValidations(notes, 'frontend');

      expect(validations).toHaveLength(2);
      expect(validations[0].command).toBe('npm run typecheck');
      expect(validations[1].command).toBe('npm run e2e');
      expect(validations[0].package).toBe('frontend');
    });

    it('should return empty array when no VALIDATE comments', () => {
      const notes = 'Just regular notes without any validation commands';
      const validations = parseCustomValidations(notes, 'frontend');
      expect(validations).toHaveLength(0);
    });

    it('should handle single quotes and double quotes', () => {
      const notes = `VALIDATE: 'single' and VALIDATE: "double"`;
      const validations = parseCustomValidations(notes, 'backend');

      expect(validations).toHaveLength(2);
      expect(validations[0].command).toBe('single');
      expect(validations[1].command).toBe('double');
    });

    it('should handle complex commands with flags', () => {
      const notes = `VALIDATE: 'npm test -- --coverage --watch=false'`;
      const validations = parseCustomValidations(notes, 'frontend');

      expect(validations[0].command).toBe('npm test -- --coverage --watch=false');
    });
  });
});
