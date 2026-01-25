import chalk from 'chalk';
import boxen from 'boxen';

export type LogLevel = 'debug' | 'info' | 'success' | 'warning' | 'error';

export interface LoggerOptions {
  quiet: boolean;
  verbose: boolean;
}

export interface SessionInfo {
  sessionId: string;
  project?: string;
  prdFile: string;
  pending: number;
  completed: number;
  total: number;
  provider: string;
  model: string;
  iterations: number;
  consumeMode?: boolean;
}

export interface TaskInfo {
  iteration: number;
  totalIterations: number;
  id: string;
  name: string;
  description: string;
  category: string;
  priority: string;
  steps?: string[];
  attempt?: number;
  estimatedMinutes?: number;
}

class Logger {
  private options: LoggerOptions = { quiet: false, verbose: false };

  configure(options: Partial<LoggerOptions>) {
    this.options = { ...this.options, ...options };
  }

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    if (this.options.quiet && level !== 'error') return;
    if (level === 'debug' && !this.options.verbose) return;

    const prefix = this.getPrefix(level);
    console.log(`${prefix} ${message}`, ...args);
  }

  private getPrefix(level: LogLevel): string {
    switch (level) {
      case 'debug':
        return chalk.gray('[DEBUG]');
      case 'info':
        return chalk.blue('[RALPH]');
      case 'success':
        return chalk.green('[RALPH]');
      case 'warning':
        return chalk.yellow('[RALPH]');
      case 'error':
        return chalk.red('[RALPH]');
    }
  }

  debug(message: string, ...args: unknown[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.log('info', message, ...args);
  }

  success(message: string, ...args: unknown[]) {
    this.log('success', message, ...args);
  }

  warning(message: string, ...args: unknown[]) {
    this.log('warning', message, ...args);
  }

  error(message: string, ...args: unknown[]) {
    this.log('error', message, ...args);
  }

  // Formatted output
  header(text: string) {
    if (this.options.quiet) return;
    console.log();
    console.log(chalk.bold.cyan(`=== ${text} ===`));
  }

  divider() {
    if (this.options.quiet) return;
    console.log(chalk.gray('─'.repeat(50)));
  }

  json(data: unknown) {
    console.log(JSON.stringify(data, null, 2));
  }

  // Progress bar helper
  progressBar(completed: number, total: number, width = 20): string {
    const pct = total > 0 ? completed / total : 0;
    const filled = Math.round(pct * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    if (pct >= 0.8) return chalk.green(bar);
    if (pct >= 0.5) return chalk.yellow(bar);
    if (pct >= 0.2) return chalk.cyan(bar);
    return chalk.gray(bar);
  }

  // Rich session start banner
  sessionBanner(info: SessionInfo) {
    if (this.options.quiet) return;

    const pct = Math.round((info.completed / info.total) * 100);
    const bar = this.progressBar(info.completed, info.total, 25);

    const lines = [
      chalk.bold.cyan('🤖 RALPH') + chalk.dim(' - Autonomous AI Coding Loop'),
      '',
      chalk.dim('Session: ') + chalk.white(info.sessionId),
      chalk.dim('PRD:     ') + chalk.white(info.prdFile),
      '',
      chalk.dim('Progress'),
      `  ${bar} ${chalk.bold(pct + '%')}`,
      `  ${chalk.green('✓')} ${info.completed} completed  ${chalk.yellow('○')} ${info.pending} pending  ${chalk.dim('of')} ${info.total} total`,
      '',
      chalk.dim('Config'),
      `  ${chalk.dim('Provider:')}  ${chalk.cyan(info.provider)} ${chalk.dim('(')}${chalk.white(info.model)}${chalk.dim(')')}`,
      `  ${chalk.dim('Tasks:')}     ${info.iterations === 9999 ? chalk.red.bold('ALL REMAINING') : chalk.white(info.iterations)}`,
      info.consumeMode ? `  ${chalk.dim('Mode:')}      ${chalk.yellow('CONSUME')} ${chalk.dim('(tasks removed after completion)')}` : '',
    ].filter(Boolean);

    console.log(boxen(lines.join('\n'), {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'cyan',
    }));
  }

  // Rich task start banner
  taskBanner(info: TaskInfo) {
    if (this.options.quiet) return;

    const iterProgress = `${info.iteration}/${info.totalIterations}`;
    const attemptStr = info.attempt && info.attempt > 1
      ? chalk.yellow(` (attempt ${info.attempt})`)
      : '';

    // Truncate description if too long
    const maxDescLen = 60;
    const desc = info.description.length > maxDescLen
      ? info.description.substring(0, maxDescLen - 3) + '...'
      : info.description;

    const priorityColor = info.priority === 'high' ? chalk.red : info.priority === 'medium' ? chalk.yellow : chalk.dim;

    const lines = [
      chalk.bold.white(`Task ${iterProgress}`) + attemptStr,
      '',
      chalk.dim('ID:       ') + chalk.cyan(info.id),
      chalk.dim('Name:     ') + chalk.bold.white(info.name || info.category),
      chalk.dim('Priority: ') + priorityColor(info.priority),
      '',
      chalk.dim('Description:'),
      chalk.white('  ' + desc),
    ];

    // Add steps preview if available
    if (info.steps && info.steps.length > 0) {
      lines.push('');
      lines.push(chalk.dim('Steps:'));
      const maxSteps = 3;
      info.steps.slice(0, maxSteps).forEach((step, i) => {
        const truncStep = step.length > 55 ? step.substring(0, 52) + '...' : step;
        lines.push(chalk.gray(`  ${i + 1}. ${truncStep}`));
      });
      if (info.steps.length > maxSteps) {
        lines.push(chalk.dim(`  ... and ${info.steps.length - maxSteps} more`));
      }
    }

    console.log(boxen(lines.join('\n'), {
      padding: 1,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'blue',
    }));
  }

  // Task completion summary
  taskComplete(taskName: string, duration: number, changes: string, commitHash?: string) {
    if (this.options.quiet) return;

    const durationStr = duration < 60
      ? `${duration}s`
      : `${Math.floor(duration / 60)}m ${duration % 60}s`;

    console.log(boxen(
      chalk.green.bold('✓ Task Completed') + '\n\n' +
      chalk.dim('Duration: ') + chalk.white(durationStr) + '\n' +
      chalk.dim('Changes:  ') + chalk.white(changes) +
      (commitHash ? '\n' + chalk.dim('Commit:   ') + chalk.cyan(commitHash) : ''),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'green',
      }
    ));
  }

  // Session complete summary
  sessionComplete(completed: number, total: number, duration: number) {
    if (this.options.quiet) return;

    const durationStr = duration < 60
      ? `${duration}s`
      : `${Math.floor(duration / 60)}m ${duration % 60}s`;

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    console.log(boxen(
      chalk.bold.green('🎉 Session Complete!') + '\n\n' +
      chalk.dim('Completed: ') + chalk.bold.white(`${completed}/${total}`) + chalk.dim(` (${pct}%)`) + '\n' +
      chalk.dim('Duration:  ') + chalk.white(durationStr),
      {
        padding: 1,
        margin: { top: 1, bottom: 1, left: 0, right: 0 },
        borderStyle: 'double',
        borderColor: 'green',
      }
    ));
  }

  // Progress indicators
  progress(current: number, total: number, message: string) {
    if (this.options.quiet) return;
    const percent = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.round(percent / 5)) + '░'.repeat(20 - Math.round(percent / 5));
    process.stdout.write(`\r${chalk.cyan('[RALPH]')} [${bar}] ${percent}% ${message}`);
    if (current === total) console.log();
  }
}

export const logger = new Logger();
