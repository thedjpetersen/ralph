import { create } from 'zustand';

/**
 * Preset highlight colors matching the brand palette
 */
export const HIGHLIGHT_COLORS = [
  { id: 'yellow', name: 'Yellow', hex: '#FEF08A', textColor: '#854d0e' },   // yellow-200/800
  { id: 'green', name: 'Green', hex: '#BBF7D0', textColor: '#166534' },     // green-200/800
  { id: 'blue', name: 'Blue', hex: '#BFDBFE', textColor: '#1e40af' },       // blue-200/800
  { id: 'purple', name: 'Purple', hex: '#DDD6FE', textColor: '#5b21b6' },   // violet-200/800
  { id: 'pink', name: 'Pink', hex: '#FBCFE8', textColor: '#9d174d' },       // pink-200/800
  { id: 'orange', name: 'Orange', hex: '#FED7AA', textColor: '#9a3412' },   // orange-200/800
] as const;

export type HighlightColorId = typeof HIGHLIGHT_COLORS[number]['id'];

export interface HighlightColor {
  id: HighlightColorId;
  name: string;
  hex: string;
  textColor: string;
}

/**
 * Get color configuration by ID
 */
export function getHighlightColor(colorId: HighlightColorId): HighlightColor {
  return HIGHLIGHT_COLORS.find((c) => c.id === colorId) || HIGHLIGHT_COLORS[0];
}

/**
 * Generate the markdown-style syntax for a highlight
 * Format: ==color:text== (e.g., ==yellow:highlighted text==)
 */
export function formatHighlight(text: string, colorId: HighlightColorId): string {
  return `==${colorId}:${text}==`;
}

/**
 * Check if text is already highlighted and get the color
 */
export function parseHighlight(text: string): { isHighlighted: boolean; colorId?: HighlightColorId; innerText?: string } {
  const match = text.match(/^==(\w+):(.+)==$/);
  if (match) {
    const colorId = match[1] as HighlightColorId;
    const validColor = HIGHLIGHT_COLORS.find((c) => c.id === colorId);
    if (validColor) {
      return { isHighlighted: true, colorId, innerText: match[2] };
    }
  }
  return { isHighlighted: false };
}

/**
 * Remove highlight formatting from text
 */
export function removeHighlight(text: string): string {
  const match = text.match(/^==(\w+):(.+)==$/);
  if (match) {
    return match[2];
  }
  return text;
}

interface TextHighlightState {
  // Color picker UI state
  isColorPickerOpen: boolean;
  colorPickerPosition: { top: number; left: number } | null;
  selectedColor: HighlightColorId;

  // Target element info (from formatting toolbar)
  pendingSelection: {
    text: string;
    start: number;
    end: number;
    element: HTMLTextAreaElement | HTMLInputElement;
  } | null;

  // Actions
  openColorPicker: (
    text: string,
    start: number,
    end: number,
    element: HTMLTextAreaElement | HTMLInputElement,
    position: { top: number; left: number }
  ) => void;
  closeColorPicker: () => void;
  setSelectedColor: (colorId: HighlightColorId) => void;
  applyHighlight: (colorId: HighlightColorId) => void;
  removeHighlightFromSelection: () => void;
}

export const useTextHighlightStore = create<TextHighlightState>()((set, get) => ({
  // Initial state
  isColorPickerOpen: false,
  colorPickerPosition: null,
  selectedColor: 'yellow',
  pendingSelection: null,

  openColorPicker: (text, start, end, element, position) => {
    set({
      isColorPickerOpen: true,
      colorPickerPosition: position,
      pendingSelection: { text, start, end, element },
    });
  },

  closeColorPicker: () => {
    set({
      isColorPickerOpen: false,
      colorPickerPosition: null,
      pendingSelection: null,
    });
  },

  setSelectedColor: (colorId) => {
    set({ selectedColor: colorId });
  },

  applyHighlight: (colorId) => {
    const state = get();
    const { pendingSelection } = state;

    if (!pendingSelection) return;

    const { text, start, end, element } = pendingSelection;
    const currentValue = element.value;

    // Check if already highlighted and remove if same color
    const parsed = parseHighlight(text);
    let newText: string;

    if (parsed.isHighlighted && parsed.colorId === colorId) {
      // Same color - remove highlight
      newText = parsed.innerText || text;
    } else if (parsed.isHighlighted && parsed.innerText) {
      // Different color - replace highlight
      newText = formatHighlight(parsed.innerText, colorId);
    } else {
      // Not highlighted - add highlight
      newText = formatHighlight(text, colorId);
    }

    // Update the element value
    const newValue = currentValue.slice(0, start) + newText + currentValue.slice(end);
    element.value = newValue;

    // Trigger input event so React state updates
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);

    // Update selection to end of formatted text
    const newSelectionEnd = start + newText.length;
    element.setSelectionRange(newSelectionEnd, newSelectionEnd);
    element.focus();

    // Close the color picker
    set({
      isColorPickerOpen: false,
      colorPickerPosition: null,
      pendingSelection: null,
      selectedColor: colorId,
    });
  },

  removeHighlightFromSelection: () => {
    const state = get();
    const { pendingSelection } = state;

    if (!pendingSelection) return;

    const { text, start, end, element } = pendingSelection;
    const currentValue = element.value;

    // Remove highlight formatting
    const newText = removeHighlight(text);

    // Update the element value
    const newValue = currentValue.slice(0, start) + newText + currentValue.slice(end);
    element.value = newValue;

    // Trigger input event so React state updates
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);

    // Update selection
    const newSelectionEnd = start + newText.length;
    element.setSelectionRange(newSelectionEnd, newSelectionEnd);
    element.focus();

    // Close the color picker
    set({
      isColorPickerOpen: false,
      colorPickerPosition: null,
      pendingSelection: null,
    });
  },
}));

// Selectors
const selectIsColorPickerOpen = (state: TextHighlightState) => state.isColorPickerOpen;
const selectColorPickerPosition = (state: TextHighlightState) => state.colorPickerPosition;
const selectSelectedColor = (state: TextHighlightState) => state.selectedColor;
const selectPendingSelection = (state: TextHighlightState) => state.pendingSelection;

export function useTextHighlight() {
  const isColorPickerOpen = useTextHighlightStore(selectIsColorPickerOpen);
  const colorPickerPosition = useTextHighlightStore(selectColorPickerPosition);
  const selectedColor = useTextHighlightStore(selectSelectedColor);
  const pendingSelection = useTextHighlightStore(selectPendingSelection);

  return {
    isColorPickerOpen,
    colorPickerPosition,
    selectedColor,
    pendingSelection,
  };
}
