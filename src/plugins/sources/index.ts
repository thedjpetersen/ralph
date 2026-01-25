/**
 * Task Source Plugins Index
 * Registers all built-in source plugins
 */

import { registry, registerBuiltin } from '../registry.js';
import { prdFileSource } from './prd-file.js';
import type { TaskSourcePlugin } from './types.js';

// Re-export types
export * from './types.js';
export * from './dag.js';

// Re-export source instances
export { prdFileSource } from './prd-file.js';

// ============================================================================
// Source Registration
// ============================================================================

/**
 * Register all built-in source plugins
 */
export async function registerSourcePlugins(): Promise<void> {
  await registerBuiltin('source', prdFileSource);
}

/**
 * Get a source plugin by name
 */
export function getSource(name: string): TaskSourcePlugin | undefined {
  return registry.get<TaskSourcePlugin>('source', name);
}

/**
 * Get all registered source plugins
 */
export function getAllSources(): TaskSourcePlugin[] {
  return registry.getAll<TaskSourcePlugin>('source');
}

/**
 * List all registered source names
 */
export function listSources(): string[] {
  return registry.list('source');
}

/**
 * Get the default source plugin
 */
export function getDefaultSource(): TaskSourcePlugin {
  return prdFileSource;
}
