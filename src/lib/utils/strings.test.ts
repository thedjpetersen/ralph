import { describe, it, expect } from 'vitest';
import { capitalize, truncate } from './strings';

describe('capitalize', () => {
  it('should capitalize the first letter of a string', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should handle already capitalized strings', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('should handle single character strings', () => {
    expect(capitalize('a')).toBe('A');
  });

  it('should return empty string for empty input', () => {
    expect(capitalize('')).toBe('');
  });

  it('should handle strings with numbers at start', () => {
    expect(capitalize('123abc')).toBe('123abc');
  });
});

describe('truncate', () => {
  it('should truncate long strings and add ellipsis', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
  });

  it('should not truncate strings shorter than maxLength', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  it('should not truncate strings equal to maxLength', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('should return empty string for empty input', () => {
    expect(truncate('', 10)).toBe('');
  });

  it('should handle very short maxLength values', () => {
    expect(truncate('Hello', 3)).toBe('...');
    expect(truncate('Hello', 2)).toBe('..');
    expect(truncate('Hello', 1)).toBe('.');
  });

  it('should handle maxLength of 4', () => {
    expect(truncate('Hello World', 4)).toBe('H...');
  });
});
