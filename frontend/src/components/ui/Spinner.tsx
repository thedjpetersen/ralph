import { forwardRef, type HTMLAttributes } from 'react';
import './Spinner.css';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'default' | 'primary' | 'secondary' | 'white';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  stripe?: boolean;
  label?: string;
  className?: string;
}

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = 'md',
      variant = 'default',
      stripe = false,
      label = 'Loading',
      className = '',
      ...props
    },
    ref
  ) => {
    const classes = [
      'spinner',
      `spinner-${size}`,
      `spinner-${variant}`,
      stripe && 'spinner-stripe',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        className={classes}
        role="status"
        aria-label={label}
        {...props}
      >
        {stripe ? (
          <div className="spinner-stripe-container">
            <div className="spinner-stripe-bar" />
            <div className="spinner-stripe-bar" />
            <div className="spinner-stripe-bar" />
          </div>
        ) : (
          <svg viewBox="0 0 24 24" className="spinner-ring" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="31.4 31.4"
            />
          </svg>
        )}
        <span className="sr-only">{label}</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';
