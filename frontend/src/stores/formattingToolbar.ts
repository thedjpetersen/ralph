import { create } from 'zustand';

export type FormatAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'codeblock'
  | 'link';

export interface FormatActionConfig {
  id: FormatAction;
  label: string;
  icon: string;
  shortcut: string;
  prefix: string;
  suffix: string;
}

export const FORMAT_ACTIONS: FormatActionConfig[] = [
  { id: 'bold', label: 'Bold', icon: 'B', shortcut: 'Ctrl+B', prefix: '**', suffix: '**' },
  { id: 'italic', label: 'Italic', icon: 'I', shortcut: 'Ctrl+I', prefix: '*', suffix: '*' },
  { id: 'underline', label: 'Underline', icon: 'U', shortcut: 'Ctrl+U', prefix: '<u>', suffix: '</u>' },
  { id: 'strikethrough', label: 'Strikethrough', icon: 'S', shortcut: 'Ctrl+Shift+S', prefix: '~~', suffix: '~~' },
  { id: 'code', label: 'Inline Code', icon: '<>', shortcut: 'Ctrl+E', prefix: '`', suffix: '`' },
  { id: 'codeblock', label: 'Code Block', icon: '{}', shortcut: 'Ctrl+Shift+E', prefix: '\n```\n', suffix: '\n```\n' },
  { id: 'link', label: 'Link', icon: '🔗', shortcut: 'Ctrl+K', prefix: '[', suffix: '](url)' },
];

export interface FormattingToolbarState {
  // Selection info
  isActive: boolean;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  targetElement: HTMLTextAreaElement | HTMLInputElement | null;

  // Position for floating toolbar
  toolbarPosition: { top: number; left: number } | null;

  // Undo support
  undoStack: { text: string; selectionStart: number; selectionEnd: number }[];

  // Actions
  showToolbar: (
    selectedText: string,
    selectionStart: number,
    selectionEnd: number,
    element: HTMLTextAreaElement | HTMLInputElement,
    position: { top: number; left: number }
  ) => void;
  hideToolbar: () => void;
  applyFormat: (action: FormatAction) => void;
  undo: () => boolean;
}

export const useFormattingToolbarStore = create<FormattingToolbarState>()((set, get) => ({
  // Initial state
  isActive: false,
  selectedText: '',
  selectionStart: 0,
  selectionEnd: 0,
  targetElement: null,
  toolbarPosition: null,
  undoStack: [],

  showToolbar: (selectedText, selectionStart, selectionEnd, element, position) => {
    set({
      isActive: true,
      selectedText,
      selectionStart,
      selectionEnd,
      targetElement: element,
      toolbarPosition: position,
    });
  },

  hideToolbar: () => {
    set({
      isActive: false,
      selectedText: '',
      selectionStart: 0,
      selectionEnd: 0,
      targetElement: null,
      toolbarPosition: null,
    });
  },

  applyFormat: (action: FormatAction) => {
    const state = get();
    if (!state.targetElement || !state.selectedText) return;

    const formatConfig = FORMAT_ACTIONS.find((a) => a.id === action);
    if (!formatConfig) return;

    const element = state.targetElement;
    const currentValue = element.value;

    // Save to undo stack
    const undoEntry = {
      text: currentValue,
      selectionStart: state.selectionStart,
      selectionEnd: state.selectionEnd,
    };

    // Calculate new value with formatting
    const formattedText = `${formatConfig.prefix}${state.selectedText}${formatConfig.suffix}`;
    const newValue =
      currentValue.slice(0, state.selectionStart) +
      formattedText +
      currentValue.slice(state.selectionEnd);

    // Update the element value
    element.value = newValue;

    // Trigger input event so React state updates
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);

    // Update selection to end of formatted text
    const newSelectionEnd = state.selectionStart + formattedText.length;
    element.setSelectionRange(newSelectionEnd, newSelectionEnd);
    element.focus();

    set((state) => ({
      undoStack: [...state.undoStack, undoEntry],
      isActive: false,
      selectedText: '',
      selectionStart: 0,
      selectionEnd: 0,
      targetElement: null,
      toolbarPosition: null,
    }));
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return false;

    const lastUndo = state.undoStack[state.undoStack.length - 1];

    // Find the target element (if it still exists in DOM)
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLInputElement)
    ) {
      activeElement.value = lastUndo.text;

      // Trigger input event
      const event = new Event('input', { bubbles: true });
      activeElement.dispatchEvent(event);

      // Restore selection
      activeElement.setSelectionRange(lastUndo.selectionStart, lastUndo.selectionEnd);

      set((state) => ({
        undoStack: state.undoStack.slice(0, -1),
      }));

      return true;
    }

    return false;
  },
}));

// Individual selectors for stable references
const selectIsActive = (state: FormattingToolbarState) => state.isActive;
const selectSelectedText = (state: FormattingToolbarState) => state.selectedText;
const selectToolbarPosition = (state: FormattingToolbarState) => state.toolbarPosition;
const selectSelectionStart = (state: FormattingToolbarState) => state.selectionStart;
const selectSelectionEnd = (state: FormattingToolbarState) => state.selectionEnd;
const selectTargetElement = (state: FormattingToolbarState) => state.targetElement;

// Combined hook using individual selectors
export function useFormattingToolbar() {
  const isActive = useFormattingToolbarStore(selectIsActive);
  const selectedText = useFormattingToolbarStore(selectSelectedText);
  const toolbarPosition = useFormattingToolbarStore(selectToolbarPosition);
  const selectionStart = useFormattingToolbarStore(selectSelectionStart);
  const selectionEnd = useFormattingToolbarStore(selectSelectionEnd);
  const targetElement = useFormattingToolbarStore(selectTargetElement);

  return {
    isActive,
    selectedText,
    toolbarPosition,
    selectionStart,
    selectionEnd,
    targetElement,
  };
}
