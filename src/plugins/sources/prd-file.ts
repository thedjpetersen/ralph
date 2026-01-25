/**
 * PRD File Task Source Plugin
 * Loads tasks from JSON files in the PRD directory
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { createTaskDAG, TaskDAGImpl } from './dag.js';
import type {
  TaskSourcePlugin,
  TaskSourcePluginMetadata,
  BuiltinTaskSourcePlugin,
  TaskDAG,
  TaskSummary,
  PrdFileData,
} from './types.js';
import type { ExecutionContext } from '../../core/context.js';
import type { Task, TaskQueryOptions, TaskUpdate, TaskPriority, TaskStatus } from '../../core/types.js';

// ============================================================================
// PRD File Source Plugin
// ============================================================================

export class PrdFileSourcePlugin implements BuiltinTaskSourcePlugin {
  readonly builtin = true as const;

  readonly metadata: TaskSourcePluginMetadata = {
    name: 'prd-file',
    version: '1.0.0',
    description: 'Loads tasks from JSON files in the PRD directory',
    sourceType: 'file',
    writable: true,
    supportsDAG: true,
  };

  private ctx: ExecutionContext | null = null;
  private prdFiles: PrdFileData[] = [];
  private dag: TaskDAGImpl | null = null;
  private initialized = false;

  async initialize(ctx: ExecutionContext): Promise<void> {
    this.ctx = ctx;
    const config = ctx.config;
    const logger = ctx.getLogger();

    // Load PRD files
    if (config.prdFile) {
      const prd = this.loadPrdFile(config.prdFile);
      if (!prd) {
        throw new Error(`Failed to load PRD file: ${config.prdFile}`);
      }
      this.prdFiles = [prd];
      logger.info(`Using PRD file: ${config.prdFile}`);
    } else {
      this.prdFiles = this.loadAllPrdFiles(config.prdDir);
      if (this.prdFiles.length === 0) {
        throw new Error('No PRD files found');
      }
      logger.info(`Loaded ${this.prdFiles.length} PRD files`);
    }

    // Build DAG from all tasks
    const allTasks = this.prdFiles.flatMap(prd => prd.items);
    this.dag = new TaskDAGImpl(allTasks);

    // Validate DAG
    const validation = this.dag.validate();
    if (!validation.valid) {
      if (validation.cycle) {
        throw new Error(`DAG cycle detected: ${validation.cycle.join(' -> ')}`);
      }
      if (validation.errors) {
        logger.warning(`DAG validation warnings: ${validation.errors.join('; ')}`);
      }
    }

    this.initialized = true;
  }

  private loadPrdFile(filepath: string): PrdFileData | null {
    try {
      const content = readFileSync(filepath, 'utf-8');
      const data = JSON.parse(content);
      const filename = basename(filepath);
      const category = filename.replace('.json', '');

      // Handle both array format and object format
      const rawItems = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);

      // Convert to Task format
      const items: Task[] = rawItems.map((item: Record<string, unknown>) => this.normalizeTask(item, category));

      return {
        filename,
        filepath,
        category,
        items,
        metadata: data.metadata,
      };
    } catch (error) {
      this.ctx?.getLogger().error(`Failed to load PRD file: ${filepath}`, error);
      return null;
    }
  }

  private loadAllPrdFiles(prdDir: string): PrdFileData[] {
    if (!existsSync(prdDir)) {
      this.ctx?.getLogger().error(`PRD directory not found: ${prdDir}`);
      return [];
    }

    const files = readdirSync(prdDir).filter(f => f.endsWith('.json'));
    const prdFiles: PrdFileData[] = [];

    for (const file of files) {
      const prd = this.loadPrdFile(join(prdDir, file));
      if (prd) prdFiles.push(prd);
    }

    return prdFiles;
  }

  private normalizeTask(item: Record<string, unknown>, category: string): Task {
    // Determine status
    let status: TaskStatus = 'pending';
    if (item.status === 'completed' || item.passes === true) {
      status = 'completed';
    } else if (item.status === 'in_progress') {
      status = 'in_progress';
    } else if (item.passes === false) {
      status = 'pending';
    }

    return {
      id: item.id as string,
      name: item.name as string | undefined,
      description: item.description as string,
      priority: (item.priority as TaskPriority) || 'medium',
      category,
      status,
      dependencies: (item.dependencies as string[]) || [],
      criteria: (item.acceptance_criteria as string[]) || (item.steps as string[]) || [],
      notes: item.notes as string | undefined,
      provider: item.provider as Task['provider'],
      judges: item.judges as Task['judges'],
      judgeResults: item.judge_results as Task['judgeResults'],
      validationResults: item.validation_results as Task['validationResults'],
      evidencePath: item.evidence_path as string | undefined,
      completedAt: item.completed_at as string | undefined,
      estimatedHours: item.estimated_hours as number | undefined,
    };
  }

  async getDAG(): Promise<TaskDAG> {
    this.ensureInitialized();
    return this.dag!;
  }

  async getNextTask(options?: TaskQueryOptions): Promise<Task | null> {
    this.ensureInitialized();

    const readyTasks = this.dag!.getReadyTasks();

    for (const task of readyTasks) {
      // Apply filters
      if (options?.filterCategory && task.category !== options.filterCategory) {
        continue;
      }
      if (options?.filterPriority && task.priority !== options.filterPriority) {
        continue;
      }
      if (task.status === 'completed' || task.status === 'in_progress') {
        continue;
      }

      return task;
    }

    return null;
  }

  async getTasks(options?: TaskQueryOptions): Promise<Task[]> {
    this.ensureInitialized();

    let tasks = this.dag!.getAllTasks();

    if (options?.filterCategory) {
      tasks = tasks.filter(t => t.category === options.filterCategory);
    }
    if (options?.filterPriority) {
      tasks = tasks.filter(t => t.priority === options.filterPriority);
    }
    if (options?.excludeBlocked) {
      tasks = tasks.filter(t => !this.dag!.isBlocked(t.id));
    }

    return tasks;
  }

  async getReadyTasks(): Promise<Task[]> {
    this.ensureInitialized();
    return this.dag!.getReadyTasks();
  }

  async canStart(taskId: string): Promise<boolean> {
    this.ensureInitialized();
    return !this.dag!.isBlocked(taskId);
  }

  async markInProgress(taskId: string): Promise<boolean> {
    this.ensureInitialized();

    const prdFile = this.findPrdFileForTask(taskId);
    if (!prdFile) return false;

    const item = prdFile.items.find(i => i.id === taskId);
    if (!item) return false;

    item.status = 'in_progress';
    return this.savePrdFile(prdFile);
  }

  async markComplete(taskId: string, update?: TaskUpdate): Promise<boolean> {
    this.ensureInitialized();

    const prdFile = this.findPrdFileForTask(taskId);
    if (!prdFile) return false;

    const item = prdFile.items.find(i => i.id === taskId);
    if (!item) return false;

    item.status = 'completed';
    item.completedAt = new Date().toISOString();

    if (update?.validationResults) {
      item.validationResults = update.validationResults;
    }
    if (update?.judgeResults) {
      item.judgeResults = update.judgeResults;
    }
    if (update?.evidencePath) {
      item.evidencePath = update.evidencePath;
    }

    // Update DAG
    this.dag!.markComplete(taskId);

    return this.savePrdFile(prdFile);
  }

  async propagateCompletion(taskId: string): Promise<string[]> {
    this.ensureInitialized();

    const unblockedTasks = this.dag!.markComplete(taskId);
    return unblockedTasks.map(t => t.id);
  }

  async getTask(taskId: string): Promise<Task | null> {
    this.ensureInitialized();

    for (const prd of this.prdFiles) {
      const task = prd.items.find(i => i.id === taskId);
      if (task) return task;
    }

    return null;
  }

  async getSummary(): Promise<TaskSummary> {
    this.ensureInitialized();

    const summary: TaskSummary = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      blocked: 0,
      byCategory: {},
      byPriority: { high: { pending: 0, completed: 0 }, medium: { pending: 0, completed: 0 }, low: { pending: 0, completed: 0 } },
    };

    for (const prd of this.prdFiles) {
      if (!summary.byCategory[prd.category]) {
        summary.byCategory[prd.category] = { pending: 0, completed: 0 };
      }

      for (const item of prd.items) {
        summary.total++;

        if (item.status === 'completed') {
          summary.completed++;
          summary.byCategory[prd.category].completed++;
          summary.byPriority[item.priority].completed++;
        } else if (item.status === 'in_progress') {
          summary.inProgress++;
        } else if (this.dag!.isBlocked(item.id)) {
          summary.blocked++;
        } else {
          summary.pending++;
          summary.byCategory[prd.category].pending++;
          summary.byPriority[item.priority].pending++;
        }
      }
    }

    return summary;
  }

  async close(): Promise<void> {
    // Nothing to clean up for file-based source
    this.initialized = false;
    this.prdFiles = [];
    this.dag = null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('PrdFileSourcePlugin not initialized. Call initialize() first.');
    }
  }

  private findPrdFileForTask(taskId: string): PrdFileData | null {
    for (const prd of this.prdFiles) {
      if (prd.items.some(i => i.id === taskId)) {
        return prd;
      }
    }
    return null;
  }

  private savePrdFile(prdFile: PrdFileData): boolean {
    try {
      // Convert tasks back to PRD format
      const items = prdFile.items.map(task => ({
        id: task.id,
        name: task.name,
        description: task.description,
        priority: task.priority,
        status: task.status,
        passes: task.status === 'completed',
        dependencies: task.dependencies,
        acceptance_criteria: task.criteria,
        notes: task.notes,
        completed_at: task.completedAt,
        estimated_hours: task.estimatedHours,
        validation_results: task.validationResults,
        evidence_path: task.evidencePath,
        judges: task.judges,
        judge_results: task.judgeResults,
        provider: task.provider,
      }));

      const data = {
        items,
        metadata: {
          ...prdFile.metadata,
          updated_at: new Date().toISOString(),
        },
      };

      writeFileSync(prdFile.filepath, JSON.stringify(data, null, 2));
      this.ctx?.getLogger().success(`Updated ${prdFile.filename}`);
      return true;
    } catch (error) {
      this.ctx?.getLogger().error(`Failed to save PRD file: ${prdFile.filepath}`, error);
      return false;
    }
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const prdFileSource = new PrdFileSourcePlugin();
