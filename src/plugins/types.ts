/**
 * Base plugin types for the Ralph plugin system
 */

// ============================================================================
// Plugin Metadata
// ============================================================================

export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
}

// ============================================================================
// Plugin Types
// ============================================================================

export type PluginType = 'provider' | 'gate' | 'judge' | 'source' | 'hook';

// ============================================================================
// Base Plugin Interface
// ============================================================================

/**
 * Base interface for all plugins
 * All plugin types extend this interface
 */
export interface Plugin {
  /** Plugin metadata - name, version, description */
  readonly metadata: PluginMetadata;

  /** Called when plugin is registered with the registry */
  onRegister?(): Promise<void>;

  /** Called when plugin is activated for use */
  onActivate?(): Promise<void>;

  /** Called when plugin is deactivated */
  onDeactivate?(): Promise<void>;
}

// ============================================================================
// Plugin Registration
// ============================================================================

export interface PluginRegistration<T extends Plugin = Plugin> {
  type: PluginType;
  plugin: T;
  activated: boolean;
  registeredAt: string;
}

// ============================================================================
// Plugin Discovery
// ============================================================================

export interface PluginDiscoveryOptions {
  /** Directories to search for plugins */
  directories?: string[];

  /** Glob patterns to match plugin files */
  patterns?: string[];

  /** Whether to recursively search directories */
  recursive?: boolean;
}

export interface DiscoveredPlugin {
  path: string;
  type: PluginType;
  metadata: PluginMetadata;
}

// ============================================================================
// Plugin Loader
// ============================================================================

export interface PluginLoader {
  /**
   * Discover plugins in specified locations
   */
  discover(options?: PluginDiscoveryOptions): Promise<DiscoveredPlugin[]>;

  /**
   * Load a plugin from a file path
   */
  load(path: string): Promise<Plugin>;

  /**
   * Load all plugins from a directory
   */
  loadDirectory(directory: string): Promise<Plugin[]>;
}

// ============================================================================
// Built-in Plugin Markers
// ============================================================================

/**
 * Marker for built-in plugins
 * Built-in plugins are loaded automatically and cannot be unregistered
 */
export interface BuiltinMarker {
  readonly builtin: true;
}

/**
 * Check if a plugin is a built-in plugin
 */
export function isBuiltinPlugin(plugin: Plugin): boolean {
  return 'builtin' in plugin && (plugin as Plugin & BuiltinMarker).builtin === true;
}
