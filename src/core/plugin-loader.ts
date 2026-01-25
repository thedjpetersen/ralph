/**
 * Plugin Loader
 * Handles discovery and loading of plugins
 */

import { registry } from '../plugins/registry.js';
import { registerProviderPlugins } from '../plugins/providers/index.js';
import { registerGatePlugins } from '../plugins/gates/index.js';
import { registerJudgePlugins } from '../plugins/judges/index.js';
import { registerSourcePlugins } from '../plugins/sources/index.js';
import { registerHookPlugins } from '../plugins/hooks/index.js';

// ============================================================================
// Plugin Initialization
// ============================================================================

/**
 * Initialize all built-in plugins
 * Call this once at application startup
 */
export async function initializePlugins(): Promise<void> {
  if (registry.isInitialized()) {
    return;
  }

  // Register all built-in plugins
  await registerProviderPlugins();
  await registerGatePlugins();
  await registerJudgePlugins();
  await registerSourcePlugins();
  await registerHookPlugins();

  // Mark registry as initialized
  registry.markInitialized();
}

/**
 * Get plugin statistics
 */
export function getPluginStats(): Record<string, number> {
  return registry.count() as Record<string, number>;
}

/**
 * List all registered plugins by type
 */
export function listAllPlugins(): Record<string, string[]> {
  return registry.list() as Record<string, string[]>;
}
