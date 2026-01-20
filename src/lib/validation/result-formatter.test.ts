import { describe, it, expect } from 'vitest';
import {
  formatValidationCompact,
  extractValidationMetrics,
} from './result-formatter.js';
import type { ValidationResult, GateResult } from './validation.types.js';

describe('result-formatter', () => {
  const createMockGateResult = (overrides: Partial<GateResult> = {}): GateResult => ({
    gate: 'build',
    package: 'frontend',
    passed: true,
    duration: 1000,
    ...overrides,
  });

  const createMockValidationResult = (
    overrides: Partial<ValidationResult> = {}
  ): ValidationResult => ({
    last_run: new Date().toISOString(),
    passed: true,
    failed_gates: [],
    attempts: 1,
    gates: [],
    ...overrides,
  });

  describe('formatValidationCompact', () => {
    it('should format passed validation compactly', () => {
      const result = createMockValidationResult({
        passed: true,
        gates: [
          createMockGateResult({ gate: 'build', passed: true }),
          createMockGateResult({ gate: 'test', passed: true }),
        ],
      });

      const formatted = formatValidationCompact(result);
      expect(formatted).toContain('✓');
      expect(formatted).toContain('+frontend:build');
      expect(formatted).toContain('+frontend:test');
      expect(formatted).toContain('attempt 1');
    });

    it('should format failed validation compactly', () => {
      const result = createMockValidationResult({
        passed: false,
        failed_gates: ['frontend:test'],
        gates: [
          createMockGateResult({ gate: 'build', passed: true }),
          createMockGateResult({ gate: 'test', passed: false }),
        ],
      });

      const formatted = formatValidationCompact(result);
      expect(formatted).toContain('✗');
      expect(formatted).toContain('+frontend:build');
      expect(formatted).toContain('-frontend:test');
    });

    it('should show attempt count', () => {
      const result = createMockValidationResult({ attempts: 3 });
      const formatted = formatValidationCompact(result);
      expect(formatted).toContain('attempt 3');
    });
  });

  describe('extractValidationMetrics', () => {
    it('should calculate correct metrics for all passed', () => {
      const result = createMockValidationResult({
        gates: [
          createMockGateResult({ gate: 'build', duration: 1000, passed: true }),
          createMockGateResult({ gate: 'test', duration: 2000, passed: true }),
          createMockGateResult({ gate: 'lint', duration: 500, passed: true }),
        ],
      });

      const metrics = extractValidationMetrics(result);
      expect(metrics.totalDuration).toBe(3500);
      expect(metrics.passedCount).toBe(3);
      expect(metrics.failedCount).toBe(0);
      expect(metrics.gateBreakdown.build.passed).toBe(1);
      expect(metrics.gateBreakdown.build.failed).toBe(0);
    });

    it('should calculate correct metrics for mixed results', () => {
      const result = createMockValidationResult({
        gates: [
          createMockGateResult({ gate: 'build', duration: 1000, passed: true }),
          createMockGateResult({ gate: 'test', duration: 2000, passed: false }),
          createMockGateResult({ gate: 'lint', duration: 500, passed: false }),
        ],
      });

      const metrics = extractValidationMetrics(result);
      expect(metrics.passedCount).toBe(1);
      expect(metrics.failedCount).toBe(2);
      expect(metrics.gateBreakdown.test.failed).toBe(1);
      expect(metrics.gateBreakdown.lint.failed).toBe(1);
    });

    it('should handle empty gates array', () => {
      const result = createMockValidationResult({ gates: [] });
      const metrics = extractValidationMetrics(result);
      expect(metrics.totalDuration).toBe(0);
      expect(metrics.passedCount).toBe(0);
      expect(metrics.failedCount).toBe(0);
    });

    it('should aggregate same gate type across packages', () => {
      const result = createMockValidationResult({
        gates: [
          createMockGateResult({ package: 'frontend', gate: 'build', passed: true }),
          createMockGateResult({ package: 'backend', gate: 'build', passed: false }),
        ],
      });

      const metrics = extractValidationMetrics(result);
      expect(metrics.gateBreakdown.build.passed).toBe(1);
      expect(metrics.gateBreakdown.build.failed).toBe(1);
    });
  });
});
