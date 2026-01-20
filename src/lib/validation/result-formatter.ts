/**
 * Result formatter - format validation results for logging/PRD/Discord
 */

import chalk from 'chalk';
import { ValidationResult } from './validation.types.js';

/**
 * Format validation results for console display
 */
export function formatValidationResultsForConsole(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold('Validation Results:'));

  for (const gate of result.gates) {
    const status = gate.passed
      ? chalk.green('✓')
      : chalk.red('✗');
    const duration = formatDuration(gate.duration);
    const name = `${gate.package}:${gate.gate}`;

    if (gate.passed) {
      lines.push(`  ${status} ${name.padEnd(20)} ${chalk.gray(`(${duration})`)}`);
    } else {
      lines.push(`  ${status} ${chalk.red(name.padEnd(20))} ${chalk.gray(`(${duration})`)}`);
      if (gate.error_summary) {
        const shortError = gate.error_summary.split('\n')[0].substring(0, 60);
        lines.push(`    ${chalk.gray(shortError)}`);
      }
    }
  }

  lines.push('');
  if (result.passed) {
    lines.push(chalk.green.bold('  All gates passed!'));
  } else {
    lines.push(chalk.red.bold(`  Failed: ${result.failed_gates.join(', ')}`));
    lines.push(chalk.yellow(`  Attempt ${result.attempts} - task will retry`));
  }

  return lines.join('\n');
}

/**
 * Format validation results for Discord notification
 */
export function formatValidationResultsForDiscord(result: ValidationResult): string {
  const lines: string[] = [];

  for (const gate of result.gates) {
    const status = gate.passed ? '✓' : '✗';
    const duration = formatDuration(gate.duration);
    const name = `${gate.package}:${gate.gate}`;

    if (gate.passed) {
      lines.push(`${status} ${name} (${duration})`);
    } else {
      lines.push(`${status} **${name}** (${duration})`);
      if (gate.error_summary) {
        const shortError = gate.error_summary.split('\n')[0].substring(0, 50);
        lines.push(`  └ ${shortError}`);
      }
    }
  }

  if (!result.passed) {
    lines.push('');
    lines.push(`Attempt ${result.attempts}`);
  }

  return lines.join('\n');
}

/**
 * Format validation results as fields for Discord embed
 */
export function formatValidationResultsAsFields(result: ValidationResult): Array<{ name: string; value: string }> {
  const fields: Array<{ name: string; value: string }> = [];

  // Group by passed/failed
  const passed = result.gates.filter(g => g.passed);
  const failed = result.gates.filter(g => !g.passed);

  if (passed.length > 0) {
    fields.push({
      name: '✓ Passed',
      value: passed.map(g => `${g.package}:${g.gate}`).join(', '),
    });
  }

  if (failed.length > 0) {
    fields.push({
      name: '✗ Failed',
      value: failed.map(g => `${g.package}:${g.gate}`).join(', '),
    });
  }

  fields.push({
    name: 'Attempts',
    value: `${result.attempts}`,
  });

  return fields;
}

/**
 * Format validation result for status command
 */
export function formatValidationForStatus(result: ValidationResult | undefined): string {
  if (!result) {
    return chalk.gray('No validation results');
  }

  const lines: string[] = [];

  lines.push(chalk.bold('Last Validation:'));
  lines.push(`  Run: ${new Date(result.last_run).toLocaleString()}`);
  lines.push(`  Result: ${result.passed ? chalk.green('PASSED') : chalk.red('FAILED')}`);
  lines.push(`  Attempts: ${result.attempts}`);

  if (!result.passed && result.failed_gates.length > 0) {
    lines.push(`  Failed gates: ${chalk.red(result.failed_gates.join(', '))}`);
  }

  lines.push('');
  lines.push('  Gates:');
  for (const gate of result.gates) {
    const status = gate.passed ? chalk.green('✓') : chalk.red('✗');
    const duration = formatDuration(gate.duration);
    lines.push(`    ${status} ${gate.package}:${gate.gate} (${duration})`);
  }

  return lines.join('\n');
}

/**
 * Compact format for logging
 */
export function formatValidationCompact(result: ValidationResult): string {
  const status = result.passed ? '✓' : '✗';
  const gates = result.gates
    .map(g => `${g.passed ? '+' : '-'}${g.package}:${g.gate}`)
    .join(' ');
  return `[${status}] ${gates} (attempt ${result.attempts})`;
}

/**
 * Extract key metrics from validation result
 */
export function extractValidationMetrics(result: ValidationResult): {
  totalDuration: number;
  passedCount: number;
  failedCount: number;
  gateBreakdown: Record<string, { passed: number; failed: number }>;
} {
  let totalDuration = 0;
  let passedCount = 0;
  let failedCount = 0;
  const gateBreakdown: Record<string, { passed: number; failed: number }> = {};

  for (const gate of result.gates) {
    totalDuration += gate.duration;

    if (gate.passed) {
      passedCount++;
    } else {
      failedCount++;
    }

    const key = gate.gate;
    if (!gateBreakdown[key]) {
      gateBreakdown[key] = { passed: 0, failed: 0 };
    }
    if (gate.passed) {
      gateBreakdown[key].passed++;
    } else {
      gateBreakdown[key].failed++;
    }
  }

  return {
    totalDuration,
    passedCount,
    failedCount,
    gateBreakdown,
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 100) / 10;
  return `${seconds}s`;
}
