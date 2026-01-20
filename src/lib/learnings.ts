/**
 * Learnings Manager - accumulates knowledge across Ralph sessions
 */

import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { logger } from './logger.js';
import type { ValidationResult } from './validation/validation.types.js';

export interface Learning {
  pattern: string;
  context: string;
  insight: string;
  taskId?: string;
  timestamp: string;
}

export interface ValidationFailure {
  taskId: string;
  gate: string;
  errorSummary: string;
  resolution?: string;
  timestamp: string;
}

export interface Gotcha {
  category: string;
  issue: string;
  workaround?: string;
  timestamp: string;
}

/**
 * Learnings Manager class - manages .ralph/LEARNINGS.md
 */
export class LearningsManager {
  private filepath: string;

  constructor(filepath: string) {
    this.filepath = filepath;
    this.ensureFile();
  }

  private ensureFile(): void {
    const dir = dirname(this.filepath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    if (!existsSync(this.filepath)) {
      const header = `# Ralph Learnings

This file auto-accumulates knowledge discovered during Ralph sessions.

---

## Patterns Discovered

<!-- Patterns learned from successful tasks -->

## Validation Failures

<!-- Track validation failures and how they were resolved -->

## Gotchas

<!-- Common pitfalls and workarounds -->

---

`;
      writeFileSync(this.filepath, header);
    }
  }

  /**
   * Parse <learning> blocks from Claude's output
   */
  parseLearnings(output: string, taskId?: string): Learning[] {
    const learnings: Learning[] = [];
    const pattern = /<learning>([\s\S]*?)<\/learning>/gi;

    let match;
    while ((match = pattern.exec(output)) !== null) {
      const content = match[1].trim();

      // Parse the learning block
      const patternMatch = content.match(/Pattern:\s*(.+)/i);
      const contextMatch = content.match(/Context:\s*(.+)/i);
      const insightMatch = content.match(/Insight:\s*(.+)/i);

      if (patternMatch || insightMatch) {
        learnings.push({
          pattern: patternMatch?.[1]?.trim() || 'Unnamed pattern',
          context: contextMatch?.[1]?.trim() || '',
          insight: insightMatch?.[1]?.trim() || content,
          taskId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return learnings;
  }

  /**
   * Add a learning to the file
   */
  addLearning(learning: Learning): void {
    const date = new Date(learning.timestamp).toISOString().split('T')[0];
    const taskRef = learning.taskId ? ` [${learning.taskId}]` : '';

    const entry = `
### [${date}] ${learning.pattern}${taskRef}
- **Context:** ${learning.context || 'N/A'}
- **Insight:** ${learning.insight}

`;

    this.appendToSection('Patterns Discovered', entry);
    logger.debug(`Logged learning: ${learning.pattern}`);
  }

  /**
   * Log a validation failure
   */
  logValidationFailure(
    taskId: string,
    result: ValidationResult
  ): void {
    if (result.passed) return;

    const date = new Date().toISOString().split('T')[0];

    for (const gate of result.gates.filter(g => !g.passed)) {
      const entry = `
### [${date}] ${taskId} - ${gate.package}:${gate.gate}
- **Error:** ${gate.error_summary?.split('\n')[0] || 'Unknown error'}
- **Attempt:** ${result.attempts}

`;

      this.appendToSection('Validation Failures', entry);
    }

    logger.debug(`Logged validation failure for ${taskId}`);
  }

  /**
   * Log a resolution for a validation failure
   */
  logResolution(taskId: string, gate: string, resolution: string): void {
    const date = new Date().toISOString().split('T')[0];

    const entry = `
### [${date}] ${taskId} - ${gate} (RESOLVED)
- **Resolution:** ${resolution}

`;

    this.appendToSection('Validation Failures', entry);
    logger.debug(`Logged resolution for ${taskId}`);
  }

  /**
   * Add a gotcha
   */
  addGotcha(gotcha: Gotcha): void {
    const date = new Date(gotcha.timestamp).toISOString().split('T')[0];

    const entry = `
### [${date}] ${gotcha.category}
- **Issue:** ${gotcha.issue}
${gotcha.workaround ? `- **Workaround:** ${gotcha.workaround}` : ''}

`;

    this.appendToSection('Gotchas', entry);
    logger.debug(`Logged gotcha: ${gotcha.category}`);
  }

  /**
   * Add a session summary
   */
  addSessionSummary(
    sessionId: string,
    tasksCompleted: number,
    totalDuration: number,
    validationStats: { passed: number; failed: number }
  ): void {
    const date = new Date().toISOString().split('T')[0];
    const durationMins = Math.round(totalDuration / 60);

    const entry = `
---

### Session Summary - ${date} (${sessionId})
- **Tasks Completed:** ${tasksCompleted}
- **Duration:** ${durationMins} minutes
- **Validation:** ${validationStats.passed} passed, ${validationStats.failed} failed

`;

    this.appendToEnd(entry);
    logger.debug(`Logged session summary for ${sessionId}`);
  }

  /**
   * Get the content of the learnings file
   */
  getContent(): string {
    if (!existsSync(this.filepath)) {
      return '';
    }
    return readFileSync(this.filepath, 'utf-8');
  }

  /**
   * Get a summary for inclusion in prompts
   */
  getSummaryForPrompt(maxLength: number = 2000): string {
    const content = this.getContent();

    // Extract recent patterns (last 5)
    const patternSection = this.extractSection(content, 'Patterns Discovered');
    const patterns = patternSection
      .split('###')
      .filter(p => p.trim())
      .slice(-5)
      .map(p => p.trim())
      .join('\n\n');

    // Extract recent gotchas (last 3)
    const gotchaSection = this.extractSection(content, 'Gotchas');
    const gotchas = gotchaSection
      .split('###')
      .filter(g => g.trim())
      .slice(-3)
      .map(g => g.trim())
      .join('\n\n');

    let summary = '## Recent Learnings\n\n';

    if (patterns) {
      summary += '### Patterns\n' + patterns + '\n\n';
    }

    if (gotchas) {
      summary += '### Gotchas\n' + gotchas + '\n\n';
    }

    // Truncate if too long
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 100) + '\n\n... (truncated)';
    }

    return summary;
  }

  private appendToSection(sectionName: string, content: string): void {
    let file = this.getContent();

    // Find the section
    const sectionRegex = new RegExp(`(## ${sectionName}[\\s\\S]*?)(?=\\n## |\\n---\\n|$)`, 'i');
    const match = file.match(sectionRegex);

    if (match) {
      // Insert before the next section or end
      const insertPos = match.index! + match[1].length;
      file = file.substring(0, insertPos) + content + file.substring(insertPos);
    } else {
      // Section not found, append to end
      file += `\n## ${sectionName}\n${content}`;
    }

    writeFileSync(this.filepath, file);
  }

  private appendToEnd(content: string): void {
    appendFileSync(this.filepath, content);
  }

  private extractSection(content: string, sectionName: string): string {
    const sectionRegex = new RegExp(`## ${sectionName}([\\s\\S]*?)(?=\\n## |$)`, 'i');
    const match = content.match(sectionRegex);
    return match ? match[1] : '';
  }
}

/**
 * Create a learnings manager instance
 */
export function createLearningsManager(filepath: string): LearningsManager {
  return new LearningsManager(filepath);
}

/**
 * Extract learnings from Claude output and log them
 */
export function processClaudeOutput(
  output: string,
  learningsManager: LearningsManager,
  taskId?: string
): Learning[] {
  const learnings = learningsManager.parseLearnings(output, taskId);

  for (const learning of learnings) {
    learningsManager.addLearning(learning);
  }

  return learnings;
}
