import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import './Switch.css';

export type SwitchSize = 'sm' | 'md' | 'lg';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: SwitchSize;
  labelPosition?: 'left' | 'right';
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      description,
      size = 'md',
      labelPosition = 'right',
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
    const descriptionId = `${id}-description`;

    const describedByIds = [
      description && descriptionId,
      ariaDescribedBy,
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = [
      'switch-wrapper',
      disabled && 'switch-disabled',
      `switch-label-${labelPosition}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const switchClasses = [
      'switch',
      `switch-${size}`,
    ]
      .filter(Boolean)
      .join(' ');

    const trackClasses = [
      'switch-track',
      `switch-track-${size}`,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        <label className="switch-label">
          {label && labelPosition === 'left' && (
            <div className="switch-text-container">
              <span className="switch-text">{label}</span>
              {description && (
                <span id={descriptionId} className="switch-description">
                  {description}
                </span>
              )}
            </div>
          )}
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            id={id}
            className={switchClasses}
            disabled={disabled}
            aria-describedby={describedByIds || undefined}
            {...props}
          />
          <span className={trackClasses} aria-hidden="true">
            <span className={`switch-thumb switch-thumb-${size}`} />
          </span>
          {label && labelPosition === 'right' && (
            <div className="switch-text-container">
              <span className="switch-text">{label}</span>
              {description && (
                <span id={descriptionId} className="switch-description">
                  {description}
                </span>
              )}
            </div>
          )}
        </label>
      </div>
    );
  }
);

Switch.displayName = 'Switch';
