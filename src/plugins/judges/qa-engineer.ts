/**
 * QA Engineer Judge Plugin
 * Evaluates code quality, test coverage, and acceptance criteria
 */

import { BaseJudgePlugin } from './base.js';
import { QA_ENGINEER } from './personas.js';
import type { JudgePluginMetadata, BuiltinJudgePlugin } from './types.js';

// ============================================================================
// QA Engineer Judge Plugin
// ============================================================================

export class QAEngineerJudgePlugin extends BaseJudgePlugin implements BuiltinJudgePlugin {
  readonly builtin = true as const;

  readonly metadata: JudgePluginMetadata = {
    name: 'qa-engineer',
    version: '1.0.0',
    description: 'Evaluates code quality, test coverage, and acceptance criteria',
    persona: QA_ENGINEER.name,
    category: QA_ENGINEER.category,
    defaultThreshold: QA_ENGINEER.defaultThreshold,
    defaultWeight: QA_ENGINEER.defaultWeight,
  };

  getSystemPrompt(): string {
    return QA_ENGINEER.systemPrompt;
  }

  getCriteria(): string[] {
    return QA_ENGINEER.criteria;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const qaEngineerJudge = new QAEngineerJudgePlugin();
