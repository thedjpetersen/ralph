/**
 * Claude Prompt Building
 *
 * Contains utilities for building prompts for RALPH tasks.
 * The actual execution is handled by providers.ts
 */

import type { RalphConfig } from './config.js';
import type { ValidationResult, Package } from './validation/validation.types.js';
import type { AggregatedJudgeResult } from './prd.js';

// Re-export Package type for convenience
export type { Package } from './validation/validation.types.js';

export interface TaskPromptOptions {
  taskId?: string;
  previousValidationResult?: ValidationResult;
  previousJudgeResult?: AggregatedJudgeResult;  // Judge results from previous attempt
  targetPackages?: Package[];  // Packages to validate before completion
}

/**
 * Generate validation commands for a specific package
 */
function getValidationCommands(pkg: Package): { build: string; test: string; lint: string } {
  const commands: Record<Package, { build: string; test: string; lint: string }> = {
    frontend: {
      build: 'cd frontend && npm run build',
      test: 'cd frontend && npm test -- --run',
      lint: 'cd frontend && npm run lint',
    },
    backend: {
      build: 'cd backend && npm run build',
      test: 'cd backend && npm test -- --run',
      lint: 'cd backend && npm run lint',
    },
    electron: {
      build: 'cd electron && npm run build:main',
      test: 'cd electron && npm test -- --run',
      lint: 'cd electron && npm run lint',
    },
    mobile: {
      build: 'cd mobile && npx tsc --noEmit',
      test: 'cd mobile && npm test -- --run',
      lint: 'cd mobile && npm run lint',
    },
    'chrome-extension': {
      build: 'cd chrome-extension && npm run build',
      test: '',  // No tests
      lint: '',  // No lint
    },
  };
  return commands[pkg];
}

/**
 * Generate validation section for the prompt
 */
function buildValidationSection(targetPackages: Package[]): string {
  if (!targetPackages || targetPackages.length === 0) {
    return `## VALIDATION GATES

After you signal completion, Ralph will automatically run validation:
- **Build**: TypeScript compilation must succeed
- **Tests**: All tests must pass
- **Lint**: No lint errors allowed

If validation fails, your task will NOT be marked complete and you'll be retried with the error details. Make sure your code compiles, passes tests, and follows lint rules.`;
  }

  const validationSteps: string[] = [];

  for (const pkg of targetPackages) {
    const cmds = getValidationCommands(pkg);
    validationSteps.push(`### ${pkg}`);
    if (cmds.build) validationSteps.push(`- Build: \`${cmds.build}\``);
    if (cmds.test) validationSteps.push(`- Test: \`${cmds.test}\``);
    if (cmds.lint) validationSteps.push(`- Lint: \`${cmds.lint}\``);
  }

  return `## VALIDATION GATES (REQUIRED BEFORE COMPLETION)

**CRITICAL**: You MUST run these validation commands yourself and fix any errors BEFORE signaling completion with \`<complete>DONE</complete>\`.

This is the most important step. DO NOT signal completion until all validations pass.

${validationSteps.join('\n')}

### Validation Workflow

1. After making your code changes, run each validation command above
2. If any command fails, fix the issues and re-run
3. Repeat until ALL validations pass
4. ONLY THEN signal completion with \`<complete>DONE</complete>\`

**Note**: Ralph will also run these validations after you signal completion. If they fail at that stage, you'll be restarted in a new session and lose context. Running them yourself first prevents this.`;
}

export function buildTaskPrompt(
  taskDescription: string,
  config: RalphConfig,
  options: TaskPromptOptions = {}
): string {
  const scriptsDir = config.scriptsDir;
  const taskId = options.taskId || 'task';
  const targetPackages = options.targetPackages || [];

  // Build validation feedback section if there was a previous failure
  let validationFeedback = '';
  if (options.previousValidationResult && !options.previousValidationResult.passed) {
    const failed = options.previousValidationResult.failed_gates;
    const attempts = options.previousValidationResult.attempts;

    validationFeedback = `
## ⚠️ PREVIOUS VALIDATION FAILED (Attempt ${attempts})

Your previous attempt failed validation. You MUST fix these issues:

**Failed gates:** ${failed.join(', ')}

${options.previousValidationResult.gates
  .filter(g => !g.passed)
  .map(g => `### ${g.package}:${g.gate}\n\`\`\`\n${g.error_summary || 'No details'}\n\`\`\``)
  .join('\n\n')}

Fix these issues BEFORE marking the task complete.
`;
  }

  // Build judge feedback section if there was a previous rejection
  let judgeFeedback = '';
  if (options.previousJudgeResult && !options.previousJudgeResult.passed) {
    const failedJudges = options.previousJudgeResult.results.filter(r => !r.passed);

    judgeFeedback = `
## ⚠️ PREVIOUS JUDGE EVALUATION REJECTED

Your previous attempt was reviewed by AI judges and **REJECTED**. You MUST address their concerns:

${failedJudges.map(r => `### ${r.persona} (Score: ${r.score || 'N/A'}/100)
**Verdict:** ${r.verdict}
**Reasoning:** ${r.reasoning}
${r.suggestions && r.suggestions.length > 0 ? `**Suggestions:**\n${r.suggestions.map(s => `- ${s}`).join('\n')}` : ''}
`).join('\n')}

**You must improve the implementation to address these concerns before marking the task complete.**
`;
  }

  const validationSection = buildValidationSection(targetPackages);

  return `You are working on the clockzen-next project as part of an autonomous coding loop called "Ralph".

Your task is:
${taskDescription}
${validationFeedback}${judgeFeedback}
## Important Guidelines

1. Make the necessary code changes to complete the task
2. Run validation commands (see below) to verify your changes
3. If you encounter errors, fix them before completing
4. When ALL validations pass, provide a brief summary and include \`<complete>DONE</complete>\`

${validationSection}

## Evidence Capture (REQUIRED)

You MUST capture evidence of your work. Name files with the task ID: \`${taskId}-evidence.png\`

### For Frontend/UI Tasks (PREFERRED METHOD):
Use Playwright to capture a screenshot of the specific UI you changed:

\`\`\`bash
cd frontend
npx playwright screenshot http://localhost:5173/your-page test-results/evidence/${taskId}-evidence.png
\`\`\`

Or create a test file:

\`\`\`typescript
// frontend/e2e/evidence.spec.ts
import { test } from '@playwright/test';

test('capture evidence', async ({ page }) => {
  await page.goto('http://localhost:5173/your-page');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: 'test-results/evidence/${taskId}-evidence.png',
    fullPage: false
  });
});
\`\`\`

Then run: \`cd frontend && npx playwright test e2e/evidence.spec.ts\`

### For Backend/CLI Tasks:
Use the capture script to record a terminal GIF of the test output:
\`${scriptsDir}/capture.sh ascii "cd backend && npm test" ${taskId}-tests\`

### ONLY use desktop screenshot as last resort:
\`${scriptsDir}/capture.sh screenshot\` - Use this ONLY if Playwright is not applicable (e.g., electron-only features)

## Discord Notifications (REQUIRED)

At the END of your task, you MUST send a Discord notification with your results:

\`\`\`bash
${scriptsDir}/notify.sh --title "✅ Task Complete" \\
  --description "Brief summary of what was done" \\
  --color 0x2ECC71 \\
  --author "Ralph Wiggum" \\
  --footer "clockzen-next"
\`\`\`

If you captured evidence, upload it and include in the notification:
\`\`\`bash
# Upload to MinIO and get URL
URL=$(${scriptsDir}/upload.sh /path/to/${taskId}-evidence.png --folder screenshots)

# Send notification with image
${scriptsDir}/notify.sh --title "✅ Task Complete" \\
  --description "Summary here" \\
  --image "$URL" \\
  --color 0x2ECC71 \\
  --author "Ralph Wiggum"
\`\`\`

Or attach a local file directly:
\`\`\`bash
${scriptsDir}/notify.sh --title "✅ Task Complete" \\
  --description "Summary here" \\
  --file /path/to/${taskId}-evidence.png \\
  --color 0x2ECC71 \\
  --author "Ralph Wiggum"
\`\`\`

## Notification Colors
- Success (green): 0x2ECC71
- In Progress (blue): 0x3498DB
- Warning (yellow): 0xF39C12
- Error (red): 0xE74C3C

## Learnings

If you discover something useful for future tasks, note it in this format:
<learning>
Pattern: [name]
Context: [situation]
Insight: [what you learned]
</learning>

Do not ask clarifying questions - make reasonable assumptions and proceed.
Focus on making clean, working code changes with proof of completion.`;
}

export function checkForCompletion(output: string): boolean {
  // Check in both raw output and try to extract from JSON
  const checks = [
    '<complete>DONE</complete>',
    '<promise>COMPLETE</promise>',
    'task completed successfully',
    '"subtype":"success"',
  ];

  const lowerOutput = output.toLowerCase();
  return checks.some(check => lowerOutput.includes(check.toLowerCase()));
}

export function extractChangedFiles(output: string): string[] {
  const files: string[] = [];

  // Look for file modification patterns
  const patterns = [
    /(?:Modified|Created|Updated|Edited):\s*([^\s\n]+)/gi,
    /Writing to ([^\s\n]+)/gi,
    /(?:^|\n)\+\+\+ b\/([^\s\n]+)/gm,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(output)) !== null) {
      if (match[1] && !files.includes(match[1])) {
        files.push(match[1]);
      }
    }
  }

  return files;
}
