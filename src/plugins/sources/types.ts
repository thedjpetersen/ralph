/**
 * Task Source Plugin Types
 * Defines interfaces for task source plugins with DAG support
 */

import type { Plugin, PluginMetadata, BuiltinMarker } from '../types.js';
import type { ExecutionContext } from '../../core/context.js';
import type { Task, TaskQueryOptions, TaskUpdate, TaskPriority } from '../../core/types.js';

// ============================================================================
// Source Metadata
// ============================================================================

export interface TaskSourcePluginMetadata extends PluginMetadata {
  /** Source type identifier (e.g., 'file', 'api', 'database') */
  sourceType: string;

  /** Whether the source supports writing changes */
  writable: boolean;

  /** Whether the source supports DAG dependencies */
  supportsDAG: boolean;
}

// ============================================================================
// Task DAG Interface
// ============================================================================

/**
 * DAG operations for task management
 */
export interface TaskDAG {
  /**
   * Get all tasks
   */
  getAllTasks(): Task[];

  /**
   * Get all tasks in topological order
   */
  getTopologicalOrder(): Task[];

  /**
   * Get tasks ready to execute (all dependencies satisfied)
   */
  getReadyTasks(): Task[];

  /**
   * Check if task is blocked by incomplete dependencies
   */
  isBlocked(taskId: string): boolean;

  /**
   * Get blocking dependencies for a task
   */
  getBlockers(taskId: string): Task[];

  /**
   * Validate DAG has no cycles
   */
  validate(): DagValidationResult;

  /**
   * Get critical path (longest dependency chain)
   */
  getCriticalPath(): Task[];

  /**
   * Get dependents of a task (tasks that depend on this one)
   */
  getDependents(taskId: string): Task[];

  /**
   * Mark a task as complete and get newly unblocked tasks
   */
  markComplete(taskId: string): Task[];
}

export interface DagValidationResult {
  valid: boolean;
  cycle?: string[];
  errors?: string[];
}

// ============================================================================
// Task Source Plugin Interface
// ============================================================================

export interface TaskSourcePlugin extends Plugin {
  metadata: TaskSourcePluginMetadata;

  /**
   * Initialize the source (load data, connect, etc.)
   */
  initialize(ctx: ExecutionContext): Promise<void>;

  /**
   * Get the task DAG
   */
  getDAG(): Promise<TaskDAG>;

  /**
   * Get next ready task (respects dependencies)
   */
  getNextTask(options?: TaskQueryOptions): Promise<Task | null>;

  /**
   * Get all tasks
   */
  getTasks(options?: TaskQueryOptions): Promise<Task[]>;

  /**
   * Get tasks ready for execution
   */
  getReadyTasks(): Promise<Task[]>;

  /**
   * Check if task can be started
   */
  canStart(taskId: string): Promise<boolean>;

  /**
   * Mark task as in progress
   */
  markInProgress(taskId: string): Promise<boolean>;

  /**
   * Mark task as complete with optional update data
   */
  markComplete(taskId: string, update?: TaskUpdate): Promise<boolean>;

  /**
   * Unblock dependents when task completes
   * Returns IDs of newly unblocked tasks
   */
  propagateCompletion(taskId: string): Promise<string[]>;

  /**
   * Get task by ID
   */
  getTask(taskId: string): Promise<Task | null>;

  /**
   * Get task summary statistics
   */
  getSummary(): Promise<TaskSummary>;

  /**
   * Close the source (save changes, disconnect, etc.)
   */
  close(): Promise<void>;
}

// ============================================================================
// Built-in Source Plugin
// ============================================================================

export interface BuiltinTaskSourcePlugin extends TaskSourcePlugin, BuiltinMarker {}

// ============================================================================
// Task Summary
// ============================================================================

export interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  blocked: number;
  byCategory: Record<string, { pending: number; completed: number }>;
  byPriority: Record<TaskPriority, { pending: number; completed: number }>;
}

// ============================================================================
// Source File Types (for PRD file source)
// ============================================================================

export interface PrdFileMetadata {
  version?: string;
  created_at?: string;
  updated_at?: string;
  provider?: {
    provider?: string;
    model?: string;
    mode?: string;
  };
}

export interface PrdFileData {
  filename: string;
  filepath: string;
  category: string;
  items: Task[];
  metadata?: PrdFileMetadata;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isTaskSourcePlugin(plugin: Plugin): plugin is TaskSourcePlugin {
  return 'sourceType' in (plugin.metadata as TaskSourcePluginMetadata) && 'getDAG' in plugin;
}
