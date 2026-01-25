/**
 * Gate Plugins Index
 * Registers all built-in gate plugins
 */

import { registry, registerBuiltin } from '../registry.js';
import { oxlintGate } from './oxlint.js';
import { buildGate } from './build.js';
import { testGate } from './test.js';
import { lintGate } from './lint.js';
import { customGate } from './custom.js';
import type { GatePlugin } from './types.js';
import type { GateType, Package } from '../../core/types.js';

// Re-export types
export * from './types.js';
export * from './base.js';

// Re-export gate instances
export { oxlintGate } from './oxlint.js';
export { buildGate } from './build.js';
export { testGate } from './test.js';
export { lintGate } from './lint.js';
export { customGate } from './custom.js';

// ============================================================================
// Gate Registration
// ============================================================================

/**
 * Register all built-in gate plugins
 */
export async function registerGatePlugins(): Promise<void> {
  await registerBuiltin('gate', oxlintGate);
  await registerBuiltin('gate', buildGate);
  await registerBuiltin('gate', testGate);
  await registerBuiltin('gate', lintGate);
  await registerBuiltin('gate', customGate);
}

/**
 * Get a gate plugin by name
 */
export function getGate(name: string): GatePlugin | undefined {
  return registry.get<GatePlugin>('gate', name);
}

/**
 * Get all registered gate plugins
 */
export function getAllGates(): GatePlugin[] {
  return registry.getAll<GatePlugin>('gate');
}

/**
 * Get gates sorted by priority
 */
export function getGatesByPriority(): GatePlugin[] {
  return getAllGates().sort((a, b) => a.metadata.priority - b.metadata.priority);
}

/**
 * Get gates that apply to a specific package
 */
export function getGatesForPackage(packageName: Package): GatePlugin[] {
  return getGatesByPriority().filter(gate => gate.appliesTo(packageName));
}

/**
 * List all registered gate names
 */
export function listGates(): string[] {
  return registry.list('gate');
}

// ============================================================================
// Gate Type Mapping
// ============================================================================

/**
 * Get gate plugin by gate type
 */
export function getGateByType(gateType: GateType): GatePlugin | undefined {
  const gates = getAllGates();
  return gates.find(g => g.metadata.gateType === gateType);
}

/**
 * Check if a gate type is enabled
 */
export function isGateEnabled(
  gateType: GateType,
  config: Record<GateType, boolean>
): boolean {
  return config[gateType] ?? false;
}

/**
 * Get enabled gates for a package
 */
export function getEnabledGatesForPackage(
  packageName: Package,
  config: Record<GateType, boolean>
): GatePlugin[] {
  return getGatesForPackage(packageName).filter(gate =>
    isGateEnabled(gate.metadata.gateType, config)
  );
}
