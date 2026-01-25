/**
 * DAG Utilities
 * Provides topological sorting, cycle detection, and DAG validation
 */

import type { Task } from '../../core/types.js';
import type { TaskDAG, DagValidationResult } from './types.js';

// ============================================================================
// Task DAG Implementation
// ============================================================================

export class TaskDAGImpl implements TaskDAG {
  private tasks: Map<string, Task>;
  private dependentsMap: Map<string, Set<string>>;

  constructor(tasks: Task[]) {
    this.tasks = new Map();
    this.dependentsMap = new Map();

    // Build task map
    for (const task of tasks) {
      this.tasks.set(task.id, task);
      this.dependentsMap.set(task.id, new Set());
    }

    // Build dependents map (reverse of dependencies)
    for (const task of tasks) {
      for (const depId of task.dependencies || []) {
        const dependents = this.dependentsMap.get(depId);
        if (dependents) {
          dependents.add(task.id);
        }
      }
    }
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTopologicalOrder(): Task[] {
    const result: Task[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (taskId: string): boolean => {
      if (temp.has(taskId)) {
        // Cycle detected
        return false;
      }
      if (visited.has(taskId)) {
        return true;
      }

      temp.add(taskId);
      const task = this.tasks.get(taskId);

      if (task) {
        for (const depId of task.dependencies || []) {
          if (!visit(depId)) {
            return false;
          }
        }

        temp.delete(taskId);
        visited.add(taskId);
        result.push(task);
      }

      return true;
    };

    for (const taskId of this.tasks.keys()) {
      if (!visited.has(taskId)) {
        visit(taskId);
      }
    }

    return result;
  }

  getReadyTasks(): Task[] {
    const ready: Task[] = [];

    for (const task of this.tasks.values()) {
      if (task.status === 'completed') continue;
      if (task.status === 'in_progress') continue;

      const isBlocked = this.isBlocked(task.id);
      if (!isBlocked) {
        ready.push(task);
      }
    }

    // Sort by priority
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return ready.sort((a, b) =>
      (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
    );
  }

  isBlocked(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return true;

    for (const depId of task.dependencies || []) {
      const dep = this.tasks.get(depId);
      if (!dep || dep.status !== 'completed') {
        return true;
      }
    }

    return false;
  }

  getBlockers(taskId: string): Task[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];

    const blockers: Task[] = [];
    for (const depId of task.dependencies || []) {
      const dep = this.tasks.get(depId);
      if (dep && dep.status !== 'completed') {
        blockers.push(dep);
      }
    }

    return blockers;
  }

  validate(): DagValidationResult {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycle: string[] = [];

    const detectCycle = (taskId: string, path: string[]): boolean => {
      visited.add(taskId);
      recStack.add(taskId);

      const task = this.tasks.get(taskId);
      if (task) {
        for (const depId of task.dependencies || []) {
          if (!this.tasks.has(depId)) {
            // Missing dependency - not a cycle but an error
            continue;
          }

          if (!visited.has(depId)) {
            if (detectCycle(depId, [...path, taskId])) {
              return true;
            }
          } else if (recStack.has(depId)) {
            // Cycle found
            cycle.push(...path, taskId, depId);
            return true;
          }
        }
      }

      recStack.delete(taskId);
      return false;
    };

    for (const taskId of this.tasks.keys()) {
      if (!visited.has(taskId)) {
        if (detectCycle(taskId, [])) {
          return { valid: false, cycle };
        }
      }
    }

    // Check for missing dependencies
    const errors: string[] = [];
    for (const task of this.tasks.values()) {
      for (const depId of task.dependencies || []) {
        if (!this.tasks.has(depId)) {
          errors.push(`Task "${task.id}" depends on missing task "${depId}"`);
        }
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }

  getCriticalPath(): Task[] {
    // Find the longest path in the DAG
    const memo = new Map<string, Task[]>();

    const getLongestPath = (taskId: string): Task[] => {
      if (memo.has(taskId)) {
        return memo.get(taskId)!;
      }

      const task = this.tasks.get(taskId);
      if (!task) return [];

      const deps = task.dependencies || [];
      if (deps.length === 0) {
        const path = [task];
        memo.set(taskId, path);
        return path;
      }

      let longestPath: Task[] = [];
      for (const depId of deps) {
        const depPath = getLongestPath(depId);
        if (depPath.length > longestPath.length) {
          longestPath = depPath;
        }
      }

      const path = [...longestPath, task];
      memo.set(taskId, path);
      return path;
    };

    // Find the task that leads to the longest path
    let criticalPath: Task[] = [];
    for (const taskId of this.tasks.keys()) {
      const path = getLongestPath(taskId);
      if (path.length > criticalPath.length) {
        criticalPath = path;
      }
    }

    return criticalPath;
  }

  getDependents(taskId: string): Task[] {
    const dependentIds = this.dependentsMap.get(taskId);
    if (!dependentIds) return [];

    return Array.from(dependentIds)
      .map(id => this.tasks.get(id))
      .filter((t): t is Task => t !== undefined);
  }

  markComplete(taskId: string): Task[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];

    task.status = 'completed';

    // Find newly unblocked tasks
    const unblocked: Task[] = [];
    const dependents = this.getDependents(taskId);

    for (const dependent of dependents) {
      if (dependent.status === 'completed') continue;
      if (dependent.status === 'in_progress') continue;

      // Check if all dependencies are now complete
      if (!this.isBlocked(dependent.id)) {
        unblocked.push(dependent);
      }
    }

    return unblocked;
  }
}

// ============================================================================
// DAG Factory
// ============================================================================

/**
 * Create a TaskDAG from an array of tasks
 */
export function createTaskDAG(tasks: Task[]): TaskDAG {
  return new TaskDAGImpl(tasks);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get tasks in execution order (topological with priority)
 */
export function getExecutionOrder(dag: TaskDAG): Task[] {
  const topoOrder = dag.getTopologicalOrder();
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

  // Group by dependency level
  const levels: Map<number, Task[]> = new Map();

  for (const task of topoOrder) {
    // Find the max level of dependencies
    let maxDepLevel = -1;
    for (const depId of task.dependencies || []) {
      for (const [level, tasks] of levels) {
        if (tasks.some(t => t.id === depId)) {
          maxDepLevel = Math.max(maxDepLevel, level);
        }
      }
    }

    const taskLevel = maxDepLevel + 1;
    if (!levels.has(taskLevel)) {
      levels.set(taskLevel, []);
    }
    levels.get(taskLevel)!.push(task);
  }

  // Sort each level by priority and flatten
  const result: Task[] = [];
  const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b);

  for (const level of sortedLevels) {
    const tasks = levels.get(level)!;
    tasks.sort((a, b) =>
      (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
    );
    result.push(...tasks);
  }

  return result;
}

/**
 * Find parallel execution opportunities
 * Returns groups of tasks that can be executed in parallel
 */
export function findParallelGroups(dag: TaskDAG): Task[][] {
  const groups: Task[][] = [];
  const completed = new Set<string>();
  const allTasks = dag.getAllTasks();

  while (completed.size < allTasks.length) {
    const group: Task[] = [];

    for (const task of allTasks) {
      if (completed.has(task.id)) continue;

      // Check if all dependencies are in completed
      const deps = task.dependencies || [];
      const allDepsComplete = deps.every(d => completed.has(d));

      if (allDepsComplete) {
        group.push(task);
      }
    }

    if (group.length === 0) {
      // No progress - there might be a cycle or missing dependency
      break;
    }

    groups.push(group);
    for (const task of group) {
      completed.add(task.id);
    }
  }

  return groups;
}
