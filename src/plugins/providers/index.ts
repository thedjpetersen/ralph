/**
 * Provider Plugins Index
 * Registers all built-in provider plugins
 */

import { registry, registerBuiltin } from '../registry.js';
import { claudeProvider } from './claude.js';
import { geminiProvider } from './gemini.js';
import { cursorProvider } from './cursor.js';
import type { ProviderPlugin } from './types.js';

// Re-export types
export * from './types.js';
export * from './base.js';

// Re-export provider instances
export { claudeProvider } from './claude.js';
export { geminiProvider } from './gemini.js';
export { cursorProvider } from './cursor.js';

// ============================================================================
// Provider Registration
// ============================================================================

/**
 * Register all built-in provider plugins
 */
export async function registerProviderPlugins(): Promise<void> {
  await registerBuiltin('provider', claudeProvider);
  await registerBuiltin('provider', geminiProvider);
  await registerBuiltin('provider', cursorProvider);
}

/**
 * Get a provider plugin by name
 */
export function getProvider(name: string): ProviderPlugin | undefined {
  return registry.get<ProviderPlugin>('provider', name);
}

/**
 * Get all registered provider plugins
 */
export function getAllProviders(): ProviderPlugin[] {
  return registry.getAll<ProviderPlugin>('provider');
}

/**
 * Check if a provider is available (CLI installed)
 */
export async function isProviderAvailable(name: string): Promise<boolean> {
  const provider = getProvider(name);
  if (!provider) return false;
  return provider.isAvailable();
}

/**
 * List all registered provider names
 */
export function listProviders(): string[] {
  return registry.list('provider');
}

// ============================================================================
// Provider Validation
// ============================================================================

const VALID_PROVIDERS = ['claude', 'gemini', 'cursor'] as const;
const VALID_CLAUDE_MODELS = ['opus', 'sonnet'] as const;
const VALID_GEMINI_MODELS = ['pro', 'flash'] as const;
const VALID_CURSOR_MODES = ['agent', 'plan', 'ask'] as const;

export type ValidProvider = typeof VALID_PROVIDERS[number];
export type ValidClaudeModel = typeof VALID_CLAUDE_MODELS[number];
export type ValidGeminiModel = typeof VALID_GEMINI_MODELS[number];
export type ValidCursorMode = typeof VALID_CURSOR_MODES[number];

export function isValidProvider(value: string): value is ValidProvider {
  return VALID_PROVIDERS.includes(value as ValidProvider);
}

export function isValidClaudeModel(value: string): value is ValidClaudeModel {
  return (VALID_CLAUDE_MODELS as readonly string[]).includes(value);
}

export function isValidGeminiModel(value: string): value is ValidGeminiModel {
  return (VALID_GEMINI_MODELS as readonly string[]).includes(value);
}

export function isValidCursorMode(value: string): value is ValidCursorMode {
  return (VALID_CURSOR_MODES as readonly string[]).includes(value);
}
