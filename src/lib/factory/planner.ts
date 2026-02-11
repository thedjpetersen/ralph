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
// Planner
// ============================================================================

export class Planner {
  private running = false;
  private interval: ReturnType<typeof setInterval> | null = null;
  private completionsSinceLastRun = 0;
  private specSatisfied = false;

  constructor(
    private readonly config: RalphConfig,
    private readonly factoryConfig: FactoryConfig,
    private readonly mainRepo: string,
  ) {}

  /**
   * Start the planner loop in the background.
   */
  start(onNewTasks: (tasks: PrdItem[]) => void, onSpecSatisfied: () => void): void {
    if (this.running) return;

    this.running = true;
    logger.info(`Planner started (interval: ${Math.round(this.factoryConfig.plannerInterval / 1000)}s)`);

    this.interval = setInterval(async () => {
      if (!this.running) return;

      try {
        const result = await this.evaluate();

        if (result.newTasks.length > 0) {
          logger.info(`Planner generated ${result.newTasks.length} new task(s)`);
          onNewTasks(result.newTasks);
        }

        if (result.specSatisfied) {
          this.specSatisfied = true;
          logger.info('Planner: specification satisfied');
          onSpecSatisfied();
        }
      } catch (error) {
        logger.error(`Planner evaluation failed: ${error}`);
      }
    }, this.factoryConfig.plannerInterval);
  }

  /**
   * Stop the planner loop.
   */
  stop(): void {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    logger.debug('Planner stopped');
  }

  /**
   * Notify the planner that a task was completed.
   * After N completions, may trigger an early evaluation.
   */
  notifyCompletion(): void {
    this.completionsSinceLastRun++;
  }

  /**
   * Check if the planner thinks the spec is satisfied.
   */
  isSpecSatisfied(): boolean {
    return this.specSatisfied;
  }

  /**
   * Run a single planner evaluation.
   */
  async evaluate(): Promise<PlannerResult> {
    this.completionsSinceLastRun = 0;

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

    // 4. Parse response
    return this.parseResponse(result.output, prdFiles);
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

    return `You are a software project planner for an autonomous coding system called "Ralph Factory".

Your job is to evaluate progress toward a specification and identify what NEW tasks are needed.

## Specification
${context.specDescription}

## Completed Tasks
${completedSummary}

## Currently Queued Tasks
${pendingSummary}

## Recent Code Changes
${context.gitDiffSummary}

## Your Task

Evaluate the current state against the specification. Then:

1. If the specification is fully satisfied by completed + queued tasks, respond with:
   \`\`\`json
   { "specSatisfied": true, "reasoning": "...", "newTasks": [] }
   \`\`\`

2. If there are gaps, generate NEW tasks to fill them. Each task needs:
   - \`id\`: unique string (use format "PLAN-XXX")
   - \`description\`: clear description of what to implement
   - \`priority\`: "high", "medium", or "low"
   - \`acceptance_criteria\`: array of strings
   - \`estimated_hours\`: number
   - \`complexity\`: "low", "medium", or "high"

   Respond with:
   \`\`\`json
   {
     "specSatisfied": false,
     "reasoning": "...",
     "newTasks": [{ ... }]
   }
   \`\`\`

IMPORTANT:
- Do NOT duplicate existing completed or queued tasks
- Focus on tasks that move toward the specification goal
- Keep tasks atomic and independently executable
- Prioritize tasks that unblock other work
- Respond ONLY with valid JSON (no markdown fences outside the JSON)`;
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
