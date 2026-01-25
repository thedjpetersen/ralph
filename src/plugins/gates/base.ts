/**
 * Base Gate Implementation
 * Shared logic for all gate plugins
 */

import { execa } from 'execa';
import type { GatePlugin, GateRunOptions, GatePluginMetadata } from './types.js';
import type { ExecutionContext } from '../../core/context.js';
import type { GateResult, GateType, Package } from '../../core/types.js';

// ============================================================================
// Package Directory Mappings
// ============================================================================

export const PACKAGE_DIRS: Record<Package, string> = {
  frontend: 'frontend',
  backend: 'backend',
  electron: 'electron',
  mobile: 'mobile',
  'chrome-extension': 'chrome-extension',
};

// ============================================================================
// Base Gate Class
// ============================================================================

export abstract class BaseGatePlugin implements GatePlugin {
  abstract readonly metadata: GatePluginMetadata;

  /**
   * Commands for each package - override in subclass
   */
  protected abstract commands: Partial<Record<Package, string>>;

  appliesTo(packageName: Package): boolean {
    return packageName in this.commands && this.commands[packageName] !== undefined;
  }

  getCommand(packageName: Package): string | undefined {
    return this.commands[packageName];
  }

  /**
   * Default output parsing - override in subclass for custom logic
   */
  parseOutput(output: string, exitCode: number): { passed: boolean; errorSummary?: string } {
    if (exitCode === 0) {
      return { passed: true };
    }

    // Extract error summary from output
    const lines = output.split('\n').filter(line => line.trim());
    const errorSummary = lines.slice(-10).join('\n');

    return {
      passed: false,
      errorSummary: errorSummary || `Exit code: ${exitCode}`,
    };
  }

  async run(ctx: ExecutionContext, options: GateRunOptions): Promise<GateResult> {
    const startTime = Date.now();
    const command = this.getCommand(options.packageName);
    const logger = ctx.getLogger();

    if (!command) {
      return {
        gate: this.metadata.gateType,
        package: options.packageName,
        passed: true,
        duration: 0,
        output: 'No command configured for this package',
      };
    }

    const packageDir = PACKAGE_DIRS[options.packageName] || options.packageName;
    const cwd = `${options.projectRoot}/${packageDir}`;

    logger.info(`  Running ${this.metadata.gateType} gate for ${options.packageName}...`);

    try {
      const { stdout, stderr, exitCode } = await execa('sh', ['-c', command], {
        cwd,
        timeout: options.timeout || 120000,
        reject: false,
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      const output = stdout + (stderr ? `\n${stderr}` : '');
      const { passed, errorSummary } = this.parseOutput(output, exitCode ?? 1);
      const duration = Date.now() - startTime;

      return {
        gate: this.metadata.gateType,
        package: options.packageName,
        passed,
        duration,
        output: passed ? undefined : output,
        error_summary: errorSummary,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        gate: this.metadata.gateType,
        package: options.packageName,
        passed: false,
        duration,
        error_summary: `Gate execution failed: ${errorMessage}`,
      };
    }
  }
}

// ============================================================================
// Custom Gate Support
// ============================================================================

export interface CustomValidation {
  name: string;
  command: string;
  package: Package;
}

/**
 * Parse custom validation from task notes
 */
export function parseCustomValidation(notes: string): CustomValidation[] {
  const validations: CustomValidation[] = [];

  // Match patterns like:
  // validate:frontend:npm run custom-check
  // custom:backend:./scripts/validate.sh
  const patterns = [
    /validate:(\w+):(.+)/g,
    /custom:(\w+):(.+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(notes)) !== null) {
      const packageName = match[1] as Package;
      const command = match[2].trim();

      if (isValidPackage(packageName)) {
        validations.push({
          name: `custom-${validations.length + 1}`,
          command,
          package: packageName,
        });
      }
    }
  }

  return validations;
}

function isValidPackage(value: string): value is Package {
  return ['frontend', 'backend', 'electron', 'mobile', 'chrome-extension'].includes(value);
}
