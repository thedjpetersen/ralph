/**
 * Judge Plugin Types
 * Defines interfaces for LLM judge plugins
 */

import type { Plugin, PluginMetadata, BuiltinMarker } from '../types.js';
import type { ExecutionContext } from '../../core/context.js';
import type {
  Task,
  JudgeResult,
  JudgeContext,
  JudgeRunOptions,
  JudgeConfig,
  AggregatedJudgeResult,
  ClaudeModel,
  AIProvider,
  ValidationResult,
} from '../../core/types.js';

// ============================================================================
// Judge Metadata
// ============================================================================

export interface JudgePluginMetadata extends PluginMetadata {
  /** Persona name (e.g., 'QA Engineer', 'Security Auditor') */
  persona: string;

  /** Category (e.g., 'quality', 'security', 'design', 'architecture') */
  category: string;

  /** Default pass threshold (0-100) */
  defaultThreshold: number;

  /** Default weight for aggregation (0-1) */
  defaultWeight: number;
}

// ============================================================================
// Judge Plugin Interface
// ============================================================================

export interface JudgePlugin extends Plugin {
  metadata: JudgePluginMetadata;

  /**
   * Get the system prompt for this judge persona
   */
  getSystemPrompt(): string;

  /**
   * Get evaluation criteria for this judge
   */
  getCriteria(): string[];

  /**
   * Build the full evaluation prompt
   */
  buildPrompt(ctx: JudgeContext): string;

  /**
   * Parse LLM response into structured result
   */
  parseResponse(response: string): Partial<JudgeResult>;

  /**
   * Run the judge evaluation
   */
  run(ctx: ExecutionContext, judgeCtx: JudgeContext, options?: JudgeRunOptions): Promise<JudgeResult>;
}

// ============================================================================
// Built-in Judge Plugin
// ============================================================================

export interface BuiltinJudgePlugin extends JudgePlugin, BuiltinMarker {}

// ============================================================================
// Judge Evaluation Options
// ============================================================================

export interface JudgeEvaluationOptions {
  /** Run judges in parallel (default: true) */
  parallel?: boolean;

  /** Stop on first required judge failure (default: false) */
  failFast?: boolean;

  /** Timeout per judge in ms (default: 60000) */
  timeout?: number;

  /** Provider to use for judge evaluations (default: 'claude') */
  provider?: AIProvider;

  /** Default model for judges (provider-specific) */
  model?: string;
}

// ============================================================================
// Judge Context Builder
// ============================================================================

export interface JudgeContextInput {
  task: Task;
  codeChanges: string;
  validationResults?: ValidationResult;
  providerSummary?: string;
  evidencePath?: string;
}

// ============================================================================
// Re-export core types for convenience
// ============================================================================

export type {
  JudgeResult,
  JudgeContext,
  JudgeRunOptions,
  JudgeConfig,
  AggregatedJudgeResult,
};

// ============================================================================
// Persona Definition (re-export for convenience)
// ============================================================================

export type { PersonaDefinition } from './personas.js';

// ============================================================================
// Type Guards
// ============================================================================

export function isJudgePlugin(plugin: Plugin): plugin is JudgePlugin {
  return 'persona' in (plugin.metadata as JudgePluginMetadata) && 'buildPrompt' in plugin;
}
