/**
 * Software Architect Judge Plugin
 * Evaluates architectural decisions, patterns, and code organization
 */

import { BaseJudgePlugin } from './base.js';
import { SOFTWARE_ARCHITECT } from './personas.js';
import type { JudgePluginMetadata, BuiltinJudgePlugin } from './types.js';

// ============================================================================
// Software Architect Judge Plugin
// ============================================================================

export class SoftwareArchitectJudgePlugin extends BaseJudgePlugin implements BuiltinJudgePlugin {
  readonly builtin = true as const;

  readonly metadata: JudgePluginMetadata = {
    name: 'software-architect',
    version: '1.0.0',
    description: 'Evaluates architectural decisions, patterns, and code organization',
    persona: SOFTWARE_ARCHITECT.name,
    category: SOFTWARE_ARCHITECT.category,
    defaultThreshold: SOFTWARE_ARCHITECT.defaultThreshold,
    defaultWeight: SOFTWARE_ARCHITECT.defaultWeight,
  };

  getSystemPrompt(): string {
    return SOFTWARE_ARCHITECT.systemPrompt;
  }

  getCriteria(): string[] {
    return SOFTWARE_ARCHITECT.criteria;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const softwareArchitectJudge = new SoftwareArchitectJudgePlugin();
