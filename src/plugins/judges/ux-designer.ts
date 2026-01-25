/**
 * UX Designer Judge Plugin
 * Evaluates user experience, accessibility, and design consistency
 */

import { BaseJudgePlugin } from './base.js';
import { UX_DESIGNER } from './personas.js';
import type { JudgePluginMetadata, BuiltinJudgePlugin } from './types.js';

// ============================================================================
// UX Designer Judge Plugin
// ============================================================================

export class UXDesignerJudgePlugin extends BaseJudgePlugin implements BuiltinJudgePlugin {
  readonly builtin = true as const;

  readonly metadata: JudgePluginMetadata = {
    name: 'ux-designer',
    version: '1.0.0',
    description: 'Evaluates user experience, accessibility, and design consistency',
    persona: UX_DESIGNER.name,
    category: UX_DESIGNER.category,
    defaultThreshold: UX_DESIGNER.defaultThreshold,
    defaultWeight: UX_DESIGNER.defaultWeight,
  };

  getSystemPrompt(): string {
    return UX_DESIGNER.systemPrompt;
  }

  getCriteria(): string[] {
    return UX_DESIGNER.criteria;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const uxDesignerJudge = new UXDesignerJudgePlugin();
