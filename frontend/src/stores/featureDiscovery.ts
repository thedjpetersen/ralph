import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Feature IDs for discovery tooltips
 */
export type FeatureId =
  | 'first-ai-comment'
  | 'first-text-selection'
  | 'first-slash-command';

/**
 * Feature discovery tooltip configuration
 */
export interface FeatureTooltip {
  id: FeatureId;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Feature tooltip definitions
 */
export const FEATURE_TOOLTIPS: Record<FeatureId, FeatureTooltip> = {
  'first-ai-comment': {
    id: 'first-ai-comment',
    title: 'AI Comments',
    description: 'AI can provide insights and feedback on your writing. Review comments in the panel or click to see the relevant text.',
    position: 'left',
  },
  'first-text-selection': {
    id: 'first-text-selection',
    title: 'Quick Formatting',
    description: 'Select text to access formatting options, get AI feedback, or add highlights. Try bold, italic, or links!',
    position: 'bottom',
  },
  'first-slash-command': {
    id: 'first-slash-command',
    title: 'Command Palette',
    description: 'Press Cmd/Ctrl + K to open the command palette. Access all features quickly with keyboard shortcuts.',
    position: 'bottom',
  },
};

interface FeatureDiscoveryState {
  // Persisted state - which features have been permanently dismissed
  dismissedFeatures: FeatureId[];

  // Session state - which features have been seen this session
  seenThisSession: FeatureId[];

  // Currently showing tooltip (only one at a time)
  activeTooltip: FeatureId | null;

  // Whether user has opted out of all feature discovery
  allDismissed: boolean;

  // Actions
  triggerTooltip: (featureId: FeatureId) => boolean;
  dismissTooltip: (featureId: FeatureId, permanent?: boolean) => void;
  dismissAllPermanently: () => void;
  closeActiveTooltip: () => void;
  resetDismissed: () => void;
  canShowTooltip: (featureId: FeatureId) => boolean;
}

export const useFeatureDiscoveryStore = create<FeatureDiscoveryState>()(
  persist(
    (set, get) => ({
      // Initial state
      dismissedFeatures: [],
      seenThisSession: [],
      activeTooltip: null,
      allDismissed: false,

      /**
       * Attempt to trigger a tooltip for a feature.
       * Returns true if tooltip was shown, false if it was skipped.
       */
      triggerTooltip: (featureId: FeatureId) => {
        const state = get();

        // Don't show if all tooltips are dismissed
        if (state.allDismissed) return false;

        // Don't show if this feature was permanently dismissed
        if (state.dismissedFeatures.includes(featureId)) return false;

        // Don't show if already seen this session (max one per session per feature)
        if (state.seenThisSession.includes(featureId)) return false;

        // Don't show if another tooltip is already active (max one at a time)
        if (state.activeTooltip !== null) return false;

        // Show the tooltip
        set({
          activeTooltip: featureId,
          seenThisSession: [...state.seenThisSession, featureId],
        });

        return true;
      },

      /**
       * Dismiss a tooltip. If permanent, it won't show again.
       */
      dismissTooltip: (featureId: FeatureId, permanent = false) => {
        const state = get();

        set({
          activeTooltip: state.activeTooltip === featureId ? null : state.activeTooltip,
          dismissedFeatures: permanent && !state.dismissedFeatures.includes(featureId)
            ? [...state.dismissedFeatures, featureId]
            : state.dismissedFeatures,
        });
      },

      /**
       * Dismiss all feature discovery tooltips permanently
       */
      dismissAllPermanently: () => {
        set({
          activeTooltip: null,
          allDismissed: true,
        });
      },

      /**
       * Close the currently active tooltip (without permanent dismiss)
       */
      closeActiveTooltip: () => {
        set({ activeTooltip: null });
      },

      /**
       * Reset all dismissed features (for testing or user preference)
       */
      resetDismissed: () => {
        set({
          dismissedFeatures: [],
          seenThisSession: [],
          allDismissed: false,
        });
      },

      /**
       * Check if a tooltip can be shown for a feature
       */
      canShowTooltip: (featureId: FeatureId) => {
        const state = get();

        if (state.allDismissed) return false;
        if (state.dismissedFeatures.includes(featureId)) return false;
        if (state.seenThisSession.includes(featureId)) return false;
        if (state.activeTooltip !== null) return false;

        return true;
      },
    }),
    {
      name: 'clockzen-feature-discovery',
      partialize: (state) => ({
        dismissedFeatures: state.dismissedFeatures,
        allDismissed: state.allDismissed,
      }),
    }
  )
);

// Selectors
export const selectActiveTooltip = (state: FeatureDiscoveryState) => state.activeTooltip;
export const selectDismissedFeatures = (state: FeatureDiscoveryState) => state.dismissedFeatures;
export const selectAllDismissed = (state: FeatureDiscoveryState) => state.allDismissed;

/**
 * Hook for using feature discovery
 */
export function useFeatureDiscovery() {
  const activeTooltip = useFeatureDiscoveryStore(selectActiveTooltip);
  const dismissedFeatures = useFeatureDiscoveryStore(selectDismissedFeatures);
  const allDismissed = useFeatureDiscoveryStore(selectAllDismissed);

  const triggerTooltip = useFeatureDiscoveryStore((state) => state.triggerTooltip);
  const dismissTooltip = useFeatureDiscoveryStore((state) => state.dismissTooltip);
  const dismissAllPermanently = useFeatureDiscoveryStore((state) => state.dismissAllPermanently);
  const closeActiveTooltip = useFeatureDiscoveryStore((state) => state.closeActiveTooltip);
  const resetDismissed = useFeatureDiscoveryStore((state) => state.resetDismissed);
  const canShowTooltip = useFeatureDiscoveryStore((state) => state.canShowTooltip);

  return {
    activeTooltip,
    dismissedFeatures,
    allDismissed,
    triggerTooltip,
    dismissTooltip,
    dismissAllPermanently,
    closeActiveTooltip,
    resetDismissed,
    canShowTooltip,
    getTooltipConfig: (featureId: FeatureId) => FEATURE_TOOLTIPS[featureId],
  };
}
