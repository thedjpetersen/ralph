/**
 * Base Judge Implementation
 * Shared logic for all judge plugins
 * Uses provider plugins for LLM evaluation
 */

import type { JudgePlugin, JudgePluginMetadata } from './types.js';
import type { ExecutionContext } from '../../core/context.js';
import type { JudgeResult, JudgeContext, JudgeRunOptions, AIProvider } from '../../core/types.js';
import type { ProviderPlugin } from '../providers/types.js';
import { getProvider } from '../providers/index.js';

// ============================================================================
// Base Judge Class
// ============================================================================

export abstract class BaseJudgePlugin implements JudgePlugin {
  abstract readonly metadata: JudgePluginMetadata;

  /**
   * Get the system prompt for this judge persona
   * Override in subclass
   */
  abstract getSystemPrompt(): string;

  /**
   * Get evaluation criteria for this judge
   * Override in subclass
   */
  abstract getCriteria(): string[];

  /**
   * Build the full evaluation prompt
   */
  buildPrompt(ctx: JudgeContext): string {
    const criteria = ctx.task.criteria || [];

    let prompt = `You are acting as a ${this.metadata.persona} reviewing a completed development task.

## Your Role
${this.getSystemPrompt()}

## Task Being Reviewed
${ctx.task.description}

## Acceptance Criteria
${criteria.length > 0 ? criteria.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'None specified'}

## Code Changes Made
\`\`\`diff
${ctx.codeChanges || 'No code changes detected'}
\`\`\`

`;

    if (ctx.providerSummary) {
      prompt += `## Developer's Summary
${ctx.providerSummary}

`;
    }

    if (ctx.validationResults) {
      const validationSummary = ctx.validationResults.passed
        ? 'All validation gates passed'
        : `Validation failed: ${ctx.validationResults.failed_gates.join(', ')}`;
      prompt += `## Automated Validation
${validationSummary}

`;
    }

    // Add judge-specific criteria
    const judgeCriteria = this.getCriteria();
    if (judgeCriteria.length > 0) {
      prompt += `## Additional Criteria to Evaluate
${judgeCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

`;
    }

    prompt += `## Your Task
Review this task completion as a ${this.metadata.persona}. Evaluate whether the implementation meets the requirements and acceptance criteria.

Score the implementation from 0-100 based on your evaluation criteria.

Respond in the following JSON format:
\`\`\`json
{
  "score": 0-100,
  "verdict": "Brief one-line verdict",
  "reasoning": "Detailed explanation of your evaluation",
  "suggestions": ["Optional list of suggestions for improvement"],
  "confidence": 0.0-1.0
}
\`\`\`

Be thorough but fair. Consider both what was done well and what could be improved.`;

    return prompt;
  }

  /**
   * Parse LLM response into structured result
   */
  parseResponse(response: string): Partial<JudgeResult> {
    // Try to extract JSON from markdown code block
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        return {
          score: typeof parsed.score === 'number' ? parsed.score : 0,
          verdict: parsed.verdict || 'No verdict provided',
          reasoning: parsed.reasoning || 'No reasoning provided',
          suggestions: parsed.suggestions,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        };
      } catch {
        // Fall through to text parsing
      }
    }

    // Try to parse the whole output as JSON
    try {
      const parsed = JSON.parse(response.trim());
      return {
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        verdict: parsed.verdict || 'No verdict provided',
        reasoning: parsed.reasoning || 'No reasoning provided',
        suggestions: parsed.suggestions,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      };
    } catch {
      // Interpret text response
      const lowerOutput = response.toLowerCase();
      const passed = lowerOutput.includes('approved') ||
        lowerOutput.includes('passes') ||
        lowerOutput.includes('meets the criteria') ||
        !lowerOutput.includes('fail');

      return {
        score: passed ? 70 : 30,
        verdict: passed ? 'Approved (parsed from text)' : 'Rejected (parsed from text)',
        reasoning: response.substring(0, 1000),
        confidence: 0.5,
      };
    }
  }

  /**
   * Get the provider plugin for evaluation
   */
  protected getProviderPlugin(providerName: AIProvider): ProviderPlugin {
    const provider = getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}. Available providers: claude, gemini, cursor`);
    }
    return provider;
  }

  /**
   * Get the model string for a provider
   */
  protected getModelForProvider(provider: AIProvider, model?: string): string {
    if (model) return model;

    // Default models per provider
    switch (provider) {
      case 'claude':
        return 'sonnet';
      case 'gemini':
        return 'pro';
      case 'cursor':
        return 'claude-3-5-sonnet';
      default:
        return 'sonnet';
    }
  }

  /**
   * Run the judge evaluation using a provider plugin
   */
  async run(
    ctx: ExecutionContext,
    judgeCtx: JudgeContext,
    options: JudgeRunOptions = {}
  ): Promise<JudgeResult> {
    const logger = ctx.getLogger();
    const providerName = options.provider || 'claude';
    const model = this.getModelForProvider(providerName, options.model);
    const threshold = options.threshold ?? this.metadata.defaultThreshold;

    logger.info(`  Running ${this.metadata.persona} evaluation (${providerName}/${model})...`);

    const prompt = this.buildPrompt(judgeCtx);

    try {
      // Get the provider plugin
      const provider = this.getProviderPlugin(providerName);

      // Run the provider
      const result = await provider.run(ctx, {
        prompt,
        projectRoot: ctx.config.projectRoot,
        model,
        dryRun: ctx.config.dryRun,
        timeout: options.timeout || 60000,
      });

      if (!result.success) {
        logger.error(`  Judge ${this.metadata.persona} provider failed: ${result.error}`);
        return {
          score: 0,
          passed: false,
          persona: this.metadata.persona,
          verdict: 'Evaluation failed',
          reasoning: `Provider error: ${result.error}`,
          confidence: 0,
          timestamp: new Date().toISOString(),
        };
      }

      const parsed = this.parseResponse(result.output);
      const score = parsed.score || 0;

      return {
        score,
        passed: score >= threshold,
        persona: this.metadata.persona,
        verdict: parsed.verdict || 'No verdict',
        reasoning: parsed.reasoning || result.output,
        suggestions: parsed.suggestions,
        confidence: parsed.confidence || 0.5,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`  Judge ${this.metadata.persona} failed:`, error);
      return {
        score: 0,
        passed: false,
        persona: this.metadata.persona,
        verdict: 'Evaluation failed',
        reasoning: `Error running judge: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// ============================================================================
// Judge Aggregation
// ============================================================================

import type { JudgeConfig, AggregatedJudgeResult } from '../../core/types.js';

/**
 * Aggregate multiple judge results into a final verdict
 */
export function aggregateJudgeResults(
  configs: JudgeConfig[],
  results: JudgeResult[]
): AggregatedJudgeResult {
  // Check required judges
  let allRequiredPassed = true;
  const failedRequired: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const config = configs[i];
    const result = results[i];
    const isRequired = config?.required !== false;  // Default to required

    if (isRequired && !result.passed) {
      allRequiredPassed = false;
      failedRequired.push(result.persona);
    }
  }

  // Calculate weighted score
  let totalWeight = 0;
  let weightedScore = 0;

  for (let i = 0; i < results.length; i++) {
    const config = configs[i];
    const result = results[i];
    const weight = config?.weight ?? 1.0;

    totalWeight += weight;
    weightedScore += weight * result.score;
  }

  const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

  // Build summary
  let summary: string;
  if (allRequiredPassed) {
    summary = `All required judges passed. Overall score: ${overallScore}/100`;
  } else {
    summary = `Failed required judges: ${failedRequired.join(', ')}`;
  }

  return {
    passed: allRequiredPassed,
    overallScore,
    results,
    summary,
    timestamp: new Date().toISOString(),
  };
}
