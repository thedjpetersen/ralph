import { execa } from 'execa';
import { logger } from './logger.js';

export interface GitStatus {
  clean: boolean;
  staged: string[];
  modified: string[];
  untracked: string[];
  branch: string;
  ahead: number;
  behind: number;
}

export async function getStatus(cwd: string): Promise<GitStatus> {
  try {
    const { stdout: statusOutput } = await execa('git', ['status', '--porcelain', '-b'], { cwd });
    const lines = statusOutput.split('\n').filter(Boolean);

    const status: GitStatus = {
      clean: true,
      staged: [],
      modified: [],
      untracked: [],
      branch: 'unknown',
      ahead: 0,
      behind: 0,
    };

    for (const line of lines) {
      if (line.startsWith('##')) {
        // Branch info
        const branchMatch = line.match(/## (\S+?)(?:\.\.\.(\S+))?\s*(?:\[ahead (\d+)(?:, behind (\d+))?\])?/);
        if (branchMatch) {
          status.branch = branchMatch[1];
          status.ahead = parseInt(branchMatch[3] || '0', 10);
          status.behind = parseInt(branchMatch[4] || '0', 10);
        }
      } else {
        status.clean = false;
        const code = line.substring(0, 2);
        const file = line.substring(3);

        if (code[0] !== ' ' && code[0] !== '?') {
          status.staged.push(file);
        }
        if (code[1] === 'M') {
          status.modified.push(file);
        }
        if (code === '??') {
          status.untracked.push(file);
        }
      }
    }

    return status;
  } catch (error) {
    logger.error('Failed to get git status:', error);
    return {
      clean: true,
      staged: [],
      modified: [],
      untracked: [],
      branch: 'unknown',
      ahead: 0,
      behind: 0,
    };
  }
}

export async function getRecentCommits(cwd: string, count: number = 5): Promise<string[]> {
  try {
    const { stdout } = await execa('git', ['log', `--oneline`, `-${count}`], { cwd });
    return stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

export async function getDiff(cwd: string, staged: boolean = false): Promise<string> {
  try {
    const args = staged ? ['diff', '--staged'] : ['diff'];
    const { stdout } = await execa('git', args, { cwd });
    return stdout;
  } catch {
    return '';
  }
}

export async function stageAll(cwd: string): Promise<boolean> {
  try {
    await execa('git', ['add', '-A'], { cwd });
    return true;
  } catch (error) {
    logger.error('Failed to stage files:', error);
    return false;
  }
}

export async function commit(cwd: string, message: string): Promise<boolean> {
  try {
    const fullMessage = `${message}\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`;
    await execa('git', ['commit', '-m', fullMessage], { cwd });
    logger.success('Committed changes');
    return true;
  } catch (error) {
    logger.error('Failed to commit:', error);
    return false;
  }
}

export async function push(cwd: string, branch?: string): Promise<boolean> {
  try {
    const args = ['push', 'origin'];
    if (branch) args.push(branch);
    await execa('git', args, { cwd });
    logger.success('Pushed to remote');
    return true;
  } catch (error) {
    logger.error('Failed to push:', error);
    return false;
  }
}

export async function getCurrentBranch(cwd: string): Promise<string> {
  try {
    const { stdout } = await execa('git', ['branch', '--show-current'], { cwd });
    return stdout.trim();
  } catch {
    return 'main';
  }
}

export async function hasUncommittedChanges(cwd: string): Promise<boolean> {
  const status = await getStatus(cwd);
  return !status.clean;
}

export function summarizeChanges(status: GitStatus): string {
  const parts: string[] = [];

  if (status.staged.length > 0) {
    parts.push(`${status.staged.length} staged`);
  }
  if (status.modified.length > 0) {
    parts.push(`${status.modified.length} modified`);
  }
  if (status.untracked.length > 0) {
    parts.push(`${status.untracked.length} untracked`);
  }

  return parts.length > 0 ? parts.join(', ') : 'no changes';
}
