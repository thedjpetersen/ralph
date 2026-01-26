import { create } from 'zustand';

export interface CodeLanguage {
  id: string;
  name: string;
  aliases?: string[];
}

export const SUPPORTED_LANGUAGES: CodeLanguage[] = [
  { id: 'plaintext', name: 'Plain Text', aliases: ['text', 'txt'] },
  { id: 'javascript', name: 'JavaScript', aliases: ['js'] },
  { id: 'typescript', name: 'TypeScript', aliases: ['ts'] },
  { id: 'jsx', name: 'JSX' },
  { id: 'tsx', name: 'TSX' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'scss', name: 'SCSS' },
  { id: 'json', name: 'JSON' },
  { id: 'markdown', name: 'Markdown', aliases: ['md'] },
  { id: 'python', name: 'Python', aliases: ['py'] },
  { id: 'java', name: 'Java' },
  { id: 'c', name: 'C' },
  { id: 'cpp', name: 'C++' },
  { id: 'csharp', name: 'C#', aliases: ['cs'] },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'ruby', name: 'Ruby', aliases: ['rb'] },
  { id: 'php', name: 'PHP' },
  { id: 'swift', name: 'Swift' },
  { id: 'kotlin', name: 'Kotlin' },
  { id: 'sql', name: 'SQL' },
  { id: 'bash', name: 'Bash', aliases: ['sh', 'shell'] },
  { id: 'yaml', name: 'YAML', aliases: ['yml'] },
  { id: 'xml', name: 'XML' },
  { id: 'graphql', name: 'GraphQL', aliases: ['gql'] },
  { id: 'diff', name: 'Diff' },
];

export interface CodeBlockState {
  /** Whether the language selector is visible */
  isLanguageSelectorOpen: boolean;
  /** Position for the language selector dropdown */
  selectorPosition: { top: number; left: number } | null;
  /** The target element for the code block */
  targetElement: HTMLTextAreaElement | HTMLInputElement | null;
  /** Callback to update the language */
  onLanguageSelect: ((language: string) => void) | null;
  /** Current line index where code block starts */
  codeBlockLineIndex: number;
  /** Search query for filtering languages */
  searchQuery: string;
  /** Currently selected index in filtered list */
  selectedIndex: number;

  /** Show the language selector */
  showLanguageSelector: (
    element: HTMLTextAreaElement | HTMLInputElement,
    position: { top: number; left: number },
    lineIndex: number,
    onSelect: (language: string) => void
  ) => void;

  /** Hide the language selector */
  hideLanguageSelector: () => void;

  /** Update search query */
  setSearchQuery: (query: string) => void;

  /** Update selected index */
  setSelectedIndex: (index: number) => void;
}

export const useCodeBlockStore = create<CodeBlockState>()((set) => ({
  isLanguageSelectorOpen: false,
  selectorPosition: null,
  targetElement: null,
  onLanguageSelect: null,
  codeBlockLineIndex: 0,
  searchQuery: '',
  selectedIndex: 0,

  showLanguageSelector: (element, position, lineIndex, onSelect) => {
    set({
      isLanguageSelectorOpen: true,
      selectorPosition: position,
      targetElement: element,
      codeBlockLineIndex: lineIndex,
      onLanguageSelect: onSelect,
      searchQuery: '',
      selectedIndex: 0,
    });
  },

  hideLanguageSelector: () => {
    set({
      isLanguageSelectorOpen: false,
      selectorPosition: null,
      targetElement: null,
      onLanguageSelect: null,
      codeBlockLineIndex: 0,
      searchQuery: '',
      selectedIndex: 0,
    });
  },

  setSearchQuery: (query: string) => {
    set({
      searchQuery: query,
      selectedIndex: 0,
    });
  },

  setSelectedIndex: (index: number) => {
    set({ selectedIndex: index });
  },
}));

/**
 * Parse code blocks from markdown text
 */
export interface ParsedCodeBlock {
  content: string;
  language: string;
  startLine: number;
  endLine: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse all code blocks from markdown text
 */
export function parseCodeBlocks(text: string): ParsedCodeBlock[] {
  const blocks: ParsedCodeBlock[] = [];
  const lines = text.split('\n');
  let inCodeBlock = false;
  let currentBlock: Partial<ParsedCodeBlock> = {};
  let currentContent: string[] = [];
  let currentIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        const language = trimmedLine.slice(3).trim() || 'plaintext';
        currentBlock = {
          language: normalizeLanguage(language),
          startLine: i,
          startIndex: currentIndex,
        };
        currentContent = [];
      } else {
        // End of code block
        inCodeBlock = false;
        blocks.push({
          content: currentContent.join('\n'),
          language: currentBlock.language || 'plaintext',
          startLine: currentBlock.startLine!,
          endLine: i,
          startIndex: currentBlock.startIndex!,
          endIndex: currentIndex + line.length,
        });
        currentBlock = {};
        currentContent = [];
      }
    } else if (inCodeBlock) {
      currentContent.push(line);
    }

    currentIndex += line.length + 1; // +1 for newline
  }

  return blocks;
}

/**
 * Normalize language identifier to a supported language
 */
export function normalizeLanguage(lang: string): string {
  const lowerLang = lang.toLowerCase().trim();

  // Find exact match or alias
  for (const language of SUPPORTED_LANGUAGES) {
    if (language.id === lowerLang) {
      return language.id;
    }
    if (language.aliases?.includes(lowerLang)) {
      return language.id;
    }
  }

  return 'plaintext';
}

/**
 * Insert a code block at the current cursor position
 */
export function insertCodeBlock(
  text: string,
  cursorPosition: number,
  language: string = ''
): { text: string; newCursorPosition: number } {
  const before = text.slice(0, cursorPosition);
  const after = text.slice(cursorPosition);

  // Add newline before if not at start of line
  const needsNewlineBefore = before.length > 0 && !before.endsWith('\n');
  const needsNewlineAfter = after.length > 0 && !after.startsWith('\n');

  const prefix = needsNewlineBefore ? '\n' : '';
  const suffix = needsNewlineAfter ? '\n' : '';

  const codeBlock = `${prefix}\`\`\`${language}\n\n\`\`\`${suffix}`;
  const newText = before + codeBlock + after;

  // Position cursor inside the code block (after the opening fence and newline)
  const newCursorPosition = cursorPosition + prefix.length + 3 + language.length + 1;

  return { text: newText, newCursorPosition };
}

/**
 * Wrap selected text in inline code
 */
export function wrapInInlineCode(
  text: string,
  selectionStart: number,
  selectionEnd: number
): { text: string; newSelectionStart: number; newSelectionEnd: number } {
  const before = text.slice(0, selectionStart);
  const selected = text.slice(selectionStart, selectionEnd);
  const after = text.slice(selectionEnd);

  const newText = `${before}\`${selected}\`${after}`;

  return {
    text: newText,
    newSelectionStart: selectionStart + 1,
    newSelectionEnd: selectionEnd + 1,
  };
}

/**
 * Check if cursor is at the start of a line (for detecting triple backtick)
 */
export function isAtLineStart(text: string, cursorPosition: number): boolean {
  if (cursorPosition === 0) return true;
  const charBefore = text[cursorPosition - 1];
  return charBefore === '\n';
}

/**
 * Get the current line content
 */
export function getCurrentLine(text: string, cursorPosition: number): { content: string; start: number; end: number } {
  let start = cursorPosition;
  let end = cursorPosition;

  // Find start of line
  while (start > 0 && text[start - 1] !== '\n') {
    start--;
  }

  // Find end of line
  while (end < text.length && text[end] !== '\n') {
    end++;
  }

  return {
    content: text.slice(start, end),
    start,
    end,
  };
}

/**
 * Check if the current line is a code fence opening
 */
export function isCodeFenceOpening(line: string): boolean {
  return /^```\w*$/.test(line.trim());
}

/**
 * Update the language of a code block
 */
export function updateCodeBlockLanguage(
  text: string,
  lineIndex: number,
  newLanguage: string
): string {
  const lines = text.split('\n');

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return text;
  }

  const line = lines[lineIndex];
  if (!line.trim().startsWith('```')) {
    return text;
  }

  lines[lineIndex] = '```' + newLanguage;
  return lines.join('\n');
}

// Selectors
const selectIsLanguageSelectorOpen = (state: CodeBlockState) => state.isLanguageSelectorOpen;
const selectSelectorPosition = (state: CodeBlockState) => state.selectorPosition;

export function useCodeBlock() {
  const isLanguageSelectorOpen = useCodeBlockStore(selectIsLanguageSelectorOpen);
  const selectorPosition = useCodeBlockStore(selectSelectorPosition);
  const { showLanguageSelector, hideLanguageSelector } = useCodeBlockStore.getState();

  return {
    isLanguageSelectorOpen,
    selectorPosition,
    showLanguageSelector,
    hideLanguageSelector,
  };
}
