/**
 * Ralph Orchestrator
 * Main execution loop extracted from run.ts
 * Coordinates providers, gates, judges, and sources
 */

import type { ExecutionContext, RalphConfig } from './context.js';
import type { Task, ProviderResult, ValidationResult, AggregatedJudgeResult, JudgeContext } from './types.js';
import type { TaskSourcePlugin, TaskDAG } from '../plugins/sources/types.js';
import type { ProviderPlugin, ResolvedProviderConfig } from '../plugins/providers/types.js';
import type { GatePlugin } from '../plugins/gates/types.js';

import { registry } from '../plugins/registry.js';
import { getProvider, isValidProvider, isValidClaudeModel, isValidGeminiModel, isValidCursorMode } from '../plugins/providers/index.js';
import { getGatesByPriority, getGatesForPackage } from '../plugins/gates/index.js';
import { runJudges, requiresJudge } from '../plugins/judges/index.js';
import { prdFileSource } from '../plugins/sources/index.js';
import { detectPackageFromCategory } from '../lib/validation/package-detector.js';
import type { Package } from './types.js';

// ============================================================================
// Orchestrator Options
// ============================================================================

export interface OrchestratorOptions {
  iterations: number;
  config: RalphConfig;
  source?: TaskSourcePlugin;
  onTaskStart?: (task: Task, iteration: number) => void;
  onTaskComplete?: (task: Task, result: ProviderResult) => void;
  onTaskFailed?: (task: Task, error: string) => void;
  onValidationStart?: (gates: string[]) => void;
  onValidationComplete?: (result: ValidationResult) => void;
  onJudgeStart?: (judges: string[]) => void;
  onJudgeComplete?: (result: AggregatedJudgeResult) => void;
}

// ============================================================================
// Orchestrator Result
// ============================================================================

export interface OrchestratorResult {
  completed: number;
  total: number;
  duration: number;
  tasks: TaskExecutionResult[];
}

export interface TaskExecutionResult {
  taskId: string;
  taskName: string;
  success: boolean;
  duration: number;
  providerResult?: ProviderResult;
  validationResult?: ValidationResult;
  judgeResult?: AggregatedJudgeResult;
  commitHash?: string;
  error?: string;
}

// ============================================================================
// Orchestrator Class
// ============================================================================

export class Orchestrator {
  private ctx: ExecutionContext;
  private options: OrchestratorOptions;
  private source: TaskSourcePlugin;
  private dag: TaskDAG | null = null;
  private validationAttempts = new Map<string, number>();

  constructor(ctx: ExecutionContext, options: OrchestratorOptions) {
    this.ctx = ctx;
    this.options = options;
    this.source = options.source || prdFileSource;
  }

  /**
   * Run the orchestration loop
   */
  async run(): Promise<OrchestratorResult> {
    const { iterations } = this.options;
    const logger = this.ctx.getLogger();
    const startTime = Date.now();
    const results: TaskExecutionResult[] = [];
    let completedCount = 0;

    // Initialize source
    await this.source.initialize(this.ctx);
    this.dag = await this.source.getDAG();

    // Validate DAG
    const validation = this.dag.validate();
    if (!validation.valid && validation.cycle) {
      throw new Error(`DAG cycle detected: ${validation.cycle.join(' -> ')}`);
    }

    // Log initial state
    const summary = await this.source.getSummary();
    logger.header('Ralph Wiggum - Autonomous Coding Loop');
    logger.info(`Tasks: ${summary.pending} pending, ${summary.completed} completed, ${summary.total} total`);

    // Main loop
    for (let i = 1; i <= iterations; i++) {
      // Get next task
      const task = await this.source.getNextTask({
        filterCategory: this.ctx.config.filterCategory,
        filterPriority: this.ctx.config.filterPriority as 'high' | 'medium' | 'low' | undefined,
      });

      if (!task) {
        logger.success('No more pending tasks!');
        break;
      }

      const result = await this.executeTask(task, i);
      results.push(result);

      if (result.success) {
        completedCount++;
      }
    }

    // Close source
    await this.source.close();

    const duration = Math.round((Date.now() - startTime) / 1000);

    return {
      completed: completedCount,
      total: iterations,
      duration,
      tasks: results,
    };
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: Task, iteration: number): Promise<TaskExecutionResult> {
    const logger = this.ctx.getLogger();
    const taskName = task.name || task.description.substring(0, 60);
    const taskKey = `${task.category}-${task.id}`;
    const startTime = Date.now();

    // Get previous validation attempts
    const previousAttempts = this.validationAttempts.get(taskKey) || 0;

    logger.header(`Iteration ${iteration}/${this.options.iterations}`);
    logger.info(`Task: ${taskName}`);
    logger.info(`Category: ${task.category} | Priority: ${task.priority}`);
    if (previousAttempts > 0) {
      logger.warning(`Validation attempt: ${previousAttempts + 1}`);
    }

    // Notify task start
    this.options.onTaskStart?.(task, iteration);

    // Mark as in progress
    await this.source.markInProgress(task.id);

    // Detect target packages
    const categoryPackage = task.category ? detectPackageFromCategory(task.category) : null;
    const targetPackages: Package[] = categoryPackage ? [categoryPackage] : [];

    // Resolve provider config
    const providerConfig = this.resolveProviderConfig(task);

    try {
      // Run provider
      const providerResult = await this.runProvider(task, providerConfig, targetPackages);

      if (!providerResult.success) {
        const error = providerResult.error || 'Provider execution failed';
        logger.error(`Task failed: ${error}`);
        this.options.onTaskFailed?.(task, error);

        return {
          taskId: task.id,
          taskName,
          success: false,
          duration: Math.round((Date.now() - startTime) / 1000),
          providerResult,
          error,
        };
      }

      // Check for completion marker
      const claimsComplete = this.checkForCompletion(providerResult.output);
      if (!claimsComplete) {
        logger.warning('Provider did not signal completion');
        return {
          taskId: task.id,
          taskName,
          success: false,
          duration: Math.round((Date.now() - startTime) / 1000),
          providerResult,
          error: 'Provider did not signal completion',
        };
      }

      // Run validation gates
      let validationResult: ValidationResult | undefined;
      if (!this.ctx.config.skipValidation) {
        validationResult = await this.runValidation(task, targetPackages, previousAttempts);
        this.validationAttempts.set(taskKey, (validationResult.attempts || previousAttempts) + 1);

        if (!validationResult.passed) {
          logger.warning(`Validation failed: ${validationResult.failed_gates.join(', ')}`);
          return {
            taskId: task.id,
            taskName,
            success: false,
            duration: Math.round((Date.now() - startTime) / 1000),
            providerResult,
            validationResult,
            error: `Validation failed: ${validationResult.failed_gates.join(', ')}`,
          };
        }
      }

      // Run judges if configured
      let judgeResult: AggregatedJudgeResult | undefined;
      if (requiresJudge(task)) {
        judgeResult = await this.runJudgeEvaluation(task, providerResult, validationResult);

        if (!judgeResult.passed) {
          logger.warning(`Judge panel rejected: ${judgeResult.summary}`);
          return {
            taskId: task.id,
            taskName,
            success: false,
            duration: Math.round((Date.now() - startTime) / 1000),
            providerResult,
            validationResult,
            judgeResult,
            error: judgeResult.summary,
          };
        }
      }

      // Mark complete
      await this.source.markComplete(task.id, {
        validationResults: validationResult,
        judgeResults: judgeResult,
      });

      // Propagate completion to unblock dependents
      const unblocked = await this.source.propagateCompletion(task.id);
      if (unblocked.length > 0) {
        logger.info(`Unblocked ${unblocked.length} dependent task(s)`);
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      logger.success(`Completed in ${providerResult.duration}s`);

      this.options.onTaskComplete?.(task, providerResult);

      return {
        taskId: task.id,
        taskName,
        success: true,
        duration,
        providerResult,
        validationResult,
        judgeResult,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Task execution error: ${errorMessage}`);
      this.options.onTaskFailed?.(task, errorMessage);

      return {
        taskId: task.id,
        taskName,
        success: false,
        duration: Math.round((Date.now() - startTime) / 1000),
        error: errorMessage,
      };
    }
  }

  /**
   * Resolve provider configuration from task and config
   */
  private resolveProviderConfig(task: Task): ResolvedProviderConfig {
    const cliConfig = this.ctx.config.providerConfig;

    let provider = cliConfig.taskProvider;
    let claudeModel = cliConfig.claudeModel;
    let geminiModel = cliConfig.geminiModel;
    let cursorModel = cliConfig.cursorModel;
    let cursorMode = cliConfig.cursorMode;

    // Task-level override (from PRD)
    const taskProvider = task.provider;
    if (taskProvider) {
      if (taskProvider.provider && isValidProvider(taskProvider.provider)) {
        provider = taskProvider.provider;
      }

      if (taskProvider.model) {
        if (provider === 'claude' && isValidClaudeModel(taskProvider.model)) {
          claudeModel = taskProvider.model as 'opus' | 'sonnet' | 'haiku';
        } else if (provider === 'gemini' && isValidGeminiModel(taskProvider.model)) {
          geminiModel = taskProvider.model as 'pro' | 'flash';
        } else if (provider === 'cursor') {
          cursorModel = taskProvider.model;
        }
      }

      if (taskProvider.mode && provider === 'cursor' && isValidCursorMode(taskProvider.mode)) {
        cursorMode = taskProvider.mode;
      }
    }

    return { provider, claudeModel, geminiModel, cursorModel, cursorMode };
  }

  /**
   * Run the AI provider for a task
   */
  private async runProvider(
    task: Task,
    providerConfig: ResolvedProviderConfig,
    targetPackages: Package[]
  ): Promise<ProviderResult> {
    const provider = getProvider(providerConfig.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${providerConfig.provider}`);
    }

    // Build prompt
    const prompt = this.buildTaskPrompt(task, targetPackages);

    // Get model-specific options
    let model: string;
    if (providerConfig.provider === 'claude') {
      model = providerConfig.claudeModel;
    } else if (providerConfig.provider === 'gemini') {
      model = providerConfig.geminiModel;
    } else {
      model = providerConfig.cursorModel;
    }

    return provider.run(this.ctx, {
      prompt,
      projectRoot: this.ctx.config.projectRoot,
      model,
      mode: providerConfig.cursorMode,
      dryRun: this.ctx.config.dryRun,
      timeout: 30 * 60 * 1000,
    });
  }

  /**
   * Build prompt for a task
   */
  private buildTaskPrompt(task: Task, targetPackages: Package[]): string {
    const name = task.name || task.description.substring(0, 50);
    let prompt = `## Task: ${name}\n\n`;
    prompt += `**Category:** ${task.category}\n`;
    prompt += `**Priority:** ${task.priority}\n`;
    prompt += `**ID:** ${task.id}\n\n`;
    prompt += `### Description\n${task.description}\n\n`;

    if (task.criteria && task.criteria.length > 0) {
      prompt += `### Steps / Acceptance Criteria\n`;
      for (const criterion of task.criteria) {
        prompt += `- ${criterion}\n`;
      }
      prompt += '\n';
    }

    if (task.notes) {
      prompt += `### Notes\n${task.notes}\n\n`;
    }

    // Add validation context
    if (targetPackages.length > 0) {
      prompt += `### Target Packages\n${targetPackages.join(', ')}\n\n`;
    }

    // Add completion marker instruction
    prompt += `\n---\nWhen you have completed the task, include the phrase "TASK_COMPLETE" in your final response.\n`;

    return prompt;
  }

  /**
   * Check if provider output indicates completion
   */
  private checkForCompletion(output: string): boolean {
    return output.includes('TASK_COMPLETE') ||
           output.includes('task complete') ||
           output.includes('Task Complete');
  }

  /**
   * Run validation gates
   */
  private async runValidation(
    task: Task,
    targetPackages: Package[],
    previousAttempts: number
  ): Promise<ValidationResult> {
    const logger = this.ctx.getLogger();
    const config = this.ctx.config;

    logger.info('Running validation gates...');
    this.options.onValidationStart?.(Object.keys(config.validationGates).filter(k => config.validationGates[k as keyof typeof config.validationGates]));

    const results: import('./types.js').GateResult[] = [];
    const failedGates: string[] = [];
    const startTime = Date.now();

    for (const pkg of targetPackages) {
      const gates = getGatesForPackage(pkg);

      for (const gate of gates) {
        const gateType = gate.metadata.gateType;
        const isEnabled = config.validationGates[gateType as keyof typeof config.validationGates];

        if (!isEnabled) continue;

        const result = await gate.run(this.ctx, {
          projectRoot: config.projectRoot,
          packageName: pkg,
          timeout: config.validationTimeout,
          taskNotes: task.notes,
        });

        results.push(result);

        if (!result.passed) {
          failedGates.push(`${gateType}:${pkg}`);

          if (config.validationFailFast) {
            break;
          }
        }
      }
    }

    const validationResult: ValidationResult = {
      last_run: new Date().toISOString(),
      passed: failedGates.length === 0,
      failed_gates: failedGates,
      attempts: previousAttempts + 1,
      gates: results,
    };

    this.options.onValidationComplete?.(validationResult);

    return validationResult;
  }

  /**
   * Run judge evaluation
   */
  private async runJudgeEvaluation(
    task: Task,
    providerResult: ProviderResult,
    validationResult?: ValidationResult
  ): Promise<AggregatedJudgeResult> {
    const logger = this.ctx.getLogger();
    const git = this.ctx.git;

    // Get git diff for judge context
    const codeChanges = await git.getDiff(this.ctx.config.projectRoot, true);

    const judgeCtx: JudgeContext = {
      task,
      codeChanges,
      validationResults: validationResult,
      providerSummary: providerResult.summary,
      evidencePath: task.evidencePath,
    };

    const judgeConfigs = task.judges || [];
    this.options.onJudgeStart?.(judgeConfigs.map(j => j.persona));

    const result = await runJudges(this.ctx, task, judgeCtx, {
      parallel: true,
      failFast: false,
      timeout: 60000,
    });

    this.options.onJudgeComplete?.(result);

    return result;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOrchestrator(ctx: ExecutionContext, options: OrchestratorOptions): Orchestrator {
  return new Orchestrator(ctx, options);
}
