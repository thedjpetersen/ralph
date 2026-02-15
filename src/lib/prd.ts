import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { logger } from './logger.js';
import type { ValidationResult, Package } from './validation/validation.types.js';
import type { AIProvider } from './config.js';

/**
 * Provider configuration for PRD-level customization
 * Can be specified at file level (metadata.provider) or item level
 */
export interface PrdProviderConfig {
  provider?: AIProvider;           // claude, gemini, or cursor
  model?: string;                  // Provider-specific model (opus, sonnet, pro, flash, etc.)
  mode?: 'agent' | 'plan' | 'ask'; // Cursor-specific mode
}

export interface JudgeConfig {
  persona: string;          // e.g., "QA Engineer", "UX Designer", "Security Auditor"
  criteria?: string[];      // Specific criteria for the judge to evaluate
  provider?: AIProvider;    // Provider to use (claude, gemini, cursor) - defaults to task provider
  model?: string;           // Provider-specific model (opus, sonnet, pro, flash, etc.)
  requireEvidence?: boolean; // Whether evidence is required for judgment
  required?: boolean;        // If true, this judge must pass for task to complete (default: true)
  weight?: number;           // Weight for aggregated scoring (default: 1.0)
  threshold?: number;        // Score threshold to pass (0-100, default: 70)
}

export interface JudgeResult {
  passed: boolean;
  score?: number;            // 0-100 score
  persona: string;
  verdict: string;           // Short verdict
  reasoning: string;         // Detailed reasoning
  suggestions?: string[];    // Suggestions for improvement
  confidence: number;        // 0-1 confidence score
  timestamp: string;
}

export interface AggregatedJudgeResult {
  passed: boolean;           // Overall pass/fail
  overallScore?: number;     // Weighted average 0-100 (optional for backward compat)
  results: JudgeResult[];    // Individual judge results
  summary: string;           // Aggregated summary
  timestamp: string;
}

/**
 * Per-task validation configuration override
 */
export interface PrdValidationConfig {
  gates?: {
    oxlint?: boolean;
    build?: boolean;
    test?: boolean;
    lint?: boolean;
    custom?: boolean;
  };
  timeout?: number;
  failFast?: boolean;
  packages?: Package[];
  skip?: boolean;  // Skip all validation for this task
}

export interface PrdItem {
  id: string;
  name?: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  passes?: boolean;  // Alternative to status
  dependencies?: string[];
  acceptance_criteria?: string[];
  steps?: string[];  // Alternative to acceptance_criteria
  notes?: string;
  completed_at?: string;
  estimated_hours?: number;
  validation_results?: ValidationResult;
  evidence_path?: string;
  // LLM Judge configuration - supports multiple personas
  judges?: JudgeConfig[];
  judge_results?: AggregatedJudgeResult;
  // Provider override for this specific task
  provider?: PrdProviderConfig;
  // Validation override for this specific task
  validation?: PrdValidationConfig;
  // Complexity hint for factory mode routing
  complexity?: 'low' | 'medium' | 'high';
}

export interface PrdFile {
  filename: string;
  filepath: string;
  category: string;
  items: PrdItem[];
  // Project-level metadata
  project?: string;
  description?: string;
  metadata?: {
    version?: string;
    created_at?: string;
    updated_at?: string;
    // Default provider for all tasks in this file
    provider?: PrdProviderConfig;
  };
}

export function loadPrdFile(filepath: string): PrdFile | null {
  try {
    const content = readFileSync(filepath, 'utf-8');
    const data = JSON.parse(content);
    const filename = basename(filepath);
    const category = filename.replace('.json', '');

    // Handle both array format and object format
    const items: PrdItem[] = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);

    return {
      filename,
      filepath,
      category,
      items,
      project: data.project,
      description: data.description,
      metadata: data.metadata,
    };
  } catch (error) {
    logger.error(`Failed to load PRD file: ${filepath}`, error);
    return null;
  }
}

/**
 * Save a PrdFile back to disk, preserving all top-level fields (project, description, etc.)
 */
function savePrdFile(prdFile: PrdFile): void {
  // Read the original file to preserve any top-level fields we don't track in PrdFile
  let original: Record<string, unknown> = {};
  try {
    original = JSON.parse(readFileSync(prdFile.filepath, 'utf-8'));
  } catch {
    // If we can't read the original, start fresh
  }

  const data: Record<string, unknown> = {
    ...original,
    items: prdFile.items,
    metadata: {
      ...prdFile.metadata,
      updated_at: new Date().toISOString(),
    },
  };

  // Ensure project/description are preserved
  if (prdFile.project) data.project = prdFile.project;
  if (prdFile.description) data.description = prdFile.description;

  writeFileSync(prdFile.filepath, JSON.stringify(data, null, 2));
}

export function loadAllPrdFiles(prdDir: string): PrdFile[] {
  if (!existsSync(prdDir)) {
    logger.error(`PRD directory not found: ${prdDir}`);
    return [];
  }

  const files = readdirSync(prdDir).filter(f => f.endsWith('.json'));
  const prdFiles: PrdFile[] = [];

  for (const file of files) {
    const prd = loadPrdFile(join(prdDir, file));
    if (prd) prdFiles.push(prd);
  }

  logger.info(`Loaded ${prdFiles.length} PRD files`);
  return prdFiles;
}

function isItemComplete(item: PrdItem): boolean {
  // Handle both status and passes formats
  if (item.status === 'completed') return true;
  if (item.passes === true) return true;
  return false;
}

function isItemPending(item: PrdItem): boolean {
  // passes: false is the primary indicator of a pending task
  if (item.passes === false) {
    return true;
  }
  // If passes is not set, fall back to status check
  if (item.passes === undefined) {
    // Include 'in_progress' to allow retry after validation/judge failures
    if (item.status === 'pending' || item.status === 'in_progress' || item.status === undefined) {
      return true;
    }
  }
  return false;
}

export function getNextTask(
  prdFiles: PrdFile[],
  options: {
    filterCategory?: string;
    filterPriority?: string;
    filterTaskId?: string;
  } = {}
): { prdFile: PrdFile; item: PrdItem } | null {
  // If a specific task ID is requested, find and return it directly
  if (options.filterTaskId) {
    for (const prd of prdFiles) {
      const item = prd.items.find(i => i.id === options.filterTaskId);
      if (item && !isItemComplete(item)) {
        return { prdFile: prd, item };
      }
    }
    return null;
  }

  // Priority order: high > medium > low
  const priorityOrder = ['high', 'medium', 'low'];

  for (const priority of priorityOrder) {
    if (options.filterPriority && options.filterPriority !== priority) continue;

    for (const prd of prdFiles) {
      if (options.filterCategory && prd.category !== options.filterCategory) continue;

      for (const item of prd.items) {
        if (isItemPending(item) && !isItemComplete(item) && item.priority === priority) {
          // Check dependencies
          if (item.dependencies && item.dependencies.length > 0) {
            const allDepsComplete = item.dependencies.every(depId =>
              prdFiles.some(p => p.items.some(i => i.id === depId && isItemComplete(i)))
            );
            if (!allDepsComplete) continue;
          }

          return { prdFile: prd, item };
        }
      }
    }
  }

  return null;
}

export function markTaskComplete(
  prdFile: PrdFile,
  itemId: string,
  options?: {
    validationResults?: ValidationResult;
    evidencePath?: string;
    judgeResults?: AggregatedJudgeResult;
  }
): boolean {
  const item = prdFile.items.find(i => i.id === itemId);
  if (!item) {
    logger.error(`Item not found: ${itemId}`);
    return false;
  }

  item.status = 'completed';
  item.passes = true;
  item.completed_at = new Date().toISOString();

  if (options?.validationResults) {
    item.validation_results = options.validationResults;
  }
  if (options?.evidencePath) {
    item.evidence_path = options.evidencePath;
  }
  if (options?.judgeResults) {
    item.judge_results = options.judgeResults;
  }

  try {
    savePrdFile(prdFile);
    logger.success(`Marked ${itemId} as completed`);
    return true;
  } catch (error) {
    logger.error(`Failed to update PRD file: ${prdFile.filepath}`, error);
    return false;
  }
}

export function updateTaskValidation(
  prdFile: PrdFile,
  itemId: string,
  validationResults: ValidationResult
): boolean {
  const item = prdFile.items.find(i => i.id === itemId);
  if (!item) return false;

  item.validation_results = validationResults;

  try {
    savePrdFile(prdFile);
    return true;
  } catch {
    return false;
  }
}

export function updateTaskJudgeResults(
  prdFile: PrdFile,
  itemId: string,
  judgeResults: AggregatedJudgeResult
): boolean {
  const item = prdFile.items.find(i => i.id === itemId);
  if (!item) return false;

  item.judge_results = judgeResults;

  try {
    savePrdFile(prdFile);
    return true;
  } catch {
    return false;
  }
}

export function resetTaskStatus(prdFile: PrdFile, itemId: string): boolean {
  const item = prdFile.items.find(i => i.id === itemId);
  if (!item) return false;

  // Only reset if in_progress (orphaned)
  if (item.status !== 'in_progress') return false;

  item.status = 'pending';
  // Don't reset passes - it's a separate tracking mechanism

  try {
    savePrdFile(prdFile);
    logger.info(`Reset ${itemId} to pending`);
    return true;
  } catch {
    return false;
  }
}

export function getOrphanedTasks(prdFiles: PrdFile[]): Array<{ prdFile: PrdFile; item: PrdItem }> {
  const orphaned: Array<{ prdFile: PrdFile; item: PrdItem }> = [];

  for (const prd of prdFiles) {
    for (const item of prd.items) {
      if (item.status === 'in_progress') {
        orphaned.push({ prdFile: prd, item });
      }
    }
  }

  return orphaned;
}

export function markTaskInProgress(prdFile: PrdFile, itemId: string): boolean {
  const item = prdFile.items.find(i => i.id === itemId);
  if (!item) return false;

  item.status = 'in_progress';

  try {
    savePrdFile(prdFile);
    return true;
  } catch {
    return false;
  }
}

export function getTaskSummary(prdFiles: PrdFile[]): {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  byCategory: Record<string, { pending: number; completed: number }>;
} {
  const summary = {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    byCategory: {} as Record<string, { pending: number; completed: number }>,
  };

  for (const prd of prdFiles) {
    if (!summary.byCategory[prd.category]) {
      summary.byCategory[prd.category] = { pending: 0, completed: 0 };
    }

    for (const item of prd.items) {
      summary.total++;

      if (isItemComplete(item)) {
        summary.completed++;
        summary.byCategory[prd.category].completed++;
      } else if (item.status === 'in_progress') {
        summary.inProgress++;
      } else {
        summary.pending++;
        summary.byCategory[prd.category].pending++;
      }
    }
  }

  return summary;
}

/**
 * Pop (remove) a completed task from the PRD file.
 * Used in consume mode where tasks are removed rather than marked complete.
 * Returns the removed item or null if not found.
 */
export function popTask(
  prdFile: PrdFile,
  itemId: string,
  options?: {
    archiveTo?: string;  // Optional archive file path
  }
): PrdItem | null {
  const itemIndex = prdFile.items.findIndex(i => i.id === itemId);
  if (itemIndex === -1) {
    logger.error(`Item not found for pop: ${itemId}`);
    return null;
  }

  // Remove the item from the array
  const [removedItem] = prdFile.items.splice(itemIndex, 1);

  // Mark it as completed before archiving
  removedItem.status = 'completed';
  removedItem.passes = true;
  removedItem.completed_at = new Date().toISOString();

  try {
    // Save the updated PRD file (without the removed item)
    savePrdFile(prdFile);

    // Optionally archive the completed task
    if (options?.archiveTo) {
      archiveCompletedTask(removedItem, options.archiveTo);
    }

    logger.success(`Popped ${itemId} from ${prdFile.filename} (${prdFile.items.length} remaining)`);
    return removedItem;
  } catch (error) {
    // Restore the item on failure
    prdFile.items.splice(itemIndex, 0, removedItem);
    logger.error(`Failed to pop task from PRD file: ${prdFile.filepath}`, error);
    return null;
  }
}

/**
 * Archive a completed task to a separate file
 */
function archiveCompletedTask(item: PrdItem, archivePath: string): void {
  try {
    let archive: { items: PrdItem[]; metadata?: Record<string, unknown> } = { items: [] };

    if (existsSync(archivePath)) {
      const content = readFileSync(archivePath, 'utf-8');
      archive = JSON.parse(content);
    }

    archive.items.push(item);
    archive.metadata = {
      ...archive.metadata,
      updated_at: new Date().toISOString(),
    };

    writeFileSync(archivePath, JSON.stringify(archive, null, 2));
    logger.debug(`Archived ${item.id} to ${archivePath}`);
  } catch (error) {
    logger.warning(`Failed to archive task ${item.id}: ${error}`);
  }
}

/**
 * Get ALL tasks with satisfied dependencies (for factory mode).
 * Unlike getNextTask which returns only the first one, this returns all ready tasks.
 */
export function getReadyTasks(
  prdFiles: PrdFile[],
  options: {
    filterCategory?: string;
    filterPriority?: string;
  } = {}
): Array<{ prdFile: PrdFile; item: PrdItem }> {
  const readyTasks: Array<{ prdFile: PrdFile; item: PrdItem }> = [];

  for (const prd of prdFiles) {
    if (options.filterCategory && prd.category !== options.filterCategory) continue;

    for (const item of prd.items) {
      if (isItemComplete(item)) continue;
      if (!isItemPending(item)) continue;
      if (options.filterPriority && item.priority !== options.filterPriority) continue;

      // Check dependencies
      if (item.dependencies && item.dependencies.length > 0) {
        const allDepsComplete = item.dependencies.every(depId =>
          prdFiles.some(p => p.items.some(i => i.id === depId && isItemComplete(i)))
        );
        if (!allDepsComplete) continue;
      }

      readyTasks.push({ prdFile: prd, item });
    }
  }

  return readyTasks;
}

export function formatTaskForPrompt(item: PrdItem, prdFile: PrdFile): string {
  const name = item.name || item.description.substring(0, 50);
  let prompt = `## Task: ${name}\n\n`;
  prompt += `**Category:** ${prdFile.category}\n`;
  prompt += `**Priority:** ${item.priority}\n`;
  prompt += `**ID:** ${item.id}\n\n`;
  prompt += `### Description\n${item.description}\n\n`;

  // Handle both acceptance_criteria and steps
  const criteria = item.acceptance_criteria || item.steps;
  if (criteria && criteria.length > 0) {
    prompt += `### Steps / Acceptance Criteria\n`;
    for (const criterion of criteria) {
      prompt += `- ${criterion}\n`;
    }
    prompt += '\n';
  }

  if (item.notes) {
    prompt += `### Notes\n${item.notes}\n\n`;
  }

  return prompt;
}
