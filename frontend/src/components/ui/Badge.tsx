import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import './Badge.css';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  outlined?: boolean;
  pill?: boolean;
  stripe?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      outlined = false,
      pill = false,
      stripe = false,
      removable = false,
      onRemove,
      leftIcon,
      rightIcon,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const classes = [
      'badge',
      `badge-${variant}`,
      `badge-${size}`,
      outlined && 'badge-outlined',
      pill && 'badge-pill',
      stripe && 'badge-stripe',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const handleRemoveClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    };

    const handleRemoveKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        onRemove?.();
      }
    };

    return (
      <span ref={ref} className={classes} {...props}>
        {leftIcon && <span className="badge-icon badge-icon-left">{leftIcon}</span>}
        <span className="badge-text">{children}</span>
        {rightIcon && !removable && (
          <span className="badge-icon badge-icon-right">{rightIcon}</span>
        )}
        {removable && (
          <button
            type="button"
            className="badge-remove"
            onClick={handleRemoveClick}
            onKeyDown={handleRemoveKeyDown}
            aria-label="Remove"
          >
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              className="badge-remove-icon"
              aria-hidden="true"
            >
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
