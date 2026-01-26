/**
 * Tests for Editor History Store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorHistoryStore } from './editorHistory';

describe('editorHistory store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useEditorHistoryStore.setState({
      documentId: null,
      history: [],
      currentIndex: -1,
      maxHistorySize: 100,
      isPanelOpen: false,
      previewEntryId: null,
    });
  });

  describe('initializeHistory', () => {
    it('should initialize with initial content', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'Hello World');

      const state = useEditorHistoryStore.getState();
      expect(state.documentId).toBe('doc-1');
      expect(state.history).toHaveLength(1);
      expect(state.history[0].content).toBe('Hello World');
      expect(state.history[0].type).toBe('initial');
      expect(state.currentIndex).toBe(0);
    });
  });

  describe('pushState', () => {
    it('should add new state to history', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'Initial');
      store.pushState('Updated content', 'text', 'Made a change');

      const state = useEditorHistoryStore.getState();
      expect(state.history).toHaveLength(2);
      expect(state.currentIndex).toBe(1);
      expect(state.history[1].content).toBe('Updated content');
      expect(state.history[1].type).toBe('text');
      expect(state.history[1].description).toBe('Made a change');
    });

    it('should not add duplicate content', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'Content');
      store.pushState('Content', 'text', 'No change');

      const state = useEditorHistoryStore.getState();
      expect(state.history).toHaveLength(1);
    });

    it('should truncate redo history when pushing new state', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'State 1');
      store.pushState('State 2', 'text', 'Change 1');
      store.pushState('State 3', 'text', 'Change 2');

      // Undo twice
      store.undo();
      store.undo();

      // Push new state (should remove State 2 and State 3 from redo)
      store.pushState('State 2b', 'text', 'New change');

      const state = useEditorHistoryStore.getState();
      expect(state.history).toHaveLength(2);
      expect(state.history[1].content).toBe('State 2b');
    });
  });

  describe('undo', () => {
    it('should undo to previous state', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'State 1');
      store.pushState('State 2', 'text', 'Change');

      const entry = store.undo();

      expect(entry).not.toBeNull();
      expect(entry?.content).toBe('State 1');
      expect(useEditorHistoryStore.getState().currentIndex).toBe(0);
    });

    it('should return null when at beginning', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'Initial');

      const entry = store.undo();

      expect(entry).toBeNull();
    });
  });

  describe('redo', () => {
    it('should redo to next state', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'State 1');
      store.pushState('State 2', 'text', 'Change');
      store.undo();

      const entry = store.redo();

      expect(entry).not.toBeNull();
      expect(entry?.content).toBe('State 2');
      expect(useEditorHistoryStore.getState().currentIndex).toBe(1);
    });

    it('should return null when at end', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'Initial');
      store.pushState('State 2', 'text', 'Change');

      const entry = store.redo();

      expect(entry).toBeNull();
    });
  });

  describe('canUndo / canRedo', () => {
    it('should correctly report undo availability', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'Initial');

      expect(store.canUndo()).toBe(false);

      store.pushState('State 2', 'text', 'Change');
      expect(store.canUndo()).toBe(true);
    });

    it('should correctly report redo availability', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'Initial');
      store.pushState('State 2', 'text', 'Change');

      expect(store.canRedo()).toBe(false);

      store.undo();
      expect(store.canRedo()).toBe(true);
    });
  });

  describe('jumpToEntry', () => {
    it('should jump to specific entry', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'State 1');
      store.pushState('State 2', 'text', 'Change 1');
      store.pushState('State 3', 'text', 'Change 2');

      const state = useEditorHistoryStore.getState();
      const firstEntryId = state.history[0].id;

      const entry = store.jumpToEntry(firstEntryId);

      expect(entry).not.toBeNull();
      expect(entry?.content).toBe('State 1');
      expect(useEditorHistoryStore.getState().currentIndex).toBe(0);
    });

    it('should return null for invalid entry id', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'Initial');

      const entry = store.jumpToEntry('invalid-id');

      expect(entry).toBeNull();
    });
  });

  describe('getEntryContent', () => {
    it('should return content for valid entry', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'Initial content');

      const state = useEditorHistoryStore.getState();
      const entryId = state.history[0].id;

      const content = store.getEntryContent(entryId);
      expect(content).toBe('Initial content');
    });

    it('should return null for invalid entry', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'Initial');

      const content = store.getEntryContent('invalid-id');
      expect(content).toBeNull();
    });
  });

  describe('panel state', () => {
    it('should open and close panel', () => {
      const store = useEditorHistoryStore.getState();

      expect(store.isPanelOpen).toBe(false);

      store.openPanel();
      expect(useEditorHistoryStore.getState().isPanelOpen).toBe(true);

      store.closePanel();
      expect(useEditorHistoryStore.getState().isPanelOpen).toBe(false);
    });

    it('should toggle panel', () => {
      const store = useEditorHistoryStore.getState();

      store.togglePanel();
      expect(useEditorHistoryStore.getState().isPanelOpen).toBe(true);

      store.togglePanel();
      expect(useEditorHistoryStore.getState().isPanelOpen).toBe(false);
    });

    it('should clear preview when closing panel', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'Initial');

      const entryId = useEditorHistoryStore.getState().history[0].id;
      store.openPanel();
      store.setPreviewEntry(entryId);

      expect(useEditorHistoryStore.getState().previewEntryId).toBe(entryId);

      store.closePanel();
      expect(useEditorHistoryStore.getState().previewEntryId).toBeNull();
    });
  });

  describe('clearHistory', () => {
    it('should reset all history state', () => {
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'Initial');
      store.pushState('State 2', 'text', 'Change');

      store.clearHistory();

      const state = useEditorHistoryStore.getState();
      expect(state.documentId).toBeNull();
      expect(state.history).toHaveLength(0);
      expect(state.currentIndex).toBe(-1);
    });
  });

  describe('max history size', () => {
    it('should trim history when exceeding max size', () => {
      useEditorHistoryStore.setState({ maxHistorySize: 3 });
      const store = useEditorHistoryStore.getState();
      store.initializeHistory('doc-1', 'State 1');
      store.pushState('State 2', 'text', 'Change 1');
      store.pushState('State 3', 'text', 'Change 2');
      store.pushState('State 4', 'text', 'Change 3');

      const state = useEditorHistoryStore.getState();
      expect(state.history).toHaveLength(3);
      expect(state.history[0].content).toBe('State 2');
      expect(state.history[2].content).toBe('State 4');
    });
  });
});
