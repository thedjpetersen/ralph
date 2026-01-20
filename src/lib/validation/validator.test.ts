import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';

// Mock the gate-runner module
vi.mock('./gate-runner.js', () => ({
  runGate: vi.fn(),
  parseCustomValidations: vi.fn(() => []),
  runCustomValidation: vi.fn(),
}));

// Mock package-detector
vi.mock('./package-detector.js', () => ({
  getAffectedPackages: vi.fn(),
}));

import { runGate, parseCustomValidations } from './gate-runner.js';
import { getAffectedPackages } from './package-detector.js';
import { Validator, runValidation, shouldMarkComplete, getRetryMessage } from './validator.js';
import type { GateResult } from './validation.types.js';

const mockRunGate = vi.mocked(runGate);
const mockGetAffectedPackages = vi.mocked(getAffectedPackages);
const mockParseCustomValidations = vi.mocked(parseCustomValidations);

describe('validator', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `ralph-validator-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    vi.clearAllMocks();

    // Default mock: packages detected as frontend
    mockGetAffectedPackages.mockResolvedValue(['frontend']);
    mockParseCustomValidations.mockReturnValue([]);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  const createPassingGate = (gate: string, pkg: string): GateResult => ({
    gate: gate as any,
    package: pkg as any,
    passed: true,
    duration: 1000,
    output: 'Success',
  });

  const createFailingGate = (gate: string, pkg: string, error: string): GateResult => ({
    gate: gate as any,
    package: pkg as any,
    passed: false,
    duration: 1000,
    output: 'Failed',
    error_summary: error,
  });

  describe('Validator', () => {
    it('should run all gates for detected packages', async () => {
      mockRunGate.mockResolvedValue(createPassingGate('build', 'frontend'));

      const validator = new Validator({
        projectRoot: testDir,
        config: {
          gates: { oxlint: false, build: true, test: true, lint: true, custom: false },
          timeout: 60000,
          failFast: false,
        },
      });

      const result = await validator.validate();

      expect(result.passed).toBe(true);
      expect(mockRunGate).toHaveBeenCalledTimes(3); // build, test, lint
      expect(mockRunGate).toHaveBeenCalledWith('build', 'frontend', testDir, expect.anything());
      expect(mockRunGate).toHaveBeenCalledWith('test', 'frontend', testDir, expect.anything());
      expect(mockRunGate).toHaveBeenCalledWith('lint', 'frontend', testDir, expect.anything());
    });

    it('should fail when any gate fails', async () => {
      mockRunGate
        .mockResolvedValueOnce(createPassingGate('build', 'frontend'))
        .mockResolvedValueOnce(createFailingGate('test', 'frontend', 'Tests failed'))
        .mockResolvedValueOnce(createPassingGate('lint', 'frontend'));

      const validator = new Validator({
        projectRoot: testDir,
      });

      const result = await validator.validate();

      expect(result.passed).toBe(false);
      expect(result.failed_gates).toContain('frontend:test');
      expect(result.gates).toHaveLength(3);
    });

    it('should stop on first failure when failFast is true', async () => {
      mockRunGate
        .mockResolvedValueOnce(createFailingGate('build', 'frontend', 'Build failed'));

      const validator = new Validator({
        projectRoot: testDir,
        config: {
          gates: { oxlint: false, build: true, test: true, lint: true, custom: false },
          timeout: 60000,
          failFast: true,
        },
      });

      const result = await validator.validate();

      expect(result.passed).toBe(false);
      expect(mockRunGate).toHaveBeenCalledTimes(1); // Stopped after build
    });

    it('should validate multiple packages', async () => {
      mockGetAffectedPackages.mockResolvedValue(['frontend', 'backend']);
      mockRunGate.mockResolvedValue(createPassingGate('build', 'frontend'));

      const validator = new Validator({
        projectRoot: testDir,
        config: {
          gates: { oxlint: false, build: true, test: false, lint: false, custom: false },
          timeout: 60000,
          failFast: false,
        },
      });

      const result = await validator.validate();

      expect(result.passed).toBe(true);
      expect(mockRunGate).toHaveBeenCalledTimes(2); // build for each package
    });

    it('should skip disabled gates', async () => {
      mockRunGate.mockResolvedValue(createPassingGate('build', 'frontend'));

      const validator = new Validator({
        projectRoot: testDir,
        config: {
          gates: { oxlint: false, build: true, test: false, lint: false, custom: false },
          timeout: 60000,
          failFast: false,
        },
      });

      const result = await validator.validate();

      expect(mockRunGate).toHaveBeenCalledTimes(1);
      expect(mockRunGate).toHaveBeenCalledWith('build', 'frontend', testDir, expect.anything());
    });

    it('should track attempt count', async () => {
      mockRunGate.mockResolvedValue(createFailingGate('test', 'frontend', 'Fail'));

      const validator = new Validator({ projectRoot: testDir });

      const result1 = await validator.validate(0);
      expect(result1.attempts).toBe(1);

      const result2 = await validator.validate(2);
      expect(result2.attempts).toBe(3);
    });

    it('should pass custom timeout to gate runner', async () => {
      mockRunGate.mockResolvedValue(createPassingGate('build', 'frontend'));

      const validator = new Validator({
        projectRoot: testDir,
        config: {
          gates: { oxlint: false, build: true, test: false, lint: false, custom: false },
          timeout: 30000,
          failFast: false,
        },
      });

      await validator.validate();

      expect(mockRunGate).toHaveBeenCalledWith(
        'build',
        'frontend',
        testDir,
        expect.objectContaining({ timeout: 30000 })
      );
    });

    it('should use category for package detection', async () => {
      const validator = new Validator({
        projectRoot: testDir,
        category: 'backend-api',
      });

      await validator.validate();

      expect(mockGetAffectedPackages).toHaveBeenCalledWith(
        testDir,
        expect.objectContaining({ category: 'backend-api' })
      );
    });
  });

  describe('runValidation', () => {
    it('should be a convenience function that creates validator and runs', async () => {
      mockRunGate.mockResolvedValue(createPassingGate('build', 'frontend'));

      const result = await runValidation(testDir, {
        config: {
          gates: { oxlint: false, build: true, test: false, lint: false, custom: false },
          timeout: 60000,
          failFast: false,
        },
      });

      expect(result.passed).toBe(true);
      expect(result.last_run).toBeDefined();
    });
  });

  describe('shouldMarkComplete', () => {
    it('should return true when validation passed', () => {
      const result = {
        last_run: new Date().toISOString(),
        passed: true,
        failed_gates: [],
        attempts: 1,
        gates: [],
      };

      expect(shouldMarkComplete(result)).toBe(true);
    });

    it('should return false when validation failed', () => {
      const result = {
        last_run: new Date().toISOString(),
        passed: false,
        failed_gates: ['frontend:test'],
        attempts: 1,
        gates: [],
      };

      expect(shouldMarkComplete(result)).toBe(false);
    });
  });

  describe('getRetryMessage', () => {
    it('should return empty string for passed validation', () => {
      const result = {
        last_run: new Date().toISOString(),
        passed: true,
        failed_gates: [],
        attempts: 1,
        gates: [],
      };

      expect(getRetryMessage(result)).toBe('');
    });

    it('should include failed gates in message', () => {
      const result = {
        last_run: new Date().toISOString(),
        passed: false,
        failed_gates: ['frontend:build', 'frontend:test'],
        attempts: 2,
        gates: [],
      };

      const message = getRetryMessage(result);
      expect(message).toContain('frontend:build');
      expect(message).toContain('frontend:test');
      expect(message).toContain('attempt 2');
    });

    it('should include specific guidance for build failures', () => {
      const result = {
        last_run: new Date().toISOString(),
        passed: false,
        failed_gates: ['frontend:build'],
        attempts: 1,
        gates: [],
      };

      const message = getRetryMessage(result);
      expect(message).toContain('build');
      expect(message).toContain('type error');
    });

    it('should include specific guidance for test failures', () => {
      const result = {
        last_run: new Date().toISOString(),
        passed: false,
        failed_gates: ['backend:test'],
        attempts: 1,
        gates: [],
      };

      const message = getRetryMessage(result);
      expect(message).toContain('test');
    });

    it('should include specific guidance for lint failures', () => {
      const result = {
        last_run: new Date().toISOString(),
        passed: false,
        failed_gates: ['frontend:lint'],
        attempts: 1,
        gates: [],
      };

      const message = getRetryMessage(result);
      expect(message).toContain('lint');
    });
  });
});
