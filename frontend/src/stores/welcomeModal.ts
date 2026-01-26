import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QuickStartTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  content?: string;
}

export const FEATURED_TEMPLATES: QuickStartTemplate[] = [
  {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    description: 'Structured template for capturing meeting discussions and action items',
    icon: '📝',
    content: `# Meeting Notes

**Date:** [Date]
**Attendees:** [Names]

## Agenda
-

## Discussion Points
-

## Action Items
- [ ]

## Next Meeting
-
`,
  },
  {
    id: 'project-plan',
    title: 'Project Plan',
    description: 'Organize your project goals, milestones, and deliverables',
    icon: '📋',
    content: `# Project Plan

## Overview
Brief description of the project...

## Goals
1.
2.
3.

## Milestones
| Milestone | Target Date | Status |
|-----------|-------------|--------|
|           |             |        |

## Resources
-

## Risks & Mitigations
-
`,
  },
  {
    id: 'blog-post',
    title: 'Blog Post',
    description: 'Start with a structured outline for engaging blog content',
    icon: '✍️',
    content: `# Blog Post Title

*Hook or opening line to grab attention...*

## Introduction
Set the stage for your topic...

## Main Points

### Point 1
Details...

### Point 2
Details...

### Point 3
Details...

## Conclusion
Wrap up and call to action...

---
*Tags: [tag1], [tag2]*
`,
  },
  {
    id: 'weekly-review',
    title: 'Weekly Review',
    description: 'Reflect on your week and plan ahead',
    icon: '📅',
    content: `# Weekly Review

**Week of:** [Date Range]

## Accomplishments
-

## Challenges
-

## Lessons Learned
-

## Next Week's Priorities
1.
2.
3.

## Notes
-
`,
  },
];

interface WelcomeModalState {
  // State
  isOpen: boolean;
  hasSeenWelcome: boolean;
  dontShowAgain: boolean;

  // Actions
  openModal: () => void;
  closeModal: () => void;
  dismissPermanently: () => void;
  setDontShowAgain: (value: boolean) => void;
  resetWelcome: () => void;
}

export const useWelcomeModalStore = create<WelcomeModalState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOpen: false,
      hasSeenWelcome: false,
      dontShowAgain: false,

      // Open the welcome modal
      openModal: () => {
        set({ isOpen: true });
      },

      // Close the modal (marks as seen if dontShowAgain is checked)
      closeModal: () => {
        const { dontShowAgain } = get();
        set({
          isOpen: false,
          hasSeenWelcome: dontShowAgain ? true : get().hasSeenWelcome,
        });
      },

      // Dismiss the modal permanently
      dismissPermanently: () => {
        set({
          isOpen: false,
          hasSeenWelcome: true,
          dontShowAgain: true,
        });
      },

      // Set the "don't show again" checkbox state
      setDontShowAgain: (value: boolean) => {
        set({ dontShowAgain: value });
      },

      // Reset welcome state (for testing or re-enabling)
      resetWelcome: () => {
        set({
          isOpen: false,
          hasSeenWelcome: false,
          dontShowAgain: false,
        });
      },
    }),
    {
      name: 'clockzen-welcome-modal-storage',
      partialize: (state) => ({
        hasSeenWelcome: state.hasSeenWelcome,
        dontShowAgain: state.dontShowAgain,
      }),
    }
  )
);

// Selectors
export const selectIsOpen = (state: WelcomeModalState) => state.isOpen;
export const selectHasSeenWelcome = (state: WelcomeModalState) => state.hasSeenWelcome;
export const selectDontShowAgain = (state: WelcomeModalState) => state.dontShowAgain;
export const selectShouldShowWelcome = (state: WelcomeModalState) =>
  !state.hasSeenWelcome && !state.dontShowAgain;

// Hook for accessing welcome modal state with optimized selectors
export function useWelcomeModal() {
  const isOpen = useWelcomeModalStore(selectIsOpen);
  const hasSeenWelcome = useWelcomeModalStore(selectHasSeenWelcome);
  const dontShowAgain = useWelcomeModalStore(selectDontShowAgain);
  const shouldShowWelcome = useWelcomeModalStore(selectShouldShowWelcome);

  const openModal = useWelcomeModalStore((state) => state.openModal);
  const closeModal = useWelcomeModalStore((state) => state.closeModal);
  const dismissPermanently = useWelcomeModalStore((state) => state.dismissPermanently);
  const setDontShowAgain = useWelcomeModalStore((state) => state.setDontShowAgain);
  const resetWelcome = useWelcomeModalStore((state) => state.resetWelcome);

  return {
    isOpen,
    hasSeenWelcome,
    dontShowAgain,
    shouldShowWelcome,
    openModal,
    closeModal,
    dismissPermanently,
    setDontShowAgain,
    resetWelcome,
  };
}
