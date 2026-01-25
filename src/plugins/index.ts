/**
 * Plugins Module
 * Central export for the Ralph plugin system
 */

// Core plugin infrastructure
export * from './types.js';
export { registry, PluginRegistry, registerBuiltin, getOrThrow } from './registry.js';

// Provider plugins
export {
  registerProviderPlugins,
  getProvider,
  getAllProviders,
  isProviderAvailable,
  listProviders,
  isValidProvider,
  isValidClaudeModel,
  isValidGeminiModel,
  isValidCursorMode,
  claudeProvider,
  geminiProvider,
  cursorProvider,
} from './providers/index.js';
export type {
  ProviderPlugin,
  ProviderPluginMetadata,
  StreamState,
  ClaudeProviderOptions,
  GeminiProviderOptions,
  CursorProviderOptions,
  ResolvedProviderConfig,
} from './providers/types.js';

// Gate plugins
export {
  registerGatePlugins,
  getGate,
  getAllGates,
  getGatesByPriority,
  getGatesForPackage,
  listGates,
  getGateByType,
  isGateEnabled,
  getEnabledGatesForPackage,
  oxlintGate,
  buildGate,
  testGate,
  lintGate,
  customGate,
} from './gates/index.js';
export type {
  GatePlugin,
  GatePluginMetadata,
  GateRunOptions,
  GateCommandsConfig,
} from './gates/types.js';

// Judge plugins
export {
  registerJudgePlugins,
  getJudge,
  getAllJudges,
  listJudges,
  getJudgeByPersona,
  runJudges,
  requiresJudge,
  getJudgeCount,
  getRequiredJudges,
  aggregateJudgeResults,
  getPersonaDefinition,
  getPersonaSystemPrompt,
  getPersonaCriteria,
  BUILTIN_PERSONAS,
  qaEngineerJudge,
  securityAuditorJudge,
  uxDesignerJudge,
  softwareArchitectJudge,
  performanceEngineerJudge,
} from './judges/index.js';
export type {
  JudgePlugin,
  JudgePluginMetadata,
  JudgeEvaluationOptions,
  JudgeContextInput,
  PersonaDefinition,
} from './judges/types.js';

// Source plugins
export {
  registerSourcePlugins,
  getSource,
  getAllSources,
  listSources,
  getDefaultSource,
  prdFileSource,
  createTaskDAG,
  getExecutionOrder,
  findParallelGroups,
} from './sources/index.js';
export type {
  TaskSourcePlugin,
  TaskSourcePluginMetadata,
  TaskDAG,
  DagValidationResult,
  TaskSummary,
  PrdFileData,
  PrdFileMetadata,
} from './sources/types.js';

// Hook plugins
export {
  registerHookPlugins,
  registerHook,
  unregisterHook,
  getHook,
  getAllHooks,
  listHooks,
  registerExternalHooks,
  initializeEventEmitter,
  emit,
  emitBlocking,
  on,
  off,
  eventEmitter,
  createExternalHook,
  createClaudeCodeHooks,
} from './hooks/index.js';
export type {
  HookPlugin,
  HookPluginMetadata,
  HookRegistration,
  ExternalHookConfig,
} from './hooks/types.js';
