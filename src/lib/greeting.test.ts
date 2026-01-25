import { describe, it, expect } from 'vitest';
import { greet } from './greeting.js';

describe('greeting', () => {
  describe('greet', () => {
    it('should return a greeting with the provided name', () => {
      expect(greet('World')).toBe('Hello, World!');
    });

    it('should handle different names', () => {
      expect(greet('Alice')).toBe('Hello, Alice!');
      expect(greet('Bob')).toBe('Hello, Bob!');
    });

    it('should handle empty string', () => {
      expect(greet('')).toBe('Hello, !');
    });

    it('should handle names with spaces', () => {
      expect(greet('John Doe')).toBe('Hello, John Doe!');
    });
  });
});
