import { describe, it, expect } from 'vitest';
import {
  convertQuotes,
  applyBasicTransforms,
  applySmartTypography,
  isInsideCodeFence,
  isInsideInlineCode,
  isInsideCode,
  findTransformableRange,
  applySmartTypographyToInput,
  reverseTypography,
} from '../smartTypography';

// Unicode constants for curly quotes
const LEFT_DOUBLE_QUOTE = '\u201C'; // "
const RIGHT_DOUBLE_QUOTE = '\u201D'; // "
const LEFT_SINGLE_QUOTE = '\u2018'; // '
const RIGHT_SINGLE_QUOTE = '\u2019'; // '
const EM_DASH = '\u2014'; // —
const ELLIPSIS = '\u2026'; // …

describe('smartTypography utilities', () => {
  describe('convertQuotes', () => {
    it('should convert opening double quotes', () => {
      expect(convertQuotes('"hello"')).toBe(`${LEFT_DOUBLE_QUOTE}hello${RIGHT_DOUBLE_QUOTE}`);
    });

    it('should convert closing double quotes', () => {
      expect(convertQuotes('say "goodbye"')).toBe(`say ${LEFT_DOUBLE_QUOTE}goodbye${RIGHT_DOUBLE_QUOTE}`);
    });

    it('should convert multiple quoted phrases', () => {
      expect(convertQuotes('"one" and "two"')).toBe(`${LEFT_DOUBLE_QUOTE}one${RIGHT_DOUBLE_QUOTE} and ${LEFT_DOUBLE_QUOTE}two${RIGHT_DOUBLE_QUOTE}`);
    });

    it('should convert opening single quotes', () => {
      expect(convertQuotes("'hello'")).toBe(`${LEFT_SINGLE_QUOTE}hello${RIGHT_SINGLE_QUOTE}`);
    });

    it('should handle apostrophes in contractions', () => {
      expect(convertQuotes("don't")).toBe(`don${RIGHT_SINGLE_QUOTE}t`);
      expect(convertQuotes("it's fine")).toBe(`it${RIGHT_SINGLE_QUOTE}s fine`);
      expect(convertQuotes("we've got")).toBe(`we${RIGHT_SINGLE_QUOTE}ve got`);
    });

    it('should handle mixed quotes and apostrophes', () => {
      expect(convertQuotes('"don\'t worry"')).toBe(`${LEFT_DOUBLE_QUOTE}don${RIGHT_SINGLE_QUOTE}t worry${RIGHT_DOUBLE_QUOTE}`);
    });

    it('should handle quotes after opening punctuation', () => {
      expect(convertQuotes('("hello")')).toBe(`(${LEFT_DOUBLE_QUOTE}hello${RIGHT_DOUBLE_QUOTE})`);
      expect(convertQuotes('["test"]')).toBe(`[${LEFT_DOUBLE_QUOTE}test${RIGHT_DOUBLE_QUOTE}]`);
    });

    it('should handle empty string', () => {
      expect(convertQuotes('')).toBe('');
    });

    it('should not change text without quotes', () => {
      expect(convertQuotes('hello world')).toBe('hello world');
    });
  });

  describe('applyBasicTransforms', () => {
    it('should convert double hyphen to em dash', () => {
      expect(applyBasicTransforms('hello--world')).toBe(`hello${EM_DASH}world`);
    });

    it('should convert triple dots to ellipsis', () => {
      expect(applyBasicTransforms('wait...')).toBe(`wait${ELLIPSIS}`);
    });

    it('should handle multiple transformations', () => {
      expect(applyBasicTransforms('wait... and--continue')).toBe(`wait${ELLIPSIS} and${EM_DASH}continue`);
    });

    it('should not change single hyphens', () => {
      expect(applyBasicTransforms('co-operate')).toBe('co-operate');
    });

    it('should not change two dots', () => {
      expect(applyBasicTransforms('range..')).toBe('range..');
    });

    it('should handle multiple em dashes', () => {
      expect(applyBasicTransforms('one--two--three')).toBe(`one${EM_DASH}two${EM_DASH}three`);
    });

    it('should handle multiple ellipses', () => {
      expect(applyBasicTransforms('wait...pause...')).toBe(`wait${ELLIPSIS}pause${ELLIPSIS}`);
    });
  });

  describe('applySmartTypography', () => {
    it('should apply all transformations together', () => {
      expect(applySmartTypography('"Hello..."')).toBe(`${LEFT_DOUBLE_QUOTE}Hello${ELLIPSIS}${RIGHT_DOUBLE_QUOTE}`);
      expect(applySmartTypography('"Wait--don\'t go..."')).toBe(`${LEFT_DOUBLE_QUOTE}Wait${EM_DASH}don${RIGHT_SINGLE_QUOTE}t go${ELLIPSIS}${RIGHT_DOUBLE_QUOTE}`);
    });

    it('should handle complex text', () => {
      const input = 'She said "I don\'t know..." and he replied--"Really?"';
      const expected = `She said ${LEFT_DOUBLE_QUOTE}I don${RIGHT_SINGLE_QUOTE}t know${ELLIPSIS}${RIGHT_DOUBLE_QUOTE} and he replied${EM_DASH}${LEFT_DOUBLE_QUOTE}Really?${RIGHT_DOUBLE_QUOTE}`;
      expect(applySmartTypography(input)).toBe(expected);
    });
  });

  describe('isInsideCodeFence', () => {
    it('should return false when not in code fence', () => {
      expect(isInsideCodeFence('hello world', 5)).toBe(false);
    });

    it('should return true when inside code fence', () => {
      const text = 'before\n```\ncode here\n```\nafter';
      expect(isInsideCodeFence(text, 15)).toBe(true); // inside "code here"
    });

    it('should return false after closing fence', () => {
      const text = 'before\n```\ncode\n```\nafter';
      expect(isInsideCodeFence(text, 24)).toBe(false); // in "after"
    });

    it('should handle multiple code fences', () => {
      const text = '```\ncode1\n```\ntext\n```\ncode2\n```';
      expect(isInsideCodeFence(text, 5)).toBe(true);  // inside code1
      expect(isInsideCodeFence(text, 17)).toBe(false); // in "text"
      expect(isInsideCodeFence(text, 25)).toBe(true);  // inside code2
    });

    it('should return false for empty text', () => {
      expect(isInsideCodeFence('', 0)).toBe(false);
    });
  });

  describe('isInsideInlineCode', () => {
    it('should return false when not in inline code', () => {
      expect(isInsideInlineCode('hello world', 5)).toBe(false);
    });

    it('should return true when inside inline code', () => {
      expect(isInsideInlineCode('use `code` here', 7)).toBe(true);
    });

    it('should return false after closing backtick', () => {
      expect(isInsideInlineCode('use `code` here', 11)).toBe(false);
    });

    it('should handle multiple inline code spans', () => {
      const text = '`one` and `two`';
      expect(isInsideInlineCode(text, 2)).toBe(true);  // inside one
      expect(isInsideInlineCode(text, 7)).toBe(false); // in "and"
      expect(isInsideInlineCode(text, 12)).toBe(true); // inside two
    });

    it('should skip code fences', () => {
      // The function should skip ``` as it's handled by isInsideCodeFence
      const text = '```code```';
      // After the first ``` we skip to position 5, then the remaining `code` toggles
      // This behavior depends on implementation, but we want inline code detection
      // to not be confused by code fences
      expect(isInsideInlineCode(text, 5)).toBe(false);
    });
  });

  describe('isInsideCode', () => {
    it('should return true for code fence', () => {
      const text = '```\ncode\n```';
      expect(isInsideCode(text, 5)).toBe(true);
    });

    it('should return true for inline code', () => {
      expect(isInsideCode('use `code` here', 7)).toBe(true);
    });

    it('should return false for regular text', () => {
      expect(isInsideCode('regular text', 5)).toBe(false);
    });
  });

  describe('findTransformableRange', () => {
    it('should find the changed range with lookback for pattern detection', () => {
      // With 3-char lookback, start should be 5-3=2
      const result = findTransformableRange('hello', 'hello world', 11);
      expect(result).toEqual({ start: 2, end: 11, text: 'llo world' });
    });

    it('should return null when no change', () => {
      const result = findTransformableRange('hello', 'hello', 5);
      expect(result).toBeNull();
    });

    it('should handle typing at the beginning', () => {
      // Lookback of min(3, 0) = 0, so start stays at 0
      const result = findTransformableRange('ello', 'hello', 1);
      expect(result).toEqual({ start: 0, end: 1, text: 'h' });
    });

    it('should return null when cursor is before diff', () => {
      const result = findTransformableRange('hello', 'hello world', 3);
      expect(result).toBeNull();
    });

    it('should lookback to capture patterns like double hyphen', () => {
      // Typing second hyphen: diffStart is 5, lookback 3 chars
      const result = findTransformableRange('wait-', 'wait--', 6);
      expect(result).toEqual({ start: 2, end: 6, text: 'it--' });
    });
  });

  describe('applySmartTypographyToInput', () => {
    it('should transform typed text', () => {
      const result = applySmartTypographyToInput('hello', 'hello...', 8);
      expect(result).toEqual({ text: `hello${ELLIPSIS}`, newCursorPosition: 6 });
    });

    it('should transform double hyphen to em dash', () => {
      const result = applySmartTypographyToInput('wait-', 'wait--', 6);
      expect(result).toEqual({ text: `wait${EM_DASH}`, newCursorPosition: 5 });
    });

    it('should transform quotes', () => {
      const result = applySmartTypographyToInput('say ', 'say "', 5);
      expect(result).toEqual({ text: `say ${LEFT_DOUBLE_QUOTE}`, newCursorPosition: 5 });
    });

    it('should return null when no transformation needed', () => {
      const result = applySmartTypographyToInput('hello', 'hello ', 6);
      expect(result).toBeNull();
    });

    it('should not transform text inside code fence', () => {
      const text = '```\ncode--here\n```';
      const result = applySmartTypographyToInput('```\ncode-here\n```', text, 13);
      expect(result).toBeNull();
    });

    it('should not transform text inside inline code', () => {
      const result = applySmartTypographyToInput('use `code-', 'use `code--', 11);
      expect(result).toBeNull();
    });
  });

  describe('reverseTypography', () => {
    it('should reverse em dash to double hyphen', () => {
      expect(reverseTypography(`hello${EM_DASH}world`)).toBe('hello--world');
    });

    it('should reverse ellipsis to three dots', () => {
      expect(reverseTypography(`wait${ELLIPSIS}`)).toBe('wait...');
    });

    it('should reverse curly double quotes to straight', () => {
      expect(reverseTypography(`${LEFT_DOUBLE_QUOTE}hello${RIGHT_DOUBLE_QUOTE}`)).toBe('"hello"');
    });

    it('should reverse curly single quotes to straight', () => {
      expect(reverseTypography(`${LEFT_SINGLE_QUOTE}hello${RIGHT_SINGLE_QUOTE}`)).toBe("'hello'");
      expect(reverseTypography(`don${RIGHT_SINGLE_QUOTE}t`)).toBe("don't");
    });

    it('should reverse all transformations together', () => {
      const input = `${LEFT_DOUBLE_QUOTE}Wait${EM_DASH}don${RIGHT_SINGLE_QUOTE}t go${ELLIPSIS}${RIGHT_DOUBLE_QUOTE}`;
      const expected = '"Wait--don\'t go..."';
      expect(reverseTypography(input)).toBe(expected);
    });
  });
});
