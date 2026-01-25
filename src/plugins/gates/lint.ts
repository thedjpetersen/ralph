/**
 * Lint Gate Plugin
 * Validates that ESLint passes
 */

import { BaseGatePlugin } from './base.js';
import type { GatePluginMetadata, BuiltinGatePlugin } from './types.js';
import type { Package } from '../../core/types.js';

// ============================================================================
// Lint Gate Plugin
// ============================================================================

export class LintGatePlugin extends BaseGatePlugin implements BuiltinGatePlugin {
  readonly builtin = true as const;

  readonly metadata: GatePluginMetadata = {
    name: 'lint',
    version: '1.0.0',
    description: 'Validates that ESLint passes',
    gateType: 'lint',
    supportedPackages: ['frontend', 'backend'],
    priority: 40,  // Runs after test (30)
  };

  protected commands: Partial<Record<Package, string>> = {
    frontend: 'npm run lint',
    backend: 'npm run lint',
  };

  parseOutput(output: string, exitCode: number): { passed: boolean; errorSummary?: string } {
    if (exitCode === 0) {
      return { passed: true };
    }

    // Look for ESLint error patterns
    const eslintErrors: string[] = [];

    // Pattern: /path/to/file.ts:10:5: error message
    const errorLines = output.match(/\S+:\d+:\d+:\s+error\s+.+/g);
    if (errorLines) {
      eslintErrors.push(...errorLines.slice(0, 10));
    }

    // Look for problem count
    const problemCount = output.match(/(\d+)\s+problems?\s+\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/);
    if (problemCount) {
      const summary = `${problemCount[2]} errors, ${problemCount[3]} warnings`;
      if (eslintErrors.length > 0) {
        return {
          passed: false,
          errorSummary: `ESLint: ${summary}\n${eslintErrors.join('\n')}`,
        };
      }
      return {
        passed: false,
        errorSummary: `ESLint: ${summary}`,
      };
    }

    if (eslintErrors.length > 0) {
      return {
        passed: false,
        errorSummary: `ESLint errors:\n${eslintErrors.join('\n')}`,
      };
    }

    return {
      passed: false,
      errorSummary: `Lint failed with exit code ${exitCode}`,
    };
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const lintGate = new LintGatePlugin();
