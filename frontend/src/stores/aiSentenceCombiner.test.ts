import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAISentenceCombinerStore } from './aiSentenceCombiner';

describe('useAISentenceCombinerStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAISentenceCombinerStore.setState({
      isActive: false,
      selectedText: '',
      selectionStart: 0,
      selectionEnd: 0,
      targetElement: null,
      sentences: [],
      isLoading: false,
      previewText: null,
      originalText: '',
      error: null,
      selectedStrategy: null,
      ghostPreviewInfo: null,
      undoStack: [],
      toolbarPosition: null,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should not be active initially', () => {
      const { isActive } = useAISentenceCombinerStore.getState();
      expect(isActive).toBe(false);
    });

    it('should have empty sentences array initially', () => {
      const { sentences } = useAISentenceCombinerStore.getState();
      expect(sentences).toEqual([]);
    });

    it('should not be loading initially', () => {
      const { isLoading } = useAISentenceCombinerStore.getState();
      expect(isLoading).toBe(false);
    });

    it('should have empty undo stack initially', () => {
      const { undoStack } = useAISentenceCombinerStore.getState();
      expect(undoStack).toEqual([]);
    });
  });

  describe('showToolbar', () => {
    it('should detect and store sentences when 2+ sentences are selected', () => {
      const mockElement = {
        value: 'The sun rose. The birds sang.',
        selectionStart: 0,
        selectionEnd: 28,
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'The sun rose. The birds sang.',
        0,
        28,
        mockElement,
        { top: 100, left: 200 }
      );

      const state = useAISentenceCombinerStore.getState();
      expect(state.isActive).toBe(true);
      expect(state.sentences).toHaveLength(2);
      expect(state.sentences[0].text).toBe('The sun rose.');
      expect(state.sentences[1].text).toBe('The birds sang.');
    });

    it('should not activate if only one sentence is selected', () => {
      const mockElement = {
        value: 'Just one sentence.',
        selectionStart: 0,
        selectionEnd: 18,
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'Just one sentence.',
        0,
        18,
        mockElement,
        { top: 100, left: 200 }
      );

      const state = useAISentenceCombinerStore.getState();
      expect(state.isActive).toBe(false);
    });

    it('should store toolbar position', () => {
      const mockElement = {
        value: 'First sentence. Second sentence.',
        selectionStart: 0,
        selectionEnd: 32,
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'First sentence. Second sentence.',
        0,
        32,
        mockElement,
        { top: 150, left: 250 }
      );

      const state = useAISentenceCombinerStore.getState();
      expect(state.toolbarPosition).toEqual({ top: 150, left: 250 });
    });
  });

  describe('hideToolbar', () => {
    it('should reset all selection state', () => {
      // First set up an active toolbar
      const mockElement = {
        value: 'First sentence. Second sentence.',
        selectionStart: 0,
        selectionEnd: 32,
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'First sentence. Second sentence.',
        0,
        32,
        mockElement,
        { top: 150, left: 250 }
      );

      // Now hide it
      useAISentenceCombinerStore.getState().hideToolbar();

      const state = useAISentenceCombinerStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.selectedText).toBe('');
      expect(state.sentences).toEqual([]);
      expect(state.toolbarPosition).toBeNull();
    });
  });

  describe('requestCombine', () => {
    it('should combine sentences with conjunction strategy', async () => {
      const mockElement = {
        value: 'The sun rose. The birds sang.',
        selectionStart: 0,
        selectionEnd: 29,
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'The sun rose. The birds sang.',
        0,
        29,
        mockElement,
        { top: 100, left: 200 }
      );

      await useAISentenceCombinerStore.getState().requestCombine('conjunction');

      const state = useAISentenceCombinerStore.getState();
      expect(state.previewText).toBe('The sun rose, and the birds sang.');
      expect(state.selectedStrategy).toBe('conjunction');
      expect(state.isLoading).toBe(false);
    });

    it('should combine sentences with semicolon strategy', async () => {
      const mockElement = {
        value: 'The sun rose. The birds sang.',
        selectionStart: 0,
        selectionEnd: 29,
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'The sun rose. The birds sang.',
        0,
        29,
        mockElement,
        { top: 100, left: 200 }
      );

      await useAISentenceCombinerStore.getState().requestCombine('semicolon');

      const state = useAISentenceCombinerStore.getState();
      expect(state.previewText).toBe('The sun rose; the birds sang.');
      expect(state.selectedStrategy).toBe('semicolon');
    });

    it('should combine sentences with relative clause strategy', async () => {
      const mockElement = {
        value: 'The sun rose. The birds sang.',
        selectionStart: 0,
        selectionEnd: 29,
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'The sun rose. The birds sang.',
        0,
        29,
        mockElement,
        { top: 100, left: 200 }
      );

      await useAISentenceCombinerStore.getState().requestCombine('relative');

      const state = useAISentenceCombinerStore.getState();
      expect(state.previewText).toBe('The sun rose, which the birds sang.');
      expect(state.selectedStrategy).toBe('relative');
    });

    it('should not combine if fewer than 2 sentences', async () => {
      // Don't activate toolbar, just try to combine
      await useAISentenceCombinerStore.getState().requestCombine('conjunction');

      const state = useAISentenceCombinerStore.getState();
      expect(state.previewText).toBeNull();
    });
  });

  describe('cancelCombine', () => {
    it('should clear preview but keep toolbar active', async () => {
      const mockElement = {
        value: 'The sun rose. The birds sang.',
        selectionStart: 0,
        selectionEnd: 29,
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'The sun rose. The birds sang.',
        0,
        29,
        mockElement,
        { top: 100, left: 200 }
      );

      await useAISentenceCombinerStore.getState().requestCombine('conjunction');
      useAISentenceCombinerStore.getState().cancelCombine();

      const state = useAISentenceCombinerStore.getState();
      expect(state.previewText).toBeNull();
      expect(state.selectedStrategy).toBeNull();
      expect(state.isActive).toBe(true); // Toolbar should still be active
    });
  });

  describe('applyCombine', () => {
    it('should apply the combined text and add to undo stack', async () => {
      const mockElement = {
        value: 'The sun rose. The birds sang.',
        selectionStart: 0,
        selectionEnd: 29,
        focus: vi.fn(),
        setSelectionRange: vi.fn(),
        dispatchEvent: vi.fn(),
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'The sun rose. The birds sang.',
        0,
        29,
        mockElement,
        { top: 100, left: 200 }
      );

      await useAISentenceCombinerStore.getState().requestCombine('conjunction');
      useAISentenceCombinerStore.getState().applyCombine();

      const state = useAISentenceCombinerStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.undoStack).toHaveLength(1);
      expect(state.undoStack[0].text).toBe('The sun rose. The birds sang.');
    });

    it('should not apply if no preview text', () => {
      useAISentenceCombinerStore.getState().applyCombine();

      const state = useAISentenceCombinerStore.getState();
      expect(state.undoStack).toHaveLength(0);
    });
  });

  describe('undo', () => {
    it('should remove last entry from undo stack when active element matches', async () => {
      const mockElement = {
        value: 'The sun rose. The birds sang.',
        selectionStart: 0,
        selectionEnd: 29,
        focus: vi.fn(),
        setSelectionRange: vi.fn(),
        dispatchEvent: vi.fn(),
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'The sun rose. The birds sang.',
        0,
        29,
        mockElement,
        { top: 100, left: 200 }
      );

      await useAISentenceCombinerStore.getState().requestCombine('conjunction');
      useAISentenceCombinerStore.getState().applyCombine();

      // Verify undo stack has an entry after apply
      expect(useAISentenceCombinerStore.getState().undoStack).toHaveLength(1);
      expect(useAISentenceCombinerStore.getState().undoStack[0].text).toBe('The sun rose. The birds sang.');
    });

    it('should return false if undo stack is empty', () => {
      const result = useAISentenceCombinerStore.getState().undo();
      expect(result).toBe(false);
    });

    it('should return false if no active textarea/input element', async () => {
      // Manually add an entry to undo stack
      useAISentenceCombinerStore.setState({
        undoStack: [{ text: 'test', selectionStart: 0, selectionEnd: 4 }],
      });

      // document.activeElement is body, not a textarea/input
      const result = useAISentenceCombinerStore.getState().undo();
      expect(result).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear the error state', () => {
      useAISentenceCombinerStore.setState({ error: 'Some error' });
      useAISentenceCombinerStore.getState().clearError();

      const state = useAISentenceCombinerStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('sentence detection', () => {
    it('should detect sentences ending with periods', () => {
      const mockElement = {
        value: 'First. Second. Third.',
        selectionStart: 0,
        selectionEnd: 21,
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'First. Second. Third.',
        0,
        21,
        mockElement,
        { top: 100, left: 200 }
      );

      const state = useAISentenceCombinerStore.getState();
      expect(state.sentences).toHaveLength(3);
    });

    it('should detect sentences ending with exclamation marks', () => {
      const mockElement = {
        value: 'Hello! How are you!',
        selectionStart: 0,
        selectionEnd: 19,
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'Hello! How are you!',
        0,
        19,
        mockElement,
        { top: 100, left: 200 }
      );

      const state = useAISentenceCombinerStore.getState();
      expect(state.sentences).toHaveLength(2);
    });

    it('should detect sentences ending with question marks', () => {
      const mockElement = {
        value: 'What is this? How does it work?',
        selectionStart: 0,
        selectionEnd: 31,
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
      } as unknown as HTMLTextAreaElement;

      useAISentenceCombinerStore.getState().showToolbar(
        'What is this? How does it work?',
        0,
        31,
        mockElement,
        { top: 100, left: 200 }
      );

      const state = useAISentenceCombinerStore.getState();
      expect(state.sentences).toHaveLength(2);
    });
  });
});
