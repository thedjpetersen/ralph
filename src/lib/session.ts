/**
 * Session Manager - handles session persistence and resume
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { logger } from './logger.js';
import type { RalphConfig } from './config.js';
import type { ValidationResult } from './validation/validation.types.js';

export type SessionStatus = 'running' | 'completed' | 'crashed' | 'aborted';

export interface SessionTask {
  prdFile: string;
  taskId: string;
  taskName: string;
  startedAt: string;
}

export interface CompletedTask {
  taskId: string;
  taskName: string;
  prdFile: string;
  duration: number;
  commitHash?: string;
  validationResult?: ValidationResult;
  completedAt: string;
}

export interface WorkerStateSnapshot {
  id: number;
  status: string;
  currentTaskId?: string;
  completedTasks: string[];
}

export interface SessionState {
  sessionId: string;
  version: '1.0.0';
  config: {
    model: 'opus' | 'sonnet';
    prdFile: string;
    iterations: number;
    filterCategory?: string;
    filterPriority?: string;
  };
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
  currentIteration: number;
  completedTaskCount: number;
  currentTask?: SessionTask;
  completedTasks: CompletedTask[];
  status: SessionStatus;
  gitState: {
    branch: string;
    commitHash: string;
  };
  lastError?: {
    message: string;
    stack?: string;
    timestamp: string;
  };
  // Factory mode fields
  mode?: 'sequential' | 'factory';
  workers?: WorkerStateSnapshot[];
  activeTasks?: Record<string, string>;  // taskId -> workerId
}

export interface SessionIndex {
  activeSession?: string;
  sessions: Array<{
    sessionId: string;
    startedAt: string;
    status: SessionStatus;
    taskCount: number;
  }>;
}

/**
 * Session Manager class
 */
export class SessionManager {
  private sessionDir: string;
  private indexPath: string;
  private currentSession: SessionState | null = null;

  constructor(sessionDir: string) {
    this.sessionDir = sessionDir;
    this.indexPath = join(sessionDir, 'index.json');
    this.ensureSessionDir();
  }

  private ensureSessionDir(): void {
    if (!existsSync(this.sessionDir)) {
      mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  private loadIndex(): SessionIndex {
    if (!existsSync(this.indexPath)) {
      return { sessions: [] };
    }

    try {
      const content = readFileSync(this.indexPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { sessions: [] };
    }
  }

  private saveIndex(index: SessionIndex): void {
    writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
  }

  private getSessionPath(sessionId: string): string {
    return join(this.sessionDir, `${sessionId}.json`);
  }

  /**
   * Create a new session
   */
  async createSession(config: RalphConfig, iterations: number, gitBranch: string, gitCommit: string): Promise<string> {
    const index = this.loadIndex();

    // Check for existing active session
    if (index.activeSession) {
      const activeSession = this.loadSession(index.activeSession);
      if (activeSession && activeSession.status === 'running') {
        logger.warning(`Existing active session found: ${index.activeSession}`);
        logger.info('Use "ralph resume" to continue or "ralph abort" to cancel');
      }
    }

    const sessionId = randomUUID().substring(0, 8);
    const now = new Date().toISOString();

    const session: SessionState = {
      sessionId,
      version: '1.0.0',
      config: {
        model: config.model,
        prdFile: config.prdFile,
        iterations,
        filterCategory: config.filterCategory || undefined,
        filterPriority: config.filterPriority || undefined,
      },
      startedAt: now,
      lastActivityAt: now,
      currentIteration: 0,
      completedTaskCount: 0,
      completedTasks: [],
      status: 'running',
      gitState: {
        branch: gitBranch,
        commitHash: gitCommit,
      },
    };

    // Save session
    this.saveSession(session);
    this.currentSession = session;

    // Update index
    index.activeSession = sessionId;
    index.sessions.unshift({
      sessionId,
      startedAt: now,
      status: 'running',
      taskCount: 0,
    });
    this.saveIndex(index);

    logger.info(`Created session: ${sessionId}`);
    return sessionId;
  }

  /**
   * Load a session by ID
   */
  loadSession(sessionId: string): SessionState | null {
    const path = this.getSessionPath(sessionId);

    if (!existsSync(path)) {
      return null;
    }

    try {
      const content = readFileSync(path, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`Failed to load session: ${sessionId}`, error);
      return null;
    }
  }

  /**
   * Save session state
   */
  saveSession(session: SessionState): void {
    const path = this.getSessionPath(session.sessionId);
    writeFileSync(path, JSON.stringify(session, null, 2));
  }

  /**
   * Update current session before starting a task
   */
  startTask(task: SessionTask): void {
    if (!this.currentSession) return;

    this.currentSession.currentTask = task;
    this.currentSession.currentIteration++;
    this.currentSession.lastActivityAt = new Date().toISOString();

    this.saveSession(this.currentSession);
  }

  /**
   * Update current session after completing a task
   */
  completeTask(task: CompletedTask): void {
    if (!this.currentSession) return;

    this.currentSession.currentTask = undefined;
    this.currentSession.completedTaskCount++;
    this.currentSession.completedTasks.push(task);
    this.currentSession.lastActivityAt = new Date().toISOString();

    this.saveSession(this.currentSession);

    // Update index
    const index = this.loadIndex();
    const indexEntry = index.sessions.find(s => s.sessionId === this.currentSession!.sessionId);
    if (indexEntry) {
      indexEntry.taskCount = this.currentSession.completedTaskCount;
    }
    this.saveIndex(index);
  }

  /**
   * Mark session as completed
   */
  completeSession(): void {
    if (!this.currentSession) return;

    this.currentSession.status = 'completed';
    this.currentSession.completedAt = new Date().toISOString();
    this.currentSession.lastActivityAt = new Date().toISOString();
    this.currentSession.currentTask = undefined;

    this.saveSession(this.currentSession);

    // Update index
    const index = this.loadIndex();
    index.activeSession = undefined;
    const indexEntry = index.sessions.find(s => s.sessionId === this.currentSession!.sessionId);
    if (indexEntry) {
      indexEntry.status = 'completed';
      indexEntry.taskCount = this.currentSession.completedTaskCount;
    }
    this.saveIndex(index);

    logger.success(`Session ${this.currentSession.sessionId} completed`);
    this.currentSession = null;
  }

  /**
   * Mark session as crashed with error
   */
  markCrashed(error: Error): void {
    if (!this.currentSession) return;

    this.currentSession.status = 'crashed';
    this.currentSession.lastActivityAt = new Date().toISOString();
    this.currentSession.lastError = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    this.saveSession(this.currentSession);

    // Update index
    const index = this.loadIndex();
    const indexEntry = index.sessions.find(s => s.sessionId === this.currentSession!.sessionId);
    if (indexEntry) {
      indexEntry.status = 'crashed';
    }
    this.saveIndex(index);

    logger.error(`Session ${this.currentSession.sessionId} crashed`);
  }

  /**
   * Abort session
   */
  abortSession(sessionId?: string): boolean {
    const index = this.loadIndex();
    const targetId = sessionId || index.activeSession;

    if (!targetId) {
      logger.error('No active session to abort');
      return false;
    }

    const session = this.loadSession(targetId);
    if (!session) {
      logger.error(`Session not found: ${targetId}`);
      return false;
    }

    session.status = 'aborted';
    session.lastActivityAt = new Date().toISOString();
    session.currentTask = undefined;

    this.saveSession(session);

    // Update index
    index.activeSession = undefined;
    const indexEntry = index.sessions.find(s => s.sessionId === targetId);
    if (indexEntry) {
      indexEntry.status = 'aborted';
    }
    this.saveIndex(index);

    logger.info(`Session ${targetId} aborted`);
    return true;
  }

  /**
   * Get the current session
   */
  getCurrentSession(): SessionState | null {
    return this.currentSession;
  }

  /**
   * Set the current session (for resume)
   */
  setCurrentSession(session: SessionState): void {
    this.currentSession = session;
    session.status = 'running';
    session.lastActivityAt = new Date().toISOString();
    this.saveSession(session);

    // Update index
    const index = this.loadIndex();
    index.activeSession = session.sessionId;
    const indexEntry = index.sessions.find(s => s.sessionId === session.sessionId);
    if (indexEntry) {
      indexEntry.status = 'running';
    }
    this.saveIndex(index);
  }

  /**
   * Get active session
   */
  getActiveSession(): SessionState | null {
    const index = this.loadIndex();
    if (!index.activeSession) return null;
    return this.loadSession(index.activeSession);
  }

  /**
   * List all sessions
   */
  listSessions(): Array<{
    sessionId: string;
    startedAt: string;
    status: SessionStatus;
    taskCount: number;
    currentTask?: string;
  }> {
    const index = this.loadIndex();

    return index.sessions.map(s => {
      const session = this.loadSession(s.sessionId);
      return {
        ...s,
        currentTask: session?.currentTask?.taskName,
      };
    });
  }

  /**
   * Cleanup old sessions (older than days)
   */
  cleanup(days: number = 7): number {
    const index = this.loadIndex();
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    let removed = 0;

    const toKeep = index.sessions.filter(s => {
      const sessionDate = new Date(s.startedAt).getTime();
      if (sessionDate < cutoff && s.status !== 'running') {
        // Delete session file
        const path = this.getSessionPath(s.sessionId);
        if (existsSync(path)) {
          unlinkSync(path);
        }
        removed++;
        return false;
      }
      return true;
    });

    index.sessions = toKeep;
    this.saveIndex(index);

    logger.info(`Cleaned up ${removed} old sessions`);
    return removed;
  }

  /**
   * Get orphaned task from crashed session
   */
  getOrphanedTask(sessionId: string): SessionTask | undefined {
    const session = this.loadSession(sessionId);
    if (!session) return undefined;

    if (session.status === 'crashed' && session.currentTask) {
      return session.currentTask;
    }

    return undefined;
  }
}

/**
 * Create a session manager instance
 */
export function createSessionManager(config: RalphConfig): SessionManager {
  return new SessionManager(config.sessionDir);
}
