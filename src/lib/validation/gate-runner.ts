/**
 * Gate runner - executes validation commands
 */

import { execa, ExecaError } from 'execa';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '../logger.js';
import {
  GateType,
  Package,
  GateResult,
  GATE_COMMANDS,
  PACKAGE_DIRS,
  CustomValidation,
} from './validation.types.js';

/**
 * Run a single validation gate
 */
export async function runGate(
  gate: GateType,
  pkg: Package,
  projectRoot: string,
  options: {
    timeout?: number;
    customCommand?: string;
  } = {}
): Promise<GateResult> {
  const startTime = Date.now();
  const timeout = options.timeout || 120000;

  // Get command - custom or default
  const command = options.customCommand || GATE_COMMANDS[pkg]?.[gate];

  if (!command) {
    logger.debug(`No ${gate} command configured for ${pkg}`);
    return {
      gate,
      package: pkg,
      passed: true,
      duration: 0,
      output: 'No command configured, skipping',
    };
  }

  const packageDir = join(projectRoot, PACKAGE_DIRS[pkg]);

  // Check if package directory exists
  if (!existsSync(packageDir)) {
    logger.debug(`Package directory not found: ${packageDir}`);
    return {
      gate,
      package: pkg,
      passed: true,
      duration: 0,
      output: 'Package directory not found, skipping',
    };
  }

  // Check if package.json exists
  const packageJsonPath = join(packageDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    logger.debug(`package.json not found in ${packageDir}`);
    return {
      gate,
      package: pkg,
      passed: true,
      duration: 0,
      output: 'No package.json found, skipping',
    };
  }

  logger.debug(`Running ${gate} for ${pkg}: ${command}`);

  try {
    const { stdout, stderr } = await execa('sh', ['-c', command], {
      cwd: packageDir,
      timeout,
      reject: false,
      env: {
        ...process.env,
        CI: 'true',        // Enable CI mode for many tools
        FORCE_COLOR: '0',  // Disable color output for parsing
      },
    });

    const duration = Date.now() - startTime;
    const output = `${stdout}\n${stderr}`.trim();

    // Check for common failure patterns
    const failed = isOutputFailure(output, gate);

    if (failed) {
      return {
        gate,
        package: pkg,
        passed: false,
        duration,
        output,
        error_summary: extractErrorSummary(output, gate),
      };
    }

    return {
      gate,
      package: pkg,
      passed: true,
      duration,
      output,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const execaError = error as ExecaError & { timedOut?: boolean };

    // Handle timeout specially
    if (execaError.timedOut) {
      return {
        gate,
        package: pkg,
        passed: false,
        duration,
        output: execaError.stdout || '',
        error_summary: `Timed out after ${timeout}ms`,
      };
    }

    return {
      gate,
      package: pkg,
      passed: false,
      duration,
      output: execaError.stdout || '',
      error_summary: extractErrorSummary(
        execaError.stderr || execaError.message,
        gate
      ),
    };
  }
}

/**
 * Check if output indicates failure
 */
function isOutputFailure(output: string, gate: GateType): boolean {
  const lowerOutput = output.toLowerCase();

  // For lint gates (oxlint), check the summary line specifically
  // oxlint outputs: "Found X warnings and Y errors."
  // We should only fail if there are actual errors (Y > 0)
  if (gate === 'lint' || gate === 'oxlint') {
    // Check for oxlint summary format
    const oxlintMatch = /found \d+ warnings? and (\d+) errors?/i.exec(output);
    if (oxlintMatch) {
      const errorCount = parseInt(oxlintMatch[1], 10);
      return errorCount > 0;
    }

    // Check for ESLint format: "X errors and Y warnings"
    const eslintMatch = /(\d+) errors? and \d+ warnings?/i.exec(output);
    if (eslintMatch) {
      const errorCount = parseInt(eslintMatch[1], 10);
      return errorCount > 0;
    }

    // Check for ESLint problems format: "X problems (Y errors, Z warnings)"
    const problemsMatch = /\d+ problems? \((\d+) errors?/i.exec(output);
    if (problemsMatch) {
      const errorCount = parseInt(problemsMatch[1], 10);
      return errorCount > 0;
    }
  }

  // Common failure patterns (be more specific to avoid matching source code)
  const failurePatterns = [
    '^error:',           // Error at start of line
    'npm err!',
    'command failed',
    'exit code [12]',
  ];

  // Gate-specific patterns
  if (gate === 'test') {
    failurePatterns.push(
      'tests? failed',
      'test failures',
      '\\d+ failing',
      'assertion error',
      'failed:',
      ' failed$',  // "failed" at end of line
    );
  }

  if (gate === 'build') {
    failurePatterns.push(
      'build failed',
      'compilation failed',
      'typescript error',
      'type error',
      'ts\\d+:',  // TypeScript error codes
      'failed:',
      ' failed$',
    );
  }

  for (const pattern of failurePatterns) {
    if (new RegExp(pattern, 'im').test(lowerOutput)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract a summary of errors from output
 */
function extractErrorSummary(output: string, gate: GateType): string {
  const lines = output.split('\n');
  const errorLines: string[] = [];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Capture error lines
    if (
      lowerLine.includes('error') ||
      lowerLine.includes('failed') ||
      /ts\d+:/.test(line) ||  // TypeScript errors
      /^\s*✖/.test(line) ||   // ESLint/test errors
      /^\s*×/.test(line)      // Test failures
    ) {
      errorLines.push(line.trim());
    }

    // Limit to 10 error lines
    if (errorLines.length >= 10) {
      errorLines.push('... (truncated)');
      break;
    }
  }

  if (errorLines.length === 0) {
    return `${gate} failed (no specific error found)`;
  }

  return errorLines.join('\n');
}

/**
 * Run a custom validation command
 */
export async function runCustomValidation(
  validation: CustomValidation,
  projectRoot: string,
  timeout: number = 120000
): Promise<GateResult> {
  return runGate('custom', validation.package, projectRoot, {
    timeout,
    customCommand: validation.command,
  });
}

/**
 * Parse VALIDATE comments from PRD item notes
 * Format: VALIDATE: 'command here'
 */
export function parseCustomValidations(notes: string, pkg: Package): CustomValidation[] {
  const validations: CustomValidation[] = [];
  const pattern = /VALIDATE:\s*['"]([^'"]+)['"]/gi;

  let match;
  while ((match = pattern.exec(notes)) !== null) {
    validations.push({
      name: `custom-${validations.length + 1}`,
      command: match[1],
      package: pkg,
    });
  }

  return validations;
}
