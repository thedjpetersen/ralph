import { execa } from 'execa';
import { existsSync } from 'fs';
import { logger } from './logger.js';
import type { ValidationResult } from './validation/validation.types.js';
import type { AggregatedJudgeResult } from './prd.js';

export interface NotifyOptions {
  title: string;
  description?: string;
  color?: string;
  footer?: string;
  author?: string;
  image?: string;
  file?: string;
  fields?: Array<{ name: string; value: string }>;
}

export class Notifier {
  private scriptPath: string;
  private enabled: boolean;

  constructor(scriptPath: string, enabled: boolean = true) {
    this.scriptPath = scriptPath;
    this.enabled = enabled && existsSync(scriptPath);

    if (enabled && !existsSync(scriptPath)) {
      logger.warning(`Notify script not found: ${scriptPath}`);
    }
  }

  async send(options: NotifyOptions): Promise<boolean> {
    if (!this.enabled) {
      logger.debug('Notifications disabled, skipping');
      return false;
    }

    const args: string[] = [];

    args.push('--title', options.title);

    if (options.description) {
      args.push('--description', options.description);
    }

    if (options.color) {
      args.push('--color', options.color);
    }

    if (options.footer) {
      args.push('--footer', options.footer);
    }

    if (options.author) {
      args.push('--author', options.author);
    }

    if (options.image) {
      args.push('--image', options.image);
    }

    if (options.file) {
      args.push('--file', options.file);
    }

    if (options.fields) {
      for (const field of options.fields) {
        args.push('--field', `${field.name}|${field.value}`);
      }
    }

    try {
      await execa(this.scriptPath, args);
      logger.debug(`Notification sent: ${options.title}`);
      return true;
    } catch (error) {
      logger.error('Failed to send notification:', error);
      return false;
    }
  }

  async sendSimple(message: string): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      await execa(this.scriptPath, [message]);
      return true;
    } catch (error) {
      logger.error('Failed to send simple notification:', error);
      return false;
    }
  }

  // Pre-built notification types
  async taskStarted(taskName: string, iteration: number, total: number) {
    return this.send({
      title: `Starting Task [${iteration}/${total}]`,
      description: `\`\`\`${taskName}\`\`\``,
      color: '0x3498DB', // Blue
      footer: 'clockzen-next',
      author: 'Ralph Wiggum',
    });
  }

  async taskCompleted(
    taskName: string,
    iteration: number,
    total: number,
    duration: number,
    changes?: string,
    summary?: string
  ) {
    let description = `\`\`\`${taskName}\`\`\`\n**Duration:** ${this.formatDuration(duration)}`;
    if (changes) {
      description += `\n**Changes:** ${changes}`;
    }
    if (summary) {
      // Truncate summary for Discord embed limits
      const truncatedSummary = summary.length > 300
        ? summary.substring(0, 300) + '...'
        : summary;
      description += `\n\n**Summary:**\n${truncatedSummary}`;
    }

    return this.send({
      title: `✅ Completed [${iteration}/${total}]`,
      description,
      color: '0x2ECC71', // Green
      footer: 'clockzen-next',
      author: 'Ralph Wiggum',
    });
  }

  async taskFailed(taskName: string, iteration: number, error: string) {
    return this.send({
      title: `Failed [${iteration}]`,
      description: `\`\`\`${taskName}\`\`\`\n**Error:** ${error.substring(0, 500)}`,
      color: '0xE74C3C', // Red
      footer: 'clockzen-next',
      author: 'Ralph Wiggum',
    });
  }

  async validationFailed(taskName: string, iteration: number, result: ValidationResult) {
    const failedGates = result.failed_gates.join(', ');

    // Build error summary from gate results
    const errorDetails = result.gates
      .filter(g => !g.passed)
      .map(g => {
        const shortError = g.error_summary?.split('\n')[0]?.substring(0, 100) || 'Unknown error';
        return `**${g.package}:${g.gate}**: ${shortError}`;
      })
      .join('\n');

    let description = `\`\`\`${taskName}\`\`\`\n`;
    description += `**Failed gates:** ${failedGates}\n`;
    description += `**Attempt:** ${result.attempts}\n\n`;
    description += errorDetails;

    return this.send({
      title: `⚠️ Validation Failed [${iteration}]`,
      description: description.substring(0, 1900), // Discord limit
      color: '0xF39C12', // Yellow
      footer: 'clockzen-next',
      author: 'Ralph Wiggum',
    });
  }

  async judgeFailed(taskName: string, iteration: number, result: AggregatedJudgeResult) {
    // Build summary of judge verdicts
    const verdicts = result.results
      .map(r => {
        const status = r.passed ? '✓' : '✗';
        return `${status} **${r.persona}**: ${r.verdict}`;
      })
      .join('\n');

    let description = `\`\`\`${taskName}\`\`\`\n`;
    description += `**Summary:** ${result.summary}\n\n`;
    description += `**Judge Verdicts:**\n${verdicts}`;

    // Add suggestions if any
    const suggestions = result.results
      .flatMap(r => r.suggestions || [])
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .slice(0, 3);

    if (suggestions.length > 0) {
      description += `\n\n**Suggestions:**\n`;
      description += suggestions.map(s => `• ${s}`).join('\n');
    }

    return this.send({
      title: `⚖️ Judge Panel Rejected [${iteration}]`,
      description: description.substring(0, 1900), // Discord limit
      color: '0x9B59B6', // Purple
      footer: 'clockzen-next',
      author: 'Ralph Wiggum',
    });
  }

  async sessionStarted(totalTasks: number, model: string) {
    return this.send({
      title: 'Ralph Session Started',
      description: `Starting autonomous coding session`,
      color: '0x9B59B6', // Purple
      fields: [
        { name: 'Tasks', value: `${totalTasks}` },
        { name: 'Model', value: model },
      ],
      footer: 'clockzen-next',
      author: 'Ralph Wiggum',
    });
  }

  async sessionCompleted(completed: number, total: number, totalDuration: number) {
    return this.send({
      title: 'Ralph Session Complete',
      description: `Finished ${completed}/${total} tasks`,
      color: '0x27AE60', // Dark green
      fields: [
        { name: 'Completed', value: `${completed}` },
        { name: 'Duration', value: this.formatDuration(totalDuration) },
      ],
      footer: 'clockzen-next',
      author: 'Ralph Wiggum',
    });
  }

  async sendScreenshot(filepath: string, iteration: number, description?: string, imageUrl?: string) {
    return this.send({
      title: `📸 Screenshot: Iteration ${iteration}`,
      description: description || 'Proof of work',
      file: imageUrl ? undefined : filepath, // Use file only if no URL
      image: imageUrl, // Embed image from URL
      color: '0x2ECC71',
      footer: 'clockzen-next',
      author: 'Ralph Wiggum',
    });
  }

  async sendVideo(filepath: string, iteration: number, description?: string, videoUrl?: string) {
    // For video, include the URL in the description since Discord embeds videos from URLs
    const desc = videoUrl
      ? `${description || 'Recording'}\n\n🎬 [Watch Video](${videoUrl})`
      : description || 'Recording';

    return this.send({
      title: `🎬 Video: Iteration ${iteration}`,
      description: desc,
      file: videoUrl ? undefined : filepath,
      color: '0x2ECC71',
      footer: 'clockzen-next',
      author: 'Ralph Wiggum',
    });
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }
}
