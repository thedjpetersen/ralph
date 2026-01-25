/**
 * External Hook Adapter
 * Allows running external scripts (Python, shell, etc.) as hooks
 */

import { execa } from 'execa';
import type { HookPlugin, HookPluginMetadata, ExternalHookConfig } from './types.js';
import type { ExecutionContext } from '../../core/context.js';
import type { RalphEvents, HookDecision } from '../../core/events.js';

// ============================================================================
// External Hook Plugin
// ============================================================================

export class ExternalHookPlugin implements HookPlugin {
  readonly metadata: HookPluginMetadata;
  private config: ExternalHookConfig;

  constructor(config: ExternalHookConfig, name: string) {
    this.config = config;
    this.metadata = {
      name,
      version: '1.0.0',
      description: `External hook: ${config.script}`,
      events: config.events,
      blocking: config.blocking,
      priority: 100, // External hooks run after built-in hooks
    };
  }

  async handle<K extends keyof RalphEvents>(
    ctx: ExecutionContext,
    event: K,
    data: RalphEvents[K]
  ): Promise<void | HookDecision> {
    const logger = ctx.getLogger();

    try {
      // Prepare environment
      const env: Record<string, string> = {
        ...process.env,
        RALPH_EVENT: event,
        RALPH_EVENT_DATA: JSON.stringify(data),
        RALPH_PROJECT_ROOT: ctx.config.projectRoot,
        RALPH_SESSION_ID: ctx.sessionId,
        ...this.config.env,
      };

      // Run the script
      const result = await execa(this.config.script, [], {
        cwd: ctx.config.projectRoot,
        timeout: this.config.timeout,
        reject: false,
        env,
      });

      // For blocking hooks, parse the output for decision
      if (this.config.blocking) {
        if (result.exitCode !== 0) {
          return {
            continue: false,
            reason: result.stderr || `External hook failed with exit code ${result.exitCode}`,
          };
        }

        // Try to parse decision from stdout
        try {
          const decision = JSON.parse(result.stdout);
          if (typeof decision.continue === 'boolean') {
            return decision as HookDecision;
          }
        } catch {
          // Not JSON, assume success
        }
      }

      // Log non-blocking hook output
      if (result.stdout && ctx.config.verbose) {
        logger.debug(`Hook ${this.metadata.name} output: ${result.stdout}`);
      }

      return undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warning(`External hook ${this.metadata.name} failed: ${errorMessage}`);

      if (this.config.blocking) {
        return {
          continue: true, // Don't block on error by default
          reason: `Hook error: ${errorMessage}`,
        };
      }

      return undefined;
    }
  }
}

// ============================================================================
// External Hook Factory
// ============================================================================

/**
 * Create an external hook plugin from configuration
 */
export function createExternalHook(
  config: ExternalHookConfig,
  name?: string
): ExternalHookPlugin {
  const hookName = name || `external-${config.script.replace(/[^a-z0-9]/gi, '-')}`;
  return new ExternalHookPlugin(config, hookName);
}

/**
 * Create external hooks from Claude Code hooks configuration
 */
export function createClaudeCodeHooks(
  hooksDir: string,
  projectRoot: string
): ExternalHookPlugin[] {
  const hooks: ExternalHookPlugin[] = [];

  // These would be discovered from .claude/settings.json
  // For now, we define the standard hooks

  const standardHooks: ExternalHookConfig[] = [
    {
      script: `${hooksDir}/stop_validation.py`,
      events: ['validation:gate:complete'],
      blocking: true,
      timeout: 5000,
      env: { PROJECT_ROOT: projectRoot },
    },
    {
      script: `${hooksDir}/post_edit_lint.py`,
      events: ['task:complete'],
      blocking: false,
      timeout: 30000,
      env: { PROJECT_ROOT: projectRoot },
    },
  ];

  for (const config of standardHooks) {
    try {
      hooks.push(createExternalHook(config));
    } catch {
      // Skip invalid hooks
    }
  }

  return hooks;
}
