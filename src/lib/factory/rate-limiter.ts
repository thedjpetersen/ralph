/**
 * Factory Mode — Per-Provider Rate Limiter
 *
 * Counting semaphore per provider:model key with exponential backoff
 * on rate limit detection.
 */

import { logger } from '../logger.js';

// ============================================================================
// Types
// ============================================================================

interface SlotState {
  maxConcurrent: number;
  activeConcurrent: number;
  backoffMs: number;
  backoffUntil: number;  // timestamp
  consecutiveRateLimits: number;
}

// ============================================================================
// Constants
// ============================================================================

const BASE_BACKOFF_MS = 10_000;     // 10 seconds
const BACKOFF_MULTIPLIER = 2;
const MAX_BACKOFF_MS = 5 * 60_000;  // 5 minutes

/** Patterns that indicate rate limiting in provider stderr/stdout */
const RATE_LIMIT_PATTERNS = [
  'rate_limit_error',
  'rate_limit_exceeded',
  '429',
  'RESOURCE_EXHAUSTED',
  'too many requests',
  'rate limit',
  'overloaded',
];

// ============================================================================
// RateLimiter
// ============================================================================

export class RateLimiter {
  private slots: Map<string, SlotState> = new Map();

  constructor(slotConfig: Record<string, number>) {
    for (const [key, maxConcurrent] of Object.entries(slotConfig)) {
      this.slots.set(key, {
        maxConcurrent,
        activeConcurrent: 0,
        backoffMs: 0,
        backoffUntil: 0,
        consecutiveRateLimits: 0,
      });
    }
  }

  /**
   * Build the slot key from provider and model
   */
  static slotKey(provider: string, model: string): string {
    return `${provider}:${model}`;
  }

  /**
   * Non-blocking permit check. Returns true if a permit was acquired.
   */
  tryAcquire(provider: string, model: string): boolean {
    const key = RateLimiter.slotKey(provider, model);
    const slot = this.slots.get(key);

    if (!slot) {
      logger.debug(`Rate limiter: unknown slot ${key}, allowing`);
      return true;
    }

    // Check backoff
    if (Date.now() < slot.backoffUntil) {
      const remaining = Math.ceil((slot.backoffUntil - Date.now()) / 1000);
      logger.debug(`Rate limiter: ${key} in backoff for ${remaining}s more`);
      return false;
    }

    // Check concurrency
    if (slot.activeConcurrent >= slot.maxConcurrent) {
      logger.debug(`Rate limiter: ${key} at capacity (${slot.activeConcurrent}/${slot.maxConcurrent})`);
      return false;
    }

    slot.activeConcurrent++;
    logger.debug(`Rate limiter: acquired ${key} (${slot.activeConcurrent}/${slot.maxConcurrent})`);
    return true;
  }

  /**
   * Return a permit for the given provider:model.
   */
  release(provider: string, model: string): void {
    const key = RateLimiter.slotKey(provider, model);
    const slot = this.slots.get(key);

    if (!slot) return;

    slot.activeConcurrent = Math.max(0, slot.activeConcurrent - 1);
    logger.debug(`Rate limiter: released ${key} (${slot.activeConcurrent}/${slot.maxConcurrent})`);
  }

  /**
   * Report a rate limit hit. Triggers exponential backoff.
   */
  reportRateLimit(provider: string, model: string): void {
    const key = RateLimiter.slotKey(provider, model);
    const slot = this.slots.get(key);

    if (!slot) return;

    slot.consecutiveRateLimits++;
    const baseBackoffMs =
      BASE_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, slot.consecutiveRateLimits - 1);
    const jitteredBackoffMs = baseBackoffMs * (0.8 + Math.random() * 0.4);
    slot.backoffMs = Math.min(jitteredBackoffMs, MAX_BACKOFF_MS);
    slot.backoffUntil = Date.now() + slot.backoffMs;

    logger.warning(
      `Rate limiter: ${key} rate limited (${slot.consecutiveRateLimits}x), ` +
      `backing off ${Math.round(slot.backoffMs / 1000)}s`
    );
  }

  /**
   * Report a successful request. Resets the consecutive backoff counter.
   */
  reportSuccess(provider: string, model: string): void {
    const key = RateLimiter.slotKey(provider, model);
    const slot = this.slots.get(key);

    if (!slot) return;

    if (slot.consecutiveRateLimits > 0) {
      logger.debug(`Rate limiter: ${key} success, resetting backoff`);
    }
    slot.consecutiveRateLimits = 0;
    slot.backoffMs = 0;
  }

  /**
   * Check if provider output indicates a rate limit.
   */
  static isRateLimited(output: string): boolean {
    const lower = output.toLowerCase();
    return RATE_LIMIT_PATTERNS.some(pattern => lower.includes(pattern.toLowerCase()));
  }

  /**
   * Get the current status of all slots.
   */
  getStatus(): Record<string, { active: number; max: number; backoffSeconds: number }> {
    const status: Record<string, { active: number; max: number; backoffSeconds: number }> = {};

    for (const [key, slot] of this.slots) {
      const backoffRemaining = Math.max(0, slot.backoffUntil - Date.now());
      status[key] = {
        active: slot.activeConcurrent,
        max: slot.maxConcurrent,
        backoffSeconds: Math.ceil(backoffRemaining / 1000),
      };
    }

    return status;
  }

  /**
   * Get the total number of active workers across all slots.
   */
  getTotalActive(): number {
    let total = 0;
    for (const slot of this.slots.values()) {
      total += slot.activeConcurrent;
    }
    return total;
  }

  /**
   * Find any available slot key (has capacity and not in backoff).
   */
  getAvailableSlots(): string[] {
    const available: string[] = [];
    const now = Date.now();

    for (const [key, slot] of this.slots) {
      if (slot.activeConcurrent < slot.maxConcurrent && now >= slot.backoffUntil) {
        available.push(key);
      }
    }

    return available;
  }
}
