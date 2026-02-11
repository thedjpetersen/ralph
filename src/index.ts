#!/usr/bin/env node

import { Command } from 'commander';
import { config as dotenvConfig } from 'dotenv';
import { select, input } from '@inquirer/prompts';
import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import { initConfig, validateConfig, RalphConfig, AIProvider } from './lib/config.js';
import { isProviderAvailable, getProviderDisplayName } from './lib/providers.js';
import { logger } from './lib/logger.js';
import { runCommand } from './commands/run.js';
import { factoryCommand } from './commands/factory.js';
import { statusCommand } from './commands/status.js';
import { evidenceCommand } from './commands/evidence.js';
import { testCommand } from './commands/test.js';
import { resumeCommand } from './commands/resume.js';
import { abortCommand } from './commands/abort.js';
import { sessionsCommand } from './commands/sessions.js';
import { loadPrdFile } from './lib/prd.js';

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
  .option('--task <id>', 'Run a specific task by ID')
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

// Factory command - parallel convergent software factory
program
  .command('factory')
  .description('Run in factory mode: parallel workers, complexity routing, dynamic planning')
  .option('--max-workers <n>', 'Maximum concurrent workers', '5')
  .option('--opus-slots <n>', 'Concurrent Claude Opus slots', '1')
  .option('--sonnet-slots <n>', 'Concurrent Claude Sonnet slots', '2')
  .option('--haiku-slots <n>', 'Concurrent Claude Haiku slots', '3')
  .option('--gemini-pro-slots <n>', 'Concurrent Gemini Pro slots', '2')
  .option('--gemini-flash-slots <n>', 'Concurrent Gemini Flash slots', '3')
  .option('--codex-slots <n>', 'Concurrent Codex slots', '2')
  .option('--cursor-slots <n>', 'Concurrent Cursor slots', '2')
  .option('--planner-interval <ms>', 'Planner evaluation interval (ms)', '120000')
  .option('--planner-model <model>', 'Model for planner (sonnet, opus, pro)', 'sonnet')
  .option('--retry-limit <n>', 'Max retries per task', '3')
  .option('--escalate-on-retry', 'Escalate tier on retry (default true)')
  .option('--no-escalate-on-retry', 'Do not escalate tier on retry')
  .option('--no-auto-route', 'Disable automatic complexity routing')
  .option('--no-cleanup', 'Do not cleanup worktrees on shutdown')
  .action(async (cmdOpts: Record<string, string | boolean | undefined>) => {
    const opts = program.opts();
    const config = buildConfig(opts);

    if (!await validateSetup(config)) return;

    await factoryCommand({
      config,
      maxWorkers: cmdOpts.maxWorkers ? parseInt(cmdOpts.maxWorkers as string, 10) : undefined,
      opusSlots: cmdOpts.opusSlots ? parseInt(cmdOpts.opusSlots as string, 10) : undefined,
      sonnetSlots: cmdOpts.sonnetSlots ? parseInt(cmdOpts.sonnetSlots as string, 10) : undefined,
      haikuSlots: cmdOpts.haikuSlots ? parseInt(cmdOpts.haikuSlots as string, 10) : undefined,
      geminiProSlots: cmdOpts.geminiProSlots ? parseInt(cmdOpts.geminiProSlots as string, 10) : undefined,
      geminiFlashSlots: cmdOpts.geminiFlashSlots ? parseInt(cmdOpts.geminiFlashSlots as string, 10) : undefined,
      codexSlots: cmdOpts.codexSlots ? parseInt(cmdOpts.codexSlots as string, 10) : undefined,
      cursorSlots: cmdOpts.cursorSlots ? parseInt(cmdOpts.cursorSlots as string, 10) : undefined,
      plannerInterval: cmdOpts.plannerInterval ? parseInt(cmdOpts.plannerInterval as string, 10) : undefined,
      plannerModel: cmdOpts.plannerModel as string | undefined,
      retryLimit: cmdOpts.retryLimit ? parseInt(cmdOpts.retryLimit as string, 10) : undefined,
      escalateOnRetry: cmdOpts.escalateOnRetry !== false,
      autoRoute: cmdOpts.autoRoute !== false,
      cleanup: cmdOpts.cleanup !== false,
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
    filterTaskId: (opts.task as string) || '',
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
      claudeModel: (opts.model as 'opus' | 'sonnet' | 'haiku') || 'opus',
      geminiModel: (opts.geminiModel as 'pro' | 'flash') || 'pro',
      cursorModel: (opts.cursorModel as string) || 'claude-3-5-sonnet',
      cursorMode: (opts.cursorMode as 'agent' | 'plan' | 'ask') || 'agent',
      codexModel: 'default',
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
      gemini: 'npm install -g @anthropic-ai/gemini-cli',
      cursor: 'Download from cursor.com',
      codex: 'npm install -g @openai/codex',
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

import { writeFileSync, mkdirSync } from 'fs';

// ASCII art logo
const RALPH_LOGO = `
 ██████╗   █████╗  ██╗      ██████╗  ██╗  ██╗
 ██╔══██╗ ██╔══██╗ ██║      ██╔══██╗ ██║  ██║
 ██████╔╝ ███████║ ██║      ██████╔╝ ███████║
 ██╔══██╗ ██╔══██║ ██║      ██╔═══╝  ██╔══██║
 ██║  ██║ ██║  ██║ ███████╗ ██║      ██║  ██║
 ╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚══════╝ ╚═╝      ╚═╝  ╚═╝
`;

// Recursively search for PRD files
function findPrdFilesRecursive(dir: string, maxDepth = 5, currentDepth = 0): PrdInfo[] {
  if (currentDepth > maxDepth) return [];
  if (!existsSync(dir)) return [];

  const prdFiles: PrdInfo[] = [];
  const cwd = process.cwd();

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip node_modules, .git, etc.
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'build', 'vendor', '.next', '__pycache__'].includes(entry.name)) {
          continue;
        }
        // Recurse into subdirectory
        prdFiles.push(...findPrdFilesRecursive(fullPath, maxDepth, currentDepth + 1));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Skip known non-PRD JSON files
        const skipFiles = ['package.json', 'package-lock.json', 'tsconfig.json', 'jsconfig.json', 'launch.json', 'settings.json', '.eslintrc.json', 'nest-cli.json', 'turbo.json'];
        if (skipFiles.includes(entry.name)) {
          continue;
        }

        // Try to load as PRD (silently ignore failures)
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const data = JSON.parse(content);

          // Must have items array with at least one item to be a valid PRD
          if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
            continue;
          }

          const completed = data.items.filter((i: { status?: string }) => i.status === 'completed').length;
          const inProgress = data.items.filter((i: { status?: string }) => i.status === 'in_progress').length;
          const pending = data.items.filter((i: { status?: string }) => !i.status || i.status === 'pending').length;
          const nextItem = data.items.find((i: { status?: string }) => !i.status || i.status === 'pending' || i.status === 'in_progress');

          const relativePath = fullPath.startsWith(cwd) ? fullPath.replace(cwd + '/', '') : fullPath;

          prdFiles.push({
            path: fullPath,
            name: relativePath,
            project: data.project || entry.name.replace('.json', ''),
            description: data.description,
            stats: { pending, completed, inProgress, total: data.items.length },
            nextTask: nextItem?.description || nextItem?.id,
          });
        } catch {
          // Silently ignore - not a valid PRD file (JSON parse error or missing fields)
        }
      }
    }
  } catch {
    // Can't read directory
  }

  return prdFiles;
}

// Handle the case when no PRD files are found
async function handleNoPrdFiles(): Promise<void> {
  console.log(boxen(
    chalk.yellow.bold('No PRD files found in common locations\n\n') +
    chalk.dim('Searched:\n') +
    chalk.gray('  • docs/prd/\n') +
    chalk.gray('  • prd/\n') +
    chalk.gray('  • .ralph/prd/'),
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'yellow',
    }
  ));

  const action = await select({
    message: chalk.bold('What would you like to do?'),
    choices: [
      {
        name: chalk.cyan('🔍') + ' ' + chalk.bold('Search recursively') + chalk.dim(' - Find PRD files anywhere in project'),
        value: 'search'
      },
      {
        name: chalk.green('✨') + ' ' + chalk.bold('Create new PRD') + chalk.dim(' - Start a new task list'),
        value: 'create'
      },
      {
        name: chalk.blue('📁') + ' ' + chalk.bold('Enter path manually') + chalk.dim(' - Specify a PRD file path'),
        value: 'manual'
      },
      {
        name: chalk.dim('✕') + ' ' + chalk.dim('Exit'),
        value: 'exit'
      },
    ],
  });

  if (action === 'exit') {
    console.log(chalk.dim('\nGoodbye! 👋\n'));
    return;
  }

  if (action === 'search') {
    await handleRecursiveSearch();
    return;
  }

  if (action === 'create') {
    await handleCreatePrd();
    return;
  }

  if (action === 'manual') {
    const customPath = await input({
      message: 'Enter path to PRD file:',
    });
    if (!customPath) return;

    if (!existsSync(customPath)) {
      console.log(chalk.red(`\n✗ File not found: ${customPath}\n`));
      return;
    }

    const opts = program.opts();
    const config = buildConfig({ ...opts, prd: customPath });
    await statusCommand(config);
  }
}

// Handle recursive search for PRD files
async function handleRecursiveSearch(): Promise<void> {
  const cwd = process.cwd();

  console.log(chalk.cyan('\n🔍 Searching for PRD files...\n'));

  const prdFiles = findPrdFilesRecursive(cwd);

  if (prdFiles.length === 0) {
    console.log(boxen(
      chalk.red.bold('No PRD files found anywhere in project\n\n') +
      chalk.dim('A PRD file needs:\n') +
      chalk.gray('  • .json extension\n') +
      chalk.gray('  • "items" array with tasks\n\n') +
      chalk.white('Use ') + chalk.cyan('Create new PRD') + chalk.white(' to get started'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'red',
      }
    ));

    const createNew = await select({
      message: 'Would you like to create a new PRD?',
      choices: [
        { name: chalk.green('Yes, create one'), value: true },
        { name: chalk.dim('No, exit'), value: false },
      ],
    });

    if (createNew) {
      await handleCreatePrd();
    }
    return;
  }

  console.log(chalk.green(`✓ Found ${prdFiles.length} PRD file${prdFiles.length > 1 ? 's' : ''}!\n`));

  // Show them in the regular selector
  const choices = prdFiles.map(prd => {
    const stats = prd.stats!;
    const pct = Math.round((stats.completed / stats.total) * 100);
    const projectName = chalk.bold.white(prd.project || prd.name);
    const bar = progressBar(stats.completed, stats.total, 15);
    const statsText = chalk.dim(`${stats.completed}/${stats.total}`);
    const pctText = pct === 100 ? chalk.green.bold('✓ DONE') : chalk.cyan(`${pct}%`);

    let label = `${projectName}\n   ${bar} ${statsText} ${pctText}`;
    if (stats.inProgress > 0) {
      label += chalk.yellow(` (${stats.inProgress} in progress)`);
    }
    label += chalk.dim(`\n   ${prd.name}`);

    return { name: label, value: prd.path };
  });

  const selectedPrd = await select({
    message: chalk.bold('Select a PRD file:'),
    choices,
    pageSize: 10,
  });

  // Continue with the selected PRD
  const opts = program.opts();
  const config = buildConfig({ ...opts, prd: selectedPrd });
  await showActionMenu(config, selectedPrd);
}

// Create a new PRD file
async function handleCreatePrd(): Promise<void> {
  console.log(chalk.cyan('\n✨ Create a new PRD\n'));

  const projectName = await input({
    message: 'Project name:',
    default: process.cwd().split('/').pop(),
  });

  const description = await input({
    message: 'Description (optional):',
  });

  const locationChoices = [
    { name: chalk.white('docs/prd/') + chalk.dim(' (recommended)'), value: 'docs/prd' },
    { name: chalk.white('prd/'), value: 'prd' },
    { name: chalk.white('.ralph/prd/'), value: '.ralph/prd' },
    { name: chalk.blue('Custom location...'), value: '__custom__' },
  ];

  let location = await select({
    message: 'Where to create the PRD?',
    choices: locationChoices,
  });

  if (location === '__custom__') {
    location = await input({
      message: 'Enter directory path:',
      default: 'docs/prd',
    });
  }

  const filename = await input({
    message: 'Filename:',
    default: 'tasks.json',
    validate: (val) => val.endsWith('.json') ? true : 'Filename must end with .json',
  });

  // Create sample tasks
  const includeSamples = await select({
    message: 'Include sample tasks?',
    choices: [
      { name: chalk.green('Yes') + chalk.dim(' - Add example tasks to get started'), value: true },
      { name: chalk.white('No') + chalk.dim(' - Start with empty task list'), value: false },
    ],
  });

  const sampleTasks = includeSamples ? [
    {
      id: 'task-001',
      description: 'Example task - replace with your actual tasks',
      priority: 'high',
      status: 'pending',
      steps: [
        'Step 1: Describe what needs to be done',
        'Step 2: Add more details',
        'Step 3: Specify validation criteria',
      ],
    },
    {
      id: 'task-002',
      description: 'Another example task',
      priority: 'medium',
      status: 'pending',
    },
  ] : [];

  const prdContent = {
    project: projectName,
    description: description || undefined,
    metadata: {
      version: '1.0.0',
      created_at: new Date().toISOString(),
    },
    items: sampleTasks,
  };

  // Create directory if needed
  const fullDir = join(process.cwd(), location);
  const fullPath = join(fullDir, filename);

  try {
    mkdirSync(fullDir, { recursive: true });
    writeFileSync(fullPath, JSON.stringify(prdContent, null, 2));

    console.log(boxen(
      chalk.green.bold('✓ PRD created successfully!\n\n') +
      chalk.white('Location: ') + chalk.cyan(fullPath.replace(process.cwd() + '/', '')) + '\n\n' +
      chalk.dim('Next steps:\n') +
      chalk.gray('  1. Edit the file to add your tasks\n') +
      chalk.gray('  2. Run ') + chalk.cyan('ralph') + chalk.gray(' to start working'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'green',
      }
    ));

    // Offer to open the file or start working
    const nextAction = await select({
      message: 'What next?',
      choices: [
        { name: chalk.cyan('📊') + ' View the new PRD', value: 'view' },
        { name: chalk.dim('✕') + ' Exit', value: 'exit' },
      ],
    });

    if (nextAction === 'view') {
      const opts = program.opts();
      const config = buildConfig({ ...opts, prd: fullPath });
      await statusCommand(config);
    }
  } catch (error) {
    console.log(chalk.red(`\n✗ Failed to create PRD: ${error}\n`));
  }
}

// Show action menu for a selected PRD
async function showActionMenu(config: RalphConfig, prdPath: string): Promise<void> {
  // Get pending count for "Run All" label
  let pendingCount = 0;
  try {
    const prd = loadPrdFile(prdPath);
    if (prd?.items) {
      pendingCount = prd.items.filter((i: { status?: string }) => !i.status || i.status === 'pending').length;
    }
  } catch {}

  const action = await select({
    message: chalk.bold('What would you like to do?'),
    choices: [
      {
        name: chalk.cyan('◉') + ' ' + chalk.bold('View Status') + chalk.dim(' - See progress and next tasks'),
        value: 'status'
      },
      {
        name: chalk.green('▶') + ' ' + chalk.bold('Run One Task') + chalk.dim(' - Execute the next pending task'),
        value: 'once'
      },
      {
        name: chalk.magenta('⚡') + ' ' + chalk.bold('Run Multiple') + chalk.dim(' - Choose how many tasks'),
        value: 'run'
      },
      {
        name: chalk.red.bold('🔥') + ' ' + chalk.bold.red('Run All') + chalk.dim(` - Execute all ${pendingCount} remaining tasks`),
        value: 'all'
      },
      {
        name: chalk.magenta('⚙') + ' ' + chalk.bold.magenta('Factory Mode') + chalk.dim(' - Parallel workers with dynamic planning'),
        value: 'factory'
      },
      {
        name: chalk.yellow('↻') + ' ' + chalk.bold('Resume Session') + chalk.dim(' - Continue interrupted work'),
        value: 'resume'
      },
      {
        name: chalk.dim('✕') + ' ' + chalk.dim('Exit'),
        value: 'exit'
      },
    ],
  });

  if (action === 'exit') {
    console.log(chalk.dim('\nGoodbye! 👋\n'));
    return;
  }

  switch (action) {
    case 'status':
      console.log();
      await statusCommand(config);
      break;
    case 'once':
      if (!await validateSetup(config)) return;
      console.log(chalk.cyan('\n🚀 Starting single task execution...\n'));
      await runCommand({ iterations: 1, config });
      break;
    case 'run':
      const iterChoices = [
        { name: chalk.white(' 5 tasks')  + chalk.dim('   ~15-30 min'), value: 5 },
        { name: chalk.white('10 tasks')  + chalk.dim('   ~30-60 min'), value: 10 },
        { name: chalk.white('25 tasks')  + chalk.dim('   ~1-2 hours'), value: 25 },
        { name: chalk.white('50 tasks')  + chalk.dim('   ~2-4 hours'), value: 50 },
        { name: chalk.yellow('100 tasks') + chalk.dim('  ~4-8 hours'), value: 100 },
      ];

      const iterations = await select({
        message: chalk.bold('How many tasks to run?'),
        choices: iterChoices,
      });

      if (!await validateSetup(config)) return;
      console.log(chalk.cyan(`\n🚀 Starting batch execution (${iterations} tasks)...\n`));
      await runCommand({ iterations, config });
      break;
    case 'all':
      if (!await validateSetup(config)) return;
      console.log(chalk.red.bold(`\n🔥 Running ALL ${pendingCount} remaining tasks...\n`));
      await runCommand({ iterations: 9999, config });
      break;
    case 'factory':
      if (!await validateSetup(config)) return;
      console.log(chalk.magenta.bold(`\n⚙ Starting Factory Mode...\n`));
      await factoryCommand({ config });
      break;
    case 'resume':
      await resumeCommand({ config, sessionId: undefined });
      break;
  }
}

// Create a visual progress bar
function progressBar(completed: number, total: number, width = 20): string {
  const pct = total > 0 ? completed / total : 0;
  const filled = Math.round(pct * width);
  const empty = width - filled;

  const filledChar = '█';
  const emptyChar = '░';

  const bar = filledChar.repeat(filled) + emptyChar.repeat(empty);

  // Color based on progress
  if (pct >= 0.8) return chalk.green(bar);
  if (pct >= 0.5) return chalk.yellow(bar);
  if (pct >= 0.2) return chalk.cyan(bar);
  return chalk.gray(bar);
}

// Find PRD files in common locations
interface PrdInfo {
  path: string;
  name: string;
  project?: string;
  description?: string;
  stats: { pending: number; completed: number; inProgress: number; total: number } | null;
  nextTask?: string;
}

function findPrdFiles(): PrdInfo[] {
  const cwd = process.cwd();
  const searchPaths = [
    join(cwd, 'docs/prd'),
    join(cwd, 'prd'),
    join(cwd, '.ralph/prd'),
    cwd,
  ];

  const prdFiles: PrdInfo[] = [];

  for (const searchPath of searchPaths) {
    if (!existsSync(searchPath)) continue;

    try {
      const files = readdirSync(searchPath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const fullPath = join(searchPath, file);
        try {
          const stat = statSync(fullPath);
          if (!stat.isFile()) continue;

          // Try to load and get stats - must have items array to be a valid PRD
          try {
            const prd = loadPrdFile(fullPath);
            // Must have items array with at least one item to be a valid PRD
            if (!prd || !prd.items || !Array.isArray(prd.items) || prd.items.length === 0) {
              continue;
            }

            const completed = prd.items.filter((i: { status?: string }) => i.status === 'completed').length;
            const inProgress = prd.items.filter((i: { status?: string }) => i.status === 'in_progress').length;
            const pending = prd.items.filter((i: { status?: string }) => !i.status || i.status === 'pending').length;
            const nextItem = prd.items.find((i: { status?: string }) => !i.status || i.status === 'pending' || i.status === 'in_progress');

            // Make path relative to cwd for display
            const relativePath = fullPath.replace(cwd + '/', '');

            prdFiles.push({
              path: fullPath,
              name: relativePath,
              project: prd.project || file.replace('.json', ''),
              description: prd.description,
              stats: { pending, completed, inProgress, total: prd.items.length },
              nextTask: nextItem?.description || nextItem?.id,
            });
          } catch {
            // Not a valid PRD file, skip
            continue;
          }
        } catch {
          // Skip files we can't stat
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  return prdFiles;
}

// Interactive PRD selector
async function interactiveMenu(): Promise<void> {
  const prdFiles = findPrdFiles();

  // Show fancy header
  console.log(chalk.cyan(RALPH_LOGO));
  console.log(chalk.dim('  Autonomous AI Coding Loop\n'));

  if (prdFiles.length === 0) {
    await handleNoPrdFiles();
    return;
  }

  // Build fancy choices with progress info
  const choices = prdFiles.map(prd => {
    const stats = prd.stats!;
    const pct = Math.round((stats.completed / stats.total) * 100);

    // Build the display label
    const projectName = chalk.bold.white(prd.project || prd.name);
    const bar = progressBar(stats.completed, stats.total, 15);
    const statsText = chalk.dim(`${stats.completed}/${stats.total}`);
    const pctText = pct === 100
      ? chalk.green.bold('✓ DONE')
      : chalk.cyan(`${pct}%`);

    let label = `${projectName}\n   ${bar} ${statsText} ${pctText}`;

    if (stats.inProgress > 0) {
      label += chalk.yellow(` (${stats.inProgress} in progress)`);
    }

    if (prd.nextTask && pct < 100) {
      const truncatedTask = prd.nextTask.length > 50
        ? prd.nextTask.substring(0, 47) + '...'
        : prd.nextTask;
      label += chalk.dim(`\n   Next: ${truncatedTask}`);
    }

    return {
      name: label,
      value: prd.path,
    };
  });

  // Add separator and custom path option
  choices.push({
    name: chalk.dim('─'.repeat(40)) + '\n' + chalk.blue('📁 Enter custom path...'),
    value: '__custom__'
  });

  const selectedPrd = await select({
    message: chalk.bold('Select a project:'),
    choices,
    pageSize: 10,
  });

  if (selectedPrd === '__custom__') {
    const customPath = await input({
      message: 'Enter path to PRD file:',
    });
    if (!customPath) return;

    if (!existsSync(customPath)) {
      console.log(chalk.red(`\n✗ File not found: ${customPath}\n`));
      return;
    }

    const opts = program.opts();
    const config = buildConfig({ ...opts, prd: customPath });
    await showActionMenu(config, customPath);
    return;
  }

  console.log(); // spacing

  const opts = program.opts();
  const config = buildConfig({ ...opts, prd: selectedPrd });
  await showActionMenu(config, selectedPrd);
}

// Default action - run the loop if -n or --prd is provided, otherwise show interactive menu
program.action(async () => {
  const opts = program.opts();

  // If --prd is specified, run the loop
  if (opts.prd) {
    const config = buildConfig(opts);

    if (!await validateSetup(config)) return;

    await runCommand({
      iterations: parseInt(opts.iterations as string, 10),
      config,
    });
  } else {
    // Show interactive menu
    await interactiveMenu();
  }
});

// Parse and run
program.parse();
