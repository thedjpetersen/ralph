import { logger } from '../lib/logger.js';
import { RalphConfig } from '../lib/config.js';
import {
  loadAllPrdFiles,
  loadPrdFile,
  getNextTask,
  markTaskInProgress,
  markTaskComplete,
  popTask,
  formatTaskForPrompt,
  getTaskSummary,
  updateTaskValidation,
  updateTaskJudgeResults,
} from '../lib/prd.js';
import { join, dirname } from 'path';
import { buildTaskPrompt, checkForCompletion } from '../lib/claude.js';
import { runProvider, getProviderDisplayName, resolveProviderConfig } from '../lib/providers.js';
import { detectPackageFromCategory } from '../lib/validation/package-detector.js';
import type { Package } from '../lib/validation/validation.types.js';
import {
  setupHooks,
  cleanupHooks,
  getHookEnvironment,
  verifyHooksInstallation,
} from '../lib/hooks.js';
import { Notifier } from '../lib/notify.js';
import * as git from '../lib/git.js';
import {
  runValidation,
  shouldMarkComplete,
  getRetryMessage,
  formatValidationResultsForConsole,
  ValidationResult,
} from '../lib/validation/index.js';
import {
  SessionManager,
  SessionState,
  createSessionManager,
} from '../lib/session.js';
import {
  createLearningsManager,
  processClaudeOutput,
} from '../lib/learnings.js';
import {
  runJudgesCompat as runJudges,
  requiresJudgeCompat as requiresJudge,
  formatJudgeResultsForConsole,
  type LegacyJudgeContext as JudgeContext,
} from '../plugins/judges/index.js';
import type { AggregatedJudgeResult } from '../lib/prd.js';

export interface RunOptions {
  iterations: number;
  config: RalphConfig;
  sessionManager?: SessionManager;
  resumeSession?: SessionState;
}

export async function runCommand(options: RunOptions): Promise<void> {
  const { iterations, config, resumeSession } = options;

  // Initialize services
  const notifier = new Notifier(config.notifyScript, config.notifyEnabled);
  const sessionManager = options.sessionManager || createSessionManager(config);
  const learningsManager = createLearningsManager(config.learningsFile);

  // Get git state for session
  const gitBranch = await git.getCurrentBranch(config.projectRoot);
  const gitStatus = await git.getStatus(config.projectRoot);
  const gitCommit = gitStatus.branch; // We'll use branch name for now

  // Create or use existing session
  let sessionId: string;
  if (resumeSession) {
    sessionId = resumeSession.sessionId;
    logger.info(`Resuming session: ${sessionId}`);
  } else {
    sessionId = await sessionManager.createSession(config, iterations, gitBranch, gitCommit);
  }

  // Setup signal handlers for graceful shutdown
  const handleSignal = (signal: string) => {
    logger.warning(`\nReceived ${signal}, marking session as crashed...`);
    sessionManager.markCrashed(new Error(`Process received ${signal}`));
    process.exit(1);
  };

  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    sessionManager.markCrashed(error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('Unhandled rejection:', error);
    sessionManager.markCrashed(error);
    process.exit(1);
  });

  // Load PRD files - either a specific file or all files in directory
  let prdFiles;
  if (config.prdFile) {
    const prd = loadPrdFile(config.prdFile);
    if (!prd) {
      logger.error(`Failed to load PRD file: ${config.prdFile}`);
      return;
    }
    prdFiles = [prd];
    logger.info(`Using PRD file: ${config.prdFile}`);
  } else {
    prdFiles = loadAllPrdFiles(config.prdDir);
    if (prdFiles.length === 0) {
      logger.error('No PRD files found');
      return;
    }
  }

  const summary = getTaskSummary(prdFiles);
  const providerName = getProviderDisplayName(config.providerConfig.taskProvider);
  const modelInfo = config.providerConfig.taskProvider === 'claude'
    ? config.providerConfig.claudeModel
    : config.providerConfig.taskProvider === 'gemini'
      ? config.providerConfig.geminiModel
      : config.providerConfig.cursorModel;

  // Show rich session banner
  logger.sessionBanner({
    sessionId,
    project: prdFiles[0]?.project,
    prdFile: config.prdFile || config.prdDir,
    pending: summary.pending,
    completed: summary.completed,
    total: summary.total,
    provider: providerName,
    model: modelInfo,
    iterations,
    consumeMode: config.consumeMode,
  });

  // Send session start notification
  await notifier.sessionStarted(summary.pending, config.model);

  // Setup hooks if enabled
  let hooksSettingsPath: string | null = null;
  if (config.hooks.enabled) {
    // Verify hooks are installed
    const verification = verifyHooksInstallation();
    if (!verification.valid) {
      logger.error(`Hook files missing: ${verification.missing.join(', ')}`);
      logger.error('Run from the ralph directory or check installation');
      return;
    }

    // Setup hooks (will be cleaned up on exit)
    hooksSettingsPath = setupHooks({
      projectRoot: config.projectRoot,
      hooksConfig: config.hooks,
    });
  }

  // Cleanup hooks on exit
  const cleanup = () => {
    if (config.hooks.enabled) {
      cleanupHooks(config.projectRoot);
    }
  };

  // Register cleanup handlers
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  let completedCount = 0;
  const startTime = Date.now();

  // Track validation attempts per task
  const validationAttempts = new Map<string, number>();

  for (let i = 1; i <= iterations; i++) {
    // Get next task
    const next = getNextTask(prdFiles, {
      filterCategory: config.filterCategory,
      filterPriority: config.filterPriority,
    });

    if (!next) {
      logger.success('No more pending tasks!');
      break;
    }

    const { prdFile, item } = next;
    const taskName = item.name || item.description.substring(0, 60);
    const taskKey = `${prdFile.category}-${item.id}`;

    // Get previous validation attempts for this task
    const previousAttempts = validationAttempts.get(taskKey) || (item.validation_results?.attempts || 0);

    // Show rich task banner
    logger.taskBanner({
      iteration: i,
      totalIterations: iterations,
      id: item.id,
      name: item.name || prdFile.category,
      description: item.description,
      category: prdFile.category,
      priority: item.priority,
      steps: item.steps || item.acceptance_criteria,
      attempt: previousAttempts > 0 ? previousAttempts + 1 : undefined,
    });

    // Mark as in progress
    markTaskInProgress(prdFile, item.id);

    // Track in session
    const taskStartTime = Date.now();
    sessionManager.startTask({
      prdFile: prdFile.filepath,
      taskId: item.id,
      taskName,
      startedAt: new Date().toISOString(),
    });

    // Detect target packages from category
    const categoryPackage = detectPackageFromCategory(prdFile.category);
    const targetPackages: Package[] = categoryPackage ? [categoryPackage] : [];
    const targetPackage = categoryPackage || 'frontend';

    // Set hook environment variables if hooks are enabled
    if (config.hooks.enabled) {
      const hookEnv = getHookEnvironment({
        targetPackage,
        maxContinuations: config.hooks.maxContinuations,
        hooksConfig: config.hooks,
      });
      Object.assign(process.env, hookEnv);
    }

    // Resolve effective provider config (PRD overrides CLI)
    const effectiveProvider = resolveProviderConfig(config.providerConfig, prdFile, item);

    // Log if using PRD-level provider override
    if (item.provider?.provider || prdFile.metadata?.provider?.provider) {
      const source = item.provider?.provider ? 'task' : 'file';
      logger.info(`Provider override (${source}): ${getProviderDisplayName(effectiveProvider.provider)}`);
    }

    // Log if using task-level validation override
    if (item.validation) {
      if (item.validation.skip) {
        logger.info('Validation override (task): skipping all validation');
      } else if (item.validation.gates) {
        const disabled = Object.entries(item.validation.gates)
          .filter(([_, enabled]) => enabled === false)
          .map(([gate]) => gate);
        if (disabled.length > 0) {
          logger.info(`Validation override (task): disabled gates: ${disabled.join(', ')}`);
        }
      }
    }

    // Build prompt and run provider
    const taskPrompt = formatTaskForPrompt(item, prdFile);
    const fullPrompt = buildTaskPrompt(taskPrompt, config, {
      taskId: item.id,
      previousValidationResult: item.validation_results,
      previousJudgeResult: item.judge_results,
      targetPackages,
    });

    const result = await runProvider(
      effectiveProvider.provider,
      fullPrompt,
      {
        projectRoot: config.projectRoot,
        dryRun: config.dryRun,
        claudeModel: effectiveProvider.claudeModel,
        geminiModel: effectiveProvider.geminiModel,
        cursorModel: effectiveProvider.cursorModel,
        cursorMode: effectiveProvider.cursorMode,
        tokenLimit: effectiveProvider.claudeModel === 'opus' ? config.opusTokenLimit : config.sonnetTokenLimit,
      }
    );

    if (!result.success) {
      logger.error(`Task failed: ${result.error}`);
      await notifier.taskFailed(taskName, i, result.error || 'Unknown error');
      continue;
    }

    // Check for completion marker from Claude
    const claudeClaimsComplete = checkForCompletion(result.output);

    if (!claudeClaimsComplete) {
      logger.warning('Claude did not signal completion');
      continue;
    }

    // Run validation gates (unless skipped globally or per-task)
    let validationResult: ValidationResult | undefined;
    let validationPassed = true;

    const skipValidation = config.skipValidation || item.validation?.skip;

    if (!skipValidation) {
      logger.info('Running validation gates...');

      // Merge task-level validation config with global config
      const taskValidation = item.validation || {};
      const mergedGates = {
        ...config.validationGates,
        ...taskValidation.gates,
      };

      validationResult = await runValidation(config.projectRoot, {
        config: {
          gates: mergedGates,
          timeout: taskValidation.timeout ?? config.validationTimeout,
          failFast: taskValidation.failFast ?? config.validationFailFast,
          packages: taskValidation.packages,
        },
        category: prdFile.category,
        taskNotes: item.notes,
        previousAttempts,
      });

      // Log validation results
      console.log(formatValidationResultsForConsole(validationResult));

      validationPassed = shouldMarkComplete(validationResult);

      // Store validation results in PRD
      updateTaskValidation(prdFile, item.id, validationResult);

      // Track attempts
      validationAttempts.set(taskKey, validationResult.attempts);

      if (!validationPassed) {
        const retryMsg = getRetryMessage(validationResult);
        logger.warning(retryMsg);
        await notifier.validationFailed(taskName, i, validationResult);

        // Log validation failure to learnings
        learningsManager.logValidationFailure(item.id, validationResult);

        // Warn if many attempts
        if (validationResult.attempts >= 3) {
          logger.error(`Task has failed validation ${validationResult.attempts} times`);
        }

        // Continue to next iteration - task stays in_progress
        continue;
      }
    }

    // Process Claude output for learnings
    const learnings = processClaudeOutput(result.output, learningsManager, item.id);
    if (learnings.length > 0) {
      logger.info(`Captured ${learnings.length} learning(s)`);
    }

    // Run LLM judges if configured
    let judgeResult: AggregatedJudgeResult | undefined;
    if (requiresJudge(item)) {
      // Get git diff for judge context
      const gitDiff = await git.getDiff(config.projectRoot, true);  // Staged changes

      const judgeContext: JudgeContext = {
        taskDescription: item.description,
        acceptanceCriteria: item.acceptance_criteria || item.steps || [],
        codeChanges: gitDiff,
        validationResults: validationResult,
        evidencePath: item.evidence_path,
        claudeSummary: result.summary,
      };

      judgeResult = await runJudges(item, judgeContext, config.projectRoot, {
        parallel: true,
        failFast: false,
        timeout: 60000,
      });

      // Log judge results
      console.log(formatJudgeResultsForConsole(judgeResult));

      if (!judgeResult.passed) {
        logger.warning(`Judge panel rejected task: ${judgeResult.summary}`);
        await notifier.judgeFailed(taskName, i, judgeResult);

        // Store judge results so Claude can see feedback on retry
        updateTaskJudgeResults(prdFile, item.id, judgeResult);

        // Continue to next iteration - task stays in_progress
        continue;
      }
    }

    // Mark task complete (or pop in consume mode)
    if (config.consumeMode) {
      // Pop task from PRD (removes it from the array)
      const archivePath = config.archiveCompleted
        ? join(dirname(prdFile.filepath), `${prdFile.category}-completed.json`)
        : undefined;

      const popped = popTask(prdFile, item.id, { archiveTo: archivePath });
      if (!popped) {
        logger.error(`Failed to pop task ${item.id}`);
        continue;
      }
      logger.info(`Task consumed (${prdFile.items.length} remaining in PRD)`);
    } else {
      // Traditional mode: mark as complete but keep in file
      markTaskComplete(prdFile, item.id, {
        validationResults: validationResult,
        judgeResults: judgeResult,
      });
    }
    completedCount++;

    // Get git status for changes summary
    const gitStatusAfter = await git.getStatus(config.projectRoot);
    const changesStr = git.summarizeChanges(gitStatusAfter);

    // Note: Claude handles task-level notifications and evidence capture via scripts
    // The wrapper only handles session-level notifications

    // Commit if we have changes and commits are enabled
    let commitHash: string | undefined;
    if (!config.noCommit && !gitStatusAfter.clean) {
      await git.stageAll(config.projectRoot);
      const commitMsg = `Ralph: ${taskName} (${prdFile.category}-${item.id})`;
      await git.commit(config.projectRoot, commitMsg);
      // Get the commit hash
      const commits = await git.getRecentCommits(config.projectRoot, 1);
      if (commits.length > 0) {
        commitHash = commits[0].split(' ')[0];
      }
    }

    // Track task completion in session
    const taskDuration = Math.round((Date.now() - taskStartTime) / 1000);
    sessionManager.completeTask({
      taskId: item.id,
      taskName,
      prdFile: prdFile.filepath,
      duration: taskDuration,
      commitHash,
      validationResult,
      completedAt: new Date().toISOString(),
    });

    // Show task completion banner
    logger.taskComplete(taskName, taskDuration, changesStr, commitHash);

    console.log(); // spacing
  }

  // Session complete
  const totalDuration = Math.round((Date.now() - startTime) / 1000);

  // Show session completion banner
  logger.sessionComplete(completedCount, iterations, totalDuration);

  // Mark session as completed
  sessionManager.completeSession();

  // Send session complete notification
  await notifier.sessionCompleted(completedCount, iterations, totalDuration);

  // Cleanup hooks
  cleanup();
}
