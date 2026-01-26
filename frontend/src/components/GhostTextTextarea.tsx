import {
  useRef,
  useEffect,
  useCallback,
  type TextareaHTMLAttributes,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { useAISuggestionStore, useAISuggestion } from '../stores/aiSuggestions';
import './GhostTextTextarea.css';

export interface GhostTextTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  /** Unique identifier for this field's suggestions */
  fieldId: string;
  /** Current value of the textarea */
  value: string;
  /** Called when the value changes (either by typing or accepting suggestions) */
  onChange: (value: string) => void;
  /** Additional context to send with suggestion requests */
  context?: Record<string, unknown>;
  /** Debounce delay in ms before fetching suggestions (default: 500) */
  debounceMs?: number;
  /** Whether AI suggestions are enabled (default: true) */
  enableSuggestions?: boolean;
}

export function GhostTextTextarea({
  fieldId,
  value,
  onChange,
  context,
  debounceMs = 500,
  enableSuggestions = true,
  className = '',
  onKeyDown,
  ...props
}: GhostTextTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousValueRef = useRef(value);

  const suggestion = useAISuggestion(fieldId);
  const { fetchSuggestion, dismissSuggestion, acceptSuggestion, acceptPartialSuggestion } =
    useAISuggestionStore();

  // Debounced fetch suggestion
  const debouncedFetchSuggestion = useCallback(
    (currentValue: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (enableSuggestions && currentValue.trim()) {
          fetchSuggestion(fieldId, currentValue, context);
        }
      }, debounceMs);
    },
    [fieldId, context, debounceMs, enableSuggestions, fetchSuggestion]
  );

  // Handle value changes
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Dismiss existing suggestion when typing continues
      if (suggestion && !suggestion.isLoading) {
        dismissSuggestion(fieldId);
      }

      // Trigger new suggestion fetch
      debouncedFetchSuggestion(newValue);
    },
    [onChange, suggestion, fieldId, dismissSuggestion, debouncedFetchSuggestion]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Call original onKeyDown if provided
      if (onKeyDown) {
        onKeyDown(e);
        if (e.defaultPrevented) return;
      }

      // Only handle if we have a suggestion
      if (!suggestion?.text || suggestion.isLoading) {
        return;
      }

      // Tab: Accept full suggestion
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const acceptedText = acceptSuggestion(fieldId);
        if (acceptedText) {
          onChange(value + acceptedText);
        }
        return;
      }

      // Cmd/Ctrl + Right Arrow: Accept word by word
      if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const acceptedPart = acceptPartialSuggestion(fieldId, 1);
        if (acceptedPart) {
          onChange(value + acceptedPart);
        }
        return;
      }

      // Escape: Dismiss suggestion
      if (e.key === 'Escape') {
        e.preventDefault();
        dismissSuggestion(fieldId);
        return;
      }
    },
    [
      onKeyDown,
      suggestion,
      fieldId,
      acceptSuggestion,
      acceptPartialSuggestion,
      dismissSuggestion,
      onChange,
      value,
    ]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      dismissSuggestion(fieldId);
    };
  }, [fieldId, dismissSuggestion]);

  // Dismiss suggestion when value changes externally (not from accepting)
  useEffect(() => {
    if (value !== previousValueRef.current) {
      // Only dismiss if the change wasn't from accepting a suggestion
      const currentSuggestion = useAISuggestionStore.getState().suggestions.get(fieldId);
      if (currentSuggestion && !currentSuggestion.isLoading) {
        // Check if the new value ends with the previous value (meaning we accepted something)
        const wasAccepted = value.startsWith(previousValueRef.current);
        if (!wasAccepted) {
          dismissSuggestion(fieldId);
        }
      }
    }
    previousValueRef.current = value;
  }, [value, fieldId, dismissSuggestion]);

  const showGhostText = suggestion?.text && !suggestion.isLoading;

  return (
    <div className="ghost-text-container">
      {/* Hidden div to mirror content for ghost text positioning */}
      <div className="ghost-text-mirror" aria-hidden="true">
        <span className="ghost-text-value">{value}</span>
        {showGhostText && (
          <span className="ghost-text-suggestion" data-testid="ghost-text-suggestion">
            {suggestion.text}
          </span>
        )}
      </div>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`ghost-text-textarea ${className}`}
        aria-describedby={showGhostText ? `${fieldId}-suggestion-hint` : undefined}
        {...props}
      />

      {/* Screen reader hint for suggestion */}
      {showGhostText && (
        <div id={`${fieldId}-suggestion-hint`} className="ghost-text-sr-hint" role="status">
          AI suggestion available: "{suggestion.text}". Press Tab to accept all, Cmd+Right for one
          word, or Escape to dismiss.
        </div>
      )}

      {/* Loading indicator */}
      {suggestion?.isLoading && (
        <div className="ghost-text-loading" aria-hidden="true">
          <span className="ghost-text-dot"></span>
          <span className="ghost-text-dot"></span>
          <span className="ghost-text-dot"></span>
        </div>
      )}
    </div>
  );
}

GhostTextTextarea.displayName = 'GhostTextTextarea';
