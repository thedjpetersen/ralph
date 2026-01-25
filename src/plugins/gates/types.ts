/**
 * Gate Plugin Types
 * Defines interfaces for validation gate plugins
 */

import type { Plugin, PluginMetadata, BuiltinMarker } from '../types.js';
import type { ExecutionContext } from '../../core/context.js';
import type { GateResult, GateType, Package } from '../../core/types.js';

// ============================================================================
// Gate Metadata
// ============================================================================

export interface GatePluginMetadata extends PluginMetadata {
  /** Gate type identifier */
  gateType: GateType;

  /** Packages this gate supports */
  supportedPackages: Package[];

  /** Priority for execution order (lower runs first) */
  priority: number;
}

// ============================================================================
// Gate Run Options
// ============================================================================

export interface GateRunOptions {
  projectRoot: string;
  packageName: Package;
  timeout?: number;
  taskNotes?: string;
}

// ============================================================================
// Gate Plugin Interface
// ============================================================================

export interface GatePlugin extends Plugin {
  metadata: GatePluginMetadata;

  /**
   * Check if this gate applies to a package
   */
  appliesTo(packageName: Package): boolean;

  /**
   * Get the command to run for a package
   * Returns undefined if no command for this package
   */
  getCommand(packageName: Package): string | undefined;

  /**
   * Run the gate validation
   */
  run(ctx: ExecutionContext, options: GateRunOptions): Promise<GateResult>;

  /**
   * Parse command output to determine pass/fail
   */
  parseOutput(output: string, exitCode: number): { passed: boolean; errorSummary?: string };
}

// ============================================================================
// Built-in Gate Plugin
// ============================================================================

export interface BuiltinGatePlugin extends GatePlugin, BuiltinMarker {}

// ============================================================================
// Gate Commands Configuration
// ============================================================================

/**
 * Commands for each gate type per package
 */
export type GateCommandsConfig = Record<Package, Partial<Record<GateType, string>>>;

// ============================================================================
// Type Guards
// ============================================================================

export function isGatePlugin(plugin: Plugin): plugin is GatePlugin {
  return 'gateType' in (plugin.metadata as GatePluginMetadata) && 'appliesTo' in plugin;
}
