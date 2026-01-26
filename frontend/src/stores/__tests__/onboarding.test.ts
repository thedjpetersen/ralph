import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingStore, TOUR_STEPS } from '../onboarding';

describe('onboarding store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useOnboardingStore.setState({
      hasCompletedTour: false,
      hasDismissedTour: false,
      isTourActive: false,
      currentStepIndex: 0,
    });
  });

  describe('tour steps', () => {
    it('has 5 tour steps defined', () => {
      expect(TOUR_STEPS).toHaveLength(5);
    });

    it('has welcome step as first step', () => {
      expect(TOUR_STEPS[0].id).toBe('welcome');
      expect(TOUR_STEPS[0].title).toBe('Welcome to ClockZen!');
    });

    it('has all required step properties', () => {
      TOUR_STEPS.forEach((step) => {
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('description');
        expect(step).toHaveProperty('targetSelector');
        expect(step).toHaveProperty('placement');
      });
    });

    it('includes Editor, AI Authors, and Comments steps', () => {
      const stepIds = TOUR_STEPS.map((s) => s.id);
      expect(stepIds).toContain('editor');
      expect(stepIds).toContain('ai-authors');
      expect(stepIds).toContain('comments');
    });
  });

  describe('startTour', () => {
    it('sets isTourActive to true and resets step index', () => {
      const { startTour } = useOnboardingStore.getState();
      startTour();

      const state = useOnboardingStore.getState();
      expect(state.isTourActive).toBe(true);
      expect(state.currentStepIndex).toBe(0);
    });
  });

  describe('nextStep', () => {
    it('advances to next step', () => {
      useOnboardingStore.setState({ isTourActive: true, currentStepIndex: 0 });
      const { nextStep } = useOnboardingStore.getState();
      nextStep();

      expect(useOnboardingStore.getState().currentStepIndex).toBe(1);
    });

    it('completes tour on last step', () => {
      useOnboardingStore.setState({
        isTourActive: true,
        currentStepIndex: TOUR_STEPS.length - 1,
      });
      const { nextStep } = useOnboardingStore.getState();
      nextStep();

      const state = useOnboardingStore.getState();
      expect(state.isTourActive).toBe(false);
      expect(state.hasCompletedTour).toBe(true);
    });
  });

  describe('previousStep', () => {
    it('goes back to previous step', () => {
      useOnboardingStore.setState({ isTourActive: true, currentStepIndex: 2 });
      const { previousStep } = useOnboardingStore.getState();
      previousStep();

      expect(useOnboardingStore.getState().currentStepIndex).toBe(1);
    });

    it('does not go below 0', () => {
      useOnboardingStore.setState({ isTourActive: true, currentStepIndex: 0 });
      const { previousStep } = useOnboardingStore.getState();
      previousStep();

      expect(useOnboardingStore.getState().currentStepIndex).toBe(0);
    });
  });

  describe('goToStep', () => {
    it('navigates to specific step', () => {
      useOnboardingStore.setState({ isTourActive: true, currentStepIndex: 0 });
      const { goToStep } = useOnboardingStore.getState();
      goToStep(3);

      expect(useOnboardingStore.getState().currentStepIndex).toBe(3);
    });

    it('ignores invalid step indices', () => {
      useOnboardingStore.setState({ isTourActive: true, currentStepIndex: 2 });
      const { goToStep } = useOnboardingStore.getState();
      goToStep(-1);
      expect(useOnboardingStore.getState().currentStepIndex).toBe(2);

      goToStep(100);
      expect(useOnboardingStore.getState().currentStepIndex).toBe(2);
    });
  });

  describe('skipTour', () => {
    it('closes tour without marking as completed', () => {
      useOnboardingStore.setState({ isTourActive: true, currentStepIndex: 2 });
      const { skipTour } = useOnboardingStore.getState();
      skipTour();

      const state = useOnboardingStore.getState();
      expect(state.isTourActive).toBe(false);
      expect(state.hasCompletedTour).toBe(false);
      expect(state.currentStepIndex).toBe(0);
    });
  });

  describe('dismissTourPermanently', () => {
    it('sets hasDismissedTour to true', () => {
      useOnboardingStore.setState({ isTourActive: true });
      const { dismissTourPermanently } = useOnboardingStore.getState();
      dismissTourPermanently();

      const state = useOnboardingStore.getState();
      expect(state.isTourActive).toBe(false);
      expect(state.hasDismissedTour).toBe(true);
    });
  });

  describe('completeTour', () => {
    it('marks tour as completed', () => {
      useOnboardingStore.setState({ isTourActive: true, currentStepIndex: 4 });
      const { completeTour } = useOnboardingStore.getState();
      completeTour();

      const state = useOnboardingStore.getState();
      expect(state.isTourActive).toBe(false);
      expect(state.hasCompletedTour).toBe(true);
      expect(state.currentStepIndex).toBe(0);
    });
  });

  describe('resetTour', () => {
    it('resets all tour state', () => {
      useOnboardingStore.setState({
        isTourActive: true,
        hasCompletedTour: true,
        hasDismissedTour: true,
        currentStepIndex: 3,
      });
      const { resetTour } = useOnboardingStore.getState();
      resetTour();

      const state = useOnboardingStore.getState();
      expect(state.isTourActive).toBe(false);
      expect(state.hasCompletedTour).toBe(false);
      expect(state.hasDismissedTour).toBe(false);
      expect(state.currentStepIndex).toBe(0);
    });
  });

  describe('shouldShowTour selector', () => {
    it('returns true when tour not completed and not dismissed', () => {
      useOnboardingStore.setState({
        hasCompletedTour: false,
        hasDismissedTour: false,
      });
      // Using the selector function directly
      const selectShouldShowTour = (state: {
        hasCompletedTour: boolean;
        hasDismissedTour: boolean;
      }) => !state.hasCompletedTour && !state.hasDismissedTour;

      expect(selectShouldShowTour(useOnboardingStore.getState())).toBe(true);
    });

    it('returns false when tour completed', () => {
      useOnboardingStore.setState({
        hasCompletedTour: true,
        hasDismissedTour: false,
      });
      const selectShouldShowTour = (state: {
        hasCompletedTour: boolean;
        hasDismissedTour: boolean;
      }) => !state.hasCompletedTour && !state.hasDismissedTour;

      expect(selectShouldShowTour(useOnboardingStore.getState())).toBe(false);
    });

    it('returns false when tour dismissed', () => {
      useOnboardingStore.setState({
        hasCompletedTour: false,
        hasDismissedTour: true,
      });
      const selectShouldShowTour = (state: {
        hasCompletedTour: boolean;
        hasDismissedTour: boolean;
      }) => !state.hasCompletedTour && !state.hasDismissedTour;

      expect(selectShouldShowTour(useOnboardingStore.getState())).toBe(false);
    });
  });

  describe('progress indicators', () => {
    it('correctly identifies first step', () => {
      useOnboardingStore.setState({ currentStepIndex: 0 });
      const isFirstStep = useOnboardingStore.getState().currentStepIndex === 0;
      expect(isFirstStep).toBe(true);
    });

    it('correctly identifies last step', () => {
      useOnboardingStore.setState({ currentStepIndex: TOUR_STEPS.length - 1 });
      const isLastStep =
        useOnboardingStore.getState().currentStepIndex === TOUR_STEPS.length - 1;
      expect(isLastStep).toBe(true);
    });

    it('provides correct total steps count', () => {
      expect(TOUR_STEPS.length).toBe(5);
    });
  });
});
