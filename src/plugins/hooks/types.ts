/**
 * Hook Plugin Types
 * Defines interfaces for lifecycle hook plugins
 */

import type { Plugin, PluginMetadata, BuiltinMarker } from '../types.js';
import type { ExecutionContext } from '../../core/context.js';
import type { RalphEvents, HookDecision } from '../../core/events.js';

// ============================================================================
// Hook Metadata
// ============================================================================

export interface HookPluginMetadata extends PluginMetadata {
  /** Events this hook subscribes to */
  events: Array<keyof RalphEvents>;

  /** Whether this hook can block execution */
  blocking: boolean;

  /** Priority (lower runs first) */
  priority: number;
}

// ============================================================================
// Hook Plugin Interface
// ============================================================================

export interface HookPlugin extends Plugin {
  metadata: HookPluginMetadata;

  /**
   * Handle an event
   * For non-blocking hooks, return void
   * For blocking hooks, return a HookDecision
   */
  handle<K extends keyof RalphEvents>(
    ctx: ExecutionContext,
    event: K,
    data: RalphEvents[K]
  ): Promise<void | HookDecision>;
}

// ============================================================================
// Built-in Hook Plugin
// ============================================================================

export interface BuiltinHookPlugin extends HookPlugin, BuiltinMarker {}

// ============================================================================
// Hook Registration
// ============================================================================

export interface HookRegistration {
  plugin: HookPlugin;
  events: Set<keyof RalphEvents>;
  priority: number;
}

// ============================================================================
// External Hook Configuration
// ============================================================================

export interface ExternalHookConfig {
  /** Path to the hook script */
  script: string;

  /** Events to subscribe to */
  events: Array<keyof RalphEvents>;

  /** Whether the hook can block execution */
  blocking: boolean;

  /** Timeout in milliseconds */
  timeout: number;

  /** Environment variables to pass */
  env?: Record<string, string>;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isHookPlugin(plugin: Plugin): plugin is HookPlugin {
  const metadata = plugin.metadata as HookPluginMetadata;
  return 'events' in metadata && 'blocking' in metadata && 'handle' in plugin;
}
