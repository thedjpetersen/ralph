/**
 * LLM Judge - validates task completion through persona-based evaluation
 * Supports multiple judge personas for comprehensive review
 */

import { execa } from 'execa';
import { logger } from './logger.js';
import type { PrdItem, JudgeConfig, JudgeResult, AggregatedJudgeResult } from './prd.js';
import type { ValidationResult } from './validation/validation.types.js';

export interface JudgeContext {
  taskDescription: string;
  acceptanceCriteria: string[];
  codeChanges: string;          // Git diff summary
  validationResults?: ValidationResult;
  evidencePath?: string;
  claudeSummary?: string;       // Claude's completion summary
}

export interface JudgeOptions {
  parallel?: boolean;           // Run judges in parallel (default: true)
  failFast?: boolean;           // Stop on first required judge failure
  timeout?: number;             // Timeout per judge in ms (default: 60000)
}

/**
 * Build the judge prompt based on persona
 */
function buildJudgePrompt(
  config: JudgeConfig,
  context: JudgeContext
): string {
  const personaInstructions = getPersonaInstructions(config.persona);

  let prompt = `You are acting as a ${config.persona} reviewing a completed development task.

## Your Role
${personaInstructions}

## Task Being Reviewed
${context.taskDescription}

## Acceptance Criteria
${context.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## Code Changes Made
\`\`\`diff
${context.codeChanges || 'No code changes detected'}
\`\`\`

`;

  if (context.claudeSummary) {
    prompt += `## Developer's Summary
${context.claudeSummary}

`;
  }

  if (context.validationResults) {
    const validationSummary = context.validationResults.passed
      ? 'All validation gates passed'
      : `Validation failed: ${context.validationResults.failed_gates.join(', ')}`;
    prompt += `## Automated Validation
${validationSummary}

`;
  }

  if (config.criteria && config.criteria.length > 0) {
    prompt += `## Additional Criteria to Evaluate
${config.criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

`;
  }

  if (config.requireEvidence && !context.evidencePath) {
    prompt += `## ⚠️ Evidence Required
This task requires visual evidence but none was provided. This should factor into your judgment.

`;
  }

  prompt += `## Your Task
Review this task completion as a ${config.persona}. Evaluate whether the implementation meets the requirements and acceptance criteria.

Respond in the following JSON format:
\`\`\`json
{
  "passed": true/false,
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
 * Get persona-specific instructions
 */
function getPersonaInstructions(persona: string): string {
  const personaLower = persona.toLowerCase();

  if (personaLower.includes('qa') || personaLower.includes('quality')) {
    return `As a QA Engineer, focus on:
- Test coverage: Are edge cases handled?
- Error handling: Are errors caught and handled gracefully?
- Regression risk: Could this change break existing functionality?
- Code quality: Is the code clean, readable, and maintainable?
- Acceptance criteria: Does the implementation meet ALL specified criteria?`;
  }

  if (personaLower.includes('ux') || personaLower.includes('design')) {
    return `As a UX Designer, focus on:
- User experience: Is the implementation intuitive and user-friendly?
- Visual consistency: Does it match existing design patterns?
- Accessibility: Are accessibility requirements considered (WCAG)?
- Feedback: Does the UI provide appropriate feedback to users?
- Edge cases: How does the UI handle empty states, errors, loading?`;
  }

  if (personaLower.includes('security')) {
    return `As a Security Auditor, focus on:
- Input validation: Is user input properly sanitized?
- Authentication/Authorization: Are proper checks in place?
- Data exposure: Is sensitive data properly protected?
- OWASP Top 10: Are common vulnerabilities addressed?
- Dependencies: Are there concerns with added dependencies?`;
  }

  if (personaLower.includes('performance')) {
    return `As a Performance Engineer, focus on:
- Efficiency: Are there unnecessary computations or re-renders?
- Memory usage: Are there potential memory leaks?
- Bundle size: Does this add significant weight?
- Caching: Is caching used appropriately?
- Scalability: Will this perform well at scale?`;
  }

  if (personaLower.includes('architect')) {
    return `As a Software Architect, focus on:
- Design patterns: Are appropriate patterns used?
- Separation of concerns: Is the code well-organized?
- Extensibility: Can this be easily extended?
- Technical debt: Does this introduce debt?
- Consistency: Does this follow existing architectural decisions?`;
  }

  // Default generic reviewer
  return `As a ${persona}, evaluate the implementation based on:
- Correctness: Does it do what was asked?
- Quality: Is the code well-written?
- Completeness: Are all acceptance criteria met?
- Best practices: Does it follow industry standards?`;
}

/**
 * Run a single judge evaluation
 */
async function runSingleJudge(
  config: JudgeConfig,
  context: JudgeContext,
  projectRoot: string,
  timeout: number = 60000
): Promise<JudgeResult> {
  logger.info(`  Running ${config.persona} evaluation...`);

  const prompt = buildJudgePrompt(config, context);
  const model = config.model || 'sonnet';  // Default to sonnet for cost

  try {
    const args = [
      '--print',
      '--output-format', 'text',
      '--dangerously-skip-permissions',
      '--model', model,
      '--max-turns', '1',
      prompt,
    ];

    const { stdout } = await execa('claude', args, {
      cwd: projectRoot,
      timeout,
      reject: false,
    });

    // Parse the JSON response
    const jsonMatch = stdout.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[1]);
      return {
        passed: Boolean(result.passed),
        persona: config.persona,
        verdict: result.verdict || 'No verdict provided',
        reasoning: result.reasoning || 'No reasoning provided',
        suggestions: result.suggestions,
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
        timestamp: new Date().toISOString(),
      };
    }

    // Try to parse the whole output as JSON
    try {
      const result = JSON.parse(stdout.trim());
      return {
        passed: Boolean(result.passed),
        persona: config.persona,
        verdict: result.verdict || 'No verdict provided',
        reasoning: result.reasoning || 'No reasoning provided',
        suggestions: result.suggestions,
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
        timestamp: new Date().toISOString(),
      };
    } catch {
      // Couldn't parse JSON, interpret the text response
      const lowerOutput = stdout.toLowerCase();
      const passed = lowerOutput.includes('approved') ||
        lowerOutput.includes('passes') ||
        lowerOutput.includes('meets the criteria') ||
        !lowerOutput.includes('fail');

      return {
        passed,
        persona: config.persona,
        verdict: passed ? 'Approved (parsed from text)' : 'Rejected (parsed from text)',
        reasoning: stdout.substring(0, 1000),
        confidence: 0.5,  // Lower confidence since we couldn't parse structured output
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    logger.error(`  Judge ${config.persona} failed:`, error);
    return {
      passed: false,
      persona: config.persona,
      verdict: 'Evaluation failed',
      reasoning: `Error running judge: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Run all judge evaluations for a task
 */
export async function runJudges(
  item: PrdItem,
  context: JudgeContext,
  projectRoot: string,
  options: JudgeOptions = {}
): Promise<AggregatedJudgeResult> {
  const judges = item.judges || [];

  if (judges.length === 0) {
    return {
      passed: true,
      results: [],
      summary: 'No judges configured',
      timestamp: new Date().toISOString(),
    };
  }

  logger.info(`Running ${judges.length} judge evaluation(s)...`);

  const { parallel = true, failFast = false, timeout = 60000 } = options;
  const results: JudgeResult[] = [];

  if (parallel && !failFast) {
    // Run all judges in parallel
    const promises = judges.map(judge =>
      runSingleJudge(judge, context, projectRoot, timeout)
    );
    results.push(...await Promise.all(promises));
  } else {
    // Run judges sequentially (for fail-fast or sequential mode)
    for (const judge of judges) {
      const result = await runSingleJudge(judge, context, projectRoot, timeout);
      results.push(result);

      // Check if we should stop early
      if (failFast && !result.passed) {
        const isRequired = judge.required !== false;  // Default to required
        if (isRequired) {
          logger.warning(`  Fail-fast: ${judge.persona} rejected (required judge)`);
          break;
        }
      }
    }
  }

  // Aggregate results
  const aggregated = aggregateResults(judges, results);

  // Log summary
  const passedCount = results.filter(r => r.passed).length;
  logger.info(`Judge results: ${passedCount}/${results.length} passed`);

  return aggregated;
}

/**
 * Aggregate multiple judge results into a final verdict
 */
function aggregateResults(
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

  // Calculate weighted score for optional judges
  let totalWeight = 0;
  let weightedScore = 0;

  for (let i = 0; i < results.length; i++) {
    const config = configs[i];
    const result = results[i];
    const weight = config?.weight ?? 1.0;

    totalWeight += weight;
    if (result.passed) {
      weightedScore += weight * result.confidence;
    }
  }

  const avgScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  // Build summary
  let summary: string;
  if (allRequiredPassed) {
    summary = `All required judges passed. Overall score: ${Math.round(avgScore * 100)}%`;
  } else {
    summary = `Failed required judges: ${failedRequired.join(', ')}`;
  }

  return {
    passed: allRequiredPassed,
    results,
    summary,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run a single judge (convenience function for single judge config)
 * @deprecated Use runJudges with a single-element array instead
 */
export async function runJudge(
  item: PrdItem,
  context: JudgeContext,
  projectRoot: string
): Promise<JudgeResult> {
  const judges = item.judges || [];

  if (judges.length === 0) {
    return {
      passed: true,
      persona: 'none',
      verdict: 'No judge configured',
      reasoning: 'Task has no judge configuration, auto-passing.',
      confidence: 1.0,
      timestamp: new Date().toISOString(),
    };
  }

  // Run just the first judge
  return runSingleJudge(judges[0], context, projectRoot);
}

/**
 * Format a single judge result for console display
 */
export function formatSingleJudgeResult(result: JudgeResult): string {
  const status = result.passed ? '✓ APPROVED' : '✗ REJECTED';
  const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';

  let output = `
${statusColor}${status}${reset} by ${result.persona}
  Verdict: ${result.verdict}
  Confidence: ${Math.round(result.confidence * 100)}%

  Reasoning:
    ${result.reasoning.split('\n').join('\n    ')}
`;

  if (result.suggestions && result.suggestions.length > 0) {
    output += `
  Suggestions:
${result.suggestions.map(s => `    - ${s}`).join('\n')}
`;
  }

  return output;
}

/**
 * Format aggregated judge results for console display
 */
export function formatJudgeResultsForConsole(result: AggregatedJudgeResult): string {
  if (result.results.length === 0) {
    return '\nNo judges configured\n';
  }

  const overallStatus = result.passed ? '\x1b[32m✓ APPROVED\x1b[0m' : '\x1b[31m✗ REJECTED\x1b[0m';

  let output = `
Judge Panel Results: ${overallStatus}
${result.summary}
${'─'.repeat(50)}
`;

  for (const judgeResult of result.results) {
    const status = judgeResult.passed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    output += `
${status} ${judgeResult.persona}: ${judgeResult.verdict}
   Confidence: ${Math.round(judgeResult.confidence * 100)}%
   ${judgeResult.reasoning.split('\n')[0].substring(0, 80)}...
`;
  }

  // Collect all suggestions
  const allSuggestions = result.results
    .flatMap(r => r.suggestions || [])
    .filter((s, i, arr) => arr.indexOf(s) === i)  // Unique
    .slice(0, 5);

  if (allSuggestions.length > 0) {
    output += `
${'─'.repeat(50)}
Combined Suggestions:
${allSuggestions.map(s => `  • ${s}`).join('\n')}
`;
  }

  return output;
}

/**
 * Format aggregated judge results for Discord notification
 */
export function formatJudgeResultsForDiscord(result: AggregatedJudgeResult): string {
  if (result.results.length === 0) {
    return 'No judges configured';
  }

  const overallStatus = result.passed ? '✅ **APPROVED**' : '❌ **REJECTED**';

  let output = `${overallStatus}\n${result.summary}\n\n`;

  for (const judgeResult of result.results) {
    const status = judgeResult.passed ? '✓' : '✗';
    output += `${status} **${judgeResult.persona}**: ${judgeResult.verdict}\n`;
  }

  // Collect suggestions
  const allSuggestions = result.results
    .flatMap(r => r.suggestions || [])
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 3);

  if (allSuggestions.length > 0) {
    output += `\n**Suggestions:**\n`;
    output += allSuggestions.map(s => `• ${s}`).join('\n');
  }

  return output.substring(0, 1900);  // Discord limit
}

/**
 * @deprecated Use formatJudgeResultsForConsole instead
 */
export function formatJudgeResultForConsole(result: JudgeResult): string {
  return formatSingleJudgeResult(result);
}

/**
 * @deprecated Use formatJudgeResultsForDiscord instead
 */
export function formatJudgeResultForDiscord(result: JudgeResult): string {
  const status = result.passed ? '✅ APPROVED' : '❌ REJECTED';

  let output = `**${status}** by ${result.persona}\n`;
  output += `**Verdict:** ${result.verdict}\n`;
  output += `**Confidence:** ${Math.round(result.confidence * 100)}%\n\n`;
  output += `**Reasoning:**\n${result.reasoning.substring(0, 500)}`;

  if (result.suggestions && result.suggestions.length > 0) {
    output += `\n\n**Suggestions:**\n`;
    output += result.suggestions.slice(0, 3).map(s => `• ${s}`).join('\n');
  }

  return output;
}

/**
 * Check if task requires judge evaluation
 */
export function requiresJudge(item: PrdItem): boolean {
  return Boolean(item.judges && item.judges.length > 0);
}

/**
 * Get the number of judges configured for a task
 */
export function getJudgeCount(item: PrdItem): number {
  return item.judges?.length || 0;
}

/**
 * Get required judges for a task
 */
export function getRequiredJudges(item: PrdItem): JudgeConfig[] {
  return (item.judges || []).filter(j => j.required !== false);
}

/**
 * Common judge personas for easy configuration
 */
export const COMMON_PERSONAS = {
  QA: {
    persona: 'QA Engineer',
    criteria: [
      'All acceptance criteria are met',
      'Edge cases are handled',
      'Error handling is appropriate',
    ],
  },
  UX: {
    persona: 'UX Designer',
    criteria: [
      'UI is intuitive and user-friendly',
      'Design is consistent with existing patterns',
      'Accessibility is considered',
    ],
    requireEvidence: true,
  },
  SECURITY: {
    persona: 'Security Auditor',
    criteria: [
      'Input is properly validated',
      'No sensitive data exposure',
      'Authentication checks are in place',
    ],
  },
  PERFORMANCE: {
    persona: 'Performance Engineer',
    criteria: [
      'No unnecessary re-renders or computations',
      'Bundle size impact is minimal',
      'Caching is used appropriately',
    ],
  },
  ARCHITECT: {
    persona: 'Software Architect',
    criteria: [
      'Follows existing architectural patterns',
      'Code is well-organized',
      'No significant technical debt introduced',
    ],
  },
};
