import { forwardRef, type SelectHTMLAttributes, useId } from 'react';
import './Select.css';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: SelectSize;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      size = 'md',
      options,
      placeholder,
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
      'select-wrapper',
      fullWidth && 'select-full-width',
    ]
      .filter(Boolean)
      .join(' ');

    const selectClasses = [
      'select',
      `select-${size}`,
      error && 'select-error',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={id} className="select-label">
            {label}
            {props.required && <span className="select-required" aria-hidden="true"> *</span>}
          </label>
        )}
        <div className="select-container">
          <select
            ref={ref}
            id={id}
            className={selectClasses}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedByIds || undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="select-chevron" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </div>
        {error && (
          <span id={errorId} className="select-error-message" role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={hintId} className="select-hint">
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
