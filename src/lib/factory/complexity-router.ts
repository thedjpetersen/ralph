/**
 * Factory Mode — Complexity Router
 *
 * Scores task complexity 0-100, maps to tier, routes to best available provider slot.
 * Supports fallback routing when preferred slots are at capacity and tier escalation on retry.
 */

import type { PrdItem } from '../prd.js';
import type { ComplexityTier, ProviderSlot, FactoryConfig, FactoryTask } from './types.js';
import { RateLimiter } from './rate-limiter.js';
import { logger } from '../logger.js';

// ============================================================================
// Complexity Scoring
// ============================================================================

/** Keywords that suggest high complexity */
const HIGH_KEYWORDS = [
  'refactor', 'migration', 'architecture', 'redesign', 'rewrite',
  'security', 'authentication', 'authorization', 'performance',
  'database', 'schema', 'integration', 'api design', 'state management',
];

/** Keywords that suggest low complexity */
const LOW_KEYWORDS = [
  'typo', 'tooltip', 'color', 'padding', 'margin', 'spacing',
  'rename', 'comment', 'documentation', 'readme', 'copy',
  'icon', 'label', 'text', 'string', 'css', 'style',
];

/**
 * Score task complexity from 0-100 using heuristics.
 */
export function scoreComplexity(item: PrdItem): number {
  let score = 50; // Start neutral

  // Manual override takes precedence
  if ((item as PrdItem & { complexity?: ComplexityTier }).complexity) {
    const manual = (item as PrdItem & { complexity?: ComplexityTier }).complexity;
    if (manual === 'low') return 20;
    if (manual === 'medium') return 50;
    if (manual === 'high') return 80;
  }

  // Priority signal
  if (item.priority === 'high') score += 10;
  if (item.priority === 'low') score -= 10;

  // Description length (longer = more complex)
  const descLength = item.description.length;
  if (descLength > 500) score += 15;
  else if (descLength > 200) score += 5;
  else if (descLength < 50) score -= 10;

  // Acceptance criteria / steps count
  const criteriaCount = (item.acceptance_criteria?.length || 0) + (item.steps?.length || 0);
  if (criteriaCount > 8) score += 15;
  else if (criteriaCount > 4) score += 5;
  else if (criteriaCount <= 1) score -= 10;

  // Estimated hours
  if (item.estimated_hours) {
    if (item.estimated_hours >= 4) score += 20;
    else if (item.estimated_hours >= 2) score += 10;
    else if (item.estimated_hours < 0.5) score -= 15;
  }

  // Judge requirements (tasks with judges are typically more important)
  if (item.judges && item.judges.length > 0) {
    score += 10;
  }

  // Keyword heuristics
  const lowerDesc = item.description.toLowerCase();
  const lowerName = (item.name || '').toLowerCase();
  const text = `${lowerDesc} ${lowerName}`;

  for (const keyword of HIGH_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 8;
      break; // Only apply once
    }
  }

  for (const keyword of LOW_KEYWORDS) {
    if (text.includes(keyword)) {
      score -= 8;
      break; // Only apply once
    }
  }

  // Dependencies increase complexity
  if (item.dependencies && item.dependencies.length > 2) {
    score += 10;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Map a complexity score (0-100) to a tier.
 */
export function scoreToTier(score: number): ComplexityTier {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Escalate a tier to the next level (for retries).
 */
export function escalateTier(tier: ComplexityTier): ComplexityTier {
  if (tier === 'low') return 'medium';
  if (tier === 'medium') return 'high';
  return 'high'; // Already at max
}

// ============================================================================
// Provider Routing Table
// ============================================================================

interface RoutingEntry {
  primary: ProviderSlot;
  fallbacks: ProviderSlot[];
}

const ROUTING_TABLE: Record<ComplexityTier, RoutingEntry> = {
  high: {
    primary: { provider: 'claude', model: 'opus', tier: 'high' },
    fallbacks: [
      { provider: 'gemini', model: 'pro', tier: 'high' },
      { provider: 'claude', model: 'sonnet', tier: 'high' },
    ],
  },
  medium: {
    primary: { provider: 'claude', model: 'sonnet', tier: 'medium' },
    fallbacks: [
      { provider: 'codex', model: 'default', tier: 'medium' },
      { provider: 'gemini', model: 'pro', tier: 'medium' },
      { provider: 'cursor', model: 'default', tier: 'medium' },
    ],
  },
  low: {
    primary: { provider: 'claude', model: 'haiku', tier: 'low' },
    fallbacks: [
      { provider: 'gemini', model: 'flash', tier: 'low' },
      { provider: 'codex', model: 'default', tier: 'low' },
    ],
  },
};

// ============================================================================
// Router
// ============================================================================

/**
 * Find the best available provider slot for a task tier.
 * Tries the primary slot first, then fallbacks in order.
 * Returns null if all slots are at capacity or in backoff.
 */
export function findAvailableSlot(
  tier: ComplexityTier,
  rateLimiter: RateLimiter,
  config: FactoryConfig
): ProviderSlot | null {
  const entry = ROUTING_TABLE[tier];
  const candidates = [entry.primary, ...entry.fallbacks];

  // First: try the natural routing for this tier
  for (const slot of candidates) {
    const key = RateLimiter.slotKey(slot.provider, slot.model);

    // Check if this slot is configured (exists in pool config)
    if (config.pool.slots[key] === undefined) continue;
    if (config.pool.slots[key] <= 0) continue;

    if (rateLimiter.tryAcquire(slot.provider, slot.model)) {
      // Immediately release - we just checked availability
      // Actual acquisition happens at assignment time
      rateLimiter.release(slot.provider, slot.model);
      return slot;
    }
  }

  // Fallback: try ANY available slot (downgrade/upgrade) so work isn't stuck
  const tiers: ComplexityTier[] = ['high', 'medium', 'low'];
  for (const fallbackTier of tiers) {
    if (fallbackTier === tier) continue; // already tried
    const fallbackEntry = ROUTING_TABLE[fallbackTier];
    const fallbackCandidates = [fallbackEntry.primary, ...fallbackEntry.fallbacks];

    for (const slot of fallbackCandidates) {
      const key = RateLimiter.slotKey(slot.provider, slot.model);
      if (config.pool.slots[key] === undefined) continue;
      if (config.pool.slots[key] <= 0) continue;

      if (rateLimiter.tryAcquire(slot.provider, slot.model)) {
        rateLimiter.release(slot.provider, slot.model);
        // Return the slot but with the original tier label
        return { ...slot, tier };
      }
    }
  }

  return null;
}

/**
 * Build a FactoryTask from a PrdItem with complexity routing.
 */
export function buildFactoryTask(
  item: PrdItem,
  prdFilePath: string,
  prdCategory: string,
  config: FactoryConfig,
  retryCount: number = 0
): FactoryTask {
  let complexityScore = scoreComplexity(item);
  let tier: ComplexityTier;

  if (config.routing.autoRoute) {
    tier = scoreToTier(complexityScore);

    // Escalate on retry
    if (retryCount > 0 && config.escalateOnRetry) {
      for (let i = 0; i < retryCount; i++) {
        tier = escalateTier(tier);
      }
      // Adjust score to match escalated tier
      if (tier === 'medium' && complexityScore < 40) complexityScore = 50;
      if (tier === 'high' && complexityScore < 70) complexityScore = 75;
    }
  } else {
    tier = config.routing.defaultTier;
  }

  logger.debug(
    `Complexity: ${item.id} score=${complexityScore} tier=${tier}` +
    (retryCount > 0 ? ` (retry ${retryCount}, escalated)` : '')
  );

  return {
    item,
    prdFilePath,
    prdCategory,
    complexityScore,
    tier,
    retryCount,
  };
}
