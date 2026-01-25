/**
 * Build Gate Plugin
 * Validates that the project builds successfully
 */

import { BaseGatePlugin } from './base.js';
import type { GatePluginMetadata, BuiltinGatePlugin } from './types.js';
import type { Package } from '../../core/types.js';

// ============================================================================
// Build Gate Plugin
// ============================================================================

export class BuildGatePlugin extends BaseGatePlugin implements BuiltinGatePlugin {
  readonly builtin = true as const;

  readonly metadata: GatePluginMetadata = {
    name: 'build',
    version: '1.0.0',
    description: 'Validates that the project builds successfully',
    gateType: 'build',
    supportedPackages: ['frontend', 'backend', 'electron', 'mobile', 'chrome-extension'],
    priority: 20,  // Runs after oxlint (10)
  };

  protected commands: Partial<Record<Package, string>> = {
    frontend: 'npm run build',
    backend: 'npm run build',
    electron: 'npm run build:main',
    mobile: 'npx tsc --noEmit',
    'chrome-extension': 'npm run build',
  };

  parseOutput(output: string, exitCode: number): { passed: boolean; errorSummary?: string } {
    if (exitCode === 0) {
      return { passed: true };
    }

    // Look for TypeScript errors
    const tsErrors = output.match(/error TS\d+:.+/g);
    if (tsErrors && tsErrors.length > 0) {
      return {
        passed: false,
        errorSummary: `TypeScript errors:\n${tsErrors.slice(0, 5).join('\n')}${tsErrors.length > 5 ? `\n... and ${tsErrors.length - 5} more` : ''}`,
      };
    }

    // Generic error extraction
    const lines = output.split('\n').filter(line =>
      line.toLowerCase().includes('error') ||
      line.toLowerCase().includes('failed')
    );

    return {
      passed: false,
      errorSummary: lines.slice(0, 10).join('\n') || `Build failed with exit code ${exitCode}`,
    };
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const buildGate = new BuildGatePlugin();
