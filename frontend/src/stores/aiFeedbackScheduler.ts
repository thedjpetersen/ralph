import { create } from 'zustand';
import { useAppSettingsStore } from './appSettings';
import { toast } from './toast';

export interface FeedbackSchedulerState {
  // State
  isSchedulerActive: boolean;
  lastFeedbackTimestamp: number | null;
  pendingFeedback: boolean;
  currentWordCount: number;
  currentParagraphCount: number;
  lastTextSnapshot: string;
  isTyping: boolean;
  typingPauseTimer: ReturnType<typeof setTimeout> | null;

  // Actions
  startScheduler: () => void;
  stopScheduler: () => void;
  updateTextMetrics: (text: string) => void;
  onTypingStart: () => void;
  onTypingPause: () => void;
  checkFeedbackTrigger: (text: string) => boolean;
  triggerFeedback: () => void;
  dismissPendingFeedback: () => void;
  reset: () => void;
}

// Helper functions
function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countParagraphs(text: string): number {
  if (!text.trim()) return 0;
  return text.split(/\n\n+/).filter((p) => p.trim()).length;
}

export const useAIFeedbackSchedulerStore = create<FeedbackSchedulerState>(
  (set, get) => ({
    // Initial state
    isSchedulerActive: false,
    lastFeedbackTimestamp: null,
    pendingFeedback: false,
    currentWordCount: 0,
    currentParagraphCount: 0,
    lastTextSnapshot: '',
    isTyping: false,
    typingPauseTimer: null,

    startScheduler: () => {
      set({ isSchedulerActive: true });
    },

    stopScheduler: () => {
      const { typingPauseTimer } = get();
      if (typingPauseTimer) {
        clearTimeout(typingPauseTimer);
      }
      set({
        isSchedulerActive: false,
        typingPauseTimer: null,
        isTyping: false,
        pendingFeedback: false,
      });
    },

    updateTextMetrics: (text: string) => {
      const wordCount = countWords(text);
      const paragraphCount = countParagraphs(text);
      set({
        currentWordCount: wordCount,
        currentParagraphCount: paragraphCount,
      });
    },

    onTypingStart: () => {
      const { typingPauseTimer, isSchedulerActive } = get();
      if (!isSchedulerActive) return;

      // Clear any existing pause timer
      if (typingPauseTimer) {
        clearTimeout(typingPauseTimer);
      }

      set({ isTyping: true, typingPauseTimer: null });
    },

    onTypingPause: () => {
      const { isSchedulerActive, isTyping } = get();
      if (!isSchedulerActive || !isTyping) return;

      const { feedbackSchedulePauseDelay } =
        useAppSettingsStore.getState().settings.ai;

      // Set up pause timer - feedback will trigger after the configured pause delay
      const timer = setTimeout(() => {
        const state = get();
        if (state.isSchedulerActive && state.isTyping) {
          set({ isTyping: false });
          // Check if we should trigger feedback
          const shouldTrigger = state.checkFeedbackTrigger(
            state.lastTextSnapshot
          );
          if (shouldTrigger) {
            state.triggerFeedback();
          }
        }
      }, feedbackSchedulePauseDelay);

      set({ typingPauseTimer: timer });
    },

    checkFeedbackTrigger: (text: string) => {
      const state = get();
      const { feedbackScheduleMode } =
        useAppSettingsStore.getState().settings.ai;

      if (feedbackScheduleMode === 'manual') {
        return false;
      }

      const newWordCount = countWords(text);
      const newParagraphCount = countParagraphs(text);

      if (feedbackScheduleMode === 'every-500-words') {
        // Trigger feedback every 500 words
        const wordDiff = newWordCount - state.currentWordCount;
        const lastCheckpoint = Math.floor(state.currentWordCount / 500);
        const newCheckpoint = Math.floor(newWordCount / 500);
        return (
          newCheckpoint > lastCheckpoint ||
          (wordDiff >= 500 && state.lastFeedbackTimestamp === null)
        );
      }

      if (feedbackScheduleMode === 'every-paragraph') {
        // Trigger feedback when a new paragraph is completed
        return newParagraphCount > state.currentParagraphCount;
      }

      return false;
    },

    triggerFeedback: () => {
      set({
        pendingFeedback: true,
        lastFeedbackTimestamp: Date.now(),
      });

      // Show notification
      toast.info('AI feedback is ready', {
        duration: 6000,
        action: {
          label: 'View',
          onClick: () => {
            // This could open the feedback panel or scroll to feedback
            get().dismissPendingFeedback();
          },
        },
      });
    },

    dismissPendingFeedback: () => {
      set({ pendingFeedback: false });
    },

    reset: () => {
      const { typingPauseTimer } = get();
      if (typingPauseTimer) {
        clearTimeout(typingPauseTimer);
      }
      set({
        isSchedulerActive: false,
        lastFeedbackTimestamp: null,
        pendingFeedback: false,
        currentWordCount: 0,
        currentParagraphCount: 0,
        lastTextSnapshot: '',
        isTyping: false,
        typingPauseTimer: null,
      });
    },
  })
);

// Selectors
export const selectIsSchedulerActive = (state: FeedbackSchedulerState) =>
  state.isSchedulerActive;
export const selectPendingFeedback = (state: FeedbackSchedulerState) =>
  state.pendingFeedback;
export const selectIsTyping = (state: FeedbackSchedulerState) => state.isTyping;
export const selectCurrentWordCount = (state: FeedbackSchedulerState) =>
  state.currentWordCount;
export const selectCurrentParagraphCount = (state: FeedbackSchedulerState) =>
  state.currentParagraphCount;

// Custom hook for scheduler status
export function useAIFeedbackSchedulerStatus() {
  const isSchedulerActive = useAIFeedbackSchedulerStore(selectIsSchedulerActive);
  const pendingFeedback = useAIFeedbackSchedulerStore(selectPendingFeedback);
  const isTyping = useAIFeedbackSchedulerStore(selectIsTyping);
  const wordCount = useAIFeedbackSchedulerStore(selectCurrentWordCount);
  const paragraphCount = useAIFeedbackSchedulerStore(
    selectCurrentParagraphCount
  );

  return {
    isSchedulerActive,
    pendingFeedback,
    isTyping,
    wordCount,
    paragraphCount,
  };
}
