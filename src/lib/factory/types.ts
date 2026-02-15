/**
 * Factory Mode — Shared Types
 *
 * Types for Ralph's parallel, convergent software factory mode.
 */

import type { AIProvider } from '../config.js';
import type { PrdItem } from '../prd.js';

// ============================================================================
// Core Enums
// ============================================================================

export type ComplexityTier = 'low' | 'medium' | 'high';
export type WorkerStatus = 'idle' | 'running' | 'validating' | 'merging';

// ============================================================================
// Provider Routing
// ============================================================================

export interface ProviderSlot {
  provider: AIProvider;   // claude | gemini | codex | cursor
  model: string;          // opus, sonnet, haiku, pro, flash, etc.
  tier: ComplexityTier;
}

// ============================================================================
// Pool Configuration
// ============================================================================

export interface FactoryPoolConfig {
  /** Concurrency per provider:model key, e.g. 'claude:opus' -> 1, 'claude:haiku' -> 3 */
  slots: Record<string, number>;
  /** Maximum total concurrent workers (default 5) */
  maxTotalWorkers: number;
  /** Maximum retries per task before giving up (default 3) */
  retryLimit: number;
}

// ============================================================================
// Factory Configuration
// ============================================================================

export interface FactoryRoutingConfig {
  /** Automatically route tasks by complexity score (default true) */
  autoRoute: boolean;
  /** Default tier when autoRoute is off or score is ambiguous */
  defaultTier: ComplexityTier;
}

export interface FactoryConfig {
  pool: FactoryPoolConfig;
  routing: FactoryRoutingConfig;
  /** Directory for git worktrees (default .ralph/worktrees) */
  worktreeDir: string;
  /** Milliseconds between planner evaluations (default 120000) */
  plannerInterval: number;
  /** Which model runs the planner (default sonnet) */
  plannerProvider: ProviderSlot;
  /** Escalate task tier on retry (default true) */
  escalateOnRetry: boolean;
  /** Cleanup worktrees on shutdown (default true) */
  cleanupOnShutdown: boolean;
  /** URL(s) to fetch as reference specification for the planner */
  specUrls?: string[];
  /** Pre-fetched specification content (populated at startup from specUrls) */
  specContent?: string;
}

// ============================================================================
// Worker State
// ============================================================================

export interface WorkerState {
  id: number;
  worktreePath: string;
  branchName: string;
  status: WorkerStatus;
  currentTask?: FactoryTask;
  currentSlot?: ProviderSlot;
  completedTasks: string[];
}

// ============================================================================
// Worker Result
// ============================================================================

export interface WorkerResult {
  taskId: string;
  workerId: number;
  success: boolean;
  commitHash?: string;
  duration: number;
  validationPassed?: boolean;
  rateLimited?: boolean;
  error?: string;
  output?: string;
}

// ============================================================================
// Factory Task (extends PrdItem with routing metadata)
// ============================================================================

export interface FactoryTask {
  item: PrdItem;
  prdFilePath: string;
  prdCategory: string;
  complexityScore: number;
  tier: ComplexityTier;
  retryCount: number;
  assignedSlot?: ProviderSlot;
  assignedWorkerId?: number;
}

// ============================================================================
// Planner Types
// ============================================================================

export interface PlannerResult {
  newTasks: PrdItem[];
  specSatisfied: boolean;
  reasoning: string;
}

// ============================================================================
// Merge Types
// ============================================================================

export interface MergeResult {
  success: boolean;
  commitHash?: string;
  conflict?: boolean;
  error?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_FACTORY_CONFIG: FactoryConfig = {
  pool: {
    slots: {
      'claude:opus': 1,
      'claude:sonnet': 2,
      'claude:haiku': 3,
      'gemini:pro': 2,
      'gemini:flash': 3,
      'codex:default': 2,
      'cursor:default': 2,
    },
    maxTotalWorkers: 5,
    retryLimit: 3,
  },
  routing: {
    autoRoute: true,
    defaultTier: 'medium',
  },
  worktreeDir: '.ralph/worktrees',
  plannerInterval: 120000,
  plannerProvider: {
    provider: 'claude',
    model: 'sonnet',
    tier: 'medium',
  },
  escalateOnRetry: true,
  cleanupOnShutdown: true,
};
