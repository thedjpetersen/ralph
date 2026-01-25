/**
 * Event definitions for the Ralph event system
 * Events are emitted throughout the execution lifecycle
 */

import type { Task, GateResult, JudgeResult, ProviderResult, ValidationResult } from './types.js';

// ============================================================================
// Event Definitions
// ============================================================================

/**
 * All Ralph events with their payload types
 */
export interface RalphEvents {
  // Session lifecycle
  'session:start': SessionStartEvent;
  'session:end': SessionEndEvent;
  'session:crash': SessionCrashEvent;

  // DAG events
  'dag:loaded': DagLoadedEvent;
  'dag:cycle-detected': DagCycleEvent;
  'task:unblocked': TaskUnblockedEvent;

  // Task lifecycle
  'task:start': TaskStartEvent;
  'task:complete': TaskCompleteEvent;
  'task:failed': TaskFailedEvent;
  'task:blocked': TaskBlockedEvent;

  // Provider events
  'provider:start': ProviderStartEvent;
  'provider:progress': ProviderProgressEvent;
  'provider:complete': ProviderCompleteEvent;

  // Validation events
  'validation:start': ValidationStartEvent;
  'validation:gate:start': ValidationGateStartEvent;
  'validation:gate:complete': ValidationGateCompleteEvent;
  'validation:complete': ValidationCompleteEvent;

  // Judge events
  'judge:start': JudgeStartEvent;
  'judge:persona:start': JudgePersonaStartEvent;
  'judge:persona:complete': JudgePersonaCompleteEvent;
  'judges:complete': JudgesCompleteEvent;

  // Git events
  'git:commit': GitCommitEvent;
  'git:stage': GitStageEvent;
}

// ============================================================================
// Session Events
// ============================================================================

export interface SessionStartEvent {
  sessionId: string;
  config: {
    provider: string;
    model: string;
    iterations: number;
  };
  pendingTasks: number;
  branch: string;
}

export interface SessionEndEvent {
  sessionId: string;
  completedTasks: number;
  totalIterations: number;
  duration: number;
}

export interface SessionCrashEvent {
  sessionId: string;
  error: string;
  taskId?: string;
}

// ============================================================================
// DAG Events
// ============================================================================

export interface DagLoadedEvent {
  totalTasks: number;
  readyTasks: number;
  blockedTasks: number;
  categories: string[];
}

export interface DagCycleEvent {
  cycle: string[];
  affectedTasks: string[];
}

export interface TaskUnblockedEvent {
  task: Task;
  unblockedBy: string;
}

// ============================================================================
// Task Events
// ============================================================================

export interface TaskStartEvent {
  task: Task;
  iteration: number;
  validationAttempt: number;
}

export interface TaskCompleteEvent {
  task: Task;
  result: ProviderResult;
  duration: number;
  commitHash?: string;
}

export interface TaskFailedEvent {
  task: Task;
  error: string;
  stage: 'provider' | 'validation' | 'judge';
}

export interface TaskBlockedEvent {
  task: Task;
  blockers: string[];
}

// ============================================================================
// Provider Events
// ============================================================================

export interface ProviderStartEvent {
  provider: string;
  model: string;
  taskId: string;
}

export interface ProviderProgressEvent {
  provider: string;
  taskId: string;
  eventCount: number;
  toolCounts: Record<string, number>;
  elapsed: number;
}

export interface ProviderCompleteEvent {
  provider: string;
  taskId: string;
  success: boolean;
  duration: number;
  toolsUsed: Record<string, number>;
  summary?: string;
}

// ============================================================================
// Validation Events
// ============================================================================

export interface ValidationStartEvent {
  taskId: string;
  gates: string[];
  packages: string[];
}

export interface ValidationGateStartEvent {
  gate: string;
  package: string;
  command: string;
}

export interface ValidationGateCompleteEvent {
  gate: string;
  package: string;
  result: GateResult;
}

export interface ValidationCompleteEvent {
  taskId: string;
  passed: boolean;
  results: ValidationResult;
}

// ============================================================================
// Judge Events
// ============================================================================

export interface JudgeStartEvent {
  taskId: string;
  judges: string[];
  parallel: boolean;
}

export interface JudgePersonaStartEvent {
  taskId: string;
  persona: string;
  model: string;
}

export interface JudgePersonaCompleteEvent {
  taskId: string;
  persona: string;
  result: JudgeResult;
}

export interface JudgesCompleteEvent {
  taskId: string;
  passed: boolean;
  overallScore: number;
  results: JudgeResult[];
  summary: string;
}

// ============================================================================
// Git Events
// ============================================================================

export interface GitCommitEvent {
  hash: string;
  message: string;
  taskId: string;
}

export interface GitStageEvent {
  files: string[];
  taskId: string;
}

// ============================================================================
// Event Emitter Interface
// ============================================================================

export type EventHandler<T> = (data: T) => void | Promise<void>;

export interface TypedEventEmitter {
  emit<K extends keyof RalphEvents>(event: K, data: RalphEvents[K]): void;
  on<K extends keyof RalphEvents>(event: K, handler: EventHandler<RalphEvents[K]>): void;
  off<K extends keyof RalphEvents>(event: K, handler: EventHandler<RalphEvents[K]>): void;
  once<K extends keyof RalphEvents>(event: K, handler: EventHandler<RalphEvents[K]>): void;
}

// ============================================================================
// Hook Decision (for blocking hooks)
// ============================================================================

export interface HookDecision {
  continue: boolean;
  reason?: string;
  modifiedData?: unknown;
}
