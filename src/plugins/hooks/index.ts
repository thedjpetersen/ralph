/**
 * Hook Plugins Index
 * Registers hook plugins and provides event management
 */

import { registry, registerBuiltin } from '../registry.js';
import { eventEmitter, RalphEventEmitter } from './emitter.js';
import { createExternalHook, createClaudeCodeHooks, ExternalHookPlugin } from './external.js';
import type { HookPlugin } from './types.js';
import type { RalphEvents, HookDecision } from '../../core/events.js';
import type { ExecutionContext } from '../../core/context.js';

// Re-export types
export * from './types.js';
export { RalphEventEmitter, eventEmitter } from './emitter.js';
export { ExternalHookPlugin, createExternalHook, createClaudeCodeHooks } from './external.js';

// ============================================================================
// Hook Registration
// ============================================================================

/**
 * Register all built-in hook plugins
 * Currently no built-in hooks - they are added via external scripts
 */
export async function registerHookPlugins(): Promise<void> {
  // No built-in hooks to register
  // External hooks are registered dynamically via registerExternalHooks()
}

/**
 * Register a hook plugin
 */
export async function registerHook(plugin: HookPlugin): Promise<void> {
  await registry.register('hook', plugin);
  eventEmitter.registerHook(plugin);
}

/**
 * Unregister a hook plugin
 */
export async function unregisterHook(name: string): Promise<boolean> {
  const success = await registry.unregister('hook', name);
  if (success) {
    eventEmitter.unregisterHook(name);
  }
  return success;
}

/**
 * Get a hook plugin by name
 */
export function getHook(name: string): HookPlugin | undefined {
  return registry.get<HookPlugin>('hook', name);
}

/**
 * Get all registered hook plugins
 */
export function getAllHooks(): HookPlugin[] {
  return registry.getAll<HookPlugin>('hook');
}

/**
 * List all registered hook names
 */
export function listHooks(): string[] {
  return registry.list('hook');
}

// ============================================================================
// External Hook Registration
// ============================================================================

/**
 * Register external hooks from Claude Code configuration
 */
export async function registerExternalHooks(
  hooksDir: string,
  projectRoot: string
): Promise<void> {
  const externalHooks = createClaudeCodeHooks(hooksDir, projectRoot);

  for (const hook of externalHooks) {
    try {
      await registerHook(hook);
    } catch (error) {
      // Skip hooks that can't be registered (e.g., duplicates)
      console.warn(`Could not register hook ${hook.metadata.name}:`, error);
    }
  }
}

// ============================================================================
// Event Emission Helpers
// ============================================================================

/**
 * Initialize the event emitter with execution context
 */
export function initializeEventEmitter(ctx: ExecutionContext): void {
  eventEmitter.setContext(ctx);
}

/**
 * Emit an event
 */
export function emit<K extends keyof RalphEvents>(event: K, data: RalphEvents[K]): void {
  eventEmitter.emit(event, data);
}

/**
 * Emit an event and wait for blocking hooks
 */
export async function emitBlocking<K extends keyof RalphEvents>(
  event: K,
  data: RalphEvents[K]
): Promise<HookDecision | undefined> {
  return eventEmitter.emitBlocking(event, data);
}

/**
 * Subscribe to an event
 */
export function on<K extends keyof RalphEvents>(
  event: K,
  handler: (data: RalphEvents[K]) => void
): void {
  eventEmitter.on(event, handler);
}

/**
 * Unsubscribe from an event
 */
export function off<K extends keyof RalphEvents>(
  event: K,
  handler: (data: RalphEvents[K]) => void
): void {
  eventEmitter.off(event, handler);
}
