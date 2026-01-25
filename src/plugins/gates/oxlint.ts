/**
 * Oxlint Gate Plugin
 * Fast Rust-based linter that runs before other gates
 */

import { BaseGatePlugin } from './base.js';
import type { GatePluginMetadata, BuiltinGatePlugin } from './types.js';
import type { Package } from '../../core/types.js';

// ============================================================================
// Oxlint Gate Plugin
// ============================================================================

export class OxlintGatePlugin extends BaseGatePlugin implements BuiltinGatePlugin {
  readonly builtin = true as const;

  readonly metadata: GatePluginMetadata = {
    name: 'oxlint',
    version: '1.0.0',
    description: 'Fast Rust-based linter for quick feedback',
    gateType: 'oxlint',
    supportedPackages: ['frontend', 'backend', 'electron'],
    priority: 10,  // Runs first (fastest)
  };

  protected commands: Partial<Record<Package, string>> = {
    frontend: 'npm run lint:ox',
    backend: 'npm run lint:ox',
    electron: 'npm run lint:ox',
  };

  parseOutput(output: string, exitCode: number): { passed: boolean; errorSummary?: string } {
    if (exitCode === 0) {
      return { passed: true };
    }

    // Oxlint output format:
    // × rule-name
    //   ╭─[path/to/file.ts:10:5]
    //   │
    // 10 │   problematic code
    //   ·   ^^^^^^^^^^^^^^^^
    //   ╰────

    const errors: string[] = [];

    // Match error indicators
    const errorMatches = output.match(/×\s+[\w-]+/g);
    if (errorMatches) {
      errors.push(...errorMatches.slice(0, 10));
    }

    // Look for file locations
    const locationMatches = output.match(/╭─\[([^\]]+)\]/g);
    if (locationMatches) {
      const locations = locationMatches.map(m => m.replace('╭─[', '').replace(']', ''));
      if (errors.length === 0) {
        errors.push(...locations.slice(0, 10));
      }
    }

    // Look for summary line
    const summaryMatch = output.match(/Found\s+(\d+)\s+(?:error|warning)/i);
    if (summaryMatch) {
      return {
        passed: false,
        errorSummary: `Oxlint: ${summaryMatch[0]}${errors.length > 0 ? '\n' + errors.join('\n') : ''}`,
      };
    }

    if (errors.length > 0) {
      return {
        passed: false,
        errorSummary: `Oxlint errors:\n${errors.join('\n')}`,
      };
    }

    return {
      passed: false,
      errorSummary: `Oxlint failed with exit code ${exitCode}`,
    };
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const oxlintGate = new OxlintGatePlugin();
