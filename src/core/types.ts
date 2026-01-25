/**
 * Core types shared across the Ralph plugin system
 */

import type { ValidationResult, GateResult, Package } from '../lib/validation/validation.types.js';

// ============================================================================
// Task Types
// ============================================================================

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

/**
 * Task with DAG dependencies - the core unit of work
 */
export interface Task {
  id: string;
  name?: string;
  description: string;
  priority: TaskPriority;
  category?: string;
  status: TaskStatus;

  // DAG structure
  dependencies: string[];      // Task IDs that must complete before this task
  dependents?: string[];       // Task IDs that depend on this task (computed)

  // Execution metadata
  criteria?: string[];         // Acceptance criteria / steps
  notes?: string;

  // Provider override for this task
  provider?: TaskProviderConfig;

  // Judge configurations
  judges?: JudgeConfig[];
  judgeResults?: AggregatedJudgeResult;

  // Validation results
  validationResults?: ValidationResult;
  evidencePath?: string;

  // Timestamps
  completedAt?: string;
  estimatedHours?: number;
}

// ============================================================================
// Provider Types
// ============================================================================

export type AIProvider = 'claude' | 'gemini' | 'cursor';
export type ClaudeModel = 'opus' | 'sonnet';
export type GeminiModel = 'pro' | 'flash';
export type CursorMode = 'agent' | 'plan' | 'ask';

export interface TaskProviderConfig {
  provider?: AIProvider;
  model?: string;
  mode?: CursorMode;
}

export interface ProviderResult {
  success: boolean;
  output: string;
  error?: string;
  tokensUsed?: number;
  duration: number;
  summary?: string;
  toolsUsed?: Record<string, number>;
}

export interface ProviderRunOptions {
  prompt: string;
  projectRoot: string;
  model?: string;
  mode?: CursorMode;
  dryRun?: boolean;
  timeout?: number;
  tokenLimit?: number;
}

// ============================================================================
// Gate Types
// ============================================================================

export type GateType = 'oxlint' | 'build' | 'test' | 'lint' | 'custom';

export interface GateRunOptions {
  projectRoot: string;
  packageName: Package;
  timeout?: number;
  taskNotes?: string;
}

export { GateResult, Package, ValidationResult };

// ============================================================================
// Judge Types
// ============================================================================

export interface JudgeConfig {
  persona: string;
  criteria?: string[];
  provider?: AIProvider;         // Which provider to use for this judge
  model?: string;                // Provider-specific model
  requireEvidence?: boolean;
  required?: boolean;
  weight?: number;
  threshold?: number;            // 0-100, defaults to 70
}

export interface JudgeResult {
  score: number;              // 0-100 score
  passed: boolean;            // score >= threshold
  persona: string;
  verdict: string;            // One-line summary
  reasoning: string;          // Detailed explanation
  suggestions?: string[];     // Improvement suggestions
  confidence: number;         // 0-1 confidence in evaluation
  timestamp: string;
}

export interface AggregatedJudgeResult {
  passed: boolean;            // All required judges passed
  overallScore: number;       // Weighted average 0-100
  results: JudgeResult[];
  summary: string;
  timestamp: string;
}

export interface JudgeContext {
  task: Task;
  codeChanges: string;        // Git diff
  validationResults?: ValidationResult;
  providerSummary?: string;   // AI's completion summary
  evidencePath?: string;      // Screenshot/video path
}

export interface JudgeRunOptions {
  provider?: AIProvider;
  model?: string;             // Provider-specific model (e.g., 'sonnet', 'pro', 'gpt-4')
  timeout?: number;
  threshold?: number;         // Pass threshold 0-100 (default: 70)
}

// ============================================================================
// Source Types
// ============================================================================

export interface TaskQueryOptions {
  filterCategory?: string;
  filterPriority?: TaskPriority;
  excludeBlocked?: boolean;
}

export interface TaskUpdate {
  validationResults?: ValidationResult;
  judgeResults?: AggregatedJudgeResult;
  evidencePath?: string;
}
