#!/usr/bin/env node

import { Command } from 'commander';
import { config as dotenvConfig } from 'dotenv';
import { initConfig, validateConfig, RalphConfig, AIProvider } from './lib/config.js';
import { isProviderAvailable, getProviderDisplayName } from './lib/providers.js';
import { logger } from './lib/logger.js';
import { runCommand } from './commands/run.js';
import { statusCommand } from './commands/status.js';
import { evidenceCommand } from './commands/evidence.js';
import { testCommand } from './commands/test.js';
import { resumeCommand } from './commands/resume.js';
import { abortCommand } from './commands/abort.js';
import { sessionsCommand } from './commands/sessions.js';

// Load environment variables
dotenvConfig();

const program = new Command();

program
  .name('ralph')
  .description('Ralph Wiggum - Autonomous AI Coding Loop')
  .version('1.0.0');

// Global options
program
  .option('-n, --iterations <count>', 'Number of iterations to run', '30')
  .option('--prd <path>', 'Path to PRD file (JSON)')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-q, --quiet', 'Minimal output')
  .option('--dry-run', 'Show what would run without executing')
  .option('--no-notify', 'Disable Discord notifications')
  .option('--no-commit', 'Skip git commits')
  .option('--capture', 'Capture screenshots after each task')
  .option('--capture-video', 'Capture video after each task')
  .option('--model <model>', 'Model to use (opus or sonnet)', 'opus')
  // Provider options
  .option('--provider <provider>', 'AI provider for tasks (claude, gemini, cursor)', 'claude')
  .option('--validation-provider <provider>', 'AI provider for validation (defaults to --provider)')
  .option('--gemini-model <model>', 'Gemini model (pro or flash)', 'pro')
  .option('--cursor-model <model>', 'Cursor model name', 'claude-3-5-sonnet')
  .option('--cursor-mode <mode>', 'Cursor mode (agent, plan, ask)', 'agent')
  .option('--category <category>', 'Filter tasks by category')
  .option('--priority <priority>', 'Filter tasks by priority')
  // Validation options
  .option('--skip-validation', 'Skip all validation gates')
  .option('--no-build-check', 'Skip build validation')
  .option('--no-test-check', 'Skip test validation')
  .option('--no-lint-check', 'Skip lint validation (NOT recommended)')
  .option('--validation-timeout <ms>', 'Timeout per validation command (ms)', '120000')
  .option('--fail-fast', 'Stop validation on first failure')
  // Task consumption options
  .option('--pop-tasks', 'Remove tasks from PRD after completion (consume mode)')
  .option('--no-archive', 'Do not archive popped tasks (only with --pop-tasks)')
  // Hooks options
  .option('--hooks', 'Enable Claude Code hooks for enhanced validation')
  .option('--no-hooks', 'Disable all hooks (default)')
  .option('--hook-stop', 'Enable Stop hook (forces validation before completion)')
  .option('--no-hook-stop', 'Disable Stop hook')
  .option('--hook-lint', 'Enable post-edit lint feedback hook')
  .option('--no-hook-lint', 'Disable post-edit lint feedback')
  .option('--hook-auto-approve', 'Enable auto-approve for validation commands')
  .option('--no-hook-auto-approve', 'Disable auto-approve')
  .option('--max-continuations <n>', 'Max forced continuations before allowing stop', '5');

// Run command (default)
program
  .command('run [iterations]')
  .alias('go')
  .alias('afk')
  .description('Run the autonomous coding loop')
  .action(async (iterations: string | undefined) => {
    const opts = program.opts();
    const config = buildConfig(opts);

    if (!await validateSetup(config)) return;

    // Prefer positional argument, fall back to -n option
    const iterCount = iterations
      ? parseInt(iterations, 10)
      : parseInt(opts.iterations as string, 10);

    await runCommand({
      iterations: iterCount,
      config,
    });
  });

// Once command - run a single iteration
program
  .command('once')
  .description('Run a single iteration')
  .action(async () => {
    const opts = program.opts();
    const config = buildConfig(opts);

    if (!await validateSetup(config)) return;

    await runCommand({
      iterations: 1,
      config,
    });
  });

// Status command
program
  .command('status')
  .alias('st')
  .description('Show current PRD status and next task')
  .action(async () => {
    const opts = program.opts();
    const config = buildConfig(opts);
    await statusCommand(config);
  });

// Evidence command
program
  .command('evidence [packages...]')
  .alias('ev')
  .description('Capture evidence from packages (frontend, backend, mobile, electron, all)')
  .action(async (packages: string[]) => {
    const opts = program.opts();
    const config = buildConfig(opts);
    await evidenceCommand({ config, packages });
  });

// Test command
program
  .command('test [packages...]')
  .alias('t')
  .description('Run tests for packages (frontend, backend, all)')
  .action(async (packages: string[]) => {
    const opts = program.opts();
    const config = buildConfig(opts);
    await testCommand({ config, packages, notify: opts.notify !== false });
  });

// Resume command
program
  .command('resume [sessionId]')
  .description('Resume a crashed or interrupted session')
  .action(async (sessionId: string | undefined) => {
    const opts = program.opts();
    const config = buildConfig(opts);
    await resumeCommand({ config, sessionId });
  });

// Abort command
program
  .command('abort [sessionId]')
  .description('Abort an active session and reset orphaned tasks')
  .action(async (sessionId: string | undefined) => {
    const opts = program.opts();
    const config = buildConfig(opts);
    await abortCommand({ config, sessionId });
  });

// Sessions command
program
  .command('sessions')
  .description('List recent sessions')
  .option('--cleanup', 'Remove sessions older than 7 days')
  .option('--days <days>', 'Days to keep when cleaning up', '7')
  .action(async (cmdOpts: { cleanup?: boolean; days?: string }) => {
    const opts = program.opts();
    const config = buildConfig(opts);
    await sessionsCommand({
      config,
      cleanup: cmdOpts.cleanup,
      cleanupDays: cmdOpts.days ? parseInt(cmdOpts.days, 10) : undefined,
    });
  });

// Helper functions
function buildConfig(opts: Record<string, unknown>): RalphConfig {
  logger.configure({
    quiet: Boolean(opts.quiet),
    verbose: Boolean(opts.verbose),
  });

  return initConfig({
    notifyEnabled: opts.notify !== false,
    noCommit: opts.commit === false,
    captureEnabled: Boolean(opts.capture),
    captureVideo: Boolean(opts.captureVideo),
    dryRun: Boolean(opts.dryRun),
    verbose: Boolean(opts.verbose),
    quiet: Boolean(opts.quiet),
    model: (opts.model as 'opus' | 'sonnet') || 'sonnet',
    filterCategory: (opts.category as string) || '',
    filterPriority: (opts.priority as string) || '',
    prdFile: (opts.prd as string) || '',
    // Validation options
    skipValidation: Boolean(opts.skipValidation),
    validationGates: {
      oxlint: opts.lintCheck !== false,  // oxlint runs if lint check enabled
      build: opts.buildCheck !== false,
      test: opts.testCheck !== false,
      lint: opts.lintCheck !== false,
      custom: true,
    },
    validationTimeout: parseInt(opts.validationTimeout as string, 10) || 120000,
    validationFailFast: Boolean(opts.failFast),
    // Consume mode options
    consumeMode: Boolean(opts.popTasks),
    archiveCompleted: opts.archive !== false,
    // Hooks options
    hooks: {
      enabled: Boolean(opts.hooks),
      stopValidation: opts.hookStop !== false,  // Enabled by default when hooks enabled
      postEditLint: opts.hookLint !== false,    // Enabled by default when hooks enabled
      autoApprove: opts.hookAutoApprove !== false, // Enabled by default when hooks enabled
      maxContinuations: parseInt(opts.maxContinuations as string, 10) || 5,
    },
    // Provider options
    providerConfig: {
      taskProvider: (opts.provider as AIProvider) || 'claude',
      validationProvider: opts.validationProvider as AIProvider | undefined,
      claudeModel: (opts.model as 'opus' | 'sonnet') || 'opus',
      geminiModel: (opts.geminiModel as 'pro' | 'flash') || 'pro',
      cursorModel: (opts.cursorModel as string) || 'claude-3-5-sonnet',
      cursorMode: (opts.cursorMode as 'agent' | 'plan' | 'ask') || 'agent',
    },
  });
}

async function validateSetup(config: RalphConfig): Promise<boolean> {
  const errors = validateConfig(config);

  if (errors.length > 0) {
    logger.error('Configuration errors:');
    for (const error of errors) {
      logger.error(`  - ${error}`);
    }
    return false;
  }

  // Check for the configured provider CLI
  const provider = config.providerConfig.taskProvider;
  const providerName = getProviderDisplayName(provider);

  const available = await isProviderAvailable(provider);
  if (!available) {
    const installInstructions: Record<AIProvider, string> = {
      claude: 'npm install -g @anthropic-ai/claude-code',
      gemini: 'npm install -g @anthropic-ai/gemini-cli',  // Update with actual package name
      cursor: 'Download from cursor.com',  // Update with actual instructions
    };
    logger.error(`${providerName} CLI not found. Install with: ${installInstructions[provider]}`);
    return false;
  }

  logger.debug(`${providerName} CLI found`);

  // If validation provider is different, check that too
  const validationProvider = config.providerConfig.validationProvider;
  if (validationProvider && validationProvider !== provider) {
    const validationAvailable = await isProviderAvailable(validationProvider);
    if (!validationAvailable) {
      logger.error(`Validation provider ${getProviderDisplayName(validationProvider)} CLI not found`);
      return false;
    }
    logger.debug(`${getProviderDisplayName(validationProvider)} CLI found (validation)`);
  }

  return true;
}

// Default action - run the loop if -n or --prd is provided, otherwise show help
program.action(async () => {
  const opts = program.opts();

  // If -n or --prd is specified, run the loop
  if (opts.prd || opts.iterations !== '30') {
    const config = buildConfig(opts);

    if (!await validateSetup(config)) return;

    await runCommand({
      iterations: parseInt(opts.iterations as string, 10),
      config,
    });
  } else {
    program.help();
  }
});

// Parse and run
program.parse();
