import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react';
import './Input.css';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: InputSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      size = 'md',
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      id: providedId,
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
      'input-wrapper',
      fullWidth && 'input-full-width',
    ]
      .filter(Boolean)
      .join(' ');

    const inputClasses = [
      'input',
      `input-${size}`,
      error && 'input-error',
      leftIcon && 'input-with-left-icon',
      rightIcon && 'input-with-right-icon',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={id} className="input-label">
            {label}
            {props.required && <span className="input-required" aria-hidden="true"> *</span>}
          </label>
        )}
        <div className="input-container">
          {leftIcon && (
            <span className="input-icon input-icon-left" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={inputClasses}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedByIds || undefined}
            {...props}
          />
          {rightIcon && (
            <span className="input-icon input-icon-right" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <span id={errorId} className="input-error-message" role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={hintId} className="input-hint">
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
