import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'success' | 'warning' | 'error';

export interface LoggerOptions {
  quiet: boolean;
  verbose: boolean;
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
