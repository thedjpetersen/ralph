/**
 * Cursor Agent Provider Plugin
 * Integrates with the Cursor Agent CLI for task execution
 */

import { BaseProviderPlugin } from './base.js';
import type { StreamState, ProviderPluginMetadata, BuiltinProviderPlugin, CursorProviderOptions } from './types.js';
import type { ProviderRunOptions } from '../../core/types.js';

// ============================================================================
// Cursor Provider Plugin
// ============================================================================

export class CursorProviderPlugin extends BaseProviderPlugin implements BuiltinProviderPlugin {
  readonly builtin = true as const;

  readonly metadata: ProviderPluginMetadata = {
    name: 'cursor',
    version: '1.0.0',
    description: 'Cursor Agent CLI provider for task execution',
    command: 'agent',
    models: ['claude-3-5-sonnet', 'gpt-4', 'gpt-4-turbo'],
    displayName: 'Cursor Agent',
  };

  buildArgs(options: ProviderRunOptions): string[] {
    const cursorOptions = options as CursorProviderOptions;
    return [
      '-p', options.prompt,
      '--model', cursorOptions.model || 'claude-3-5-sonnet',
      '--output-format', 'json',
      `--mode=${cursorOptions.mode || 'agent'}`,
    ];
  }

  parseEvent(line: string, state: StreamState): void {
    try {
      const event = JSON.parse(line);
      if (event.type === 'tool_use' || event.tool) {
        const toolName = event.tool || event.name || 'unknown';
        state.toolCounts[toolName] = (state.toolCounts[toolName] || 0) + 1;
      } else if (event.type === 'text' || event.content) {
        state.lastTextResponse = event.content || event.text || '';
      }
    } catch {
      if (line.trim()) {
        state.lastTextResponse = line;
      }
    }
  }

  getDisplayName(model?: string): string {
    const cursorModel = model || 'claude-3-5-sonnet';
    return `${cursorModel}, agent mode`;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const cursorProvider = new CursorProviderPlugin();
