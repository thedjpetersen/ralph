/**
 * Judge Plugins Index
 * Registers all built-in judge plugins
 */

import { registry, registerBuiltin } from '../registry.js';
import { qaEngineerJudge } from './qa-engineer.js';
import { securityAuditorJudge } from './security.js';
import { uxDesignerJudge } from './ux-designer.js';
import { softwareArchitectJudge } from './architect.js';
import { performanceEngineerJudge } from './performance.js';
import { aggregateJudgeResults } from './base.js';
import { getPersonaDefinition, getPersonaSystemPrompt, getPersonaCriteria } from './personas.js';
import { getProvider } from '../providers/index.js';
import type { JudgePlugin, JudgeEvaluationOptions } from './types.js';
import type { ExecutionContext } from '../../core/context.js';
import type { JudgeConfig, JudgeResult, AggregatedJudgeResult, JudgeContext, Task, AIProvider } from '../../core/types.js';

// Re-export types
export * from './types.js';
export * from './base.js';
export * from './personas.js';

// Re-export judge instances
export { qaEngineerJudge } from './qa-engineer.js';
export { securityAuditorJudge } from './security.js';
export { uxDesignerJudge } from './ux-designer.js';
export { softwareArchitectJudge } from './architect.js';
export { performanceEngineerJudge } from './performance.js';

// ============================================================================
// Judge Registration
// ============================================================================

/**
 * Register all built-in judge plugins
 */
export async function registerJudgePlugins(): Promise<void> {
  await registerBuiltin('judge', qaEngineerJudge);
  await registerBuiltin('judge', securityAuditorJudge);
  await registerBuiltin('judge', uxDesignerJudge);
  await registerBuiltin('judge', softwareArchitectJudge);
  await registerBuiltin('judge', performanceEngineerJudge);
}

/**
 * Get a judge plugin by name
 */
export function getJudge(name: string): JudgePlugin | undefined {
  return registry.get<JudgePlugin>('judge', name);
}

/**
 * Get all registered judge plugins
 */
export function getAllJudges(): JudgePlugin[] {
  return registry.getAll<JudgePlugin>('judge');
}

/**
 * List all registered judge names
 */
export function listJudges(): string[] {
  return registry.list('judge');
}

/**
 * Get judge by persona name
 */
export function getJudgeByPersona(personaName: string): JudgePlugin | undefined {
  const judges = getAllJudges();
  const normalized = personaName.toLowerCase();

  return judges.find(j =>
    j.metadata.persona.toLowerCase() === normalized ||
    j.metadata.name.toLowerCase() === normalized
  );
}

// ============================================================================
// Judge Execution
// ============================================================================

/**
 * Run judges for a task
 */
export async function runJudges(
  ctx: ExecutionContext,
  task: Task,
  judgeCtx: JudgeContext,
  options: JudgeEvaluationOptions = {}
): Promise<AggregatedJudgeResult> {
  const configs = task.judges || [];
  const logger = ctx.getLogger();

  if (configs.length === 0) {
    return {
      passed: true,
      overallScore: 100,
      results: [],
      summary: 'No judges configured',
      timestamp: new Date().toISOString(),
    };
  }

  // Default provider
  const defaultProvider = options.provider || 'claude';
  logger.info(`Running ${configs.length} judge evaluation(s) with ${defaultProvider} provider...`);

  const { parallel = true, failFast = false, timeout = 60000 } = options;
  const results: JudgeResult[] = [];

  const runSingleJudge = async (config: JudgeConfig): Promise<JudgeResult> => {
    // Determine provider for this judge (can be overridden per-judge in PRD)
    const judgeProvider = config.provider || defaultProvider;

    // Try to find a plugin for this persona
    let judge = getJudgeByPersona(config.persona);

    if (!judge) {
      // Create a dynamic judge using the persona definition or fallback
      const definition = getPersonaDefinition(config.persona);
      const systemPrompt = definition?.systemPrompt || getPersonaSystemPrompt(config.persona);
      const criteria = config.criteria || definition?.criteria || getPersonaCriteria(config.persona);

      // Run with dynamic persona using provider plugin
      return runDynamicJudge(ctx, config, judgeCtx, {
        systemPrompt,
        criteria,
        timeout,
        provider: judgeProvider,
        model: config.model || options.model,
        threshold: config.threshold,
      });
    }

    return judge.run(ctx, judgeCtx, {
      provider: judgeProvider,
      model: config.model || options.model,
      timeout,
      threshold: config.threshold,
    });
  };

  if (parallel && !failFast) {
    // Run all judges in parallel
    const promises = configs.map(config => runSingleJudge(config));
    results.push(...await Promise.all(promises));
  } else {
    // Run judges sequentially (for fail-fast or sequential mode)
    for (const config of configs) {
      const result = await runSingleJudge(config);
      results.push(result);

      // Check if we should stop early
      if (failFast && !result.passed) {
        const isRequired = config.required !== false;
        if (isRequired) {
          logger.warning(`  Fail-fast: ${config.persona} rejected (required judge)`);
          break;
        }
      }
    }
  }

  // Aggregate results
  const aggregated = aggregateJudgeResults(configs, results);

  // Log summary
  const passedCount = results.filter(r => r.passed).length;
  logger.info(`Judge results: ${passedCount}/${results.length} passed`);

  return aggregated;
}

/**
 * Run a dynamic judge with custom persona using provider plugin
 */
async function runDynamicJudge(
  ctx: ExecutionContext,
  config: JudgeConfig,
  judgeCtx: JudgeContext,
  options: {
    systemPrompt: string;
    criteria: string[];
    timeout: number;
    provider: AIProvider;
    model?: string;
    threshold?: number;
  }
): Promise<JudgeResult> {
  const logger = ctx.getLogger();
  const threshold = options.threshold ?? 70;
  const criteria = judgeCtx.task.criteria || [];

  // Get the model for this provider
  const model = getModelForProvider(options.provider, options.model);

  logger.info(`  Running ${config.persona} evaluation (${options.provider}/${model})...`);

  // Build the prompt
  let prompt = `You are acting as a ${config.persona} reviewing a completed development task.

## Your Role
${options.systemPrompt}

## Task Being Reviewed
${judgeCtx.task.description}

## Acceptance Criteria
${criteria.length > 0 ? criteria.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'None specified'}

## Code Changes Made
\`\`\`diff
${judgeCtx.codeChanges || 'No code changes detected'}
\`\`\`

`;

  if (judgeCtx.providerSummary) {
    prompt += `## Developer's Summary
${judgeCtx.providerSummary}

`;
  }

  if (options.criteria.length > 0) {
    prompt += `## Additional Criteria to Evaluate
${options.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

`;
  }

  prompt += `## Your Task
Review this task completion as a ${config.persona}. Evaluate whether the implementation meets the requirements.

Score the implementation from 0-100.

Respond in JSON format:
\`\`\`json
{
  "score": 0-100,
  "verdict": "Brief one-line verdict",
  "reasoning": "Detailed explanation",
  "suggestions": ["Optional suggestions"],
  "confidence": 0.0-1.0
}
\`\`\``;

  try {
    // Get the provider plugin
    const provider = getProvider(options.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${options.provider}`);
    }

    // Run the provider
    const result = await provider.run(ctx, {
      prompt,
      projectRoot: ctx.config.projectRoot,
      model,
      dryRun: ctx.config.dryRun,
      timeout: options.timeout,
    });

    if (!result.success) {
      logger.error(`  Judge ${config.persona} provider failed: ${result.error}`);
      return {
        score: 0,
        passed: false,
        persona: config.persona,
        verdict: 'Evaluation failed',
        reasoning: `Provider error: ${result.error}`,
        confidence: 0,
        timestamp: new Date().toISOString(),
      };
    }

    // Parse response
    const jsonMatch = result.output.match(/```json\s*([\s\S]*?)\s*```/);
    let score = 0;
    let verdict = 'No verdict';
    let reasoning = result.output;
    let suggestions: string[] | undefined;
    let confidence = 0.5;

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        score = typeof parsed.score === 'number' ? parsed.score : 0;
        verdict = parsed.verdict || verdict;
        reasoning = parsed.reasoning || reasoning;
        suggestions = parsed.suggestions;
        confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
      } catch {
        // Try parsing entire output as JSON
        try {
          const parsed = JSON.parse(result.output.trim());
          score = typeof parsed.score === 'number' ? parsed.score : 0;
          verdict = parsed.verdict || verdict;
          reasoning = parsed.reasoning || reasoning;
          suggestions = parsed.suggestions;
          confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
        } catch {
          // Use defaults with text interpretation
          const lowerOutput = result.output.toLowerCase();
          const passed = lowerOutput.includes('approved') ||
            lowerOutput.includes('passes') ||
            !lowerOutput.includes('fail');
          score = passed ? 70 : 30;
        }
      }
    }

    return {
      score,
      passed: score >= threshold,
      persona: config.persona,
      verdict,
      reasoning,
      suggestions,
      confidence,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`  Judge ${config.persona} failed:`, error);
    return {
      score: 0,
      passed: false,
      persona: config.persona,
      verdict: 'Evaluation failed',
      reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get the default model for a provider
 */
function getModelForProvider(provider: AIProvider, model?: string): string {
  if (model) return model;

  switch (provider) {
    case 'claude':
      return 'sonnet';
    case 'gemini':
      return 'pro';
    case 'cursor':
      return 'claude-3-5-sonnet';
    default:
      return 'sonnet';
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if task requires judge evaluation
 */
export function requiresJudge(task: Task): boolean {
  return Boolean(task.judges && task.judges.length > 0);
}

/**
 * Get the number of judges configured for a task
 */
export function getJudgeCount(task: Task): number {
  return task.judges?.length || 0;
}

/**
 * Get required judges for a task
 */
export function getRequiredJudges(task: Task): JudgeConfig[] {
  return (task.judges || []).filter(j => j.required !== false);
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format a single judge result for console display
 */
export function formatSingleJudgeResult(result: JudgeResult): string {
  const status = result.passed ? '✓ APPROVED' : '✗ REJECTED';
  const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';

  let output = `
${statusColor}${status}${reset} by ${result.persona}
  Score: ${result.score}/100
  Verdict: ${result.verdict}
  Confidence: ${Math.round(result.confidence * 100)}%

  Reasoning:
    ${result.reasoning.split('\n').join('\n    ')}
`;

  if (result.suggestions && result.suggestions.length > 0) {
    output += `
  Suggestions:
${result.suggestions.map(s => `    - ${s}`).join('\n')}
`;
  }

  return output;
}

/**
 * Format aggregated judge results for console display
 * Accepts both core/types.ts and lib/prd.ts AggregatedJudgeResult
 */
export function formatJudgeResultsForConsole(result: AggregatedJudgeResult | PrdAggregatedJudgeResult): string {
  if (result.results.length === 0) {
    return '\nNo judges configured\n';
  }

  const overallStatus = result.passed ? '\x1b[32m✓ APPROVED\x1b[0m' : '\x1b[31m✗ REJECTED\x1b[0m';

  let output = `
Judge Panel Results: ${overallStatus}
${result.summary}
${'─'.repeat(50)}
`;

  for (const judgeResult of result.results) {
    const status = judgeResult.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    output += `
${status} ${judgeResult.persona}: ${judgeResult.verdict}
   Score: ${judgeResult.score}/100 | Confidence: ${Math.round(judgeResult.confidence * 100)}%
   ${judgeResult.reasoning.split('\n')[0].substring(0, 80)}...
`;
  }

  // Collect all suggestions
  const allSuggestions = result.results
    .flatMap(r => r.suggestions || [])
    .filter((s, i, arr) => arr.indexOf(s) === i)  // Unique
    .slice(0, 5);

  if (allSuggestions.length > 0) {
    output += `
${'─'.repeat(50)}
Combined Suggestions:
${allSuggestions.map(s => `  • ${s}`).join('\n')}
`;
  }

  return output;
}

/**
 * Format aggregated judge results for Discord notification
 * Accepts both core/types.ts and lib/prd.ts AggregatedJudgeResult
 */
export function formatJudgeResultsForDiscord(result: AggregatedJudgeResult | PrdAggregatedJudgeResult): string {
  if (result.results.length === 0) {
    return 'No judges configured';
  }

  const overallStatus = result.passed ? '✅ **APPROVED**' : '❌ **REJECTED**';

  let output = `${overallStatus}\n${result.summary}\n\n`;

  for (const judgeResult of result.results) {
    const status = judgeResult.passed ? '✓' : '✗';
    output += `${status} **${judgeResult.persona}** (${judgeResult.score}/100): ${judgeResult.verdict}\n`;
  }

  // Collect suggestions
  const allSuggestions = result.results
    .flatMap(r => r.suggestions || [])
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 3);

  if (allSuggestions.length > 0) {
    output += `\n**Suggestions:**\n`;
    output += allSuggestions.map(s => `• ${s}`).join('\n');
  }

  return output.substring(0, 1900);  // Discord limit
}

// ============================================================================
// Compatibility Layer for run.ts
// ============================================================================

import type { PrdItem, AggregatedJudgeResult as PrdAggregatedJudgeResult } from '../../lib/prd.js';
import type { ValidationResult } from '../../lib/validation/validation.types.js';
import type { Logger } from '../../core/context.js';
import { logger as defaultLogger } from '../../lib/logger.js';

/**
 * Legacy JudgeContext for compatibility with run.ts
 */
export interface LegacyJudgeContext {
  taskDescription: string;
  acceptanceCriteria: string[];
  codeChanges: string;
  validationResults?: ValidationResult;
  evidencePath?: string;
  claudeSummary?: string;
}

/**
 * Legacy JudgeOptions for compatibility
 */
export interface LegacyJudgeOptions {
  parallel?: boolean;
  failFast?: boolean;
  timeout?: number;
}

/**
 * Compatibility function: Run judges using PrdItem (old run.ts interface)
 * Converts to new Task-based interface internally
 */
export async function runJudgesCompat(
  item: PrdItem,
  context: LegacyJudgeContext,
  projectRoot: string,
  options: LegacyJudgeOptions = {}
): Promise<PrdAggregatedJudgeResult> {
  // Convert PrdItem to Task
  const task: Task = {
    id: item.id,
    name: item.name,
    description: item.description,
    priority: item.priority,
    category: item.category,
    status: item.status || 'pending',
    dependencies: item.dependencies || [],
    criteria: item.acceptance_criteria || item.steps,
    notes: item.notes,
    judges: item.judges,
  };

  // Convert legacy context to new context
  const judgeCtx: JudgeContext = {
    task,
    codeChanges: context.codeChanges,
    validationResults: context.validationResults,
    providerSummary: context.claudeSummary,
    evidencePath: context.evidencePath,
  };

  // Create a minimal execution context
  const ctx: ExecutionContext = {
    config: {
      projectRoot,
      dryRun: false,
    } as ExecutionContext['config'],
    sessionId: 'compat',
    iteration: 0,
    startTime: Date.now(),
    getLogger: () => defaultLogger as Logger,
    getNotifier: () => ({} as ExecutionContext extends { getNotifier(): infer R } ? R : never),
    getSessionManager: () => ({} as ExecutionContext extends { getSessionManager(): infer R } ? R : never),
    getLearningsManager: () => ({} as ExecutionContext extends { getLearningsManager(): infer R } ? R : never),
    getEventEmitter: () => ({} as ExecutionContext extends { getEventEmitter(): infer R } ? R : never),
    git: {} as ExecutionContext['git'],
  };

  // Run judges using the plugin system
  const result = await runJudges(ctx, task, judgeCtx, {
    parallel: options.parallel,
    failFast: options.failFast,
    timeout: options.timeout,
  });

  // Convert to legacy format (AggregatedJudgeResult from prd.ts)
  return {
    passed: result.passed,
    overallScore: result.overallScore,
    results: result.results.map(r => ({
      passed: r.passed,
      score: r.score,
      persona: r.persona,
      verdict: r.verdict,
      reasoning: r.reasoning,
      suggestions: r.suggestions,
      confidence: r.confidence,
      timestamp: r.timestamp,
    })),
    summary: result.summary,
    timestamp: result.timestamp,
  };
}

/**
 * Check if PrdItem requires judge evaluation (compatibility)
 */
export function requiresJudgeCompat(item: PrdItem): boolean {
  return Boolean(item.judges && item.judges.length > 0);
}
