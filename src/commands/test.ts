import { execa } from 'execa';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../lib/logger.js';
import { RalphConfig } from '../lib/config.js';
import { Notifier } from '../lib/notify.js';

export interface TestOptions {
  config: RalphConfig;
  packages: string[];
  notify: boolean;
}

interface TestResult {
  package: string;
  passed: boolean;
  passedCount: number;
  failedCount: number;
  duration: number;
}

export async function testCommand(options: TestOptions): Promise<void> {
  const { config, packages, notify } = options;
  const projectRoot = config.projectRoot;

  const notifier = new Notifier(config.notifyScript, notify);

  logger.header('Test Runner');

  const allPackages = packages.length === 0 || packages.includes('all')
    ? ['frontend', 'backend']
    : packages;

  const results: TestResult[] = [];

  for (const pkg of allPackages) {
    logger.info(`Testing ${pkg}...`);

    let result: TestResult | null = null;

    switch (pkg) {
      case 'frontend':
        result = await testFrontend(projectRoot);
        break;
      case 'backend':
        result = await testBackend(projectRoot);
        break;
      default:
        logger.warning(`Unknown package: ${pkg}`);
    }

    if (result) {
      results.push(result);
      if (result.passed) {
        logger.success(`${pkg}: ${result.passedCount} passed in ${result.duration}s`);
      } else {
        logger.error(`${pkg}: ${result.failedCount} failed`);
      }
    }
  }

  // Send summary notification
  if (notify) {
    const allPassed = results.every(r => r.passed);
    const totalPassed = results.reduce((sum, r) => sum + r.passedCount, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failedCount, 0);

    await notifier.send({
      title: allPassed ? 'All Tests Passed' : 'Tests Failed',
      description: results.map(r =>
        `**${r.package}:** ${r.passed ? '✅' : '❌'} ${r.passedCount} passed, ${r.failedCount} failed`
      ).join('\n'),
      color: allPassed ? '0x2ECC71' : '0xE74C3C',
      fields: [
        { name: 'Total Passed', value: String(totalPassed) },
        { name: 'Total Failed', value: String(totalFailed) },
      ],
      footer: 'clockzen-next • Test Runner',
    });
  }

  // Summary
  logger.divider();
  logger.header('Test Summary');
  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`  ${status} ${result.package}: ${result.passedCount} passed, ${result.failedCount} failed`);
  }

  // Exit with error if any tests failed
  if (results.some(r => !r.passed)) {
    process.exit(1);
  }
}

async function testFrontend(projectRoot: string): Promise<TestResult | null> {
  const frontendDir = join(projectRoot, 'frontend');

  if (!existsSync(frontendDir)) {
    logger.warning('Frontend directory not found');
    return null;
  }

  const startTime = Date.now();

  try {
    const result = await execa('npx', ['playwright', 'test', '--reporter=list'], {
      cwd: frontendDir,
      timeout: 300000,
      reject: false,
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    const output = result.stdout + result.stderr;

    // Parse results
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);

    return {
      package: 'frontend',
      passed: result.exitCode === 0,
      passedCount: passedMatch ? parseInt(passedMatch[1], 10) : 0,
      failedCount: failedMatch ? parseInt(failedMatch[1], 10) : 0,
      duration,
    };
  } catch (error) {
    logger.error('Frontend tests failed:', error);
    return {
      package: 'frontend',
      passed: false,
      passedCount: 0,
      failedCount: 1,
      duration: Math.round((Date.now() - startTime) / 1000),
    };
  }
}

async function testBackend(projectRoot: string): Promise<TestResult | null> {
  const backendDir = join(projectRoot, 'backend');

  if (!existsSync(backendDir)) {
    logger.warning('Backend directory not found');
    return null;
  }

  const startTime = Date.now();

  try {
    const result = await execa('npm', ['run', 'test', '--', '--reporter=verbose'], {
      cwd: backendDir,
      timeout: 300000,
      reject: false,
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    const output = result.stdout;

    // Parse results
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);

    return {
      package: 'backend',
      passed: result.exitCode === 0,
      passedCount: passedMatch ? parseInt(passedMatch[1], 10) : 0,
      failedCount: failedMatch ? parseInt(failedMatch[1], 10) : 0,
      duration,
    };
  } catch (error) {
    logger.error('Backend tests failed:', error);
    return {
      package: 'backend',
      passed: false,
      passedCount: 0,
      failedCount: 1,
      duration: Math.round((Date.now() - startTime) / 1000),
    };
  }
}
