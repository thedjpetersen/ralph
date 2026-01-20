/**
 * Validator - main orchestrator for validation gates
 */

import { logger } from '../logger.js';
import {
  GateType,
  GateResult,
  ValidationResult,
  ValidationConfig,
  DEFAULT_VALIDATION_CONFIG,
} from './validation.types.js';
import { getAffectedPackages } from './package-detector.js';
import { runGate, parseCustomValidations, runCustomValidation } from './gate-runner.js';

export interface ValidatorOptions {
  projectRoot: string;
  config?: Partial<ValidationConfig>;
  category?: string;
  taskNotes?: string;
}

/**
 * Main validator class
 */
export class Validator {
  private projectRoot: string;
  private config: ValidationConfig;
  private category?: string;
  private taskNotes?: string;

  constructor(options: ValidatorOptions) {
    this.projectRoot = options.projectRoot;
    this.config = {
      ...DEFAULT_VALIDATION_CONFIG,
      ...options.config,
      gates: {
        ...DEFAULT_VALIDATION_CONFIG.gates,
        ...options.config?.gates,
      },
    };
    this.category = options.category;
    this.taskNotes = options.taskNotes;
  }

  /**
   * Run all validation gates
   */
  async validate(previousAttempts: number = 0): Promise<ValidationResult> {
    const startTime = Date.now();
    const results: GateResult[] = [];
    const failedGates: string[] = [];

    // Detect which packages to validate
    const packages = await getAffectedPackages(this.projectRoot, {
      explicitPackages: this.config.packages,
      category: this.category,
    });

    logger.info(`Validating packages: ${packages.join(', ')}`);

    // Determine which gates to run
    const gatesToRun: GateType[] = [];
    if (this.config.gates.build) gatesToRun.push('build');
    if (this.config.gates.test) gatesToRun.push('test');
    if (this.config.gates.lint) gatesToRun.push('lint');

    // Run standard gates for each package
    for (const pkg of packages) {
      for (const gate of gatesToRun) {
        logger.info(`  Running ${pkg}:${gate}...`);

        const result = await runGate(gate, pkg, this.projectRoot, {
          timeout: this.config.timeout,
        });

        results.push(result);

        if (result.passed) {
          logger.success(`    ✓ ${pkg}:${gate} (${this.formatDuration(result.duration)})`);
        } else {
          logger.error(`    ✗ ${pkg}:${gate} (${this.formatDuration(result.duration)})`);
          failedGates.push(`${pkg}:${gate}`);

          // Log error summary
          if (result.error_summary) {
            const summary = result.error_summary.split('\n').slice(0, 5).join('\n');
            logger.error(`      ${summary}`);
          }

          // Fail fast if configured
          if (this.config.failFast) {
            logger.warning('Fail fast enabled, stopping validation');
            break;
          }
        }
      }

      // Stop if fail fast and we have failures
      if (this.config.failFast && failedGates.length > 0) {
        break;
      }
    }

    // Run custom validations from task notes
    if (this.config.gates.custom && this.taskNotes) {
      // Use the first detected package for custom validations
      const customPkg = packages[0] || 'frontend';
      const customValidations = parseCustomValidations(this.taskNotes, customPkg);

      for (const validation of customValidations) {
        logger.info(`  Running custom: ${validation.command.substring(0, 40)}...`);

        const result = await runCustomValidation(
          validation,
          this.projectRoot,
          this.config.timeout
        );

        results.push(result);

        if (result.passed) {
          logger.success(`    ✓ custom (${this.formatDuration(result.duration)})`);
        } else {
          logger.error(`    ✗ custom (${this.formatDuration(result.duration)})`);
          failedGates.push(`${validation.package}:custom`);

          if (result.error_summary) {
            const summary = result.error_summary.split('\n').slice(0, 3).join('\n');
            logger.error(`      ${summary}`);
          }

          if (this.config.failFast) {
            break;
          }
        }
      }
    }

    const passed = failedGates.length === 0;
    const totalDuration = Date.now() - startTime;

    logger.info(
      `Validation ${passed ? 'PASSED' : 'FAILED'} in ${this.formatDuration(totalDuration)}`
    );

    return {
      last_run: new Date().toISOString(),
      passed,
      failed_gates: failedGates,
      attempts: previousAttempts + 1,
      gates: results,
    };
  }

  /**
   * Quick validation check - just build and lint, skip tests
   */
  async quickValidate(): Promise<ValidationResult> {
    const originalConfig = { ...this.config };

    this.config.gates.test = false;
    this.config.gates.custom = false;

    const result = await this.validate();

    this.config = originalConfig;
    return result;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.round(ms / 100) / 10;
    return `${seconds}s`;
  }
}

/**
 * Convenience function to run validation
 */
export async function runValidation(
  projectRoot: string,
  options: {
    config?: Partial<ValidationConfig>;
    category?: string;
    taskNotes?: string;
    previousAttempts?: number;
  } = {}
): Promise<ValidationResult> {
  const validator = new Validator({
    projectRoot,
    config: options.config,
    category: options.category,
    taskNotes: options.taskNotes,
  });

  return validator.validate(options.previousAttempts);
}

/**
 * Check if validation passed and task can be marked complete
 */
export function shouldMarkComplete(validationResult: ValidationResult): boolean {
  return validationResult.passed;
}

/**
 * Get retry message for failed validation
 */
export function getRetryMessage(result: ValidationResult): string {
  if (result.passed) return '';

  const failedSummary = result.failed_gates.join(', ');
  const attempts = result.attempts;

  let message = `Validation failed (attempt ${attempts}): ${failedSummary}`;

  // Add specific guidance based on what failed
  if (result.failed_gates.some(g => g.includes('build'))) {
    message += '\n\nFix build/type errors before task can be completed.';
  }
  if (result.failed_gates.some(g => g.includes('test'))) {
    message += '\n\nFix failing tests before task can be completed.';
  }
  if (result.failed_gates.some(g => g.includes('lint'))) {
    message += '\n\nFix lint errors before task can be completed.';
  }

  return message;
}
