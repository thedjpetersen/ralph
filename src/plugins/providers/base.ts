/**
 * Base Provider Implementation
 * Shared streaming logic for all provider plugins
 */

import { execa, ExecaError } from 'execa';
import type { ProviderPlugin, StreamState, RunnerContext, ProviderPluginMetadata } from './types.js';
import type { ExecutionContext } from '../../core/context.js';
import type { ProviderResult, ProviderRunOptions } from '../../core/types.js';

// ============================================================================
// Utility Functions
// ============================================================================

export function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

export function createStreamState(): StreamState {
  return {
    toolCounts: {},
    lastTextResponse: '',
    lineCount: 0,
  };
}

export function createRunnerContext(): RunnerContext {
  return {
    startTime: Date.now(),
    stdout: '',
    stderr: '',
    lastActivity: Date.now(),
    lastStatusLine: '',
    jsonBuffer: '',
    state: createStreamState(),
  };
}

// ============================================================================
// Status Line Management
// ============================================================================

export function updateStatusLine(ctx: RunnerContext): void {
  const elapsed = formatElapsed(Date.now() - ctx.startTime);
  const tools = Object.entries(ctx.state.toolCounts)
    .map(([name, count]) => `${name}:${count}`)
    .join(' ');
  const status = `  [${elapsed}] ${ctx.state.lineCount} events | ${tools || 'starting...'}`;
  process.stdout.write('\r' + ' '.repeat(ctx.lastStatusLine.length) + '\r');
  process.stdout.write(status);
  ctx.lastStatusLine = status;
}

export function clearStatusLine(ctx: RunnerContext): void {
  if (ctx.lastStatusLine) {
    process.stdout.write('\r' + ' '.repeat(ctx.lastStatusLine.length) + '\r');
  }
}

// ============================================================================
// Base Provider Class
// ============================================================================

export abstract class BaseProviderPlugin implements ProviderPlugin {
  abstract readonly metadata: ProviderPluginMetadata;

  abstract buildArgs(options: ProviderRunOptions): string[];
  abstract parseEvent(line: string, state: StreamState): void;

  getDisplayName(model?: string): string {
    return model ? `${this.metadata.displayName} (${model})` : this.metadata.displayName;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await execa(this.metadata.command, ['--version'], {
        timeout: 5000,
        reject: true,
      });
      return true;
    } catch {
      return false;
    }
  }

  async run(ctx: ExecutionContext, options: ProviderRunOptions): Promise<ProviderResult> {
    const logger = ctx.getLogger();
    const runnerCtx = createRunnerContext();

    if (options.dryRun) {
      logger.info(`[DRY RUN] Would execute ${this.metadata.displayName}`);
      return { success: true, output: '[DRY RUN]', duration: 0 };
    }

    const args = this.buildArgs(options);
    const modelDisplay = this.getDisplayName(options.model);

    logger.info(`Starting ${this.metadata.displayName} (${modelDisplay})...`);

    try {
      const subprocess = execa(this.metadata.command, args, {
        cwd: options.projectRoot,
        timeout: options.timeout || 30 * 60 * 1000,
        reject: false,
        stdin: 'ignore',
        buffer: false,
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      // Progress warning for inactivity
      const progressInterval = setInterval(() => {
        const sinceActivity = Date.now() - runnerCtx.lastActivity;
        if (sinceActivity > 60000) {
          process.stdout.write(` ⚠️ No output for ${formatElapsed(sinceActivity)}`);
        }
      }, 30000);

      // Stream stdout
      if (subprocess.stdout) {
        subprocess.stdout.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          runnerCtx.stdout += text;
          runnerCtx.jsonBuffer += text;
          runnerCtx.lastActivity = Date.now();

          const lines = runnerCtx.jsonBuffer.split('\n');
          runnerCtx.jsonBuffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            runnerCtx.state.lineCount++;
            this.parseEvent(line, runnerCtx.state);
          }

          updateStatusLine(runnerCtx);
        });
      }

      // Stream stderr
      if (subprocess.stderr) {
        subprocess.stderr.on('data', (chunk: Buffer) => {
          runnerCtx.stderr += chunk.toString();
          runnerCtx.lastActivity = Date.now();
        });
      }

      const result = await subprocess;
      clearInterval(progressInterval);
      clearStatusLine(runnerCtx);

      const duration = Math.round((Date.now() - runnerCtx.startTime) / 1000);
      const toolSummary = Object.entries(runnerCtx.state.toolCounts)
        .map(([name, count]) => `${name}:${count}`)
        .join(' ');

      logger.info(`${this.metadata.displayName} finished in ${formatElapsed(duration * 1000)} | ${toolSummary || 'no tools used'}`);

      if (result.exitCode !== 0) {
        return {
          success: false,
          output: runnerCtx.stdout,
          error: runnerCtx.stderr || `Exit code: ${result.exitCode}`,
          duration,
          summary: runnerCtx.state.lastTextResponse,
          toolsUsed: runnerCtx.state.toolCounts,
        };
      }

      return {
        success: true,
        output: runnerCtx.stdout,
        duration,
        summary: runnerCtx.state.lastTextResponse,
        toolsUsed: runnerCtx.state.toolCounts,
      };
    } catch (error) {
      const duration = Math.round((Date.now() - runnerCtx.startTime) / 1000);
      const execaError = error as ExecaError;
      logger.error(`${this.metadata.displayName} execution failed: ${execaError.message}`);
      return {
        success: false,
        output: execaError.stdout || '',
        error: execaError.message,
        duration,
      };
    }
  }
}

// ============================================================================
// Standalone Runner (for backward compatibility)
// ============================================================================

export async function runStreamingCLI(
  provider: ProviderPlugin,
  options: ProviderRunOptions,
  logger: { info: (msg: string) => void; error: (msg: string, err?: unknown) => void }
): Promise<ProviderResult> {
  const runnerCtx = createRunnerContext();

  if (options.dryRun) {
    logger.info(`[DRY RUN] Would execute ${provider.metadata.displayName}`);
    return { success: true, output: '[DRY RUN]', duration: 0 };
  }

  const args = provider.buildArgs(options);
  const modelDisplay = provider.getDisplayName(options.model);

  logger.info(`Starting ${provider.metadata.displayName} (${modelDisplay})...`);

  try {
    const subprocess = execa(provider.metadata.command, args, {
      cwd: options.projectRoot,
      timeout: options.timeout || 30 * 60 * 1000,
      reject: false,
      stdin: 'ignore',
      buffer: false,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    // Progress warning for inactivity
    const progressInterval = setInterval(() => {
      const sinceActivity = Date.now() - runnerCtx.lastActivity;
      if (sinceActivity > 60000) {
        process.stdout.write(` ⚠️ No output for ${formatElapsed(sinceActivity)}`);
      }
    }, 30000);

    // Stream stdout
    if (subprocess.stdout) {
      subprocess.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        runnerCtx.stdout += text;
        runnerCtx.jsonBuffer += text;
        runnerCtx.lastActivity = Date.now();

        const lines = runnerCtx.jsonBuffer.split('\n');
        runnerCtx.jsonBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          runnerCtx.state.lineCount++;
          provider.parseEvent(line, runnerCtx.state);
        }

        updateStatusLine(runnerCtx);
      });
    }

    // Stream stderr
    if (subprocess.stderr) {
      subprocess.stderr.on('data', (chunk: Buffer) => {
        runnerCtx.stderr += chunk.toString();
        runnerCtx.lastActivity = Date.now();
      });
    }

    const result = await subprocess;
    clearInterval(progressInterval);
    clearStatusLine(runnerCtx);

    const duration = Math.round((Date.now() - runnerCtx.startTime) / 1000);
    const toolSummary = Object.entries(runnerCtx.state.toolCounts)
      .map(([name, count]) => `${name}:${count}`)
      .join(' ');

    logger.info(`${provider.metadata.displayName} finished in ${formatElapsed(duration * 1000)} | ${toolSummary || 'no tools used'}`);

    if (result.exitCode !== 0) {
      return {
        success: false,
        output: runnerCtx.stdout,
        error: runnerCtx.stderr || `Exit code: ${result.exitCode}`,
        duration,
        summary: runnerCtx.state.lastTextResponse,
        toolsUsed: runnerCtx.state.toolCounts,
      };
    }

    return {
      success: true,
      output: runnerCtx.stdout,
      duration,
      summary: runnerCtx.state.lastTextResponse,
      toolsUsed: runnerCtx.state.toolCounts,
    };
  } catch (error) {
    const duration = Math.round((Date.now() - runnerCtx.startTime) / 1000);
    const execaError = error as ExecaError;
    logger.error(`${provider.metadata.displayName} execution failed: ${execaError.message}`);
    return {
      success: false,
      output: execaError.stdout || '',
      error: execaError.message,
      duration,
    };
  }
}
