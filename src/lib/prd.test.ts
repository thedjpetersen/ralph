import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFileSync } from 'fs';
import {
  loadPrdFile,
  loadAllPrdFiles,
  getNextTask,
  markTaskComplete,
  markTaskInProgress,
  resetTaskStatus,
  getOrphanedTasks,
  getTaskSummary,
  formatTaskForPrompt,
  popTask,
  PrdFile,
  PrdItem,
} from './prd.js';

describe('prd', () => {
  let testDir: string;

  beforeEach(() => {
    // Use crypto.randomUUID for uniqueness across parallel test runs
    testDir = join(tmpdir(), `ralph-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch (_e) {
      // Ignore cleanup errors - OS will clean temp dir
    }
  });

  const createTestPrdFile = (filename: string, items: Partial<PrdItem>[]): string => {
    const filepath = join(testDir, filename);
    const data = {
      items: items.map((item, i) => ({
        id: `task-${i + 1}`,
        description: `Test task ${i + 1}`,
        priority: 'medium' as const,
        status: 'pending' as const,
        ...item,
      })),
      metadata: {
        version: '1.0',
        created_at: new Date().toISOString(),
      },
    };
    writeFileSync(filepath, JSON.stringify(data, null, 2));
    return filepath;
  };

  describe('loadPrdFile', () => {
    it('should load a valid PRD file', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', description: 'Test task', priority: 'high' },
      ]);

      const prd = loadPrdFile(filepath);
      expect(prd).not.toBeNull();
      expect(prd?.items).toHaveLength(1);
      expect(prd?.items[0].id).toBe('task-1');
      expect(prd?.category).toBe('test');
    });

    it('should return null for non-existent file', () => {
      const prd = loadPrdFile('/non/existent/file.json');
      expect(prd).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const filepath = join(testDir, 'invalid.json');
      writeFileSync(filepath, 'not valid json');
      const prd = loadPrdFile(filepath);
      expect(prd).toBeNull();
    });
  });

  describe('loadAllPrdFiles', () => {
    it('should load all PRD files in directory', () => {
      createTestPrdFile('prd1.json', [{ id: 'task-1' }]);
      createTestPrdFile('prd2.json', [{ id: 'task-2' }]);

      const prdFiles = loadAllPrdFiles(testDir);
      expect(prdFiles).toHaveLength(2);
    });

    it('should ignore non-json files', () => {
      createTestPrdFile('prd.json', [{ id: 'task-1' }]);
      writeFileSync(join(testDir, 'readme.md'), '# Readme');

      const prdFiles = loadAllPrdFiles(testDir);
      expect(prdFiles).toHaveLength(1);
    });

    it('should return empty array for non-existent directory', () => {
      const prdFiles = loadAllPrdFiles('/non/existent/dir');
      expect(prdFiles).toEqual([]);
    });
  });

  describe('getNextTask', () => {
    it('should return highest priority pending task', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'low-task', priority: 'low', status: 'pending' },
        { id: 'high-task', priority: 'high', status: 'pending' },
        { id: 'medium-task', priority: 'medium', status: 'pending' },
      ]);
      const prdFiles = [loadPrdFile(filepath)!];

      const next = getNextTask(prdFiles);
      expect(next?.item.id).toBe('high-task');
    });

    it('should skip completed tasks', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'completed', priority: 'high', status: 'completed' },
        { id: 'pending', priority: 'medium', status: 'pending' },
      ]);
      const prdFiles = [loadPrdFile(filepath)!];

      const next = getNextTask(prdFiles);
      expect(next?.item.id).toBe('pending');
    });

    it('should return null when no tasks pending', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', status: 'completed' },
        { id: 'task-2', status: 'completed' },
      ]);
      const prdFiles = [loadPrdFile(filepath)!];

      const next = getNextTask(prdFiles);
      expect(next).toBeNull();
    });

    it('should filter by category', () => {
      const filepath1 = createTestPrdFile('frontend.json', [
        { id: 'frontend-task', priority: 'high' },
      ]);
      const filepath2 = createTestPrdFile('backend.json', [
        { id: 'backend-task', priority: 'high' },
      ]);
      const prdFiles = [loadPrdFile(filepath1)!, loadPrdFile(filepath2)!];

      const next = getNextTask(prdFiles, { filterCategory: 'backend' });
      expect(next?.item.id).toBe('backend-task');
    });

    it('should filter by priority', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'high-task', priority: 'high' },
        { id: 'low-task', priority: 'low' },
      ]);
      const prdFiles = [loadPrdFile(filepath)!];

      const next = getNextTask(prdFiles, { filterPriority: 'low' });
      expect(next?.item.id).toBe('low-task');
    });

    it('should respect task dependencies', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', priority: 'high', status: 'pending' },
        { id: 'task-2', priority: 'high', status: 'pending', dependencies: ['task-1'] },
      ]);
      const prdFiles = [loadPrdFile(filepath)!];

      // task-2 depends on task-1, so task-1 should be next
      const next = getNextTask(prdFiles);
      expect(next?.item.id).toBe('task-1');
    });

    it('should handle passes field for completion', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', priority: 'high', passes: true },
        { id: 'task-2', priority: 'high', passes: false },
      ]);
      const prdFiles = [loadPrdFile(filepath)!];

      const next = getNextTask(prdFiles);
      expect(next?.item.id).toBe('task-2');
    });
  });

  describe('markTaskComplete', () => {
    it('should mark task as completed', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', status: 'in_progress' },
      ]);
      const prd = loadPrdFile(filepath)!;

      const result = markTaskComplete(prd, 'task-1');
      expect(result).toBe(true);
      expect(prd.items[0].status).toBe('completed');
      expect(prd.items[0].passes).toBe(true);
      expect(prd.items[0].completed_at).toBeDefined();
    });

    it('should store validation results', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', status: 'in_progress' },
      ]);
      const prd = loadPrdFile(filepath)!;

      const validationResults = {
        last_run: new Date().toISOString(),
        passed: true,
        failed_gates: [],
        attempts: 1,
        gates: [],
      };

      markTaskComplete(prd, 'task-1', { validationResults });
      expect(prd.items[0].validation_results).toEqual(validationResults);
    });

    it('should return false for non-existent task', () => {
      const filepath = createTestPrdFile('test.json', [{ id: 'task-1' }]);
      const prd = loadPrdFile(filepath)!;

      const result = markTaskComplete(prd, 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('markTaskInProgress', () => {
    it('should mark task as in_progress', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', status: 'pending' },
      ]);
      const prd = loadPrdFile(filepath)!;

      const result = markTaskInProgress(prd, 'task-1');
      expect(result).toBe(true);
      expect(prd.items[0].status).toBe('in_progress');
    });
  });

  describe('resetTaskStatus', () => {
    it('should reset in_progress task to pending', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', status: 'in_progress' },
      ]);
      const prd = loadPrdFile(filepath)!;

      const result = resetTaskStatus(prd, 'task-1');
      expect(result).toBe(true);
      expect(prd.items[0].status).toBe('pending');
    });

    it('should not reset completed tasks', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', status: 'completed' },
      ]);
      const prd = loadPrdFile(filepath)!;

      const result = resetTaskStatus(prd, 'task-1');
      expect(result).toBe(false);
      expect(prd.items[0].status).toBe('completed');
    });

    it('should not reset pending tasks', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', status: 'pending' },
      ]);
      const prd = loadPrdFile(filepath)!;

      const result = resetTaskStatus(prd, 'task-1');
      expect(result).toBe(false);
    });
  });

  describe('getOrphanedTasks', () => {
    it('should find in_progress tasks', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', status: 'in_progress' },
        { id: 'task-2', status: 'pending' },
        { id: 'task-3', status: 'completed' },
      ]);
      const prdFiles = [loadPrdFile(filepath)!];

      const orphaned = getOrphanedTasks(prdFiles);
      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].item.id).toBe('task-1');
    });

    it('should return empty array when no orphaned tasks', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', status: 'pending' },
        { id: 'task-2', status: 'completed' },
      ]);
      const prdFiles = [loadPrdFile(filepath)!];

      const orphaned = getOrphanedTasks(prdFiles);
      expect(orphaned).toHaveLength(0);
    });
  });

  describe('getTaskSummary', () => {
    it('should calculate correct counts', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', status: 'pending' },
        { id: 'task-2', status: 'in_progress' },
        { id: 'task-3', status: 'completed' },
        { id: 'task-4', status: 'completed' },
      ]);
      const prdFiles = [loadPrdFile(filepath)!];

      const summary = getTaskSummary(prdFiles);
      expect(summary.total).toBe(4);
      expect(summary.pending).toBe(1);
      expect(summary.inProgress).toBe(1);
      expect(summary.completed).toBe(2);
    });

    it('should calculate by category', () => {
      const filepath1 = createTestPrdFile('frontend.json', [
        { id: 'task-1', status: 'pending' },
        { id: 'task-2', status: 'completed' },
      ]);
      const filepath2 = createTestPrdFile('backend.json', [
        { id: 'task-3', status: 'completed' },
      ]);
      const prdFiles = [loadPrdFile(filepath1)!, loadPrdFile(filepath2)!];

      const summary = getTaskSummary(prdFiles);
      expect(summary.byCategory.frontend.pending).toBe(1);
      expect(summary.byCategory.frontend.completed).toBe(1);
      expect(summary.byCategory.backend.completed).toBe(1);
    });
  });

  describe('formatTaskForPrompt', () => {
    it('should format task with all fields', () => {
      const item: PrdItem = {
        id: 'task-123',
        name: 'Test Task',
        description: 'A detailed description',
        priority: 'high',
        acceptance_criteria: ['Criterion 1', 'Criterion 2'],
        notes: 'Some notes',
      };
      const prdFile = {
        filepath: '/test/file.json',
        filename: 'file.json',
        category: 'test-category',
        items: [item],
      };

      const formatted = formatTaskForPrompt(item, prdFile);
      expect(formatted).toContain('Test Task');
      expect(formatted).toContain('test-category');
      expect(formatted).toContain('high');
      expect(formatted).toContain('task-123');
      expect(formatted).toContain('A detailed description');
      expect(formatted).toContain('Criterion 1');
      expect(formatted).toContain('Criterion 2');
      expect(formatted).toContain('Some notes');
    });

    it('should use description as fallback for name', () => {
      const item: PrdItem = {
        id: 'task-123',
        description: 'Short description',
        priority: 'medium',
      };
      const prdFile = {
        filepath: '/test/file.json',
        filename: 'file.json',
        category: 'test',
        items: [item],
      };

      const formatted = formatTaskForPrompt(item, prdFile);
      expect(formatted).toContain('Short description');
    });

    it('should handle steps as alternative to acceptance_criteria', () => {
      const item: PrdItem = {
        id: 'task-123',
        description: 'Task',
        priority: 'low',
        steps: ['Step 1', 'Step 2'],
      };
      const prdFile = {
        filepath: '/test/file.json',
        filename: 'file.json',
        category: 'test',
        items: [item],
      };

      const formatted = formatTaskForPrompt(item, prdFile);
      expect(formatted).toContain('Step 1');
      expect(formatted).toContain('Step 2');
    });
  });

  describe('popTask', () => {
    it('should remove task from PRD file', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', description: 'First task' },
        { id: 'task-2', description: 'Second task' },
        { id: 'task-3', description: 'Third task' },
      ]);
      const prd = loadPrdFile(filepath)!;
      expect(prd.items).toHaveLength(3);

      const popped = popTask(prd, 'task-2');

      expect(popped).not.toBeNull();
      expect(popped!.id).toBe('task-2');
      expect(popped!.status).toBe('completed');
      expect(popped!.passes).toBe(true);
      expect(popped!.completed_at).toBeDefined();

      // Verify in-memory state
      expect(prd.items).toHaveLength(2);
      expect(prd.items.map(i => i.id)).toEqual(['task-1', 'task-3']);

      // Verify file was updated
      const reloaded = loadPrdFile(filepath)!;
      expect(reloaded.items).toHaveLength(2);
      expect(reloaded.items.map(i => i.id)).toEqual(['task-1', 'task-3']);
    });

    it('should return null for non-existent task', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', description: 'First task' },
      ]);
      const prd = loadPrdFile(filepath)!;

      const popped = popTask(prd, 'non-existent');

      expect(popped).toBeNull();
      expect(prd.items).toHaveLength(1);
    });

    it('should handle popping last task', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', description: 'Only task' },
      ]);
      const prd = loadPrdFile(filepath)!;

      const popped = popTask(prd, 'task-1');

      expect(popped).not.toBeNull();
      expect(prd.items).toHaveLength(0);

      // Verify file is valid with empty items array
      const reloaded = loadPrdFile(filepath)!;
      expect(reloaded.items).toHaveLength(0);
    });

    it('should archive task when archiveTo is provided', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', description: 'Task to archive' },
        { id: 'task-2', description: 'Another task' },
      ]);
      const prd = loadPrdFile(filepath)!;
      const archivePath = join(testDir, 'test-completed.json');

      popTask(prd, 'task-1', { archiveTo: archivePath });

      // Verify archive file was created
      expect(existsSync(archivePath)).toBe(true);
      const archiveContent = JSON.parse(readFileSync(archivePath, 'utf-8'));
      expect(archiveContent.items).toHaveLength(1);
      expect(archiveContent.items[0].id).toBe('task-1');
      expect(archiveContent.items[0].status).toBe('completed');
    });

    it('should append to existing archive file', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', description: 'First' },
        { id: 'task-2', description: 'Second' },
        { id: 'task-3', description: 'Third' },
      ]);
      const prd = loadPrdFile(filepath)!;
      const archivePath = join(testDir, 'archive.json');

      // Pop first task
      popTask(prd, 'task-1', { archiveTo: archivePath });

      // Pop second task
      popTask(prd, 'task-2', { archiveTo: archivePath });

      // Verify both are in archive
      const archiveContent = JSON.parse(readFileSync(archivePath, 'utf-8'));
      expect(archiveContent.items).toHaveLength(2);
      expect(archiveContent.items.map((i: PrdItem) => i.id)).toEqual(['task-1', 'task-2']);

      // Verify only third task remains in PRD
      expect(prd.items).toHaveLength(1);
      expect(prd.items[0].id).toBe('task-3');
    });

    it('should update metadata timestamp', () => {
      const filepath = createTestPrdFile('test.json', [
        { id: 'task-1', description: 'Task' },
      ]);
      const prd = loadPrdFile(filepath)!;
      const originalTimestamp = prd.metadata?.updated_at;

      // Wait a bit to ensure timestamp changes
      popTask(prd, 'task-1');

      const reloaded = loadPrdFile(filepath)!;
      expect(reloaded.metadata?.updated_at).toBeDefined();
      // The timestamp should be different (more recent)
      if (originalTimestamp) {
        expect(new Date(reloaded.metadata!.updated_at!).getTime())
          .toBeGreaterThanOrEqual(new Date(originalTimestamp).getTime());
      }
    });
  });
});
