/**
 * Gemini CLI Provider Plugin
 * Integrates with the Gemini CLI for task execution
 */

import { BaseProviderPlugin } from './base.js';
import type { StreamState, ProviderPluginMetadata, BuiltinProviderPlugin } from './types.js';
import type { ProviderRunOptions } from '../../core/types.js';

// ============================================================================
// Gemini Provider Plugin
// ============================================================================

export class GeminiProviderPlugin extends BaseProviderPlugin implements BuiltinProviderPlugin {
  readonly builtin = true as const;

  readonly metadata: ProviderPluginMetadata = {
    name: 'gemini',
    version: '1.0.0',
    description: 'Gemini CLI provider for task execution',
    command: 'gemini',
    models: ['pro', 'flash'],
    displayName: 'Gemini CLI',
  };

  buildArgs(options: ProviderRunOptions): string[] {
    const model = options.model === 'flash' ? '2.5-flash' : '2.5-pro';
    return [
      '-p', options.prompt,
      '-m', model,
      '--output-format', 'stream-json',
      '-y',  // YOLO mode - auto-accept actions
    ];
  }

  parseEvent(line: string, state: StreamState): void {
    try {
      const event = JSON.parse(line);
      if (event.type === 'tool_call' || event.tool_name) {
        const toolName = event.tool_name || event.name || 'unknown';
        state.toolCounts[toolName] = (state.toolCounts[toolName] || 0) + 1;
      } else if (event.type === 'text' || event.text) {
        state.lastTextResponse = event.text || event.content || '';
      }
    } catch {
      if (line.trim()) {
        state.lastTextResponse = line;
      }
    }
  }

  getDisplayName(model?: string): string {
    return model === 'flash' ? '2.5-flash' : '2.5-pro';
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const geminiProvider = new GeminiProviderPlugin();
