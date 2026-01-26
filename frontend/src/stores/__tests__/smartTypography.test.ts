import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSmartTypographyStore } from '../smartTypography';

// Unicode constants for curly quotes
const EM_DASH = '\u2014'; // —
const ELLIPSIS = '\u2026'; // …

describe('useSmartTypographyStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSmartTypographyStore.setState({
      isEnabled: true,
      undoStack: [],
      previousText: '',
    });
  });

  describe('initial state', () => {
    it('should be enabled by default', () => {
      const { isEnabled } = useSmartTypographyStore.getState();
      expect(isEnabled).toBe(true);
    });

    it('should have empty undo stack', () => {
      const { undoStack } = useSmartTypographyStore.getState();
      expect(undoStack).toEqual([]);
    });

    it('should have empty previous text', () => {
      const { previousText } = useSmartTypographyStore.getState();
      expect(previousText).toBe('');
    });
  });

  describe('setEnabled', () => {
    it('should enable smart typography', () => {
      act(() => {
        useSmartTypographyStore.getState().setEnabled(true);
      });
      expect(useSmartTypographyStore.getState().isEnabled).toBe(true);
    });

    it('should disable smart typography', () => {
      act(() => {
        useSmartTypographyStore.getState().setEnabled(false);
      });
      expect(useSmartTypographyStore.getState().isEnabled).toBe(false);
    });
  });

  describe('toggle', () => {
    it('should toggle from enabled to disabled', () => {
      act(() => {
        useSmartTypographyStore.getState().toggle();
      });
      expect(useSmartTypographyStore.getState().isEnabled).toBe(false);
    });

    it('should toggle from disabled to enabled', () => {
      useSmartTypographyStore.setState({ isEnabled: false });
      act(() => {
        useSmartTypographyStore.getState().toggle();
      });
      expect(useSmartTypographyStore.getState().isEnabled).toBe(true);
    });
  });

  describe('processInput', () => {
    it('should transform ellipsis and add to undo stack', () => {
      // Simulate typing: 'hello..' then adding the third '.'
      useSmartTypographyStore.setState({ previousText: 'hello..' });

      const result = useSmartTypographyStore.getState().processInput('hello...', 8);

      expect(result).toEqual({ text: `hello${ELLIPSIS}`, cursorPosition: 6 });
      expect(useSmartTypographyStore.getState().undoStack).toHaveLength(1);
      expect(useSmartTypographyStore.getState().previousText).toBe(`hello${ELLIPSIS}`);
    });

    it('should transform em dash', () => {
      // Simulate typing: 'wait-' then adding second '-'
      useSmartTypographyStore.setState({ previousText: 'wait-' });

      const result = useSmartTypographyStore.getState().processInput('wait--', 6);

      expect(result).toEqual({ text: `wait${EM_DASH}`, cursorPosition: 5 });
    });

    it('should return null when disabled', () => {
      useSmartTypographyStore.setState({ isEnabled: false, previousText: 'hello..' });

      const result = useSmartTypographyStore.getState().processInput('hello...', 8);

      expect(result).toBeNull();
    });

    it('should return null when no transformation needed', () => {
      useSmartTypographyStore.setState({ previousText: 'hello' });

      const result = useSmartTypographyStore.getState().processInput('hello ', 6);

      expect(result).toBeNull();
    });

    it('should return null when cursor is in code block', () => {
      useSmartTypographyStore.setState({ previousText: '```\ncode..' });

      const result = useSmartTypographyStore.getState().processInput('```\ncode...', 11);

      expect(result).toBeNull();
    });

    it('should update previousText even without transformation', () => {
      useSmartTypographyStore.setState({ previousText: 'hello' });

      useSmartTypographyStore.getState().processInput('hello ', 6);

      expect(useSmartTypographyStore.getState().previousText).toBe('hello ');
    });
  });

  describe('undo', () => {
    it('should undo the last transformation', () => {
      useSmartTypographyStore.setState({
        previousText: 'hello…',
        undoStack: [
          {
            originalText: 'hello...',
            transformedText: 'hello…',
            cursorPosition: 6,
            originalCursorPosition: 8,
          },
        ],
      });

      const result = useSmartTypographyStore.getState().undo();

      expect(result).toEqual({
        originalText: 'hello...',
        transformedText: 'hello…',
        cursorPosition: 6,
        originalCursorPosition: 8,
      });
      expect(useSmartTypographyStore.getState().undoStack).toHaveLength(0);
      expect(useSmartTypographyStore.getState().previousText).toBe('hello...');
    });

    it('should return null when undo stack is empty', () => {
      const result = useSmartTypographyStore.getState().undo();
      expect(result).toBeNull();
    });

    it('should undo multiple transformations in order', () => {
      useSmartTypographyStore.setState({
        undoStack: [
          {
            originalText: 'first...',
            transformedText: 'first…',
            cursorPosition: 6,
            originalCursorPosition: 8,
          },
          {
            originalText: 'second--',
            transformedText: 'second—',
            cursorPosition: 7,
            originalCursorPosition: 8,
          },
        ],
      });

      // First undo should return the second (most recent) entry
      const first = useSmartTypographyStore.getState().undo();
      expect(first?.originalText).toBe('second--');
      expect(useSmartTypographyStore.getState().undoStack).toHaveLength(1);

      // Second undo should return the first entry
      const second = useSmartTypographyStore.getState().undo();
      expect(second?.originalText).toBe('first...');
      expect(useSmartTypographyStore.getState().undoStack).toHaveLength(0);
    });
  });

  describe('canUndo', () => {
    it('should return false when stack is empty', () => {
      expect(useSmartTypographyStore.getState().canUndo()).toBe(false);
    });

    it('should return true when stack has entries', () => {
      useSmartTypographyStore.setState({
        undoStack: [
          {
            originalText: 'test',
            transformedText: 'test',
            cursorPosition: 4,
            originalCursorPosition: 4,
          },
        ],
      });

      expect(useSmartTypographyStore.getState().canUndo()).toBe(true);
    });
  });

  describe('setPreviousText', () => {
    it('should update previous text', () => {
      act(() => {
        useSmartTypographyStore.getState().setPreviousText('new text');
      });

      expect(useSmartTypographyStore.getState().previousText).toBe('new text');
    });
  });

  describe('clearUndoStack', () => {
    it('should clear the undo stack', () => {
      useSmartTypographyStore.setState({
        undoStack: [
          {
            originalText: 'test',
            transformedText: 'test',
            cursorPosition: 4,
            originalCursorPosition: 4,
          },
        ],
      });

      act(() => {
        useSmartTypographyStore.getState().clearUndoStack();
      });

      expect(useSmartTypographyStore.getState().undoStack).toEqual([]);
    });
  });
});
