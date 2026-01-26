import { create } from 'zustand';

export interface TypewriterScrollState {
  // Whether typewriter scroll mode is enabled
  isEnabled: boolean;

  // The target element being monitored (textarea/input)
  targetElement: HTMLTextAreaElement | HTMLInputElement | null;

  // The scrollable container (parent element with overflow)
  scrollContainer: HTMLElement | null;

  // Actions
  toggle: () => void;
  enable: () => void;
  disable: () => void;
  setTargetElement: (element: HTMLTextAreaElement | HTMLInputElement | null) => void;
  setScrollContainer: (element: HTMLElement | null) => void;
  scrollToCurrentLine: () => void;
}

/**
 * Calculate the position of the cursor line within a textarea
 */
function getCursorLinePosition(element: HTMLTextAreaElement | HTMLInputElement): {
  lineTop: number;
  lineHeight: number;
} {
  const computedStyle = window.getComputedStyle(element);
  const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) * 1.2;
  const paddingTop = parseFloat(computedStyle.paddingTop) || 0;

  const cursorPosition = element.selectionStart ?? 0;
  const text = element.value.substring(0, cursorPosition);
  const lineNumber = text.split('\n').length - 1;

  // Calculate the top position of the current line
  const lineTop = paddingTop + lineNumber * lineHeight;

  return { lineTop, lineHeight };
}

export const useTypewriterScrollStore = create<TypewriterScrollState>()((set, get) => ({
  isEnabled: false,
  targetElement: null,
  scrollContainer: null,

  toggle: () => {
    const state = get();
    if (state.isEnabled) {
      set({ isEnabled: false });
    } else {
      set({ isEnabled: true });
      // Perform initial scroll on enable
      requestAnimationFrame(() => {
        get().scrollToCurrentLine();
      });
    }
  },

  enable: () => {
    set({ isEnabled: true });
    requestAnimationFrame(() => {
      get().scrollToCurrentLine();
    });
  },

  disable: () => {
    set({ isEnabled: false });
  },

  setTargetElement: (element) => {
    set({ targetElement: element });
    if (element && get().isEnabled) {
      requestAnimationFrame(() => {
        get().scrollToCurrentLine();
      });
    }
  },

  setScrollContainer: (element) => {
    set({ scrollContainer: element });
  },

  scrollToCurrentLine: () => {
    const { targetElement, scrollContainer, isEnabled } = get();
    if (!isEnabled || !targetElement) return;

    // Find the scrollable container if not explicitly set
    const container = scrollContainer || findScrollableParent(targetElement);
    if (!container) return;

    const { lineTop, lineHeight } = getCursorLinePosition(targetElement);

    // Get the element's position relative to the scroll container
    const elementRect = targetElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Calculate where the current line is within the container
    const linePositionInContainer =
      elementRect.top - containerRect.top + container.scrollTop + lineTop;

    // Calculate the target scroll position to center the line
    const containerHeight = container.clientHeight;
    const targetScrollTop = linePositionInContainer - containerHeight / 2 + lineHeight / 2;

    // Smooth scroll to the target position
    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });
  },
}));

/**
 * Find the nearest scrollable parent element
 */
function findScrollableParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;

    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }

    parent = parent.parentElement;
  }

  // Fallback to document scrolling element or body
  return document.scrollingElement as HTMLElement || document.body;
}

// Individual selectors for stable references
const selectIsEnabled = (state: TypewriterScrollState) => state.isEnabled;
const selectTargetElement = (state: TypewriterScrollState) => state.targetElement;

// Combined hook using individual selectors
export function useTypewriterScroll() {
  const isEnabled = useTypewriterScrollStore(selectIsEnabled);
  const targetElement = useTypewriterScrollStore(selectTargetElement);

  return {
    isEnabled,
    targetElement,
  };
}
