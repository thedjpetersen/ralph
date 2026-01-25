/**
 * Execution context passed to all plugins
 * Contains configuration, state, and services needed during execution
 */

import type { AIProvider, ClaudeModel, GeminiModel, CursorMode, Package } from './types.js';

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ProviderConfig {
  taskProvider: AIProvider;
  claudeModel: ClaudeModel;
  geminiModel: GeminiModel;
  cursorModel: string;
  cursorMode: CursorMode;
}

// ============================================================================
// Validation Configuration
// ============================================================================

export interface ValidationGatesConfig {
  oxlint: boolean;
  build: boolean;
  test: boolean;
  lint: boolean;
  custom: boolean;
}

// ============================================================================
// Hooks Configuration
// ============================================================================

export interface HooksConfig {
  enabled: boolean;
  stopValidation: boolean;
  postEditLint: boolean;
  autoApprove: boolean;
  maxContinuations: number;
}

// ============================================================================
// Ralph Configuration (matching existing config.ts)
// ============================================================================

export interface RalphConfig {
  // Paths
  projectRoot: string;
  prdDir: string;
  prdFile?: string;
  scriptsDir: string;
  sessionDir: string;
  learningsFile: string;

  // Limits
  maxIterations: number;
  opusTokenLimit: number;
  sonnetTokenLimit: number;

  // Flags
  notifyEnabled: boolean;
  notifyScript?: string;
  dryRun: boolean;
  verbose: boolean;
  skipValidation: boolean;
  consumeMode: boolean;
  archiveCompleted?: boolean;
  noCommit: boolean;

  // Filters
  filterCategory?: string;
  filterPriority?: string;

  // Provider
  model: string;
  providerConfig: ProviderConfig;

  // Validation
  validationGates: ValidationGatesConfig;
  validationTimeout: number;
  validationFailFast: boolean;

  // Hooks
  hooks: HooksConfig;
}

// ============================================================================
// Execution Context
// ============================================================================

export interface ExecutionContext {
  // Configuration
  config: RalphConfig;

  // Current session
  sessionId: string;
  iteration: number;
  startTime: number;

  // Current task context
  currentTaskId?: string;
  targetPackages?: Package[];

  // Services (lazy-loaded)
  getLogger(): Logger;
  getNotifier(): Notifier;
  getSessionManager(): SessionManager;
  getLearningsManager(): LearningsManager;
  getEventEmitter(): EventEmitter;

  // Git operations
  git: GitOperations;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  success(message: string, ...args: unknown[]): void;
  warning(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  header(message: string): void;
  divider(): void;
}

export interface Notifier {
  sessionStarted(pending: number, model: string): Promise<void>;
  sessionCompleted(completed: number, total: number, duration: number): Promise<void>;
  taskFailed(taskName: string, iteration: number, error: string): Promise<void>;
  validationFailed(taskName: string, iteration: number, result: unknown): Promise<void>;
  judgeFailed(taskName: string, iteration: number, result: unknown): Promise<void>;
}

export interface SessionManager {
  createSession(config: RalphConfig, iterations: number, branch: string, commit: string): Promise<string>;
  startTask(task: TaskStartInfo): void;
  completeTask(task: TaskCompleteInfo): void;
  completeSession(): void;
  markCrashed(error: Error): void;
}

export interface TaskStartInfo {
  prdFile: string;
  taskId: string;
  taskName: string;
  startedAt: string;
}

export interface TaskCompleteInfo {
  taskId: string;
  taskName: string;
  prdFile: string;
  duration: number;
  commitHash?: string;
  validationResult?: unknown;
  completedAt: string;
}

export interface LearningsManager {
  logValidationFailure(taskId: string, result: unknown): void;
  processOutput(output: string, taskId: string): string[];
}

export interface EventEmitter {
  emit<K extends string>(event: K, data: unknown): void;
  on<K extends string>(event: K, handler: (data: unknown) => void): void;
  off<K extends string>(event: K, handler: (data: unknown) => void): void;
}

export interface GitOperations {
  getCurrentBranch(projectRoot: string): Promise<string>;
  getStatus(projectRoot: string): Promise<GitStatus>;
  getDiff(projectRoot: string, staged?: boolean): Promise<string>;
  stageAll(projectRoot: string): Promise<void>;
  commit(projectRoot: string, message: string): Promise<void>;
  getRecentCommits(projectRoot: string, count: number): Promise<string[]>;
}

export interface GitStatus {
  clean: boolean;
  branch: string;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
}

// ============================================================================
// Context Factory
// ============================================================================

export interface ContextFactory {
  createContext(config: RalphConfig, sessionId: string): ExecutionContext;
}
