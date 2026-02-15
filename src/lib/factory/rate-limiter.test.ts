import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from './rate-limiter.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      'claude:opus': 1,
      'claude:sonnet': 2,
      'claude:haiku': 3,
      'gemini:pro': 2,
    });
  });

  describe('slotKey', () => {
    it('should build correct key', () => {
      expect(RateLimiter.slotKey('claude', 'opus')).toBe('claude:opus');
      expect(RateLimiter.slotKey('gemini', 'flash')).toBe('gemini:flash');
    });
  });

  describe('tryAcquire / release', () => {
    it('should acquire a permit when capacity available', () => {
      expect(limiter.tryAcquire('claude', 'opus')).toBe(true);
    });

    it('should reject when at capacity', () => {
      expect(limiter.tryAcquire('claude', 'opus')).toBe(true);
      expect(limiter.tryAcquire('claude', 'opus')).toBe(false);
    });

    it('should allow re-acquire after release', () => {
      limiter.tryAcquire('claude', 'opus');
      expect(limiter.tryAcquire('claude', 'opus')).toBe(false);
      limiter.release('claude', 'opus');
      expect(limiter.tryAcquire('claude', 'opus')).toBe(true);
    });

    it('should respect per-slot concurrency limits', () => {
      // haiku allows 3
      expect(limiter.tryAcquire('claude', 'haiku')).toBe(true);
      expect(limiter.tryAcquire('claude', 'haiku')).toBe(true);
      expect(limiter.tryAcquire('claude', 'haiku')).toBe(true);
      expect(limiter.tryAcquire('claude', 'haiku')).toBe(false);
    });

    it('should allow unknown slots through', () => {
      expect(limiter.tryAcquire('codex', 'default')).toBe(true);
    });

    it('should not go below 0 on extra release', () => {
      limiter.release('claude', 'opus');
      limiter.release('claude', 'opus');
      // Should still allow one acquire
      expect(limiter.tryAcquire('claude', 'opus')).toBe(true);
      expect(limiter.tryAcquire('claude', 'opus')).toBe(false);
    });
  });

  describe('reportRateLimit / backoff', () => {
    it('should block acquire during backoff', () => {
      limiter.reportRateLimit('claude', 'opus');
      expect(limiter.tryAcquire('claude', 'opus')).toBe(false);
    });

    it('should increase backoff on consecutive rate limits', () => {
      limiter.reportRateLimit('claude', 'opus');
      const status1 = limiter.getStatus();
      const backoff1 = status1['claude:opus'].backoffSeconds;

      limiter.reportRateLimit('claude', 'opus');
      const status2 = limiter.getStatus();
      const backoff2 = status2['claude:opus'].backoffSeconds;

      expect(backoff2).toBeGreaterThan(backoff1);
    });

    it('should cap backoff at 5 minutes', () => {
      for (let i = 0; i < 20; i++) {
        limiter.reportRateLimit('claude', 'opus');
      }
      const status = limiter.getStatus();
      expect(status['claude:opus'].backoffSeconds).toBeLessThanOrEqual(300);
    });
  });

  describe('reportSuccess', () => {
    it('should reset backoff counter', () => {
      limiter.reportRateLimit('claude', 'sonnet');
      limiter.reportSuccess('claude', 'sonnet');
      // After success, a new rate limit should start from base (with +/-20% jitter, max 12s)
      limiter.reportRateLimit('claude', 'sonnet');
      const status = limiter.getStatus();
      expect(status['claude:sonnet'].backoffSeconds).toBeLessThanOrEqual(12);
    });
  });

  describe('isRateLimited', () => {
    it('should detect rate_limit_error', () => {
      expect(RateLimiter.isRateLimited('Error: rate_limit_error')).toBe(true);
    });

    it('should detect 429', () => {
      expect(RateLimiter.isRateLimited('HTTP 429 Too Many Requests')).toBe(true);
    });

    it('should detect RESOURCE_EXHAUSTED', () => {
      expect(RateLimiter.isRateLimited('RESOURCE_EXHAUSTED: quota exceeded')).toBe(true);
    });

    it('should detect "too many requests"', () => {
      expect(RateLimiter.isRateLimited('too many requests, please try again')).toBe(true);
    });

    it('should return false for normal output', () => {
      expect(RateLimiter.isRateLimited('Task completed successfully')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(RateLimiter.isRateLimited('')).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should show all configured slots', () => {
      const status = limiter.getStatus();
      expect(Object.keys(status)).toEqual(['claude:opus', 'claude:sonnet', 'claude:haiku', 'gemini:pro']);
    });

    it('should reflect active counts', () => {
      limiter.tryAcquire('claude', 'sonnet');
      const status = limiter.getStatus();
      expect(status['claude:sonnet'].active).toBe(1);
      expect(status['claude:sonnet'].max).toBe(2);
    });
  });

  describe('getTotalActive', () => {
    it('should sum all active permits', () => {
      limiter.tryAcquire('claude', 'opus');
      limiter.tryAcquire('claude', 'sonnet');
      limiter.tryAcquire('gemini', 'pro');
      expect(limiter.getTotalActive()).toBe(3);
    });

    it('should return 0 when no permits acquired', () => {
      expect(limiter.getTotalActive()).toBe(0);
    });
  });

  describe('getAvailableSlots', () => {
    it('should return all slots when none in use', () => {
      const available = limiter.getAvailableSlots();
      expect(available).toContain('claude:opus');
      expect(available).toContain('claude:sonnet');
      expect(available).toContain('claude:haiku');
      expect(available).toContain('gemini:pro');
    });

    it('should exclude full slots', () => {
      limiter.tryAcquire('claude', 'opus');
      const available = limiter.getAvailableSlots();
      expect(available).not.toContain('claude:opus');
      expect(available).toContain('claude:sonnet');
    });

    it('should exclude slots in backoff', () => {
      limiter.reportRateLimit('gemini', 'pro');
      const available = limiter.getAvailableSlots();
      expect(available).not.toContain('gemini:pro');
    });
  });
});
