import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FindReplaceDialog } from '../FindReplaceDialog';
import { useFindReplaceStore } from '../../stores/findReplace';

// Mock matchMedia for reduced motion detection
const mockMatchMedia = (prefersReducedMotion: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)' && prefersReducedMotion,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Helper to create a mock textarea element
const createMockTextarea = (value: string): HTMLTextAreaElement => {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  Object.defineProperty(textarea, 'selectionStart', {
    writable: true,
    value: 0,
  });
  Object.defineProperty(textarea, 'selectionEnd', {
    writable: true,
    value: 0,
  });
  textarea.setSelectionRange = vi.fn((start, end) => {
    Object.defineProperty(textarea, 'selectionStart', {
      writable: true,
      value: start,
    });
    Object.defineProperty(textarea, 'selectionEnd', {
      writable: true,
      value: end,
    });
  });
  textarea.focus = vi.fn();
  document.body.appendChild(textarea);
  return textarea;
};

describe('FindReplaceDialog', () => {
  beforeEach(() => {
    // Reset store state before each test
    useFindReplaceStore.setState({
      isOpen: false,
      showReplaceMode: false,
      searchText: '',
      replaceText: '',
      matchCase: false,
      useRegex: false,
      wholeWord: false,
      matches: [],
      currentMatchIndex: -1,
      targetElement: null,
      undoStack: [],
    });
    mockMatchMedia(false);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Clean up any textareas
    document.querySelectorAll('textarea').forEach((el) => el.remove());
  });

  it('does not render when not open', () => {
    render(<FindReplaceDialog />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    useFindReplaceStore.setState({ isOpen: true, showReplaceMode: true });

    render(<FindReplaceDialog />);
    expect(screen.getByRole('dialog', { name: 'Find and Replace' })).toBeInTheDocument();
    expect(screen.getByText('Find & Replace')).toBeInTheDocument();
  });

  it('shows search and replace inputs', () => {
    useFindReplaceStore.setState({ isOpen: true, showReplaceMode: true });

    render(<FindReplaceDialog />);
    expect(screen.getByLabelText('Search text')).toBeInTheDocument();
    expect(screen.getByLabelText('Replace text')).toBeInTheDocument();
  });

  it('shows option toggles', () => {
    useFindReplaceStore.setState({ isOpen: true });

    render(<FindReplaceDialog />);
    expect(screen.getByTitle('Match case (Aa)')).toBeInTheDocument();
    expect(screen.getByTitle('Whole word')).toBeInTheDocument();
    expect(screen.getByTitle('Regular expression')).toBeInTheDocument();
  });

  it('shows keyboard hints', () => {
    useFindReplaceStore.setState({ isOpen: true });

    render(<FindReplaceDialog />);
    expect(screen.getByText('Enter: Next')).toBeInTheDocument();
    expect(screen.getByText('Shift+Enter: Previous')).toBeInTheDocument();
    expect(screen.getByText('Esc: Close')).toBeInTheDocument();
  });

  it('shows "No matches" when no search text', () => {
    useFindReplaceStore.setState({ isOpen: true });

    render(<FindReplaceDialog />);
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('updates search text and finds matches', async () => {
    const textarea = createMockTextarea('hello world hello');

    useFindReplaceStore.setState({
      isOpen: true,
      targetElement: textarea,
    });

    render(<FindReplaceDialog />);

    const searchInput = screen.getByLabelText('Search text');
    fireEvent.change(searchInput, { target: { value: 'hello' } });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('navigates to next match', async () => {
    const textarea = createMockTextarea('hello world hello');

    useFindReplaceStore.setState({
      isOpen: true,
      targetElement: textarea,
      searchText: 'hello',
      matches: [
        { index: 0, start: 0, end: 5, text: 'hello' },
        { index: 1, start: 12, end: 17, text: 'hello' },
      ],
      currentMatchIndex: 0,
    });

    render(<FindReplaceDialog />);

    const nextButton = screen.getByLabelText('Next match');
    fireEvent.click(nextButton);

    expect(useFindReplaceStore.getState().currentMatchIndex).toBe(1);
  });

  it('navigates to previous match', async () => {
    const textarea = createMockTextarea('hello world hello');

    useFindReplaceStore.setState({
      isOpen: true,
      targetElement: textarea,
      searchText: 'hello',
      matches: [
        { index: 0, start: 0, end: 5, text: 'hello' },
        { index: 1, start: 12, end: 17, text: 'hello' },
      ],
      currentMatchIndex: 1,
    });

    render(<FindReplaceDialog />);

    const prevButton = screen.getByLabelText('Previous match');
    fireEvent.click(prevButton);

    expect(useFindReplaceStore.getState().currentMatchIndex).toBe(0);
  });

  it('replaces current match', async () => {
    const textarea = createMockTextarea('hello world');

    useFindReplaceStore.setState({
      isOpen: true,
      showReplaceMode: true,
      targetElement: textarea,
      searchText: 'hello',
      replaceText: 'goodbye',
      matches: [{ index: 0, start: 0, end: 5, text: 'hello' }],
      currentMatchIndex: 0,
    });

    render(<FindReplaceDialog />);

    const replaceButton = screen.getByText('Replace');
    fireEvent.click(replaceButton);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(textarea.value).toBe('goodbye world');
  });

  it('replaces all matches', async () => {
    const textarea = createMockTextarea('hello world hello');

    useFindReplaceStore.setState({
      isOpen: true,
      showReplaceMode: true,
      targetElement: textarea,
      searchText: 'hello',
      replaceText: 'goodbye',
      matches: [
        { index: 0, start: 0, end: 5, text: 'hello' },
        { index: 1, start: 12, end: 17, text: 'hello' },
      ],
      currentMatchIndex: 0,
    });

    render(<FindReplaceDialog />);

    const replaceAllButton = screen.getByText('All');
    fireEvent.click(replaceAllButton);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(textarea.value).toBe('goodbye world goodbye');
  });

  it('closes dialog when close button is clicked', () => {
    useFindReplaceStore.setState({ isOpen: true });

    render(<FindReplaceDialog />);

    const closeButton = screen.getByLabelText('Close dialog');
    fireEvent.click(closeButton);

    expect(useFindReplaceStore.getState().isOpen).toBe(false);
  });

  describe('Keyboard shortcuts', () => {
    it('closes dialog on Escape', () => {
      useFindReplaceStore.setState({ isOpen: true });

      render(<FindReplaceDialog />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(useFindReplaceStore.getState().isOpen).toBe(false);
    });

    it('navigates to next match on Enter', () => {
      const textarea = createMockTextarea('hello world hello');

      useFindReplaceStore.setState({
        isOpen: true,
        targetElement: textarea,
        searchText: 'hello',
        matches: [
          { index: 0, start: 0, end: 5, text: 'hello' },
          { index: 1, start: 12, end: 17, text: 'hello' },
        ],
        currentMatchIndex: 0,
      });

      render(<FindReplaceDialog />);

      fireEvent.keyDown(window, { key: 'Enter' });

      expect(useFindReplaceStore.getState().currentMatchIndex).toBe(1);
    });

    it('navigates to previous match on Shift+Enter', () => {
      const textarea = createMockTextarea('hello world hello');

      useFindReplaceStore.setState({
        isOpen: true,
        targetElement: textarea,
        searchText: 'hello',
        matches: [
          { index: 0, start: 0, end: 5, text: 'hello' },
          { index: 1, start: 12, end: 17, text: 'hello' },
        ],
        currentMatchIndex: 1,
      });

      render(<FindReplaceDialog />);

      fireEvent.keyDown(window, { key: 'Enter', shiftKey: true });

      expect(useFindReplaceStore.getState().currentMatchIndex).toBe(0);
    });
  });

  describe('Search options', () => {
    it('toggles case-sensitive search', async () => {
      const textarea = createMockTextarea('Hello world hello');

      useFindReplaceStore.setState({
        isOpen: true,
        targetElement: textarea,
        matchCase: false,
      });

      render(<FindReplaceDialog />);

      // Set search text to trigger findMatches
      useFindReplaceStore.getState().setSearchText('hello');

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Initially finds both (case-insensitive)
      expect(useFindReplaceStore.getState().matches.length).toBe(2);

      // Toggle case-sensitive
      const caseToggle = screen.getByTitle('Match case (Aa)');
      fireEvent.click(caseToggle);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Should only find lowercase
      expect(useFindReplaceStore.getState().matches.length).toBe(1);
    });

    it('toggles whole word search', async () => {
      const textarea = createMockTextarea('hello helloworld hello');

      useFindReplaceStore.setState({
        isOpen: true,
        targetElement: textarea,
        wholeWord: false,
      });

      render(<FindReplaceDialog />);

      // Set search text to trigger findMatches
      useFindReplaceStore.getState().setSearchText('hello');

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Initially finds all occurrences
      expect(useFindReplaceStore.getState().matches.length).toBe(3);

      // Toggle whole word
      const wholeWordToggle = screen.getByTitle('Whole word');
      fireEvent.click(wholeWordToggle);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Should only find standalone words
      expect(useFindReplaceStore.getState().matches.length).toBe(2);
    });

    it('toggles regex search', async () => {
      const textarea = createMockTextarea('hello123 world456');

      useFindReplaceStore.setState({
        isOpen: true,
        targetElement: textarea,
        searchText: '\\d+',
        useRegex: false,
      });

      render(<FindReplaceDialog />);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Initially searches literal (no matches for \d+)
      expect(useFindReplaceStore.getState().matches.length).toBe(0);

      // Toggle regex
      const regexToggle = screen.getByTitle('Regular expression');
      fireEvent.click(regexToggle);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      // Should find numbers
      expect(useFindReplaceStore.getState().matches.length).toBe(2);
    });
  });

  describe('Undo functionality', () => {
    it('adds to undo stack when replacing', async () => {
      const textarea = createMockTextarea('hello world');

      useFindReplaceStore.setState({
        isOpen: true,
        showReplaceMode: true,
        targetElement: textarea,
        searchText: 'hello',
        replaceText: 'goodbye',
        matches: [{ index: 0, start: 0, end: 5, text: 'hello' }],
        currentMatchIndex: 0,
      });

      render(<FindReplaceDialog />);

      const replaceButton = screen.getByText('Replace');
      fireEvent.click(replaceButton);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(useFindReplaceStore.getState().undoStack.length).toBe(1);
    });

    it('can undo a replacement with Ctrl+Z', async () => {
      const textarea = createMockTextarea('hello world');
      document.body.appendChild(textarea);
      Object.defineProperty(document, 'activeElement', {
        value: textarea,
        writable: true,
        configurable: true,
      });

      useFindReplaceStore.setState({
        isOpen: true,
        showReplaceMode: true,
        targetElement: textarea,
        searchText: 'hello',
        replaceText: 'goodbye',
        matches: [{ index: 0, start: 0, end: 5, text: 'hello' }],
        currentMatchIndex: 0,
      });

      render(<FindReplaceDialog />);

      // First replace
      const replaceButton = screen.getByText('Replace');
      fireEvent.click(replaceButton);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(textarea.value).toBe('goodbye world');
      expect(useFindReplaceStore.getState().undoStack.length).toBe(1);

      // Now undo
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(textarea.value).toBe('hello world');
      expect(useFindReplaceStore.getState().undoStack.length).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      useFindReplaceStore.setState({ isOpen: true });

      render(<FindReplaceDialog />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Find and Replace');
      expect(dialog).toHaveAttribute('aria-modal', 'false');
    });

    it('has accessible close button', () => {
      useFindReplaceStore.setState({ isOpen: true });

      render(<FindReplaceDialog />);

      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
    });

    it('has live region for match count', () => {
      useFindReplaceStore.setState({ isOpen: true });

      render(<FindReplaceDialog />);

      const matchCount = screen.getByText('No matches');
      expect(matchCount).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Reduced Motion', () => {
    it('respects reduced motion preferences', () => {
      mockMatchMedia(true);

      useFindReplaceStore.setState({ isOpen: true });

      render(<FindReplaceDialog />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});

describe('FindReplace Store', () => {
  beforeEach(() => {
    useFindReplaceStore.setState({
      isOpen: false,
      showReplaceMode: false,
      searchText: '',
      replaceText: '',
      matchCase: false,
      useRegex: false,
      wholeWord: false,
      matches: [],
      currentMatchIndex: -1,
      targetElement: null,
      undoStack: [],
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.querySelectorAll('textarea').forEach((el) => el.remove());
  });

  it('openDialog sets correct state', () => {
    const textarea = createMockTextarea('test');

    useFindReplaceStore.getState().openDialog(textarea);

    const state = useFindReplaceStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.targetElement).toBe(textarea);
  });

  it('closeDialog resets state', () => {
    useFindReplaceStore.setState({
      isOpen: true,
      matches: [{ index: 0, start: 0, end: 5, text: 'hello' }],
      currentMatchIndex: 0,
    });

    useFindReplaceStore.getState().closeDialog();

    const state = useFindReplaceStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.matches).toEqual([]);
    expect(state.currentMatchIndex).toBe(-1);
  });

  it('setSearchText triggers findMatches', async () => {
    const textarea = createMockTextarea('hello world hello');

    useFindReplaceStore.setState({
      isOpen: true,
      targetElement: textarea,
    });

    useFindReplaceStore.getState().setSearchText('hello');

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(useFindReplaceStore.getState().matches.length).toBe(2);
  });

  it('findMatches handles invalid regex gracefully', async () => {
    const textarea = createMockTextarea('hello world');

    useFindReplaceStore.setState({
      isOpen: true,
      targetElement: textarea,
      useRegex: true,
      searchText: '[invalid',
    });

    useFindReplaceStore.getState().findMatches();

    const state = useFindReplaceStore.getState();
    expect(state.matches).toEqual([]);
    expect(state.currentMatchIndex).toBe(-1);
  });

  it('goToNextMatch wraps around', () => {
    useFindReplaceStore.setState({
      matches: [
        { index: 0, start: 0, end: 5, text: 'hello' },
        { index: 1, start: 12, end: 17, text: 'hello' },
      ],
      currentMatchIndex: 1,
      targetElement: createMockTextarea('hello world hello'),
    });

    useFindReplaceStore.getState().goToNextMatch();

    expect(useFindReplaceStore.getState().currentMatchIndex).toBe(0);
  });

  it('goToPreviousMatch wraps around', () => {
    useFindReplaceStore.setState({
      matches: [
        { index: 0, start: 0, end: 5, text: 'hello' },
        { index: 1, start: 12, end: 17, text: 'hello' },
      ],
      currentMatchIndex: 0,
      targetElement: createMockTextarea('hello world hello'),
    });

    useFindReplaceStore.getState().goToPreviousMatch();

    expect(useFindReplaceStore.getState().currentMatchIndex).toBe(1);
  });

  describe('Regex search', () => {
    it('finds regex patterns', async () => {
      const textarea = createMockTextarea('hello123 world456');

      useFindReplaceStore.setState({
        isOpen: true,
        targetElement: textarea,
        useRegex: true,
        searchText: '\\d+',
      });

      useFindReplaceStore.getState().findMatches();

      const state = useFindReplaceStore.getState();
      expect(state.matches.length).toBe(2);
      expect(state.matches[0].text).toBe('123');
      expect(state.matches[1].text).toBe('456');
    });

    it('replaces with regex patterns', async () => {
      const textarea = createMockTextarea('hello123 world456');

      useFindReplaceStore.setState({
        isOpen: true,
        targetElement: textarea,
        useRegex: true,
        searchText: '\\d+',
        replaceText: 'XXX',
      });

      useFindReplaceStore.getState().replaceAllMatches();

      expect(textarea.value).toBe('helloXXX worldXXX');
    });
  });
});
