import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import './Checkbox.css';

export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: CheckboxSize;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      error,
      hint,
      size = 'md',
      indeterminate = false,
      className = '',
      id: providedId,
      disabled,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const describedByIds = [
      error && errorId,
      hint && !error && hintId,
      ariaDescribedBy,
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = [
      'checkbox-wrapper',
      disabled && 'checkbox-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const checkboxClasses = [
      'checkbox',
      `checkbox-${size}`,
      error && 'checkbox-error',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        <label className="checkbox-label">
          <input
            ref={(node) => {
              if (node) {
                node.indeterminate = indeterminate;
              }
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            type="checkbox"
            id={id}
            className={checkboxClasses}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedByIds || undefined}
            {...props}
          />
          <span className={`checkbox-indicator checkbox-indicator-${size}`} aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none" className="checkbox-check">
              <path
                d="M13.5 4.5L6 12L2.5 8.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg viewBox="0 0 16 16" fill="none" className="checkbox-indeterminate">
              <path
                d="M3 8H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {label && <span className="checkbox-text">{label}</span>}
        </label>
        {error && (
          <span id={errorId} className="checkbox-error-message" role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={hintId} className="checkbox-hint">
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
