/**
 * Security Auditor Judge Plugin
 * Evaluates security practices and vulnerability prevention
 */

import { BaseJudgePlugin } from './base.js';
import { SECURITY_AUDITOR } from './personas.js';
import type { JudgePluginMetadata, BuiltinJudgePlugin } from './types.js';

// ============================================================================
// Security Auditor Judge Plugin
// ============================================================================

export class SecurityAuditorJudgePlugin extends BaseJudgePlugin implements BuiltinJudgePlugin {
  readonly builtin = true as const;

  readonly metadata: JudgePluginMetadata = {
    name: 'security-auditor',
    version: '1.0.0',
    description: 'Evaluates security practices and vulnerability prevention',
    persona: SECURITY_AUDITOR.name,
    category: SECURITY_AUDITOR.category,
    defaultThreshold: SECURITY_AUDITOR.defaultThreshold,
    defaultWeight: SECURITY_AUDITOR.defaultWeight,
  };

  getSystemPrompt(): string {
    return SECURITY_AUDITOR.systemPrompt;
  }

  getCriteria(): string[] {
    return SECURITY_AUDITOR.criteria;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const securityAuditorJudge = new SecurityAuditorJudgePlugin();
