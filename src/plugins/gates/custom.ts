/**
 * Custom Gate Plugin
 * Runs custom validation commands from task notes
 */

import { execa } from 'execa';
import { BaseGatePlugin, parseCustomValidation, PACKAGE_DIRS } from './base.js';
import type { GatePluginMetadata, BuiltinGatePlugin, GateRunOptions } from './types.js';
import type { ExecutionContext } from '../../core/context.js';
import type { GateResult, Package } from '../../core/types.js';

// ============================================================================
// Custom Gate Plugin
// ============================================================================

export class CustomGatePlugin extends BaseGatePlugin implements BuiltinGatePlugin {
  readonly builtin = true as const;

  readonly metadata: GatePluginMetadata = {
    name: 'custom',
    version: '1.0.0',
    description: 'Runs custom validation commands from task notes',
    gateType: 'custom',
    supportedPackages: ['frontend', 'backend', 'electron', 'mobile', 'chrome-extension'],
    priority: 50,  // Runs last
  };

  // Custom gate doesn't have static commands
  protected commands: Partial<Record<Package, string>> = {};

  appliesTo(packageName: Package): boolean {
    // Custom gate always potentially applies - actual check is in run()
    return true;
  }

  getCommand(_packageName: Package): string | undefined {
    // Commands come from task notes
    return undefined;
  }

  async run(ctx: ExecutionContext, options: GateRunOptions): Promise<GateResult> {
    const logger = ctx.getLogger();

    // Parse custom validations from task notes
    if (!options.taskNotes) {
      return {
        gate: 'custom',
        package: options.packageName,
        passed: true,
        duration: 0,
        output: 'No custom validation specified',
      };
    }

    const customValidations = parseCustomValidation(options.taskNotes);

    // Filter to validations for this package
    const packageValidations = customValidations.filter(v => v.package === options.packageName);

    if (packageValidations.length === 0) {
      return {
        gate: 'custom',
        package: options.packageName,
        passed: true,
        duration: 0,
        output: 'No custom validation for this package',
      };
    }

    const startTime = Date.now();
    const results: { name: string; passed: boolean; output: string }[] = [];

    for (const validation of packageValidations) {
      logger.info(`  Running custom validation: ${validation.name}...`);

      const packageDir = PACKAGE_DIRS[options.packageName] || options.packageName;
      const cwd = `${options.projectRoot}/${packageDir}`;

      try {
        const { stdout, stderr, exitCode } = await execa('sh', ['-c', validation.command], {
          cwd,
          timeout: options.timeout || 120000,
          reject: false,
          env: { ...process.env, FORCE_COLOR: '0' },
        });

        const output = stdout + (stderr ? `\n${stderr}` : '');
        const passed = exitCode === 0;

        results.push({
          name: validation.name,
          passed,
          output: passed ? '' : output,
        });

        if (!passed) {
          // Stop on first failure
          break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          name: validation.name,
          passed: false,
          output: `Command failed: ${errorMessage}`,
        });
        break;
      }
    }

    const duration = Date.now() - startTime;
    const allPassed = results.every(r => r.passed);
    const failedResults = results.filter(r => !r.passed);

    return {
      gate: 'custom',
      package: options.packageName,
      passed: allPassed,
      duration,
      output: allPassed ? undefined : failedResults.map(r => r.output).join('\n'),
      error_summary: allPassed ? undefined : `Custom validation failed: ${failedResults.map(r => r.name).join(', ')}`,
    };
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const customGate = new CustomGatePlugin();
