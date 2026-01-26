import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AIRewriteToolbar } from '../AIRewriteToolbar';
import { useAIRewriteStore, REWRITE_OPTIONS } from '../../stores/aiRewrite';

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
    value: value.length,
  });
  textarea.setSelectionRange = vi.fn();
  textarea.focus = vi.fn();
  document.body.appendChild(textarea);
  return textarea;
};

describe('AIRewriteToolbar', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAIRewriteStore.setState({
      isActive: false,
      selectedText: '',
      selectionStart: 0,
      selectionEnd: 0,
      targetElement: null,
      isLoading: false,
      previewText: null,
      originalText: '',
      error: null,
      ghostPreviewInfo: null,
      undoStack: [],
      toolbarPosition: null,
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

  it('does not render when not active', () => {
    render(<AIRewriteToolbar />);
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('renders toolbar when active with selected text', () => {
    const textarea = createMockTextarea('Hello world');

    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'Hello world',
      selectionStart: 0,
      selectionEnd: 11,
      targetElement: textarea,
      toolbarPosition: { top: 100, left: 200 },
    });

    render(<AIRewriteToolbar />);
    expect(screen.getByRole('toolbar', { name: 'AI rewrite options' })).toBeInTheDocument();
    expect(screen.getByText('AI Rewrite')).toBeInTheDocument();
  });

  it('shows all rewrite options', () => {
    const textarea = createMockTextarea('Test text');

    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'Test text',
      selectionStart: 0,
      selectionEnd: 9,
      targetElement: textarea,
      toolbarPosition: { top: 100, left: 200 },
    });

    render(<AIRewriteToolbar />);

    REWRITE_OPTIONS.forEach((option) => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
      expect(screen.getByText(option.description)).toBeInTheDocument();
    });
  });

  it('shows loading state when rewriting', () => {
    const textarea = createMockTextarea('Test');

    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'Test',
      selectionStart: 0,
      selectionEnd: 4,
      targetElement: textarea,
      isLoading: true,
      toolbarPosition: { top: 100, left: 200 },
    });

    render(<AIRewriteToolbar />);
    expect(screen.getByText('Rewriting...')).toBeInTheDocument();
    expect(document.querySelectorAll('.ai-rewrite-dot')).toHaveLength(3);
  });

  it('shows preview when rewrite is complete', () => {
    const textarea = createMockTextarea('Original text');

    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'Original text',
      selectionStart: 0,
      selectionEnd: 13,
      targetElement: textarea,
      isLoading: false,
      previewText: 'Rewritten text',
      toolbarPosition: { top: 100, left: 200 },
    });

    render(<AIRewriteToolbar />);
    expect(screen.getByText('Preview:')).toBeInTheDocument();
    expect(screen.getByText('Original:')).toBeInTheDocument();
    expect(screen.getByText('Original text')).toBeInTheDocument();
    expect(screen.getByText('New:')).toBeInTheDocument();
    expect(screen.getByText('Rewritten text')).toBeInTheDocument();
  });

  it('shows Apply and Cancel buttons in preview mode', () => {
    const textarea = createMockTextarea('Text');

    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'Text',
      selectionStart: 0,
      selectionEnd: 4,
      targetElement: textarea,
      previewText: 'New text',
      toolbarPosition: { top: 100, left: 200 },
    });

    render(<AIRewriteToolbar />);
    expect(screen.getByText('Apply')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows keyboard hints in preview mode', () => {
    const textarea = createMockTextarea('Text');

    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'Text',
      selectionStart: 0,
      selectionEnd: 4,
      targetElement: textarea,
      previewText: 'New text',
      toolbarPosition: { top: 100, left: 200 },
    });

    render(<AIRewriteToolbar />);
    expect(screen.getByText('Enter')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });

  it('calls requestRewrite when option is clicked', async () => {
    const textarea = createMockTextarea('Test text');

    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'Test text',
      selectionStart: 0,
      selectionEnd: 9,
      targetElement: textarea,
      toolbarPosition: { top: 100, left: 200 },
    });

    render(<AIRewriteToolbar />);

    const shorterButton = screen.getByRole('menuitem', { name: /Shorter/i });
    fireEvent.click(shorterButton);

    expect(useAIRewriteStore.getState().isLoading).toBe(true);

    // Wait for the mock rewrite to complete
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(useAIRewriteStore.getState().isLoading).toBe(false);
    expect(useAIRewriteStore.getState().previewText).toBeTruthy();
  });

  it('hides toolbar when close button is clicked', () => {
    const textarea = createMockTextarea('Test');

    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'Test',
      selectionStart: 0,
      selectionEnd: 4,
      targetElement: textarea,
      toolbarPosition: { top: 100, left: 200 },
    });

    render(<AIRewriteToolbar />);

    const closeButton = screen.getByLabelText('Close toolbar');
    fireEvent.click(closeButton);

    expect(useAIRewriteStore.getState().isActive).toBe(false);
  });

  it('cancels preview when cancel button is clicked', () => {
    const textarea = createMockTextarea('Text');

    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'Text',
      selectionStart: 0,
      selectionEnd: 4,
      targetElement: textarea,
      previewText: 'New text',
      toolbarPosition: { top: 100, left: 200 },
    });

    render(<AIRewriteToolbar />);

    const cancelButton = screen.getByLabelText(/Cancel preview/i);
    fireEvent.click(cancelButton);

    expect(useAIRewriteStore.getState().previewText).toBeNull();
    // Toolbar should still be active
    expect(useAIRewriteStore.getState().isActive).toBe(true);
  });

  it('shows error state', () => {
    const textarea = createMockTextarea('Text');

    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'Text',
      selectionStart: 0,
      selectionEnd: 4,
      targetElement: textarea,
      error: 'Failed to rewrite text',
      toolbarPosition: { top: 100, left: 200 },
    });

    render(<AIRewriteToolbar />);
    expect(screen.getByText('Failed to rewrite text')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('clears error when dismiss is clicked', () => {
    const textarea = createMockTextarea('Text');

    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'Text',
      selectionStart: 0,
      selectionEnd: 4,
      targetElement: textarea,
      error: 'Error message',
      toolbarPosition: { top: 100, left: 200 },
    });

    render(<AIRewriteToolbar />);

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    expect(useAIRewriteStore.getState().error).toBeNull();
  });

  describe('Keyboard shortcuts', () => {
    it('closes toolbar on Escape when no preview', () => {
      const textarea = createMockTextarea('Text');

      useAIRewriteStore.setState({
        isActive: true,
        selectedText: 'Text',
        selectionStart: 0,
        selectionEnd: 4,
        targetElement: textarea,
        toolbarPosition: { top: 100, left: 200 },
      });

      render(<AIRewriteToolbar />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(useAIRewriteStore.getState().isActive).toBe(false);
    });

    it('cancels preview on Escape when preview is shown', () => {
      const textarea = createMockTextarea('Text');

      useAIRewriteStore.setState({
        isActive: true,
        selectedText: 'Text',
        selectionStart: 0,
        selectionEnd: 4,
        targetElement: textarea,
        previewText: 'New text',
        toolbarPosition: { top: 100, left: 200 },
      });

      render(<AIRewriteToolbar />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(useAIRewriteStore.getState().previewText).toBeNull();
      // Toolbar should still be active
      expect(useAIRewriteStore.getState().isActive).toBe(true);
    });

    it('applies rewrite on Enter when preview is shown', () => {
      const textarea = createMockTextarea('Original');

      useAIRewriteStore.setState({
        isActive: true,
        selectedText: 'Original',
        selectionStart: 0,
        selectionEnd: 8,
        targetElement: textarea,
        previewText: 'New',
        toolbarPosition: { top: 100, left: 200 },
      });

      render(<AIRewriteToolbar />);

      fireEvent.keyDown(window, { key: 'Enter' });

      expect(textarea.value).toBe('New');
      expect(useAIRewriteStore.getState().isActive).toBe(false);
    });

    it('triggers rewrite option with number keys 1-4', async () => {
      const textarea = createMockTextarea('Test text');

      useAIRewriteStore.setState({
        isActive: true,
        selectedText: 'Test text',
        selectionStart: 0,
        selectionEnd: 9,
        targetElement: textarea,
        toolbarPosition: { top: 100, left: 200 },
      });

      render(<AIRewriteToolbar />);

      // Press '1' for Shorter
      fireEvent.keyDown(window, { key: '1' });

      expect(useAIRewriteStore.getState().isLoading).toBe(true);

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(useAIRewriteStore.getState().previewText).toBeTruthy();
    });
  });

  describe('Undo functionality', () => {
    it('adds to undo stack when applying rewrite', () => {
      const textarea = createMockTextarea('Original text');

      useAIRewriteStore.setState({
        isActive: true,
        selectedText: 'Original text',
        selectionStart: 0,
        selectionEnd: 13,
        targetElement: textarea,
        previewText: 'New text',
        toolbarPosition: { top: 100, left: 200 },
      });

      render(<AIRewriteToolbar />);

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      expect(useAIRewriteStore.getState().undoStack).toHaveLength(1);
    });

    it('can undo a rewrite with Cmd+Z', async () => {
      const textarea = createMockTextarea('Original text');
      textarea.focus = vi.fn();
      document.body.appendChild(textarea);
      // Set as active element
      Object.defineProperty(document, 'activeElement', {
        value: textarea,
        writable: true,
      });

      // First apply a rewrite
      useAIRewriteStore.setState({
        isActive: true,
        selectedText: 'Original text',
        selectionStart: 0,
        selectionEnd: 13,
        targetElement: textarea,
        previewText: 'New text',
        toolbarPosition: { top: 100, left: 200 },
      });

      render(<AIRewriteToolbar />);

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      expect(textarea.value).toBe('New text');
      expect(useAIRewriteStore.getState().undoStack).toHaveLength(1);

      // Now press Cmd+Z to undo
      fireEvent.keyDown(window, { key: 'z', metaKey: true });

      expect(textarea.value).toBe('Original text');
      expect(useAIRewriteStore.getState().undoStack).toHaveLength(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const textarea = createMockTextarea('Test');

      useAIRewriteStore.setState({
        isActive: true,
        selectedText: 'Test',
        selectionStart: 0,
        selectionEnd: 4,
        targetElement: textarea,
        toolbarPosition: { top: 100, left: 200 },
      });

      render(<AIRewriteToolbar />);

      expect(screen.getByRole('toolbar', { name: 'AI rewrite options' })).toBeInTheDocument();
      expect(screen.getByRole('menu', { name: 'Rewrite options' })).toBeInTheDocument();

      // Each option should be a menuitem
      REWRITE_OPTIONS.forEach((option) => {
        expect(
          screen.getByRole('menuitem', { name: new RegExp(option.label) })
        ).toBeInTheDocument();
      });
    });

    it('has accessible close button', () => {
      const textarea = createMockTextarea('Test');

      useAIRewriteStore.setState({
        isActive: true,
        selectedText: 'Test',
        selectionStart: 0,
        selectionEnd: 4,
        targetElement: textarea,
        toolbarPosition: { top: 100, left: 200 },
      });

      render(<AIRewriteToolbar />);

      expect(screen.getByLabelText('Close toolbar')).toBeInTheDocument();
    });

    it('error state has role alert', () => {
      const textarea = createMockTextarea('Test');

      useAIRewriteStore.setState({
        isActive: true,
        selectedText: 'Test',
        selectionStart: 0,
        selectionEnd: 4,
        targetElement: textarea,
        error: 'Error',
        toolbarPosition: { top: 100, left: 200 },
      });

      render(<AIRewriteToolbar />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Reduced Motion', () => {
    it('respects reduced motion preferences', () => {
      mockMatchMedia(true);
      const textarea = createMockTextarea('Test');

      useAIRewriteStore.setState({
        isActive: true,
        selectedText: 'Test',
        selectionStart: 0,
        selectionEnd: 4,
        targetElement: textarea,
        toolbarPosition: { top: 100, left: 200 },
      });

      render(<AIRewriteToolbar />);

      // The component should still render and be usable
      expect(screen.getByRole('toolbar')).toBeInTheDocument();
    });
  });
});

describe('AIRewrite Store', () => {
  beforeEach(() => {
    useAIRewriteStore.setState({
      isActive: false,
      selectedText: '',
      selectionStart: 0,
      selectionEnd: 0,
      targetElement: null,
      isLoading: false,
      previewText: null,
      originalText: '',
      error: null,
      ghostPreviewInfo: null,
      undoStack: [],
      toolbarPosition: null,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('showToolbar sets correct state', () => {
    const textarea = document.createElement('textarea') as HTMLTextAreaElement;

    useAIRewriteStore.getState().showToolbar('selected', 0, 8, textarea, { top: 100, left: 200 });

    const state = useAIRewriteStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.selectedText).toBe('selected');
    expect(state.selectionStart).toBe(0);
    expect(state.selectionEnd).toBe(8);
    expect(state.targetElement).toBe(textarea);
    expect(state.toolbarPosition).toEqual({ top: 100, left: 200 });
  });

  it('hideToolbar resets state', () => {
    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'test',
      previewText: 'preview',
    });

    useAIRewriteStore.getState().hideToolbar();

    const state = useAIRewriteStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.selectedText).toBe('');
    expect(state.previewText).toBeNull();
  });

  it('requestRewrite generates preview text', async () => {
    const textarea = document.createElement('textarea') as HTMLTextAreaElement;

    useAIRewriteStore.setState({
      isActive: true,
      selectedText: 'I think maybe this is good',
      selectionStart: 0,
      selectionEnd: 26,
      targetElement: textarea,
    });

    await act(async () => {
      useAIRewriteStore.getState().requestRewrite('stronger');
      await vi.runAllTimersAsync();
    });

    const state = useAIRewriteStore.getState();
    expect(state.isLoading).toBe(false);
    // 'stronger' removes hedging and replaces weak words
    expect(state.previewText).toBeTruthy();
  });

  it('cancelRewrite clears preview without hiding toolbar', () => {
    useAIRewriteStore.setState({
      isActive: true,
      previewText: 'preview',
      isLoading: false,
    });

    useAIRewriteStore.getState().cancelRewrite();

    const state = useAIRewriteStore.getState();
    expect(state.previewText).toBeNull();
    expect(state.isActive).toBe(true);
  });

  it('clearError clears error state', () => {
    useAIRewriteStore.setState({ error: 'Some error' });

    useAIRewriteStore.getState().clearError();

    expect(useAIRewriteStore.getState().error).toBeNull();
  });

  describe('Mock rewrite transformations', () => {
    beforeEach(() => {
      const textarea = document.createElement('textarea') as HTMLTextAreaElement;
      useAIRewriteStore.setState({
        isActive: true,
        selectedText: '',
        targetElement: textarea,
      });
    });

    it('shorter removes filler words', async () => {
      useAIRewriteStore.setState({ selectedText: 'I really just want to do this' });

      await act(async () => {
        useAIRewriteStore.getState().requestRewrite('shorter');
        await vi.runAllTimersAsync();
      });

      const preview = useAIRewriteStore.getState().previewText;
      expect(preview).not.toContain('really');
      expect(preview).not.toContain('just');
    });

    it('clearer simplifies complex phrases', async () => {
      useAIRewriteStore.setState({ selectedText: 'in order to do this' });

      await act(async () => {
        useAIRewriteStore.getState().requestRewrite('clearer');
        await vi.runAllTimersAsync();
      });

      const preview = useAIRewriteStore.getState().previewText;
      // 'clearer' replaces 'in order to' with 'to'
      expect(preview).toContain('to do this');
      expect(preview).not.toContain('in order to');
    });

    it('clearer fixes basic grammar issues', async () => {
      useAIRewriteStore.setState({ selectedText: 'i went to the store' });

      await act(async () => {
        useAIRewriteStore.getState().requestRewrite('clearer');
        await vi.runAllTimersAsync();
      });

      const preview = useAIRewriteStore.getState().previewText;
      // 'clearer' capitalizes standalone 'i' to 'I'
      expect(preview).toContain('I went');
    });

    it('stronger removes hedging language', async () => {
      useAIRewriteStore.setState({ selectedText: 'I think maybe this is good' });

      await act(async () => {
        useAIRewriteStore.getState().requestRewrite('stronger');
        await vi.runAllTimersAsync();
      });

      const preview = useAIRewriteStore.getState().previewText;
      // 'stronger' removes hedging words like 'I think' and 'maybe'
      expect(preview).not.toContain('I think');
      expect(preview).not.toContain('maybe');
    });

    it('stronger replaces weak words with strong alternatives', async () => {
      useAIRewriteStore.setState({ selectedText: 'this is a good and important feature' });

      await act(async () => {
        useAIRewriteStore.getState().requestRewrite('stronger');
        await vi.runAllTimersAsync();
      });

      const preview = useAIRewriteStore.getState().previewText;
      // 'stronger' replaces 'good' with 'excellent' and 'important' with 'critical'
      expect(preview).toContain('excellent');
      expect(preview).toContain('critical');
    });
  });
});
