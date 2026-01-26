import { create } from 'zustand';

export type ToneOption = 'professional' | 'casual' | 'formal' | 'friendly' | 'confident' | 'empathetic';

export interface ToneOptionConfig {
  id: ToneOption;
  label: string;
  description: string;
  shortcut: string;
}

export const TONE_OPTIONS: ToneOptionConfig[] = [
  { id: 'professional', label: 'Professional', description: 'Business-appropriate tone', shortcut: '1' },
  { id: 'casual', label: 'Casual', description: 'Relaxed, conversational style', shortcut: '2' },
  { id: 'formal', label: 'Formal', description: 'Polished, official language', shortcut: '3' },
  { id: 'friendly', label: 'Friendly', description: 'Warm and approachable', shortcut: '4' },
  { id: 'confident', label: 'Confident', description: 'Assertive and direct', shortcut: '5' },
  { id: 'empathetic', label: 'Empathetic', description: 'Understanding and supportive', shortcut: '6' },
];

export interface GhostTonePreviewInfo {
  beforeText: string;
  originalText: string;
  replacementText: string;
  afterText: string;
  targetRect: DOMRect;
}

export interface AIToneState {
  // Selection info
  isActive: boolean;
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  targetElement: HTMLTextAreaElement | HTMLInputElement | null;

  // Tone adjustment state
  isLoading: boolean;
  previewText: string | null;
  originalText: string;
  error: string | null;
  selectedTone: ToneOption | null;

  // Ghost preview info for inline display
  ghostPreviewInfo: GhostTonePreviewInfo | null;

  // Undo support
  undoStack: { text: string; selectionStart: number; selectionEnd: number }[];

  // Position for floating toolbar
  toolbarPosition: { top: number; left: number } | null;

  // Actions
  showToolbar: (
    selectedText: string,
    selectionStart: number,
    selectionEnd: number,
    element: HTMLTextAreaElement | HTMLInputElement,
    position: { top: number; left: number }
  ) => void;
  hideToolbar: () => void;
  requestToneAdjustment: (tone: ToneOption) => Promise<void>;
  applyToneAdjustment: () => void;
  cancelToneAdjustment: () => void;
  undo: () => boolean;
  clearError: () => void;
}

// Mock tone adjustment function - in production this would call the AI API
function getMockToneAdjustment(text: string, tone: ToneOption): string {
  const trimmedText = text.trim();

  switch (tone) {
    case 'professional':
      // Transform to professional tone
      return trimmedText
        // Remove casual language
        .replace(/\bhey\b/gi, 'Hello')
        .replace(/\bhi\b/gi, 'Hello')
        .replace(/\byeah\b/gi, 'yes')
        .replace(/\bnope\b/gi, 'no')
        .replace(/\bgonna\b/gi, 'going to')
        .replace(/\bwanna\b/gi, 'want to')
        .replace(/\bgotta\b/gi, 'have to')
        .replace(/\bkinda\b/gi, 'somewhat')
        .replace(/\bsorta\b/gi, 'somewhat')
        // Add professional phrasing
        .replace(/\bI think\b/gi, 'I believe')
        .replace(/\bmaybe we can\b/gi, 'I propose we')
        .replace(/\blet me know\b/gi, 'please advise')
        .replace(/\bthanks\b/gi, 'Thank you')
        .replace(/\basap\b/gi, 'at your earliest convenience')
        .replace(/\s{2,}/g, ' ')
        .trim();

    case 'casual':
      // Transform to casual tone
      return trimmedText
        // Make language more relaxed
        .replace(/\bHello\b/gi, 'Hey')
        .replace(/\bI would like to\b/gi, "I'd love to")
        .replace(/\bI believe\b/gi, 'I think')
        .replace(/\bplease advise\b/gi, 'let me know')
        .replace(/\bThank you\b/gi, 'Thanks')
        .replace(/\bHowever\b/gi, 'But')
        .replace(/\bTherefore\b/gi, 'So')
        .replace(/\bFurthermore\b/gi, 'Also')
        .replace(/\bregarding\b/gi, 'about')
        .replace(/\bpurchase\b/gi, 'buy')
        .replace(/\butilize\b/gi, 'use')
        .replace(/\s{2,}/g, ' ')
        .trim();

    case 'formal':
      // Transform to formal tone
      return trimmedText
        // Use formal language
        .replace(/\bhey\b/gi, 'Dear Sir/Madam')
        .replace(/\bhi\b/gi, 'Greetings')
        .replace(/\bthanks\b/gi, 'I appreciate your assistance')
        .replace(/\bI think\b/gi, 'It is my understanding that')
        .replace(/\bcan you\b/gi, 'would you be so kind as to')
        .replace(/\bget\b/gi, 'obtain')
        .replace(/\bbuy\b/gi, 'purchase')
        .replace(/\buse\b/gi, 'utilize')
        .replace(/\bhelp\b/gi, 'assist')
        .replace(/\bstart\b/gi, 'commence')
        .replace(/\bend\b/gi, 'conclude')
        .replace(/\s{2,}/g, ' ')
        .trim();

    case 'friendly':
      // Transform to friendly tone
      return trimmedText
        // Add warmth and approachability
        .replace(/^/, 'Hope you\'re doing well! ')
        .replace(/\bI need\b/gi, 'I was hoping')
        .replace(/\byou must\b/gi, 'it would be great if you could')
        .replace(/\brequired\b/gi, 'would be helpful')
        .replace(/\bimmediately\b/gi, 'when you get a chance')
        .replace(/\bfailed\b/gi, 'didn\'t quite work out')
        .replace(/\bproblem\b/gi, 'little hiccup')
        .replace(/\bissue\b/gi, 'small thing')
        .replace(/\s{2,}/g, ' ')
        .trim();

    case 'confident':
      // Transform to confident tone
      return trimmedText
        // Remove hedging and uncertainty
        .replace(/\bI think\b/gi, '')
        .replace(/\bmaybe\b/gi, '')
        .replace(/\bperhaps\b/gi, '')
        .replace(/\bpossibly\b/gi, '')
        .replace(/\bmight\b/gi, 'will')
        .replace(/\bcould\b/gi, 'can')
        .replace(/\bshould\b/gi, 'will')
        .replace(/\bI believe\b/gi, '')
        .replace(/\bit seems\b/gi, '')
        .replace(/\bkind of\b/gi, '')
        .replace(/\bsort of\b/gi, '')
        .replace(/\ba bit\b/gi, '')
        .replace(/\bsomewhat\b/gi, '')
        .replace(/\bI guess\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/^\s+/, '')
        .trim();

    case 'empathetic':
      // Transform to empathetic tone
      return trimmedText
        // Add understanding and supportive language
        .replace(/^/, 'I completely understand. ')
        .replace(/\byou need to\b/gi, 'it might help to')
        .replace(/\byou should\b/gi, 'you might consider')
        .replace(/\bwrong\b/gi, 'understandable given the circumstances')
        .replace(/\bmistake\b/gi, 'learning opportunity')
        .replace(/\bproblem\b/gi, 'challenge')
        .replace(/\bfailure\b/gi, 'setback')
        .replace(/\bbad\b/gi, 'difficult')
        .replace(/\s{2,}/g, ' ')
        .trim();

    default:
      return text;
  }
}

export const useAIToneStore = create<AIToneState>()((set, get) => ({
  // Initial state
  isActive: false,
  selectedText: '',
  selectionStart: 0,
  selectionEnd: 0,
  targetElement: null,
  isLoading: false,
  previewText: null,
  originalText: '',
  error: null,
  selectedTone: null,
  ghostPreviewInfo: null,
  undoStack: [],
  toolbarPosition: null,

  showToolbar: (selectedText, selectionStart, selectionEnd, element, position) => {
    set({
      isActive: true,
      selectedText,
      selectionStart,
      selectionEnd,
      targetElement: element,
      toolbarPosition: position,
      previewText: null,
      originalText: selectedText,
      error: null,
      selectedTone: null,
      ghostPreviewInfo: null,
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
      previewText: null,
      ghostPreviewInfo: null,
      isLoading: false,
      error: null,
      selectedTone: null,
    });
  },

  requestToneAdjustment: async (tone) => {
    const state = get();
    if (!state.selectedText || state.isLoading) return;

    set({ isLoading: true, error: null, previewText: null, ghostPreviewInfo: null, selectedTone: tone });

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const adjustedText = getMockToneAdjustment(state.selectedText, tone);

      // Build ghost preview info for inline display
      let ghostPreviewInfo: GhostTonePreviewInfo | null = null;
      if (state.targetElement) {
        const fullText = state.targetElement.value;
        ghostPreviewInfo = {
          beforeText: fullText.slice(0, state.selectionStart),
          originalText: state.selectedText,
          replacementText: adjustedText,
          afterText: fullText.slice(state.selectionEnd),
          targetRect: state.targetElement.getBoundingClientRect(),
        };
      }

      set({
        previewText: adjustedText,
        ghostPreviewInfo,
        isLoading: false
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to adjust tone',
        ghostPreviewInfo: null,
      });
    }
  },

  applyToneAdjustment: () => {
    const state = get();
    if (!state.previewText || !state.targetElement) return;

    const element = state.targetElement;
    const currentValue = element.value;

    // Save to undo stack
    const undoEntry = {
      text: currentValue,
      selectionStart: state.selectionStart,
      selectionEnd: state.selectionEnd,
    };

    // Calculate new value
    const newValue =
      currentValue.slice(0, state.selectionStart) +
      state.previewText +
      currentValue.slice(state.selectionEnd);

    // Update the element value
    element.value = newValue;

    // Trigger input event so React state updates
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);

    // Update selection to end of inserted text
    const newSelectionEnd = state.selectionStart + state.previewText.length;
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
      previewText: null,
      ghostPreviewInfo: null,
      isLoading: false,
      selectedTone: null,
    }));
  },

  cancelToneAdjustment: () => {
    set({
      previewText: null,
      ghostPreviewInfo: null,
      isLoading: false,
      error: null,
      selectedTone: null,
    });
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return false;

    const lastUndo = state.undoStack[state.undoStack.length - 1];

    // Find the target element (if it still exists in DOM)
    // For now, we'll try to find any textarea/input that was focused
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

  clearError: () => {
    set({ error: null });
  },
}));

// Individual selectors for stable references (avoids infinite loops with useSyncExternalStore)
const selectIsActive = (state: AIToneState) => state.isActive;
const selectSelectedText = (state: AIToneState) => state.selectedText;
const selectIsLoading = (state: AIToneState) => state.isLoading;
const selectPreviewText = (state: AIToneState) => state.previewText;
const selectError = (state: AIToneState) => state.error;
const selectToolbarPosition = (state: AIToneState) => state.toolbarPosition;
const selectGhostPreviewInfo = (state: AIToneState) => state.ghostPreviewInfo;
const selectSelectionStart = (state: AIToneState) => state.selectionStart;
const selectSelectionEnd = (state: AIToneState) => state.selectionEnd;
const selectTargetElement = (state: AIToneState) => state.targetElement;
const selectSelectedTone = (state: AIToneState) => state.selectedTone;

// Combined hook using individual selectors
export function useAITone() {
  const isActive = useAIToneStore(selectIsActive);
  const selectedText = useAIToneStore(selectSelectedText);
  const isLoading = useAIToneStore(selectIsLoading);
  const previewText = useAIToneStore(selectPreviewText);
  const error = useAIToneStore(selectError);
  const toolbarPosition = useAIToneStore(selectToolbarPosition);
  const ghostPreviewInfo = useAIToneStore(selectGhostPreviewInfo);
  const selectionStart = useAIToneStore(selectSelectionStart);
  const selectionEnd = useAIToneStore(selectSelectionEnd);
  const targetElement = useAIToneStore(selectTargetElement);
  const selectedTone = useAIToneStore(selectSelectedTone);

  return {
    isActive,
    selectedText,
    isLoading,
    previewText,
    error,
    toolbarPosition,
    ghostPreviewInfo,
    selectionStart,
    selectionEnd,
    targetElement,
    selectedTone,
  };
}
