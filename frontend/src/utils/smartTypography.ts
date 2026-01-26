/**
 * Smart Typography Transformations
 *
 * Automatically applies typographic improvements as you type:
 * - Straight quotes → curly quotes
 * - -- → em dash (—)
 * - ... → ellipsis (…)
 */

export interface TypographyTransform {
  pattern: RegExp;
  replacement: string;
  /** Description of what this transform does */
  description: string;
}

/**
 * Typography transformations applied during typing
 * Order matters - more specific patterns should come first
 */
export const TYPOGRAPHY_TRANSFORMS: TypographyTransform[] = [
  // Em dash: -- becomes —
  {
    pattern: /--/g,
    replacement: '—',
    description: 'Double hyphen to em dash',
  },
  // Ellipsis: ... becomes …
  {
    pattern: /\.\.\./g,
    replacement: '…',
    description: 'Three dots to ellipsis',
  },
];

/**
 * Quote transformation context for determining opening vs closing quotes
 */
interface QuoteContext {
  isOpening: boolean;
  position: number;
}

/**
 * Determines if a quote at a given position should be an opening or closing quote
 */
function getQuoteContext(text: string, position: number): QuoteContext {
  const charBefore = position > 0 ? text[position - 1] : '';
  const charAfter = position < text.length - 1 ? text[position + 1] : '';

  // Opening quote conditions:
  // - Start of text
  // - After whitespace
  // - After opening punctuation: ( [ {
  const isAfterSpace = /\s/.test(charBefore) || charBefore === '';
  const isAfterOpenPunct = /[(\\[{]/.test(charBefore);

  // Closing quote conditions:
  // - Before whitespace
  // - Before closing punctuation
  // - Before period, comma, etc.
  const isBeforeSpace = /\s/.test(charAfter) || charAfter === '';
  const isBeforeClosePunct = /[)\]}.,:;!?]/.test(charAfter);

  // If after space/open-punct, it's opening
  // If before space/close-punct, it's closing
  // Default to opening if ambiguous at start, closing if ambiguous at end
  const isOpening = isAfterSpace || isAfterOpenPunct ||
    (!isBeforeSpace && !isBeforeClosePunct);

  return { isOpening, position };
}

/**
 * Converts straight quotes to curly quotes in the given text
 */
export function convertQuotes(text: string): string {
  let result = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      const context = getQuoteContext(text, i);
      result += context.isOpening ? '\u201C' : '\u201D';
    } else if (char === "'") {
      // For single quotes, we need to be careful about apostrophes
      const charBefore = i > 0 ? text[i - 1] : '';
      const charAfter = i < text.length - 1 ? text[i + 1] : '';

      // If surrounded by letters, it's likely an apostrophe (contraction)
      const isApostrophe = /[a-zA-Z]/.test(charBefore) && /[a-zA-Z]/.test(charAfter);

      if (isApostrophe) {
        // Apostrophe - use right single quote
        result += '\u2019';
      } else {
        const context = getQuoteContext(text, i);
        result += context.isOpening ? '\u2018' : '\u2019';
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Applies non-quote typography transformations (dashes, ellipsis)
 */
export function applyBasicTransforms(text: string): string {
  let result = text;

  for (const transform of TYPOGRAPHY_TRANSFORMS) {
    result = result.replace(transform.pattern, transform.replacement);
  }

  return result;
}

/**
 * Applies all typography transformations to the given text
 */
export function applySmartTypography(text: string): string {
  // First apply basic transforms (dashes, ellipsis)
  let result = applyBasicTransforms(text);
  // Then convert quotes
  result = convertQuotes(result);
  return result;
}

/**
 * Checks if a position in text is inside a code fence (``` ... ```)
 */
export function isInsideCodeFence(text: string, position: number): boolean {
  // Find all code fence markers
  const fencePattern = /```/g;
  let match;
  let fenceCount = 0;

  while ((match = fencePattern.exec(text)) !== null) {
    if (match.index >= position) {
      break;
    }
    fenceCount++;
  }

  // If we've passed an odd number of fences, we're inside a code block
  return fenceCount % 2 === 1;
}

/**
 * Checks if a position in text is inside inline code (` ... `)
 * This is more complex because we need to handle nested and escaped backticks
 */
export function isInsideInlineCode(text: string, position: number): boolean {
  let inCode = false;

  for (let i = 0; i < position && i < text.length; i++) {
    const char = text[i];

    // Check for code fence (skip it - handled separately)
    if (text.slice(i, i + 3) === '```') {
      // Skip the entire code fence
      i += 2;
      continue;
    }

    // Single backtick toggles inline code state
    if (char === '`') {
      inCode = !inCode;
    }
  }

  return inCode;
}

/**
 * Checks if a position is inside any code context (fence or inline)
 */
export function isInsideCode(text: string, position: number): boolean {
  return isInsideCodeFence(text, position) || isInsideInlineCode(text, position);
}

/**
 * Finds the range of newly typed text that should be transformed.
 * Returns null if no transformation is needed.
 *
 * To properly detect patterns like '--' or '...', we need to look back
 * a few characters before the change point since the user may have typed
 * just one character that completes a multi-character pattern.
 */
export function findTransformableRange(
  oldText: string,
  newText: string,
  cursorPosition: number
): { start: number; end: number; text: string } | null {
  // Find where the text differs
  let diffStart = 0;
  while (diffStart < oldText.length && diffStart < newText.length && oldText[diffStart] === newText[diffStart]) {
    diffStart++;
  }

  // The changed portion is from diffStart to cursorPosition in newText
  if (diffStart >= cursorPosition) {
    return null;
  }

  // Look back a few characters to catch patterns like '--' or '...'
  // Maximum pattern length we care about is 3 (for '...')
  const lookbackAmount = Math.min(3, diffStart);
  const rangeStart = diffStart - lookbackAmount;

  return {
    start: rangeStart,
    end: cursorPosition,
    text: newText.slice(rangeStart, cursorPosition),
  };
}

/**
 * Applies smart typography to only the recently typed portion of text,
 * respecting code block boundaries.
 */
export function applySmartTypographyToInput(
  previousText: string,
  currentText: string,
  cursorPosition: number
): { text: string; newCursorPosition: number } | null {
  // Don't transform if cursor is in a code block
  if (isInsideCode(currentText, cursorPosition)) {
    return null;
  }

  // Find what was typed
  const range = findTransformableRange(previousText, currentText, cursorPosition);
  if (!range) {
    return null;
  }

  // Don't transform if the typed range starts in a code block
  if (isInsideCode(currentText, range.start)) {
    return null;
  }

  // Apply transformations to the typed portion
  const transformedPortion = applySmartTypography(range.text);

  // If no change, return null
  if (transformedPortion === range.text) {
    return null;
  }

  // Build the new text
  const newText =
    currentText.slice(0, range.start) +
    transformedPortion +
    currentText.slice(range.end);

  // Calculate new cursor position
  const lengthDiff = transformedPortion.length - range.text.length;
  const newCursorPosition = cursorPosition + lengthDiff;

  return { text: newText, newCursorPosition };
}

/**
 * Reverses smart typography transformations (for undo scenarios)
 */
export function reverseTypography(text: string): string {
  return text
    // Em dash back to double hyphen
    .replace(/\u2014/g, '--')
    // Ellipsis back to three dots
    .replace(/\u2026/g, '...')
    // Curly double quotes back to straight
    .replace(/[\u201C\u201D]/g, '"')
    // Curly single quotes back to straight (including apostrophes)
    .replace(/[\u2018\u2019]/g, "'");
}
