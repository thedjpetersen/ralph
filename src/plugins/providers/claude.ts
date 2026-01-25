/**
 * Claude Code Provider Plugin
 * Integrates with the Claude CLI for task execution
 */

import { BaseProviderPlugin } from './base.js';
import type { StreamState, ProviderPluginMetadata, BuiltinProviderPlugin } from './types.js';
import type { ProviderRunOptions } from '../../core/types.js';

// ============================================================================
// Claude Provider Plugin
// ============================================================================

export class ClaudeProviderPlugin extends BaseProviderPlugin implements BuiltinProviderPlugin {
  readonly builtin = true as const;

  readonly metadata: ProviderPluginMetadata = {
    name: 'claude',
    version: '1.0.0',
    description: 'Claude Code CLI provider for task execution',
    command: 'claude',
    models: ['opus', 'sonnet'],
    displayName: 'Claude Code',
  };

  buildArgs(options: ProviderRunOptions): string[] {
    return [
      '--print',
      '--verbose',
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
      '--model', options.model || 'sonnet',
      '--max-turns', '50',
      options.prompt,
    ];
  }

  parseEvent(line: string, state: StreamState): void {
    try {
      const event = JSON.parse(line);
      if (event.type === 'assistant' && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'tool_use') {
            state.toolCounts[block.name] = (state.toolCounts[block.name] || 0) + 1;
          } else if (block.type === 'text' && block.text) {
            state.lastTextResponse = block.text;
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  getDisplayName(model?: string): string {
    return model || 'sonnet';
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const claudeProvider = new ClaudeProviderPlugin();
