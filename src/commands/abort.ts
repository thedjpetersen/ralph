/**
 * Abort command - abort an active session and reset orphaned tasks
 */

import { logger } from '../lib/logger.js';
import { RalphConfig } from '../lib/config.js';
import { createSessionManager } from '../lib/session.js';
import {
  loadAllPrdFiles,
  loadPrdFile,
  resetTaskStatus,
  getOrphanedTasks,
  PrdFile,
} from '../lib/prd.js';

export interface AbortOptions {
  sessionId?: string;
  config: RalphConfig;
}

export async function abortCommand(options: AbortOptions): Promise<void> {
  const { config, sessionId } = options;
  const sessionManager = createSessionManager(config);

  // Get session to abort
  const session = sessionId
    ? sessionManager.loadSession(sessionId)
    : sessionManager.getActiveSession();

  if (!session) {
    logger.info('No active session to abort');
    return;
  }

  logger.header(`Aborting Session: ${session.sessionId}`);
  logger.info(`Status: ${session.status}`);
  logger.info(`Started: ${new Date(session.startedAt).toLocaleString()}`);
  logger.info(`Progress: ${session.completedTaskCount} tasks completed`);

  if (session.currentTask) {
    logger.info(`Current task: ${session.currentTask.taskName}`);
  }

  // Abort the session
  const success = sessionManager.abortSession(session.sessionId);

  if (!success) {
    logger.error('Failed to abort session');
    return;
  }

  // Load PRD files to reset orphaned tasks
  let prdFiles: PrdFile[];
  if (session.config.prdFile) {
    const prd = loadPrdFile(session.config.prdFile);
    if (prd) {
      prdFiles = [prd];
    } else {
      prdFiles = [];
    }
  } else {
    prdFiles = loadAllPrdFiles(config.prdDir);
  }

  // Reset orphaned tasks
  if (prdFiles.length > 0) {
    const orphaned = getOrphanedTasks(prdFiles);
    if (orphaned.length > 0) {
      logger.info(`Resetting ${orphaned.length} orphaned task(s) to pending...`);
      for (const { prdFile, item } of orphaned) {
        resetTaskStatus(prdFile, item.id);
        logger.info(`  - ${item.name || item.id}`);
      }
    }
  }

  logger.success(`Session ${session.sessionId} aborted`);
}
