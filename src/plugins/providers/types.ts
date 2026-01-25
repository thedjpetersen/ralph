/**
 * Provider Plugin Types
 * Defines interfaces for AI provider plugins
 */

import type { Plugin, PluginMetadata, BuiltinMarker } from '../types.js';
import type { ExecutionContext } from '../../core/context.js';
import type { ProviderResult, ProviderRunOptions, AIProvider, CursorMode } from '../../core/types.js';

// ============================================================================
// Provider Metadata
// ============================================================================

export interface ProviderPluginMetadata extends PluginMetadata {
  /** CLI command to execute (e.g., 'claude', 'gemini', 'agent') */
  command: string;

  /** Supported models for this provider */
  models: string[];

  /** Display name for UI */
  displayName: string;
}

// ============================================================================
// Stream State
// ============================================================================

export interface StreamState {
  /** Tool usage counts */
  toolCounts: Record<string, number>;

  /** Last text response from the provider */
  lastTextResponse: string;

  /** Number of events processed */
  lineCount: number;
}

// ============================================================================
// Provider Plugin Interface
// ============================================================================

export interface ProviderPlugin extends Plugin {
  metadata: ProviderPluginMetadata;

  /**
   * Check if this provider is available (CLI installed)
   */
  isAvailable(): Promise<boolean>;

  /**
   * Build CLI arguments for the provider
   */
  buildArgs(options: ProviderRunOptions): string[];

  /**
   * Parse a line of streaming output
   */
  parseEvent(line: string, state: StreamState): void;

  /**
   * Get display name with optional model
   */
  getDisplayName(model?: string): string;

  /**
   * Run the provider
   */
  run(ctx: ExecutionContext, options: ProviderRunOptions): Promise<ProviderResult>;
}

// ============================================================================
// Provider Options by Type
// ============================================================================

export interface ClaudeProviderOptions extends ProviderRunOptions {
  model?: 'opus' | 'sonnet';
}

export interface GeminiProviderOptions extends ProviderRunOptions {
  model?: 'pro' | 'flash';
}

export interface CursorProviderOptions extends ProviderRunOptions {
  model?: string;
  mode?: CursorMode;
}

// ============================================================================
// Built-in Provider Plugin
// ============================================================================

export interface BuiltinProviderPlugin extends ProviderPlugin, BuiltinMarker {}

// ============================================================================
// Provider Runner Context
// ============================================================================

export interface RunnerContext {
  startTime: number;
  stdout: string;
  stderr: string;
  lastActivity: number;
  lastStatusLine: string;
  jsonBuffer: string;
  state: StreamState;
}

// ============================================================================
// Provider Config Resolution
// ============================================================================

export interface ResolvedProviderConfig {
  provider: AIProvider;
  claudeModel: 'opus' | 'sonnet';
  geminiModel: 'pro' | 'flash';
  cursorModel: string;
  cursorMode: CursorMode;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isProviderPlugin(plugin: Plugin): plugin is ProviderPlugin {
  return 'buildArgs' in plugin && 'parseEvent' in plugin && 'run' in plugin;
}
