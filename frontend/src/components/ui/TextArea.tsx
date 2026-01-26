import {
  forwardRef,
  type TextareaHTMLAttributes,
  useId,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import './TextArea.css';

export type TextAreaSize = 'sm' | 'md' | 'lg';

export interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: TextAreaSize;
  fullWidth?: boolean;
  autoResize?: boolean;
  maxCharacters?: number;
  showCharacterCount?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      error,
      hint,
      size = 'md',
      fullWidth = false,
      autoResize = false,
      maxCharacters,
      showCharacterCount = false,
      className = '',
      id: providedId,
      'aria-describedby': ariaDescribedBy,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const countId = `${id}-count`;

    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const currentLength =
      typeof value === 'string'
        ? value.length
        : typeof defaultValue === 'string'
          ? defaultValue.length
          : 0;

    const handleAutoResize = useCallback(() => {
      const textarea = textareaRef.current;
      if (textarea && autoResize) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [autoResize, textareaRef]);

    useEffect(() => {
      handleAutoResize();
    }, [value, handleAutoResize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        handleAutoResize();
      }
      onChange?.(e);
    };

    const describedByIds = [
      error && errorId,
      hint && !error && hintId,
      showCharacterCount && countId,
      ariaDescribedBy,
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = ['textarea-wrapper', fullWidth && 'textarea-full-width']
      .filter(Boolean)
      .join(' ');

    const textareaClasses = [
      'textarea',
      `textarea-${size}`,
      error && 'textarea-error',
      autoResize && 'textarea-auto-resize',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const isOverLimit = maxCharacters !== undefined && currentLength > maxCharacters;

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={id} className="textarea-label">
            {label}
            {props.required && (
              <span className="textarea-required" aria-hidden="true">
                {' '}
                *
              </span>
            )}
          </label>
        )}
        <textarea
          ref={textareaRef}
          id={id}
          className={textareaClasses}
          aria-invalid={error || isOverLimit ? 'true' : undefined}
          aria-describedby={describedByIds || undefined}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          maxLength={maxCharacters}
          {...props}
        />
        <div className="textarea-footer">
          <div className="textarea-messages">
            {error && (
              <span id={errorId} className="textarea-error-message" role="alert">
                {error}
              </span>
            )}
            {hint && !error && (
              <span id={hintId} className="textarea-hint">
                {hint}
              </span>
            )}
          </div>
          {showCharacterCount && (
            <span
              id={countId}
              className={`textarea-count ${isOverLimit ? 'textarea-count-error' : ''}`}
              aria-live="polite"
            >
              {currentLength}
              {maxCharacters !== undefined && ` / ${maxCharacters}`}
            </span>
          )}
        </div>
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
