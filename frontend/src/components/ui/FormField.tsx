import { type ReactNode, useId } from 'react';
import './FormField.css';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: (props: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
    'aria-required'?: boolean;
  }) => ReactNode;
}

/**
 * FormField - Accessible wrapper for form inputs
 *
 * This component provides:
 * - Automatic ID generation
 * - Proper label association
 * - aria-describedby linking for hints and errors
 * - aria-invalid for error states
 * - Error messages with role="alert" for screen reader announcements
 *
 * Usage:
 * ```tsx
 * <FormField label="Email" required error={errors.email} hint="We'll never share your email">
 *   {(props) => (
 *     <input type="email" {...props} className="form-input" />
 *   )}
 * </FormField>
 * ```
 */
export function FormField({
  label,
  required = false,
  error,
  hint,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const errorId = `${generatedId}-error`;
  const hintId = `${generatedId}-hint`;

  const describedByIds = [
    error && errorId,
    hint && !error && hintId,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  const inputProps = {
    id: generatedId,
    'aria-describedby': describedByIds,
    'aria-invalid': error ? true : undefined,
    'aria-required': required ? true : undefined,
  };

  return (
    <div className="form-field">
      <label htmlFor={generatedId} className="form-field-label">
        {label}
        {required && <span className="form-field-required" aria-hidden="true"> *</span>}
      </label>
      {children(inputProps)}
      {error && (
        <span id={errorId} className="form-field-error" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={hintId} className="form-field-hint">
          {hint}
        </span>
      )}
    </div>
  );
}

/**
 * FormErrorSummary - Announces form errors to screen readers
 *
 * Place at the top of forms to announce validation errors
 */
export interface FormErrorSummaryProps {
  errors: string[];
  title?: string;
}

export function FormErrorSummary({ errors, title = 'Please fix the following errors:' }: FormErrorSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <div
      className="form-error-summary"
      role="alert"
      aria-live="polite"
      tabIndex={-1}
    >
      <h3 className="form-error-summary-title">{title}</h3>
      <ul className="form-error-summary-list">
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * LiveRegion - Hidden region for screen reader announcements
 *
 * Use for announcing dynamic changes like save confirmations
 */
export interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
}

export function LiveRegion({ message, politeness = 'polite' }: LiveRegionProps) {
  return (
    <div
      className="sr-only"
      role="status"
      aria-live={politeness}
      aria-atomic="true"
    >
      {message}
    </div>
  );
}
