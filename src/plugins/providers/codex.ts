/**
 * OpenAI Codex Provider Plugin
 * Integrates with the Codex CLI for task execution
 */

import { BaseProviderPlugin } from './base.js';
import type { StreamState, ProviderPluginMetadata, BuiltinProviderPlugin } from './types.js';
import type { ProviderRunOptions } from '../../core/types.js';

// ============================================================================
// Codex Provider Plugin
// ============================================================================

export class CodexProviderPlugin extends BaseProviderPlugin implements BuiltinProviderPlugin {
  readonly builtin = true as const;

  readonly metadata: ProviderPluginMetadata = {
    name: 'codex',
    version: '1.0.0',
    description: 'OpenAI Codex CLI provider for task execution',
    command: 'codex',
    models: ['default'],
    displayName: 'OpenAI Codex',
  };

  buildArgs(options: ProviderRunOptions): string[] {
    return [
      '--prompt', options.prompt,
      '--approval-mode', 'full-auto',
      '--json',
    ];
  }

  parseEvent(line: string, state: StreamState): void {
    try {
      const event = JSON.parse(line);

      if (event.type === 'tool_use' || event.tool) {
        const toolName = event.tool || event.name || 'unknown';
        state.toolCounts[toolName] = (state.toolCounts[toolName] || 0) + 1;
      } else if (event.type === 'text' || event.content || event.message) {
        state.lastTextResponse = event.content || event.message || event.text || '';
      }
    } catch {
      if (line.trim()) {
        state.lastTextResponse = line;
      }
    }
  }

  getDisplayName(model?: string): string {
    return model || 'codex';
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const codexProvider = new CodexProviderPlugin();
