import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { GhostTextTextarea } from '../GhostTextTextarea';
import { useAISuggestionStore } from '../../stores/aiSuggestions';
import { useImageUploadStore } from '../../stores/imageUpload';
import { useToastStore } from '../../stores/toast';

describe('GhostTextTextarea', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAISuggestionStore.setState({
      suggestions: new Map(),
      abortControllers: new Map(),
    });
    useImageUploadStore.setState({
      uploads: new Map(),
      isDragging: false,
    });
    useToastStore.setState({
      toasts: [],
      queue: [],
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders textarea with initial value', () => {
    const onChange = vi.fn();
    render(
      <GhostTextTextarea fieldId="test-notes" value="Initial text" onChange={onChange} />
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Initial text');
  });

  it('calls onChange when user types', () => {
    const onChange = vi.fn();
    render(<GhostTextTextarea fieldId="test-notes" value="" onChange={onChange} />);
    const textarea = screen.getByRole('textbox');

    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(onChange).toHaveBeenCalledWith('Hello');
  });

  it('shows loading indicator while fetching suggestion', async () => {
    const onChange = vi.fn();
    render(<GhostTextTextarea fieldId="test-notes" value="Hello" onChange={onChange} />);
    const textarea = screen.getByRole('textbox');

    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    // Fast-forward past debounce - use act to handle state updates
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // Check for loading indicator
    const dots = document.querySelectorAll('.ghost-text-dot');
    expect(dots).toHaveLength(3);
  });

  it('displays ghost text suggestion at 50% opacity', () => {
    const onChange = vi.fn();

    // Pre-populate with a suggestion
    useAISuggestionStore.setState({
      suggestions: new Map([
        [
          'test-notes',
          {
            id: 'suggestion-1',
            fieldId: 'test-notes',
            text: 'is a great day!',
            isLoading: false,
            error: null,
          },
        ],
      ]),
      abortControllers: new Map(),
    });

    render(<GhostTextTextarea fieldId="test-notes" value="Today " onChange={onChange} />);

    const ghostText = screen.getByTestId('ghost-text-suggestion');
    expect(ghostText).toBeInTheDocument();
    expect(ghostText.textContent).toBe('is a great day!');
    expect(ghostText).toHaveClass('ghost-text-suggestion');
  });

  it('accepts full suggestion with Tab key', async () => {
    const onChange = vi.fn();

    useAISuggestionStore.setState({
      suggestions: new Map([
        [
          'test-notes',
          {
            id: 'suggestion-1',
            fieldId: 'test-notes',
            text: ' is amazing!',
            isLoading: false,
            error: null,
          },
        ],
      ]),
      abortControllers: new Map(),
    });

    render(<GhostTextTextarea fieldId="test-notes" value="This" onChange={onChange} />);
    const textarea = screen.getByRole('textbox');

    fireEvent.keyDown(textarea, { key: 'Tab' });

    expect(onChange).toHaveBeenCalledWith('This is amazing!');
    // Suggestion should be cleared
    expect(useAISuggestionStore.getState().suggestions.has('test-notes')).toBe(false);
  });

  it('accepts partial suggestion word-by-word with Cmd+Right', async () => {
    const onChange = vi.fn();

    useAISuggestionStore.setState({
      suggestions: new Map([
        [
          'test-notes',
          {
            id: 'suggestion-1',
            fieldId: 'test-notes',
            text: 'hello world today',
            isLoading: false,
            error: null,
          },
        ],
      ]),
      abortControllers: new Map(),
    });

    render(<GhostTextTextarea fieldId="test-notes" value="Say " onChange={onChange} />);
    const textarea = screen.getByRole('textbox');

    // Accept first word with Cmd+Right
    fireEvent.keyDown(textarea, { key: 'ArrowRight', metaKey: true });

    expect(onChange).toHaveBeenCalledWith('Say hello ');
    // Remaining suggestion should still be there
    const remainingSuggestion = useAISuggestionStore.getState().suggestions.get('test-notes');
    expect(remainingSuggestion?.text).toBe('world today');
  });

  it('accepts partial suggestion with Ctrl+Right on non-Mac', async () => {
    const onChange = vi.fn();

    useAISuggestionStore.setState({
      suggestions: new Map([
        [
          'test-notes',
          {
            id: 'suggestion-1',
            fieldId: 'test-notes',
            text: 'word1 word2',
            isLoading: false,
            error: null,
          },
        ],
      ]),
      abortControllers: new Map(),
    });

    render(<GhostTextTextarea fieldId="test-notes" value="Test " onChange={onChange} />);
    const textarea = screen.getByRole('textbox');

    fireEvent.keyDown(textarea, { key: 'ArrowRight', ctrlKey: true });

    expect(onChange).toHaveBeenCalledWith('Test word1 ');
  });

  it('dismisses suggestion with Escape key', async () => {
    const onChange = vi.fn();

    useAISuggestionStore.setState({
      suggestions: new Map([
        [
          'test-notes',
          {
            id: 'suggestion-1',
            fieldId: 'test-notes',
            text: ' some suggestion',
            isLoading: false,
            error: null,
          },
        ],
      ]),
      abortControllers: new Map(),
    });

    render(<GhostTextTextarea fieldId="test-notes" value="Text" onChange={onChange} />);
    const textarea = screen.getByRole('textbox');

    fireEvent.keyDown(textarea, { key: 'Escape' });

    // onChange should not be called since we're dismissing, not accepting
    expect(onChange).not.toHaveBeenCalled();
    // Suggestion should be dismissed
    expect(useAISuggestionStore.getState().suggestions.has('test-notes')).toBe(false);
  });

  it('does not trigger suggestion when disabled', async () => {
    const onChange = vi.fn();
    render(
      <GhostTextTextarea
        fieldId="test-notes"
        value=""
        onChange={onChange}
        enableSuggestions={false}
      />
    );
    const textarea = screen.getByRole('textbox');

    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    // Fast-forward past debounce
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // No suggestion should be in the store
    expect(useAISuggestionStore.getState().suggestions.size).toBe(0);
  });

  it('uses custom debounce delay', async () => {
    const onChange = vi.fn();
    render(
      <GhostTextTextarea fieldId="test-notes" value="" onChange={onChange} debounceMs={1000} />
    );
    const textarea = screen.getByRole('textbox');

    fireEvent.change(textarea, { target: { value: 'Hello' } });

    // Should not trigger yet at 500ms
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(useAISuggestionStore.getState().suggestions.has('test-notes')).toBe(false);

    // Should trigger after 1000ms (total 1100ms)
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    const suggestion = useAISuggestionStore.getState().suggestions.get('test-notes');
    expect(suggestion).toBeDefined();
  });

  it('provides screen reader hint when suggestion is available', async () => {
    useAISuggestionStore.setState({
      suggestions: new Map([
        [
          'test-notes',
          {
            id: 'suggestion-1',
            fieldId: 'test-notes',
            text: 'suggested text',
            isLoading: false,
            error: null,
          },
        ],
      ]),
      abortControllers: new Map(),
    });

    render(<GhostTextTextarea fieldId="test-notes" value="Some " onChange={vi.fn()} />);

    const srHint = document.getElementById('test-notes-suggestion-hint');
    expect(srHint).toBeInTheDocument();
    expect(srHint).toHaveAttribute('role', 'status');
    expect(srHint?.textContent).toContain('AI suggestion available');
    expect(srHint?.textContent).toContain('Tab to accept all');
  });

  it('cleans up suggestion on unmount', async () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <GhostTextTextarea fieldId="test-notes" value="Hello" onChange={onChange} />
    );

    // Set a suggestion
    useAISuggestionStore.setState({
      suggestions: new Map([
        [
          'test-notes',
          {
            id: 'suggestion-1',
            fieldId: 'test-notes',
            text: ' world',
            isLoading: false,
            error: null,
          },
        ],
      ]),
      abortControllers: new Map(),
    });

    unmount();

    // Suggestion should be cleaned up
    expect(useAISuggestionStore.getState().suggestions.has('test-notes')).toBe(false);
  });

  it('does not accept suggestion while loading', async () => {
    const onChange = vi.fn();

    useAISuggestionStore.setState({
      suggestions: new Map([
        [
          'test-notes',
          {
            id: 'suggestion-1',
            fieldId: 'test-notes',
            text: '',
            isLoading: true,
            error: null,
          },
        ],
      ]),
      abortControllers: new Map(),
    });

    render(<GhostTextTextarea fieldId="test-notes" value="Test" onChange={onChange} />);
    const textarea = screen.getByRole('textbox');

    fireEvent.keyDown(textarea, { key: 'Tab' });

    // onChange should not be called since suggestion is loading
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not show ghost text while loading', () => {
    useAISuggestionStore.setState({
      suggestions: new Map([
        [
          'test-notes',
          {
            id: 'suggestion-1',
            fieldId: 'test-notes',
            text: 'loading...',
            isLoading: true,
            error: null,
          },
        ],
      ]),
      abortControllers: new Map(),
    });

    render(<GhostTextTextarea fieldId="test-notes" value="Test" onChange={vi.fn()} />);

    // Ghost text should not be visible
    expect(screen.queryByTestId('ghost-text-suggestion')).not.toBeInTheDocument();

    // Loading indicator should be visible
    const dots = document.querySelectorAll('.ghost-text-dot');
    expect(dots).toHaveLength(3);
  });

  it('passes through standard textarea props', () => {
    render(
      <GhostTextTextarea
        fieldId="test-notes"
        value="Test"
        onChange={vi.fn()}
        placeholder="Enter notes..."
        maxLength={500}
        rows={5}
        disabled
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder', 'Enter notes...');
    expect(textarea).toHaveAttribute('maxLength', '500');
    expect(textarea).toHaveAttribute('rows', '5');
    expect(textarea).toBeDisabled();
  });

  it('calls original onKeyDown handler if provided', () => {
    const onKeyDown = vi.fn();
    const onChange = vi.fn();

    useAISuggestionStore.setState({
      suggestions: new Map([
        [
          'test-notes',
          {
            id: 'suggestion-1',
            fieldId: 'test-notes',
            text: ' suggestion',
            isLoading: false,
            error: null,
          },
        ],
      ]),
      abortControllers: new Map(),
    });

    render(
      <GhostTextTextarea
        fieldId="test-notes"
        value="Test"
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Tab' });

    // Original handler should be called
    expect(onKeyDown).toHaveBeenCalled();
    // But suggestion should still be accepted
    expect(onChange).toHaveBeenCalledWith('Test suggestion');
  });

  describe('Word-by-word acceptance', () => {
    it('handles single word suggestions', () => {
      const onChange = vi.fn();

      useAISuggestionStore.setState({
        suggestions: new Map([
          [
            'test-notes',
            {
              id: 'suggestion-1',
              fieldId: 'test-notes',
              text: 'word',
              isLoading: false,
              error: null,
            },
          ],
        ]),
        abortControllers: new Map(),
      });

      render(<GhostTextTextarea fieldId="test-notes" value="Single " onChange={onChange} />);
      const textarea = screen.getByRole('textbox');

      fireEvent.keyDown(textarea, { key: 'ArrowRight', metaKey: true });

      expect(onChange).toHaveBeenCalledWith('Single word');
      // Suggestion should be cleared since it was the only word
      expect(useAISuggestionStore.getState().suggestions.has('test-notes')).toBe(false);
    });

    it('handles punctuation in suggestions', () => {
      const onChange = vi.fn();

      useAISuggestionStore.setState({
        suggestions: new Map([
          [
            'test-notes',
            {
              id: 'suggestion-1',
              fieldId: 'test-notes',
              text: 'Hello, world!',
              isLoading: false,
              error: null,
            },
          ],
        ]),
        abortControllers: new Map(),
      });

      render(<GhostTextTextarea fieldId="test-notes" value="" onChange={onChange} />);
      const textarea = screen.getByRole('textbox');

      fireEvent.keyDown(textarea, { key: 'ArrowRight', metaKey: true });

      expect(onChange).toHaveBeenCalledWith('Hello, ');
    });
  });

  describe('Continue writing (Cmd+Shift+Enter)', () => {
    it('triggers continue writing with Cmd+Shift+Enter', async () => {
      const onChange = vi.fn();
      render(
        <GhostTextTextarea fieldId="test-notes" value="This is my document." onChange={onChange} />
      );
      const textarea = screen.getByRole('textbox');

      // Trigger continue writing
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true, shiftKey: true });

      // Should show loading indicator
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      const dots = document.querySelectorAll('.ghost-text-dot');
      expect(dots).toHaveLength(3);

      // Wait for suggestion to complete
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should have a suggestion now
      const suggestion = useAISuggestionStore.getState().suggestions.get('test-notes');
      expect(suggestion).toBeDefined();
      expect(suggestion?.text).toBeTruthy();
      expect(suggestion?.isLoading).toBe(false);
    });

    it('triggers continue writing with Ctrl+Shift+Enter', async () => {
      const onChange = vi.fn();
      render(
        <GhostTextTextarea fieldId="test-notes" value="Testing continue writing." onChange={onChange} />
      );
      const textarea = screen.getByRole('textbox');

      // Trigger continue writing with Ctrl (for non-Mac)
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true, shiftKey: true });

      // Wait for suggestion to complete
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should have a suggestion now
      const suggestion = useAISuggestionStore.getState().suggestions.get('test-notes');
      expect(suggestion).toBeDefined();
      expect(suggestion?.text).toBeTruthy();
    });

    it('does not trigger continue writing on empty text', async () => {
      const onChange = vi.fn();
      render(<GhostTextTextarea fieldId="test-notes" value="" onChange={onChange} />);
      const textarea = screen.getByRole('textbox');

      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true, shiftKey: true });

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should not have a suggestion since text was empty
      expect(useAISuggestionStore.getState().suggestions.has('test-notes')).toBe(false);
    });

    it('does not trigger continue writing when suggestions are disabled', async () => {
      const onChange = vi.fn();
      render(
        <GhostTextTextarea
          fieldId="test-notes"
          value="Some text here"
          onChange={onChange}
          enableSuggestions={false}
        />
      );
      const textarea = screen.getByRole('textbox');

      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true, shiftKey: true });

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should not have a suggestion since suggestions are disabled
      expect(useAISuggestionStore.getState().suggestions.has('test-notes')).toBe(false);
    });

    it('can accept continue writing suggestion with Tab', async () => {
      const onChange = vi.fn();
      render(
        <GhostTextTextarea fieldId="test-notes" value="My document text" onChange={onChange} />
      );
      const textarea = screen.getByRole('textbox');

      // Trigger continue writing
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true, shiftKey: true });

      // Wait for suggestion to complete
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Accept with Tab
      fireEvent.keyDown(textarea, { key: 'Tab' });

      // Should have called onChange with the combined text
      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0]).toContain('My document text');
    });

    it('can dismiss continue writing suggestion with Escape', async () => {
      const onChange = vi.fn();
      render(
        <GhostTextTextarea fieldId="test-notes" value="Document content" onChange={onChange} />
      );
      const textarea = screen.getByRole('textbox');

      // Trigger continue writing
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true, shiftKey: true });

      // Wait for suggestion to complete
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Dismiss with Escape
      fireEvent.keyDown(textarea, { key: 'Escape' });

      // Suggestion should be dismissed
      expect(useAISuggestionStore.getState().suggestions.has('test-notes')).toBe(false);
    });

    it('generates style-appropriate suggestions based on document context', async () => {
      const onChange = vi.fn();

      // Test with transaction-related text
      render(
        <GhostTextTextarea
          fieldId="test-notes"
          value="This transaction was for office supplies."
          onChange={onChange}
        />
      );
      const textarea = screen.getByRole('textbox');

      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true, shiftKey: true });

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      const suggestion = useAISuggestionStore.getState().suggestions.get('test-notes');
      expect(suggestion?.text).toBeTruthy();
      // The suggestion should be contextual (though mock, it should still be a valid continuation)
    });
  });

  describe('Image drag-and-drop', () => {
    const createImageFile = (name = 'test.png', type = 'image/png') => {
      const blob = new Blob(['fake image content'], { type });
      return new File([blob], name, { type });
    };

    const createLargeImageFile = (name = 'large.png', type = 'image/png') => {
      // Create a file with a mocked size property larger than 10MB
      const blob = new Blob(['fake'], { type });
      const file = new File([blob], name, { type });
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024, writable: false });
      return file;
    };

    const createDataTransfer = (files: File[]) => {
      const dataTransfer = {
        files,
        items: files.map((file) => ({
          kind: 'file',
          type: file.type,
          getAsFile: () => file,
        })),
        dropEffect: 'none',
        effectAllowed: 'all',
      };
      return dataTransfer;
    };

    it('shows drag overlay when dragging an image over', () => {
      const onChange = vi.fn();
      render(<GhostTextTextarea fieldId="test-notes" value="" onChange={onChange} />);

      const container = document.querySelector('.ghost-text-container')!;
      const imageFile = createImageFile();
      const dataTransfer = createDataTransfer([imageFile]);

      fireEvent.dragEnter(container, { dataTransfer });

      expect(container).toHaveClass('ghost-text-drag-over');
      expect(screen.getByText('Drop image here')).toBeInTheDocument();
    });

    it('hides drag overlay when dragging out', () => {
      const onChange = vi.fn();
      render(<GhostTextTextarea fieldId="test-notes" value="" onChange={onChange} />);

      const container = document.querySelector('.ghost-text-container')!;
      const imageFile = createImageFile();
      const dataTransfer = createDataTransfer([imageFile]);

      fireEvent.dragEnter(container, { dataTransfer });
      expect(container).toHaveClass('ghost-text-drag-over');

      fireEvent.dragLeave(container, { dataTransfer });
      expect(container).not.toHaveClass('ghost-text-drag-over');
    });

    it('processes dropped image files and shows uploading overlay', async () => {
      const onChange = vi.fn();
      render(<GhostTextTextarea fieldId="test-notes" value="" onChange={onChange} />);

      const container = document.querySelector('.ghost-text-container')!;
      const imageFile = createImageFile('photo.jpg', 'image/jpeg');
      const dataTransfer = createDataTransfer([imageFile]);

      fireEvent.drop(container, { dataTransfer });

      // After dropping, container should no longer be in drag-over state
      expect(container).not.toHaveClass('ghost-text-drag-over');

      // Should add upload to store
      const uploads = useImageUploadStore.getState().uploads;
      expect(uploads.size).toBeGreaterThan(0);
    });

    it('does not show drag overlay when image upload is disabled', () => {
      const onChange = vi.fn();
      render(
        <GhostTextTextarea
          fieldId="test-notes"
          value=""
          onChange={onChange}
          enableImageUpload={false}
        />
      );

      const container = document.querySelector('.ghost-text-container')!;
      const imageFile = createImageFile();
      const dataTransfer = createDataTransfer([imageFile]);

      fireEvent.dragEnter(container, { dataTransfer });

      expect(container).not.toHaveClass('ghost-text-drag-over');
      expect(screen.queryByText('Drop image here')).not.toBeInTheDocument();
    });

    it('shows warning toast for non-image files', async () => {
      const onChange = vi.fn();
      render(<GhostTextTextarea fieldId="test-notes" value="" onChange={onChange} />);

      const container = document.querySelector('.ghost-text-container')!;
      const textFile = new File(['text content'], 'document.txt', { type: 'text/plain' });
      const dataTransfer = createDataTransfer([textFile]);

      fireEvent.drop(container, { dataTransfer });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Should show warning toast for no valid images
      const toasts = useToastStore.getState().toasts;
      expect(toasts.some((t) => t.type === 'warning')).toBe(true);
    });

    it('shows error toast for oversized image files', async () => {
      const onChange = vi.fn();
      render(<GhostTextTextarea fieldId="test-notes" value="" onChange={onChange} />);

      const container = document.querySelector('.ghost-text-container')!;
      // Create file larger than 10MB limit
      const largeFile = createLargeImageFile('large.png', 'image/png');
      const dataTransfer = createDataTransfer([largeFile]);

      fireEvent.drop(container, { dataTransfer });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Should show error toast for oversized file
      const toasts = useToastStore.getState().toasts;
      expect(toasts.some((t) => t.type === 'error' && t.message.includes('too large'))).toBe(true);
    });

    it('calls onImageUpload callback after upload completes', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const onChange = vi.fn();
      const onImageUpload = vi.fn();
      render(
        <GhostTextTextarea
          fieldId="test-notes"
          value=""
          onChange={onChange}
          onImageUpload={onImageUpload}
        />
      );

      const container = document.querySelector('.ghost-text-container')!;
      const imageFile = createImageFile('callback.png', 'image/png');
      const dataTransfer = createDataTransfer([imageFile]);

      fireEvent.drop(container, { dataTransfer });

      // Wait for upload to complete (simulated ~1-2 seconds)
      await waitFor(
        () => {
          expect(onImageUpload).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      expect(onImageUpload).toHaveBeenCalledWith(expect.stringContaining('blob:'), 'callback');

      vi.useFakeTimers(); // Restore fake timers
    });

    it('inserts image markdown at cursor position when no callback provided', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const onChange = vi.fn();
      render(<GhostTextTextarea fieldId="test-notes" value="Hello world" onChange={onChange} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      // Set cursor position (simulate user having cursor at position 5)
      textarea.setSelectionRange(5, 5);

      const container = document.querySelector('.ghost-text-container')!;
      const imageFile = createImageFile('inline.png', 'image/png');
      const dataTransfer = createDataTransfer([imageFile]);

      fireEvent.drop(container, { dataTransfer });

      // Wait for upload to complete
      await waitFor(
        () => {
          expect(onChange).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Should call onChange with markdown inserted
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      expect(lastCall[0]).toContain('![inline]');

      vi.useFakeTimers(); // Restore fake timers
    });
  });

  describe('Image paste from clipboard', () => {
    const createImageFile = (name = 'test.png', type = 'image/png') => {
      const blob = new Blob(['fake image content'], { type });
      return new File([blob], name, { type });
    };

    const createClipboardData = (items: Array<{ kind: string; type: string; file?: File }>) => {
      return {
        items: items.map((item) => ({
          kind: item.kind,
          type: item.type,
          getAsFile: () => item.file || null,
        })),
      };
    };

    it('processes pasted image from clipboard', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const onChange = vi.fn();
      render(<GhostTextTextarea fieldId="test-notes" value="Text " onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      const imageFile = createImageFile('pasted.png', 'image/png');
      const clipboardData = createClipboardData([
        { kind: 'file', type: 'image/png', file: imageFile },
      ]);

      fireEvent.paste(textarea, { clipboardData });

      // Wait for upload to start
      await waitFor(
        () => {
          const uploads = useImageUploadStore.getState().uploads;
          expect(uploads.size).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      vi.useFakeTimers(); // Restore fake timers
    });

    it('does not handle paste when image upload is disabled', () => {
      const onChange = vi.fn();
      render(
        <GhostTextTextarea
          fieldId="test-notes"
          value=""
          onChange={onChange}
          enableImageUpload={false}
        />
      );

      const textarea = screen.getByRole('textbox');
      const imageFile = createImageFile('pasted.png', 'image/png');
      const clipboardData = createClipboardData([
        { kind: 'file', type: 'image/png', file: imageFile },
      ]);

      fireEvent.paste(textarea, { clipboardData });

      // Should not show uploading state
      expect(document.querySelector('.ghost-text-upload-overlay')).not.toBeInTheDocument();
    });

    it('allows normal text paste when no images in clipboard', () => {
      const onChange = vi.fn();
      render(<GhostTextTextarea fieldId="test-notes" value="" onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      const clipboardData = createClipboardData([{ kind: 'string', type: 'text/plain' }]);

      // Paste should not be prevented for text
      const pasteEvent = fireEvent.paste(textarea, { clipboardData });
      // Text paste should proceed normally (event not prevented)
      expect(pasteEvent).toBe(true);
    });
  });
});
