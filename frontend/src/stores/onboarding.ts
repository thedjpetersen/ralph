import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string | null;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingState {
  // State
  hasCompletedTour: boolean;
  hasDismissedTour: boolean;
  isTourActive: boolean;
  currentStepIndex: number;

  // Actions
  startTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (index: number) => void;
  skipTour: () => void;
  completeTour: () => void;
  dismissTourPermanently: () => void;
  resetTour: () => void;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to ClockZen!',
    description: 'Let us show you around. This quick tour will highlight the key features to help you get started.',
    targetSelector: null,
    placement: 'center',
  },
  {
    id: 'sidebar',
    title: 'Navigation Sidebar',
    description: 'Access all your financial data from the sidebar. Navigate between Dashboard, Receipts, Transactions, and more.',
    targetSelector: '.sidebar-nav',
    placement: 'right',
  },
  {
    id: 'editor',
    title: 'Document Editor',
    description: 'Create and edit documents with a rich text editor. Use keyboard shortcuts for quick formatting.',
    targetSelector: '#main-content',
    placement: 'left',
  },
  {
    id: 'ai-authors',
    title: 'AI Authors',
    description: 'Get AI-powered writing assistance. Rewrite text, adjust tone, or get suggestions to improve your content.',
    targetSelector: '.sidebar-section',
    placement: 'right',
  },
  {
    id: 'comments',
    title: 'Comments & Insights',
    description: 'AI can provide insights and suggestions on your documents. Comments appear in context with your text.',
    targetSelector: '.app-shell-content',
    placement: 'bottom',
  },
];

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // Initial state
      hasCompletedTour: false,
      hasDismissedTour: false,
      isTourActive: false,
      currentStepIndex: 0,

      // Start the tour
      startTour: () => {
        set({
          isTourActive: true,
          currentStepIndex: 0,
        });
      },

      // Move to next step
      nextStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex < TOUR_STEPS.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
        } else {
          // Tour complete
          get().completeTour();
        }
      },

      // Move to previous step
      previousStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },

      // Go to specific step
      goToStep: (index: number) => {
        if (index >= 0 && index < TOUR_STEPS.length) {
          set({ currentStepIndex: index });
        }
      },

      // Skip tour (can be resumed later)
      skipTour: () => {
        set({
          isTourActive: false,
          currentStepIndex: 0,
        });
      },

      // Complete the tour
      completeTour: () => {
        set({
          isTourActive: false,
          hasCompletedTour: true,
          currentStepIndex: 0,
        });
      },

      // Dismiss tour permanently ("Don't show again")
      dismissTourPermanently: () => {
        set({
          isTourActive: false,
          hasDismissedTour: true,
          currentStepIndex: 0,
        });
      },

      // Reset tour state (for testing or re-enabling)
      resetTour: () => {
        set({
          hasCompletedTour: false,
          hasDismissedTour: false,
          isTourActive: false,
          currentStepIndex: 0,
        });
      },
    }),
    {
      name: 'clockzen-onboarding-storage',
      partialize: (state) => ({
        hasCompletedTour: state.hasCompletedTour,
        hasDismissedTour: state.hasDismissedTour,
      }),
    }
  )
);

// Selectors
export const selectIsTourActive = (state: OnboardingState) => state.isTourActive;
export const selectCurrentStepIndex = (state: OnboardingState) => state.currentStepIndex;
export const selectHasCompletedTour = (state: OnboardingState) => state.hasCompletedTour;
export const selectHasDismissedTour = (state: OnboardingState) => state.hasDismissedTour;
export const selectShouldShowTour = (state: OnboardingState) =>
  !state.hasCompletedTour && !state.hasDismissedTour;

// Hook for accessing onboarding state with optimized selectors
export function useOnboarding() {
  const isTourActive = useOnboardingStore(selectIsTourActive);
  const currentStepIndex = useOnboardingStore(selectCurrentStepIndex);
  const hasCompletedTour = useOnboardingStore(selectHasCompletedTour);
  const hasDismissedTour = useOnboardingStore(selectHasDismissedTour);
  const shouldShowTour = useOnboardingStore(selectShouldShowTour);

  const startTour = useOnboardingStore((state) => state.startTour);
  const nextStep = useOnboardingStore((state) => state.nextStep);
  const previousStep = useOnboardingStore((state) => state.previousStep);
  const goToStep = useOnboardingStore((state) => state.goToStep);
  const skipTour = useOnboardingStore((state) => state.skipTour);
  const completeTour = useOnboardingStore((state) => state.completeTour);
  const dismissTourPermanently = useOnboardingStore((state) => state.dismissTourPermanently);
  const resetTour = useOnboardingStore((state) => state.resetTour);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const totalSteps = TOUR_STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return {
    isTourActive,
    currentStepIndex,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    hasCompletedTour,
    hasDismissedTour,
    shouldShowTour,
    startTour,
    nextStep,
    previousStep,
    goToStep,
    skipTour,
    completeTour,
    dismissTourPermanently,
    resetTour,
  };
}
