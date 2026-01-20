/**
 * Resume command - continue a crashed or interrupted session
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
import { runCommand } from './run.js';

export interface ResumeOptions {
  sessionId?: string;
  config: RalphConfig;
}

export async function resumeCommand(options: ResumeOptions): Promise<void> {
  const { config, sessionId } = options;
  const sessionManager = createSessionManager(config);

  // Find session to resume
  const session = sessionId
    ? sessionManager.loadSession(sessionId)
    : sessionManager.getActiveSession();

  if (!session) {
    logger.error(sessionId ? `Session not found: ${sessionId}` : 'No active session to resume');
    logger.info('Use "ralph sessions" to list available sessions');
    return;
  }

  if (session.status === 'completed') {
    logger.error(`Session ${session.sessionId} is already completed`);
    return;
  }

  if (session.status === 'running') {
    logger.warning(`Session ${session.sessionId} appears to still be running`);
    logger.info('If this is incorrect, use "ralph abort" first');
    return;
  }

  logger.header(`Resuming Session: ${session.sessionId}`);
  logger.info(`Status: ${session.status}`);
  logger.info(`Started: ${new Date(session.startedAt).toLocaleString()}`);
  logger.info(`Progress: ${session.completedTaskCount} tasks completed`);

  if (session.currentTask) {
    logger.info(`Orphaned task: ${session.currentTask.taskName}`);
  }

  // Load PRD files
  let prdFiles: PrdFile[];
  if (session.config.prdFile) {
    const prd = loadPrdFile(session.config.prdFile);
    if (!prd) {
      logger.error(`Failed to load PRD file: ${session.config.prdFile}`);
      return;
    }
    prdFiles = [prd];
  } else {
    prdFiles = loadAllPrdFiles(config.prdDir);
    if (prdFiles.length === 0) {
      logger.error('No PRD files found');
      return;
    }
  }

  // Reset orphaned tasks
  const orphaned = getOrphanedTasks(prdFiles);
  if (orphaned.length > 0) {
    logger.info(`Resetting ${orphaned.length} orphaned task(s) to pending...`);
    for (const { prdFile, item } of orphaned) {
      resetTaskStatus(prdFile, item.id);
    }
  }

  // Calculate remaining iterations
  const remainingIterations = Math.max(
    1,
    session.config.iterations - session.currentIteration
  );

  logger.info(`Remaining iterations: ${remainingIterations}`);
  logger.divider();

  // Update config with session settings
  const resumeConfig: RalphConfig = {
    ...config,
    model: session.config.model,
    prdFile: session.config.prdFile || '',
    filterCategory: session.config.filterCategory || '',
    filterPriority: session.config.filterPriority || '',
  };

  // Set the session as current
  sessionManager.setCurrentSession(session);

  // Continue with run command
  await runCommand({
    iterations: remainingIterations,
    config: resumeConfig,
    sessionManager,
    resumeSession: session,
  });
}
