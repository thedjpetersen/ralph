/**
 * Factory Mode — Dynamic Planner
 *
 * The key differentiator: a planner loop that periodically evaluates progress
 * against the specification and generates NEW tasks to fill the queue until
 * the desired end state is achieved.
 */

import { execa } from 'execa';
import { readFileSync, writeFileSync } from 'fs';
import type { RalphConfig } from '../config.js';
import { loadPrdFile, loadAllPrdFiles } from '../prd.js';
import type { PrdFile, PrdItem } from '../prd.js';
import type { ProviderSlot, PlannerResult, FactoryConfig } from './types.js';
import { runProvider } from '../providers.js';
import { logger } from '../logger.js';

// ============================================================================
// Stream-JSON text extraction
// ============================================================================

/**
 * Extract all text blocks from Claude's stream-json output.
 * Stream-json format: each line is a JSON event like:
 *   {"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}
 * We need to extract the actual text content from these events.
 */
function extractTextFromStreamJson(rawOutput: string): string {
  const textBlocks: string[] = [];

  for (const line of rawOutput.split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      // Claude stream-json format
      if (event.type === 'assistant' && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'text' && block.text) {
            textBlocks.push(block.text);
          }
        }
      }
      // Gemini format
      if ((event.type === 'text' || event.text) && !event.message) {
        textBlocks.push(event.text || event.content || '');
      }
    } catch {
      // Not JSON, might be raw text
    }
  }

  return textBlocks.join('\n');
}

// ============================================================================
// Planner
// ============================================================================

export class Planner {
  private running = false;
  private specSatisfied = false;
  private hasEvaluatedOnce = false;
  private evaluating = false;
  private onNewTasks?: (tasks: PrdItem[]) => void;
  private onSpecSatisfied?: () => void;

  /** Queue threshold: only generate new tasks when pending count drops below this */
  private readonly refillThreshold: number;

  constructor(
    private readonly config: RalphConfig,
    private readonly factoryConfig: FactoryConfig,
    private readonly mainRepo: string,
  ) {
    // Refill when queue drops below 5 tasks (or maxWorkers * 2, whichever is larger)
    this.refillThreshold = Math.max(5, this.factoryConfig.pool.maxTotalWorkers * 2);
  }

  /**
   * Start the planner. Does NOT run on a fixed interval.
   * Instead, the orchestrator calls `maybeRefill()` after task completions.
   * If spec content is available, runs an immediate initial evaluation.
   */
  start(onNewTasks: (tasks: PrdItem[]) => void, onSpecSatisfied: () => void): void {
    if (this.running) return;

    this.running = true;
    this.onNewTasks = onNewTasks;
    this.onSpecSatisfied = onSpecSatisfied;
    logger.info(`Planner started (refill threshold: ${this.refillThreshold} tasks)`);

    // If spec content is provided, run an immediate evaluation
    // so the planner can generate initial tasks before the main loop checks convergence
    if (this.factoryConfig.specContent) {
      logger.info('Planner: running initial evaluation with spec content...');
      this.runEvaluation();  // Fire-and-forget (async)
    }
  }

  /**
   * Stop the planner.
   */
  stop(): void {
    this.running = false;
    logger.debug('Planner stopped');
  }

  /**
   * Called by the orchestrator when the queue might need refilling.
   * Only triggers an evaluation if pending tasks are below the threshold.
   */
  async maybeRefill(pendingCount: number): Promise<void> {
    if (!this.running || this.evaluating || this.specSatisfied) return;

    if (pendingCount >= this.refillThreshold) {
      logger.debug(`Planner: queue has ${pendingCount} tasks (threshold ${this.refillThreshold}), skipping`);
      return;
    }

    logger.info(`Planner: queue low (${pendingCount}/${this.refillThreshold}), generating more tasks...`);
    await this.runEvaluation();
  }

  /**
   * Check if the planner thinks the spec is satisfied.
   */
  isSpecSatisfied(): boolean {
    return this.specSatisfied;
  }

  /**
   * Check if the planner has completed at least one evaluation.
   * Used to avoid premature convergence when spec content is provided.
   */
  hasEvaluated(): boolean {
    return this.hasEvaluatedOnce;
  }

  private async runEvaluation(): Promise<void> {
    if (this.evaluating) return;
    this.evaluating = true;

    try {
      const result = await this.evaluate();
      this.hasEvaluatedOnce = true;

      if (result.newTasks.length > 0) {
        logger.info(`Planner generated ${result.newTasks.length} new task(s)`);
        this.onNewTasks?.(result.newTasks);
      }

      if (result.specSatisfied) {
        this.specSatisfied = true;
        logger.info('Planner: specification satisfied');
        this.onSpecSatisfied?.();
      }
    } catch (error) {
      this.hasEvaluatedOnce = true;
      logger.error(`Planner evaluation failed: ${error}`);
    } finally {
      this.evaluating = false;
    }
  }

  /**
   * Run a single planner evaluation.
   */
  async evaluate(): Promise<PlannerResult> {
    // 1. Gather context
    const prdFiles = this.loadPrdFiles();
    const completedTasks = this.getCompletedTasks(prdFiles);
    const pendingTasks = this.getPendingTasks(prdFiles);
    const gitDiffSummary = await this.getGitDiffSummary();
    const specDescription = this.getSpecDescription(prdFiles);

    // 2. Build planner prompt
    const prompt = this.buildPlannerPrompt({
      specDescription,
      completedTasks,
      pendingTasks,
      gitDiffSummary,
    });

    // 3. Call planner LLM
    const slot = this.factoryConfig.plannerProvider;

    logger.debug(`Planner: evaluating with ${slot.provider}:${slot.model}`);

    const result = await runProvider(
      slot.provider,
      prompt,
      {
        projectRoot: this.mainRepo,
        dryRun: this.config.dryRun,
        claudeModel: slot.provider === 'claude' ? slot.model as 'opus' | 'sonnet' : undefined,
        geminiModel: slot.provider === 'gemini' ? slot.model as 'pro' | 'flash' : undefined,
        tokenLimit: this.config.sonnetTokenLimit,
      }
    );

    if (!result.success) {
      logger.warning('Planner LLM call failed');
      return { newTasks: [], specSatisfied: false, reasoning: 'LLM call failed' };
    }

    // 4. Extract text from stream-json output and parse response
    const textContent = extractTextFromStreamJson(result.output);
    // Also check the summary (lastTextResponse) as a fallback
    const fullText = textContent || result.summary || result.output;
    return this.parseResponse(fullText, prdFiles);
  }

  // ============================================================================
  // Internal
  // ============================================================================

  private loadPrdFiles(): PrdFile[] {
    if (this.config.prdFile) {
      const prd = loadPrdFile(this.config.prdFile);
      return prd ? [prd] : [];
    }
    return loadAllPrdFiles(this.config.prdDir);
  }

  private getCompletedTasks(prdFiles: PrdFile[]): PrdItem[] {
    const completed: PrdItem[] = [];
    for (const prd of prdFiles) {
      for (const item of prd.items) {
        if (item.status === 'completed' || item.passes === true) {
          completed.push(item);
        }
      }
    }
    return completed;
  }

  private getPendingTasks(prdFiles: PrdFile[]): PrdItem[] {
    const pending: PrdItem[] = [];
    for (const prd of prdFiles) {
      for (const item of prd.items) {
        if (item.status !== 'completed' && item.passes !== true) {
          pending.push(item);
        }
      }
    }
    return pending;
  }

  private getSpecDescription(prdFiles: PrdFile[]): string {
    const parts: string[] = [];
    for (const prd of prdFiles) {
      if (prd.description) parts.push(prd.description);
      if (prd.project) parts.push(`Project: ${prd.project}`);
    }
    return parts.join('\n') || 'No specification description available';
  }

  private async getGitDiffSummary(): Promise<string> {
    try {
      const { stdout } = await execa('git', ['diff', '--stat', 'HEAD~10..HEAD'], {
        cwd: this.mainRepo,
        reject: false,
      });
      return stdout || 'No recent changes';
    } catch {
      return 'Unable to get git diff';
    }
  }

  private buildPlannerPrompt(context: {
    specDescription: string;
    completedTasks: PrdItem[];
    pendingTasks: PrdItem[];
    gitDiffSummary: string;
  }): string {
    const completedSummary = context.completedTasks.length > 0
      ? context.completedTasks.map(t => `- [DONE] ${t.id}: ${t.name || t.description.substring(0, 80)}`).join('\n')
      : 'None yet';

    const pendingSummary = context.pendingTasks.length > 0
      ? context.pendingTasks.map(t => `- [PENDING] ${t.id}: ${t.name || t.description.substring(0, 80)} (priority: ${t.priority})`).join('\n')
      : 'None queued';

    // Include spec URL content if available
    const specContentSection = this.factoryConfig.specContent
      ? `\n## Reference Specification (from docs)\n${this.factoryConfig.specContent}\n`
      : '';

    return `You are a software project planner. You MUST respond with ONLY a JSON object — no explanations, no markdown fences, no tool usage.

Do NOT use any tools. Do NOT read files. Do NOT explore the codebase. ONLY output JSON.

Your job: evaluate progress toward the specification and identify what SPECIFIC, DISCRETE units of work remain.

## Project Specification
${context.specDescription}
${specContentSection}
## Completed Tasks
${completedSummary}

## Currently Queued Tasks
${pendingSummary}

## Recent Code Changes
${context.gitDiffSummary}

## Instructions

Compare completed + queued tasks against the specification. Output ONLY this JSON:

If the specification is fully satisfied:
{"specSatisfied": true, "reasoning": "All features implemented", "newTasks": []}

If there are gaps, generate NEW tasks (use ID format "PLAN-001", "PLAN-002", etc.):
{"specSatisfied": false, "reasoning": "Missing X, Y, Z features", "newTasks": [{"id": "PLAN-001", "name": "Short name", "description": "What to implement", "priority": "high", "acceptance_criteria": ["criterion 1", "criterion 2"], "estimated_hours": 1, "complexity": "medium"}]}

CRITICAL RULES:
- Output ONLY valid JSON, nothing else
- Every task MUST map to a specific API resource, endpoint, or feature described in the specification
- Do NOT invent features that aren't in the spec — only generate tasks for things the spec explicitly requires
- Do NOT generate tasks that overlap with completed or queued tasks, even if named differently (e.g. "User CRUD routes" and "Users REST endpoints" are the same work)
- Before adding a task, check if any completed/queued task already covers that work under a different name
- Each task is a single discrete unit: one model, one repository, one set of routes, one set of tests — never combine multiple resources
- Generate at most 10 new tasks at a time — focus on the most important gaps first
- If there are already ${context.pendingTasks.length} tasks queued, only add what's truly missing
- Set complexity to "low" (simple CRUD, config), "medium" (business logic, validation), or "high" (auth flows, integrations)
- Each task should have: id, name, description, priority, acceptance_criteria, estimated_hours, complexity
- When the spec is fully covered by completed + queued tasks, set specSatisfied to true — do NOT keep generating tangential work`;
  }

  private parseResponse(output: string, prdFiles: PrdFile[]): PlannerResult {
    try {
      // Try to extract JSON from the output
      const jsonMatch = output.match(/\{[\s\S]*"specSatisfied"[\s\S]*\}/);
      if (!jsonMatch) {
        logger.debug('Planner: no JSON found in response');
        return { newTasks: [], specSatisfied: false, reasoning: 'No valid JSON in response' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate new tasks
      const existingIds = new Set<string>();
      for (const prd of prdFiles) {
        for (const item of prd.items) {
          existingIds.add(item.id);
        }
      }

      const newTasks: PrdItem[] = [];
      if (Array.isArray(parsed.newTasks)) {
        for (const task of parsed.newTasks) {
          // Skip if duplicate ID
          if (existingIds.has(task.id)) {
            logger.debug(`Planner: skipping duplicate task ${task.id}`);
            continue;
          }

          // Validate minimum fields
          if (!task.id || !task.description || !task.priority) {
            logger.debug(`Planner: skipping invalid task (missing fields)`);
            continue;
          }

          newTasks.push({
            id: task.id,
            name: task.name,
            description: task.description,
            priority: task.priority,
            status: 'pending',
            acceptance_criteria: task.acceptance_criteria,
            estimated_hours: task.estimated_hours,
            steps: task.steps,
            complexity: task.complexity || 'medium',
          } as PrdItem);

          existingIds.add(task.id);
        }
      }

      return {
        newTasks,
        specSatisfied: Boolean(parsed.specSatisfied),
        reasoning: parsed.reasoning || '',
      };
    } catch (error) {
      logger.debug(`Planner: failed to parse response: ${error}`);
      return { newTasks: [], specSatisfied: false, reasoning: 'Failed to parse response' };
    }
  }
}

/**
 * Add new tasks to a PRD file.
 */
export function addTasksToPrd(prdFilePath: string, newTasks: PrdItem[]): boolean {
  try {
    const content = readFileSync(prdFilePath, 'utf-8');
    const data = JSON.parse(content);

    if (!Array.isArray(data.items)) {
      data.items = [];
    }

    data.items.push(...newTasks);
    data.metadata = {
      ...data.metadata,
      updated_at: new Date().toISOString(),
    };

    writeFileSync(prdFilePath, JSON.stringify(data, null, 2));
    logger.info(`Added ${newTasks.length} tasks to ${prdFilePath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to add tasks to PRD: ${error}`);
    return false;
  }
}
