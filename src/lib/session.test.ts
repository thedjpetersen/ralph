import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SessionManager, createSessionManager } from './session.js';
import type { RalphConfig } from './config.js';

describe('SessionManager', () => {
  let testDir: string;
  let sessionManager: SessionManager;

  beforeEach(() => {
    testDir = join(tmpdir(), `ralph-session-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    sessionManager = new SessionManager(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  const createMockConfig = (): RalphConfig => ({
    projectRoot: '/test/project',
    scriptsDir: '/test/scripts',
    prdDir: '/test/prd',
    prdFile: '',
    notifyScript: '',
    captureScript: '',
    uploadScript: '',
    sessionDir: testDir,
    learningsFile: join(testDir, 'LEARNINGS.md'),
    maxIterations: 10,
    opusTokenLimit: 150000,
    sonnetTokenLimit: 50000,
    notifyEnabled: false,
    captureEnabled: false,
    captureVideo: false,
    captureTerminal: false,
    dryRun: false,
    verbose: false,
    quiet: true,
    noCommit: true,
    skipValidation: false,
    filterCategory: '',
    filterPriority: '',
    model: 'sonnet',
    providerConfig: {
      taskProvider: 'claude',
      validationProvider: undefined,
      claudeModel: 'sonnet',
      geminiModel: 'pro',
      cursorModel: 'claude-3-5-sonnet',
      cursorMode: 'agent',
    },
    validationGates: { oxlint: true, build: true, test: true, lint: true, custom: true },
    validationTimeout: 120000,
    validationFailFast: false,
    consumeMode: false,
    archiveCompleted: true,
    hooks: { enabled: false, stopValidation: true, postEditLint: true, autoApprove: true, maxContinuations: 5 },
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const config = createMockConfig();
      const sessionId = await sessionManager.createSession(
        config,
        5,
        'main',
        'abc123'
      );

      expect(sessionId).toBeDefined();
      expect(sessionId).toHaveLength(8);

      const session = sessionManager.loadSession(sessionId);
      expect(session).not.toBeNull();
      expect(session?.status).toBe('running');
      expect(session?.config.iterations).toBe(5);
    });

    it('should set the session as active', async () => {
      const config = createMockConfig();
      const sessionId = await sessionManager.createSession(
        config,
        5,
        'main',
        'abc123'
      );

      const active = sessionManager.getActiveSession();
      expect(active?.sessionId).toBe(sessionId);
    });

    it('should store git state', async () => {
      const config = createMockConfig();
      const sessionId = await sessionManager.createSession(
        config,
        5,
        'feature-branch',
        'def456'
      );

      const session = sessionManager.loadSession(sessionId);
      expect(session?.gitState.branch).toBe('feature-branch');
      expect(session?.gitState.commitHash).toBe('def456');
    });
  });

  describe('startTask', () => {
    it('should record current task', async () => {
      const config = createMockConfig();
      await sessionManager.createSession(config, 5, 'main', 'abc123');

      sessionManager.startTask({
        prdFile: '/test/prd/file.json',
        taskId: 'task-1',
        taskName: 'Test Task',
        startedAt: new Date().toISOString(),
      });

      const session = sessionManager.getCurrentSession();
      expect(session?.currentTask?.taskId).toBe('task-1');
      expect(session?.currentTask?.taskName).toBe('Test Task');
      expect(session?.currentIteration).toBe(1);
    });
  });

  describe('completeTask', () => {
    it('should clear current task and add to completed', async () => {
      const config = createMockConfig();
      await sessionManager.createSession(config, 5, 'main', 'abc123');

      sessionManager.startTask({
        prdFile: '/test/prd/file.json',
        taskId: 'task-1',
        taskName: 'Test Task',
        startedAt: new Date().toISOString(),
      });

      sessionManager.completeTask({
        taskId: 'task-1',
        taskName: 'Test Task',
        prdFile: '/test/prd/file.json',
        duration: 120,
        completedAt: new Date().toISOString(),
      });

      const session = sessionManager.getCurrentSession();
      expect(session?.currentTask).toBeUndefined();
      expect(session?.completedTaskCount).toBe(1);
      expect(session?.completedTasks).toHaveLength(1);
      expect(session?.completedTasks[0].taskId).toBe('task-1');
    });

    it('should track commit hash', async () => {
      const config = createMockConfig();
      await sessionManager.createSession(config, 5, 'main', 'abc123');

      sessionManager.completeTask({
        taskId: 'task-1',
        taskName: 'Test Task',
        prdFile: '/test/prd/file.json',
        duration: 120,
        commitHash: 'commit123',
        completedAt: new Date().toISOString(),
      });

      const session = sessionManager.getCurrentSession();
      expect(session?.completedTasks[0].commitHash).toBe('commit123');
    });
  });

  describe('completeSession', () => {
    it('should mark session as completed', async () => {
      const config = createMockConfig();
      const sessionId = await sessionManager.createSession(
        config,
        5,
        'main',
        'abc123'
      );

      sessionManager.completeSession();

      const session = sessionManager.loadSession(sessionId);
      expect(session?.status).toBe('completed');
      expect(session?.completedAt).toBeDefined();

      const active = sessionManager.getActiveSession();
      expect(active).toBeNull();
    });
  });

  describe('markCrashed', () => {
    it('should mark session as crashed with error', async () => {
      const config = createMockConfig();
      const sessionId = await sessionManager.createSession(
        config,
        5,
        'main',
        'abc123'
      );

      const error = new Error('Test error');
      sessionManager.markCrashed(error);

      const session = sessionManager.loadSession(sessionId);
      expect(session?.status).toBe('crashed');
      expect(session?.lastError?.message).toBe('Test error');
    });
  });

  describe('abortSession', () => {
    it('should abort active session', async () => {
      const config = createMockConfig();
      const sessionId = await sessionManager.createSession(
        config,
        5,
        'main',
        'abc123'
      );

      const result = sessionManager.abortSession();
      expect(result).toBe(true);

      const session = sessionManager.loadSession(sessionId);
      expect(session?.status).toBe('aborted');
    });

    it('should abort specific session by ID', async () => {
      const config = createMockConfig();
      const sessionId = await sessionManager.createSession(
        config,
        5,
        'main',
        'abc123'
      );

      const result = sessionManager.abortSession(sessionId);
      expect(result).toBe(true);
    });

    it('should return false if no active session', () => {
      const result = sessionManager.abortSession();
      expect(result).toBe(false);
    });
  });

  describe('listSessions', () => {
    it('should list all sessions', async () => {
      const config = createMockConfig();
      await sessionManager.createSession(config, 5, 'main', 'abc123');
      sessionManager.completeSession();

      await sessionManager.createSession(config, 3, 'feature', 'def456');

      const sessions = sessionManager.listSessions();
      expect(sessions).toHaveLength(2);
    });

    it('should include current task name', async () => {
      const config = createMockConfig();
      await sessionManager.createSession(config, 5, 'main', 'abc123');

      sessionManager.startTask({
        prdFile: '/test/prd/file.json',
        taskId: 'task-1',
        taskName: 'Current Task',
        startedAt: new Date().toISOString(),
      });

      const sessions = sessionManager.listSessions();
      expect(sessions[0].currentTask).toBe('Current Task');
    });
  });

  describe('cleanup', () => {
    it('should remove old sessions', async () => {
      const config = createMockConfig();
      const sessionId = await sessionManager.createSession(
        config,
        5,
        'main',
        'abc123'
      );
      sessionManager.completeSession();

      // Manually modify the session date to be old
      const session = sessionManager.loadSession(sessionId)!;
      session.startedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      // Save the session with modified date
      const sessionPath = join(testDir, `${sessionId}.json`);
      const { writeFileSync } = await import('fs');
      writeFileSync(sessionPath, JSON.stringify(session, null, 2));

      // Also update the index
      const indexPath = join(testDir, 'index.json');
      const indexContent = readFileSync(indexPath, 'utf-8');
      const index = JSON.parse(indexContent);
      const sessionEntry = index.sessions.find((s: { sessionId: string }) => s.sessionId === sessionId);
      if (sessionEntry) {
        sessionEntry.startedAt = session.startedAt;
      }
      writeFileSync(indexPath, JSON.stringify(index, null, 2));

      const removed = sessionManager.cleanup(7);
      expect(removed).toBe(1);

      const sessions = sessionManager.listSessions();
      expect(sessions).toHaveLength(0);
    });

    it('should not remove running sessions', async () => {
      const config = createMockConfig();
      await sessionManager.createSession(config, 5, 'main', 'abc123');

      const removed = sessionManager.cleanup(0);  // 0 days = remove all non-running
      expect(removed).toBe(0);
    });
  });

  describe('getOrphanedTask', () => {
    it('should return orphaned task from crashed session', async () => {
      const config = createMockConfig();
      const sessionId = await sessionManager.createSession(
        config,
        5,
        'main',
        'abc123'
      );

      sessionManager.startTask({
        prdFile: '/test/prd/file.json',
        taskId: 'task-1',
        taskName: 'Orphaned Task',
        startedAt: new Date().toISOString(),
      });

      sessionManager.markCrashed(new Error('Crash'));

      const orphaned = sessionManager.getOrphanedTask(sessionId);
      expect(orphaned?.taskId).toBe('task-1');
      expect(orphaned?.taskName).toBe('Orphaned Task');
    });

    it('should return undefined for completed sessions', async () => {
      const config = createMockConfig();
      const sessionId = await sessionManager.createSession(
        config,
        5,
        'main',
        'abc123'
      );
      sessionManager.completeSession();

      const orphaned = sessionManager.getOrphanedTask(sessionId);
      expect(orphaned).toBeUndefined();
    });
  });

  describe('setCurrentSession', () => {
    it('should set session as current for resume', async () => {
      const config = createMockConfig();
      const sessionId = await sessionManager.createSession(
        config,
        5,
        'main',
        'abc123'
      );
      sessionManager.markCrashed(new Error('Crash'));

      const session = sessionManager.loadSession(sessionId)!;
      sessionManager.setCurrentSession(session);

      expect(session.status).toBe('running');

      const active = sessionManager.getActiveSession();
      expect(active?.sessionId).toBe(sessionId);
    });
  });
});

describe('createSessionManager', () => {
  it('should create a session manager from config', () => {
    const testDir = join(tmpdir(), `ralph-test-${Date.now()}`);
    const config = {
      sessionDir: testDir,
    } as RalphConfig;

    const manager = createSessionManager(config);
    expect(manager).toBeInstanceOf(SessionManager);

    // Cleanup with retry for race conditions
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch (_e) {
      // Ignore cleanup errors - OS will clean temp dir
    }
  });
});
