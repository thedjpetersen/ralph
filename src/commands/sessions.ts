/**
 * Sessions command - list and manage sessions
 */

import chalk from 'chalk';
import { logger } from '../lib/logger.js';
import { RalphConfig } from '../lib/config.js';
import { createSessionManager, SessionStatus } from '../lib/session.js';

export interface SessionsOptions {
  config: RalphConfig;
  cleanup?: boolean;
  cleanupDays?: number;
}

function formatStatus(status: SessionStatus): string {
  switch (status) {
    case 'running':
      return chalk.blue('running');
    case 'completed':
      return chalk.green('completed');
    case 'crashed':
      return chalk.red('crashed');
    case 'aborted':
      return chalk.yellow('aborted');
    default:
      return status;
  }
}

function formatAge(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export async function sessionsCommand(options: SessionsOptions): Promise<void> {
  const { config, cleanup, cleanupDays } = options;
  const sessionManager = createSessionManager(config);

  // Handle cleanup
  if (cleanup) {
    const days = cleanupDays || 7;
    logger.info(`Cleaning up sessions older than ${days} days...`);
    const removed = sessionManager.cleanup(days);
    logger.success(`Removed ${removed} old sessions`);
    return;
  }

  // List sessions
  const sessions = sessionManager.listSessions();

  if (sessions.length === 0) {
    logger.info('No sessions found');
    return;
  }

  logger.header('Ralph Sessions');
  console.log();

  // Get active session
  const active = sessionManager.getActiveSession();

  for (const session of sessions) {
    const isActive = active?.sessionId === session.sessionId;
    const prefix = isActive ? chalk.cyan('▶') : ' ';

    console.log(`${prefix} ${chalk.bold(session.sessionId)}  ${formatStatus(session.status)}`);
    console.log(`    Started: ${formatAge(session.startedAt)} (${new Date(session.startedAt).toLocaleString()})`);
    console.log(`    Tasks: ${session.taskCount} completed`);

    if (session.currentTask) {
      console.log(`    ${chalk.yellow('Current task:')} ${session.currentTask}`);
    }

    // Load full session for more details
    const fullSession = sessionManager.loadSession(session.sessionId);
    if (fullSession) {
      if (fullSession.lastError) {
        const error = fullSession.lastError.message.substring(0, 60);
        console.log(`    ${chalk.red('Last error:')} ${error}`);
      }
      console.log(`    Model: ${fullSession.config.model}`);
      if (fullSession.config.prdFile) {
        console.log(`    PRD: ${fullSession.config.prdFile}`);
      }
    }

    console.log();
  }

  // Show help
  if (active) {
    console.log(chalk.gray('Commands:'));
    console.log(chalk.gray('  ralph resume           Resume the active session'));
    console.log(chalk.gray('  ralph abort            Abort the active session'));
  } else {
    const crashed = sessions.filter(s => s.status === 'crashed');
    if (crashed.length > 0) {
      console.log(chalk.gray('Commands:'));
      console.log(chalk.gray(`  ralph resume ${crashed[0].sessionId}    Resume crashed session`));
    }
  }

  console.log(chalk.gray('  ralph sessions --cleanup    Remove sessions older than 7 days'));
}
