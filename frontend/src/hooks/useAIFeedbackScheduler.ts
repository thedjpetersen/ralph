import { useEffect, useRef, useCallback } from 'react';
import { useAppSettingsStore } from '../stores/appSettings';
import { useAIFeedbackSchedulerStore } from '../stores/aiFeedbackScheduler';

interface UseAIFeedbackSchedulerOptions {
  enabled?: boolean;
}

/**
 * Hook to integrate AI feedback scheduling with text input components.
 * Handles typing pause detection and triggers scheduled feedback based on user preferences.
 *
 * Usage:
 * ```tsx
 * const { handleTextChange } = useAIFeedbackScheduler();
 *
 * const onTextChange = (newText: string) => {
 *   setValue(newText);
 *   handleTextChange(newText);
 * };
 * ```
 */
export function useAIFeedbackScheduler(
  options: UseAIFeedbackSchedulerOptions = {}
) {
  const { enabled = true } = options;

  const feedbackScheduleMode = useAppSettingsStore(
    (state) => state.settings.ai.feedbackScheduleMode
  );
  const feedbackSchedulePauseDelay = useAppSettingsStore(
    (state) => state.settings.ai.feedbackSchedulePauseDelay
  );

  const {
    isSchedulerActive,
    startScheduler,
    stopScheduler,
    updateTextMetrics,
    onTypingStart,
    checkFeedbackTrigger,
    triggerFeedback,
  } = useAIFeedbackSchedulerStore();

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTextRef = useRef<string>('');
  const lastWordCountRef = useRef<number>(0);
  const lastParagraphCountRef = useRef<number>(0);

  // Start/stop scheduler based on mode and enabled state
  useEffect(() => {
    if (enabled && feedbackScheduleMode !== 'manual') {
      startScheduler();
    } else {
      stopScheduler();
    }

    return () => {
      stopScheduler();
    };
  }, [enabled, feedbackScheduleMode, startScheduler, stopScheduler]);

  // Handle text changes with typing pause detection
  const handleTextChange = useCallback(
    (text: string) => {
      if (!enabled || feedbackScheduleMode === 'manual' || !isSchedulerActive) {
        return;
      }

      // Signal that typing has started
      onTypingStart();

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set up pause detection timer
      typingTimeoutRef.current = setTimeout(() => {
        // User has paused typing for the configured delay
        const wordCount = countWords(text);
        const paragraphCount = countParagraphs(text);

        // Check if we should trigger feedback based on the mode
        let shouldTrigger = false;

        if (feedbackScheduleMode === 'every-500-words') {
          // Trigger every 500 words
          const lastCheckpoint = Math.floor(lastWordCountRef.current / 500);
          const newCheckpoint = Math.floor(wordCount / 500);
          shouldTrigger = newCheckpoint > lastCheckpoint;
        } else if (feedbackScheduleMode === 'every-paragraph') {
          // Trigger when a new paragraph is completed
          shouldTrigger = paragraphCount > lastParagraphCountRef.current;
        }

        if (shouldTrigger) {
          triggerFeedback();
        }

        // Update metrics
        lastWordCountRef.current = wordCount;
        lastParagraphCountRef.current = paragraphCount;
        updateTextMetrics(text);
      }, feedbackSchedulePauseDelay);

      lastTextRef.current = text;
    },
    [
      enabled,
      feedbackScheduleMode,
      feedbackSchedulePauseDelay,
      isSchedulerActive,
      onTypingStart,
      triggerFeedback,
      updateTextMetrics,
    ]
  );

  // Manual trigger function for programmatic feedback requests
  const requestFeedback = useCallback(() => {
    if (checkFeedbackTrigger(lastTextRef.current)) {
      triggerFeedback();
    }
  }, [checkFeedbackTrigger, triggerFeedback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    handleTextChange,
    requestFeedback,
    isSchedulerActive,
    feedbackScheduleMode,
  };
}

// Helper functions (duplicated from store for hook independence)
function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function countParagraphs(text: string): number {
  if (!text.trim()) return 0;
  return text.split(/\n\n+/).filter((p) => p.trim()).length;
}
