import { create } from 'zustand';

export interface AISuggestion {
  id: string;
  fieldId: string;
  text: string;
  isLoading: boolean;
  error: string | null;
}

interface AISuggestionState {
  // State
  suggestions: Map<string, AISuggestion>;
  abortControllers: Map<string, AbortController>;

  // Actions
  fetchSuggestion: (
    fieldId: string,
    currentValue: string,
    context?: Record<string, unknown>
  ) => Promise<void>;
  fetchContinueWriting: (
    fieldId: string,
    currentValue: string,
    context?: Record<string, unknown>
  ) => Promise<void>;
  dismissSuggestion: (fieldId: string) => void;
  acceptSuggestion: (fieldId: string) => string | null;
  acceptPartialSuggestion: (fieldId: string, wordCount: number) => string | null;
  clearAll: () => void;
}

function generateSuggestionId(): string {
  return `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Mock suggestions for demonstration - in production this would call the AI API
function getMockSuggestion(currentValue: string, fieldId: string): string {
  const suggestions: Record<string, string[]> = {
    notes: [
      'This transaction was for my monthly subscription.',
      'Purchased office supplies for the team meeting.',
      'Expense reimbursement for client dinner.',
      'Regular monthly payment for cloud services.',
    ],
    description: [
      'Payment for services rendered in January',
      'Monthly subscription fee',
      'Office equipment and supplies',
      'Travel expenses for business trip',
    ],
    default: [
      'Additional details can be added here.',
      'Please review and confirm the details.',
      'This entry requires further documentation.',
    ],
  };

  const fieldSuggestions =
    suggestions[fieldId] || suggestions[fieldId.includes('notes') ? 'notes' : 'default'];
  const randomIndex = Math.floor(Math.random() * fieldSuggestions.length);
  let suggestion = fieldSuggestions[randomIndex];

  // If user has already typed something, try to complete it
  if (currentValue.trim()) {
    const lastWord = currentValue.trim().split(/\s+/).pop()?.toLowerCase() || '';
    if (lastWord.length >= 2) {
      // Try to find a suggestion that could follow the current text
      const completions: Record<string, string> = {
        'thi': 's was a routine monthly expense.',
        'mon': 'thly subscription payment processed.',
        'pay': 'ment confirmed and recorded.',
        'for': ' office supplies and equipment.',
        'pur': 'chased for business use.',
        'exp': 'ense category: Business Operations.',
        'bus': 'iness expense - approved.',
        'off': 'ice supplies for Q1.',
        'tra': 'nsaction complete.',
        'ref': 'und processed successfully.',
      };

      for (const [prefix, completion] of Object.entries(completions)) {
        if (lastWord.startsWith(prefix)) {
          suggestion = completion;
          break;
        }
      }
    }
  }

  return suggestion;
}

// Mock continue writing suggestions - generates 1-3 sentences based on document style
function getMockContinueWriting(currentValue: string): string {
  // Analyze document style from existing text
  const sentences = currentValue.split(/[.!?]+/).filter(s => s.trim());
  const avgSentenceLength = sentences.length > 0
    ? sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length
    : 10;

  // Determine style: formal, casual, or technical
  const isFormal = currentValue.includes('therefore') || currentValue.includes('however') || currentValue.includes('furthermore');
  const isTechnical = currentValue.includes('API') || currentValue.includes('function') || currentValue.includes('data');
  const isCasual = currentValue.includes('!') || currentValue.includes("I'm") || currentValue.includes("it's");

  // Context-aware continuations
  const continuations: { pattern: RegExp; options: string[] }[] = [
    {
      pattern: /transaction|payment|expense/i,
      options: [
        ' This transaction was processed successfully. The funds should appear in your account within 1-2 business days.',
        ' Please verify the payment details before finalizing. Contact support if you notice any discrepancies.',
        ' The expense has been categorized automatically based on the merchant type.',
      ]
    },
    {
      pattern: /meeting|schedule|calendar/i,
      options: [
        ' The meeting is scheduled for next week. All attendees have been notified via email.',
        ' Please confirm your availability at your earliest convenience. We need to finalize the agenda.',
        ' Calendar invites have been sent to all participants.',
      ]
    },
    {
      pattern: /report|analysis|data/i,
      options: [
        ' The data shows a positive trend over the past quarter. Further analysis is recommended.',
        ' This report summarizes the key findings from our recent study. Additional details are available upon request.',
        ' The analysis reveals several important insights that warrant attention.',
      ]
    },
  ];

  // Find matching context
  for (const { pattern, options } of continuations) {
    if (pattern.test(currentValue)) {
      return options[Math.floor(Math.random() * options.length)];
    }
  }

  // Style-based default continuations
  if (isFormal) {
    const formal = [
      ' Furthermore, this information should be considered in context. Additional documentation may be required.',
      ' It is important to note that these details are subject to verification. Please review accordingly.',
      ' Therefore, we recommend reviewing the complete documentation before proceeding.',
    ];
    return formal[Math.floor(Math.random() * formal.length)];
  }

  if (isTechnical) {
    const technical = [
      ' The implementation follows established best practices. See the documentation for more details.',
      ' This approach ensures consistency across the system. Error handling should be tested thoroughly.',
      ' Consider reviewing the edge cases before deployment.',
    ];
    return technical[Math.floor(Math.random() * technical.length)];
  }

  if (isCasual) {
    const casual = [
      ' Hope that helps! Let me know if you have any questions.',
      " Feel free to reach out if you need anything else. I'm happy to help!",
      " That's pretty much it for now. Will update if anything changes!",
    ];
    return casual[Math.floor(Math.random() * casual.length)];
  }

  // Generic continuations (match average sentence length roughly)
  const generic = avgSentenceLength > 12 ? [
    ' Additional details will be provided as they become available. Please ensure all relevant information is documented.',
    ' This information has been recorded for future reference. Let us know if you need any clarification.',
    ' We will follow up with more details shortly. Thank you for your patience.',
  ] : [
    ' More details to follow. Stay tuned.',
    ' Please review and confirm. Thanks!',
    ' Will update soon. Let me know.',
  ];

  return generic[Math.floor(Math.random() * generic.length)];
}

export const useAISuggestionStore = create<AISuggestionState>()((set, get) => ({
  // Initial state
  suggestions: new Map(),
  abortControllers: new Map(),

  // Fetch AI suggestion
  // Note: context parameter is reserved for future API integration
  fetchSuggestion: async (fieldId, currentValue, context) => {
    // context will be used when integrating with a real AI backend
    void context;
    const state = get();

    // Cancel any existing request for this field
    const existingController = state.abortControllers.get(fieldId);
    if (existingController) {
      existingController.abort();
    }

    const abortController = new AbortController();
    const suggestionId = generateSuggestionId();

    // Set loading state
    set((state) => {
      const newSuggestions = new Map(state.suggestions);
      const newAbortControllers = new Map(state.abortControllers);

      newSuggestions.set(fieldId, {
        id: suggestionId,
        fieldId,
        text: '',
        isLoading: true,
        error: null,
      });
      newAbortControllers.set(fieldId, abortController);

      return {
        suggestions: newSuggestions,
        abortControllers: newAbortControllers,
      };
    });

    try {
      // Simulate API delay (500ms debounce is handled by the hook)
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 300);
        abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });

      if (abortController.signal.aborted) {
        return;
      }

      // Get mock suggestion (in production, this would be an API call)
      const suggestionText = getMockSuggestion(currentValue, fieldId);

      set((state) => {
        const newSuggestions = new Map(state.suggestions);
        const existing = newSuggestions.get(fieldId);
        if (existing && existing.id === suggestionId) {
          newSuggestions.set(fieldId, {
            ...existing,
            text: suggestionText,
            isLoading: false,
          });
        }
        return { suggestions: newSuggestions };
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Request was cancelled, don't update state
        return;
      }

      set((state) => {
        const newSuggestions = new Map(state.suggestions);
        const existing = newSuggestions.get(fieldId);
        if (existing && existing.id === suggestionId) {
          newSuggestions.set(fieldId, {
            ...existing,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch suggestion',
          });
        }
        return { suggestions: newSuggestions };
      });
    }
  },

  // Fetch AI continue writing suggestion (triggered by Cmd+Shift+Enter)
  // Generates 1-3 sentences based on document context and style
  fetchContinueWriting: async (fieldId, currentValue, context) => {
    // context will be used when integrating with a real AI backend
    void context;
    const state = get();

    // Require some text to continue from
    if (!currentValue.trim()) {
      return;
    }

    // Cancel any existing request for this field
    const existingController = state.abortControllers.get(fieldId);
    if (existingController) {
      existingController.abort();
    }

    const abortController = new AbortController();
    const suggestionId = generateSuggestionId();

    // Set loading state
    set((state) => {
      const newSuggestions = new Map(state.suggestions);
      const newAbortControllers = new Map(state.abortControllers);

      newSuggestions.set(fieldId, {
        id: suggestionId,
        fieldId,
        text: '',
        isLoading: true,
        error: null,
      });
      newAbortControllers.set(fieldId, abortController);

      return {
        suggestions: newSuggestions,
        abortControllers: newAbortControllers,
      };
    });

    try {
      // Simulate API delay for continue writing (slightly longer as it generates more text)
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 400);
        abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });

      if (abortController.signal.aborted) {
        return;
      }

      // Get mock continue writing suggestion
      const suggestionText = getMockContinueWriting(currentValue);

      set((state) => {
        const newSuggestions = new Map(state.suggestions);
        const existing = newSuggestions.get(fieldId);
        if (existing && existing.id === suggestionId) {
          newSuggestions.set(fieldId, {
            ...existing,
            text: suggestionText,
            isLoading: false,
          });
        }
        return { suggestions: newSuggestions };
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Request was cancelled, don't update state
        return;
      }

      set((state) => {
        const newSuggestions = new Map(state.suggestions);
        const existing = newSuggestions.get(fieldId);
        if (existing && existing.id === suggestionId) {
          newSuggestions.set(fieldId, {
            ...existing,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to generate continuation',
          });
        }
        return { suggestions: newSuggestions };
      });
    }
  },

  // Dismiss suggestion
  dismissSuggestion: (fieldId) => {
    const state = get();

    // Cancel any pending request
    const controller = state.abortControllers.get(fieldId);
    if (controller) {
      controller.abort();
    }

    set((state) => {
      const newSuggestions = new Map(state.suggestions);
      const newAbortControllers = new Map(state.abortControllers);

      newSuggestions.delete(fieldId);
      newAbortControllers.delete(fieldId);

      return {
        suggestions: newSuggestions,
        abortControllers: newAbortControllers,
      };
    });
  },

  // Accept full suggestion and return the combined text
  acceptSuggestion: (fieldId) => {
    const state = get();
    const suggestion = state.suggestions.get(fieldId);

    if (!suggestion || !suggestion.text || suggestion.isLoading) {
      return null;
    }

    const acceptedText = suggestion.text;

    // Clear the suggestion
    set((state) => {
      const newSuggestions = new Map(state.suggestions);
      newSuggestions.delete(fieldId);
      return { suggestions: newSuggestions };
    });

    return acceptedText;
  },

  // Accept partial suggestion (word by word) and return the partial text
  acceptPartialSuggestion: (fieldId, wordCount) => {
    const state = get();
    const suggestion = state.suggestions.get(fieldId);

    if (!suggestion || !suggestion.text || suggestion.isLoading) {
      return null;
    }

    const words = suggestion.text.split(/(\s+)/);
    let acceptedPart = '';
    let remainingPart = '';
    let wordsAdded = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      // Count actual words (not whitespace)
      if (word.trim()) {
        wordsAdded++;
      }
      if (wordsAdded <= wordCount) {
        acceptedPart += word;
      } else {
        remainingPart = words.slice(i).join('');
        break;
      }
    }

    // Update the suggestion with the remaining text
    if (remainingPart.trim()) {
      set((state) => {
        const newSuggestions = new Map(state.suggestions);
        newSuggestions.set(fieldId, {
          ...suggestion,
          text: remainingPart.trim(),
        });
        return { suggestions: newSuggestions };
      });
    } else {
      // No more text remaining, clear the suggestion
      set((state) => {
        const newSuggestions = new Map(state.suggestions);
        newSuggestions.delete(fieldId);
        return { suggestions: newSuggestions };
      });
    }

    return acceptedPart;
  },

  // Clear all suggestions
  clearAll: () => {
    const state = get();

    // Cancel all pending requests
    state.abortControllers.forEach((controller) => controller.abort());

    set({
      suggestions: new Map(),
      abortControllers: new Map(),
    });
  },
}));

// Hook to get suggestion for specific field
export function useAISuggestion(fieldId: string) {
  return useAISuggestionStore((state) => state.suggestions.get(fieldId));
}
