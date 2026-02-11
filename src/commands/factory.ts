/**
 * Factory Command
 *
 * Runs Ralph in factory mode: parallel, convergent software factory.
 * Delegates work to multiple providers simultaneously, routes by complexity,
 * and continuously generates new tasks via a planner loop.
 */

import { join, resolve } from 'path';
import { logger } from '../lib/logger.js';
import type { RalphConfig } from '../lib/config.js';
import type { FactoryConfig, ProviderSlot } from '../lib/factory/types.js';
import { DEFAULT_FACTORY_CONFIG } from '../lib/factory/types.js';
import { FactoryOrchestrator } from '../lib/factory/orchestrator.js';
import { getTaskSummary, loadPrdFile, loadAllPrdFiles } from '../lib/prd.js';
import chalk from 'chalk';
import boxen from 'boxen';

// ============================================================================
// Types
// ============================================================================

export interface FactoryOptions {
  config: RalphConfig;
  maxWorkers?: number;
  opusSlots?: number;
  sonnetSlots?: number;
  haikuSlots?: number;
  geminiProSlots?: number;
  geminiFlashSlots?: number;
  codexSlots?: number;
  cursorSlots?: number;
  plannerInterval?: number;
  plannerModel?: string;
  retryLimit?: number;
  escalateOnRetry?: boolean;
  autoRoute?: boolean;
  cleanup?: boolean;
}

// ============================================================================
// Command
// ============================================================================

export async function factoryCommand(options: FactoryOptions): Promise<void> {
  const { config } = options;

  // Build factory config from CLI options
  const factoryConfig = buildFactoryConfig(options);

  // Load PRD files for banner
  let prdFiles;
  if (config.prdFile) {
    const prd = loadPrdFile(config.prdFile);
    prdFiles = prd ? [prd] : [];
  } else {
    prdFiles = loadAllPrdFiles(config.prdDir);
  }

  if (prdFiles.length === 0) {
    logger.error('No PRD files found');
    return;
  }

  const summary = getTaskSummary(prdFiles);

  // Show factory banner
  showFactoryBanner(factoryConfig, summary);

  // Run the orchestrator
  const orchestrator = new FactoryOrchestrator(config, factoryConfig);
  await orchestrator.run();
}

// ============================================================================
// Config Builder
// ============================================================================

function buildFactoryConfig(options: FactoryOptions): FactoryConfig {
  const defaults = DEFAULT_FACTORY_CONFIG;
  const config = options.config;

  // Build slot configuration
  const slots: Record<string, number> = { ...defaults.pool.slots };

  if (options.opusSlots !== undefined) slots['claude:opus'] = options.opusSlots;
  if (options.sonnetSlots !== undefined) slots['claude:sonnet'] = options.sonnetSlots;
  if (options.haikuSlots !== undefined) slots['claude:haiku'] = options.haikuSlots;
  if (options.geminiProSlots !== undefined) slots['gemini:pro'] = options.geminiProSlots;
  if (options.geminiFlashSlots !== undefined) slots['gemini:flash'] = options.geminiFlashSlots;
  if (options.codexSlots !== undefined) slots['codex:default'] = options.codexSlots;
  if (options.cursorSlots !== undefined) slots['cursor:agent'] = options.cursorSlots;

  // Determine planner provider
  let plannerProvider: ProviderSlot = defaults.plannerProvider;
  if (options.plannerModel) {
    const model = options.plannerModel;
    if (['opus', 'sonnet', 'haiku'].includes(model)) {
      plannerProvider = { provider: 'claude', model, tier: 'medium' };
    } else if (['pro', 'flash'].includes(model)) {
      plannerProvider = { provider: 'gemini', model, tier: 'medium' };
    }
  }

  return {
    pool: {
      slots,
      maxTotalWorkers: options.maxWorkers ?? defaults.pool.maxTotalWorkers,
      retryLimit: options.retryLimit ?? defaults.pool.retryLimit,
    },
    routing: {
      autoRoute: options.autoRoute !== false,
      defaultTier: defaults.routing.defaultTier,
    },
    worktreeDir: join(config.projectRoot, '.ralph/worktrees'),
    plannerInterval: options.plannerInterval ?? defaults.plannerInterval,
    plannerProvider,
    escalateOnRetry: options.escalateOnRetry !== false,
    cleanupOnShutdown: options.cleanup !== false,
  };
}

// ============================================================================
// Banner
// ============================================================================

function showFactoryBanner(
  factoryConfig: FactoryConfig,
  summary: { total: number; pending: number; completed: number }
): void {
  const activeSlots = Object.entries(factoryConfig.pool.slots)
    .filter(([_, count]) => count > 0)
    .map(([key, count]) => `${key} x${count}`)
    .join(', ');

  const content = [
    chalk.bold.magenta('FACTORY MODE'),
    '',
    chalk.white(`Tasks: ${summary.pending} pending / ${summary.total} total`),
    chalk.white(`Workers: ${factoryConfig.pool.maxTotalWorkers}`),
    chalk.white(`Slots: ${activeSlots}`),
    chalk.white(`Planner: ${factoryConfig.plannerProvider.provider}:${factoryConfig.plannerProvider.model}`),
    chalk.white(`Interval: ${Math.round(factoryConfig.plannerInterval / 1000)}s`),
    chalk.white(`Retry limit: ${factoryConfig.pool.retryLimit}`),
    chalk.white(`Auto-route: ${factoryConfig.routing.autoRoute}`),
    chalk.white(`Escalate on retry: ${factoryConfig.escalateOnRetry}`),
  ].join('\n');

  console.log(boxen(content, {
    padding: 1,
    borderStyle: 'double',
    borderColor: 'magenta',
  }));
  console.log();
}
