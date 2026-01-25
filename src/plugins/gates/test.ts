/**
 * Test Gate Plugin
 * Validates that all tests pass
 */

import { BaseGatePlugin } from './base.js';
import type { GatePluginMetadata, BuiltinGatePlugin } from './types.js';
import type { Package } from '../../core/types.js';

// ============================================================================
// Test Gate Plugin
// ============================================================================

export class TestGatePlugin extends BaseGatePlugin implements BuiltinGatePlugin {
  readonly builtin = true as const;

  readonly metadata: GatePluginMetadata = {
    name: 'test',
    version: '1.0.0',
    description: 'Validates that all tests pass',
    gateType: 'test',
    supportedPackages: ['frontend', 'backend', 'electron', 'mobile'],
    priority: 30,  // Runs after build (20)
  };

  protected commands: Partial<Record<Package, string>> = {
    frontend: 'npm test -- --run',
    backend: 'npm test -- --run',
    electron: 'npm test -- --run',
    mobile: 'npm test -- --run',
  };

  parseOutput(output: string, exitCode: number): { passed: boolean; errorSummary?: string } {
    if (exitCode === 0) {
      return { passed: true };
    }

    // Look for test failure patterns (Vitest, Jest)
    const failedTests: string[] = [];

    // Vitest pattern: FAIL  src/path/to/test.ts > test name
    const vitestFails = output.match(/FAIL\s+.+/g);
    if (vitestFails) {
      failedTests.push(...vitestFails.slice(0, 5));
    }

    // Jest pattern: ✕ test name
    const jestFails = output.match(/✕\s+.+/g);
    if (jestFails) {
      failedTests.push(...jestFails.slice(0, 5));
    }

    // Look for assertion errors
    const assertionErrors = output.match(/AssertionError:.+/g);
    if (assertionErrors) {
      failedTests.push(...assertionErrors.slice(0, 3));
    }

    if (failedTests.length > 0) {
      return {
        passed: false,
        errorSummary: `Failed tests:\n${failedTests.join('\n')}`,
      };
    }

    // Extract test summary line
    const summaryMatch = output.match(/Tests:\s+\d+\s+failed/i);
    if (summaryMatch) {
      return {
        passed: false,
        errorSummary: summaryMatch[0],
      };
    }

    return {
      passed: false,
      errorSummary: `Tests failed with exit code ${exitCode}`,
    };
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const testGate = new TestGatePlugin();
