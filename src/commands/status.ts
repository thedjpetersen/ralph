import chalk from 'chalk';
import { logger } from '../lib/logger.js';
import { RalphConfig } from '../lib/config.js';
import { loadAllPrdFiles, loadPrdFile, getTaskSummary, getNextTask, PrdItem } from '../lib/prd.js';
import { createSessionManager } from '../lib/session.js';

function formatValidationGates(item: PrdItem): string {
  if (!item.validation_results) return chalk.gray('No validation run');

  const result = item.validation_results;
  const passed = result.gates.filter(g => g.passed).length;
  const total = result.gates.length;

  if (result.passed) {
    return chalk.green(`✓ ${passed}/${total} gates passed`);
  } else {
    return chalk.red(`✗ ${result.failed_gates.join(', ')}`);
  }
}

export async function statusCommand(config: RalphConfig): Promise<void> {
  let prdFiles;
  if (config.prdFile) {
    const prd = loadPrdFile(config.prdFile);
    if (!prd) {
      logger.error(`Failed to load PRD file: ${config.prdFile}`);
      return;
    }
    prdFiles = [prd];
    logger.info(`Using PRD file: ${config.prdFile}`);
  } else {
    prdFiles = loadAllPrdFiles(config.prdDir);
    if (prdFiles.length === 0) {
      logger.error('No PRD files found');
      return;
    }
  }

  const summary = getTaskSummary(prdFiles);

  logger.header('Ralph Status');

  // Show session info
  const sessionManager = createSessionManager(config);
  const activeSession = sessionManager.getActiveSession();

  if (activeSession) {
    console.log();
    console.log(chalk.bold('Active Session:'));
    console.log(`  ID: ${chalk.cyan(activeSession.sessionId)}`);
    console.log(`  Status: ${chalk.blue(activeSession.status)}`);
    console.log(`  Started: ${new Date(activeSession.startedAt).toLocaleString()}`);
    console.log(`  Progress: ${activeSession.completedTaskCount}/${activeSession.config.iterations} iterations`);
    if (activeSession.currentTask) {
      console.log(`  ${chalk.yellow('Current:')} ${activeSession.currentTask.taskName}`);
    }
  }

  console.log();
  console.log(chalk.bold('Overall Progress:'));
  const percent = Math.round((summary.completed / summary.total) * 100);
  const bar = '█'.repeat(Math.round(percent / 5)) + '░'.repeat(20 - Math.round(percent / 5));
  console.log(`  [${bar}] ${percent}%`);
  console.log();

  console.log(chalk.bold('Task Counts:'));
  console.log(`  ${chalk.green('✓')} Completed: ${summary.completed}`);
  console.log(`  ${chalk.yellow('○')} In Progress: ${summary.inProgress}`);
  console.log(`  ${chalk.gray('○')} Pending: ${summary.pending}`);
  console.log(`  Total: ${summary.total}`);
  console.log();

  console.log(chalk.bold('By Category:'));
  for (const [category, counts] of Object.entries(summary.byCategory)) {
    const catPercent = counts.pending + counts.completed > 0
      ? Math.round((counts.completed / (counts.pending + counts.completed)) * 100)
      : 0;
    console.log(`  ${category}: ${counts.completed}/${counts.pending + counts.completed} (${catPercent}%)`);
  }
  console.log();

  // Show next task
  const next = getNextTask(prdFiles);
  if (next) {
    const taskName = next.item.name || next.item.description.substring(0, 60);
    console.log(chalk.bold('Next Task:'));
    console.log(`  ${chalk.cyan(taskName)}`);
    console.log(`  Category: ${next.prdFile.category}`);
    console.log(`  Priority: ${next.item.priority}`);
    console.log(`  ID: ${next.item.id}`);
    if (next.item.description && next.item.description.length > 60) {
      console.log(`  ${chalk.gray(next.item.description.substring(0, 100) + '...')}`);
    }

    // Show validation info if available
    if (next.item.validation_results) {
      console.log();
      console.log(`  ${chalk.bold('Last Validation:')}`);
      console.log(`    ${formatValidationGates(next.item)}`);
      console.log(`    Attempts: ${next.item.validation_results.attempts}`);
    }

    // Show expected validation gates
    console.log();
    console.log(`  ${chalk.bold('Validation Gates:')}`);
    const gates = [];
    if (config.validationGates.build) gates.push('build');
    if (config.validationGates.test) gates.push('test');
    if (config.validationGates.lint) gates.push('lint');
    if (next.item.notes?.includes('VALIDATE:')) gates.push('custom');
    console.log(`    ${gates.join(', ') || 'none (--skip-validation)'}`);

    console.log();
  } else {
    console.log(chalk.green('All tasks completed!'));
  }

  // Show recent sessions
  const sessions = sessionManager.listSessions().slice(0, 3);
  if (sessions.length > 0) {
    console.log(chalk.bold('Recent Sessions:'));
    for (const session of sessions) {
      const statusColor = session.status === 'completed' ? chalk.green :
        session.status === 'crashed' ? chalk.red :
        session.status === 'running' ? chalk.blue : chalk.yellow;
      console.log(`  ${session.sessionId}: ${statusColor(session.status)} (${session.taskCount} tasks)`);
    }
    console.log();
  }
}
