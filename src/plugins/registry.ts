/**
 * Central plugin registry for Ralph
 * Manages registration, discovery, and retrieval of all plugin types
 */

import type { Plugin, PluginType, PluginMetadata, PluginRegistration } from './types.js';
import { isBuiltinPlugin } from './types.js';

// ============================================================================
// Plugin Registry
// ============================================================================

export class PluginRegistry {
  private plugins: Map<PluginType, Map<string, PluginRegistration>> = new Map();
  private initialized = false;

  constructor() {
    // Initialize maps for each plugin type
    const types: PluginType[] = ['provider', 'gate', 'judge', 'source', 'hook'];
    for (const type of types) {
      this.plugins.set(type, new Map());
    }
  }

  /**
   * Register a plugin
   * @param type - The plugin type
   * @param plugin - The plugin instance
   * @throws Error if plugin with same name already exists
   */
  async register<T extends Plugin>(type: PluginType, plugin: T): Promise<void> {
    const typeMap = this.plugins.get(type);
    if (!typeMap) {
      throw new Error(`Unknown plugin type: ${type}`);
    }

    const name = plugin.metadata.name;

    if (typeMap.has(name)) {
      throw new Error(`Plugin already registered: ${type}/${name}`);
    }

    const registration: PluginRegistration<T> = {
      type,
      plugin,
      activated: false,
      registeredAt: new Date().toISOString(),
    };

    // Call onRegister hook if present
    if (plugin.onRegister) {
      await plugin.onRegister();
    }

    typeMap.set(name, registration as PluginRegistration);
  }

  /**
   * Unregister a plugin
   * @throws Error if plugin is a built-in plugin
   */
  async unregister(type: PluginType, name: string): Promise<boolean> {
    const typeMap = this.plugins.get(type);
    if (!typeMap) {
      return false;
    }

    const registration = typeMap.get(name);
    if (!registration) {
      return false;
    }

    // Prevent unregistering built-in plugins
    if (isBuiltinPlugin(registration.plugin)) {
      throw new Error(`Cannot unregister built-in plugin: ${type}/${name}`);
    }

    // Call onDeactivate if plugin was activated
    if (registration.activated && registration.plugin.onDeactivate) {
      await registration.plugin.onDeactivate();
    }

    return typeMap.delete(name);
  }

  /**
   * Get a plugin by type and name
   */
  get<T extends Plugin>(type: PluginType, name: string): T | undefined {
    const typeMap = this.plugins.get(type);
    if (!typeMap) {
      return undefined;
    }

    const registration = typeMap.get(name);
    return registration?.plugin as T | undefined;
  }

  /**
   * Get all plugins of a specific type
   */
  getAll<T extends Plugin>(type: PluginType): T[] {
    const typeMap = this.plugins.get(type);
    if (!typeMap) {
      return [];
    }

    return Array.from(typeMap.values()).map(r => r.plugin as T);
  }

  /**
   * Check if a plugin exists
   */
  has(type: PluginType, name: string): boolean {
    const typeMap = this.plugins.get(type);
    return typeMap?.has(name) ?? false;
  }

  /**
   * List all registered plugin names
   */
  list(): Record<PluginType, string[]>;
  list(type: PluginType): string[];
  list(type?: PluginType): string[] | Record<PluginType, string[]> {
    if (type) {
      const typeMap = this.plugins.get(type);
      return typeMap ? Array.from(typeMap.keys()) : [];
    }

    const result: Record<PluginType, string[]> = {
      provider: [],
      gate: [],
      judge: [],
      source: [],
      hook: [],
    };

    for (const [t, typeMap] of this.plugins) {
      result[t] = Array.from(typeMap.keys());
    }

    return result;
  }

  /**
   * Get plugin metadata
   */
  getMetadata(type: PluginType, name: string): PluginMetadata | undefined {
    return this.get(type, name)?.metadata;
  }

  /**
   * Get all plugin metadata of a type
   */
  getAllMetadata(type: PluginType): PluginMetadata[] {
    return this.getAll(type).map(p => p.metadata);
  }

  /**
   * Activate a plugin (call onActivate hook)
   */
  async activate(type: PluginType, name: string): Promise<boolean> {
    const typeMap = this.plugins.get(type);
    if (!typeMap) {
      return false;
    }

    const registration = typeMap.get(name);
    if (!registration || registration.activated) {
      return false;
    }

    if (registration.plugin.onActivate) {
      await registration.plugin.onActivate();
    }

    registration.activated = true;
    return true;
  }

  /**
   * Deactivate a plugin (call onDeactivate hook)
   */
  async deactivate(type: PluginType, name: string): Promise<boolean> {
    const typeMap = this.plugins.get(type);
    if (!typeMap) {
      return false;
    }

    const registration = typeMap.get(name);
    if (!registration || !registration.activated) {
      return false;
    }

    if (registration.plugin.onDeactivate) {
      await registration.plugin.onDeactivate();
    }

    registration.activated = false;
    return true;
  }

  /**
   * Activate all plugins of a type
   */
  async activateAll(type: PluginType): Promise<void> {
    const names = this.list(type);
    for (const name of names) {
      await this.activate(type, name);
    }
  }

  /**
   * Deactivate all plugins of a type
   */
  async deactivateAll(type: PluginType): Promise<void> {
    const names = this.list(type);
    for (const name of names) {
      await this.deactivate(type, name);
    }
  }

  /**
   * Clear all registered plugins
   * Useful for testing
   */
  async clear(): Promise<void> {
    for (const [type, typeMap] of this.plugins) {
      for (const [name, registration] of typeMap) {
        if (registration.activated && registration.plugin.onDeactivate) {
          await registration.plugin.onDeactivate();
        }
      }
      typeMap.clear();
    }
    this.initialized = false;
  }

  /**
   * Get count of plugins by type
   */
  count(): Record<PluginType, number>;
  count(type: PluginType): number;
  count(type?: PluginType): number | Record<PluginType, number> {
    if (type) {
      return this.plugins.get(type)?.size ?? 0;
    }

    const result: Record<PluginType, number> = {
      provider: 0,
      gate: 0,
      judge: 0,
      source: 0,
      hook: 0,
    };

    for (const [t, typeMap] of this.plugins) {
      result[t] = typeMap.size;
    }

    return result;
  }

  /**
   * Check if registry has been initialized with built-in plugins
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Mark registry as initialized
   */
  markInitialized(): void {
    this.initialized = true;
  }
}

// ============================================================================
// Global Registry Instance
// ============================================================================

/**
 * Global plugin registry instance
 * This is the single source of truth for all registered plugins
 */
export const registry = new PluginRegistry();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Register a built-in plugin
 * Built-in plugins are marked and cannot be unregistered
 * Note: The plugin should already have `builtin: true` in its definition
 */
export async function registerBuiltin<T extends Plugin>(
  type: PluginType,
  plugin: T
): Promise<void> {
  await registry.register(type, plugin);
}

/**
 * Get or throw - get a plugin or throw if not found
 */
export function getOrThrow<T extends Plugin>(type: PluginType, name: string): T {
  const plugin = registry.get<T>(type, name);
  if (!plugin) {
    throw new Error(`Plugin not found: ${type}/${name}`);
  }
  return plugin;
}
