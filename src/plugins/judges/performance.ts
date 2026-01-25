/**
 * Performance Engineer Judge Plugin
 * Evaluates performance, efficiency, and scalability
 */

import { BaseJudgePlugin } from './base.js';
import { PERFORMANCE_ENGINEER } from './personas.js';
import type { JudgePluginMetadata, BuiltinJudgePlugin } from './types.js';

// ============================================================================
// Performance Engineer Judge Plugin
// ============================================================================

export class PerformanceEngineerJudgePlugin extends BaseJudgePlugin implements BuiltinJudgePlugin {
  readonly builtin = true as const;

  readonly metadata: JudgePluginMetadata = {
    name: 'performance-engineer',
    version: '1.0.0',
    description: 'Evaluates performance, efficiency, and scalability',
    persona: PERFORMANCE_ENGINEER.name,
    category: PERFORMANCE_ENGINEER.category,
    defaultThreshold: PERFORMANCE_ENGINEER.defaultThreshold,
    defaultWeight: PERFORMANCE_ENGINEER.defaultWeight,
  };

  getSystemPrompt(): string {
    return PERFORMANCE_ENGINEER.systemPrompt;
  }

  getCriteria(): string[] {
    return PERFORMANCE_ENGINEER.criteria;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const performanceEngineerJudge = new PerformanceEngineerJudgePlugin();
